// Deleting an account (D4): everything the user has in the cloud, then the sign-in account itself.
// Order matters: my party notes go while I am still a member (afterwards I could not find them),
// parties I founded are deleted for everyone (like "Delete party"), then characters and my chosen name, then the Google sign-in account.
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
  for (const entry of await all(F.collection(db, "users", uid, "parties"))) {
    const ref = F.doc(db, "parties", entry.id), mine = F.doc(ref, "members", uid);
    const member = (await F.getDocFromServer(mine)).exists();
    const party = member ? (await F.getDocFromServer(ref)).data() : null;
    const refs = [];
    if (party?.owner === uid) {
      for (const col of ["notes", "requests", "members"]) (await all(F.collection(ref, col))).forEach((d) => {
        if (col === "members") refs.push(F.doc(ref, "gm", d.id)); // GM views: an admin may delete them without reading them
        if (d.ref.path !== mine.path) refs.push(d.ref);
      });
      if (party.invite) refs.push(F.doc(db, "invites", party.invite));
      await commit(F, db, refs.splice(0));
      // The party and my seat in it go together: the rules let the founder's seat go only with the party.
      const b = F.writeBatch(db); b.delete(ref); b.delete(mine); await b.commit();
    } else if (member) {
      (await all(F.query(F.collection(ref, "notes"), F.where("author", "==", uid)))).forEach((d) => refs.push(d.ref));
      refs.push(F.doc(ref, "gm", uid), mine);
    } else refs.push(F.doc(ref, "requests", uid)); // a request still waiting (or already answered)
    (await all(F.collection(entry.ref, "notes"))).forEach((d) => refs.push(d.ref)); // my private notes
    refs.push(entry.ref);
    await commit(F, db, refs);
  }
  await commit(F, db, (await all(F.collection(db, "users", uid, "characters"))).map((d) => d.ref));
  await F.deleteDoc(F.doc(db, "users", uid, "profile", "me")); // the name I chose for my parties
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
