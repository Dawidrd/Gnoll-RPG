// Species from the 2024 rules (all of these are in SRD 5.2), plus a free-form homebrew option.
import { signed } from "./core.js";

const breathDice = (L) => (L < 5 ? 1 : L < 11 ? 2 : L < 17 ? 3 : 4) + "d10";

export const ANCESTRIES = {
  black: { pl: "Czarny (kwas)", en: "Black (acid)", dmg: "acid" },
  blue: { pl: "Niebieski (błyskawice)", en: "Blue (lightning)", dmg: "lightning" },
  brass: { pl: "Mosiężny (ogień)", en: "Brass (fire)", dmg: "fire" },
  bronze: { pl: "Brązowy (błyskawice)", en: "Bronze (lightning)", dmg: "lightning" },
  copper: { pl: "Miedziany (kwas)", en: "Copper (acid)", dmg: "acid" },
  gold: { pl: "Złoty (ogień)", en: "Gold (fire)", dmg: "fire" },
  green: { pl: "Zielony (trucizna)", en: "Green (poison)", dmg: "poison" },
  red: { pl: "Czerwony (ogień)", en: "Red (fire)", dmg: "fire" },
  silver: { pl: "Srebrny (zimno)", en: "Silver (cold)", dmg: "cold" },
  white: { pl: "Biały (zimno)", en: "White (cold)", dmg: "cold" },
};
const DMG = {
  acid: { pl: "kwas", en: "acid" }, lightning: { pl: "błyskawice", en: "lightning" }, fire: { pl: "ogień", en: "fire" },
  poison: { pl: "trucizna", en: "poison" }, cold: { pl: "zimno", en: "cold" },
};

export const SPECIES = {
  dragonborn: {
    source: "srd52", name: { pl: "Smokowiec (Dragonborn)", en: "Dragonborn" }, speed: 30, darkvision: 60,
    choice: { key: "ancestry", label: { pl: "Smoczy przodek", en: "Draconic ancestry" }, options: ANCESTRIES, default: "gold" },
    resources: (c) => [
      { id: "breath", max: c.pb, recharge: "long", name: { pl: "Zionięcie (Breath Weapon)", en: "Breath Weapon" } },
      { id: "flight", max: c.level >= 5 ? 1 : 0, recharge: "long", name: { pl: "Draconic Flight", en: "Draconic Flight" } },
    ],
    summary: (c) => {
      const d = DMG[ANCESTRIES[c.choice.ancestry || "gold"].dmg];
      return [{ label: { pl: "Zionięcie", en: "Breath Weapon" }, value: `${breathDice(c.level)}, DC ${8 + c.mods.con + c.pb}`,
        note: { pl: `${d.pl}; stożek 15 ft albo linia 30 ft; ${c.pb}× na długi odpoczynek`, en: `${d.en}; 15-ft cone or 30-ft line; ${c.pb}× per long rest` } }];
    },
    features: [
      { lv: 1, id: "breath", name: { pl: "Zionięcie (Breath Weapon)", en: "Breath Weapon" },
        desc: (c) => ({
          pl: `Zamiast jednego ataku z akcji Attack ziejesz: stożek 15 ft albo linia 30 ft. Wrogowie rzucają ZRĘ przeciw DC ${8 + c.mods.con + c.pb}: porażka = ${breathDice(c.level)}, sukces = połowa. ${c.pb}× na długi odpoczynek.`,
          en: `In place of one attack of the Attack action you exhale a 15-ft cone or 30-ft line. Targets make a DEX save against DC ${8 + c.mods.con + c.pb}: ${breathDice(c.level)} on a fail, half on a success. ${c.pb}× per long rest.`,
        }) },
      { lv: 1, id: "resist", name: { pl: "Odporność smoczego przodka", en: "Damage Resistance" },
        desc: (c) => { const d = DMG[ANCESTRIES[c.choice.ancestry || "gold"].dmg]; return { pl: `Odporność na obrażenia: ${d.pl}.`, en: `Resistance to ${d.en} damage.` }; } },
      { lv: 1, id: "darkvision", name: { pl: "Darkvision (Widzenie w ciemności)", en: "Darkvision" },
        desc: () => ({ pl: "60 ft.", en: "60 ft." }) },
      { lv: 5, id: "flight", name: { pl: "Draconic Flight (Smoczy lot)", en: "Draconic Flight" },
        desc: () => ({ pl: "Akcja bonusowa: widmowe skrzydła na 10 minut, latasz z pełną prędkością. Raz na długi odpoczynek.",
          en: "Bonus action: spectral wings for 10 minutes, fly speed equal to your speed. Once per long rest." }) },
    ],
  },
  human: {
    source: "srd52", name: { pl: "Człowiek (Human)", en: "Human" }, speed: 30, darkvision: 0,
    resources: () => [{ id: "inspiration", max: 1, recharge: "long", name: { pl: "Heroic Inspiration", en: "Heroic Inspiration" } }],
    features: [
      { lv: 1, id: "resourceful", name: { pl: "Resourceful (Zaradność)", en: "Resourceful" },
        desc: () => ({ pl: "Po każdym długim odpoczynku dostajesz Heroic Inspiration: raz przerzucasz dowolną kość k20.", en: "You gain Heroic Inspiration after every long rest: reroll any one d20." }) },
      { lv: 1, id: "skillful", name: { pl: "Skillful (Wszechstronność)", en: "Skillful" },
        desc: () => ({ pl: "Biegłość w jednej dodatkowej umiejętności.", en: "Proficiency in one extra skill." }) },
      { lv: 1, id: "versatile", name: { pl: "Versatile", en: "Versatile" },
        desc: () => ({ pl: "Dodatkowy feat pochodzenia (np. Alert lub Tough).", en: "An extra origin feat (for example Alert or Tough)." }) },
    ],
  },
  dwarf: {
    source: "srd52", name: { pl: "Krasnolud (Dwarf)", en: "Dwarf" }, speed: 30, darkvision: 120, hpPerLevel: 1,
    resources: (c) => [{ id: "stonecunning", max: c.pb, recharge: "long", name: { pl: "Stonecunning", en: "Stonecunning" } }],
    features: [
      { lv: 1, id: "darkvision", name: { pl: "Darkvision (Widzenie w ciemności)", en: "Darkvision" }, desc: () => ({ pl: "120 ft.", en: "120 ft." }) },
      { lv: 1, id: "resilience", name: { pl: "Dwarven Resilience", en: "Dwarven Resilience" },
        desc: () => ({ pl: "Odporność na truciznę i Przewaga na rzuty przeciw zatruciu.", en: "Resistance to poison damage and Advantage on saves against being poisoned." }) },
      { lv: 1, id: "toughness", name: { pl: "Dwarven Toughness", en: "Dwarven Toughness" },
        desc: (c) => ({ pl: `+1 HP na poziom (teraz +${c.level}). Już wliczone w maksymalne HP.`, en: `+1 HP per level (now +${c.level}). Already included in your maximum HP.` }) },
      { lv: 1, id: "stonecunning", name: { pl: "Stonecunning", en: "Stonecunning" },
        desc: () => ({ pl: "Akcja bonusowa: Tremorsense 60 ft na 10 minut, gdy stoisz na kamieniu.", en: "Bonus action: Tremorsense 60 ft for 10 minutes while on stone." }) },
    ],
  },
  elf: {
    source: "srd52", name: { pl: "Elf", en: "Elf" }, speed: 30, darkvision: 60,
    features: [
      { lv: 1, id: "darkvision", name: { pl: "Darkvision (Widzenie w ciemności)", en: "Darkvision" }, desc: () => ({ pl: "60 ft.", en: "60 ft." }) },
      { lv: 1, id: "fey", name: { pl: "Fey Ancestry", en: "Fey Ancestry" },
        desc: () => ({ pl: "Przewaga na rzuty przeciw zauroczeniu.", en: "Advantage on saves against being charmed." }) },
      { lv: 1, id: "senses", name: { pl: "Keen Senses", en: "Keen Senses" },
        desc: () => ({ pl: "Biegłość w Insight, Perception albo Survival.", en: "Proficiency in Insight, Perception or Survival." }) },
      { lv: 1, id: "trance", name: { pl: "Trance", en: "Trance" },
        desc: () => ({ pl: "Długi odpoczynek zajmuje 4 godziny medytacji, bez snu.", en: "A long rest takes 4 hours of meditation instead of sleep." }) },
    ],
  },
  halfling: {
    source: "srd52", name: { pl: "Niziołek (Halfling)", en: "Halfling" }, speed: 30, darkvision: 0,
    features: [
      { lv: 1, id: "brave", name: { pl: "Brave", en: "Brave" }, desc: () => ({ pl: "Przewaga na rzuty przeciw strachowi.", en: "Advantage on saves against being frightened." }) },
      { lv: 1, id: "nimble", name: { pl: "Halfling Nimbleness", en: "Halfling Nimbleness" },
        desc: () => ({ pl: "Możesz przechodzić przez pole większej istoty.", en: "You can move through the space of any larger creature." }) },
      { lv: 1, id: "luck", name: { pl: "Luck", en: "Luck" }, desc: () => ({ pl: "Wyrzucone 1 na k20 przerzucasz.", en: "Reroll a natural 1 on a d20." }) },
      { lv: 1, id: "stealthy", name: { pl: "Naturally Stealthy", en: "Naturally Stealthy" },
        desc: () => ({ pl: "Możesz się ukryć za istotą co najmniej o rozmiar większą.", en: "You can hide behind a creature at least one size larger." }) },
    ],
  },
  orc: {
    source: "srd52", name: { pl: "Ork (Orc)", en: "Orc" }, speed: 30, darkvision: 120,
    resources: (c) => [
      { id: "adrenaline", max: c.pb, recharge: "short", name: { pl: "Adrenaline Rush", en: "Adrenaline Rush" } },
      { id: "endurance", max: 1, recharge: "long", name: { pl: "Relentless Endurance", en: "Relentless Endurance" } },
    ],
    features: [
      { lv: 1, id: "darkvision", name: { pl: "Darkvision (Widzenie w ciemności)", en: "Darkvision" }, desc: () => ({ pl: "120 ft.", en: "120 ft." }) },
      { lv: 1, id: "adrenaline", name: { pl: "Adrenaline Rush", en: "Adrenaline Rush" },
        desc: (c) => ({ pl: `Dash jako akcja bonusowa i ${c.pb} tymczasowych HP.`, en: `Dash as a bonus action and gain ${c.pb} temporary HP.` }) },
      { lv: 1, id: "endurance", name: { pl: "Relentless Endurance", en: "Relentless Endurance" },
        desc: () => ({ pl: "Raz na długi odpoczynek zamiast spaść do 0 HP zostajesz z 1 HP.", en: "Once per long rest, drop to 1 HP instead of 0." }) },
    ],
  },
  tiefling: {
    source: "srd52", name: { pl: "Tiefling", en: "Tiefling" }, speed: 30, darkvision: 60,
    features: [
      { lv: 1, id: "darkvision", name: { pl: "Darkvision (Widzenie w ciemności)", en: "Darkvision" }, desc: () => ({ pl: "60 ft.", en: "60 ft." }) },
      { lv: 1, id: "legacy", name: { pl: "Fiendish Legacy", en: "Fiendish Legacy" },
        desc: () => ({ pl: "Odporność zależna od dziedzictwa (trucizna, nekrotyczne albo ogień) i sztuczka; czary dochodzą na 3. i 5. poziomie.", en: "Resistance based on your legacy (poison, necrotic or fire) and a cantrip; more spells at levels 3 and 5." }) },
      { lv: 1, id: "presence", name: { pl: "Otherworldly Presence", en: "Otherworldly Presence" },
        desc: () => ({ pl: "Znasz sztuczkę Thaumaturgy.", en: "You know the Thaumaturgy cantrip." }) },
    ],
  },
  other: {
    source: "homebrew", name: { pl: "Inna (własna)", en: "Other (custom)" }, speed: 30, darkvision: 0, custom: true, features: [],
  },
};
