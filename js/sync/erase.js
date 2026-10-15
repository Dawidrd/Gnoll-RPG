// Deleting an account (D4): everything the user has in the cloud, then the sign-in account itself.
// Order matters: my team notes go while I am still a member (afterwards I could not find them),
// teams I founded are deleted for everyone (like "Delete team"), characters go last, then the Google sign-in account.
// Everything is read from the server, not the device cache, so nothing is missed: this needs the internet.
// The rules that allow each step are tested in tests/run.mjs ("deleting an account…").
import { cloud, confirmIdentity, pauseSync, resumeSync, removeAccount } from "./cloud.js";

const BATCH = 400; // Firestore takes up to 500 writes in one batch

async function commit(F, db, refs) {
  for (let i = 0; i < refs.length; i += BATCH) {
    const b = F.writeBatch(db);
    refs.slice(i, i + BATCH).forEach((r) => b.delete(r));
    await b.commit();
  }
}

async function eraseCloud({ F, db, uid }) {
  const all = (q) => F.getDocsFromServer(q).then((s) => s.docs);
  for (const entry of await all(F.collection(db, "users", uid, "teams"))) {
    const ref = F.doc(db, "teams", entry.id), mine = F.doc(ref, "members", uid);
    const member = (await F.getDocFromServer(mine)).exists();
    const team = member ? (await F.getDocFromServer(ref)).data() : null;
    const refs = [];
    if (team?.owner === uid) {
      for (const col of ["notes", "requests", "members"]) (await all(F.collection(ref, col))).forEach((d) => { if (d.ref.path !== mine.path) refs.push(d.ref); });
      if (team.invite) refs.push(F.doc(db, "invites", team.invite));
      await commit(F, db, refs.splice(0));
      // The team and my seat in it go together: the rules let the founder's seat go only with the team.
      const b = F.writeBatch(db); b.delete(ref); b.delete(mine); await b.commit();
    } else if (member) {
      (await all(F.query(F.collection(ref, "notes"), F.where("author", "==", uid)))).forEach((d) => refs.push(d.ref));
      refs.push(mine);
    } else refs.push(F.doc(ref, "requests", uid)); // a request still waiting (or already answered)
    (await all(F.collection(entry.ref, "notes"))).forEach((d) => refs.push(d.ref)); // my private notes
    refs.push(entry.ref);
    await commit(F, db, refs);
  }
  await commit(F, db, (await all(F.collection(db, "users", uid, "characters"))).map((d) => d.ref));
}

/**
 * Delete the signed-in account and all its cloud data. keep: its characters stay on this device, without an account.
 * step(name) tells the screen what is happening: "confirm" (Google asks again), "erase", "account".
 */
export async function deleteAccount(keep, step = () => {}) {
  const c = cloud();
  if (!c) throw new Error("signed-out");
  step("confirm");
  await confirmIdentity();
  step("erase");
  pauseSync();
  try {
    await eraseCloud(c);
    step("account");
    await removeAccount(keep);
  } catch (e) {
    resumeSync(); // nothing is lost: the device still has every character and sends them back up
    throw e;
  }
}
