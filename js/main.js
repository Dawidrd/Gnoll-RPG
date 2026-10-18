// App shell: top bar, language switch, hash router, footer, offline support.
import { h } from "./dom.js";
import { t, lang, setLang, LANGS } from "./i18n.js";
import { CONFIG } from "./config.js";
import { renderHome } from "./views/home.js";
import { renderForm } from "./views/form.js";
import { renderImport } from "./views/addmode.js";
import { renderSheet } from "./views/sheet.js";
import { renderParties, renderParty, renderJoin } from "./views/party.js";
import { renderPrivacy } from "./views/privacy.js";
import { renderSettings } from "./views/settings.js";
import { renderInstall } from "./views/install.js";
import { renderNews } from "./views/news.js";
import { showNotice } from "./views/account.js";
import { startAccount, accountAvailable } from "./sync/cloud.js";
import { stopWatching, startSharing } from "./sync/party.js";
import { countScreen, countEvent } from "./stats.js";
import { openGlossary, glossaryMode } from "./glossary.js";
import { getById, loadCreatorDraft } from "./store.js";

const view = h("div", { id: "view" });

// Settings: a classic gear next to the glossary's "?" (drawn here, coloured by the button's text colour).
const GEAR = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M9.34 4.24L9.43 1.3L14.57 1.3L14.66 4.24L15.61 4.64L17.75 2.62L21.38 6.25L19.36 8.39L19.76 9.34L22.7 9.43L22.7 14.57L19.76 14.66L19.36 15.61L21.38 17.75L17.75 21.38L15.61 19.36L14.66 19.76L14.57 22.7L9.43 22.7L9.34 19.76L8.39 19.36L6.25 21.38L2.62 17.75L4.64 15.61L4.24 14.66L1.3 14.57L1.3 9.43L4.24 9.34L4.64 8.39L2.62 6.25L6.25 2.62L8.39 4.64ZM15.5 12a3.5 3.5 0 1 0-7 0a3.5 3.5 0 1 0 7 0Z"/></svg>';

function topbar() {
  const sw = h("div", { cls: "seg", role: "group", "aria-label": t("lang.label") }, Object.keys(LANGS).map((code) =>
    h("button", { type: "button", "aria-pressed": code === lang() ? "true" : "false", text: code.toUpperCase(),
      onclick: () => { setLang(code); countEvent("lang", code); route(); } })));
  return h("div", { cls: "topbar" }, [
    h("a", { cls: "brand", href: "#/" }, [h("img", { cls: "brand-logo", src: "logo.png", alt: CONFIG.name, width: 420, height: 241 }), h("span", { cls: "brand-tag", text: t("app.tagline") })]),
    h("div", { cls: "topctl" }, [
      h("button", { type: "button", cls: "btn ghost sq glossbtn", id: "gloss-open", text: "?", "aria-label": t("gl.open"), title: t("gl.open"), onclick: () => openGlossary() }),
      h("a", { cls: "btn ghost sq glossbtn setbtn", href: "#/settings", "aria-label": t("set.title"), title: t("set.title"),
        "aria-current": location.hash.startsWith("#/settings") ? "page" : null, html: GEAR }),
      sw,
    ]),
  ]);
}

// The rules glossary shows Ravenloft terms only for a Ravenloft character on screen (its sheet, its edit, or the creator's draft).
glossaryMode(() => {
  const [where, id] = location.hash.replace(/^#\/?/, "").split("/");
  const ch = where === "c" || where === "edit" ? getById(id) : where === "new" || where === "paper" ? loadCreatorDraft(where)?.ch : null;
  return ch?.setting === "ravenloft";
});

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
  // #/new|paper|import/join/<code>: a character added for an invite goes back to that invite once saved.
  const join = parts[1] === "join" && parts[2] ? parts[2] : null;
  if (parts[0] === "new") renderForm(view, go, null, { join });
  else if (parts[0] === "paper") renderForm(view, go, null, { paper: true, join });
  else if (parts[0] === "import") renderImport(view, go, join);
  else if (parts[0] === "edit" && parts[1]) renderForm(view, go, parts[1]);
  else if (parts[0] === "c" && parts[1]) renderSheet(view, go, parts[1], parts[2]);
  else if (parts[0] === "party" && parts[1]) renderParty(view, go, parts[1]);
  else if (parts[0] === "party") renderParties(view, go);
  else if (parts[0] === "join" && parts[1]) renderJoin(view, go, parts[1], parts[2]);
  else if (parts[0] === "settings") renderSettings(view);
  else if (parts[0] === "privacy") renderPrivacy(view);
  else if (parts[0] === "install") renderInstall(view);
  else if (parts[0] === "news") renderNews(view);
  else renderHome(view, go);
  document.title = CONFIG.name;
}

function layout() { document.documentElement.dataset.layout = innerWidth >= 900 ? "desk" : "phone"; }
addEventListener("resize", layout);
addEventListener("hashchange", () => { route(); scrollTo(0, 0); countScreen(location.hash); });
// Characters changed on another device: redraw, unless the user is in the middle of typing or editing.
addEventListener("gnoll:remote", () => {
  const typing = document.activeElement?.matches?.("input, textarea, select");
  if (!typing && !/^#\/(new|paper|import|edit|party|join)\b|^#\/c\/[^/]+\/party\b/.test(location.hash)) route();
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
