// Where in the creator each checks item (rules/checks.js) is about: a CSS selector of its field, or null when unknown.
// Used to point at the field when "Next" or "Save" is blocked, and to colour finished frames (cards) green:
// a frame is finished when none of its step's items points into it.

const FIXED = {
  "todo.subclass": "#f-subclass", "todo.legacySubclass": "#f-subclass",
  "todo.background": "#f-bg", "todo.legacyBackground": "#f-bg",
  "todo.legacySpecies": "#f-species", "todo.size": "#f-species", "todo.speciesChoice": "select[id^='f-sp-']",
  "todo.languages": "#f-languages", "err.languages": "#f-languages",
  "todo.roll": "#f-rollall", "todo.pointbuy": "#f-pb-left", "err.pointbuy": "#f-pb-left",
  "todo.legacyAbilities": "#f-abilities", "err.paper": "#f-abilities", "err.array": "#f-abilities", "err.roll": "#f-abilities",
  "todo.increase": "#f-inc-p2", "err.increase": "#f-inc-p2",
  "todo.alignment": ".aligngrid", "todo.name": "#f-name",
  "todo.skills": "#f-skills", "err.skills": "#f-skills", "todo.expertise": "#f-skills", "err.expertise": "#f-skills", "err.expertiseFrom": "#f-skills",
  "todo.featAbility": "#f-feats", "todo.featExpertisePick": "#f-feats", "todo.catalyst": "#f-feats", "err.legacyFeat": "#f-feats",
  "todo.startClass": "#f-start", "todo.startBg": "#f-start", "err.startGold": "#f-start-coins", "todo.startRoll": "#f-start-roll",
  "err.startArmor": "#f-armor", "err.startShield": "#f-shield", "err.startWeapon": "#weapons",
  "todo.spellPick": "#f-spells", "err.spellInvalid": "#f-spells", "err.spellTooMany": "#f-spells",
  "todo.legacyAc": "#f-legacy", "todo.legacyHp": "#f-legacy", "todo.legacyText": "#f-legacy",
};
// Feat slot items: the background's slot is on step 2, the others on step 5.
const FEAT_SLOT = new Set(["todo.feat", "err.featCategory", "err.featTwice"]);
const CLASS_OPTION = new Set(["todo.classOption", "err.classOptionTooMany", "err.classOption", "todo.classOptionCantrip"]);
const TOOLS = new Set(["todo.tools", "err.tools"]);

/** Selector of the field a checks item is about (c = compute() of the character), or null. */
export function fieldOf(item, c) {
  // Choices for an Ability Score Improvement level: that level's frame.
  for (const L of c?.asiLevels || []) {
    const pr = c.levelProblems?.[L];
    if (pr && [...pr.todo, ...pr.errors].some((x) => x.key === item.key && x.vars === item.vars)) return `#f-asi-${L}`;
  }
  if (FIXED[item.key]) return FIXED[item.key];
  const v = item.vars || {};
  if (FEAT_SLOT.has(item.key)) return item.step === 2 ? "#f-bg" : "#f-feats";
  if (TOOLS.has(item.key)) {
    const sl = (c?.toolSlots || []).find((s) => s.label === v.what);
    return sl ? `[id^='f-tool-${sl.id}']` : null;
  }
  if (CLASS_OPTION.has(item.key)) {
    const g = (c?.classOptions || []).find((x) => x.label === v.what || x.chosen.some((y) => y.option?.name === v.name || y.raw === v.name?.en));
    return g ? `#f-opt-${g.key}` : null;
  }
  if (item.key === "err.ravenloftOnly") {
    if (item.step === 1) return "#f-subclass";
    if (item.step === 2) return c?.bg && v.name === c.bg.name ? "#f-bg" : "#f-species";
    if (item.step === 5) return "#f-feats";
  }
  return null;
}
