// Weapons the character carries: the attack list (to hit, damage, mastery) and a small editor to add or remove weapons.
import { h } from "../dom.js";
import { t, tr } from "../i18n.js";
import { WEAPONS } from "../rules/weapons.js";
import { signed } from "../rules/core.js";
import { dmgTag } from "./dmgtag.js";

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const short = (x) => tr(x).split(" (")[0];

/** One row per weapon: to hit, damage, range, mastery and notes. */
export function attacksBlock(c, ch) {
  if (!c.attacks.length) return h("section", { cls: "blk", id: "attacks" }, [h("div", { cls: "orn", text: t("wpn.attacks") }),
    h("p", { cls: "hint" }, [t("wpn.none") + " ", h("a", { href: `#/c/${ch.id}/inventory`, text: t("wpn.addLink") })])]);
  return h("section", { cls: "blk", id: "attacks" }, [h("div", { cls: "orn", text: t("wpn.attacks") }), h("dl", { cls: "qa gl" }, c.attacks.flatMap((a) => [
    h("dt", {}, [tr(a.name), " ", h("small", { cls: "lvtag", text: signed(a.hit) }), " ", dmgTag(a.tag)]),
    h("dd", {}, [
      h("p", { cls: "small", text: [
        t("wpn.hitLine", { hit: signed(a.hit), dmg: tr(a.damage), type: tr(a.type) }),
        a.versatile ? t("wpn.twoHands", { dmg: tr(a.versatile) }) : "",
        a.range ? t("wpn.range", { r: a.range }) : t("wpn.reach", { n: a.reach }),
        tr(a.props),
      ].filter(Boolean).join(" · ") }),
      a.mastery ? h("p", { cls: "small" }, [h("b", { text: short(a.mastery.name) + ": " }), tr(a.mastery.text)]) : null,
      ...a.notes.map((n) => h("p", { cls: "hint", text: tr(n) })),
    ]),
  ]))]);
}

/** Add or remove carried weapons. onChange() saves and redraws.
 * locked: a new character's weapons come only from its starting equipment, so the list is shown but not edited here. */
export function weaponEditor({ ch, c, onChange, locked = false }) {
  const sel = h("select", { id: "wpn-add-sel", "aria-label": t("wpn.pick") }, [
    h("option", { value: "", text: t("wpn.pick") }),
    ...["simple", "martial"].map((cat) => h("optgroup", { label: t("wpn.cat." + cat) },
      Object.values(WEAPONS).filter((w) => w.cat === cat).map((w) => h("option", { value: w.id, text: `${tr(w.name)} — ${tr({ pl: w.dice.replace("d", "k"), en: w.dice })}`, "data-q": w.name.pl + " " + w.name.en })))),
  ]);
  const rows = (ch.weapons || []).map((it) => {
    const a = c.attacks.find((x) => x.uid === it.uid);
    return h("div", { cls: "li" }, [
      h("div", {}, [h("div", { cls: "t", text: (it.qty > 1 ? `${it.qty}× ` : "") + tr(WEAPONS[it.id]?.name || { pl: it.id, en: it.id }) }),
        a ? h("div", { cls: "n" }, [`${signed(a.hit)} · `, dmgTag(a.tag), a.mastery ? " · " + short(a.mastery.name) : null]) : null]),
      locked && it.start ? null : h("button", { type: "button", cls: "btn small ghost", text: t("inv.remove"), onclick: () => { ch.weapons = ch.weapons.filter((x) => x.uid !== it.uid); onChange(); } }),
    ]);
  });
  if (locked) return h("div", { cls: "stack", id: "weapons" }, [
    rows.length ? h("div", { cls: "list" }, rows) : h("p", { cls: "hint", text: t("wpn.emptyStart") }),
    h("p", { cls: "hint", text: t("wpn.fromStart") }),
  ]);
  return h("div", { cls: "stack", id: "weapons" }, [
    rows.length ? h("div", { cls: "list" }, rows) : h("p", { cls: "hint", text: t("wpn.empty") }),
    h("div", { cls: "row" }, [sel, h("button", { type: "button", cls: "btn", id: "wpn-add", text: t("inv.add"), onclick: () => {
      if (!sel.value) return;
      ch.weapons = [...(ch.weapons || []), { uid: newId(), id: sel.value }]; onChange();
    } })]),
    h("p", { cls: "hint", text: t("wpn.hint") }),
  ]);
}
