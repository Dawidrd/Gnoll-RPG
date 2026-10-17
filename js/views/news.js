// "What's new": a card above the character list (open with a "New" badge until the player taps "Got it",
// then folded to one line until the next version) and the full history on its own screen (#/news).
import { h } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { storage } from "../store.js";
import { RELEASES, latest, isUnseen } from "../releases.js";
import { playSong, stopSong, songOn } from "../sfx.js";

const SEEN = "gnoll.news.seen";
let seenNow = null; // if the browser refuses to save, "Got it" still holds until the page reloads

const fmtDate = (d) => {
  try { return new Date(d + "T12:00:00").toLocaleDateString(lang() === "pl" ? "pl-PL" : "en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
};
const points = (rel) => h("ul", { cls: "small news-points" }, rel.points.map((p) => h("li", { text: tr(p) })));
const head = (rel) => `${t("news.version", { v: rel.version })} · ${fmtDate(rel.date)}`;

/** The home screen card. */
export function newsCard(hasCharacters) {
  const rel = latest();
  const fresh = seenNow !== rel.version && isUnseen(storage.get(SEEN), hasCharacters, rel.version);
  const badge = fresh ? h("span", { cls: "news-badge", text: t("news.new") }) : null;
  const ok = fresh ? h("button", { type: "button", cls: "btn gold", id: "news-ok", text: t("news.ok"), onclick: () => {
    seenNow = rel.version;
    storage.set(SEEN, rel.version);
    box.open = false;
    badge?.remove(); ok.remove();
  } }) : null;
  const box = h("details", { cls: "news", id: "news", open: fresh }, [
    h("summary", {}, [h("span", { cls: "news-title", text: t("news.title") }), " ", h("span", { cls: "news-ver", text: head(rel) }), badge ? " " : null, badge]),
    points(rel),
    h("div", { cls: "row" }, [ok, h("a", { cls: "btn ghost", id: "news-more", href: "#/news", text: t("news.more"), onclick: playSong })]),
  ]);
  return box;
}

// The song plays only while the history is open.
addEventListener("hashchange", () => { if (location.hash !== "#/news") stopSong(); });

/** Full history, newest first. */
export function renderNews(root) {
  const stop = songOn() ? h("button", { type: "button", cls: "btn ghost", id: "news-song-stop", text: t("news.songStop"),
    onclick: () => { stopSong(); stop.remove(); } }) : null;
  root.replaceChildren(h("section", { cls: "panel", id: "news-all" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("news.allTitle") }), stop]),
    ...RELEASES.map((rel) => h("section", { cls: "card stack" }, [h("h3", { cls: "news-ver", text: head(rel) }), points(rel)])),
    h("div", { cls: "row" }, [h("a", { cls: "btn", href: "#/", text: t("privacy.back") })]),
  ]));
}
