// Backgrounds from the 2024 rules: three abilities to raise, an origin feat, two skills, one tool.
// Acolyte, Criminal, Sage and Soldier are also in SRD 5.2; the rest come from the 2024 Player's Handbook.

// Tool ids and groups live in tools.js. A group name ("artisan", "gaming", "instrument") means "choose one kind".
export { TOOLS } from "./tools.js";

const bg = (pl, en, abilities, feat, skills, tool, source = "phb2024") => ({ name: { pl: `${pl} (${en})`, en }, abilities, feat, skills, tool, source });

export const BACKGROUNDS = {
  acolyte: bg("Akolita", "Acolyte", ["int", "wis", "cha"], "magic-initiate-cleric", ["insight", "religion"], "calligrapher", "srd52"),
  artisan: bg("Rzemieślnik", "Artisan", ["str", "dex", "int"], "crafter", ["investigation", "persuasion"], "artisan"),
  charlatan: bg("Szarlatan", "Charlatan", ["dex", "con", "cha"], "skilled", ["deception", "sleight"], "forgery"),
  criminal: bg("Przestępca", "Criminal", ["dex", "con", "int"], "alert", ["sleight", "stealth"], "thieves", "srd52"),
  entertainer: bg("Artysta", "Entertainer", ["str", "dex", "cha"], "musician", ["acrobatics", "performance"], "instrument"),
  farmer: bg("Rolnik", "Farmer", ["str", "con", "wis"], "tough", ["animal", "nature"], "carpenter"),
  guard: bg("Strażnik", "Guard", ["str", "int", "wis"], "alert", ["athletics", "perception"], "gaming"),
  guide: bg("Przewodnik", "Guide", ["dex", "con", "wis"], "magic-initiate-druid", ["stealth", "survival"], "cartographer"),
  hermit: bg("Pustelnik", "Hermit", ["con", "wis", "cha"], "healer", ["medicine", "religion"], "herbalism"),
  merchant: bg("Kupiec", "Merchant", ["con", "int", "cha"], "lucky", ["animal", "persuasion"], "navigator"),
  noble: bg("Szlachcic", "Noble", ["str", "int", "cha"], "skilled", ["history", "persuasion"], "gaming"),
  sage: bg("Mędrzec", "Sage", ["con", "int", "wis"], "magic-initiate-wizard", ["arcana", "history"], "calligrapher", "srd52"),
  sailor: bg("Żeglarz", "Sailor", ["str", "dex", "wis"], "tavern-brawler", ["acrobatics", "perception"], "navigator"),
  scribe: bg("Skryba", "Scribe", ["dex", "int", "wis"], "skilled", ["investigation", "perception"], "calligrapher"),
  soldier: bg("Żołnierz", "Soldier", ["str", "dex", "con"], "savage-attacker", ["athletics", "intimidation"], "gaming", "srd52"),
  wayfarer: bg("Wędrowiec", "Wayfarer", ["dex", "wis", "cha"], "lucky", ["insight", "stealth"], "thieves"),
  // Kept only so characters made before 0.4 still load; not offered in the creator.
  custom: { name: { pl: "Własne tło (stara wersja)", en: "Custom background (old version)" }, abilities: ["str", "dex", "con", "int", "wis", "cha"], feat: null, skills: [], tool: null, source: "homebrew", custom: true, legacy: true },
};

/** Background increases: "21" = +2 to one and +1 to another; "111" = +1 to all three. Never above 20. */
export function backgroundBonus(ch) {
  const b = BACKGROUNDS[ch.background];
  const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  if (!b) return out;
  const inc = ch.bgIncrease || {};
  if (inc.mode === "111") (b.custom ? inc.three || [] : b.abilities).forEach((a) => (out[a] = 1));
  else { if (inc.plus2) out[inc.plus2] += 2; if (inc.plus1 && inc.plus1 !== inc.plus2) out[inc.plus1] += 1; }
  return out;
}
