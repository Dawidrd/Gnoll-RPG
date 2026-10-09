// Armor from the 2024 rules. AC = base + DEX (capped for medium, none for heavy); a shield adds +2.
export const ARMOR = {
  none: { type: "none", name: { pl: "Bez zbroi", en: "No armor" } },
  padded: { type: "light", base: 11, stealth: true, name: { pl: "Pikowana (lekka)", en: "Padded (light)" } },
  leather: { type: "light", base: 11, name: { pl: "Skórzana (lekka)", en: "Leather (light)" } },
  studded: { type: "light", base: 12, name: { pl: "Ćwiekowana (lekka)", en: "Studded leather (light)" } },
  hide: { type: "medium", base: 12, name: { pl: "Ze skór (średnia)", en: "Hide (medium)" } },
  "chain-shirt": { type: "medium", base: 13, name: { pl: "Koszulka kolcza (średnia)", en: "Chain shirt (medium)" } },
  scale: { type: "medium", base: 14, stealth: true, name: { pl: "Łuskowa (średnia)", en: "Scale mail (medium)" } },
  breastplate: { type: "medium", base: 14, name: { pl: "Napierśnik (średnia)", en: "Breastplate (medium)" } },
  "half-plate": { type: "medium", base: 15, stealth: true, name: { pl: "Półpłytowa (średnia)", en: "Half plate (medium)" } },
  ring: { type: "heavy", base: 14, stealth: true, name: { pl: "Pierścieniowa (ciężka)", en: "Ring mail (heavy)" } },
  "chain-mail": { type: "heavy", base: 16, str: 13, stealth: true, name: { pl: "Kolczuga (ciężka)", en: "Chain mail (heavy)" } },
  splint: { type: "heavy", base: 17, str: 15, stealth: true, name: { pl: "Paskowa (ciężka)", en: "Splint (heavy)" } },
  plate: { type: "heavy", base: 18, str: 15, stealth: true, name: { pl: "Płytowa (ciężka)", en: "Plate (heavy)" } },
};

/**
 * Armor class from what the character wears.
 * `unarmored` is the class's own formula when no armor is worn (Monk, Barbarian), or null.
 */
export function armorClass({ armorId, shield, mods, unarmored, training, strScore }) {
  const a = ARMOR[armorId] || ARMOR.none;
  const warnings = [];
  let value, note;
  if (a.type === "none") {
    if (unarmored && (unarmored.shieldOk || !shield)) { value = unarmored.value; note = unarmored.note; }
    else { value = 10 + mods.dex; note = { pl: "10 + ZRĘ", en: "10 + DEX" }; }
  } else {
    const dex = a.type === "light" ? mods.dex : a.type === "medium" ? Math.min(2, mods.dex) : 0;
    value = a.base + dex;
    note = a.type === "heavy" ? a.name : { pl: `${a.name.pl.split(" (")[0]} ${a.base}${a.type === "light" ? " + ZRĘ" : " + ZRĘ (maks. 2)"}`, en: `${a.name.en.split(" (")[0]} ${a.base}${a.type === "light" ? " + DEX" : " + DEX (max 2)"}` };
    if (!training.includes(a.type)) warnings.push({ pl: "Brak biegłości w tej zbroi: Utrudnienie na testy i ataki SIŁ/ZRĘ, bez czarów.", en: "Not trained in this armor: Disadvantage on STR/DEX tests and attacks, no spellcasting." });
    if (a.str && strScore < a.str) warnings.push({ pl: `Siła poniżej ${a.str}: prędkość −10 ft.`, en: `Strength below ${a.str}: speed −10 ft.` });
    if (a.stealth) warnings.push({ pl: "Utrudnienie na Skradanie.", en: "Disadvantage on Stealth." });
  }
  if (shield) {
    value += 2;
    note = { pl: note.pl + " + tarcza 2", en: note.en + " + shield 2" };
    if (!training.includes("shield")) warnings.push({ pl: "Brak biegłości w tarczy.", en: "Not trained with shields." });
  }
  return { value, note, warnings, type: a.type, heavy: a.type === "heavy", wearing: a.type !== "none" };
}
