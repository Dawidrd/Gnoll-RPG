// What the character still has to choose (todo) and what breaks the rules (errors).
// Each item: { step: 1–5, key: i18n key, vars }. Errors block saving; todo items don't.
import { ABILITIES, FEATS, SKILLS } from "./core.js";
import { STANDARD_ARRAY } from "./core.js";
import { POINT_BUY, pointsSpent } from "./identity.js";

const sortNums = (a) => [...a].sort((x, y) => x - y).join(",");

export function review(ch, c) {
  const todo = [], errors = [], notices = [];
  const T = (step, key, vars) => todo.push({ step, key, vars });
  const E = (step, key, vars) => errors.push({ step, key, vars });

  // Step 1: class
  if (c.level >= (c.cls.subclassLevel || 99)) {
    if (ch.subclass === "custom") T(1, "todo.legacySubclass", { name: ch.subclassCustom || "?" });
    else if (!c.subclass) T(1, "todo.subclass");
  }

  // Step 2: origin
  if (!c.bg) T(2, "todo.background");
  else if (c.bg.legacy) T(2, "todo.legacyBackground");
  if (c.sp.legacy) T(2, "todo.legacySpecies", { name: ch.customSpecies?.name || "?" });
  if (!c.size) T(2, "todo.size");
  const lang = c.languages;
  if (!lang.fit.ok) E(2, "err.languages");
  else if (lang.chosen.length < lang.total) T(2, "todo.languages", { n: lang.total - lang.chosen.length });
  for (const s of c.toolSlots) {
    if (s.picked.length > s.count) E(s.step, "err.tools", { what: s.label });
    else if (s.required && s.picked.length < s.count) T(s.step, "todo.tools", { what: s.label, n: s.count - s.picked.length });
  }

  // Step 3: ability scores
  const base = ch.abilityBase || {};
  if (ch.abilityMethod === "manual") T(3, "todo.legacyAbilities");
  else if (ch.abilityMethod === "roll" && !ch.rolled) T(3, "todo.roll");
  else if (ch.abilityMethod === "pointbuy") {
    const spent = pointsSpent(base);
    if (ABILITIES.some((a) => base[a] < POINT_BUY.min || base[a] > POINT_BUY.max) || spent > POINT_BUY.budget) E(3, "err.pointbuy");
    else if (spent < POINT_BUY.budget) T(3, "todo.pointbuy", { n: POINT_BUY.budget - spent });
  } else if (ch.abilityMethod === "array" && sortNums(ABILITIES.map((a) => base[a])) !== sortNums(STANDARD_ARRAY)) E(3, "err.array");
  else if (ch.abilityMethod === "roll" && ch.rolled && sortNums(ABILITIES.map((a) => base[a])) !== sortNums(ch.rolled.map((r) => r.total))) E(3, "err.roll");
  if (c.bg && !c.bg.legacy) {
    const inc = ch.bgIncrease || {};
    if (inc.mode !== "111") {
      if (!inc.plus2 || !inc.plus1) T(3, "todo.increase");
      else if (!c.bg.abilities.includes(inc.plus2) || !c.bg.abilities.includes(inc.plus1) || inc.plus2 === inc.plus1) E(3, "err.increase");
    }
  }

  // Step 4: identity
  if (!ch.alignment) T(4, "todo.alignment");
  if (!ch.name?.trim()) T(4, "todo.name");

  // Step 5: details
  const chosen = (ch.skills || []).filter((x) => !c.granted.includes(x));
  const totalSkills = c.slots.reduce((n, s) => n + s.count, 0);
  if (!c.skillFit.ok) E(5, "err.skills");
  else if (chosen.length < totalSkills) T(5, "todo.skills", { n: totalSkills - chosen.length });
  if ((ch.expertise || []).length > c.expertiseMax) E(5, "err.expertise", { n: c.expertiseMax });
  else if ((ch.expertise || []).length < c.expertiseMax) T(5, "todo.expertise", { n: c.expertiseMax - (ch.expertise || []).length });
  for (const s of c.featSlots) {
    const id = (ch.featPicks || {})[s.id];
    if (!id) T(5, "todo.feat", { what: s.label });
    else if (!FEATS[id] || FEATS[id].category !== s.category) E(5, "err.featCategory", { what: s.label });
    else if (c.featInstances.filter((f) => f.id === id).length > 1 && !FEATS[id].repeatable) E(5, "err.featTwice", { name: FEATS[id].name });
  }
  for (const f of c.featInstances.filter((x) => x.source === "legacy")) E(5, "err.legacyFeat", { name: FEATS[f.id]?.name || f.id });
  for (const f of c.featInstances) {
    if (FEATS[f.id]?.spellAbility && !(ch.featChoices?.[f.id]?.ability)) T(5, "todo.featAbility", { name: FEATS[f.id].name });
  }

  // Values typed by hand in versions before 0.4: still applied, but should be replaced.
  if (ch.acOverride) T(5, "todo.legacyAc", { n: ch.acOverride });
  if (ch.hp?.maxOverride) T(5, "todo.legacyHp", { n: ch.hp.maxOverride });
  if (ch.featsOther?.trim()) T(5, "todo.legacyText", { what: "featsOther" });
  if (ch.tools?.trim()) T(5, "todo.legacyText", { what: "tools" });

  if (c.level >= 4) notices.push({ step: 5, key: "notice.asi" });

  return { todo, errors, notices };
}

export const skillName = (id, lang) => SKILLS.find((s) => s.id === id)?.[lang] || id;
