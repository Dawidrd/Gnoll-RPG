// Privacy screen (#/privacy): where data lives, who sees what, how to delete it. Texts: privacy.* in js/lang.
import { h } from "../dom.js";
import { t } from "../i18n.js";

const SECTIONS = ["local", "account", "team", "services", "never", "delete"];

export function renderPrivacy(root) {
  root.replaceChildren(h("section", { cls: "panel", id: "privacy" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("privacy.title") }), h("p", { cls: "lead", text: t("privacy.intro") })]),
    ...SECTIONS.map((k) => h("section", { cls: "card" }, [
      h("h3", { text: t(`privacy.${k}.h`) }),
      ...t(`privacy.${k}.p`).split("\n").map((p) => h("p", { cls: "small", text: p })),
    ])),
    h("div", { cls: "row" }, [h("a", { cls: "btn", href: "#/", text: t("privacy.back") })]),
  ]));
}
