// A small Firestore security rules simulator for the tests (no emulator, no Java, no dependencies).
// It reads firestore.rules and answers "would the server allow this?" for reads, writes and batches.
// It understands the part of the rules language our firestore.rules uses: match blocks with {wildcards},
// functions, allow get/list/read/create/update/delete/write, && || ! == != < > in is, lists, maps,
// size() matches() keys() hasOnly() hasAll() hasAny() get() diff().affectedKeys(), and
// exists() existsAfter() get() getAfter() on /databases/$(database)/documents/... paths.
// Like the real server: an error inside a condition (a missing field, null.uid…) means "no".
// It is a model of the server, not the server: the real check is the manual test with two accounts.

class RuleError extends Error {}
const fail = (m) => { throw new RuleError(m); };
class Path { constructor(s) { this.s = s; } }
class Diff { constructor(a, b) { this.a = a; this.b = b; } }
const isMap = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Path) && !(v instanceof Diff);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ROOT = "databases/(default)/documents";

// --- parser: turns the rules file into a tree; expressions become functions of an environment ---
class Parser {
  constructor(s) { this.s = s; this.i = 0; }
  err(m) { const line = this.s.slice(0, this.i).split("\n").length; throw new Error(`firestore.rules line ${line}: ${m}`); }
  ws() { const re = /(?:\s+|\/\/[^\n]*)*/y; re.lastIndex = this.i; re.exec(this.s); this.i = re.lastIndex; }
  re(re) { this.ws(); re.lastIndex = this.i; const m = re.exec(this.s); if (!m) return null; this.i = re.lastIndex; return m[0]; }
  peek(t) { this.ws(); return this.s.startsWith(t, this.i); }
  take(t) { if (!this.peek(t)) return false; this.i += t.length; return true; }
  eat(t) { if (!this.take(t)) this.err(`expected ${t}`); }
  kw(w) { this.ws(); const re = new RegExp(w + "(?![A-Za-z0-9_])", "y"); re.lastIndex = this.i; if (!re.test(this.s)) return false; this.i = re.lastIndex; return true; }
  word() { return this.re(/[A-Za-z_][A-Za-z0-9_]*/y) ?? this.err("expected a name"); }

  file() {
    if (this.kw("rules_version")) { this.eat("="); this.re(/'[^']*'/y); this.eat(";"); }
    if (!this.kw("service")) this.err("expected service");
    this.re(/[^{]+/y);
    return this.block();
  }
  block() {
    const b = { fns: {}, matches: [], allows: [] };
    this.eat("{");
    while (!this.take("}")) {
      if (this.kw("function")) {
        const name = this.word(), params = [];
        this.eat("(");
        while (!this.take(")")) { params.push(this.word()); this.take(","); }
        this.eat("{"); if (!this.kw("return")) this.err("expected return");
        const body = this.expr(); this.take(";"); this.eat("}");
        b.fns[name] = { params, body };
      } else if (this.kw("match")) {
        const raw = this.re(/\/\S+/y) ?? this.err("expected a path");
        b.matches.push({ segs: raw.split("/").filter(Boolean), block: this.block() });
      } else if (this.kw("allow")) {
        const methods = [this.word()];
        while (this.take(",")) methods.push(this.word());
        this.eat(":");
        let cond = () => true;
        if (this.kw("if")) cond = this.expr();
        this.eat(";");
        b.allows.push({ methods, cond });
      } else this.err("unexpected text");
    }
    return b;
  }

  expr() { return this.or(); }
  or() {
    let l = this.and();
    while (this.take("||")) {
      const a = l, b = this.and();
      // An error on one side does not matter when the other side is true.
      l = (env) => { let e = null; try { if (bool(a(env))) return true; } catch (x) { e = x; } if (bool(b(env))) return true; if (e) throw e; return false; };
    }
    return l;
  }
  and() {
    let l = this.rel();
    while (this.take("&&")) {
      const a = l, b = this.rel();
      l = (env) => { let e = null; try { if (!bool(a(env))) return false; } catch (x) { e = x; } if (!bool(b(env))) return false; if (e) throw e; return true; };
    }
    return l;
  }
  rel() {
    const l = this.add();
    for (const op of ["==", "!=", "<=", ">=", "<", ">"]) {
      if (this.take(op)) {
        const r = this.add();
        return (env) => {
          const a = l(env), b = r(env);
          if (op === "==") return same(a, b);
          if (op === "!=") return !same(a, b);
          if (typeof a !== typeof b || !["number", "string"].includes(typeof a)) fail(`cannot compare ${op}`);
          return op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b;
        };
      }
    }
    if (this.kw("in")) {
      const r = this.add();
      return (env) => {
        const k = l(env), c = r(env);
        if (Array.isArray(c)) return c.some((x) => same(x, k));
        if (isMap(c)) return typeof k === "string" && Object.hasOwn(c, k);
        return fail("in needs a list or a map");
      };
    }
    if (this.kw("is")) {
      const type = this.word();
      return (env) => typeIs(l(env), type);
    }
    return l;
  }
  add() {
    let l = this.unary();
    for (;;) {
      if (this.peek("+")) { this.i++; const a = l, b = this.unary(); l = (env) => plus(a(env), b(env)); }
      else if (this.peek("-")) { this.i++; const a = l, b = this.unary(); l = (env) => num(a(env)) - num(b(env)); }
      else return l;
    }
  }
  unary() {
    if (this.peek("!") && !this.peek("!=")) { this.i++; const e = this.unary(); return (env) => !bool(e(env)); }
    if (this.peek("-")) { this.i++; const e = this.unary(); return (env) => -num(e(env)); }
    return this.postfix();
  }
  args(close = ")") { const list = []; while (!this.take(close)) { list.push(this.expr()); this.take(","); } return list; }
  postfix() {
    let e = this.primary();
    for (;;) {
      if (this.take(".")) {
        const name = this.word(), obj = e;
        if (this.take("(")) { const args = this.args(); e = (env) => method(obj(env), name, args.map((a) => a(env))); }
        else e = (env) => field(obj(env), name);
      } else if (this.take("[")) {
        const obj = e, k = this.expr(); this.eat("]");
        e = (env) => { const o = obj(env), key = k(env); return Array.isArray(o) ? (key in o ? o[key] : fail("index out of range")) : field(o, key); };
      } else return e;
    }
  }
  primary() {
    if (this.take("(")) { const e = this.expr(); this.eat(")"); return e; }
    if (this.take("[")) { const items = this.args("]"); return (env) => items.map((x) => x(env)); }
    const str = this.re(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/y);
    if (str != null) { const v = str.slice(1, -1).replace(/\\(.)/g, "$1"); return () => v; }
    const n = this.re(/\d+(?:\.\d+)?/y);
    if (n != null) { const v = Number(n); return () => v; }
    if (this.peek("/")) return this.path();
    const w = this.word();
    if (w === "true") return () => true;
    if (w === "false") return () => false;
    if (w === "null") return () => null;
    if (this.take("(")) { const args = this.args(); return (env) => call(env, w, args.map((a) => a(env))); }
    return (env) => (Object.hasOwn(env.vars, w) ? env.vars[w] : fail(`unknown name ${w}`));
  }
  // /databases/$(database)/documents/teams/$(t)
  path() {
    const parts = [];
    while (this.s[this.i] === "/") {
      this.i++;
      if (this.s.startsWith("$(", this.i)) { this.i += 2; parts.push(this.expr()); this.eat(")"); }
      else { const seg = this.re(/[A-Za-z0-9_\-().]+/y) ?? this.err("bad path"); parts.push(() => seg); }
    }
    return (env) => new Path(parts.map((p) => { const v = p(env); return typeof v === "string" ? v : fail("path part must be text"); }).join("/"));
  }
}

const bool = (v) => (typeof v === "boolean" ? v : fail("not true/false"));
const num = (v) => (typeof v === "number" ? v : fail("not a number"));
const plus = (a, b) => (typeof a === typeof b && (typeof a === "number" || typeof a === "string") ? a + b : fail("bad +"));
function typeIs(v, type) {
  switch (type) {
    case "string": return typeof v === "string";
    case "int": return Number.isInteger(v);
    case "float": return typeof v === "number" && !Number.isInteger(v);
    case "number": return typeof v === "number";
    case "bool": return typeof v === "boolean";
    case "list": return Array.isArray(v);
    case "map": return isMap(v);
    case "path": return v instanceof Path;
    default: return fail(`unknown type ${type}`);
  }
}
function field(o, k) {
  if (!isMap(o)) fail(`no field ${k} on ${o === null ? "null" : typeof o}`);
  return Object.hasOwn(o, k) ? o[k] : fail(`missing field ${k}`);
}
function method(o, name, a) {
  const list = Array.isArray(o);
  if (name === "size" && (typeof o === "string" || list || isMap(o))) return list || typeof o === "string" ? o.length : Object.keys(o).length;
  if (name === "matches" && typeof o === "string") return new RegExp(`^(?:${a[0]})$`, "u").test(o);
  if (name === "keys" && isMap(o)) return Object.keys(o);
  if (name === "values" && isMap(o)) return Object.values(o);
  if (name === "get" && isMap(o)) return Object.hasOwn(o, a[0]) ? o[a[0]] : a[1];
  if (name === "diff" && isMap(o) && isMap(a[0])) return new Diff(a[0], o);
  if (o instanceof Diff) {
    const { a: before, b: after } = o, keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const added = [...keys].filter((k) => !Object.hasOwn(before, k)), removed = [...keys].filter((k) => !Object.hasOwn(after, k));
    const changed = [...keys].filter((k) => Object.hasOwn(before, k) && Object.hasOwn(after, k) && !same(before[k], after[k]));
    if (name === "affectedKeys") return [...added, ...removed, ...changed];
    if (name === "addedKeys") return added;
    if (name === "removedKeys") return removed;
    if (name === "changedKeys") return changed;
  }
  if (list) {
    const has = (x) => o.some((y) => same(x, y));
    if (name === "hasOnly") return o.every((x) => a[0].some((y) => same(x, y)));
    if (name === "hasAll") return a[0].every(has);
    if (name === "hasAny") return a[0].some(has);
  }
  return fail(`no method ${name}`);
}
function call(env, name, a) {
  const docOf = (p, docs) => {
    if (!(p instanceof Path) || !p.s.startsWith(ROOT + "/")) fail("not a document path");
    return docs.get(p.s.slice(ROOT.length + 1));
  };
  if (name === "exists") return docOf(a[0], env.before) !== undefined;
  if (name === "existsAfter") return docOf(a[0], env.after) !== undefined;
  if (name === "get" || name === "getAfter") {
    const d = docOf(a[0], name === "get" ? env.before : env.after);
    return d === undefined ? fail("get() of a missing document") : { data: d };
  }
  const fn = env.fns[name] ?? fail(`unknown function ${name}`);
  const vars = { ...env.vars };
  fn.params.forEach((p, i) => (vars[p] = a[i]));
  return fn.body({ ...env, vars });
}

// --- the database and its clients ---
export const DELETE = Symbol("delete field"); // like Firestore's deleteField() in update()
const METHODS = { get: ["get", "read"], list: ["list", "read"], create: ["create", "write"], update: ["update", "write"], delete: ["delete", "write"] };

export function rulesSim(source) {
  const root = new Parser(source).file();
  const docs = new Map(); // "teams/abc" -> data

  // Which allow conditions apply to this path (with the wildcards they bind).
  function matching(block, segs, vars, fns, out) {
    fns = { ...fns, ...block.fns };
    for (const m of block.matches) {
      if (m.segs.length > segs.length) continue;
      const v = { ...vars };
      const ok = m.segs.every((s, i) => { const w = /^\{(\w+)\}$/.exec(s); if (w) { v[w[1]] = segs[i]; return true; } return s === segs[i]; });
      if (!ok) continue;
      const rest = segs.slice(m.segs.length);
      if (!rest.length) out.push(...m.block.allows.map((a) => ({ ...a, vars: v, fns: { ...fns, ...m.block.fns } })));
      else matching(m.block, rest, v, fns, out);
    }
    return out;
  }

  // One operation: may it go through? after = the database as it would be after the whole batch.
  function allowed(uid, op, path, data, after) {
    const rules = matching(root, `${ROOT}/${path}`.split("/"), {}, {}, []);
    const existing = docs.get(path);
    const request = { auth: uid ? { uid, token: {} } : null, method: op, path: new Path(`${ROOT}/${path}`),
      resource: op === "create" || op === "update" ? { data } : null };
    const resource = op === "list" || existing === undefined ? null : { data: existing, id: path.split("/").pop() };
    return rules.some((r) => {
      if (!r.methods.some((m) => METHODS[op].includes(m))) return false;
      try { return r.cond({ vars: { ...r.vars, request, resource }, fns: r.fns, before: docs, after }) === true; }
      catch (e) { if (e instanceof RuleError) return false; throw e; }
    });
  }

  /** What one signed-in user (uid) or nobody (null) may do. Writes return true and apply only when allowed. */
  function as(uid) {
    const client = {
      get: (path) => allowed(uid, "get", path, null, docs),
      // A query of a collection, e.g. list("teams/t1/members").
      list: (path) => allowed(uid, "list", `${path}/(listed)`, null, docs),
      set: (path, data) => client.batch([["set", path, data]]),
      update: (path, patch) => client.batch([["update", path, patch]]),
      delete: (path) => client.batch([["delete", path]]),
      /** writes: [["set"|"update"|"delete", path, data?]], all or nothing, like a Firestore batch. */
      batch(writes) {
        const after = new Map(docs), ops = [];
        for (const [kind, path, data] of writes) {
          if (kind === "delete") { after.delete(path); ops.push(["delete", path]); continue; }
          const old = after.get(path);
          if (kind === "update" && old === undefined) return false; // update() of a missing document fails
          const next = kind === "update" ? { ...old, ...data } : { ...data };
          for (const k of Object.keys(next)) if (next[k] === DELETE) delete next[k];
          after.set(path, next);
          ops.push([docs.has(path) ? "update" : "create", path]);
        }
        // Each write is checked against the final state of the batch, so the last write to a path counts.
        const last = new Map(ops.map(([op, path]) => [path, op]));
        for (const [path, op] of last) if (!allowed(uid, op, path, op === "delete" ? null : after.get(path), after)) return false;
        docs.clear(); after.forEach((v, k) => docs.set(k, v));
        return true;
      },
    };
    return client;
  }

  return { as, docs, /** put data without any rules (test setup) */ seed: (path, data) => docs.set(path, structuredClone(data)) };
}
