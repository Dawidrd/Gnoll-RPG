// The rules engine: turns a stored character into everything the sheet shows.
import { ABILITIES, SKILLS, FEATS, mod, profBonus, clamp } from "./core.js";
import { monk } from "./classes/monk.js";
import { barbarian } from "./classes/barbarian.js";
import { rogue } from "./classes/rogue.js";
import { cleric } from "./classes/cleric.js";
import { ARMOR, armorClass } from "./armor.js";
import { SPECIES } from "./species.js";
import { BACKGROUNDS, TOOLS, backgroundBonus } from "./backgrounds.js";

export const CLASSES = { barbarian, cleric, monk, rogue };

/** Classes listed in the creator but not built yet. */
export const PLANNED_CLASSES = {
  bard: { pl: "Bard", en: "Bard" }, druid: { pl: "Druid", en: "Druid" },
  fighter: { pl: "Wojownik", en: "Fighter" }, paladin: { pl: "Paladyn", en: "Paladin" },
  ranger: { pl: "Łowca", en: "Ranger" },
  sorcerer: { pl: "Zaklinacz", en: "Sorcerer" }, warlock: { pl: "Czarnoksiężnik", en: "Warlock" },
  wizard: { pl: "Czarodziej", en: "Wizard" },
};

export { SPECIES, BACKGROUNDS, TOOLS, ARMOR };

/** Fixed hit points per level after the first (the 2024 "fixed value"). */
export const fixedHp = (hitDie) => hitDie / 2 + 1;

/** Final ability scores: base + background increases, capped at 20 (manual scores are taken as they are). */
export function finalAbilities(ch) {
  const base = ch.abilityBase || ch.abilities;
  const bonus = ch.abilityMethod === "manual" && !ch.background ? {} : backgroundBonus(ch);
  return Object.fromEntries(ABILITIES.map((a) => [a, Math.min(base[a] + (bonus[a] || 0), Math.max(20, base[a]))]));
}

/** Older saves (v0.1) stored only final scores; treat them as manual entries. */
export function normalize(ch) {
  if (!ch.abilityMethod) { ch.abilityMethod = "manual"; ch.abilityBase = { ...ch.abilities }; }
  if (!("background" in ch)) ch.background = "";
  if (!ch.bgIncrease) ch.bgIncrease = { mode: "21", plus2: "", plus1: "" };
  if (!ch.hpRolls) ch.hpRolls = {};
  if (!ch.tools) ch.tools = "";
  if (!ch.armor) ch.armor = "none";
  if (ch.shield == null) ch.shield = false;
  if (!ch.classChoices) ch.classChoices = {};
  if (!ch.spells) ch.spells = { cantrips: "", prepared: "" };
  if (!ch.expertise) ch.expertise = [];
  return ch;
}

export function compute(raw) {
  const ch = normalize(raw);
  const cls = CLASSES[ch.classId];
  const sp = SPECIES[ch.speciesId] || SPECIES.other;
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

  const featIds = [...new Set([...(bg?.feat ? [bg.feat] : []), ...(ch.feats || [])])];
  const feats = featIds.map((id) => ({ id, ...FEATS[id], fromBackground: bg?.feat === id })).filter((f) => f.name);

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

  const bgSkills = bg?.skills || [];
  const saves = Object.fromEntries(ABILITIES.map((a) => [a, { prof: cls.saves.includes(a), value: mods[a] + (cls.saves.includes(a) ? pb : 0) }]));
  const skills = SKILLS.map((s) => {
    const fromBg = bgSkills.includes(s.id);
    const prof = fromBg || (ch.skills || []).includes(s.id);
    const expert = prof && (ch.expertise || []).includes(s.id);
    const extra = cls.skillBonus ? cls.skillBonus(ctx, s.id) : 0;
    return { ...s, prof, fromBg, expert, value: mods[s.ab] + (expert ? pb * 2 : prof ? pb : 0) + extra };
  });
  const perception = skills.find((s) => s.id === "perception").value;

  const subclass = level >= (cls.subclassLevel || 99) && cls.subclasses?.[ch.subclass] ? cls.subclasses[ch.subclass] : null;
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

  const tools = [cls.classTools || null, bg?.tool ? TOOLS[bg.tool] : null, ch.tools || null].filter(Boolean);

  return {
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
}

/** A brand-new character with sensible defaults. */
export function blankCharacter() {
  const cls = monk;
  return {
    schema: 2,
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
    name: "", player: "", classId: cls.id, subclass: "", speciesId: "human", speciesChoice: {}, customSpecies: null,
    background: "", bgIncrease: { mode: "21", plus2: "", plus1: "", three: [] }, tools: "",
    level: 1, abilityMethod: "array", abilityBase: { ...cls.standardArray }, rolled: null,
    abilities: { ...cls.standardArray },
    skills: [], expertise: [], feats: [], featsOther: "", acOverride: null,
    armor: "none", shield: false, classChoices: {}, subclassCustom: "", spells: { cantrips: "", prepared: "" },
    hpRolls: {}, hp: { cur: null, temp: 0, maxOverride: null }, death: { ok: 0, fail: 0 }, used: {},
    notes: "", created: Date.now(), updated: Date.now(),
  };
}
