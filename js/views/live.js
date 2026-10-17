// Pieces for screens that redraw from live cloud data (party, notes): a yes/no question and a painter
// that does not redraw a section while the user is typing in it.
import { h, fill } from "../dom.js";
import { t } from "../i18n.js";

/** A yes/no question shown in `box`: ask(text, fn) runs fn on "yes". */
export function confirmer() {
  const box = h("div", { cls: "confirm", role: "alert" });
  const ask = (text, fn) => {
    box.replaceChildren(h("span", { cls: "small", text }),
      h("button", { type: "button", cls: "btn gold", text: t("sheet.yes"), onclick: () => { box.classList.remove("open"); fn(); } }),
      h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => box.classList.remove("open") }));
    box.classList.add("open");
    box.scrollIntoView({ block: "nearest" });
  };
  return { box, ask };
}

/**
 * Sections redraw on every change in the cloud (someone's HP, a new note…). A section the user is typing in
 * waits until they leave it, so nothing typed is lost; drafts live in `ui`, outside the redrawn elements.
 * The user's own clicks redraw at once (force), also where the text field keeps focus (Safari does not move it to buttons).
 */
export function painter() {
  const waiting = new Map(), hooked = new WeakSet();
  const typing = (el) => el.contains(document.activeElement) && document.activeElement.matches("input, textarea, select");
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
    fill(el, draw());
  };
  return paint;
}
