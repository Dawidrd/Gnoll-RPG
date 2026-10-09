// The rules engine: turns a stored character into everything the sheet shows.
import { ABILITIES, SKILLS, FEATS, mod, profBonus, averageHp, clamp } from "./core.js";
import { monk } from "./classes/monk.js";
import { SPECIES } from "./species.js";

export const CLASSES = { monk };

/** Classes listed in the creator but not built yet. */
export const PLANNED_CLASSES = {
  barbarian: { pl: "Barbarzyńca", en: "Barbarian" }, bard: { pl: "Bard", en: "Bard" },
  cleric: { pl: "Kleryk", en: "Cleric" }, druid: { pl: "Druid", en: "Druid" },
  fighter: { pl: "Wojownik", en: "Fighter" }, paladin: { pl: "Paladyn", en: "Paladin" },
  ranger: { pl: "Łowca", en: "Ranger" }, rogue: { pl: "Łotr", en: "Rogue" },
  sorcerer: { pl: "Zaklinacz", en: "Sorcerer" }, warlock: { pl: "Czarnoksiężnik", en: "Warlock" },
  wizard: { pl: "Czarodziej", en: "Wizard" },
};

export { SPECIES };

export function compute(ch) {
  const cls = CLASSES[ch.classId];
  const sp = SPECIES[ch.speciesId] || SPECIES.other;
  const level = clamp(ch.level || 1, 1, cls.maxLevel);
  const pb = profBonus(level);
  const mods = Object.fromEntries(ABILITIES.map((a) => [a, mod(ch.abilities[a])]));
  const ctx = { level, pb, mods, abilities: ch.abilities, choice: ch.speciesChoice || {} };
  const feats = (ch.feats || []).map((id) => FEATS[id]).filter(Boolean);

  const hpExtra = (sp.hpPerLevel || 0) + feats.reduce((s, f) => s + (f.hpPerLevel || 0), 0);
  const hpAverage = averageHp(cls.hitDie, level, mods.con, hpExtra);
  const hpMax = ch.hp.maxOverride || hpAverage;

  const acBase = cls.armorClass ? cls.armorClass(ctx) : { value: 10 + mods.dex, note: { pl: "10 + ZRĘ", en: "10 + DEX" } };
  const ac = ch.acOverride ? { value: ch.acOverride, note: { pl: "Wpisane ręcznie (zbroja, tarcza)", en: "Set by hand (armor, shield)" } } : acBase;

  const initiative = mods.dex + feats.reduce((s, f) => s + (f.initiativeBonus ? f.initiativeBonus(ctx) : 0), 0);
  const baseSpeed = sp.custom ? ch.customSpecies?.speed || 30 : sp.speed;
  const speed = baseSpeed + (cls.speedBonus && !ch.acOverride ? cls.speedBonus(ctx) : 0);
  const darkvision = sp.custom ? ch.customSpecies?.darkvision || 0 : sp.darkvision;

  const saves = Object.fromEntries(ABILITIES.map((a) => [a, { prof: cls.saves.includes(a), value: mods[a] + (cls.saves.includes(a) ? pb : 0) }]));
  const skills = SKILLS.map((s) => {
    const prof = (ch.skills || []).includes(s.id);
    const expert = (ch.expertise || []).includes(s.id);
    return { ...s, prof, expert, value: mods[s.ab] + (expert ? pb * 2 : prof ? pb : 0) };
  });
  const perception = skills.find((s) => s.id === "perception").value;

  const resources = [...(cls.resources ? cls.resources(ctx) : []), ...(sp.resources ? sp.resources(ctx) : [])]
    .filter((r) => r.max > 0)
    .map((r) => ({ ...r, used: clamp((ch.used || {})[r.id] || 0, 0, r.max) }));

  const atLevel = (list) => (list || []).filter((f) => f.lv <= level).map((f) => ({ ...f, text: f.desc(ctx) }));

  return {
    cls, sp, level, pb, mods, ac, initiative, speed, darkvision, hpMax, hpAverage, saves, skills,
    passivePerception: 10 + perception, resources,
    summary: [...(cls.summary ? cls.summary(ctx) : []), ...(sp.summary ? sp.summary(ctx) : [])],
    classFeatures: atLevel(cls.features),
    speciesFeatures: atLevel(sp.features),
    feats,
    next: level < cls.maxLevel ? { level: level + 1, items: cls.nextLevel[level + 1], hpGain: cls.hitDie / 2 + 1 + mods.con + hpExtra } : null,
  };
}

/** A brand-new character with sensible defaults. */
export function blankCharacter() {
  return {
    schema: 1,
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
    name: "", player: "", classId: "monk", subclass: "", speciesId: "human", speciesChoice: {}, customSpecies: null,
    level: 1, abilities: { str: 10, dex: 15, con: 13, int: 10, wis: 14, cha: 8 },
    skills: [], expertise: [], feats: [], featsOther: "", acOverride: null,
    hp: { cur: null, temp: 0, maxOverride: null }, death: { ok: 0, fail: 0 }, used: {},
    notes: "", created: Date.now(), updated: Date.now(),
  };
}
