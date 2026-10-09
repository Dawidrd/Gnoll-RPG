// Character list: open, export, delete, import.
import { h, toast } from "../dom.js";
import { t, tr } from "../i18n.js";
import { loadAll, remove, exportFile, parseImport, upsert, getById } from "../store.js";
import { CLASSES, SPECIES } from "../rules/index.js";

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

  const fileInput = h("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const ch = parseImport(await f.text());
      const done = () => { upsert(ch); toast(t("home.imported", { name: ch.name })); go("#/"); };
      if (getById(ch.id)) ask(t("home.importReplace", { name: ch.name }), done); else done();
    } catch { toast(t("home.importError")); }
  } });

  const cards = list.map((ch) => {
    const cls = CLASSES[ch.classId], sp = SPECIES[ch.speciesId];
    const spName = ch.speciesId === "other" ? ch.customSpecies?.name || tr(sp.name) : tr(sp?.name);
    const meta = [spName, cls ? tr(cls.name) : ch.classId, `${t("home.levelShort")} ${ch.level}`].join(" · ");
    const delBtn = h("button", { type: "button", cls: "btn ghost", text: t("home.delete"), onclick: () => {
      ask(t("home.deleteConfirm", { name: ch.name }), () => { remove(ch.id); go("#/"); });
    } });
    return h("article", { cls: "ccard" }, [
      h("a", { cls: "ccard-main", href: `#/c/${ch.id}/start` }, [
        h("span", { cls: "ccard-name", text: ch.name }),
        h("span", { cls: "ccard-meta", text: meta }),
      ]),
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
        h("button", { type: "button", cls: "btn", text: t("home.import"), onclick: () => fileInput.click() }),
        fileInput,
      ]),
      h("p", { cls: "hint", text: t("home.privacy") }),
    ])
  );
}
