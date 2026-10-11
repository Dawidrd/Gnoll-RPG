// The rules engine: turns a stored character into everything the sheet shows.
import { ABILITIES, SKILLS, FEATS, mod, profBonus, clamp } from "./core.js";
import { monk } from "./classes/monk.js";
import { barbarian } from "./classes/barbarian.js";
import { rogue } from "./classes/rogue.js";
import { cleric } from "./classes/cleric.js";
import { ARMOR, armorClass } from "./armor.js";
import { grantedSkills, skillSlots, fitSkills } from "./skills.js";
import { SPECIES } from "./species.js";
import { BACKGROUNDS, backgroundBonus } from "./backgrounds.js";
import { TOOLS, TOOL_GROUPS, toolOptions, ALL_TOOLS } from "./tools.js";
import { LANGUAGES, STANDARD_PICKS, ANY_PICKS, ALIGNMENTS, SIZES } from "./identity.js";
import { review } from "./checks.js";

export const CLASSES = { barbarian, cleric, monk, rogue };

/** Classes listed in the creator but not built yet. */
export const PLANNED_CLASSES = {
  bard: { pl: "Bard", en: "Bard" }, druid: { pl: "Druid", en: "Druid" },
  fighter: { pl: "Wojownik", en: "Fighter" }, paladin: { pl: "Paladyn", en: "Paladin" },
  ranger: { pl: "Łowca", en: "Ranger" },
  sorcerer: { pl: "Zaklinacz", en: "Sorcerer" }, warlock: { pl: "Czarnoksiężnik", en: "Warlock" },
  wizard: { pl: "Czarodziej", en: "Wizard" },
};

export { SPECIES, BACKGROUNDS, TOOLS, TOOL_GROUPS, ARMOR, LANGUAGES, ALIGNMENTS, SIZES };

/** Game types: the standard rules, or Ravenloft (adds The Horrors Within options). */
export const SETTINGS = {
  standard: { pl: "Standardowa (Podręcznik Gracza)", en: "Standard (Player's Handbook)" },
  ravenloft: { pl: "Ravenloft (The Horrors Within)", en: "Ravenloft (The Horrors Within)" },
};

/** Fixed hit points per level after the first (the 2024 "fixed value"). */
export const fixedHp = (hitDie) => hitDie / 2 + 1;

/** Final ability scores: base + background increases, capped at 20 (manual scores are taken as they are). */
export function finalAbilities(ch) {
  const base = ch.abilityBase || ch.abilities;
  const bonus = ch.abilityMethod === "manual" && !ch.background ? {} : backgroundBonus(ch);
  return Object.fromEntries(ABILITIES.map((a) => [a, Math.min(base[a] + (bonus[a] || 0), Math.max(20, base[a]))]));
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
  const ctx = { level, pb, mods, abilities, choice: ch.speciesChoice || {}, classChoices };
  const training = [...(cls.armorTraining || []), ...(cls.extraArmorTraining ? cls.extraArmorTraining(ctx) : [])];
  const worn = armorClass({ armorId: ch.armor, shield: !!ch.shield, mods, unarmored: cls.unarmored ? cls.unarmored(ctx) : null, training, strScore: abilities.str });
  ctx.armor = { wearing: worn.wearing, heavy: worn.heavy, shield: !!ch.shield };

  // Feats: one from the background, one per feat slot (e.g. human Versatile), plus pre-0.4 extras until removed.
  const featSlots = [...(sp.featSlot ? [sp.featSlot] : [])];
  const featInstances = [
    ...(bg?.feat ? [{ id: bg.feat, source: "bg" }] : []),
    ...featSlots.filter((sl) => (ch.featPicks || {})[sl.id]).map((sl) => ({ id: ch.featPicks[sl.id], source: sl.id })),
    ...(ch.legacyFeats || []).filter((id) => id !== bg?.feat && !Object.values(ch.featPicks || {}).includes(id)).map((id) => ({ id, source: "legacy" })),
  ].filter((f) => FEATS[f.id]);
  const featIds = [...new Set(featInstances.map((f) => f.id))];
  const feats = featIds.map((id) => ({ id, ...FEATS[id], fromBackground: bg?.feat === id, choice: (ch.featChoices || {})[id] || {} }));
  const skilledCount = featInstances.filter((f) => f.id === "skilled").length * 3;

  // Hit points: full die at level 1, then a roll (or the fixed value) + CON per level, at least 1 each.
  const hpExtra = (sp.hpPerLevel || 0) + feats.reduce((s, f) => s + (f.hpPerLevel || 0), 0);
  const perLevel = [];
  for (let l = 2; l <= level; l++) {
    const die = ch.hpRolls[l] ?? fixedHp(cls.hitDie);
    perLevel.push({ level: l, die, rolled: ch.hpRolls[l] != null, gain: Math.max(1, die + mods.con) });
  }
  const hpComputed = cls.hitDie + mods.con + perLevel.reduce((s, p) => s + p.gain, 0) + hpExtra * level;
  const hpMax = ch.hp.maxOverride || Math.max(1, hpComputed);

  const ac = ch.acOverride ? { value: ch.acOverride, note: { pl: "Wpisane ręcznie", en: "Set by hand" }, warnings: [] } : worn;

  const initiative = mods.dex + feats.reduce((s, f) => s + (f.initiativeBonus ? f.initiativeBonus(ctx) : 0), 0);
  const baseSpeed = sp.custom ? ch.customSpecies?.speed || 30 : sp.speed;
  const armorDef = ARMOR[ch.armor];
  const slowArmor = armorDef?.str && abilities.str < armorDef.str ? 10 : 0;
  const speed = baseSpeed + (cls.speedBonus ? cls.speedBonus(ctx) : 0) - slowArmor;
  const darkvision = sp.custom ? ch.customSpecies?.darkvision || 0 : sp.darkvision;

  const subclass = level >= (cls.subclassLevel || 99) && cls.subclasses?.[ch.subclass] ? cls.subclasses[ch.subclass] : null;
  const granted = grantedSkills({ cls, bg, subclass });
  // Tools: fixed ones, plus "choose one kind" slots from background, class and feats.
  const toolPicks = ch.toolPicks || {};
  const toolSlots = [];
  if (bg?.tool && TOOL_GROUPS[bg.tool]) toolSlots.push({ id: "bg", step: 2, label: bg.name, count: 1, from: toolOptions([bg.tool]), required: true });
  if (cls.toolChoice) toolSlots.push({ id: "class", step: 1, label: cls.name, count: cls.toolChoice.count, from: toolOptions(cls.toolChoice.from), required: true });
  for (const f of feats) if (f.toolPicks) toolSlots.push({ id: "feat-" + f.id, step: 5, label: f.name, count: f.toolPicks.count, from: toolOptions(f.toolPicks.from), required: true });
  const skilledTools = (toolPicks.skilled || []).slice(0, skilledCount);
  if (skilledCount) toolSlots.push({ id: "skilled", step: 5, label: FEATS.skilled.name, count: skilledCount, from: ALL_TOOLS, required: false });
  for (const sl of toolSlots) sl.picked = (toolPicks[sl.id] || []).filter((x) => sl.from.includes(x));
  const fixedTools = [...(cls.toolsFixed || []), ...(bg?.tool && TOOLS[bg.tool] ? [bg.tool] : [])];
  const toolIds = [...new Set([...fixedTools, ...toolSlots.flatMap((sl) => sl.picked)])];

  // Languages: Common, plus two standard ones, plus whatever the class adds.
  const langAuto = ["common", ...(cls.languages?.auto || [])];
  const langSlots = [{ id: "origin", label: { pl: "Pochodzenie: 2 języki standardowe", en: "Origin: 2 standard languages" }, count: 2, from: STANDARD_PICKS }];
  if (cls.languages?.pick) langSlots.push({ ...cls.languages.pick, from: cls.languages.pick.from === "any" ? ANY_PICKS : cls.languages.pick.from });
  const langChosen = (ch.languages || []).filter((x) => !langAuto.includes(x));
  const languages = { auto: langAuto, slots: langSlots, chosen: langChosen, total: langSlots.reduce((n, x) => n + x.count, 0),
    fit: fitSkills(langChosen, langSlots), known: [...langAuto, ...langChosen] };

  const slots = skillSlots({ cls, sp, bg, skilledCount: Math.max(0, skilledCount - skilledTools.length), level });
  const skillFit = fitSkills((ch.skills || []).filter((x) => !granted.includes(x)), slots);
  const saves = Object.fromEntries(ABILITIES.map((a) => [a, { prof: cls.saves.includes(a), value: mods[a] + (cls.saves.includes(a) ? pb : 0) }]));
  const skills = SKILLS.map((s) => {
    const isGranted = granted.includes(s.id);
    const fromBg = (bg?.skills || []).includes(s.id);
    const fromSub = isGranted && !fromBg;
    const prof = isGranted || (ch.skills || []).includes(s.id);
    const expert = prof && (ch.expertise || []).includes(s.id);
    const extra = cls.skillBonus ? cls.skillBonus(ctx, s.id) : 0;
    return { ...s, prof, fromBg, fromSub, expert, value: mods[s.ab] + (expert ? pb * 2 : prof ? pb : 0) + extra };
  });
  const perception = skills.find((s) => s.id === "perception").value;

  const spellcasting = cls.spellcasting ? cls.spellcasting(level, ctx) : subclass?.spellcasting ? subclass.spellcasting(level, ctx) : null;
  const spells = spellcasting ? {
    ...spellcasting,
    dc: 8 + mods[spellcasting.ability] + pb, attack: mods[spellcasting.ability] + pb,
    always: subclass?.domainSpells ? subclass.domainSpells(level) : [],
  } : null;
  const slotRes = spells ? spells.slots.map((n, i) => ({ id: "slot" + (i + 1), max: n, recharge: "long", slot: i + 1,
    name: { pl: `Sloty ${i + 1}. kręgu`, en: `Level ${i + 1} slots` } })) : [];

  const resources = [
    ...(cls.resources ? cls.resources(ctx) : []),
    ...(subclass?.resources ? subclass.resources(ctx) : []),
    ...slotRes,
    ...(sp.resources ? sp.resources(ctx) : []),
    ...feats.filter((f) => f.resource).map((f) => f.resource(ctx)),
  ].filter((r) => r.max > 0).map((r) => ({ ...r, used: clamp((ch.used || {})[r.id] || 0, 0, r.max) }));

  const atLevel = (list) => (list || []).filter((f) => f.lv <= level).map((f) => ({ ...f, text: f.desc(ctx) }));
  const customSubclass = level >= (cls.subclassLevel || 99) && ch.subclass === "custom" ? ch.subclassCustom || "" : "";

  const tools = toolIds.map((id) => TOOLS[id]);

  const result = {
    setting: ch.setting || "standard", size, alignment: ch.alignment || "", languages, toolSlots, toolIds, fixedTools,
    featSlots, featInstances,
    granted, slots, skillFit, featIds, expertiseMax: cls.expertise ? cls.expertise(level) : 0,
    cls, sp, bg, subclass, customSubclass, classChoices, spells, training, level, pb, abilities, mods, ac, initiative, speed, darkvision,
    hpMax, hpPerLevel: perLevel, hpExtra, saves, skills, tools,
    passivePerception: 10 + perception, resources,
    summary: [...(cls.summary ? cls.summary(ctx) : []), ...(sp.summary ? sp.summary(ctx) : [])],
    classFeatures: atLevel(cls.features),
    subclassFeatures: subclass ? atLevel(subclass.features) : [],
    speciesFeatures: atLevel(sp.features),
    feats,
    next: level < cls.maxLevel ? {
      level: level + 1, items: cls.nextLevel[level + 1], hitDie: cls.hitDie, fixed: fixedHp(cls.hitDie),
      conMod: mods.con, extra: hpExtra, hpGain: Math.max(1, fixedHp(cls.hitDie) + mods.con) + hpExtra,
    } : null,
  };
  result.review = review(ch, result);
  return result;
}

/** A brand-new character with sensible defaults. */
export function blankCharacter() {
  const cls = monk;
  return {
    schema: 3, setting: "standard",
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
    name: "", player: "", classId: cls.id, subclass: "", speciesId: "human", speciesChoice: {}, size: "",
    background: "", bgIncrease: { mode: "21", plus2: "", plus1: "" },
    level: 1, abilityMethod: "array", abilityBase: { ...cls.standardArray }, rolled: null,
    abilities: { ...cls.standardArray },
    languages: [], alignment: "", toolPicks: {}, featPicks: {}, featChoices: {}, legacyFeats: [],
    skills: [], expertise: [], feats: [],
    armor: "none", shield: false, classChoices: {}, spells: { cantrips: "", prepared: "" },
    hpRolls: {}, hp: { cur: null, temp: 0, maxOverride: null }, death: { ok: 0, fail: 0 }, used: {},
    notes: "", created: Date.now(), updated: Date.now(),
  };
}
