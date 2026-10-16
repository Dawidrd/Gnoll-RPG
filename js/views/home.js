// Character list: open, export, delete, import.
import { h, toast } from "../dom.js";
import { t, tr } from "../i18n.js";
import { loadAll, remove, exportFile, parseImport, upsert, getById } from "../store.js";
import { CLASSES, SPECIES, compute } from "../rules/index.js";
import { accountBox } from "./account.js";
import { accountAvailable } from "../sync/cloud.js";
import { countEvent } from "../stats.js";

const todoCount = (ch) => { try { const r = compute(structuredClone(ch)).review; return r.todo.length + r.errors.length; } catch { return 0; } };

export function renderHome(root, go) {
  // In-page confirmation (native confirm() is blocked in some app views).
  const confirmBox = h("div", { cls: "confirm", role: "alert" });
  const ask = (msg, fn) => {
    confirmBox.replaceChildren(h("span", { cls: "small", text: msg }),
      h("button", { type: "button", cls: "btn gold", text: t("sheet.yes"), onclick: () => { confirmBox.classList.remove("open"); fn(); } }),
      h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => confirmBox.classList.remove("open") }));
    confirmBox.classList.add("open");
    confirmBox.scrollIntoView({ block: "nearest" });
  };
  const list = loadAll().sort((a, b) => (b.updated || 0) - (a.updated || 0));

  const importText = (text) => {
    try {
      const { ch, report } = parseImport(text);
      const done = () => { upsert(ch); countEvent(report ? "import/old-page" : "import/file"); toast(t("home.imported", { name: ch.name })); go(report ? `#/c/${ch.id}/start` : "#/"); };
      if (getById(ch.id)) ask(t("home.importReplace", { name: ch.name }), done); else done();
    } catch { toast(t("home.importError")); }
  };
  const fileInput = h("input", { type: "file", accept: ".json,application/json,text/plain", hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (f) importText(await f.text());
  } });
  // Pasting the text works where saving a file doesn't (e.g. the export shown as text on an old character page).
  const pasteArea = h("textarea", { id: "paste-text", rows: 5, placeholder: t("home.pastePh") });
  const pasteBox = h("div", { cls: "stack", id: "paste-box", hidden: true }, [pasteArea,
    h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "paste-go", text: t("home.import"), onclick: () => importText(pasteArea.value.trim()) }),
      h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => { pasteBox.hidden = true; } })])]);

  const cards = list.map((ch) => {
    const cls = CLASSES[ch.classId], sp = SPECIES[ch.speciesId];
    const spName = ch.speciesId === "other" ? ch.customSpecies?.name || tr(sp.name) : tr(sp?.name).split(" (")[0];
    const meta = [spName, cls ? tr(cls.name) : ch.classId, `${t("home.levelShort")} ${ch.level}`].join(" · ");
    const delBtn = h("button", { type: "button", cls: "btn ghost", text: t("home.delete"), onclick: () => {
      ask(t("home.deleteConfirm", { name: ch.name }), () => { remove(ch.id); go("#/"); });
    } });
    return h("article", { cls: "ccard" }, [
      h("a", { cls: "ccard-main", href: `#/c/${ch.id}/start` }, [
        h("span", { cls: "ccard-name", text: ch.name }),
        h("span", { cls: "ccard-meta", text: meta }),
      ]),
      todoCount(ch) ? h("span", { cls: "ccard-todo", text: t("home.todo", { n: todoCount(ch) }) }) : null,
      h("div", { cls: "row" }, [
        h("a", { cls: "btn gold", href: `#/c/${ch.id}/start`, text: t("home.open") }),
        h("button", { type: "button", cls: "btn", text: t("home.export"), onclick: () => exportFile(ch) }),
        delBtn,
      ]),
    ]);
  });

  root.replaceChildren(
    h("section", { cls: "panel" }, [
      h("header", { cls: "stack" }, [h("h2", { text: t("home.title") })]),
      list.length ? h("div", { cls: "ccards" }, cards) : h("p", { cls: "lead", text: t("home.empty") }),
      confirmBox,
      h("div", { cls: "row" }, [
        h("a", { cls: "btn gold", href: "#/new", text: t("home.new") }),
        h("a", { cls: "btn", href: "#/paper", id: "paper-new", text: t("home.paperNew") }),
        h("button", { type: "button", cls: "btn", text: t("home.import"), onclick: () => fileInput.click() }),
        h("button", { type: "button", cls: "btn ghost", id: "paste-open", text: t("home.paste"), onclick: () => { pasteBox.hidden = false; pasteArea.focus(); } }),
        fileInput,
      ]),
      pasteBox,
      h("p", { cls: "hint", text: t("home.paperHint") }),
      h("p", { cls: "hint", text: t("home.pageHint") }),
      accountBox(),
      h("p", { cls: "hint" }, [t(accountAvailable() ? "home.privacyAccount" : "home.privacy"), " ", h("a", { href: "#/privacy", text: t("privacy.more") })]),
    ])
  );
}
