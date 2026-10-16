// What the character still has to choose (todo) and what breaks the rules (errors).
// Each item: { step: 1–5, key: i18n key, vars }. Errors block saving; todo items don't.
import { ABILITIES, FEATS, SKILLS } from "./core.js";
import { STANDARD_ARRAY } from "./core.js";
import { POINT_BUY, pointsSpent, ALIGNMENTS, validPaper } from "./identity.js";

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
  for (const x of c.speciesMissing || []) T(2, "todo.speciesChoice", { what: x.label });
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
  else if (ch.abilityMethod === "paper") { if (!validPaper(base)) E(3, "err.paper"); }
  else if (ch.abilityMethod === "pointbuy") {
    const spent = pointsSpent(base);
    if (ABILITIES.some((a) => base[a] < POINT_BUY.min || base[a] > POINT_BUY.max) || spent > POINT_BUY.budget) E(3, "err.pointbuy");
    // Copied from paper: unspent points are what the sheet has, not something left to do.
    else if (spent < POINT_BUY.budget && ch.entry !== "paper") T(3, "todo.pointbuy", { n: POINT_BUY.budget - spent });
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
  if (!ALIGNMENTS[ch.alignment]) T(4, "todo.alignment");
  if (!ch.name?.trim()) T(4, "todo.name");

  // Step 5: details
  const chosen = (ch.skills || []).filter((x) => !c.granted.includes(x));
  const totalSkills = c.slots.reduce((n, s) => n + s.count, 0);
  if (!c.skillFit.ok) E(5, "err.skills");
  else if (chosen.length < totalSkills) T(5, "todo.skills", { n: totalSkills - chosen.length });
  if ((ch.expertise || []).length > c.expertiseMax) E(5, "err.expertise", { n: c.expertiseMax });
  else if (c.expertiseFrom && (ch.expertise || []).some((x) => !c.expertiseFrom.includes(x))) E(5, "err.expertiseFrom");
  else if ((ch.expertise || []).length < c.expertiseMax) T(5, "todo.expertise", { n: c.expertiseMax - (ch.expertise || []).length });
  for (const s of c.featSlots) {
    const id = s.pick;
    if (!id) T(s.step, "todo.feat", { what: s.label });
    else if (!s.valid) E(s.step, "err.featCategory", { what: s.label });
    else if (c.featInstances.filter((f) => f.id === id).length > 1 && !FEATS[id].repeatable) E(s.step, "err.featTwice", { name: FEATS[id].name });
    if (s.valid && FEATS[id].darkGift) notices.push({ step: s.step, key: "note.darkGift", vars: { name: FEATS[id].name } });
  }
  for (const f of c.originFeats || []) {
    const prof = c.skills.filter((x) => x.prof).map((x) => x.id);
    if (f.expertisePick && (!f.choice.expertise || !prof.includes(f.choice.expertise))) T(5, "todo.featExpertisePick", { name: f.name });
    if (f.catalyst && !f.choice.catalyst) T(5, "todo.catalyst", { name: f.name });
  }
  for (const x of c.ravenloftOnly || []) E(x.step, "err.ravenloftOnly", { name: x.name });

  // Spells picked from lists: class cantrips and prepared spells, Magic Initiate. (Level feat picks are checked with their level.)
  for (const src of c.spellSources || []) {
    for (const p of src.picks) {
      if (p.store === "level") continue;
      const what = { pl: `${src.label.pl.split(" (")[0]}: ${p.label.pl.toLowerCase()}`, en: `${src.label.en}: ${p.label.en.toLowerCase()}` };
      if (p.invalid.length) E(5, "err.spellInvalid", { what });
      else if (p.chosen.length > p.count) E(5, "err.spellTooMany", { what, n: p.count });
      else if (p.chosen.length < p.count) T(5, "todo.spellPick", { what, n: p.count - p.chosen.length });
    }
  }
  // Class option lists: Eldritch Invocations, Metamagic.
  for (const g of c.classOptions || []) {
    const ok = g.chosen.filter((x) => !x.problem);
    for (const x of g.chosen.filter((y) => y.problem)) {
      if (x.pending) T(5, "todo.classOptionCantrip", { name: x.option.name });
      else E(5, "err.classOption", { name: x.option?.name || { pl: x.raw, en: x.raw }, why: x.problem });
    }
    if (g.chosen.length > g.count) E(5, "err.classOptionTooMany", { what: g.label, n: g.count });
    else if (ok.length + g.chosen.filter((x) => x.pending).length < g.count) T(5, "todo.classOption", { what: g.label, n: g.count - g.chosen.length });
  }
  const oldText = [ch.spells?.cantrips, ch.spells?.prepared, ...Object.values(ch.featChoices || {}).map((x) => x?.spells),
    ...Object.values(ch.levelChoices || {}).map((x) => (typeof x?.spells === "string" ? x.spells : ""))];
  if (oldText.some((x) => typeof x === "string" && x.trim())) T(5, "todo.legacySpells");
  for (const f of c.featInstances.filter((x) => x.source === "legacy")) E(5, "err.legacyFeat", { name: FEATS[f.id]?.name || f.id });
  for (const f of c.featInstances) {
    if (FEATS[f.id]?.spellAbility && !(ch.featChoices?.[f.id]?.ability)) T(5, "todo.featAbility", { name: FEATS[f.id].name });
  }

  // Starting equipment: an option from the class and from the background; purchases can't cost more than the coins.
  const sg = c.startGear;
  if (sg && !sg.sg.applied && !sg.sg.skip) {
    if (sg.needsClass) T(5, "todo.startClass");
    if (sg.needsBg) T(5, "todo.startBg");
    if (sg.left < 0) E(5, "err.startGold", { n: (-sg.left / 100).toFixed(2).replace(/\.00$/, "") });
  }

  // Values typed by hand in versions before 0.4: still applied, but should be replaced.
  if (ch.acOverride) T(5, "todo.legacyAc", { n: ch.acOverride });
  if (ch.hp?.maxOverride) T(5, "todo.legacyHp", { n: ch.hp.maxOverride });
  if (ch.featsOther?.trim()) T(5, "todo.legacyText", { what: "featsOther" });
  if (ch.tools?.trim()) T(5, "todo.legacyText", { what: "tools" });

  for (const L of c.asiLevels) {
    const pr = c.levelProblems[L];
    pr.todo.forEach((x) => T(5, x.key, x.vars));
    pr.errors.forEach((x) => E(5, x.key, x.vars));
  }

  return { todo, errors, notices };
}

/** What keeps the creator from moving past `step`: the step's errors first, then its to-dos. Empty = the step is complete. */
export function stepBlockers(rev, step) {
  return [...rev.errors, ...rev.todo].filter((x) => x.step === step);
}

export const skillName =(id, lang) => SKILLS.find((s) => s.id === id)?.[lang] || id;
