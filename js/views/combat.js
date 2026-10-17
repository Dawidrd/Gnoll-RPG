// Combat tab (turn planner) and the "switched on" card on Start (Rage, Wild Shape, Mage Armor, armor off, shield, familiar).
import { h, toast } from "../dom.js";
import { t, tr } from "../i18n.js";
import { newTurn } from "../rules/index.js";
import { turnOptions, turnTips } from "../rules/turn.js";
import { SPELLS } from "../rules/spells.js";
import { ARMOR } from "../rules/armor.js";
import { clamp, signed } from "../rules/core.js";
import { dmgTag, dmgTags, dmgIcons, typeChip } from "./dmgtag.js";
import { BEASTS, speedText } from "../rules/beasts.js";
import { familiarStartBox, hasFamiliar } from "./familiar.js";

const left = (r) => (r ? r.max - r.used : 0);
const short = (x) => tr(x).split(" (")[0];

/** What a pick would spend right now: a resource use, a free spell use or the lowest fitting slot. Null if it can't be paid. */
function payment(c, cost) {
  if (!cost) return { spend: [] };
  if (cost.res) {
    const r = c.resources.find((x) => x.id === cost.res);
    return left(r) >= cost.n ? { spend: [{ id: cost.res, n: cost.n }] } : null;
  }
  if (cost.spell) {
    const free = cost.spell.free ? c.resources.find((x) => x.id === cost.spell.free) : null;
    if (left(free) > 0) return { spend: [{ id: free.id, n: 1 }], how: "free" };
    const slot = c.resources.filter((r) => r.slot && r.slot >= cost.spell.circle && left(r) > 0).sort((a, b) => a.slot - b.slot)[0];
    return slot ? { spend: [{ id: slot.id, n: 1 }], how: "slot", slot: slot.slot } : null;
  }
  return { spend: [] };
}

export function combatTab({ ch, c, save }) {
  const turn = ch.turn;
  const opts = turnOptions(c, ch);
  const spendAll = (list, sign) => {
    const used = { ...(ch.used || {}) };
    for (const s of list) used[s.id] = Math.max(0, (used[s.id] || 0) - sign * s.n);
    ch.used = used;
  };

  function pick(slot, o) {
    const pay = payment(c, o.cost);
    if (!pay) return toast(t("turn.cantPay"));
    spendAll(pay.spend, -1);
    const p = { id: o.id, label: o.label, desc: o.desc, fx: o.fx || null, attack: !!o.attack, dmg: o.dmg || null, weapons: o.weapons?.length ? o.weapons : null, spent: pay.spend, prev: {} };
    if (o.set) { p.prev.active = { ...ch.active }; ch.active = { ...ch.active, ...o.set }; if (o.set.rage) toast(t("active.rageOn")); } // Rage, Wild Shape
    if (o.tempHp) { p.prev.temp = ch.hp.temp || 0; ch.hp.temp = Math.max(ch.hp.temp || 0, o.tempHp); }
    if (o.spell && SPELLS[o.spell].conc) {
      p.prev.conc = ch.concentration || null;
      if (ch.concentration && ch.concentration !== o.spell) toast(t("conc.replaced", { name: short(SPELLS[ch.concentration].name) }));
      ch.concentration = o.spell;
    }
    if (pay.how === "slot") p.note = t("turn.paidSlot", { n: pay.slot });
    if (pay.how === "free") p.note = t("turn.paidFree");
    if (slot === "free") turn.free = [...(turn.free || []), p]; else turn[slot] = p;
    save();
  }
  function undo(slot, i) {
    const p = slot === "free" ? turn.free[i] : turn[slot];
    if (!p) return;
    spendAll(p.spent || [], 1);
    p.prev = p.prev || {};
    if ("rage" in p.prev) ch.active = { ...ch.active, rage: p.prev.rage };
    if ("active" in p.prev) ch.active = p.prev.active;
    if ("temp" in p.prev) ch.hp.temp = p.prev.temp;
    if ("conc" in p.prev) ch.concentration = p.prev.conc;
    if (slot === "free") turn.free = turn.free.filter((_, k) => k !== i); else turn[slot] = null;
    save();
  }

  const { tips, movement } = turnTips(c, ch, turn, opts);
  turn.moved = clamp(turn.moved || 0, 0, movement.total);

  const optBtn = (slot, o) => {
    const pay = payment(c, o.cost);
    const costTag = !o.cost ? null : !pay ? t("turn.none") : o.cost.res ? `${left(c.resources.find((x) => x.id === o.cost.res))}×`
      : pay.how === "free" ? t("turn.freeUse") : t("turn.slotTag", { n: pay.slot });
    return h("button", { type: "button", cls: "opt", title: tr(o.desc) || "", disabled: !pay, onclick: () => pick(slot, o) },
      [short(o.label), o.dmg?.length ? h("span", { cls: "dic", "aria-hidden": "true", text: " " + dmgIcons(o.dmg) }) : null, costTag ? h("small", { text: costTag }) : null]);
  };
  /** Weapon lines for the Attack action: name, to hit and a damage tag. */
  const weaponRows = (list) => h("div", { cls: "wrows" }, list.map((w) => h("div", { cls: "wrow" }, [h("span", { text: `${short(w.name)} ${signed(w.hit)}` }), " ", dmgTag(w.tag)])));
  const picked = (p, onx) => h("div", { cls: "pick" }, [
    h("div", {}, [h("div", { cls: "pl", text: short(p.label) }),
      p.weapons ? weaponRows(p.weapons) : p.desc ? h("div", { cls: "pd", text: tr(p.desc) + (p.note ? " · " + p.note : "") }) : null,
      p.weapons && p.note ? h("div", { cls: "pd", text: p.note }) : null,
      p.dmg?.length ? h("div", { cls: "pd" }, [dmgTags(p.dmg)]) : null]),
    h("button", { type: "button", cls: "btn ghost sq", "aria-label": t("turn.undo") + ": " + short(p.label), text: "×", onclick: onx })]);
  const group = (label, list, slot) => list.length ? [h("span", { cls: "ogrp", text: label }), ...list.map((o) => optBtn(slot, o))] : [];
  const tile = (cls, name, key, freeText, kids, hint) => {
    const p = turn[key];
    return h("div", { cls: `tslot ${cls}` + (p ? " used" : ""), id: "turn-" + key }, [
      h("div", { cls: "hd" }, [h("span", { cls: "nm", text: name }), h("span", { cls: "st", text: p ? t("turn.used") : freeText })]),
      p ? picked(p, () => undo(key)) : h("div", { cls: "opts" }, kids),
      !p && hint ? h("p", { cls: "hint", text: hint }) : null,
    ]);
  };

  const A = opts.action;
  const actionKids = [
    ...group(opts.attacks > 1 ? t("turn.attackN", { n: opts.attacks }) : t("turn.attackGroup"), A.filter((o) => o.attack), "action"),
    A.find((o) => o.id === "attack")?.weapons?.length ? weaponRows(A.find((o) => o.id === "attack").weapons) : null,
    ...group(t("turn.features"), A.filter((o) => o.group === "feature" && !o.attack), "action"),
    ...group(t("turn.spells"), A.filter((o) => o.group === "spell"), "action"),
    ...group(t("turn.otherActions"), A.filter((o) => o.group === "other" && !o.attack), "action"),
  ];
  const bonusKids = [...group(t("turn.features"), opts.bonus.filter((o) => o.group === "feature"), "bonus"),
    ...group(t("turn.spells"), opts.bonus.filter((o) => o.group === "spell"), "bonus"),
    ...group(t("turn.otherActions"), opts.bonus.filter((o) => o.group === "other"), "bonus")];
  const reactKids = opts.reaction.map((o) => optBtn("reaction", o));

  const sq = h("div", { cls: "sqs" }, Array.from({ length: movement.total }, (_, i) => h("button", {
    type: "button", cls: "sqb" + (i < turn.moved ? " on" : "") + (i >= movement.per ? " dash" : ""), "aria-label": `${(i + 1) * 5} ft`, text: String((i + 1) * 5),
    onclick: () => { turn.moved = turn.moved === i + 1 ? i : i + 1; save(); } })));
  const fx = new Set([turn.action, turn.bonus].flatMap((p) => p?.fx || []));
  const flags = h("div", { cls: "flags" }, [
    c.active.rage ? h("span", { cls: "flag conc", text: t("active.rageTag") }) : null,
    ch.concentration && SPELLS[ch.concentration] ? h("span", { cls: "flag conc", text: t("conc.on") + ": " + short(SPELLS[ch.concentration].name) }) : null,
    h("span", { cls: "flag", text: `AC ${c.ac.value}` }),
    fx.has("dash") ? h("span", { cls: "flag", text: t("turn.flagDash") }) : null,
    fx.has("dis") ? h("span", { cls: "flag", text: t("turn.flagDis") }) : h("span", { cls: "flag bad", text: t("turn.flagNoDis") }),
    fx.has("dodge") ? h("span", { cls: "flag", text: t("turn.flagDodge") }) : null,
  ]);
  const move = h("section", { cls: "tmove", id: "turn-move" }, [
    h("div", { cls: "hd row" }, [h("span", { cls: "nm", text: t("turn.move") }), h("span", { cls: "hint", text: t("turn.moveLeft", { done: turn.moved * 5, left: movement.left }) })]),
    sq, flags,
    c.resistances.length ? h("p", { cls: "small resline", id: "turn-resist" }, [t("turn.resist") + ": ", ...c.resistances.map(typeChip)]) : null]);

  const freeRow = opts.free.length ? h("section", { cls: "card", id: "turn-free" }, [
    h("h4", { text: t("turn.onHit") }),
    ...(turn.free || []).map((p, i) => picked(p, () => undo("free", i))),
    h("div", { cls: "opts" }, opts.free.map((o) => optBtn("free", o))),
    h("p", { cls: "hint", text: t("turn.onHitHint") }),
  ]) : null;

  const endBox = h("div", { cls: "confirm" });
  const bar = h("div", { cls: "row turnbar" }, [
    h("span", { cls: "round" }, [t("turn.round") + " ", h("b", { id: "turn-round", text: turn.round || 1 })]),
    h("button", { type: "button", cls: "btn gold", id: "turn-new", text: t("turn.new"), onclick: () => {
      ch.turn = newTurn((turn.round || 1) + 1); save(); toast(t("turn.newDone", { n: ch.turn.round }));
    } }),
    h("button", { type: "button", cls: "btn ghost", id: "turn-end", text: t("turn.end"), onclick: () => {
      endBox.replaceChildren(h("span", { cls: "small", text: t("turn.endAsk") }),
        h("button", { type: "button", cls: "btn gold", text: t("sheet.yes"), onclick: () => {
          ch.turn = newTurn(1); if (ch.active.rage) ch.active = { ...ch.active, rage: false }; save(); toast(t("turn.endDone"));
        } }),
        h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => endBox.classList.remove("open") }));
      endBox.classList.add("open");
    } }),
  ]);

  return [
    h("header", { cls: "stack" }, [h("h2", { text: t("turn.title") }), h("p", { cls: "lead", text: t("turn.lead") })]),
    bar, endBox, move,
    h("div", { cls: "tgrid gl" }, [
      tile("", t("turn.action"), "action", t("turn.free"), actionKids, opts.attacks > 1 ? t("turn.extraAttackHint") : null),
      tile("b", t("turn.bonus"), "bonus", t("turn.free"), bonusKids, t("turn.bonusHint")),
      tile("r", t("turn.reaction"), "reaction", t("turn.ready"), reactKids, t("turn.reactionHint")),
      tile("f", t("turn.item"), "item", t("turn.freeItem"), opts.item.map((o) => h("button", { type: "button", cls: "opt", onclick: () => { turn.item = { id: o.id, label: o.label }; save(); } }, [tr(o.label)])), null),
    ]),
    freeRow,
    h("section", { cls: "card tips", id: "turn-tips" }, [h("h4", { text: t("turn.tips") }), h("ul", {}, tips.map((x) => h("li", { cls: x.kind, text: tr(x.text) })))]),
  ];
}

/** Things switched on during play. Only the ones this character can use are shown. */
export function activeCard({ ch, c, save }) {
  const rows = [];
  const toggle = (id, label, on, hint, fn) => rows.push(h("div", { cls: "resrow" }, [
    h("span", { cls: "lbl" }, [label, hint ? h("small", { text: hint }) : null]),
    h("button", { type: "button", cls: "btn small" + (on ? " gold" : ""), id: "act-" + id, "aria-pressed": on ? "true" : "false", text: on ? t("active.on") : t("active.off"), onclick: fn })]));
  const set = (k, v) => { ch.active = { ...ch.active, [k]: v }; save(); };

  if (c.cls.id === "barbarian") {
    const r = c.resources.find((x) => x.id === "rage");
    toggle("rage", t("active.rage"), c.active.rage, c.active.rage ? t("active.rageHint") : t("active.rageLeft", { n: left(r) }), () => {
      if (c.active.rage) return set("rage", false);
      if (!left(r)) return toast(t("turn.cantPay"));
      ch.used = { ...ch.used, rage: (ch.used?.rage || 0) + 1 }; set("rage", true); toast(t("active.rageOn"));
    });
  }
  // Wild Shape (Druid): pick a known form and shift (spends a use, gives Temporary HP), or leave the form.
  let wildBox = null;
  if (c.cls.id === "druid" && c.level >= 2) {
    const r = c.resources.find((x) => x.id === "wild-shape");
    const ws = c.wildShape;
    if (ws) {
      toggle("wild-shape", t("active.wildShape", { name: short(ws.beast.name) }), true, t("active.wildShapeHint"), () => set("wildShape", ""));
      wildBox = h("div", { cls: "stack famcard", id: "wild-shape" }, [
        h("div", { cls: "orn", text: tr(ws.beast.name) }),
        h("p", { cls: "small", text: t("active.wildStats", { ac: ws.ac, speed: tr(speedText(ws.beast)), str: ws.beast.str, dex: ws.beast.dex, con: ws.beast.con }) + (ws.beast.senses ? " · " + tr(ws.beast.senses) : "") }),
        h("p", { cls: "small", text: tr(ws.beast.attacks) }),
        ws.beast.traits ? h("p", { cls: "hint", text: tr(ws.beast.traits) }) : null,
        h("p", { cls: "hint", text: t("active.wildKeep") }),
      ]);
    } else if (c.forms.length) {
      const sel = h("select", { id: "act-ws-form", "aria-label": t("active.wildPick") }, c.forms.map((id) => h("option", { value: id, text: tr(BEASTS[id].name) })));
      rows.push(h("div", { cls: "resrow" }, [
        h("span", { cls: "lbl" }, [t("active.wildPick"), h("small", { text: t("active.wildLeft", { n: left(r) }) })]), sel,
        h("button", { type: "button", cls: "btn small", id: "act-ws-go", text: t("active.wildGo"), onclick: () => {
          if (!left(r)) return toast(t("turn.cantPay"));
          const temp = (c.subclassId === "moon" ? 3 : 1) * c.level;
          ch.used = { ...ch.used, "wild-shape": (ch.used?.["wild-shape"] || 0) + 1 };
          ch.hp.temp = Math.max(ch.hp.temp || 0, temp);
          set("wildShape", sel.value); toast(t("active.wildOn", { n: temp }));
        } })]));
    } else rows.push(h("p", { cls: "hint", text: t("active.wildNoForms") }));
  }
  if (ch.armor !== "none") toggle("armor", t("active.armor", { name: short(ARMOR[ch.armor].name) }), !c.active.armorOff, t("active.armorHint"), () => set("armorOff", !c.active.armorOff));
  if (c.training.includes("shield") || ch.shield) toggle("shield", t("active.shield"), !!ch.shield, t("active.shieldHint"), () => { ch.shield = !ch.shield; save(); });
  if ((c.spellSources || []).some((s) => s.spells.some((x) => x.id === "mage-armor"))) {
    const wearing = ch.armor !== "none" && !c.active.armorOff;
    toggle("mage-armor", "Mage Armor", c.active.mageArmor, wearing ? t("active.mageArmorWorn") : t("active.mageArmorHint", { ac: 13 + c.mods.dex }), () => set("mageArmor", !c.active.mageArmor));
  }
  // Find Familiar, also through the Druid's Wild Companion: a short line here, everything else on the Familiar tab
  const famBox = hasFamiliar(ch, c) ? familiarStartBox(ch) : null;
  if (!rows.length && !famBox) return null;
  return h("section", { cls: "card", id: "active-card" }, [h("h4", { text: t("active.title") }), h("div", { cls: "res" }, rows), wildBox, famBox,
    h("p", { cls: "hint", text: t("active.acNow", { ac: c.ac.value, note: tr(c.ac.note) }) })]);
}
