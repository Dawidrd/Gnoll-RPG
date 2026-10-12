// "Ability Score Improvement" choice for one level: +2/+1+1 to abilities, or a general feat with its own picks.
// Used by the creator (levels already reached) and by the Level up tab (the next level).
import { h } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { ABILITIES, ABILITY_NAMES, FEATS, SKILLS, profBonus } from "../rules/core.js";
import { finalAbilities, featBlocked, featIncreaseOptions, levelChoiceProblems } from "../rules/index.js";
import { DAMAGE_TYPES } from "../rules/feats-general.js";
import { msg } from "./msg.js";
import { spellPickUI } from "./spellpicker.js";
import { pickOptions } from "../rules/magic.js";
import { SPELLS } from "../rules/spells.js";

/**
 * draft: a character object whose levelChoices[L] is being edited (its level may already be L).
 * onChange(lc): called with the new choice for level L.
 * profSkills: skills the character is proficient in before this choice (for Expertise picks).
 */
export function levelChoiceUI({ draft, L, onChange, profSkills = [] }) {
  const lc = draft.levelChoices?.[L] || null;
  const before = finalAbilities(draft, L - 1);
  const ab = (a) => ABILITY_NAMES[a][lang()];
  const set = (patch) => onChange({ ...(lc || {}), ...patch });
  const seg = (options, current, onpick) => h("div", { cls: "seg", role: "group" }, options.map(([k, label]) =>
    h("button", { type: "button", "aria-pressed": k === current ? "true" : "false", text: label, onclick: () => onpick(k) })));
  const sel = (id, label, options, value, onpick, placeholder = "—") => h("label", { cls: "wide" }, [label,
    h("select", { id, onchange: (e) => onpick(e.target.value) }, [h("option", { value: "", text: placeholder }),
      ...options.map(([k, text, disabled]) => h("option", { value: k, text, selected: k === value, disabled: !!disabled }))])]);

  const parts = [
    h("p", { cls: "hint", text: t("lvl.asiRule") }),
    seg([["asi", t("lvl.kindAsi")], ["feat", t("lvl.kindFeat")]], lc?.kind || "", (k) => onChange(k === "asi" ? { kind: "asi", mode: "2" } : { kind: "feat" })),
  ];

  if (lc?.kind === "asi") {
    const mode = lc.mode || "2";
    const room = (a, n) => before[a] + n <= 20;
    parts.push(seg([["2", "+2"], ["11", "+1 / +1"]], mode, (m) => onChange({ kind: "asi", mode: m })));
    const opts = (n, other) => ABILITIES.map((a) => [a, `${ab(a)} (${before[a]} → ${Math.min(20, before[a] + n)})`, !room(a, n) || a === other]);
    if (mode === "2") parts.push(sel(`f-asi-${L}-a`, "+2", opts(2), lc.a, (v) => set({ a: v })));
    else parts.push(h("div", { cls: "row" }, [
      sel(`f-asi-${L}-a`, "+1", opts(1, lc.b), lc.a, (v) => set({ a: v })),
      sel(`f-asi-${L}-b`, "+1", opts(1, lc.a), lc.b, (v) => set({ b: v })),
    ]));
  }

  if (lc?.kind === "feat") {
    const general = Object.entries(FEATS).filter(([k, f]) => f.category === "general" && !f.asi)
      .sort(([, a], [, b]) => tr(a.name).localeCompare(tr(b.name), lang()));
    const featOpts = general.map(([k, f]) => {
      const block = featBlocked(draft, L, k);
      return [k, block ? `${tr(f.name)} — ${t("lvl.requires")}: ${tr(block)}` : tr(f.name), !!block];
    });
    parts.push(sel(`f-lvfeat-${L}`, t("lvl.featPick"), featOpts, lc.feat, (v) => onChange({ kind: "feat", feat: v })));
    const f = FEATS[lc.feat];
    if (f) {
      parts.push(h("p", { cls: "small", text: tr(f.desc) }));
      if (f.increase) {
        const incOpts = featIncreaseOptions(draft, L, lc.feat).map((a) => [a, `${ab(a)} (${before[a]} → ${before[a] + 1})`]);
        parts.push(sel(`f-lvinc-${L}`, t(f.saveFromIncrease ? "lvl.featIncSave" : "lvl.featInc"), incOpts, lc.inc, (v) => set({ inc: v })));
      }
      if (f.lore) parts.push(sel(`f-lvlore-${L}`, t("lvl.featLore"), f.lore.map((s) => [s, SKILLS.find((x) => x.id === s)[lang()] + (profSkills.includes(s) ? ` (${t("lvl.becomesExpertise")})` : "")]), lc.lore, (v) => set({ lore: v })));
      if (f.skillPick) parts.push(sel(`f-lvskill-${L}`, t("lvl.featSkill"), SKILLS.filter((s) => !profSkills.includes(s.id)).map((s) => [s.id, s[lang()]]), lc.skill, (v) => set({ skill: v, expertise: lc.expertise === v ? "" : lc.expertise })));
      if (f.expertisePick) {
        const pool = [...new Set([...profSkills, ...(lc.skill ? [lc.skill] : [])])];
        parts.push(sel(`f-lvexp-${L}`, t("lvl.featExpertise"), SKILLS.filter((s) => pool.includes(s.id)).map((s) => [s.id, s[lang()]]), lc.expertise, (v) => set({ expertise: v })));
      }
      if (f.damageType) parts.push(sel(`f-lvdmg-${L}`, t("lvl.featDamage"), Object.entries(DAMAGE_TYPES).map(([k, d]) => [k, tr(d)]), lc.damage, (v) => set({ damage: v })));
      // Fey-Touched / Shadow-Touched / Ritual Caster: pick from the filtered list; their ability is the one this feat raises.
      for (const p of f.spellPicks || []) {
        const pick = { ...p, id: `lvl-${L}:${p.key}`, count: p.count === "pb" ? profBonus(L) : p.count, options: pickOptions(p), chosen: Array.isArray(lc.spells) ? lc.spells : [] };
        parts.push(spellPickUI({ pick, c: { level: L }, title: t("lvl.featSpells"), onChange: (ids) => set({ spells: ids }) }));
      }
      if ((f.innate || []).length) parts.push(h("p", { cls: "hint", text: t("lvl.featFixedSpells", { list: f.innate.map((x) => tr(SPELLS[x.id].name).split(" (")[0]).join(", ") }) }));
    }
  }

  const pr = levelChoiceProblems(draft, L);
  const issues = [...pr.errors.map((x) => h("li", { cls: "err", text: msg(x) })), ...pr.todo.map((x) => h("li", { text: msg(x) }))];
  if (issues.length && lc) parts.push(h("ul", { cls: "checklist" }, issues));
  return h("div", { cls: "stack", id: `f-level-${L}` }, parts);
}

/** True when the choice for level L is complete and valid. */
export function levelChoiceDone(draft, L) {
  const pr = levelChoiceProblems(draft, L);
  return !pr.todo.length && !pr.errors.length;
}
