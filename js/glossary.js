// Hover/tap explanations for game terms, and the searchable rules glossary panel. The terms are in rules/terms.js.
import { h } from "./dom.js";
import { lang, t, tr } from "./i18n.js";
import { TERM_LINKS as G, TERM_CATS, findTerms, termRegex } from "./rules/terms.js";

let compiled = { lang: null, re: null };
function regex() {
  if (compiled.lang === lang()) return compiled.re;
  compiled = { lang: lang(), re: termRegex(lang()) };
  return compiled.re;
}

const SKIP = "button,input,textarea,select,label,script,style,.term,h1,h2,h3,h4,th,nav,svg,#tip,#gloss";

/** Wrap known terms inside `scope` once per block. */
export function glossify(scope) {
  const re = regex();
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (!n.nodeValue.trim() || !n.parentElement || n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const txt = n.nodeValue; re.lastIndex = 0;
    const blk = n.parentElement.closest("p,li,td,dd,div") || n.parentElement;
    const used = blk.__g || (blk.__g = {});
    let m, last = 0, frag = null;
    while ((m = re.exec(txt))) {
      const key = Object.keys(m.groups).find((k) => m.groups[k] !== undefined);
      const g = G[+key.slice(1)];
      if (used[g.id]) continue; used[g.id] = 1;
      frag = frag || document.createDocumentFragment();
      frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
      frag.appendChild(h("span", { cls: "term", tabindex: "0", role: "button", "aria-expanded": "false", "data-g": key.slice(1), text: m[0] }));
      last = m.index + m[0].length;
    }
    if (frag) { frag.appendChild(document.createTextNode(txt.slice(last))); n.parentNode.replaceChild(frag, n); }
  }
}

// One shared tooltip for the whole app.
let open = null;
function showTip(el) {
  const g = G[+el.dataset.g]; let tip = document.getElementById("tip");
  if (!tip) { tip = h("div", { id: "tip", role: "tooltip" }); document.body.appendChild(tip); }
  tip.replaceChildren(h("b", { text: tr(g.title) }), document.createTextNode(tr(g.text)),
    h("button", { type: "button", cls: "tip-more", "data-id": g.id, text: t("gl.more") }));
  tip.hidden = false;
  const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), innerWidth - tw - 12);
  let y = r.bottom + 8; if (y + th > innerHeight - 12) y = r.top - th - 8;
  tip.style.left = x + "px"; tip.style.top = y + "px";
  if (open && open !== el) open.setAttribute("aria-expanded", "false");
  el.setAttribute("aria-expanded", "true"); open = el;
}
function hideTip() { const tip = document.getElementById("tip"); if (tip) tip.hidden = true; if (open) open.setAttribute("aria-expanded", "false"); open = null; }

const hover = () => matchMedia("(hover:hover)").matches;
document.addEventListener("click", (e) => {
  const more = e.target.closest(".tip-more");
  if (more) { hideTip(); openGlossary({ id: more.dataset.id }); return; }
  const t = e.target.closest(".term"); if (t) { if (open === t) hideTip(); else showTip(t); } else if (!e.target.closest("#tip")) hideTip();
});
document.addEventListener("mouseover", (e) => { const t = e.target.closest(".term"); if (t && hover()) showTip(t); });
// Moving from a term onto its tooltip keeps it open, so "More in the glossary" can be clicked.
document.addEventListener("mouseout", (e) => { if (e.target.closest(".term, #tip") && hover() && !e.relatedTarget?.closest?.(".term, #tip")) hideTip(); });
document.addEventListener("keydown", (e) => {
  const t = e.target.closest?.(".term"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showTip(t); }
  if (e.key === "Escape") { hideTip(); if (panel) closeGlossary(); }
});
addEventListener("scroll", hideTip, { passive: true });

// --- Glossary panel --------------------------------------------------------
// Opens over the current screen (nothing under it is redrawn), so closing it leaves the player exactly where they were.
// Phone "back" and Esc close it: opening adds a history entry with the same address, which the router ignores.

let panel = null, opener = null;
let ravenloftNow = () => false;
/** Tell the panel how to know whether the screen shows a Ravenloft character (Ravenloft terms only then). */
export const glossaryMode = (fn) => { ravenloftNow = fn; };

export function openGlossary({ id = null } = {}) {
  if (panel) return;
  opener = document.activeElement;
  const ravenloft = !!ravenloftNow();
  const input = h("input", { type: "search", id: "gloss-q", placeholder: t("gl.search"), "aria-label": t("gl.search"), autocomplete: "off", enterkeyhint: "search" });
  const count = h("p", { cls: "gloss-count", "aria-live": "polite" });
  const list = h("div", { cls: "gloss-list", id: "gloss-list" });
  const item = (g) => h("details", { cls: "gl-item", id: "gl-" + g.id, open: g.id === id }, [
    h("summary", { text: tr(g.title) }), h("p", { text: tr(g.text) })]);
  const paint = () => {
    const q = input.value, hits = findTerms(q, lang(), ravenloft);
    count.textContent = hits.length ? t("gl.count", { n: hits.length }) : t("gl.none");
    // Without a query: grouped by kind. With one: best matches first.
    list.replaceChildren(...(q.trim() ? hits.map(item)
      : TERM_CATS.flatMap((c) => { const in_ = hits.filter((g) => g.cat === c); return in_.length ? [h("h3", { text: t("gl.cat." + c) }), ...in_.map(item)] : []; })));
  };
  input.addEventListener("input", paint);
  const close = h("button", { type: "button", cls: "btn", id: "gloss-close", text: t("gl.close"), onclick: () => closeGlossary() });
  panel = h("div", { id: "gloss", cls: "gloss", role: "dialog", "aria-modal": "true", "aria-labelledby": "gloss-h" }, [
    h("div", { cls: "gloss-back", onclick: () => closeGlossary() }),
    h("section", { cls: "gloss-box" }, [
      h("div", { cls: "gloss-top" }, [
        h("div", { cls: "gloss-head" }, [h("h2", { id: "gloss-h", text: t("gl.title") }), close]),
        input, count,
      ]),
      list,
    ]),
  ]);
  paint();
  document.body.appendChild(panel);
  document.body.classList.add("gloss-open");
  history.pushState({ gloss: 1 }, "");
  const target = id && document.getElementById("gl-" + id);
  if (target) { target.scrollIntoView({ block: "start" }); target.querySelector("summary").focus(); }
  else input.focus();
}

/** Close the panel; `quiet` = its history entry is already gone (phone "back"). */
export function closeGlossary(quiet = false) {
  if (!panel) return;
  panel.remove(); panel = null;
  document.body.classList.remove("gloss-open");
  if (!quiet && history.state?.gloss) history.back();
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  opener = null;
}

addEventListener("popstate", () => { if (panel) closeGlossary(true); });
