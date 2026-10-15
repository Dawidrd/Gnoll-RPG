// Picking class options with limits and prerequisites: Eldritch Invocations, Metamagic.
// Options tied to a cantrip (Agonizing Blast, Eldritch Spear, Repelling Blast) appear once per qualifying cantrip you know.
import { h } from "../dom.js";
import { t, tr } from "../i18n.js";
import { SPELLS } from "../rules/spells.js";
import { qualifyingCantrips } from "../rules/options.js";

const nameOf = (o) => tr(o.name);
const textOf = (o, c) => tr(typeof o.desc === "function" ? o.desc(c) : o.desc);

/** Why an option can't be taken yet (level, pact, another invocation), or null. */
function blockedBy(o, c, chosenBases, options) {
  const p = o.prereq || {};
  if (p.level && c.level < p.level) return t("opt.needLevel", { n: p.level });
  if (p.pact && !chosenBases.includes(`pact-of-the-${p.pact}`)) return t("opt.needPact", { pact: p.pact[0].toUpperCase() + p.pact.slice(1) });
  if (p.invocation && !chosenBases.includes(p.invocation)) return t("opt.needOption", { name: tr(options[p.invocation].name).split(" (")[0] });
  return null;
}

/**
 * group: { key, label, count, options, chosen: [{ raw, base, cantrip, problem }] }
 * known: cantrips that count for "a Warlock cantrip" prerequisites. onChange(raws) gets the new list.
 */
export function classOptionUI({ group, c, known, onChange }) {
  const raws = group.chosen.map((x) => x.raw);
  const bases = group.chosen.map((x) => x.base);
  const full = raws.length >= group.count;
  const rows = [];
  const toggle = (raw, on) => onChange(on ? [...raws, raw] : raws.filter((r) => r !== raw));
  const sorted = Object.entries(group.options).sort(([, a], [, b]) => nameOf(a).localeCompare(nameOf(b)));
  for (const [id, o] of sorted) {
    const block = blockedBy(o, c, bases, group.options);
    const combos = o.prereq?.cantrip ? qualifyingCantrips(o.prereq.cantrip, known).map((sp) => [`${id}@${sp}`, `${nameOf(o)} — ${tr(SPELLS[sp].name).split(" (")[0]}`]) : [[id, nameOf(o)]];
    if (o.prereq?.cantrip && !combos.length) {
      rows.push(row(id, nameOf(o), false, true, block || t("opt.needCantrip"), o));
      continue;
    }
    for (const [raw, label] of combos) {
      const on = raws.includes(raw);
      rows.push(row(raw, label, on, !on && (full || !!block), block, o));
    }
  }
  function row(raw, label, on, disabled, why, o) {
    const box = h("input", { type: "checkbox", id: `opt-${group.key}-${raw}`.replace(/[^\w-]/g, "_"), checked: on, disabled, "aria-label": label,
      onchange: (e) => toggle(raw, e.target.checked) });
    return h("div", { cls: "spellrow" + (on ? " on" : "") }, [box, h("details", {}, [
      h("summary", {}, [h("span", { cls: "sname", text: label }), o.cost ? [" ", h("small", { cls: "lvtag", text: t("opt.cost", { n: o.cost }) })] : null, why ? [" ", h("small", { cls: "lvtag", text: why })] : null].flat()),
      h("p", { text: textOf(o, c) }),
    ])]);
  }
  // Picks that no longer fit (missing cantrip, prerequisite lost): shown on top with a remove button.
  const stale = group.chosen.filter((x) => x.problem);
  const warn = stale.map((x) => h("p", { cls: "warn small" }, [`${x.option ? nameOf(x.option) : x.raw}: ${tr(x.problem)} `,
    h("button", { type: "button", cls: "btn small ghost", text: t("form.remove"), onclick: () => onChange(raws.filter((r) => r !== x.raw)) })]));
  return h("div", { cls: "stack pickbox", id: `opts-${group.key}` }, [
    h("div", { cls: "pickhead" }, [h("b", { text: tr(group.label) }), h("p", { cls: "picked" + (raws.length === group.count && !stale.length ? " done" : ""), text: t("spell.pickedOf", { n: raws.length, max: group.count }) })]),
    ...warn,
    h("div", { cls: "spellpick" }, rows),
  ]);
}

/** Read-only list for the Character tab. */
export function classOptionList(group, c) {
  const ok = group.chosen.filter((x) => !x.problem);
  if (!ok.length) return null;
  return h("section", { cls: "blk" }, [h("div", { cls: "orn", text: tr(group.label) }), h("dl", { cls: "qa gl" }, ok.flatMap((x) => [
    h("dt", { text: nameOf(x.option) + (x.cantrip ? ` — ${tr(SPELLS[x.cantrip].name).split(" (")[0]}` : "") }),
    h("dd", {}, [h("p", { text: textOf(x.option, c) })]),
  ]))]);
}
