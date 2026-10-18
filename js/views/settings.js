// Settings screen (#/settings): the switches that live on this device, gathered in one place.
// Every setting here is also reachable where it is used (the speaker on the sheet, "don't count my visits"
// on the Privacy screen) and shares the same state — this screen only shows it in one more place.
// 0.44: with a Google account, also my name in parties — the one setting that leaves the device (cloud.js setChosenName).
// Texts: set.* in js/lang.
import { h, toast } from "../dom.js";
import { t } from "../i18n.js";
import { sfxOn, setSfx } from "../sfx.js";
import { browserSaysNo, userAllows, setUserAllows } from "../stats.js";
import { account, onAccount, setChosenName } from "../sync/cloud.js";
import { cleanName, PLAYER_NAME_MAX } from "../sync/partylogic.js";

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

/** My name in parties: only when signed in with Google; empty = the Google account's name. */
function nameCard() {
  const box = h("div", { id: "set-name-box" });
  let shown = null; // what the card was drawn for, so a typed name is not wiped by an unrelated account update
  const draw = (s) => {
    const key = s.status === "in" ? `in:${s.user?.chosen}` : "out";
    if (key === shown) return;
    shown = key;
    if (s.status !== "in") return box.replaceChildren();
    const google = s.user?.name || s.user?.email || "";
    const input = h("input", { id: "set-name", maxlength: PLAYER_NAME_MAX, value: s.user?.chosen || "", placeholder: google, autocomplete: "nickname" });
    const save = () => {
      const n = cleanName(input.value, PLAYER_NAME_MAX);
      input.value = n;
      setChosenName(n).catch(() => toast(t("set.name.err")));
      toast(n ? t("set.name.saved", { name: n }) : t("set.name.reset", { name: google }));
    };
    box.replaceChildren(card("name", h("div", { cls: "stack" }, [
      h("label", { cls: "wide" }, [t("set.name.label"), input]),
      h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "set-name-save", text: t("party.save"), onclick: save })]),
    ])));
  };
  draw(account());
  const off = onAccount((s) => { if (!box.isConnected) return off(); draw(s); });
  return box;
}

export function renderSettings(root) {
  root.replaceChildren(h("section", { cls: "panel", id: "settings" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("set.title") }), h("p", { cls: "lead", text: t("set.intro") })]),
    nameCard(),
    card("sfx", sfxChoice()),
    card("stats", h("div", { cls: "stack" }, [statsChoice(), h("p", { cls: "hint" }, [h("a", { href: "#/privacy", text: t("set.stats.more") })])])),
    h("div", { cls: "row" }, [h("a", { cls: "btn", href: "#/", text: t("privacy.back") })]),
  ]));
}
