// Merging characters between this device and the cloud account. Pure functions, tested in tests/run.mjs.
// Rule: the newer change wins (by `updated`). A deletion is a change too: it leaves a mark with its time.

/** Character ids that can be used as cloud document names. */
export const syncableId = (id) => typeof id === "string" && /^[\w-]{1,128}$/.test(id);

/** A character read back from the cloud must look like one before it replaces anything on the device. */
export const validCharacter = (ch) => !!ch && typeof ch === "object" && syncableId(ch.id) && !!ch.abilities && !!ch.classId;

/**
 * local: characters on the device; gone: { id: deletedAt } deletions made on the device;
 * remote: { id: { updated, deleted, ch } } from the cloud.
 * Returns what to do on each side:
 *   put: characters to save on the device, drop: ids to delete on the device,
 *   push: characters to send to the cloud, pushGone: [{ id, at }] deletions to send.
 */
export function plan(local, gone, remote) {
  const out = { put: [], drop: [], push: [], pushGone: [] };
  const mine = new Map(local.filter((c) => syncableId(c.id)).map((c) => [c.id, c]));
  for (const [id, r] of Object.entries(remote)) {
    const l = mine.get(id);
    const lt = l ? l.updated || 0 : gone[id] || 0;
    if ((r.updated || 0) > lt) {
      if (r.deleted) { if (l) out.drop.push(id); }
      else out.put.push(r.ch);
    } else if ((r.updated || 0) < lt) {
      if (l) out.push.push(l);
      else if (!r.deleted) out.pushGone.push({ id, at: lt });
    }
  }
  // Characters the cloud has never seen (e.g. the first sign-in on this device) go up.
  for (const [id, l] of mine) if (!remote[id]) out.push.push(l);
  return out;
}

/** Cloud document <-> character. The character is kept as text so any shape of data fits. */
export const toDoc = (ch) => ({ json: JSON.stringify(ch), updated: ch.updated || 0, deleted: false });
export const goneDoc = (at) => ({ json: "", updated: at, deleted: true });
export function fromDoc(data) {
  const updated = Number(data?.updated) || 0;
  if (data?.deleted) return { updated, deleted: true, ch: null };
  let ch = null;
  try { ch = JSON.parse(data?.json); } catch { return null; }
  return validCharacter(ch) ? { updated, deleted: false, ch } : null;
}
