// Notes (0.36.0): one list on the Notes tab. Private notes ("🔒 only me") live in the character (ch.notebook);
// party notes ("👥 party") live in the cloud (sync/party.js). Each note: { id, text, at }.
// Older characters had three other places for notes: the Notes text (ch.notes), the session journal (ch.journal)
// and the familiar's notes (ch.familiar.notes). They all move into private notes here; nothing is dropped.

const stamp = (date) => { const t = Date.parse(date + "T12:00:00"); return Number.isFinite(t) ? t : 0; };
const text = (s) => String(s ?? "").replace(/\r\n?/g, "\n").trim();

/** Move older notes into ch.notebook (in place). A note already there with the same text is not added twice. */
export function migrateNotes(ch) {
  if (!Array.isArray(ch.notebook)) ch.notebook = [];
  const add = (id, body, at) => {
    body = text(body);
    if (!body || ch.notebook.some((n) => n.id === id || n.text === body)) return;
    ch.notebook.push({ id, text: body, at: at || 0 });
  };
  if (typeof ch.notes === "string") add("old-notes", ch.notes, ch.updated);
  if ("notes" in ch) delete ch.notes;
  if (Array.isArray(ch.journal)) {
    for (const e of ch.journal) if (e) add("j-" + (e.id || e.created || Math.random().toString(36).slice(2)), [e.title, e.body].map(text).filter(Boolean).join("\n"), stamp(e.date) || e.created);
  }
  if ("journal" in ch) delete ch.journal;
  const f = ch.familiar;
  if (f && text(f.notes)) add("old-familiar", `🐾 ${text(f.name) || text(f.kind) || "Chowaniec / Familiar"}\n${text(f.notes)}`, ch.updated);
  if (f && "notes" in f) delete f.notes;
  return ch;
}

/** Private notes from the old "My notes" of a party (in the cloud) not yet copied into the character. */
export const partyPrivateToCopy = (notebook, mine) => (mine || []).filter((n) => text(n.text) && !notebook.some((x) => x.id === "pm-" + n.id));
export const copiedNote = (n) => ({ id: "pm-" + n.id, text: text(n.text), at: n.at || 0 });

/**
 * One list for the Notes tab: private and party notes together, newest first.
 * show: "all" | "mine" | "party". Each row: { ...note, shared }.
 */
export function noteBoard(priv, party, show = "all") {
  const rows = [
    ...(show === "party" ? [] : (priv || []).map((n) => ({ ...n, shared: false }))),
    ...(show === "mine" ? [] : (party || []).map((n) => ({ ...n, shared: true }))),
  ];
  return rows.sort((a, b) => (b.at || 0) - (a.at || 0));
}

/** The first line shows as the note's title when there is more than one line. */
export function noteParts(s) {
  const t = text(s);
  const i = t.indexOf("\n");
  return i < 0 ? { title: "", body: t } : { title: t.slice(0, i).trim(), body: t.slice(i + 1).trim() };
}
