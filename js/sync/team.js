// Teams (D2): founding a team, invite links, requests, accepting or rejecting, removing players, roles.
// Shared data (D3): team info, marching order, notes, and a short summary of each member's character.
// Cloud layout (who may read and write what: firestore.rules):
//   teams/{teamId}                 = { name, owner, invite, created, campaign?, next?, march?: { mode: "5"|"10", order: [uid] } }
//   teams/{teamId}/members/{uid}   = { role: admin|player, name, charId, charName, at, sheet? }   (sheet: teamlogic.js sheetSummary)
//   teams/{teamId}/requests/{uid}  = { name, charId, charName, code, at }
//   teams/{teamId}/notes/{id}      = { author, name, text, at }   (team notes)
//   invites/{code}                 = { team, name }   (read only by its exact code, never listed)
//   users/{uid}/teams/{teamId}     = { name, state: asked|in, at }   (my own list of teams)
//   users/{uid}/teams/{teamId}/notes/{id} = { text, at }   (my private notes for that team)
// Writes go to the device cache at once and to the server when online; the returned promise fails if the server refuses.
import { cloud } from "./cloud.js";
import { onChange, getById } from "../store.js";
import { compute } from "../rules/index.js";
import { makeCode, cleanName, cleanNote, teamStatus, sheetSummary, sameSheet, validWhen, validMarch, CAMPAIGN_MAX } from "./teamlogic.js";

const need = () => { const c = cloud(); if (!c) throw new Error("signed-out"); return c; };
const charFields = (ch) => ({ charId: ch?.id || "", charName: cleanName(ch?.name, 100) });
const summary = (ch) => sheetSummary(ch, compute(structuredClone(ch)));
const exists = (snap) => (snap.exists() ? true : snap.metadata.fromCache ? null : false); // null = not known yet (offline)

// Listeners of the screen that is open; main.js stops them when the screen changes.
const views = new Set();
const watching = (off) => { views.add(off); return off; };
export function stopWatching() { views.forEach((off) => { try { off(); } catch { /* already stopped */ } }); views.clear(); }

/** New team with me as its admin. Returns { id, done } (done: the server's answer). */
export function createTeam(name, ch) {
  const { F, db, uid, name: me } = need();
  const team = F.doc(F.collection(db, "teams"));
  const code = makeCode(), at = Date.now(), n = cleanName(name);
  const b = F.writeBatch(db);
  b.set(team, { name: n, owner: uid, invite: code, created: at });
  b.set(F.doc(team, "members", uid), { role: "admin", name: cleanName(me, 100), ...charFields(ch), at });
  b.set(F.doc(db, "invites", code), { team: team.id, name: n });
  b.set(F.doc(db, "users", uid, "teams", team.id), { name: n, state: "in", at });
  return { id: team.id, done: b.commit() };
}

/** The team behind an invite code: { team, name }, or null when the link no longer works. Needs the internet. */
export async function readInvite(code) {
  const { F, db } = need();
  const d = await F.getDoc(F.doc(db, "invites", code));
  return d.exists() ? d.data() : null;
}

/** Am I already in this team? true / false (null when it cannot be checked). */
export async function amMember(teamId) {
  const { F, db, uid } = need();
  try { return (await F.getDoc(F.doc(db, "teams", teamId, "members", uid))).exists(); } catch { return null; }
}

export function askToJoin(code, invite, ch) {
  const { F, db, uid, name } = need();
  const at = Date.now();
  const b = F.writeBatch(db);
  b.set(F.doc(db, "teams", invite.team, "requests", uid), { name: cleanName(name, 100), ...charFields(ch), code, at });
  b.set(F.doc(db, "users", uid, "teams", invite.team), { name: cleanName(invite.name), state: "asked", at });
  return b.commit();
}

/** My teams with my status in each (see teamStatus). cb gets [{ id, name, status }]. */
export function watchMyTeams(cb) {
  const { F, db, uid } = need();
  const rows = new Map();
  const send = () => cb([...rows.values()].map((r) => ({ id: r.id, name: r.name, status: teamStatus(r) }))
    .sort((a, b) => a.name.localeCompare(b.name)));
  const meta = { includeMetadataChanges: true };
  const offIndex = F.onSnapshot(F.collection(db, "users", uid, "teams"), (snap) => {
    const seen = new Set();
    snap.forEach((d) => {
      seen.add(d.id);
      let r = rows.get(d.id);
      if (!r) {
        r = { id: d.id, member: null, request: null };
        r.offs = [
          F.onSnapshot(F.doc(db, "teams", d.id, "members", uid), meta, (s) => {
            const was = r.member;
            r.member = exists(s);
            // Accepted: remember it, so that losing the membership later reads as "removed", not "rejected".
            if (r.member && r.state === "asked") F.setDoc(d.ref, { state: "in" }, { merge: true }).catch(() => {});
            if (r.member && !was) {
              // The admin may have renamed the team since: keep my list's name up to date.
              F.getDoc(F.doc(db, "teams", d.id)).then((t) => {
                const name = t.exists() ? t.data().name : "";
                if (name && name !== r.name) F.setDoc(d.ref, { name }, { merge: true }).catch(() => {});
              }).catch(() => {});
              shareTo(d.id, s.data());
            }
            send();
          }, () => {}),
          F.onSnapshot(F.doc(db, "teams", d.id, "requests", uid), meta, (s) => { r.request = exists(s); send(); }, () => {}),
        ];
        rows.set(d.id, r);
      }
      Object.assign(r, { name: d.data().name || "", state: d.data().state });
    });
    for (const [id, r] of rows) if (!seen.has(id)) { r.offs.forEach((off) => off()); rows.delete(id); }
    send();
  }, () => cb(null));
  return watching(() => { offIndex(); rows.forEach((r) => r.offs.forEach((off) => off())); });
}

/**
 * One team, live. cb gets { team, members, requests, notes, mine, me, missing }:
 * team = null while loading; missing = the team is gone or I am not in it. Requests are read only by admins.
 * notes = team notes, mine = my private notes (each { id, text, at, … }).
 */
export function watchTeam(id, cb) {
  const { F, db, uid } = need();
  const s = { team: null, members: [], requests: [], notes: [], mine: [], missing: false };
  const send = () => cb({ ...s, me: s.members.find((m) => m.uid === uid) || null, uid });
  const ref = F.doc(db, "teams", id);
  const gone = () => { s.missing = true; send(); };
  let offRequests = null, offNotes = null;
  const rows = (q) => q.docs.map((d) => ({ id: d.id, ...d.data() }));
  const offMine = F.onSnapshot(F.collection(db, "users", uid, "teams", id, "notes"), (q) => { s.mine = rows(q); send(); }, () => {});
  const offTeam = F.onSnapshot(ref, (d) => {
    if (d.exists()) s.team = { id, ...d.data() }; else if (!d.metadata.fromCache) s.missing = true;
    send();
  }, gone);
  const offMembers = F.onSnapshot(F.collection(ref, "members"), (q) => {
    s.members = q.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const mine = s.members.find((m) => m.uid === uid);
    const admin = mine?.role === "admin";
    // Team notes can be read only once I am known to be a member.
    if (mine && !offNotes) offNotes = F.onSnapshot(F.collection(ref, "notes"), (q) => { s.notes = rows(q); send(); }, () => {});
    // My character changed while this team was not looking: send the fresh summary.
    if (mine) shareTo(id, mine);
    if (admin && !offRequests) offRequests = F.onSnapshot(F.collection(ref, "requests"), (r) => {
      s.requests = r.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => a.at - b.at); send();
    }, () => {});
    if (!admin && offRequests) { offRequests(); offRequests = null; s.requests = []; }
    send();
  }, gone);
  return watching(() => { offTeam(); offMembers(); offMine(); offRequests?.(); offNotes?.(); });
}

// --- D3: what the team sees of my character ---

/** Send my character's summary to one team, if it changed. m = my member document's data. */
function shareTo(teamId, m) {
  const c = cloud();
  const ch = m?.charId ? getById(m.charId) : null;
  if (!c || !ch) return;
  const sheet = summary(ch), charName = cleanName(ch.name, 100);
  if (sameSheet(sheet, m.sheet) && charName === m.charName) return;
  c.F.updateDoc(c.F.doc(c.db, "teams", teamId, "members", c.uid), { sheet, charName }).catch(() => {});
}

/** Play another of my characters in this team, or none (e.g. as the GM: ch = null). */
export function setMyChar(teamId, ch) {
  const { F, db, uid } = need();
  return F.updateDoc(F.doc(db, "teams", teamId, "members", uid),
    ch ? { ...charFields(ch), sheet: summary(ch) } : { charId: "", charName: "", sheet: F.deleteField() });
}

// After my characters change (HP in a fight, a new level…) the teams they play in get the new summary.
// Changes are gathered for a few seconds, so a busy fight does not send a write per click.
const changedChars = new Set();
let shareTimer = null;
async function shareChanged() {
  const c = cloud();
  const ids = new Set(changedChars);
  changedChars.clear();
  if (!c) return;
  const { F, db, uid } = c;
  let teams;
  try { teams = await F.getDocs(F.collection(db, "users", uid, "teams")); } catch { return; }
  for (const d of teams.docs) {
    try {
      const m = await F.getDoc(F.doc(db, "teams", d.id, "members", uid));
      if (m.exists() && ids.has(m.data().charId)) shareTo(d.id, m.data());
    } catch { /* not a member any more, or offline without a cached copy */ }
  }
}
/** Called once at start-up. */
export function startSharing() {
  onChange((e) => {
    if (e.type !== "put" || !cloud()) return;
    changedChars.add(e.ch.id);
    clearTimeout(shareTimer);
    shareTimer = setTimeout(shareChanged, 3000);
  });
}

// --- D3: team info and marching order (admins) ---

/** Name, campaign and next session ("YYYY-MM-DDTHH:MM" or ""). A new name also goes to the invite and my list. */
export function saveInfo(team, { name, campaign, next }) {
  const { F, db, uid } = need();
  const n = cleanName(name) || team.name;
  const b = F.writeBatch(db);
  b.update(F.doc(db, "teams", team.id), { name: n, campaign: cleanName(campaign, CAMPAIGN_MAX), next: validWhen(next) ? next : "" });
  if (n !== team.name) {
    if (team.invite) b.update(F.doc(db, "invites", team.invite), { name: n });
    b.set(F.doc(db, "users", uid, "teams", team.id), { name: n }, { merge: true });
  }
  return b.commit();
}

export function saveMarch(teamId, march) {
  const { F, db } = need();
  if (!validMarch(march)) return Promise.reject(new Error("bad-march"));
  return F.updateDoc(F.doc(db, "teams", teamId), { march: { mode: march.mode, order: [...march.order] } });
}

// --- D3: notes. Team notes: everyone in the team reads them. Private notes: only their author. ---
const notesOf = (F, db, uid, teamId, priv) => (priv ? F.collection(db, "users", uid, "teams", teamId, "notes") : F.collection(db, "teams", teamId, "notes"));

export function addNote(teamId, text, priv) {
  const { F, db, uid, name } = need();
  const at = Date.now(), body = cleanNote(text);
  return F.setDoc(F.doc(notesOf(F, db, uid, teamId, priv)), priv ? { text: body, at } : { author: uid, name: cleanName(name, 100), text: body, at });
}
export function editNote(teamId, noteId, text, priv) {
  const { F, db, uid, name } = need();
  const at = Date.now(), body = cleanNote(text);
  return F.updateDoc(F.doc(notesOf(F, db, uid, teamId, priv), noteId), priv ? { text: body, at } : { name: cleanName(name, 100), text: body, at });
}
export function deleteNote(teamId, noteId, priv) {
  const { F, db, uid } = need();
  return F.deleteDoc(F.doc(notesOf(F, db, uid, teamId, priv), noteId));
}

export function accept(teamId, req) {
  const { F, db } = need();
  const b = F.writeBatch(db);
  b.set(F.doc(db, "teams", teamId, "members", req.uid), { role: "player", name: cleanName(req.name, 100), charId: req.charId || "", charName: cleanName(req.charName, 100), at: Date.now() });
  b.delete(F.doc(db, "teams", teamId, "requests", req.uid));
  return b.commit();
}
export function reject(teamId, uid) { const { F, db } = need(); return F.deleteDoc(F.doc(db, "teams", teamId, "requests", uid)); }
export function removeMember(teamId, uid) { const { F, db } = need(); return F.deleteDoc(F.doc(db, "teams", teamId, "members", uid)); }
export function setRole(teamId, uid, role) { const { F, db } = need(); return F.updateDoc(F.doc(db, "teams", teamId, "members", uid), { role }); }

/** Leave a team, or take back a request, or drop a finished entry: it also disappears from my list, with my private notes. */
export async function leave(teamId, { member = false, request = false } = {}) {
  const { F, db, uid } = need();
  const b = F.writeBatch(db);
  try { (await F.getDocs(notesOf(F, db, uid, teamId, true))).forEach((d) => b.delete(d.ref)); } catch { /* none known on this device */ }
  if (member) b.delete(F.doc(db, "teams", teamId, "members", uid));
  if (request) b.delete(F.doc(db, "teams", teamId, "requests", uid));
  b.delete(F.doc(db, "users", uid, "teams", teamId));
  return b.commit();
}

/** A new invite link; the old one stops working. */
export function newInvite(team) {
  const { F, db } = need();
  const code = makeCode();
  const b = F.writeBatch(db);
  if (team.invite) b.delete(F.doc(db, "invites", team.invite));
  b.set(F.doc(db, "invites", code), { team: team.id, name: team.name });
  b.update(F.doc(db, "teams", team.id), { invite: code });
  return b.commit();
}

/** The founder deletes the whole team: notes, members, requests, the invite and the team itself (and my private notes). */
export function deleteTeam(view) {
  const { F, db, uid } = need();
  const ref = F.doc(db, "teams", view.team.id);
  const b = F.writeBatch(db);
  view.notes.forEach((n) => b.delete(F.doc(ref, "notes", n.id)));
  view.mine.forEach((n) => b.delete(F.doc(db, "users", uid, "teams", view.team.id, "notes", n.id)));
  view.requests.forEach((r) => b.delete(F.doc(ref, "requests", r.uid)));
  view.members.filter((m) => m.uid !== uid).forEach((m) => b.delete(F.doc(ref, "members", m.uid)));
  if (view.team.invite) b.delete(F.doc(db, "invites", view.team.invite));
  b.delete(ref);
  b.delete(F.doc(ref, "members", uid));
  b.delete(F.doc(db, "users", uid, "teams", view.team.id));
  return b.commit();
}
