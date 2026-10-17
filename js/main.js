// App shell: top bar, language switch, hash router, footer, offline support.
import { h } from "./dom.js";
import { t, lang, setLang, LANGS } from "./i18n.js";
import { CONFIG } from "./config.js";
import { renderHome } from "./views/home.js";
import { renderForm } from "./views/form.js";
import { renderSheet } from "./views/sheet.js";
import { renderParties, renderParty, renderJoin } from "./views/party.js";
import { renderPrivacy } from "./views/privacy.js";
import { renderInstall } from "./views/install.js";
import { showNotice } from "./views/account.js";
import { startAccount, accountAvailable } from "./sync/cloud.js";
import { stopWatching, startSharing } from "./sync/party.js";
import { countScreen, countEvent } from "./stats.js";

const view = h("div", { id: "view" });

function topbar() {
  const sw = h("div", { cls: "seg", role: "group", "aria-label": t("lang.label") }, Object.keys(LANGS).map((code) =>
    h("button", { type: "button", "aria-pressed": code === lang() ? "true" : "false", text: code.toUpperCase(),
      onclick: () => { setLang(code); countEvent("lang", code); route(); } })));
  return h("div", { cls: "topbar" }, [
    h("a", { cls: "brand", href: "#/" }, [h("img", { cls: "brand-logo", src: "logo.png", alt: CONFIG.name, width: 420, height: 241 }), h("span", { cls: "brand-tag", text: t("app.tagline") })]),
    sw,
  ]);
}

function footer() {
  return h("footer", { cls: "foot" }, [
    h("p", {}, [t("foot.free"), " ", t(accountAvailable() ? "foot.storageAccount" : "foot.storage"), " ", t("app.offline"),
      CONFIG.supportUrl ? [" ", h("a", { href: CONFIG.supportUrl, target: "_blank", rel: "noopener", text: t("foot.support") })] : null,
      " ", h("a", { href: "#/privacy", text: t("privacy.title") }), " · ", h("a", { href: "#/install", id: "foot-install", text: t("install.link") })].flat()),
    h("p", { cls: "fan", text: t("foot.fan") }),
    h("p", { cls: "ver", text: `${CONFIG.name} ${CONFIG.version}` }),
  ]);
}

const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

function route() {
  const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean);
  const app = document.getElementById("app");
  stopWatching(); // live party listeners belong to the screen being left
  app.replaceChildren(topbar(), h("div", { cls: "wrap" }, [view]), footer());
  // #/new/join/<code>: a character made for an invite goes back to that invite once saved.
  const join = parts[1] === "join" && parts[2] ? parts[2] : null;
  if (parts[0] === "new") renderForm(view, go, null, { join });
  else if (parts[0] === "paper") renderForm(view, go, null, { paper: true, join });
  else if (parts[0] === "edit" && parts[1]) renderForm(view, go, parts[1]);
  else if (parts[0] === "c" && parts[1]) renderSheet(view, go, parts[1], parts[2]);
  else if (parts[0] === "party" && parts[1]) renderParty(view, go, parts[1]);
  else if (parts[0] === "party") renderParties(view, go);
  else if (parts[0] === "join" && parts[1]) renderJoin(view, go, parts[1], parts[2]);
  else if (parts[0] === "privacy") renderPrivacy(view);
  else if (parts[0] === "install") renderInstall(view);
  else renderHome(view, go);
  document.title = CONFIG.name;
}

function layout() { document.documentElement.dataset.layout = innerWidth >= 900 ? "desk" : "phone"; }
addEventListener("resize", layout);
addEventListener("hashchange", () => { route(); scrollTo(0, 0); countScreen(location.hash); });
// Characters changed on another device: redraw, unless the user is in the middle of typing or editing.
addEventListener("gnoll:remote", () => {
  const typing = document.activeElement?.matches?.("input, textarea, select");
  if (!typing && !/^#\/(new|paper|edit|party|join)\b|^#\/c\/[^/]+\/party\b/.test(location.hash)) route();
});
layout();
route();
// Counted once per opening: the screen, the language, and whether it was opened as the installed app.
countScreen(location.hash);
countEvent("lang", lang());
if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) countEvent("app/opened-installed");
addEventListener("appinstalled", () => countEvent("app/installed"));
startAccount();
showNotice(); // e.g. "your account was deleted", left before the page reloaded
startSharing(); // characters played in a party send their HP/AC summary there

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
