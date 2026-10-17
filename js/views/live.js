// Pieces for screens that redraw from live cloud data (party, notes): a yes/no question and a painter
// that does not redraw a section while the user is typing in it.
import { h, fill } from "../dom.js";
import { t } from "../i18n.js";

/**
 * A yes/no question shown in `box`: ask(text, fn, opts) runs fn on "yes". The first button gets the focus.
 * "No" and Esc close it and call opts.back (e.g. give the focus back to the button that asked); opts.onClose runs on any close.
 */
export function confirmer() {
  const box = h("div", { cls: "confirm", role: "alert" });
  let opts = {};
  const close = (back) => {
    if (!box.classList.contains("open")) return;
    box.classList.remove("open");
    opts.onClose?.();
    if (back) opts.back?.();
  };
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); close(true); } });
  const ask = (text, fn, o = {}) => {
    close(false);
    opts = o;
    box.replaceChildren(h("span", { cls: "small", text }),
      h("button", { type: "button", cls: "btn gold", text: t("sheet.yes"), onclick: () => { close(false); fn(); } }),
      h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => close(true) }));
    box.classList.add("open");
    box.scrollIntoView({ block: "nearest" });
    box.querySelector("button").focus({ preventScroll: true });
  };
  return { box, ask, close };
}

/**
 * Sections redraw on every change in the cloud (someone's HP, a new note…). A section the user is typing in
 * waits until they leave it, so nothing typed is lost; drafts live in `ui`, outside the redrawn elements.
 * The user's own clicks redraw at once (force), also where the text field keeps focus (Safari does not move it to buttons).
 */
export function painter() {
  const waiting = new Map(), hooked = new WeakSet();
  // Also waits while the user answers an open yes/no question inside the section.
  const typing = (el) => el.contains(document.activeElement)
    && (document.activeElement.matches("input, textarea, select") || !!document.activeElement.closest(".confirm.open"));
  // Where the focus was (an element with data-key, maybe a button in it with data-act), so a redraw can put it back.
  const spot = (el) => {
    const a = document.activeElement, k = el.contains(a) ? a.closest("[data-key]") : null;
    return k ? { key: k.dataset.key, act: a.dataset.act || "" } : null;
  };
  const refocus = (el, s) => {
    const k = s && el.querySelector(`[data-key="${CSS.escape(s.key)}"]`);
    (s?.act ? k?.querySelector(`[data-act="${s.act}"]`) : k)?.focus({ preventScroll: true });
  };
  const paint = (el, draw, force) => {
    if (!force && typing(el)) {
      waiting.set(el, draw);
      if (!hooked.has(el)) {
        hooked.add(el);
        el.addEventListener("focusout", () => setTimeout(() => { if (waiting.has(el) && !typing(el)) paint(el, waiting.get(el), true); }, 0));
      }
      return;
    }
    waiting.delete(el);
    const s = spot(el);
    fill(el, draw());
    refocus(el, s);
  };
  return paint;
}
