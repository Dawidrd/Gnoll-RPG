// Core 5e math shared by every class and species.
// Rules text in this project is written in our own words. Each content entry carries
// a `source` tag ("srd52", "phb2024", "homebrew") so SRD-only builds stay possible later.

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_NAMES = {
  str: { pl: "Siła", en: "Strength", short: { pl: "SIŁ", en: "STR" } },
  dex: { pl: "Zręczność", en: "Dexterity", short: { pl: "ZRĘ", en: "DEX" } },
  con: { pl: "Kondycja", en: "Constitution", short: { pl: "KON", en: "CON" } },
  int: { pl: "Inteligencja", en: "Intelligence", short: { pl: "INT", en: "INT" } },
  wis: { pl: "Mądrość", en: "Wisdom", short: { pl: "MĄD", en: "WIS" } },
  cha: { pl: "Charyzma", en: "Charisma", short: { pl: "CHA", en: "CHA" } },
};

export const SKILLS = [
  { id: "acrobatics", ab: "dex", pl: "Akrobatyka", en: "Acrobatics" },
  { id: "animal", ab: "wis", pl: "Opieka nad zwierzętami", en: "Animal Handling" },
  { id: "arcana", ab: "int", pl: "Wiedza tajemna", en: "Arcana" },
  { id: "athletics", ab: "str", pl: "Atletyka", en: "Athletics" },
  { id: "deception", ab: "cha", pl: "Oszustwo", en: "Deception" },
  { id: "history", ab: "int", pl: "Historia", en: "History" },
  { id: "insight", ab: "wis", pl: "Wnikliwość", en: "Insight" },
  { id: "intimidation", ab: "cha", pl: "Zastraszanie", en: "Intimidation" },
  { id: "investigation", ab: "int", pl: "Śledztwo", en: "Investigation" },
  { id: "medicine", ab: "wis", pl: "Medycyna", en: "Medicine" },
  { id: "nature", ab: "int", pl: "Przyroda", en: "Nature" },
  { id: "perception", ab: "wis", pl: "Percepcja", en: "Perception" },
  { id: "performance", ab: "cha", pl: "Występy", en: "Performance" },
  { id: "persuasion", ab: "cha", pl: "Perswazja", en: "Persuasion" },
  { id: "religion", ab: "int", pl: "Religia", en: "Religion" },
  { id: "sleight", ab: "dex", pl: "Zręczne palce", en: "Sleight of Hand" },
  { id: "stealth", ab: "dex", pl: "Skradanie", en: "Stealth" },
  { id: "survival", ab: "wis", pl: "Przetrwanie", en: "Survival" },
];

export const mod = (score) => Math.floor((score - 10) / 2);
export const profBonus = (level) => Math.ceil(level / 4) + 1;
export const signed = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Average hit points: full die at level 1, then the rounded-up average per level. */
export function averageHp(hitDie, level, conMod, extraPerLevel = 0) {
  const first = hitDie + conMod;
  const per = hitDie / 2 + 1 + conMod;
  return Math.max(1, first + (level - 1) * per + extraPerLevel * level);
}

/** Origin feats we can compute effects for. Anything else is stored as free text. */
export const FEATS = {
  alert: {
    source: "srd52",
    name: { pl: "Alert (Czujność)", en: "Alert" },
    desc: {
      pl: "Dodajesz premię z biegłości do Inicjatywy. Po rzucie na Inicjatywę możesz zamienić się wynikiem z chętnym sojusznikiem.",
      en: "Add your proficiency bonus to Initiative. After rolling Initiative you can swap results with a willing ally.",
    },
    initiativeBonus: (ctx) => ctx.pb,
  },
  tough: {
    source: "phb2024",
    name: { pl: "Tough (Twardziel)", en: "Tough" },
    desc: {
      pl: "Maksymalne HP rośnie o 2 na każdy poziom postaci.",
      en: "Your hit point maximum increases by 2 for every character level.",
    },
    hpPerLevel: 2,
  },
};
