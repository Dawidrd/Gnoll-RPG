// The rules engine: turns a stored character into everything the sheet shows.
import { ABILITIES, SKILLS, FEATS, mod, profBonus, clamp } from "./core.js";
import { monk } from "./classes/monk.js";
import { barbarian } from "./classes/barbarian.js";
import { rogue } from "./classes/rogue.js";
import { cleric } from "./classes/cleric.js";
import { warlock } from "./classes/warlock.js";
import { sorcerer } from "./classes/sorcerer.js";
import { bard } from "./classes/bard.js";
import { druid } from "./classes/druid.js";
import { wizard } from "./classes/wizard.js";
import { fighter } from "./classes/fighter.js";
import { paladin } from "./classes/paladin.js";
import { ranger } from "./classes/ranger.js";
import { WEAPONS, weaponAttacks, masteryGroup } from "./weapons.js";
import { BEASTS } from "./beasts.js";
import { classOptions, optionInnate } from "./options.js";
import { ARMOR, armorClass } from "./armor.js";
import { grantedSkills, skillSlots, fitSkills } from "./skills.js";
import { SPECIES, SPECIES_SPELLS, speciesTraits } from "./species.js";
import { BACKGROUNDS, backgroundBonus } from "./backgrounds.js";
import { TOOLS, TOOL_GROUPS, toolOptions, ALL_TOOLS } from "./tools.js";
import { LANGUAGES, STANDARD_PICKS, ANY_PICKS, ALIGNMENTS, SIZES, GENDERS, paperMethod } from "./identity.js";
import { review } from "./checks.js";
import { startPlan, blankStartGear } from "./equipment.js";
import { spellSources, spellResources, pickOptions } from "./magic.js";
import { normalizeFamiliar } from "./familiars.js";

export const CLASSES = { barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard };

/** Classes listed in the creator but not built yet. */
export const PLANNED_CLASSES = {};

export { SPECIES, BACKGROUNDS, TOOLS, TOOL_GROUPS, ARMOR, LANGUAGES, ALIGNMENTS, SIZES, GENDERS };
export { CREATURE_TYPES, DAMAGE_NAMES, SPELL_ABILITIES, SPECIES_SPELLS } from "./species.js";

/** Game types: the standard rules, or Ravenloft (adds The Horrors Within options). */
export const SETTINGS = {
  standard: { pl: "Standardowa (Podręcznik Gracza)", en: "Standard (Player's Handbook)" },
  ravenloft: { pl: "Ravenloft (The Horrors Within)", en: "Ravenloft (The Horrors Within)" },
};

/** Fixed hit points per level after the first (the 2024 "fixed value"). */
export const fixedHp = (hitDie) => hitDie / 2 + 1;
/** A hit-die result typed by the player (rolled at the table): a whole number from 1 to the die, otherwise null. */
export const typedHpRoll = (hitDie, raw) => {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = +s;
  return n >= 1 && n <= hitDie ? n : null;
};

/** Increases from one level choice: ASI (+2, or +1/+1) or a feat's +1. */
export function choiceIncreases(lc) {
  const out = {};
  if (!lc) return out;
  if (lc.kind === "asi") {
    if (lc.mode === "11") { if (lc.a) out[lc.a] = 1; if (lc.b && lc.b !== lc.a) out[lc.b] = 1; }
    else if (lc.a) out[lc.a] = 2;
  } else if (lc.kind === "feat" && lc.inc) out[lc.inc] = 1;
  return out;
}

/**
 * Final ability scores: base + background increases (max 20), then level choices up to `untilLevel` (max 20).
 * Scores typed by hand in old versions are kept as they are.
 */
export function finalAbilities(ch, untilLevel = ch.level || 1) {
  const base = ch.abilityBase || ch.abilities;
  const bonus = ch.abilityMethod === "manual" && !ch.background ? {} : backgroundBonus(ch);
  const out = Object.fromEntries(ABILITIES.map((a) => [a, Math.min(base[a] + (bonus[a] || 0), Math.max(20, base[a]))]));
  for (const L of CLASSES[ch.classId]?.asiLevels || []) {
    if (L > untilLevel) continue;
    const inc = choiceIncreases(ch.levelChoices?.[L]);
    for (const a in inc) out[a] = Math.max(out[a], Math.min(20, out[a] + inc[a]));
  }
  return out;
}

/** Readable prerequisite of a feat, for lists. */
export function prereqText(feat) {
  const p = feat.prereq || {};
  const short = { str: { pl: "SIŁ", en: "STR" }, dex: { pl: "ZRĘ", en: "DEX" }, con: { pl: "KON", en: "CON" }, int: { pl: "INT", en: "INT" }, wis: { pl: "MĄD", en: "WIS" }, cha: { pl: "CHA", en: "CHA" } };
  if (p.ability) return { pl: p.ability.map((a) => short[a].pl).join(" lub ") + " 13+", en: p.ability.map((a) => short[a].en).join(" or ") + " 13+" };
  if (p.training === "shield") return { pl: "biegłość w tarczach", en: "shield training" };
  if (p.training) return { pl: `biegłość w zbrojach (${{ light: "lekkich", medium: "średnich", heavy: "ciężkich" }[p.training]})`, en: `${p.training} armor training` };
  if (p.spellcasting) return { pl: "rzucanie czarów", en: "Spellcasting or Pact Magic" };
  if (p.fightingStyle) return { pl: "zdolność Fighting Style", en: "Fighting Style feature" };
  return null;
}

/** State of the character just before reaching level L: scores, armor training, spellcasting. */
function stateBefore(ch, L) {
  const cls = CLASSES[ch.classId];
  const abilities = finalAbilities(ch, L - 1);
  const classChoices = Object.fromEntries(Object.entries(cls.choices || {}).map(([k, d]) => [k, (ch.classChoices || {})[k] || d.default]));
  const ctx = { level: L, pb: profBonus(L), mods: Object.fromEntries(ABILITIES.map((a) => [a, mod(abilities[a])])), abilities, classChoices, choice: ch.speciesChoice || {} };
  const training = new Set([...(cls.armorTraining || []), ...(cls.extraArmorTraining ? cls.extraArmorTraining(ctx) : [])]);
  for (const k of cls.asiLevels || []) {
    if (k >= L) continue;
    const f = FEATS[ch.levelChoices?.[k]?.kind === "feat" ? ch.levelChoices[k].feat : ""];
    (f?.training || []).forEach((x) => training.add(x));
  }
  const subclass = L >= (cls.subclassLevel || 99) ? cls.subclasses?.[ch.subclass] : null;
  (subclass?.armorTraining || []).forEach((x) => training.add(x));
  const casts = !!(cls.spellcasting || subclass?.spellcasting?.(L, ctx));
  return { abilities, training, casts, fightingStyle: !!cls.fightingStyle && cls.fightingStyle < L, saves: cls.saves };
}

/** Can the character take this feat at level L? Returns the unmet prerequisite or null. */
export function featBlocked(ch, L, featId) {
  const f = FEATS[featId];
  // "Another feat of your choice for which you qualify": general feats, and Fighting Style feats with the Fighting Style feature.
  if (!f || (f.category !== "general" && f.category !== "fighting-style")) return { pl: "to nie jest feat ogólny", en: "not a general feat" };
  const st = stateBefore(ch, L);
  const p = f.prereq || {};
  if (p.ability && !p.ability.some((a) => st.abilities[a] >= 13)) return prereqText(f);
  if (p.training && !st.training.has(p.training)) return prereqText(f);
  if (p.spellcasting && !st.casts) return prereqText(f);
  if (p.fightingStyle && !st.fightingStyle) return prereqText(f);
  return null;
}

/** Abilities a feat may raise at level L (respecting the cap of 20 and Resilient's rule). */
export function featIncreaseOptions(ch, L, featId) {
  const f = FEATS[featId];
  const st = stateBefore(ch, L);
  let list = f.increase === "any" ? ABILITIES : f.increase === "nonSave" ? ABILITIES.filter((a) => !st.saves.includes(a)) : f.increase || [];
  return list.filter((a) => st.abilities[a] < 20);
}

/** What's missing or wrong in the choice made at level L. Used by checks and by the level-up screen. */
export function levelChoiceProblems(ch, L) {
  const todo = [], errors = [];
  const lc = ch.levelChoices?.[L];
  if (!lc) { todo.push({ key: "todo.asiChoice", vars: { n: L } }); return { todo, errors }; }
  const st = stateBefore(ch, L);
  if (lc.kind === "asi") {
    if (!lc.a || (lc.mode === "11" && !lc.b)) todo.push({ key: "todo.asiPick", vars: { n: L } });
    const inc = choiceIncreases(lc);
    if (Object.keys(inc).some((a) => st.abilities[a] + inc[a] > 20)) errors.push({ key: "err.asiOver20", vars: { n: L } });
    return { todo, errors };
  }
  const f = FEATS[lc.feat];
  if (!lc.feat) { todo.push({ key: "todo.asiFeat", vars: { n: L } }); return { todo, errors }; }
  const blocked = featBlocked(ch, L, lc.feat);
  if (blocked) errors.push({ key: "err.featPrereq", vars: { n: L, name: f?.name || lc.feat, req: blocked } });
  if (!f) return { todo, errors };
  const taken = [];
  for (const k of CLASSES[ch.classId].asiLevels || []) if (k < L && ch.levelChoices?.[k]?.kind === "feat") taken.push(ch.levelChoices[k].feat);
  if (f.category === "fighting-style" && ch.featPicks?.style === lc.feat) taken.push(lc.feat); // same as the class's Fighting Style
  if (!f.repeatable && taken.includes(lc.feat)) errors.push({ key: "err.featTwice", vars: { name: f.name } });
  if (f.increase && !lc.inc) todo.push({ key: "todo.featInc", vars: { n: L, name: f.name } });
  if (lc.inc && !featIncreaseOptions(ch, L, lc.feat).includes(lc.inc)) errors.push({ key: "err.featInc", vars: { n: L, name: f.name } });
  if (f.lore && !lc.lore) todo.push({ key: "todo.featSkill", vars: { n: L, name: f.name } });
  if (f.skillPick && !lc.skill) todo.push({ key: "todo.featSkill", vars: { n: L, name: f.name } });
  if (f.expertisePick && !lc.expertise) todo.push({ key: "todo.featExpertise", vars: { n: L, name: f.name } });
  if (f.damageType && !lc.damage) todo.push({ key: "todo.featDamage", vars: { n: L, name: f.name } });
  // Fey-Touched, Shadow-Touched, Ritual Caster: spells picked from a filtered list.
  for (const p of f.spellPicks || []) {
    const count = p.count === "pb" ? profBonus(L) : p.count;
    const opts = pickOptions(p);
    const chosen = Array.isArray(lc.spells) ? lc.spells : [];
    if (chosen.some((id) => !opts.includes(id)) || chosen.length > count) errors.push({ key: "err.featSpells", vars: { n: L, name: f.name, count } });
    else if (chosen.length < count) todo.push({ key: "todo.featSpells", vars: { n: L, name: f.name, count: count - chosen.length } });
  }
  return { todo, errors };
}

/**
 * Bring older saves up to date without losing anything.
 * v0.1 stored only final scores (kept as "manual", flagged in the todo list).
 * v0.4 (schema 3) adds game type, size, languages, alignment, tool picks and feat slots;
 * feats chosen freely before 0.4 go to the human Versatile slot if they fit, otherwise to legacyFeats.
 */
export function normalize(ch) {
  if (!ch.abilityMethod) { ch.abilityMethod = "manual"; ch.abilityBase = { ...ch.abilities }; }
  if (!("background" in ch)) ch.background = "";
  if (!ch.bgIncrease) ch.bgIncrease = { mode: "21", plus2: "", plus1: "" };
  if (!ch.hpRolls) ch.hpRolls = {};
  if (ch.tools == null) ch.tools = "";
  if (!ch.armor) ch.armor = "none";
  if (ch.shield == null) ch.shield = false;
  if (!ch.classChoices) ch.classChoices = {};
  if (!ch.spells) ch.spells = { cantrips: "", prepared: "" };
  if (!ch.expertise) ch.expertise = [];
  if (!ch.levelChoices) ch.levelChoices = {};
  // 0.10: equipment, coins, session journal, the turn planner and what's switched on (rage, Mage Armor, armor off, familiar).
  if (!Array.isArray(ch.items)) ch.items = [];
  ch.gold = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...(ch.gold || {}) };
  if (!Array.isArray(ch.journal)) ch.journal = [];
  if (!ch.turn) ch.turn = newTurn();
  if (!ch.active) ch.active = {};
  if (!Array.isArray(ch.weapons)) ch.weapons = []; // 0.12: weapons carried, for attack rolls
  if (!ch.familiar) ch.familiar = { name: "", kind: "", hp: { cur: null, max: null }, present: true };
  ch.familiar = normalizeFamiliar(ch.familiar);
  // 0.26: gender (description only). A value from outside the list is kept as the player's own words.
  if (ch.gender == null) ch.gender = "";
  if (ch.gender && !GENDERS[ch.gender]) { ch.genderCustom = String(ch.gender); ch.gender = "other"; }
  // 0.18: starting equipment. Characters made before it already have their gear, so the creator doesn't ask again.
  ch.startGear = blankStartGear(ch.startGear || { skip: true });
  if ((ch.schema || 1) < 3) {
    ch.setting = ch.setting || "standard";
    ch.languages = ch.languages || [];
    ch.alignment = ch.alignment || "";
    ch.size = ch.size || "";
    ch.toolPicks = ch.toolPicks || {};
    ch.featChoices = ch.featChoices || {};
    const bgFeat = BACKGROUNDS[ch.background]?.feat;
    const extra = (ch.feats || []).filter((f) => f !== bgFeat);
    ch.featPicks = {};
    ch.legacyFeats = [];
    if (SPECIES[ch.speciesId]?.featSlot && extra.length && FEATS[extra[0]]?.category === "origin") ch.featPicks.versatile = extra.shift();
    ch.legacyFeats = extra;
    ch.feats = [];
    ch.schema = 3;
  }
  return ch;
}

/** An empty turn: nothing used yet, no movement spent. */
export const newTurn = (round = 1) => ({ round, action: null, bonus: null, reaction: null, item: null, moved: 0 });

/** Can this feat fill this slot? Listed options, or the slot's category, or (in Ravenloft) a Dark Gift. */
export function featAllowed(slot, id, ravenloft) {
  const f = FEATS[id];
  if (!f || (f.source === "ravenloft" && !ravenloft)) return false;
  if (slot.darkGift && f.category === "dark-gift") return true;
  return slot.options ? slot.options.includes(id) : f.category === slot.category;
}

export function compute(raw) {
  const ch = normalize(raw);
  const cls = CLASSES[ch.classId];
  const sp = SPECIES[ch.speciesId] || SPECIES.other;
  const size = sp.sizes.length === 1 ? sp.sizes[0] : sp.sizes.includes(ch.size) ? ch.size : "";
  const bg = BACKGROUNDS[ch.background] || null;
  const level = clamp(ch.level || 1, 1, cls.maxLevel);
  const pb = profBonus(level);
  const abilities = finalAbilities(ch);
  const mods = Object.fromEntries(ABILITIES.map((a) => [a, mod(abilities[a])]));
  const classChoices = Object.fromEntries(Object.entries(cls.choices || {}).map(([k, d]) => [k, ch.classChoices[k] || d.default]));
  const subclass = level >= (cls.subclassLevel || 99) && cls.subclasses?.[ch.subclass] ? cls.subclasses[ch.subclass] : null;
  const ctx = { level, pb, mods, abilities, choice: ch.speciesChoice || {}, classChoices, subclassId: subclass ? ch.subclass : "" };
  const training = [...new Set([...(cls.armorTraining || []), ...(cls.extraArmorTraining ? cls.extraArmorTraining(ctx) : []), ...(subclass?.armorTraining || [])])];
  // Choices at Ability Score Improvement levels (4 within levels 1–5): ASI or a feat (general, or Fighting Style if you have the feature).
  const asiLevels = (cls.asiLevels || []).filter((L) => L <= level);
  const levelFeats = asiLevels.filter((L) => ch.levelChoices?.[L]?.kind === "feat" && FEATS[ch.levelChoices[L].feat])
    .map((L) => ({ L, id: ch.levelChoices[L].feat, pick: ch.levelChoices[L] }));
  levelFeats.forEach((lf) => (FEATS[lf.id].training || []).forEach((x) => training.includes(x) || training.push(x)));

  const unarmored = cls.unarmored ? cls.unarmored(ctx) : subclass?.unarmored ? subclass.unarmored(ctx) : null;
  // Armor taken off for now (e.g. to use Mage Armor) counts as no armor until put back on.
  const armorId = ch.active?.armorOff ? "none" : ch.armor;
  let worn = armorClass({ armorId, shield: !!ch.shield, mods, unarmored, training, strScore: abilities.str });
  // Class option lists (Eldritch Invocations, Metamagic). Cantrip prerequisites look at the cantrips picked for the class and the Book of Shadows.
  const tomeOn = (ch.classOptions?.invocations || []).includes("pact-of-the-tome");
  const knownClassCantrips = [...(ch.spellPicks?.cantrips || []), ...(tomeOn ? ch.spellPicks?.tomeCantrips || [] : [])];
  // Weapon training: Simple weapons for everyone, more from the class (Martial, or some Martial kinds), the subclass and feats (Martial Weapon Training).
  const featMartial = levelFeats.some((lf) => FEATS[lf.id].weapons === "martial");
  const proficient = (w) => w.cat === "simple" || !!(cls.weaponProf && cls.weaponProf(w, ctx)) || !!subclass?.martialWeapons || featMartial;
  // Weapon Mastery: the class's kinds, plus one per Weapon Master feat (for any class, among weapons you're proficient with).
  const extraMastery = levelFeats.filter((lf) => lf.id === "weapon-master").length;
  const optCls = { ...cls, optionPicks: (c) => {
    const groups = cls.optionPicks ? cls.optionPicks(c) : [];
    if (!extraMastery) return groups;
    return groups.some((g) => g.key === "mastery") ? groups.map((g) => (g.key === "mastery" ? { ...g, count: g.count + extraMastery } : g)) : [...groups, masteryGroup(extraMastery, proficient)];
  } };
  const opts = classOptions(ch, optCls, ctx, knownClassCantrips);
  ctx.classOptions = opts.valid;
  ctx.armor = { wearing: worn.wearing, heavy: worn.heavy, shield: !!ch.shield };

  // Feats: the background's feat, one per species slot (Human Versatile), plus pre-0.4 extras until removed.
  // In Ravenloft any Origin feat may be swapped for a Dark Gift (with the DM's permission); Ravenloft content needs Ravenloft.
  const ravenloft = (ch.setting || "standard") === "ravenloft";
  const featSlots = [];
  if (bg && !bg.legacy) {
    const options = bg.feat ? [bg.feat] : bg.featOptions || [];
    const darkGift = ravenloft && (!!bg.feat || !!bg.darkGift);
    featSlots.push({ id: "bg", step: 2, label: bg.name, options, darkGift, default: bg.feat || null, recommended: bg.recommended || null,
      fixed: !darkGift && options.length === 1 ? options[0] : null });
  }
  if (sp.featSlot) featSlots.push({ ...sp.featSlot, step: 5, options: null, darkGift: ravenloft, default: null });
  // Lessons of the First Ones (Warlock invocation): one Origin feat each time.
  Object.values(opts.valid).flat().filter((x) => x.option?.originFeat).forEach((x, i) =>
    featSlots.push({ id: `lessons-${i}`, step: 5, category: "origin", label: x.option.name, options: null, darkGift: ravenloft, default: null }));
  // Fighting Style (Fighter 1, Paladin and Ranger 2): a Fighting Style feat, or the class's alternative (Blessed or Druidic Warrior).
  if (cls.fightingStyle && level >= cls.fightingStyle) featSlots.push({ id: "style", step: 5, category: "fighting-style", label: { pl: "Fighting Style (Styl walki)", en: "Fighting Style" },
    options: [...Object.keys(FEATS).filter((k) => FEATS[k].category === "fighting-style"), ...(cls.styleAlt ? [cls.styleAlt] : [])], darkGift: false, default: null });
  for (const sl of featSlots) {
    const raw = (ch.featPicks || {})[sl.id];
    sl.pick = raw || sl.default || "";
    sl.valid = !!sl.pick && featAllowed(sl, sl.pick, ravenloft);
  }
  const bgFeatId = featSlots.find((sl) => sl.id === "bg" && sl.valid)?.pick || null;
  const featInstances = [
    ...featSlots.filter((sl) => sl.valid).map((sl) => ({ id: sl.pick, source: sl.id })),
    ...(ch.legacyFeats || []).filter((id) => id !== bgFeatId && !Object.values(ch.featPicks || {}).includes(id)).map((id) => ({ id, source: "legacy" })),
  ].filter((f) => FEATS[f.id]);
  const featIds = [...new Set(featInstances.map((f) => f.id))];
  const feats = [
    ...featIds.map((id) => ({ id, ...FEATS[id], fromBackground: bgFeatId === id, choice: (ch.featChoices || {})[id] || {} })),
    ...asiLevels.filter((L) => ch.levelChoices?.[L]).map((L) => {
      const lc = ch.levelChoices[L];
      const id = lc.kind === "asi" ? "asi" : lc.feat;
      return FEATS[id] ? { id, ...FEATS[id], atLevel: L, pick: lc, inc: choiceIncreases(lc) } : null;
    }).filter(Boolean),
  ];
  const skilledCount = featInstances.filter((f) => f.id === "skilled").length * 3;

  // Hit points: full die at level 1, then a roll (or the fixed value) + CON per level, at least 1 each.
  const hpExtra = (sp.hpPerLevel || 0) + feats.reduce((s, f) => s + (f.hpPerLevel || 0), 0);
  const perLevel = [];
  for (let l = 2; l <= level; l++) {
    const die = ch.hpRolls[l] ?? fixedHp(cls.hitDie);
    perLevel.push({ level: l, die, rolled: ch.hpRolls[l] != null, gain: Math.max(1, die + mods.con) });
  }
  const hpComputed = cls.hitDie + mods.con + perLevel.reduce((s, p) => s + p.gain, 0) + hpExtra * level + (subclass?.hpBonus ? subclass.hpBonus(ctx) : 0);
  const hpMax = ch.hp.maxOverride || Math.max(1, hpComputed);

  // Species options (lineage, legacy, ancestry, spellcasting ability) shape speed, darkvision, resistances and species spells.
  const spt = speciesTraits(sp, ctx);
  ctx.unarmed = spt.unarmed; // e.g. Lupin claws: slashing Unarmed Strikes
  // Origin feats and Dark Gifts, with the player's sub-choices (spell ability, skills, Expertise, catalyst).
  const originFeats = featIds.map((id) => ({ id, ...FEATS[id], choice: (ch.featChoices || {})[id] || {} }));

  const initiative = mods.dex + feats.reduce((s, f) => s + (f.initiativeBonus ? f.initiativeBonus(ctx) : 0), 0) + (subclass?.initiativeBonus ? subclass.initiativeBonus(ctx) : 0);
  const baseSpeed = sp.custom ? ch.customSpecies?.speed || 30 : spt.speed;
  const armorDef = ARMOR[armorId];
  const slowArmor = armorDef?.str && abilities.str < armorDef.str ? 10 : 0;
  const featSpeed = levelFeats.reduce((n, lf) => n + (FEATS[lf.id].speed || 0), 0);
  const speed = baseSpeed + (cls.speedBonus ? cls.speedBonus(ctx) : 0) - slowArmor + featSpeed;
  const baseDark = sp.custom ? ch.customSpecies?.darkvision || 0 : spt.darkvision;
  // Gloom Stalker: Darkvision 60 ft, or 60 ft more if you already have it.
  const darkvision = Math.max(subclass?.darkvisionPlus ? baseDark + subclass.darkvisionPlus : baseDark, subclass?.darkvision || 0);

  // Skills from feats: Skill Expert gives a proficiency; Keen Mind and Observant give proficiency or, if you have it, Expertise.
  const featSkillGrants = levelFeats.filter((lf) => FEATS[lf.id].skillPick && lf.pick.skill).map((lf) => lf.pick.skill);
  const originGrants = originFeats.filter((f) => f.grants?.skill).map((f) => f.grants.skill); // Aberrant Anatomy: Perception
  const baseGranted = [...new Set([...grantedSkills({ cls, bg, subclass }), ...featSkillGrants, ...originGrants])];
  const featExpertise = [...levelFeats.filter((lf) => FEATS[lf.id].expertisePick && lf.pick.expertise).map((lf) => lf.pick.expertise),
    ...originFeats.filter((f) => f.grants?.expertise).map((f) => f.grants.expertise)];
  const loreGrants = [];
  for (const lf of levelFeats.filter((x) => FEATS[x.id].lore && x.pick.lore)) {
    if (baseGranted.includes(lf.pick.lore) || (ch.skills || []).includes(lf.pick.lore)) featExpertise.push(lf.pick.lore);
    else loreGrants.push(lf.pick.lore);
  }
  const granted = [...new Set([...baseGranted, ...loreGrants])];
  const featGranted = [...featSkillGrants, ...loreGrants, ...originGrants];
  // Echoing Soul: Expertise in one skill you're proficient in.
  for (const f of originFeats.filter((x) => x.expertisePick && x.choice.expertise)) {
    if (granted.includes(f.choice.expertise) || (ch.skills || []).includes(f.choice.expertise)) featExpertise.push(f.choice.expertise);
  }
  // Tools: fixed ones, plus "choose one kind" slots from background, class and feats.
  const toolPicks = ch.toolPicks || {};
  const toolSlots = [];
  if (bg?.tool && TOOL_GROUPS[bg.tool]) toolSlots.push({ id: "bg", step: 2, label: bg.name, count: 1, from: toolOptions([bg.tool]), required: true });
  if (cls.toolChoice) toolSlots.push({ id: "class", step: 1, label: cls.name, count: cls.toolChoice.count, from: toolOptions(cls.toolChoice.from), required: true });
  if (subclass?.toolChoice) toolSlots.push({ id: "subclass", step: 5, label: subclass.name, count: subclass.toolChoice.count, from: toolOptions(subclass.toolChoice.from), required: true });
  for (const f of feats) if (f.toolPicks) toolSlots.push({ id: "feat-" + f.id, step: 5, label: f.name, count: f.toolPicks.count, from: toolOptions(f.toolPicks.from), required: true });
  const skilledTools = (toolPicks.skilled || []).slice(0, skilledCount);
  if (skilledCount) toolSlots.push({ id: "skilled", step: 5, label: FEATS.skilled.name, count: skilledCount, from: ALL_TOOLS, required: false });
  for (const sl of toolSlots) sl.picked = (toolPicks[sl.id] || []).filter((x) => sl.from.includes(x));
  const fixedTools = [...(cls.toolsFixed || []), ...(subclass?.toolsFixed || []), ...(bg?.tool && TOOLS[bg.tool] ? [bg.tool] : []), ...levelFeats.flatMap((lf) => FEATS[lf.id].tools || [])];
  const toolIds = [...new Set([...fixedTools, ...toolSlots.flatMap((sl) => sl.picked)])];

  // Languages: Common, plus two standard ones, plus whatever the class adds.
  const clsLang = (typeof cls.languages === "function" ? cls.languages(level) : cls.languages) || {}; // Ranger: Deft Explorer at level 2
  const langAuto = ["common", ...(clsLang.auto || [])];
  const langSlots = [{ id: "origin", label: { pl: "Pochodzenie: 2 języki standardowe", en: "Origin: 2 standard languages" }, count: 2, from: STANDARD_PICKS }];
  if (clsLang.pick) langSlots.push({ ...clsLang.pick, from: clsLang.pick.from === "any" ? ANY_PICKS : clsLang.pick.from });
  for (const f of originFeats.filter((x) => x.language)) langSlots.push({ id: "feat-" + f.id, label: f.name, count: f.language, from: ANY_PICKS });
  const langChosen = (ch.languages || []).filter((x) => !langAuto.includes(x));
  const languages = { auto: langAuto, slots: langSlots, chosen: langChosen, total: langSlots.reduce((n, x) => n + x.count, 0),
    fit: fitSkills(langChosen, langSlots), known: [...langAuto, ...langChosen],
    typical: sp.language && !langAuto.includes(sp.language) ? sp.language : "" }; // a hint only (0.27)

  const featSkillSlots = originFeats.filter((f) => f.skillSlot).map((f) => ({ id: "feat-" + f.id, label: f.name, count: f.skillSlot.count, from: f.skillSlot.from }));
  const slots = skillSlots({ cls, subclass, sp, bg, skilledCount: Math.max(0, skilledCount - skilledTools.length), level, extra: featSkillSlots });
  const skillFit = fitSkills((ch.skills || []).filter((x) => !granted.includes(x)), slots);
  const saveProfs = [...cls.saves, ...levelFeats.filter((lf) => FEATS[lf.id].saveFromIncrease && lf.pick.inc).map((lf) => lf.pick.inc)];
  const saves = Object.fromEntries(ABILITIES.map((a) => [a, { prof: saveProfs.includes(a), value: mods[a] + (saveProfs.includes(a) ? pb : 0) }]));
  const skills = SKILLS.map((s) => {
    const isGranted = granted.includes(s.id);
    const fromBg = (bg?.skills || []).includes(s.id);
    const fromFeat = featGranted.includes(s.id) && !fromBg;
    const fromSub = isGranted && !fromBg && !fromFeat;
    const prof = isGranted || (ch.skills || []).includes(s.id);
    const expert = prof && ((ch.expertise || []).includes(s.id) || featExpertise.includes(s.id));
    const extra = (cls.skillBonus ? cls.skillBonus(ctx, s.id, prof) : 0) + (subclass?.skillBonus ? subclass.skillBonus(ctx, s.id, prof) : 0);
    return { ...s, prof, fromBg, fromSub, fromFeat, expert, value: mods[s.ab] + (expert ? pb * 2 : prof ? pb : 0) + extra };
  });
  const perception = skills.find((s) => s.id === "perception").value;

  const spellcasting = cls.spellcasting ? cls.spellcasting(level, ctx) : subclass?.spellcasting ? subclass.spellcasting(level, ctx) : null;
  const spells = spellcasting ? {
    ...spellcasting,
    dc: 8 + mods[spellcasting.ability] + pb, attack: mods[spellcasting.ability] + pb,
    always: [...(cls.alwaysSpells ? cls.alwaysSpells(level, ctx) : []), ...(subclass?.domainSpells ? subclass.domainSpells(level, ctx) : [])],
  } : null;
  // Invocation spells (cast without a slot) and the Book of Shadows (Pact of the Tome) count as Warlock spells.
  const extraSources = [];
  const invSpells = optionInnate(opts.valid.invocations || []);
  if (invSpells.length) extraSources.push({ id: "invocations", kind: "class-extra", label: { pl: "Inwokacje", en: "Invocations" }, ability: spellcasting?.ability || "cha",
    resPrefix: "inv-", fixed: invSpells.map((x) => ({ id: x.id, uses: x.uses, kind: "innate", self: !!x.self })), picks: [] });
  if ((opts.valid.invocations || []).some((x) => x.base === "pact-of-the-tome")) extraSources.push({ id: "tome", kind: "class-extra", label: { pl: "Księga Cieni (Pact of the Tome)", en: "Book of Shadows (Pact of the Tome)" },
    ability: spellcasting?.ability || "cha", resPrefix: null, fixed: [], picks: [
      { id: "tome:cantrips", store: "class", key: "tomeCantrips", label: { pl: "Sztuczki z księgi", en: "Book cantrips" }, count: 3, circles: [0], uses: "atwill" },
      { id: "tome:rituals", store: "class", key: "tomeRituals", label: { pl: "Rytuały z księgi", en: "Book rituals" }, count: 2, circles: [1], ritual: true, uses: "slotsOrRitual" },
    ] });
  const spellSrc = spellSources({ ch, ctx, cls, subclass, casting: spellcasting, sp, spt, originFeats, levelFeats, extra: extraSources });
  ctx.knownSpells = spellSrc.flatMap((s) => s.spells.map((x) => x.id));
  // Switched on during play: Mage Armor (13 + DEX without armor; the better formula wins) and Rage (Barbarian).
  const active = {
    mageArmor: !!ch.active?.mageArmor && ctx.knownSpells.includes("mage-armor"),
    rage: !!ch.active?.rage && cls.id === "barbarian",
    armorOff: !!ch.active?.armorOff && ch.armor !== "none",
  };
  // Wild Shape (Druid): the form switched on, if it's one of the known forms. Circle of the Moon: AC at least 13 + WIS.
  const forms = (opts.valid.forms || []).map((x) => x.base).filter((id) => BEASTS[id]);
  active.wildShape = cls.id === "druid" && forms.includes(ch.active?.wildShape) ? ch.active.wildShape : "";
  const wildShape = active.wildShape ? { beast: BEASTS[active.wildShape], ac: ch.subclass === "moon" && subclass ? Math.max(BEASTS[active.wildShape].ac, 13 + mods.wis) : BEASTS[active.wildShape].ac,
    tempHp: (ch.subclass === "moon" && subclass ? 3 : 1) * level } : null;
  if (active.mageArmor && !worn.wearing) {
    const ma = 13 + mods.dex;
    const base = unarmored && (unarmored.shieldOk || !ch.shield) ? unarmored.value : 10 + mods.dex;
    if (ma > base) worn = { ...worn, value: ma + worn.shieldAc,
      note: { pl: "Mage Armor 13 + ZRĘ" + (worn.shieldAc ? " + tarcza 2" : ""), en: "Mage Armor 13 + DEX" + (worn.shieldAc ? " + shield 2" : "") } };
  }
  // Fighting Style feats (class slot or taken at a level): Defense gives +1 AC in armor; the others shape weapon attacks.
  const styleIds = [...new Set([...featIds, ...levelFeats.map((lf) => lf.id)])].filter((id) => FEATS[id]?.category === "fighting-style");
  if (styleIds.includes("defense") && worn.wearing) worn = { ...worn, value: worn.value + 1, note: { pl: worn.note.pl + " + Obrona 1", en: worn.note.en + " + Defense 1" } };
  const attacks = weaponAttacks({ list: ch.weapons || [], mods, abilities, pb, proficient, styles: styleIds, mastered: (opts.valid.mastery || []).map((x) => x.base),
    monkDie: cls.id === "monk" ? (level < 5 ? "d6" : level < 11 ? "d8" : level < 17 ? "d10" : "d12") : "", rage: active.rage ? (level < 9 ? 2 : level < 16 ? 3 : 4) : 0 });
  const ac = ch.acOverride ? { value: ch.acOverride, note: { pl: "Wpisane ręcznie", en: "Set by hand" }, warnings: [] }
    : wildShape ? { ...worn, value: wildShape.ac, note: { pl: `Wild Shape: ${wildShape.beast.name.pl.split(" (")[0]}`, en: `Wild Shape: ${wildShape.beast.name.en}` } } : worn;
  const slotRes = spells ? spells.slots.map((n, i) => ({ id: "slot" + (i + 1), max: n, recharge: spells.pact ? "short" : "long", slot: i + 1, pact: !!spells.pact,
    name: spells.pact ? { pl: `Sloty paktu (${i + 1}. krąg)`, en: `Pact slots (level ${i + 1})` } : { pl: `Sloty ${i + 1}. kręgu`, en: `Level ${i + 1} slots` } })) : [];

  // Spells from feats (Dark Gifts): always prepared, cantrips at will, others once per long rest.
  const featMagic = originFeats.filter((f) => f.innate).map((f) => {
    const ability = f.spellAbility && ["int", "wis", "cha"].includes(f.choice.ability) ? f.choice.ability : "";
    const list = f.innate.map((x) => ({ ...x, at: 1, ...SPECIES_SPELLS[x.id], text: SPECIES_SPELLS[x.id].desc(ctx) }));
    return { id: f.id, label: f.name, needsAbility: !!f.spellAbility, ability, dc: ability ? 8 + mods[ability] + pb : null, attack: ability ? mods[ability] + pb : null, spells: list };
  });

  const resources = [
    ...(cls.resources ? cls.resources(ctx) : []),
    ...(subclass?.resources ? subclass.resources(ctx) : []),
    ...slotRes,
    ...(sp.resources ? sp.resources(ctx) : []),
    ...spellResources(spellSrc, pb),
    ...feats.filter((f) => f.resource).map((f) => f.resource(ctx)),
  ].filter((r) => r.max > 0).map((r) => ({ ...r, used: clamp((ch.used || {})[r.id] || 0, 0, r.max) }));

  const atLevel = (list) => (list || []).filter((f) => f.lv <= level && (!f.only || Object.entries(f.only).every(([k, v]) => ctx.choice[k] === v)))
    .map((f) => ({ ...f, text: f.desc(ctx) }));
  const customSubclass = level >= (cls.subclassLevel || 99) && ch.subclass === "custom" ? ch.subclassCustom || "" : "";

  const tools = toolIds.map((id) => TOOLS[id]);

  // Death saves: Reborn have Advantage, Touch of Death gives Disadvantage (both cancel out).
  const dsMods = [spt.deathSaves, ...originFeats.map((f) => f.deathSaves || "")].filter(Boolean);
  const deathSaves = dsMods.includes("adv") && dsMods.includes("dis") ? "" : dsMods[0] || "";
  const blindsight = Math.max(subclass?.blindsight || 0, ...originFeats.map((f) => f.senses?.blindsight || 0));
  const flaws = originFeats.filter((f) => f.flaw).map((f) => ({ id: f.id, name: f.name, save: f.flaw.save || "", text: f.flaw.text(ctx) }));
  // Content from The Horrors Within needs the Ravenloft game type.
  const ravenloftOnly = ravenloft ? [] : [
    ...(sp.source === "ravenloft" ? [{ step: 2, name: sp.name }] : []),
    ...(bg?.source === "ravenloft" ? [{ step: 2, name: bg.name }] : []),
    ...(cls.subclasses?.[ch.subclass]?.source === "ravenloft" && level >= cls.subclassLevel ? [{ step: 1, name: cls.subclasses[ch.subclass].name }] : []),
  ];

  const result = {
    asiLevels, levelProblems: Object.fromEntries(asiLevels.map((L) => [L, levelChoiceProblems(ch, L)])),
    setting: ch.setting || "standard", size, alignment: ch.alignment || "", languages, toolSlots, toolIds, fixedTools,
    featSlots, featInstances,
    granted, slots, skillFit, featIds, expertiseMax: cls.expertise ? cls.expertise(level) : 0, expertiseFrom: cls.expertiseFrom || null,
    cls, sp, bg, subclass, subclassId: ctx.subclassId, customSubclass, classChoices, spells, training, weaponProf: Object.values(WEAPONS).filter(proficient).map((w) => w.id), level, pb, abilities, mods, ac, initiative, speed, darkvision,
    hpMax, hpPerLevel: perLevel, hpExtra, saves, skills, tools,
    featMagic, spellSources: spellSrc, deathSaves, blindsight, flaws, climb: spt.climb, ravenloft, ravenloftOnly, originFeats, bgFeatId,
    speciesSpeed: spt.speed, creatureType: sp.type || "humanoid",
    resistances: active.rage ? [...new Set([...spt.resist, "bludgeoning", "piercing", "slashing"])] : spt.resist, active, saveAdvantage: spt.saveAdvantage, speciesMagic: spt.magic, speciesMissing: spt.missing,
    passivePerception: 10 + perception, resources,
    summary: [...(cls.summary ? cls.summary(ctx) : []), ...(subclass?.summary ? subclass.summary(ctx) : []), ...(sp.summary ? sp.summary(ctx) : [])],
    classOptions: opts.groups, knownClassCantrips, wildShape, forms, attacks, styleIds, initiativeAdv: !!subclass?.initiativeAdv,
    classFeatures: atLevel(cls.features),
    subclassFeatures: subclass ? atLevel(subclass.features) : [],
    speciesFeatures: atLevel(sp.features),
    feats,
    next: level < cls.maxLevel ? {
      level: level + 1, items: cls.nextLevel[level + 1], hitDie: cls.hitDie, fixed: fixedHp(cls.hitDie),
      conMod: mods.con, extra: hpExtra, hpGain: Math.max(1, fixedHp(cls.hitDie) + mods.con) + hpExtra,
    } : null,
  };
  result.startGear = startPlan(ch, result);
  result.review = review(ch, result);
  return result;
}

/**
 * A brand-new character with sensible defaults.
 * paper: a character copied from a paper sheet (all steps open, scores typed in, current equipment instead of starting gear).
 */
export function blankCharacter({ paper = false } = {}) {
  const cls = monk;
  if (paper) {
    const base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    return { ...blankCharacter(), entry: "paper", abilityMethod: paperMethod(base), abilityBase: base, abilities: { ...base }, startGear: blankStartGear({ skip: true }),
      items: [], gold: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } }; // the creator edits the current equipment right away
  }
  return {
    schema: 3, setting: "standard",
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
    name: "", player: "", gender: "", classId: cls.id, subclass: "", speciesId: "human", speciesChoice: {}, size: "",
    background: "", bgIncrease: { mode: "21", plus2: "", plus1: "" },
    level: 1, abilityMethod: "array", abilityBase: { ...cls.standardArray }, rolled: null,
    abilities: { ...cls.standardArray },
    languages: [], alignment: "", toolPicks: {}, featPicks: {}, featChoices: {}, legacyFeats: [], levelChoices: {},
    skills: [], expertise: [], feats: [],
    armor: "none", shield: false, startGear: blankStartGear(), classChoices: {}, spells: { cantrips: "", prepared: "" },
    hpRolls: {}, hp: { cur: null, temp: 0, maxOverride: null }, death: { ok: 0, fail: 0 }, used: {},
    notes: "", created: Date.now(), updated: Date.now(),
  };
}
