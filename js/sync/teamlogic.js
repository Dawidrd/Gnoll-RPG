// Team logic without Firebase: invite codes, links, statuses and who may do what. Tested in tests/run.mjs.
// The same limits are enforced on the server by firestore.rules; these only keep the app from trying.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export const CODE_LENGTH = 20;
export const NAME_MAX = 60;

/** Invite code: 20 random letters/digits (hard to guess). `bytes` lets tests pass fixed randomness. */
export function makeCode(bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))) {
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const validCode = (code) => typeof code === "string" && /^[A-Za-z0-9]{16,40}$/.test(code);

/** Link to send to players. `base` is the app address without the #part. */
export const inviteLink = (base, code) => `${base.replace(/#.*$/, "")}#/join/${code}`;
/** The invite code from a pasted link or a bare code; "" if there is none. */
export function codeFrom(text) {
  const s = String(text || "").trim();
  const m = s.match(/#\/join\/([A-Za-z0-9]+)/);
  const code = m ? m[1] : s;
  return validCode(code) ? code : "";
}

/** Team and character names: trimmed, single spaces, length-limited. */
export const cleanName = (s, max = NAME_MAX) => String(s || "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Where I stand in a team on my list.
 * state: what my list remembers ("asked" = I sent a request, "in" = I was a member).
 * member / request: does my member / request document exist (null = not known yet, e.g. offline).
 * Returns: in | asked | rejected | removed | checking.
 */
export function teamStatus({ state, member, request }) {
  if (member === true) return "in";
  if (member == null) return "checking";
  if (request === true) return "asked";
  if (state === "asked") return request == null ? "checking" : "rejected";
  return "removed";
}

/**
 * What I may do with another member. me / them: { uid, role }; owner: uid of the team's founder.
 * Admins accept and remove players and give or take the admin role; nobody can remove or demote the founder.
 */
export function canManage(me, them, owner) {
  const admin = me?.role === "admin";
  const other = !!them && them.uid !== me?.uid && them.uid !== owner;
  return { remove: admin && other, promote: admin && other && them.role !== "admin", demote: admin && other && them.role === "admin" };
}
/** The founder cannot leave (they delete the team instead). */
export const canLeave = (uid, owner) => !!uid && uid !== owner;

/** Members for display: admins first, then by name. */
export const sortMembers = (list) => [...list].sort((a, b) =>
  (a.role === "admin" ? 0 : 1) - (b.role === "admin" ? 0 : 1) || (a.name || "").localeCompare(b.name || ""));

// --- D3: team info, marching order, notes, what the team sees of a character ---
export const CAMPAIGN_MAX = 100;
export const NOTE_MAX = 4000;

/** Next session: "YYYY-MM-DDTHH:MM" (a datetime-local field) or "" for none. */
export const validWhen = (s) => s === "" || (typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && !isNaN(new Date(s)));
/** { date, past } for display, or null when no session is set. `now` lets tests fix the time. */
export function sessionWhen(s, now = Date.now()) {
  if (!s || !validWhen(s)) return null;
  const date = new Date(s);
  return { date, past: date.getTime() < now };
}

/** Note text: line breaks kept, trailing spaces and extra empty lines dropped, length-limited. */
export const cleanNote = (s) => String(s || "").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, NOTE_MAX);
/** Notes for display: newest first. */
export const sortNotes = (list) => [...list].sort((a, b) => (b.at || 0) - (a.at || 0));
/** Admins remove any team note; everyone edits and removes their own. */
export const canEditNote = (note, uid) => !!uid && note?.author === uid;
export const canDeleteNote = (note, me) => !!me && (note?.author === me.uid || me.role === "admin");

/**
 * Marching order: everyone who plays a character, in the order the admin set.
 * Members missing from the saved order (new ones) go to the back, in the order they joined; people who left drop out.
 */
export function marchOrder(order, members) {
  const playing = members.filter((m) => m.charId);
  const known = new Set(playing.map((m) => m.uid));
  const kept = (Array.isArray(order) ? order : []).filter((u, i, a) => known.has(u) && a.indexOf(u) === i);
  const rest = playing.filter((m) => !kept.includes(m.uid)).sort((a, b) => (a.at || 0) - (b.at || 0)).map((m) => m.uid);
  return [...kept, ...rest];
}
/** Rows from the front: 5 ft = single file (1-1-1…), 10 ft = two abreast (2-2-…, an odd one out walks alone at the back). */
export function marchRows(list, mode) {
  const per = mode === "10" ? 2 : 1;
  const rows = [];
  for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per));
  return rows;
}
/** Move one place forward (-1) or back (+1); out-of-range moves change nothing. */
export function moveIn(list, i, delta) {
  const j = i + delta;
  if (i < 0 || i >= list.length || j < 0 || j >= list.length) return [...list];
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
export const MARCH_MAX = 50;
export const validMarch = (m) => !!m && (m.mode === "5" || m.mode === "10") && Array.isArray(m.order) && m.order.length <= MARCH_MAX && m.order.every((u) => typeof u === "string" && u.length <= 128);

/**
 * What the team sees of a character: species, class, subclass, level, HP, temporary HP and AC. Nothing else leaves the device.
 * `c` is compute(ch) (passed in, so this file needs no rules).
 */
export function sheetSummary(ch, c) {
  const n = (v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
  const hpMax = n(c.hpMax);
  return {
    species: String(ch.speciesId || "").slice(0, 40), cls: String(ch.classId || "").slice(0, 40), sub: String(c.subclassId || "").slice(0, 60),
    level: n(c.level), hp: Math.min(ch.hp?.cur == null ? hpMax : n(ch.hp.cur), hpMax), hpMax, temp: n(ch.hp?.temp), ac: n(c.ac?.value),
  };
}
export const sameSheet = (a, b) => !!a && !!b && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);
