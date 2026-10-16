// Visit counting with GoatCounter: no cookies, nothing stored on the device, no personal data.
// Only screen names and a few event names are sent (never character names, ids, invite codes or account data).
// No third-party script is loaded: the app calls GoatCounter's /count address itself.
// Off when: CONFIG.statsUrl is empty, the page runs locally, the browser asks not to be tracked (GPC / Do Not Track),
// or the user picked "Don't count my visits" on the Privacy screen.
import { CONFIG } from "./config.js";
import { storage } from "./store.js";

const OPTOUT = "gnoll.nostats";

/** The browser itself asks sites not to track (Global Privacy Control or Do Not Track). */
export function browserSaysNo() {
  const n = globalThis.navigator;
  return !!n && (n.globalPrivacyControl === true || n.doNotTrack === "1");
}
const local = () => {
  const l = globalThis.location;
  return !l || l.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(l.hostname);
};
/** The user's own choice on the Privacy screen. */
export const userAllows = () => storage.get(OPTOUT) !== "1";
export function setUserAllows(on) { if (on) storage.del(OPTOUT); else storage.set(OPTOUT, "1"); }
export const statsOn = () => !!CONFIG.statsUrl && userAllows() && !browserSaysNo() && !local();

/** Hash route → screen name without ids or codes, e.g. "#/c/ab12/combat" → "/sheet/combat". */
export function screenPath(hash) {
  const p = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  const tab = (s) => (/^[a-z]{1,16}$/.test(s || "") ? "/" + s : "");
  if (p[0] === "new" || p[0] === "paper") return "/" + p[0] + (p[1] === "join" ? "/join" : "");
  if (p[0] === "edit") return "/edit";
  if (p[0] === "c") return "/sheet" + tab(p[2]);
  if (p[0] === "party") return p[1] ? "/party/view" : "/party";
  if (p[0] === "join") return "/join";
  if (p[0] === "privacy") return "/privacy";
  return "/";
}

function send(params) {
  if (!statsOn()) return;
  const url = `${CONFIG.statsUrl}/count?${new URLSearchParams({ ...params, rnd: Math.random().toString(36).slice(2) })}`;
  try { if (!navigator.sendBeacon?.(url)) new Image().src = url; } catch { /* counting never gets in the way */ }
}

let first = true;
/** A screen was opened. The first one also tells where the visitor came from (the site, not the full address). */
export function countScreen(hash) {
  const params = { p: screenPath(hash), t: CONFIG.name };
  if (first) {
    first = false;
    try { const r = document.referrer && new URL(document.referrer); if (r && r.origin !== location.origin) params.r = r.origin; } catch { /* no referrer */ }
  }
  send(params);
}

/** Something happened, e.g. countEvent("character/new", "monk"). Only fixed names and rule ids, never what the user typed. */
export function countEvent(name, detail = "") {
  const d = /^[a-z0-9-]{1,32}$/.test(detail) ? "/" + detail : "";
  send({ p: name + d, t: name, e: "true" });
}
