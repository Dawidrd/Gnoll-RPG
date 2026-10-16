// Characters live in this browser (localStorage); the app always reads them from here.
// Each account signed in on this device has its own list; characters made without an account have theirs.
// Without an account that is all. With one, js/sync/cloud.js listens to changes here and keeps a copy in the cloud.
// Moving between devices without an account: export to a file, import on the other device.
import { isPageExport, fromPage } from "./rules/pageimport.js";

export const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* nothing to remove */ } },
};

const KEY = "gnoll.characters.v1"; // characters without an account
const GONE = "gnoll.deleted.v1"; // { id: deletedAt }, so a deletion can reach the cloud later
const OWNER = "gnoll.account"; // id of the account signed in on this device, "" = none

// Known at start-up, so a signed-in device shows its account's characters at once, also offline.
let owner = /^[\w-]{6,128}$/.test(storage.get(OWNER) || "") ? storage.get(OWNER) : "";
const listKey = (o = owner) => (o ? `gnoll.characters.u.${o}` : KEY);
const goneKey = (o = owner) => (o ? `gnoll.deleted.u.${o}` : GONE);
export const currentOwner = () => owner;
/** Has this account been signed in on this device before? */
export const knownOwner = (uid) => storage.get(listKey(uid)) != null;
/** Switch the active list: an account id, or "" for characters without an account. */
export function setOwner(uid) {
  owner = uid || "";
  storage.set(OWNER, owner);
  if (owner && !knownOwner(owner)) storage.set(listKey(), "[]");
}

const listeners = new Set();
/** Local changes made by the user: { type: "put", ch } or { type: "del", id, at }. */
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const notify = (e) => listeners.forEach((fn) => { try { fn(e); } catch { /* sync problems never block saving */ } });

export function gone() {
  try { const m = JSON.parse(storage.get(goneKey()) || "{}"); return m && typeof m === "object" && !Array.isArray(m) ? m : {}; }
  catch { return {}; }
}
const setGone = (m) => storage.set(goneKey(), JSON.stringify(m));

function readList(key) {
  try { const list = JSON.parse(storage.get(key) || "[]"); return Array.isArray(list) ? list : []; }
  catch { return []; }
}
export const loadAll = () => readList(listKey());
export function saveAll(list) { return storage.set(listKey(), JSON.stringify(list)); }

/** Characters made on this device without an account (while an account is active they are hidden). */
export const guestCharacters = () => readList(KEY);

/** Move the characters made without an account into the active account; they then sync like the others. */
export function moveGuestCharacters() {
  const guests = readList(KEY);
  if (!owner || !guests.length) return 0;
  const list = loadAll();
  for (const g of guests) {
    const i = list.findIndex((c) => c.id === g.id);
    if (i < 0) list.push(g);
    else if ((g.updated || 0) > (list[i].updated || 0)) list[i] = g;
  }
  if (!saveAll(list)) return 0;
  storage.set(KEY, "[]");
  storage.set(GONE, "{}");
  for (const g of guests) { const ch = list.find((c) => c.id === g.id); if (ch === g) notify({ type: "put", ch }); }
  return guests.length;
}

/** After an account is deleted this device forgets it. keep: its characters stay here, as characters without an account. */
export function forgetAccount(uid, keep) {
  if (!uid) return;
  if (keep) {
    const guests = readList(KEY);
    for (const ch of readList(listKey(uid))) {
      const i = guests.findIndex((g) => g.id === ch.id);
      if (i < 0) guests.push(ch); else if ((ch.updated || 0) > (guests[i].updated || 0)) guests[i] = ch;
    }
    storage.set(KEY, JSON.stringify(guests));
  }
  storage.del(listKey(uid));
  storage.del(goneKey(uid));
  if (owner === uid) setOwner("");
}

export function upsert(ch) {
  const list = loadAll();
  ch.updated = Date.now();
  const i = list.findIndex((c) => c.id === ch.id);
  if (i >= 0) list[i] = ch; else list.push(ch);
  if (!saveAll(list)) return false;
  const g = gone();
  if (g[ch.id]) { delete g[ch.id]; setGone(g); }
  notify({ type: "put", ch });
  return true;
}

export function remove(id) {
  if (!saveAll(loadAll().filter((c) => c.id !== id))) return false;
  const at = Date.now();
  setGone({ ...gone(), [id]: at });
  notify({ type: "del", id, at });
  return true;
}

/** Changes that came from the cloud: saved as they are (no new time, no echo back). */
export function applyRemote(put, drop) {
  if (!put.length && !drop.length) return false;
  const list = loadAll().filter((c) => !drop.includes(c.id));
  for (const ch of put) {
    const i = list.findIndex((c) => c.id === ch.id);
    if (i >= 0) list[i] = ch; else list.push(ch);
  }
  if (!saveAll(list)) return false;
  const g = gone();
  for (const ch of put) delete g[ch.id];
  setGone(g);
  return true;
}
export const getById = (id) => loadAll().find((c) => c.id === id) || null;

/** File the user can keep or move to another device. */
export function exportFile(ch) {
  const data = JSON.stringify({ app: "gnoll-rpg", version: 1, character: ch }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (ch.name || "character").replace(/[^\p{L}\p{N}_-]+/gu, "-") + ".gnoll.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * Validate an imported file: this app's own export, or an export from one of the old character pages.
 * Returns { ch, report } (report only for page exports) or throws.
 */
export function parseImport(text) {
  const data = JSON.parse(text);
  if (isPageExport(data)) return fromPage(data);
  const ch = data && data.app === "gnoll-rpg" ? data.character : null;
  if (!ch || typeof ch !== "object" || !ch.abilities || !ch.classId) throw new Error("bad-file");
  // A GM's confirmation of scores from paper comes only from the party, never from a file.
  delete ch.paperConfirm;
  return { ch, report: null };
}
