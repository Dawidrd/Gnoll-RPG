// Notes (0.36.0): one list with a switch on every note — "🔒 only me" or "👥 party".
// On a character sheet (the Notes tab) private notes live in the character; party notes live in the party (cloud).
// A Game Master without a character uses the same list on the party screen, with private notes in the cloud as before.
import { h, toast } from "../dom.js";
import { t, lang } from "../i18n.js";
import { upsert } from "../store.js";
import { account, onAccount, accountAvailable } from "../sync/cloud.js";
import * as PARTY from "../sync/party.js";
import { NOTE_MAX, canEditNote, canDeleteNote, noteSigned } from "../sync/partylogic.js";
import { noteBoard, noteParts, partyPrivateToCopy, copiedNote, migrateNotes } from "../rules/notes.js";
import { confirmer, painter } from "./live.js";

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const fail = () => toast(t("party.err.save"));
const day = (at) => (at ? new Date(at).toLocaleDateString(lang(), { day: "numeric", month: "short", year: "numeric" }) : t("notes.noDate"));
const btn = (text, onclick, cls = "btn small", attrs = {}) => h("button", { type: "button", cls, text, onclick, ...attrs });
const seg = (label, items, cur, set) => h("div", { cls: "seg small", role: "group", "aria-label": label }, items.map(([k, text, disabled]) =>
  h("button", { type: "button", "aria-pressed": cur === k ? "true" : "false", disabled: !!disabled, text, onclick: () => set(k) })));
const area = (value, onInput, attrs) => {
  const el = h("textarea", { rows: 4, ...attrs });
  el.value = value;
  el.addEventListener("input", () => onInput(el.value));
  return el;
};

/**
 * The old "My notes" of a party (private, in the cloud) move into the character playing there.
 * The character is saved first; only then are the cloud copies removed. Returns how many moved.
 */
export function bringPartyNotes(ch, v) {
  if (!ch || !v?.party || !v.mine?.length) return 0;
  migrateNotes(ch);
  const copy = partyPrivateToCopy(ch.notebook, v.mine);
  if (copy.length) {
    ch.notebook.push(...copy.map(copiedNote));
    if (!upsert(ch)) return 0;
  }
  // Already copied earlier (e.g. on another screen) but still in the cloud: remove those too.
  v.mine.filter((n) => ch.notebook.some((x) => x.id === "pm-" + n.id)).forEach((n) => PARTY.deleteNote(v.party.id, n.id, true).catch(() => {}));
  return copy.length;
}

/**
 * The list with the "new note" box. o = { ui, priv, party, uid, me, why, ops, ask, box, redraw }:
 * ui = { show, text, shared, editing, asking } (kept by the caller); priv / party = notes ([] or null: party notes not possible, `why` says why);
 * ops = { add(text, shared), edit(row, text), remove(row), move(row) }; ask / box = a confirmer() just for this list.
 * 0.39.1: a question about a note shows right under that note (not at the top, where the page jumped to the new-note box);
 * "No" or Esc gives the focus back to the button that asked; after deleting, the focus goes to the next note or the list title.
 */
export function drawBoard(o) {
  const { ui, party } = o;
  const canShare = !!party;
  if (!canShare) { ui.shared = false; ui.show = "all"; }
  const add = () => {
    if (!ui.text.trim()) return toast(t("party.notes.empty"));
    if (ui.shared && ui.text.trim().length > NOTE_MAX) return toast(t("notes.tooLong", { n: NOTE_MAX }));
    o.ops.add(ui.text, ui.shared);
    ui.text = ""; o.redraw();
  };
  const fresh = h("section", { cls: "card stack" + (ui.shared ? "" : " note-private"), id: "notes-new" }, [
    h("h3", { text: t("notes.new") }),
    seg(t("notes.who"), [["me", "🔒 " + t("notes.onlyMe")], ["party", "👥 " + t("notes.party"), !canShare]], ui.shared ? "party" : "me",
      (k) => { ui.shared = k === "party"; o.redraw(); }),
    h("p", { cls: "hint", text: t(ui.shared ? "notes.partyHint" : "notes.meHint") + (canShare ? "" : " " + t(o.why)) }),
    area(ui.text, (x) => (ui.text = x), { id: "note-new", maxlength: ui.shared ? NOTE_MAX : false, "aria-label": t("notes.new"),
      placeholder: t(ui.shared ? "party.notes.partyPh" : "notes.mePh") }),
    h("div", { cls: "row" }, [btn(t("party.notes.add"), add, "btn gold", { id: "note-add" })]),
  ]);

  const keyOf = (n) => (n.shared ? "p:" : "m:") + n.id;
  const inList = (key, sel = "") => document.querySelector(`#notes-list [data-key="${CSS.escape(key)}"] ${sel}`.trim());
  const askAt = (key, act, text, fn) => {
    const n = ui.askN = (ui.askN || 0) + 1; // closing an older question must not hide this one
    ui.asking = key; o.redraw();
    o.ask(text, fn, { onClose: () => { if (ui.askN === n) ui.asking = null; }, back: () => inList(key, `[data-act="${act}"]`)?.focus() });
  };
  const note = (n) => {
    const key = keyOf(n);
    if (ui.editing?.key === key) {
      return h("article", { cls: "note" + (n.shared ? "" : " note-private") }, [
        area(ui.editing.text, (x) => (ui.editing.text = x), { rows: 6, maxlength: n.shared ? NOTE_MAX : false, "aria-label": t("party.notes.edit") }),
        h("div", { cls: "row" }, [
          btn(t("party.save"), () => {
            if (!ui.editing.text.trim()) return toast(t("party.notes.empty"));
            o.ops.edit(n, ui.editing.text); ui.editing = null; o.redraw();
          }, "btn gold"),
          btn(t("party.cancel"), () => { ui.editing = null; o.redraw(); }, "btn ghost"),
        ]),
      ]);
    }
    const { title, body } = noteParts(n.text);
    const mine = !n.shared || n.author === o.uid;
    const mayEdit = !n.shared || canEditNote(n, o.uid), mayDelete = !n.shared || canDeleteNote(n, o.me);
    const meta = n.shared
      ? `👥 ${t("notes.party")} · ${noteSigned(n, t("party.notes.gmSign"))}${n.author === o.uid ? " " + t("party.you") : ""} · ${day(n.at)}`
      : `🔒 ${t("notes.onlyMe")} · ${day(n.at)}`;
    return h("article", { cls: "note" + (n.shared ? "" : " note-private"), "data-key": key, tabindex: "-1" }, [
      title ? h("p", { cls: "note-title", text: title }) : null,
      body ? h("p", { cls: "note-text", text: body }) : null,
      h("p", { cls: "hint", text: meta }),
      h("div", { cls: "row" }, [
        mayEdit ? btn(t("party.notes.edit"), () => { ui.editing = { key, text: n.text }; o.redraw(); }) : null,
        !n.shared && canShare ? btn("👥 " + t("notes.toParty"), () => {
          if (n.text.trim().length > NOTE_MAX) return toast(t("notes.tooLong", { n: NOTE_MAX }));
          askAt(key, "move", t("notes.toPartyConfirm"), () => { o.ops.move(n); o.redraw(); });
        }, "btn small", { "data-act": "move" }) : null,
        n.shared && mine ? btn("🔒 " + t("notes.toMe"), () => askAt(key, "move", t("notes.toMeConfirm"), () => { o.ops.move(n); o.redraw(); }), "btn small", { "data-act": "move" }) : null,
        mayDelete ? btn(t("party.notes.delete"), () => askAt(key, "del", t("party.notes.deleteConfirm"), () => {
          const at = rows.indexOf(n), next = rows[at + 1] || rows[at - 1]; // party notes leave the list only when the cloud answers
          o.ops.remove(n); o.redraw();
          ((next && inList(keyOf(next))) || document.getElementById("notes-heading"))?.focus();
        }), "btn small ghost", { "data-act": "del" }) : null,
      ]),
    ]);
  };

  const rows = noteBoard(o.priv, party, ui.show);
  const listed = rows.flatMap((n) => (ui.asking === keyOf(n) ? [note(n), o.box] : [note(n)]));
  if (ui.asking && !rows.some((n) => keyOf(n) === ui.asking)) ui.asking = null; // the note is gone (e.g. deleted elsewhere)
  return [
    fresh,
    canShare ? seg(t("notes.show"), [["all", t("notes.showAll")], ["mine", "🔒 " + t("notes.showMine")], ["party", "👥 " + t("notes.showParty")]], ui.show,
      (k) => { ui.show = k; o.redraw(); }) : null,
    h("h3", { cls: "notes-heading", id: "notes-heading", tabindex: "-1", text: t("notes.list") }),
    rows.length ? h("div", { cls: "stack", id: "notes-list" }, listed) : h("p", { cls: "empty", text: t("notes.none") }),
  ];
}

// --- The Notes tab on a character sheet ---
// The sheet redraws after every save; the tab's element and its party listeners live until the screen changes.
let live = null;
const drafts = new Map(); // character id -> what the user is writing, kept while switching tabs

export function notesTab({ ch, save }) {
  if (live?.alive && live.ch === ch) { live.redraw(true); return [live.el]; }
  const { box, ask } = confirmer();
  const paint = painter();
  const board = h("div", { cls: "stack", id: "notes-board" });
  const el = h("div", { cls: "stack", id: "notes-tab" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("notes.title") }), h("p", { cls: "lead", text: t("notes.lead") })]), board]);
  if (!drafts.has(ch.id)) drafts.set(ch.id, { show: "all", text: "", shared: false, editing: null });
  const entry = live = { ch, el, alive: true, watching: false, loading: false, partyId: null, v: null };
  PARTY.onStop(() => { entry.alive = false; });
  const keep = () => save(false);
  const find = (n) => ch.notebook.find((x) => x.id === n.id);
  const pid = () => entry.v?.party?.id;

  const ops = {
    add(text, shared) {
      if (shared) return PARTY.addNote(pid(), text, false, entry.v.me).catch(fail);
      ch.notebook.push({ id: newId(), text: text.trim(), at: Date.now() }); keep();
    },
    edit(n, text) {
      if (n.shared) return PARTY.editNote(pid(), n.id, text, false, entry.v.me).catch(fail);
      const x = find(n);
      if (x) { x.text = text.trim(); x.at = Date.now(); keep(); }
    },
    remove(n) {
      if (n.shared) return PARTY.deleteNote(pid(), n.id, false).catch(fail);
      ch.notebook = ch.notebook.filter((x) => x.id !== n.id); keep();
    },
    move(n) {
      if (n.shared) {
        ch.notebook.push({ id: newId(), text: n.text, at: n.at || Date.now() }); keep();
        return PARTY.deleteNote(pid(), n.id, false).catch(fail);
      }
      // Gone from private notes at once; if the party does not take it, it comes back.
      const was = find(n);
      const sent = PARTY.addNote(pid(), n.text, false, entry.v.me); // throws when signed out: nothing is removed then
      ch.notebook = ch.notebook.filter((x) => x.id !== n.id); keep();
      sent.catch(() => { if (was && !find(was)) { ch.notebook.push(was); keep(); redraw(); } fail(); });
    },
  };
  const why = () => !accountAvailable() ? "notes.whyLocal" : account().status !== "in" ? "notes.whySignIn"
    : entry.loading ? "notes.whyLoading" : "notes.whyNoParty";
  const redraw = (force = true) => paint(board, () => drawBoard({ ui: drafts.get(ch.id), priv: ch.notebook, party: entry.v ? entry.v.notes : null,
    uid: entry.v?.uid, me: entry.v?.me, why: why(), ops: safe(ops), ask, box, redraw }), force);
  entry.redraw = redraw;

  // Party notes: only with an account, for a character playing in a party.
  const start = () => {
    if (entry.watching || !entry.alive || !accountAvailable() || account().status !== "in") return;
    entry.watching = entry.loading = true;
    try {
      PARTY.watchMyParties((rows) => {
        if (!entry.alive) return;
        const row = rows?.find((r) => r.charId === ch.id && r.status === "in") || null;
        if ((row?.id || null) !== entry.partyId) {
          entry.stopParty?.();
          entry.v = null; entry.partyId = row?.id || null;
          entry.stopParty = row ? PARTY.watchParty(row.id, (v) => {
            if (!entry.alive) return;
            if (v.missing) { entry.v = null; entry.loading = false; }
            else if (v.party && v.me) {
              entry.v = v; entry.loading = false;
              const moved = bringPartyNotes(ch, v);
              if (moved) toast(t("notes.movedFromParty", { n: moved }));
            }
            redraw(false);
          }) : null;
        }
        if (!row) entry.loading = false;
        redraw(false);
      });
    } catch { entry.watching = entry.loading = false; }
  };
  start();
  const off = onAccount(() => { if (!entry.alive) return off(); start(); redraw(false); });
  redraw(true);
  return [el];
}

/** Cloud writes throw when the account is gone (signed out meanwhile): say so instead of failing silently. */
const safe = (ops) => Object.fromEntries(Object.entries(ops).map(([k, fn]) => [k, (...a) => { try { return fn(...a); } catch { fail(); } }]));
