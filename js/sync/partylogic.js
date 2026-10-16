// Party logic without Firebase: invite codes, links, statuses and who may do what. Tested in tests/run.mjs.
// The same limits are enforced on the server by firestore.rules; these only keep the app from trying.
import { ABILITIES, SKILLS } from "../rules/core.js";
import { paperSig } from "../rules/identity.js";

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

/** Party and character names: trimmed, single spaces, length-limited. */
export const cleanName = (s, max = NAME_MAX) => String(s || "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Where I stand in a party on my list.
 * state: what my list remembers ("asked" = I sent a request, "in" = I was a member).
 * member / request: does my member / request document exist (null = not known yet, e.g. offline).
 * Returns: in | asked | rejected | removed | checking.
 */
export function partyStatus({ state, member, request }) {
  if (member === true) return "in";
  if (member == null) return "checking";
  if (request === true) return "asked";
  if (state === "asked") return request == null ? "checking" : "rejected";
  return "removed";
}

/**
 * What I may do with another member. me / them: { uid, role }; owner: uid of the party's founder.
 * Admins accept and remove players and give or take the admin role; nobody can remove or demote the founder.
 */
export function canManage(me, them, owner) {
  const admin = me?.role === "admin";
  const other = !!them && them.uid !== me?.uid && them.uid !== owner;
  // The Game Master role (extra view of the characters) is given by admins to anyone, themselves and the founder included.
  return { remove: admin && other, promote: admin && other && them.role !== "admin", demote: admin && other && them.role === "admin", gm: admin && !!them };
}
/** The founder cannot leave (they delete the party instead). */
export const canLeave = (uid, owner) => !!uid && uid !== owner;

/** Members for display: admins first, then by name. */
export const sortMembers = (list) => [...list].sort((a, b) =>
  (a.role === "admin" ? 0 : 1) - (b.role === "admin" ? 0 : 1) || (a.name || "").localeCompare(b.name || ""));

// --- D3: party info, marching order, notes, what the party sees of a character ---
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
/** Admins remove any party note; everyone edits and removes their own. */
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

/** Fingerprint of scores rolled on paper (identity.js paperSig), or "" when the scores come from the array or a point buy. */
const paperOf = (ch) => (ch.abilityMethod === "paper" ? paperSig(ch) : "");

/**
 * What the party sees of a character: species, class, subclass, level, HP, temporary HP and AC. Nothing else leaves the device.
 * paper: only a fingerprint of scores rolled on paper (the party sees "scores from paper", the GM sees the values).
 * `c` is compute(ch) (passed in, so this file needs no rules).
 */
export function sheetSummary(ch, c) {
  const n = (v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
  const hpMax = n(c.hpMax);
  return {
    species: String(ch.speciesId || "").slice(0, 40), cls: String(ch.classId || "").slice(0, 40), sub: String(c.subclassId || "").slice(0, 60),
    level: n(c.level), hp: Math.min(ch.hp?.cur == null ? hpMax : n(ch.hp.cur), hpMax), hpMax, temp: n(ch.hp?.temp), ac: n(c.ac?.value),
    paper: paperOf(ch),
  };
}
export const sameSheet = (a, b) => !!a && !!b && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);

// --- The Game Master's view: what a GM needs for decisions and secret rolls, beyond HP and AC ---
// Every member sends it next to the short summary, in a separate document that only GMs of the party read (firestore.rules).
/** Groups of the GM view; the GM picks which to show. Keys are short, the rules list them one by one. */
export const GM_GROUPS = {
  passive: ["per", "ins", "inv"],
  basics: ["init", "speed", "dv", "dc"],
  saves: [...ABILITIES],
  skills: SKILLS.map((s) => s.id),
  death: ["dOk", "dFail"],
};
export const GM_KEYS = Object.values(GM_GROUPS).flat();
export const GM_GROUPS_DEFAULT = ["passive", "basics", "saves"];
export const GM_MIN = -30, GM_MAX = 1000;

/** The GM view of a character, as whole numbers. `c` is compute(ch). dc = 0 when the character casts no spells. */
export function gmSummary(ch, c) {
  const n = (v) => (Number.isFinite(v) ? Math.min(GM_MAX, Math.max(GM_MIN, Math.round(v))) : 0);
  const skill = Object.fromEntries((c.skills || []).map((s) => [s.id, s.value]));
  const out = {
    per: n(10 + (skill.perception ?? 0)), ins: n(10 + (skill.insight ?? 0)), inv: n(10 + (skill.investigation ?? 0)),
    init: n(c.initiative), speed: n(c.speed), dv: n(c.darkvision), dc: n(c.spells?.dc ?? 0),
  };
  for (const a of ABILITIES) out[a] = n(c.saves?.[a]?.value);
  for (const s of SKILLS) out[s.id] = n(skill[s.id]);
  out.dOk = n(Math.min(3, ch.death?.ok || 0)); out.dFail = n(Math.min(3, ch.death?.fail || 0));
  // Scores rolled on paper, before background increases ("15,14,…" in ability order), for the GM to confirm.
  out.paper = paperOf(ch) ? ABILITIES.map((a) => n(ch.abilityBase?.[a])).join(",") : "";
  return out;
}
/** The GM's choice of groups (saved on the device), cleaned of unknown names. */
export const gmGroups = (list) => (Array.isArray(list) ? list.filter((g, i) => g in GM_GROUPS && list.indexOf(g) === i) : [...GM_GROUPS_DEFAULT]);

/** One character = one party: characters already in a party (or waiting for an answer) from my list of parties. */
export const busyChars = (rows, except = "") => new Set((rows || []).filter((r) => r.charId && r.id !== except && ["in", "asked", "checking"].includes(r.status)).map((r) => r.charId));

// --- Scores from a paper sheet (0.19): the party's GM confirms them ---
/**
 * A member's paper scores: "" (not from paper), "open" (not confirmed) or "ok" (confirmed by a GM, with their name).
 * The confirmation holds only for the same character and the same scores (its fingerprint).
 */
export function paperState(m) {
  const sig = m?.charId ? m.sheet?.paper : "";
  if (!sig) return { state: "" };
  const ok = m.paperOk;
  return ok && ok.sig === sig && ok.charId === m.charId ? { state: "ok", by: ok.name || "" } : { state: "open" };
}
/** What the GM writes into a member's document to confirm their paper scores (me: { uid, name }). */
export const paperConfirmation = (m, me, at = Date.now()) => ({ sig: m.sheet.paper, charId: m.charId, by: me.uid, name: cleanName(me.name, 100), at });
/**
 * The confirmation my device keeps in the character (it locks the scores): { sig, by, name, at } from my member document,
 * or null when no GM confirmed these scores of this character.
 */
export function confirmFor(ch, m) {
  const ok = m?.paperOk, sig = paperOf(ch);
  return sig && ok && ok.sig === sig && ok.charId === ch.id ? { sig, by: ok.by, name: ok.name || "", at: ok.at } : null;
}
/** The GM view's "15,14,13,12,10,8" as { str: 15, … }; null when missing. */
export function paperValues(text) {
  const v = String(text || "").split(",").map(Number);
  return v.length === ABILITIES.length && v.every(Number.isInteger) ? Object.fromEntries(ABILITIES.map((a, i) => [a, v[i]])) : null;
}
