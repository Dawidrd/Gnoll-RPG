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

/** Origin feats from the 2024 rules. Descriptions are our own short summaries. */
const mi = (list, pl, en) => ({
  source: "phb2024",
  name: { pl: `Magic Initiate (${pl})`, en: `Magic Initiate (${en})` },
  desc: {
    pl: `Znasz 2 sztuczki i 1 czar 1. poziomu z listy: ${pl}. Czar rzucasz raz na długi odpoczynek bez slotu albo ze slotów, jeśli je masz. Wpisz wybrane czary w polu „Inne featy”.`,
    en: `You know 2 cantrips and one 1st-level spell from the ${en} list. Cast that spell once per long rest without a slot, or with slots if you have them. Note your picks under “Other feats”.`,
  },
  list,
});

export const FEATS = {
  alert: {
    source: "srd52", name: { pl: "Alert (Czujność)", en: "Alert" },
    desc: { pl: "Dodajesz premię z biegłości do Inicjatywy. Po rzucie na Inicjatywę możesz zamienić się wynikiem z chętnym sojusznikiem.",
      en: "Add your proficiency bonus to Initiative. After rolling Initiative you can swap results with a willing ally." },
    initiativeBonus: (ctx) => ctx.pb,
  },
  crafter: {
    source: "phb2024", name: { pl: "Crafter (Rzemieślnik)", en: "Crafter" },
    desc: { pl: "Biegłość w 3 rodzajach narzędzi rzemieślniczych, 20% zniżki na niemagiczne przedmioty i szybkie wytwarzanie prostych rzeczy.",
      en: "Proficiency with 3 kinds of Artisan's Tools, a 20% discount on nonmagical items and quick crafting of simple gear." },
  },
  healer: {
    source: "phb2024", name: { pl: "Healer (Uzdrowiciel)", en: "Healer" },
    desc: { pl: "Z zestawem medyka możesz pozwolić komuś wydać kość wytrzymałości na leczenie. Przy leczeniu przerzucasz wyrzucone 1.",
      en: "With a Healer's Kit you can let someone spend a Hit Point Die to heal. You reroll 1s on healing dice." },
  },
  lucky: {
    source: "phb2024", name: { pl: "Lucky (Szczęściarz)", en: "Lucky" },
    desc: { pl: "Punkty szczęścia równe premii z biegłości, odnawiane po długim odpoczynku. Punkt daje Ci Przewagę na k20 albo nakłada Utrudnienie na atak w Ciebie.",
      en: "Luck Points equal to your proficiency bonus, regained on a long rest. Spend one for Advantage on a d20, or to impose Disadvantage on an attack against you." },
    resource: (ctx) => ({ id: "luck", max: ctx.pb, recharge: "long", name: { pl: "Punkty szczęścia (Lucky)", en: "Luck Points" } }),
  },
  "magic-initiate-cleric": mi("cleric", "Kleryk", "Cleric"),
  "magic-initiate-druid": mi("druid", "Druid", "Druid"),
  "magic-initiate-wizard": mi("wizard", "Czarodziej", "Wizard"),
  musician: {
    source: "phb2024", name: { pl: "Musician (Muzyk)", en: "Musician" },
    desc: { pl: "Biegłość w 3 instrumentach. Po odpoczynku możesz zagrać i dać Heroic Inspiration tylu sojusznikom, ile wynosi premia z biegłości.",
      en: "Proficiency with 3 instruments. After a rest you can play and give Heroic Inspiration to allies equal to your proficiency bonus." },
  },
  "savage-attacker": {
    source: "srd52", name: { pl: "Savage Attacker (Dziki napastnik)", en: "Savage Attacker" },
    desc: { pl: "Raz na turę, trafiając bronią, rzucasz jej kośćmi obrażeń dwa razy i wybierasz lepszy wynik.",
      en: "Once per turn when you hit with a weapon, roll its damage dice twice and use either result." },
  },
  skilled: {
    source: "srd52", name: { pl: "Skilled (Wszechstronny)", en: "Skilled" },
    desc: { pl: "Biegłość w 3 dowolnych umiejętnościach lub narzędziach. Zaznacz je w umiejętnościach.",
      en: "Proficiency in any 3 skills or tools. Tick them in your skills." },
  },
  "tavern-brawler": {
    source: "phb2024", name: { pl: "Tavern Brawler (Karczemny zabijaka)", en: "Tavern Brawler" },
    desc: { pl: "Cios bez broni zadaje 1k4 + SIŁ, przerzucasz 1 na obrażeniach, władasz bronią improwizowaną, a raz na turę po trafieniu ciosem możesz odepchnąć wroga o 5 ft.",
      en: "Unarmed strikes deal 1d4 + STR, you reroll 1s on their damage, you're proficient with improvised weapons, and once per turn after a hit you can push the target 5 ft." },
  },
  tough: {
    source: "phb2024", name: { pl: "Tough (Twardziel)", en: "Tough" },
    desc: { pl: "Maksymalne HP rośnie o 2 na każdy poziom postaci. Już wliczone.",
      en: "Your hit point maximum increases by 2 for every character level. Already included." },
    hpPerLevel: 2,
  },
};

/** Fair dice. */
export function rollDie(sides) {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  return (a[0] % sides) + 1;
}

/** 4d6, drop the lowest. Returns { total, dice: [sorted high to low], dropped }. */
export function roll4d6() {
  const d = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((x, y) => y - x);
  return { total: d[0] + d[1] + d[2], dice: d.slice(0, 3), dropped: d[3] };
}

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
