// "Add a character": one way in with three modes — new (the creator), from a paper sheet, from a file.
// #/new, #/paper and #/import (each with an optional /join/<code>) show the same switch on top.
// Each creator mode keeps its own unfinished character, so switching loses nothing; it still asks first once something was entered.
import { h, toast } from "../dom.js";
import { t } from "../i18n.js";
import { parseImport, upsert, getById } from "../store.js";
import { afterCreate, validCode } from "../sync/partylogic.js";
import { countEvent } from "../stats.js";

export const ADD_MODES = ["new", "paper", "file"];
const ROUTE = { new: "#/new", paper: "#/paper", file: "#/import" };
const EVENT = { new: "dodaj-nowa", paper: "dodaj-karta", file: "dodaj-plik" };

export const addHref = (mode, join) => ROUTE[mode] + (validCode(join) ? `/join/${join}` : "");
/** Counted when the player picks a way of adding a character (fixed names only). */
export const countAdd = (mode) => countEvent(EVENT[mode]);

let refocus = false; // after a switch made with the keyboard, focus goes back to the switch

/** The switch with the sentence about the chosen mode. dirty(): something was entered in this mode. */
export function addSwitch(mode, { join, go, dirty = () => false }) {
  const ask = h("div", { cls: "confirm", id: "add-ask", role: "alert" });
  const leave = (to) => { countAdd(to); refocus = true; go(addHref(to, join)); };
  const open = (to) => {
    if (to === mode) return;
    if (!dirty()) return leave(to);
    ask.replaceChildren(h("span", { cls: "small", text: t("add.switchAsk", { to: t("add.mode." + to), from: t("add.mode." + mode) }) }),
      h("button", { type: "button", cls: "btn gold", id: "add-ask-yes", text: t("add.switchYes"), onclick: () => leave(to) }),
      h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => { ask.classList.remove("open"); el.querySelector(`#add-${to}`)?.focus(); } }));
    ask.classList.add("open");
    ask.querySelector("button").focus();
  };
  const buttons = ADD_MODES.map((m) => h("button", {
    type: "button", id: `add-${m}`, "aria-current": m === mode ? "page" : false, "aria-describedby": m === mode ? "add-desc" : false,
    text: t("add.mode." + m), onclick: () => open(m),
  }));
  const el = h("div", { cls: "stack addhead" }, [
    h("nav", { cls: "addswitch", "aria-label": t("add.ask") }, buttons),
    h("p", { cls: "adddesc", id: "add-desc", text: t("add.desc." + mode) }),
    ask,
  ]);
  if (refocus) { refocus = false; setTimeout(() => buttons[ADD_MODES.indexOf(mode)].focus({ preventScroll: true }), 0); }
  return { el, open };
}

/** The three ways in as cards (the home screen with no characters yet). */
export function addCards() {
  return h("div", { cls: "addcards", id: "add-cards" }, [
    h("h3", { text: t("add.ask") }),
    ...ADD_MODES.map((m) => h("a", { cls: "ccard addcard", id: `add-card-${m}`, href: addHref(m), onclick: () => countAdd(m) }, [
      h("span", { cls: "ccard-name", text: t("add.card." + m) }),
      h("span", { cls: "ccard-meta", text: t("add.cardText." + m) }),
    ])),
  ]);
}

/** #/import: load a file from Gnoll RPG or from an old character page. */
export function renderImport(root, go, join) {
  if (!validCode(join)) join = null;
  const confirmBox = h("div", { cls: "confirm", role: "alert" });
  const ask = (text, fn) => {
    confirmBox.replaceChildren(h("span", { cls: "small", text }),
      h("button", { type: "button", cls: "btn gold", text: t("sheet.yes"), onclick: () => { confirmBox.classList.remove("open"); fn(); } }),
      h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => confirmBox.classList.remove("open") }));
    confirmBox.classList.add("open");
    confirmBox.querySelector("button").focus();
  };
  const importText = (text) => {
    try {
      const { ch, report } = parseImport(text);
      const done = () => {
        if (!upsert(ch)) { toast(t("app.saveError")); return; }
        countEvent(report ? "import/old-page" : "import/file");
        toast(t("home.imported", { name: ch.name }));
        // For an invite: back to it with this character picked.
        go(join ? afterCreate(ch.id, join) : report ? `#/c/${ch.id}/start` : "#/");
      };
      if (getById(ch.id)) ask(t("home.importReplace", { name: ch.name }), done); else done();
    } catch { toast(t("home.importError")); }
  };
  const fileInput = h("input", { type: "file", id: "add-file-input", accept: ".json,application/json,text/plain", hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (f) importText(await f.text());
  } });
  root.replaceChildren(h("section", { cls: "panel" }, [
    h("header", { cls: "stack" }, [h("div", { cls: "formhead" }, [h("h2", { text: t("add.title") }),
      h("a", { cls: "btn ghost", href: join ? `#/join/${join}` : "#/", text: t("form.cancel") })])]),
    addSwitch("file", { join, go }).el,
    join ? h("p", { cls: "hint", text: t("add.fileForInvite") }) : null,
    h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "add-file", text: t("add.pick"), onclick: () => fileInput.click() }), fileInput]),
    confirmBox,
    h("details", { cls: "shop", id: "add-file-help" }, [h("summary", { text: t("add.fileHelp") }),
      ...t("add.fileHelpP").split("\n").map((p) => h("p", { cls: "small", text: p }))]),
  ]));
}
