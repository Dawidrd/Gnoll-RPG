// Privacy screen (#/privacy): where data lives, who sees what, how to delete it. Texts: privacy.* in js/lang.
import { h } from "../dom.js";
import { t } from "../i18n.js";
import { browserSaysNo, userAllows, setUserAllows } from "../stats.js";

const SECTIONS = ["local", "account", "party", "services", "stats", "never", "delete"];

/** Visit counts: the browser's "do not track" wins; otherwise the user can switch counting off on this device. */
const statsChoice = () => (browserSaysNo()
  ? h("p", { cls: "hint", id: "stats-browser", text: t("privacy.stats.browser") })
  : h("label", { cls: "check" }, [
    h("input", { type: "checkbox", id: "stats-off", checked: !userAllows(), onchange: (e) => setUserAllows(!e.target.checked) }),
    t("privacy.stats.off"),
  ]));

export function renderPrivacy(root) {
  root.replaceChildren(h("section", { cls: "panel", id: "privacy" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("privacy.title") }), h("p", { cls: "lead", text: t("privacy.intro") })]),
    ...SECTIONS.map((k) => h("section", { cls: "card", id: `privacy-${k}` }, [
      h("h3", { text: t(`privacy.${k}.h`) }),
      ...t(`privacy.${k}.p`).split("\n").map((p) => h("p", { cls: "small", text: p })),
      k === "stats" ? statsChoice() : null,
    ])),
    h("div", { cls: "row" }, [h("a", { cls: "btn", href: "#/", text: t("privacy.back") })]),
  ]));
}
