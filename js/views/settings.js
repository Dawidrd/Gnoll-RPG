// Settings screen (#/settings): the switches that live on this device, gathered in one place.
// Every setting here is also reachable where it is used (the speaker on the sheet, "don't count my visits"
// on the Privacy screen) and shares the same state — this screen only shows it in one more place.
// Texts: set.* in js/lang. Nothing on this screen leaves the device.
import { h, toast } from "../dom.js";
import { t } from "../i18n.js";
import { sfxOn, setSfx } from "../sfx.js";
import { browserSaysNo, userAllows, setUserAllows } from "../stats.js";

/** One setting: heading, what it does, and the switch itself. */
const card = (id, control) => h("section", { cls: "card stack", id: `set-${id}` }, [
  h("h3", { text: t(`set.${id}.h`) }),
  ...t(`set.${id}.p`).split("\n").map((p) => h("p", { cls: "small", text: p })),
  control,
]);

/** Sound effects: the same switch as the speaker on a sheet's header (this device, all characters). */
const sfxChoice = () => h("label", { cls: "check" }, [
  h("input", { type: "checkbox", id: "set-sfx-on", checked: sfxOn(), onchange: (e) => {
    const on = e.target.checked;
    const kept = setSfx(on);
    toast(t(on ? "sfx.on" : "sfx.off") + (kept ? "" : " " + t("sfx.notKept")));
  } }),
  t("set.sfx.on"),
]);

/** Visit counts: the browser's "do not track" wins; otherwise the same choice as on the Privacy screen. */
const statsChoice = () => (browserSaysNo()
  ? h("p", { cls: "hint", id: "set-stats-browser", text: t("privacy.stats.browser") })
  : h("label", { cls: "check" }, [
    h("input", { type: "checkbox", id: "set-stats-off", checked: !userAllows(), onchange: (e) => setUserAllows(!e.target.checked) }),
    t("privacy.stats.off"),
  ]));

export function renderSettings(root) {
  root.replaceChildren(h("section", { cls: "panel", id: "settings" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("set.title") }), h("p", { cls: "lead", text: t("set.intro") })]),
    card("sfx", sfxChoice()),
    card("stats", h("div", { cls: "stack" }, [statsChoice(), h("p", { cls: "hint" }, [h("a", { href: "#/privacy", text: t("set.stats.more") })])])),
    h("div", { cls: "row" }, [h("a", { cls: "btn", href: "#/", text: t("privacy.back") })]),
  ]));
}
