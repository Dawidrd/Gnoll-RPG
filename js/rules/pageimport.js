// Import from the old character pages (one page per character, made before this app).
// A page exports: { app: "gnoll-rpg-page", version: 1, page, build, state, items, sessions, questions, shown }
//   build    — the character in this app's format, worked out once from the page (identity, scores, picks);
//   state    — what changed in play: level, HP, resources left, coins, level-up picks, Rage, armor, familiar;
//   items / sessions / questions — equipment, session journal and questions for the GM;
//   shown    — numbers the page showed (max HP, AC), to compare with what this app works out by the rules.
// Hand corrections on the pages (extra HP, typed AC) are not carried over: the app counts by the rules
// and the import report shows the difference so the player can sort it out with the GM.
import { compute, normalize } from "./index.js";
import { normalizeFamiliar } from "./familiars.js";
import { SPELLS, spellId } from "./spells.js";

/** Short invocation ids used on the pages → ids in this app. */
const INVOCATIONS = {
  agonizing: "agonizing-blast", armor: "armor-of-shadows", ascendant: "ascendant-step", devils: "devils-sight", mind: "eldritch-mind",
  smite: "eldritch-smite", spear: "eldritch-spear", vigor: "fiendish-vigor", gaze: "gaze-of-two-minds", depths: "gift-of-the-depths",
  chainmaster: "investment-of-the-chain-master", lessons: "lessons-of-the-first-ones", mask: "mask-of-many-faces", myriad: "master-of-myriad-forms",
  misty: "misty-visions", shadows: "one-with-shadows", leap: "otherworldly-leap", blade: "pact-of-the-blade", chain: "pact-of-the-chain",
  tome: "pact-of-the-tome", repelling: "repelling-blast", thirsting: "thirsting-blade",
};
const SUBCLASSES = { goo: "great-old-one" };

/** Resource keys on the pages → resource ids here (some are worked out from the computed sheet). */
const RESOURCES = {
  breath: "breath", flight: "flight", focus: "focus", meta: "metabolism", howl: "howl", reach: "lengthened-strike",
  rage: "rage", jaunt: "giant", large: "large-form", cd: "channel", s1: "slot1", s2: "slot2", s3: "slot3",
  hh: "healing-hands", rev: "revelation", cunning: "cunning", token: "eerie-token", disguise: "sp-disguise-self", hex: "sp-hex",
  animals: "ft-watchers-speak-with-animals", sense: "ft-watchers-beast-sense", gods: "gods",
};

const spell = (name) => { const id = spellId(String(name || "")); return SPELLS[id] ? id : null; };
const invocation = (raw) => {
  const [key, cantrip] = String(raw).split(":");
  const id = INVOCATIONS[key];
  if (!id) return null;
  const c = cantrip ? spell(cantrip) : null;
  return c ? `${id}@${c}` : id;
};

export const isPageExport = (data) => !!(data && data.app === "gnoll-rpg-page" && data.build && data.state);

/** Turn a page export into a character for this app, plus a report of what was carried over and what differs. */
export function fromPage(data) {
  const st = data.state || {};
  const ch = normalize(structuredClone(data.build));
  const report = { page: data.page || ch.name, notes: [] };

  // Level and the picks made on the page's level-up wizard (they may be newer than the build).
  const levels = st.levels || {};
  const lv = Math.max(1, Math.min(5, parseInt(st.level, 10) || ch.level || 1));
  if (lv !== ch.level) report.notes.push({ key: "imp.levelChanged", vars: { from: ch.level, to: lv } });
  ch.level = lv;
  const rolls = {};
  for (const [L, x] of Object.entries(levels)) if (+L <= lv && +L >= 2 && Number.isFinite(+x?.hp) && +x.hp > 0) rolls[L] = +x.hp;
  ch.hpRolls = { ...Object.fromEntries(Object.entries(ch.hpRolls || {}).filter(([L]) => +L <= lv)), ...rolls };
  const latest = Object.keys(levels).map(Number).filter((L) => L <= lv && L > (data.build.level || 1)).sort((a, b) => b - a);
  for (const L of latest) {
    const x = levels[L];
    if (x.sub && !ch.subclass) ch.subclass = SUBCLASSES[x.sub] || x.sub;
    if (Array.isArray(x.cant) && !ch._cant) { ch.spellPicks = { ...ch.spellPicks, cantrips: x.cant.map(spell).filter(Boolean) }; ch._cant = true; }
    if (Array.isArray(x.prep) && !ch._prep) { ch.spellPicks = { ...ch.spellPicks, prepared: x.prep.map(spell).filter(Boolean) }; ch._prep = true; }
    if (Array.isArray(x.inv) && !ch._inv) { ch.classOptions = { ...ch.classOptions, invocations: x.inv.map(invocation).filter(Boolean) }; ch._inv = true; }
  }
  delete ch._cant; delete ch._prep; delete ch._inv;
  for (const L of Object.keys(ch.levelChoices || {})) if (+L > lv) delete ch.levelChoices[L];

  // Play state.
  const c = compute(structuredClone(ch));
  const hp = st.hp || {};
  ch.hp = { ...ch.hp, cur: Math.max(0, Math.min(c.hpMax, Number.isFinite(+hp.cur) ? +hp.cur : c.hpMax)), temp: Math.max(0, +hp.temp || 0) };
  ch.death = { ok: +st.death?.ok || 0, fail: +st.death?.fail || 0 };
  const used = {};
  const pactSlot = c.resources.find((r) => r.pact);
  const mi = c.resources.find((r) => r.id.startsWith("ft-magic-initiate"));
  const legacy = (at) => c.speciesMagic?.spells?.find((x) => x.at === at);
  for (const [key, r] of Object.entries(st.res || {})) {
    let id = RESOURCES[key];
    if (key === "pact") id = pactSlot?.id;
    if (key === "mi") id = mi?.id;
    if (key === "leg3" || key === "leg5") { const s = legacy(key === "leg3" ? 3 : 5); id = s ? "sp-" + s.id : null; }
    const mine = id && c.resources.find((x) => x.id === id);
    if (!mine || !Number.isFinite(+r?.cur)) continue;
    used[id] = Math.max(0, Math.min(mine.max, mine.max - Math.min(+r.cur, mine.max)));
  }
  ch.used = used;
  const conc = st.conc ? spell(st.conc) || (SPELLS[st.conc] ? st.conc : null) : null;
  ch.concentration = conc;
  ch.gold = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...Object.fromEntries(Object.entries(st.gold || {}).map(([k, v]) => [k, Math.max(0, parseInt(v, 10) || 0)])) };
  ch.active = { rage: !!st.rage };
  if (st.armor === "mage") ch.active = { ...ch.active, mageArmor: true, armorOff: ch.armor !== "none" };
  if (st.armor === "shield") ch.shield = true;
  if (st.armor === "maul") ch.shield = false;
  if (st.fam) ch.familiar = normalizeFamiliar({ name: st.fam.name || "", kind: data.familiarKind || "", hp: { cur: st.fam.hp?.cur ?? null, max: st.fam.hp?.max ?? null }, status: st.fam.status === "gone" || st.fam.status === "pocket" ? st.fam.status : "here" });

  // Equipment, journal, questions.
  const items = [...(data.items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  ch.items = items.filter((x) => x && x.name).map((x) => ({ id: "it-" + (x.id || Math.random().toString(36).slice(2)), name: String(x.name), qty: Math.max(0, parseInt(x.qty, 10) || 0), note: x.note ? String(x.note) : "" }));
  // Journal entries become private notes (title on the first line), dated by the session; questions become one more note.
  const day = (d) => { const ms = Date.parse(d + "T12:00:00"); return Number.isFinite(ms) ? ms : 0; };
  const sessions = (data.sessions || []).filter((x) => x && (x.title || x.body));
  ch.notebook.push(...sessions.map((x) => ({ id: "s-" + (x.id || Math.random().toString(36).slice(2)),
    text: [x.title, x.body].map((y) => String(y || "").trim()).filter(Boolean).join("\n"), at: (x.date && day(x.date)) || x.created || 0 })));
  const qs = [...(data.questions || [])].filter((q) => q && q.text).sort((a, b) => (a.group || "").localeCompare(b.group || "") || (a.order ?? 0) - (b.order ?? 0));
  if (qs.length) {
    const head = { gm: "Pytania do GM-a", gra: "Do wybadania w grze" };
    const lines = [];
    let group = null;
    for (const q of qs) {
      if (q.group !== group) { group = q.group; lines.push("", `## ${head[group] || group || "Pytania"}`); }
      lines.push(`- [${q.done ? "x" : " "}] ${q.text}` + (q.answer ? `\n  Odpowiedź: ${q.answer}` : ""));
    }
    ch.notebook.push({ id: "page-questions", text: [`Ze strony postaci (${report.page})`, ...lines].join("\n").trim(), at: Date.now() });
  }
  ch.turn = { round: 1, action: null, bonus: null, reaction: null, item: null, moved: 0 };

  // What differs from the page.
  const after = compute(structuredClone(ch));
  const shown = data.shown || {};
  if (Number.isFinite(+shown.hpMax) && +shown.hpMax !== after.hpMax) report.notes.push({ key: "imp.hpDiff", vars: { page: +shown.hpMax, app: after.hpMax } });
  if (Number.isFinite(+shown.ac) && +shown.ac !== after.ac.value) report.notes.push({ key: "imp.acDiff", vars: { page: +shown.ac, app: after.ac.value } });
  if (Number.isFinite(+shown.speed) && +shown.speed !== after.speed) report.notes.push({ key: "imp.speedDiff", vars: { page: +shown.speed, app: after.speed } });
  report.counts = { items: ch.items.length, journal: sessions.length, questions: qs.length };
  report.todo = after.review.todo.length + after.review.errors.length;
  ch.imported = { page: report.page, at: Date.now(), notes: report.notes, counts: report.counts };
  return { ch, report };
}
