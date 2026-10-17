// "How to install on a phone": steps for iPhone/iPad, Android Chrome and Samsung Internet. Shown folded in the account box
// and as its own screen (#/install, linked from the footer). The phone in hand comes first; the others stay one tap away.
import { h } from "../dom.js";
import { t } from "../i18n.js";
import { phoneKind, androidBrowser, inAppBrowser, installOrder } from "../inapp.js";

export const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

const steps = (key) => h("ol", { cls: "small steps" }, t(key).split("\n").map((s) => h("li", { text: s })));

const SECTIONS = {
  ios: () => [h("h4", { text: t("install.ios.h") }), steps("install.ios.steps"), h("p", { cls: "hint", text: t("install.ios.missing") })],
  chrome: () => [h("h4", { text: t("install.chrome.h") }), steps("install.chrome.steps")],
  samsung: () => [h("h4", { text: t("install.samsung.h") }), steps("install.samsung.steps")],
};

function helpBody() {
  const ua = navigator.userAgent;
  if (installed()) return [h("p", { cls: "small", id: "install-done", text: t("install.done") })];
  const { mine, rest } = installOrder(phoneKind(ua, navigator.maxTouchPoints || 0), androidBrowser(ua));
  return [
    h("p", { cls: "small", text: t("install.intro") }),
    inAppBrowser(ua) !== null ? h("p", { cls: "warn soft", text: t("install.inapp") }) : null,
    ...mine.flatMap((k) => SECTIONS[k]()),
    h("p", { cls: "hint", text: t("install.onlyAndroid") }),
    rest.length ? h("details", { cls: "shop" }, [h("summary", { text: t("install.other") }), ...rest.flatMap((k) => SECTIONS[k]())]) : null,
  ];
}

/** Folded help for the account box. */
export function installHelp() {
  if (installed()) return null;
  return h("details", { cls: "shop", id: "install-help" }, [h("summary", { text: t("install.title") }), ...helpBody()]);
}

export function renderInstall(root) {
  root.replaceChildren(h("section", { cls: "panel", id: "install" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("install.title") })]),
    h("section", { cls: "card stack" }, helpBody()),
    h("div", { cls: "row" }, [h("a", { cls: "btn", href: "#/", text: t("privacy.back") })]),
  ]));
}
