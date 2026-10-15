// Teams (D2): founding a team, invite links, requests, accepting or rejecting, removing players, roles.
// Cloud layout (who may read and write what: firestore.rules):
//   teams/{teamId}                 = { name, owner, invite, created }
//   teams/{teamId}/members/{uid}   = { role: admin|player, name, charId, charName, at }
//   teams/{teamId}/requests/{uid}  = { name, charId, charName, code, at }
//   invites/{code}                 = { team, name }   (read only by its exact code, never listed)
//   users/{uid}/teams/{teamId}     = { name, state: asked|in, at }   (my own list of teams)
// Writes go to the device cache at once and to the server when online; the returned promise fails if the server refuses.
import { cloud } from "./cloud.js";
import { makeCode, cleanName, teamStatus } from "./teamlogic.js";

const need = () => { const c = cloud(); if (!c) throw new Error("signed-out"); return c; };
const charFields = (ch) => ({ charId: ch?.id || "", charName: cleanName(ch?.name, 100) });
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
            r.member = exists(s);
            // Accepted: remember it, so that losing the membership later reads as "removed", not "rejected".
            if (r.member && r.state === "asked") F.setDoc(d.ref, { state: "in" }, { merge: true }).catch(() => {});
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
 * One team, live. cb gets { team, members, requests, me, missing }:
 * team = null while loading; missing = the team is gone or I am not in it. Requests are read only by admins.
 */
export function watchTeam(id, cb) {
  const { F, db, uid } = need();
  const s = { team: null, members: [], requests: [], missing: false };
  const send = () => cb({ ...s, me: s.members.find((m) => m.uid === uid) || null, uid });
  const ref = F.doc(db, "teams", id);
  const gone = () => { s.missing = true; send(); };
  let offRequests = null;
  const offTeam = F.onSnapshot(ref, (d) => {
    if (d.exists()) s.team = { id, ...d.data() }; else if (!d.metadata.fromCache) s.missing = true;
    send();
  }, gone);
  const offMembers = F.onSnapshot(F.collection(ref, "members"), (q) => {
    s.members = q.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const admin = s.members.find((m) => m.uid === uid)?.role === "admin";
    if (admin && !offRequests) offRequests = F.onSnapshot(F.collection(ref, "requests"), (r) => {
      s.requests = r.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => a.at - b.at); send();
    }, () => {});
    if (!admin && offRequests) { offRequests(); offRequests = null; s.requests = []; }
    send();
  }, gone);
  return watching(() => { offTeam(); offMembers(); offRequests?.(); });
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

/** Leave a team, or take back a request, or drop a finished entry: it also disappears from my list. */
export function leave(teamId, { member = false, request = false } = {}) {
  const { F, db, uid } = need();
  const b = F.writeBatch(db);
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

/** The founder deletes the whole team: members, requests, the invite and the team itself. */
export function deleteTeam(view) {
  const { F, db, uid } = need();
  const ref = F.doc(db, "teams", view.team.id);
  const b = F.writeBatch(db);
  view.requests.forEach((r) => b.delete(F.doc(ref, "requests", r.uid)));
  view.members.filter((m) => m.uid !== uid).forEach((m) => b.delete(F.doc(ref, "members", m.uid)));
  if (view.team.invite) b.delete(F.doc(db, "invites", view.team.invite));
  b.delete(ref);
  b.delete(F.doc(ref, "members", uid));
  b.delete(F.doc(db, "users", uid, "teams", view.team.id));
  return b.commit();
}
