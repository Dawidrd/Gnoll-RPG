// Parties (D2): founding a party, invite links, requests, accepting or rejecting, removing players, roles.
// Shared data (D3): party info, marching order, notes, and a short summary of each member's character.
// Cloud layout (who may read and write what: firestore.rules):
//   parties/{partyId}                 = { name, owner, invite, created, campaign?, next?, march?: { mode: "5"|"10", order: [uid] } }
//   parties/{partyId}/members/{uid}   = { role: admin|player, gm?: bool, name, charId, charName, at, sheet?, paperOk? }
//                                       (sheet: partylogic.js sheetSummary; paperOk: a GM's confirmation of scores from paper, paperConfirmation)
//   parties/{partyId}/gm/{uid}        = { v, at }   (what the party's GMs see of my character: partylogic.js gmSummary)
//   parties/{partyId}/requests/{uid}  = { name, charId, charName, code, at }
//   parties/{partyId}/notes/{id}      = { author, name, char?, gm?, text, at }   (party notes; char/gm since 0.31.0: partylogic.js noteSign)
//   invites/{code}                 = { party, name }   (read only by its exact code, never listed)
//   users/{uid}/parties/{partyId}     = { name, state: asked|in, at, charId }   (my own list of parties; one character = one party)
//   users/{uid}/parties/{partyId}/notes/{id} = { text, at }   (my private notes for that party)
// Writes go to the device cache at once and to the server when online; the returned promise fails if the server refuses.
import { cloud, onAccount } from "./cloud.js";
import { onChange, getById, upsert, loadAll } from "../store.js";
import { compute } from "../rules/index.js";
import { makeCode, cleanName, cleanNote, partyStatus, sheetSummary, gmSummary, sameSheet, validWhen, validMarch, CAMPAIGN_MAX, confirmFor, paperConfirmation, noteSign } from "./partylogic.js";

const need = () => { const c = cloud(); if (!c) throw new Error("signed-out"); return c; };
const charFields = (ch) => ({ charId: ch?.id || "", charName: cleanName(ch?.name, 100) });
const summary = (ch) => sheetSummary(ch, compute(structuredClone(ch)));
const gmView = (ch) => gmSummary(ch, compute(structuredClone(ch)));
const exists = (snap) => (snap.exists() ? true : snap.metadata.fromCache ? null : false); // null = not known yet (offline)

// Listeners of the screen that is open; main.js stops them when the screen changes.
const views = new Set();
const watching = (off) => { views.add(off); return off; };
/** For a screen that keeps its own state while its listeners live (the Party tab): off runs when the screen is left. */
export const onStop = (off) => watching(off);
export function stopWatching() { views.forEach((off) => { try { off(); } catch { /* already stopped */ } }); views.clear(); }

/** New party with me as its admin. Returns { id, done } (done: the server's answer). */
export function createParty(name, ch) {
  const { F, db, uid, name: me } = need();
  const party = F.doc(F.collection(db, "parties"));
  const code = makeCode(), at = Date.now(), n = cleanName(name);
  const b = F.writeBatch(db);
  b.set(party, { name: n, owner: uid, invite: code, created: at });
  b.set(F.doc(party, "members", uid), { role: "admin", name: cleanName(me, 100), ...charFields(ch), at });
  b.set(F.doc(db, "invites", code), { party: party.id, name: n });
  b.set(F.doc(db, "users", uid, "parties", party.id), { name: n, state: "in", at, charId: ch?.id || "" });
  if (ch) b.set(F.doc(party, "gm", uid), { v: gmView(ch), at });
  return { id: party.id, done: b.commit() };
}

/** The party behind an invite code: { party, name }, or null when the link no longer works. Needs the internet. */
export async function readInvite(code) {
  const { F, db } = need();
  const d = await F.getDoc(F.doc(db, "invites", code));
  return d.exists() ? d.data() : null;
}

/** Characters already playing in (or waiting for) my parties other than `except`: one character = one party. */
export async function myPartyChars(except = "") {
  const { F, db, uid } = need();
  try {
    const q = await F.getDocs(F.collection(db, "users", uid, "parties"));
    return new Set(q.docs.filter((d) => d.id !== except).map((d) => d.data().charId).filter(Boolean));
  } catch { return new Set(); }
}

/** Am I already in this party? true / false (null when it cannot be checked). */
export async function amMember(partyId) {
  const { F, db, uid } = need();
  try { return (await F.getDoc(F.doc(db, "parties", partyId, "members", uid))).exists(); } catch { return null; }
}

export function askToJoin(code, invite, ch) {
  const { F, db, uid, name } = need();
  const at = Date.now();
  const b = F.writeBatch(db);
  b.set(F.doc(db, "parties", invite.party, "requests", uid), { name: cleanName(name, 100), ...charFields(ch), code, at });
  b.set(F.doc(db, "users", uid, "parties", invite.party), { name: cleanName(invite.name), state: "asked", at, charId: ch?.id || "" });
  return b.commit();
}

/** My parties with my status in each (see partyStatus) and the character I play there. cb gets [{ id, name, status, charId }]. */
export function watchMyParties(cb) {
  const { F, db, uid } = need();
  const rows = new Map();
  const send = () => cb([...rows.values()].map((r) => ({ id: r.id, name: r.name, status: partyStatus(r), charId: r.charId || "" }))
    .sort((a, b) => a.name.localeCompare(b.name)));
  const meta = { includeMetadataChanges: true };
  const offIndex = F.onSnapshot(F.collection(db, "users", uid, "parties"), (snap) => {
    const seen = new Set();
    snap.forEach((d) => {
      seen.add(d.id);
      let r = rows.get(d.id);
      if (!r) {
        r = { id: d.id, member: null, request: null };
        r.offs = [
          F.onSnapshot(F.doc(db, "parties", d.id, "members", uid), meta, (s) => {
            const was = r.member;
            r.member = exists(s);
            // Accepted: remember it, so that losing the membership later reads as "removed", not "rejected".
            if (r.member && r.state === "asked") F.setDoc(d.ref, { state: "in" }, { merge: true }).catch(() => {});
            if (r.member && !was) {
              // The admin may have renamed the party since: keep my list's name up to date.
              F.getDoc(F.doc(db, "parties", d.id)).then((t) => {
                const name = t.exists() ? t.data().name : "";
                if (name && name !== r.name) F.setDoc(d.ref, { name }, { merge: true }).catch(() => {});
              }).catch(() => {});
              shareTo(d.id, s.data());
            }
            send();
          }, () => {}),
          F.onSnapshot(F.doc(db, "parties", d.id, "requests", uid), meta, (s) => { r.request = exists(s); send(); }, () => {}),
        ];
        rows.set(d.id, r);
      }
      Object.assign(r, { name: d.data().name || "", state: d.data().state, charId: d.data().charId || "" });
    });
    for (const [id, r] of rows) if (!seen.has(id)) { r.offs.forEach((off) => off()); rows.delete(id); }
    send();
  }, () => cb(null));
  return watching(() => { offIndex(); rows.forEach((r) => r.offs.forEach((off) => off())); });
}

/**
 * One party, live. cb gets { party, members, requests, notes, mine, gm, me, missing }:
 * party = null while loading; missing = the party is gone or I am not in it. Requests are read only by admins.
 * notes = party notes, mine = my private notes (each { id, text, at, … }); gm = { uid: GM view } (only for the party's GMs).
 */
export function watchParty(id, cb) {
  const { F, db, uid } = need();
  const s = { party: null, members: [], requests: [], notes: [], mine: [], gm: {}, missing: false };
  const send = () => cb({ ...s, me: s.members.find((m) => m.uid === uid) || null, uid });
  const ref = F.doc(db, "parties", id);
  const gone = () => { s.missing = true; send(); };
  let offRequests = null, offNotes = null, offGm = null;
  const rows = (q) => q.docs.map((d) => ({ id: d.id, ...d.data() }));
  const offMine = F.onSnapshot(F.collection(db, "users", uid, "parties", id, "notes"), (q) => { s.mine = rows(q); send(); }, () => {});
  const offParty = F.onSnapshot(ref, (d) => {
    if (d.exists()) s.party = { id, ...d.data() }; else if (!d.metadata.fromCache) s.missing = true;
    send();
  }, gone);
  const offMembers = F.onSnapshot(F.collection(ref, "members"), (q) => {
    s.members = q.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const mine = s.members.find((m) => m.uid === uid);
    const admin = mine?.role === "admin";
    // Party notes can be read only once I am known to be a member.
    if (mine && !offNotes) offNotes = F.onSnapshot(F.collection(ref, "notes"), (q) => { s.notes = rows(q); send(); }, () => {});
    // My character changed while this party was not looking: send the fresh summary.
    if (mine) shareTo(id, mine);
    if (admin && !offRequests) offRequests = F.onSnapshot(F.collection(ref, "requests"), (r) => {
      s.requests = r.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => a.at - b.at); send();
    }, () => {});
    if (!admin && offRequests) { offRequests(); offRequests = null; s.requests = []; }
    // The GM view of the characters is read only by the party's GMs.
    if (mine?.gm && !offGm) offGm = F.onSnapshot(F.collection(ref, "gm"), (q) => { s.gm = Object.fromEntries(q.docs.map((d) => [d.id, d.data().v])); send(); }, () => {});
    if (!mine?.gm && offGm) { offGm(); offGm = null; s.gm = {}; }
    send();
  }, gone);
  return watching(() => { offParty(); offMembers(); offMine(); offRequests?.(); offNotes?.(); offGm?.(); });
}

// --- D3: what the party sees of my character ---

// The GM view last sent to each party (players never read the GM document back).
const sentGm = new Map();
/** Send my character's summary (and the GM view) to one party, if it changed. m = my member document's data. */
function shareTo(partyId, m) {
  const c = cloud();
  const ch = m?.charId ? getById(m.charId) : null;
  if (!c || !ch) return;
  // A GM confirmed (or took back) my scores from paper: the character keeps it, which locks the scores.
  const ok = confirmFor(ch, m);
  if (JSON.stringify(ok) !== JSON.stringify(ch.paperConfirm || null)) { ch.paperConfirm = ok; upsert(ch); }
  const sheet = summary(ch), charName = cleanName(ch.name, 100);
  if (!sameSheet(sheet, m.sheet) || charName !== m.charName) c.F.updateDoc(c.F.doc(c.db, "parties", partyId, "members", c.uid), { sheet, charName }).catch(() => {});
  const v = gmView(ch), key = c.uid + "/" + partyId;
  if (sameSheet(v, sentGm.get(key))) return;
  sentGm.set(key, v);
  c.F.setDoc(c.F.doc(c.db, "parties", partyId, "gm", c.uid), { v, at: Date.now() }).catch(() => sentGm.delete(key));
}

/** Play another of my characters in this party, or none (e.g. as the GM: ch = null). */
export function setMyChar(partyId, ch) {
  const { F, db, uid } = need();
  const b = F.writeBatch(db), gm = F.doc(db, "parties", partyId, "gm", uid);
  b.update(F.doc(db, "parties", partyId, "members", uid), ch ? { ...charFields(ch), sheet: summary(ch) } : { charId: "", charName: "", sheet: F.deleteField() });
  b.set(F.doc(db, "users", uid, "parties", partyId), { charId: ch?.id || "" }, { merge: true });
  if (ch) b.set(gm, { v: gmView(ch), at: Date.now() }); else b.delete(gm);
  sentGm.delete(uid + "/" + partyId);
  return b.commit();
}

// After my characters change (HP in a fight, a new level…) the parties they play in get the new summary.
// Changes are gathered for a few seconds, so a busy fight does not send a write per click.
const changedChars = new Set();
let shareTimer = null;
async function shareChanged() {
  const c = cloud();
  const ids = new Set(changedChars);
  changedChars.clear();
  if (!c) return;
  const { F, db, uid } = c;
  let parties;
  try { parties = await F.getDocs(F.collection(db, "users", uid, "parties")); } catch { return; }
  for (const d of parties.docs) {
    try {
      const m = await F.getDoc(F.doc(db, "parties", d.id, "members", uid));
      if (m.exists() && ids.has(m.data().charId)) shareTo(d.id, m.data());
    } catch { /* not a member any more, or offline without a cached copy */ }
  }
}
const shareSoon = (ids) => { ids.forEach((id) => changedChars.add(id)); clearTimeout(shareTimer); shareTimer = setTimeout(shareChanged, 3000); };
/** Called once at start-up. */
export function startSharing() {
  onChange((e) => { if (e.type === "put" && cloud()) shareSoon([e.ch.id]); });
  // Once signed in, check every party once: e.g. a GM confirmed my scores from paper while the app was closed.
  let checked = false;
  onAccount((st) => { if (st.status === "in" && !checked) { checked = true; shareSoon(loadAll().map((ch) => ch.id)); } });
}

// --- D3: party info and marching order (admins) ---

/** Name, campaign and next session ("YYYY-MM-DDTHH:MM" or ""). A new name also goes to the invite and my list. */
export function saveInfo(party, { name, campaign, next }) {
  const { F, db, uid } = need();
  const n = cleanName(name) || party.name;
  const b = F.writeBatch(db);
  b.update(F.doc(db, "parties", party.id), { name: n, campaign: cleanName(campaign, CAMPAIGN_MAX), next: validWhen(next) ? next : "" });
  if (n !== party.name) {
    if (party.invite) b.update(F.doc(db, "invites", party.invite), { name: n });
    b.set(F.doc(db, "users", uid, "parties", party.id), { name: n }, { merge: true });
  }
  return b.commit();
}

export function saveMarch(partyId, march) {
  const { F, db } = need();
  if (!validMarch(march)) return Promise.reject(new Error("bad-march"));
  return F.updateDoc(F.doc(db, "parties", partyId), { march: { mode: march.mode, order: [...march.order] } });
}

// --- D3: notes. Party notes: everyone in the party reads them. Private notes: only their author. ---
const notesOf = (F, db, uid, partyId, priv) => (priv ? F.collection(db, "users", uid, "parties", partyId, "notes") : F.collection(db, "parties", partyId, "notes"));

// Party notes are signed with my character in this party (or as the GM): me = my member row (noteSign).
export function addNote(partyId, text, priv, me) {
  const { F, db, uid, name } = need();
  const at = Date.now(), body = cleanNote(text);
  return F.setDoc(F.doc(notesOf(F, db, uid, partyId, priv)), priv ? { text: body, at } : { author: uid, name: cleanName(name, 100), ...noteSign(me), text: body, at });
}
export function editNote(partyId, noteId, text, priv, me) {
  const { F, db, uid, name } = need();
  const at = Date.now(), body = cleanNote(text);
  return F.updateDoc(F.doc(notesOf(F, db, uid, partyId, priv), noteId), priv ? { text: body, at } : { name: cleanName(name, 100), ...noteSign(me), text: body, at });
}
export function deleteNote(partyId, noteId, priv) {
  const { F, db, uid } = need();
  return F.deleteDoc(F.doc(notesOf(F, db, uid, partyId, priv), noteId));
}

export function accept(partyId, req) {
  const { F, db } = need();
  const b = F.writeBatch(db);
  b.set(F.doc(db, "parties", partyId, "members", req.uid), { role: "player", name: cleanName(req.name, 100), charId: req.charId || "", charName: cleanName(req.charName, 100), at: Date.now() });
  b.delete(F.doc(db, "parties", partyId, "requests", req.uid));
  return b.commit();
}
export function reject(partyId, uid) { const { F, db } = need(); return F.deleteDoc(F.doc(db, "parties", partyId, "requests", uid)); }
export function removeMember(partyId, uid) {
  const { F, db } = need();
  const b = F.writeBatch(db);
  b.delete(F.doc(db, "parties", partyId, "members", uid));
  b.delete(F.doc(db, "parties", partyId, "gm", uid));
  return b.commit();
}
/** Give or take the Game Master role (admins). */
/** A GM confirms a member's scores from paper (m = their member row), or takes the confirmation back. */
export function confirmPaper(partyId, m, on) {
  const { F, db, uid, name } = need();
  return F.updateDoc(F.doc(db, "parties", partyId, "members", m.uid), { paperOk: on ? paperConfirmation(m, { uid, name }) : F.deleteField() });
}
export function setGm(partyId, uid, on) { const { F, db } = need(); return F.updateDoc(F.doc(db, "parties", partyId, "members", uid), { gm: !!on }); }
export function setRole(partyId, uid, role) { const { F, db } = need(); return F.updateDoc(F.doc(db, "parties", partyId, "members", uid), { role }); }

/** Leave a party, or take back a request, or drop a finished entry: it also disappears from my list, with my private notes. */
export async function leave(partyId, { member = false, request = false } = {}) {
  const { F, db, uid } = need();
  const b = F.writeBatch(db);
  try { (await F.getDocs(notesOf(F, db, uid, partyId, true))).forEach((d) => b.delete(d.ref)); } catch { /* none known on this device */ }
  if (member) { b.delete(F.doc(db, "parties", partyId, "members", uid)); b.delete(F.doc(db, "parties", partyId, "gm", uid)); }
  if (request) b.delete(F.doc(db, "parties", partyId, "requests", uid));
  b.delete(F.doc(db, "users", uid, "parties", partyId));
  return b.commit();
}

/** A new invite link; the old one stops working. */
export function newInvite(party) {
  const { F, db } = need();
  const code = makeCode();
  const b = F.writeBatch(db);
  if (party.invite) b.delete(F.doc(db, "invites", party.invite));
  b.set(F.doc(db, "invites", code), { party: party.id, name: party.name });
  b.update(F.doc(db, "parties", party.id), { invite: code });
  return b.commit();
}

/** The founder deletes the whole party: notes, members, requests, the invite and the party itself (and my private notes). */
export function deleteParty(view) {
  const { F, db, uid } = need();
  const ref = F.doc(db, "parties", view.party.id);
  const b = F.writeBatch(db);
  view.notes.forEach((n) => b.delete(F.doc(ref, "notes", n.id)));
  view.mine.forEach((n) => b.delete(F.doc(db, "users", uid, "parties", view.party.id, "notes", n.id)));
  view.requests.forEach((r) => b.delete(F.doc(ref, "requests", r.uid)));
  view.members.filter((m) => m.uid !== uid).forEach((m) => b.delete(F.doc(ref, "members", m.uid)));
  view.members.forEach((m) => b.delete(F.doc(ref, "gm", m.uid)));
  if (view.party.invite) b.delete(F.doc(db, "invites", view.party.invite));
  b.delete(ref);
  b.delete(F.doc(ref, "members", uid));
  b.delete(F.doc(db, "users", uid, "parties", view.party.id));
  return b.commit();
}
