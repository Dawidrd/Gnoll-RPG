// Characters live only in this browser (localStorage). No account, no server.
// Moving between devices: export to a file, import on the other device.

export const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};

const KEY = "gnoll.characters.v1";

export function loadAll() {
  try { const list = JSON.parse(storage.get(KEY) || "[]"); return Array.isArray(list) ? list : []; }
  catch { return []; }
}

export function saveAll(list) { return storage.set(KEY, JSON.stringify(list)); }

export function upsert(ch) {
  const list = loadAll();
  ch.updated = Date.now();
  const i = list.findIndex((c) => c.id === ch.id);
  if (i >= 0) list[i] = ch; else list.push(ch);
  return saveAll(list);
}

export function remove(id) { return saveAll(loadAll().filter((c) => c.id !== id)); }
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

/** Validate an imported file. Returns the character or throws. */
export function parseImport(text) {
  const data = JSON.parse(text);
  const ch = data && data.app === "gnoll-rpg" ? data.character : null;
  if (!ch || typeof ch !== "object" || !ch.abilities || !ch.classId) throw new Error("bad-file");
  return ch;
}
