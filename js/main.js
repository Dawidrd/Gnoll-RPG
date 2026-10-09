// App shell: top bar, language switch, hash router, footer, offline support.
import { h } from "./dom.js";
import { t, lang, setLang, LANGS } from "./i18n.js";
import { CONFIG } from "./config.js";
import { renderHome } from "./views/home.js";
import { renderForm } from "./views/form.js";
import { renderSheet } from "./views/sheet.js";

const view = h("div", { id: "view" });

function topbar() {
  const sw = h("div", { cls: "seg", role: "group", "aria-label": t("lang.label") }, Object.keys(LANGS).map((code) =>
    h("button", { type: "button", "aria-pressed": code === lang() ? "true" : "false", text: code.toUpperCase(),
      onclick: () => { setLang(code); route(); } })));
  return h("div", { cls: "topbar" }, [
    h("a", { cls: "brand", href: "#/" }, [h("span", { cls: "brand-name", text: CONFIG.name }), h("span", { cls: "brand-tag", text: t("app.tagline") })]),
    sw,
  ]);
}

function footer() {
  return h("footer", { cls: "foot" }, [
    h("p", {}, [t("foot.free"), " ", t("foot.storage"), " ", t("app.offline"),
      CONFIG.supportUrl ? [" ", h("a", { href: CONFIG.supportUrl, target: "_blank", rel: "noopener", text: t("foot.support") })] : null].flat()),
    h("p", { cls: "fan", text: t("foot.fan") }),
    h("p", { cls: "ver", text: `${CONFIG.name} ${CONFIG.version}` }),
  ]);
}

const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

function route() {
  const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean);
  const app = document.getElementById("app");
  app.replaceChildren(topbar(), h("div", { cls: "wrap" }, [view]), footer());
  if (parts[0] === "new") renderForm(view, go, null);
  else if (parts[0] === "edit" && parts[1]) renderForm(view, go, parts[1]);
  else if (parts[0] === "c" && parts[1]) renderSheet(view, go, parts[1], parts[2]);
  else renderHome(view, go);
  document.title = CONFIG.name;
}

function layout() { document.documentElement.dataset.layout = innerWidth >= 900 ? "desk" : "phone"; }
addEventListener("resize", layout);
addEventListener("hashchange", () => { route(); scrollTo(0, 0); });
layout();
route();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
