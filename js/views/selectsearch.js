// Long drop-down lists get a "search" box above them that narrows the list while you type.
import { h } from "../dom.js";
import { t } from "../i18n.js";
import { textMatch } from "../search.js";

/** Lists with more choices than this get a search box. */
export const LONG_LIST = 12;

/**
 * Add a search box to every long <select> inside root. Options are matched by their text and by
 * data-q (the name in the other language). The empty choice and the current choice always stay.
 */
export function searchSelects(root) {
  for (const sel of root.querySelectorAll("select:not([data-search])")) {
    if ([...sel.options].filter((o) => o.value !== "").length <= LONG_LIST) continue;
    sel.dataset.search = "1";
    const items = [...sel.children];
    const inGroup = new Map(items.filter((x) => x.tagName === "OPTGROUP").map((g) => [g, [...g.children]]));
    const none = h("option", { value: "", disabled: true, text: t("search.none") });
    const filter = () => {
      const q = input.value, cur = sel.value;
      const hit = (o) => o.value !== "" && textMatch(q, o.text + " " + (o.dataset.q || ""));
      const keep = (o) => o.value === "" || o.value === cur || hit(o);
      let found = 0;
      const kids = [];
      for (const x of items) {
        const inner = inGroup.has(x) ? inGroup.get(x).filter(keep) : null;
        found += (inner || [x]).filter(hit).length;
        if (inner) { x.replaceChildren(...inner); if (inner.length) kids.push(x); }
        else if (keep(x)) kids.push(x);
      }
      if (!found) kids.push(none);
      sel.replaceChildren(...kids);
      sel.value = cur;
    };
    const input = h("input", { type: "search", cls: "selsearch", placeholder: t("search.placeholder"), "aria-label": t("search.placeholder"),
      autocomplete: "off", enterkeyhint: "search", oninput: filter,
      // Enter must not save the form: it opens the narrowed list instead.
      onkeydown: (e) => { if (e.key !== "Enter") return; e.preventDefault(); sel.focus(); try { sel.showPicker?.(); } catch { /* not allowed here */ } } });
    const box = h("span", { cls: "selbox" });
    sel.replaceWith(box);
    box.append(input, sel);
  }
}
