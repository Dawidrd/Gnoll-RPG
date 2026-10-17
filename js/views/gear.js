// Equipment (items with quantity and a note, plus coins). The session journal moved to the Notes tab in 0.36.0.
import { h, toast } from "../dom.js";
import { t } from "../i18n.js";
import { weaponEditor } from "./weapons.js";

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const COINS = ["pp", "gp", "ep", "sp", "cp"];

/** Total wealth in gold pieces (1 pp = 10 gp, 1 ep = ½ gp, 1 sp = 1/10 gp, 1 cp = 1/100 gp). */
export function goldValue(g) {
  return ((g.pp || 0) * 1000 + (g.gp || 0) * 100 + (g.ep || 0) * 50 + (g.sp || 0) * 10 + (g.cp || 0)) / 100;
}

export function inventoryTab({ ch, save, c, draw }) {
  return [h("div", { cls: "stack" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("inv.title") }), h("p", { cls: "lead", text: t("inv.lead") })]),
    h("section", { cls: "card", id: "weapons-card" }, [h("h4", { text: t("wpn.title") }), weaponEditor({ ch, c, onChange: () => save(), redraw: draw })]),
    gearEditor({ ch, onChange: () => save(false) }),
    h("p", { cls: "hint", text: t("inv.carry", { lb: c.abilities.str * 15 }) }),
  ])];
}

/** Coins and items, redrawn in place. onChange runs after every change (e.g. to save). Also used by the creator for a character from paper. */
export function gearEditor({ ch, onChange }) {
  let editId = null;
  const wrap = h("div", { cls: "stack" });
  const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const save = () => onChange();

  function draw() {
    const coins = h("div", { cls: "coins" }, COINS.map((k) => h("label", { cls: "coin" }, [t("inv.coin." + k),
      h("input", { type: "number", min: 0, inputmode: "numeric", id: "coin-" + k, value: ch.gold[k] || 0,
        onchange: (e) => { ch.gold = { ...ch.gold, [k]: num(e.target.value) }; save(false); draw(); } })])));
    const total = goldValue(ch.gold);

    const name = h("input", { id: "item-name", placeholder: t("inv.namePh"), "aria-label": t("inv.name") });
    const qty = h("input", { type: "number", min: 0, id: "item-qty", value: 1, "aria-label": t("inv.qty") });
    const note = h("input", { id: "item-note", placeholder: t("inv.notePh"), "aria-label": t("inv.note") });
    // stopPropagation: in the creator these small forms sit inside the character form, which must not be saved by them.
    const add = h("form", { cls: "row additem", onsubmit: (e) => {
      e.preventDefault(); e.stopPropagation();
      const n = name.value.trim();
      if (!n) return toast(t("inv.needName"));
      ch.items.push({ id: newId(), name: n, qty: num(qty.value) || 1, note: note.value.trim() });
      save(false); draw();
    } }, [name, qty, note, h("button", { type: "submit", cls: "btn gold", id: "item-add", text: t("inv.add") })]);

    const rows = ch.items.map((it, i) => {
      if (editId === it.id) {
        const en = h("input", { value: it.name, "aria-label": t("inv.name") });
        const eq = h("input", { type: "number", min: 0, value: it.qty, "aria-label": t("inv.qty") });
        const eo = h("input", { value: it.note || "", "aria-label": t("inv.note") });
        return h("form", { cls: "li edit", onsubmit: (e) => { e.preventDefault(); e.stopPropagation(); Object.assign(it, { name: en.value.trim() || it.name, qty: num(eq.value), note: eo.value.trim() }); editId = null; save(false); draw(); } },
          [h("div", { cls: "row" }, [en, eq, eo]), h("div", { cls: "row" }, [h("button", { type: "submit", cls: "btn small gold", text: t("inv.saveItem") }),
            h("button", { type: "button", cls: "btn small ghost", text: t("sheet.no"), onclick: () => { editId = null; draw(); } }),
            h("button", { type: "button", cls: "btn small ghost", text: t("inv.remove"), onclick: () => { ch.items.splice(i, 1); editId = null; save(false); draw(); } })])]);
      }
      return h("div", { cls: "li" + (it.qty ? "" : " empty-qty") }, [
        h("div", {}, [h("div", { cls: "t", text: it.name }), it.note ? h("div", { cls: "n", text: it.note }) : null]),
        h("div", { cls: "qty" }, [
          h("button", { type: "button", cls: "btn sq small", "aria-label": t("inv.less", { name: it.name }), text: "−", onclick: () => { it.qty = Math.max(0, (it.qty || 0) - 1); save(false); draw(); } }),
          h("b", { text: it.qty }),
          h("button", { type: "button", cls: "btn sq small", "aria-label": t("inv.more", { name: it.name }), text: "+", onclick: () => { it.qty = (it.qty || 0) + 1; save(false); draw(); } }),
          h("button", { type: "button", cls: "btn small ghost", text: t("inv.edit"), onclick: () => { editId = it.id; draw(); } }),
          i > 0 ? h("button", { type: "button", cls: "btn sq small ghost", "aria-label": t("inv.up", { name: it.name }), text: "↑", onclick: () => { [ch.items[i - 1], ch.items[i]] = [ch.items[i], ch.items[i - 1]]; save(false); draw(); } }) : null,
        ]),
      ]);
    });

    wrap.replaceChildren(
      h("section", { cls: "card", id: "coins" }, [h("h4", { text: t("inv.coins") }), coins,
        h("p", { cls: "hint", text: t("inv.total", { gp: Number.isInteger(total) ? total : total.toFixed(2) }) })]),
      h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("inv.items") }),
        ch.items.length ? h("div", { cls: "list", id: "items" }, rows) : h("p", { cls: "empty", text: t("inv.empty") }), add]),
    );
  }
  draw();
  return wrap;
}
