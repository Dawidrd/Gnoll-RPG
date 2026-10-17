// Character list: open, export, delete; "+ Add a character" (new, from a paper sheet, from a file) is on its own screen.
import { h } from "../dom.js";
import { t, tr } from "../i18n.js";
import { loadAll, remove, exportFile, creatorDrafts, clearCreatorDraft } from "../store.js";
import { CLASSES, SPECIES, compute } from "../rules/index.js";
import { accountBox } from "./account.js";
import { accountAvailable } from "../sync/cloud.js";
import { addCards, addHref, countAdd } from "./addmode.js";

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

  const metaOf = (ch) => {
    const cls = CLASSES[ch.classId], sp = SPECIES[ch.speciesId];
    const spName = ch.speciesId === "other" ? ch.customSpecies?.name || tr(sp?.name) : tr(sp?.name || { pl: "", en: "" }).split(" (")[0];
    return [spName, cls ? tr(cls.name) : ch.classId, `${t("home.levelShort")} ${ch.level}`].filter(Boolean).join(" · ");
  };
  // Characters still in the creator (kept on this device until saved): at most one new and one from paper.
  const draftCards = creatorDrafts().map((draft) => {
    const kind = draft.ch.entry === "paper" ? "paper" : "new";
    const href = addHref(kind, draft.join);
    return h("article", { cls: "ccard", id: `draft-card-${kind}` }, [
      h("a", { cls: "ccard-main", href }, [
        h("span", { cls: "ccard-name", text: (draft.ch.name || "").trim() || t("home.draftNoName") }),
        h("span", { cls: "ccard-meta", text: (() => { try { return metaOf(draft.ch); } catch { return ""; } })() }),
      ]),
      h("span", { cls: "ccard-todo", text: t(kind === "paper" ? "home.draftTitlePaper" : "home.draftTitle") }),
      h("div", { cls: "row" }, [
        h("a", { cls: "btn gold", id: `draft-resume-${kind}`, href, text: t("home.draftResume") }),
        h("button", { type: "button", cls: "btn ghost", id: `draft-discard-${kind}`, text: t("home.draftDiscard"), onclick: () => ask(t("home.draftDiscardAsk"), () => { clearCreatorDraft(kind); go("#/"); }) }),
      ]),
    ]);
  });

  const cards = list.map((ch) => {
    const meta = metaOf(ch);
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
      draftCards.length ? h("div", { cls: "ccards" }, draftCards) : null,
      list.length ? h("div", { cls: "ccards" }, cards) : null,
      confirmBox,
      // No characters yet: the three ways in right away; otherwise one button to the "Add a character" screen.
      list.length ? h("div", { cls: "row" }, [h("a", { cls: "btn gold", id: "add-open", href: addHref("new"), onclick: () => countAdd("new"), text: t("home.add") })]) : addCards(),
      accountBox(),
      h("p", { cls: "hint" }, [t(accountAvailable() ? "home.privacyAccount" : "home.privacy"), " ", h("a", { href: "#/privacy", text: t("privacy.more") })]),
    ])
  );
}
