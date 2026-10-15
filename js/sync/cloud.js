// Optional account and sync (Firebase: Google sign-in + Firestore).
// Firebase is loaded only after the user chooses to sign in, so without an account nothing is fetched from Google.
// Cloud layout: users/{uid}/characters/{characterId} = { json, updated, deleted } (rules: firestore.rules).
// The device copy (localStorage) stays the one the app reads; this module mirrors it both ways.
// Each account has its own list on the device (store.js), so switching accounts never mixes characters.
// Firebase Analytics is deliberately not loaded (see docs/backlog.md).
import { CONFIG } from "../config.js";
import { storage, loadAll, gone, onChange, applyRemote, currentOwner, setOwner, knownOwner, guestCharacters, moveGuestCharacters } from "../store.js";
import { plan, syncableId, toDoc, goneDoc, fromDoc } from "./merge.js";

const SDK = "https://www.gstatic.com/firebasejs/12.4.0/";
const REDIRECT = "gnoll.signin.redirect"; // "1" while signing in through a page redirect

// status: off (not set up) | out | loading | in | unreachable; sync: ok | pending | offline | error; error: load | signin
// guests: characters made on this device without an account, which can be moved into the signed-in one
const state = { status: "off", user: null, sync: null, error: null, guests: 0 };
const subs = new Set();
export const account = () => state;
export function onAccount(fn) { subs.add(fn); return () => subs.delete(fn); }
const emit = (patch) => { Object.assign(state, patch); subs.forEach((fn) => fn(state)); };

export const accountAvailable = () => !!CONFIG.firebase?.apiKey;

let fb = null;
async function load() {
  if (fb) return fb;
  const [app, A, F] = await Promise.all(["app", "auth", "firestore"].map((n) => import(`${SDK}firebase-${n}.js`)));
  const a = app.initializeApp(CONFIG.firebase);
  // Persistent cache: changes made offline wait on the device and go up when the network is back.
  const db = F.initializeFirestore(a, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  fb = { auth: A.getAuth(a), db, A, F };
  A.onAuthStateChanged(fb.auth, (user) => (user ? signedIn(user) : signedOut()));
  return fb;
}

/** Called once at start-up. */
export function startAccount() {
  if (!accountAvailable()) return;
  if (currentOwner() || storage.get(REDIRECT) === "1") connect(); else emit({ status: "out" });
}

export async function connect() {
  emit({ status: "loading", error: null });
  try { await load(); } catch { emit({ status: currentOwner() ? "unreachable" : "out", error: "load" }); }
}

export async function signIn() {
  emit({ error: null });
  try { await load(); } catch { emit({ status: "out", error: "load" }); return; }
  const provider = new fb.A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try { await fb.A.signInWithPopup(fb.auth, provider); }
  catch (e) {
    if (e?.code === "auth/popup-blocked" || e?.code === "auth/operation-not-supported-in-this-environment") {
      storage.set(REDIRECT, "1"); // finish signing in after coming back
      return fb.A.signInWithRedirect(fb.auth, provider);
    }
    if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") emit({ error: "signin" });
  }
}

/** After signing out the account's characters are hidden (kept for the next sign-in); the no-account list shows. */
export async function signOut() { if (fb) await fb.A.signOut(fb.auth); }

/** Characters made without an account go into the signed-in account. */
export function moveGuests() {
  if (state.status !== "in") return 0;
  const n = moveGuestCharacters();
  emit({ guests: guestCharacters().length });
  if (n) changed();
  return n;
}

const changed = () => dispatchEvent(new CustomEvent("gnoll:remote"));

let stop = null; // ends the cloud listener and the local listener
let uid = null;

function signedIn(user) {
  storage.set(REDIRECT, "0");
  if (stop && uid === user.uid) return;
  stop?.();
  uid = user.uid;
  const first = !knownOwner(uid); // first sign-in of this account on this device
  const switched = currentOwner() !== uid;
  setOwner(uid);
  const { F, db } = fb;
  const col = F.collection(db, "users", uid, "characters");
  const failed = () => emit({ sync: "error" });
  const put = (ch) => { if (syncableId(ch.id)) F.setDoc(F.doc(col, ch.id), toDoc(ch)).catch(failed); };
  const del = (id, at) => { if (syncableId(id)) F.setDoc(F.doc(col, id), goneDoc(at)).catch(failed); };

  const offCloud = F.onSnapshot(col, { includeMetadataChanges: true }, (snap) => {
    const remote = {};
    snap.forEach((d) => { const r = fromDoc(d.data()); if (r) remote[d.id] = r; });
    const p = plan(loadAll(), gone(), remote);
    if (applyRemote(p.put, p.drop)) changed();
    // A snapshot from the device cache may be incomplete: only a fresh one from the server decides what to send.
    if (!snap.metadata.fromCache) { p.push.forEach(put); p.pushGone.forEach((g) => del(g.id, g.at)); }
    // A failed write stays visible until the next sign-in or reload.
    if (state.sync !== "error") emit({ sync: snap.metadata.fromCache ? "offline" : snap.metadata.hasPendingWrites ? "pending" : "ok" });
  }, failed);
  const offLocal = onChange((e) => (e.type === "put" ? put(e.ch) : del(e.id, e.at)));
  stop = () => { offCloud(); offLocal(); stop = null; uid = null; };

  // The first sign-in takes this device's characters along; later ones only offer it (they may be someone else's).
  if (first) moveGuestCharacters();
  emit({ status: "in", user: { name: user.displayName || "", email: user.email || "" }, error: null, sync: "offline", guests: guestCharacters().length });
  if (switched || first) changed();
}

function signedOut() {
  stop?.();
  storage.set(REDIRECT, "0");
  const was = currentOwner();
  setOwner("");
  emit({ status: "out", user: null, sync: null, guests: 0 });
  if (was) changed();
}
