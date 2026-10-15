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
