// The ten species of the 2024 Player's Handbook (chapter 4), with lineages, legacies and species spells.
// Descriptions are written in our own words. `other` only keeps pre-0.4 custom species loadable.
import { ABILITY_NAMES } from "./core.js";
import { SPELLS } from "./spells.js";
import { DAMAGE_NAMES } from "./damage.js";

const L = (pl, en) => ({ pl, en });
const breathDice = (lv) => (lv < 5 ? 1 : lv < 11 ? 2 : lv < 17 ? 3 : 4) + "d10";

export { DAMAGE_NAMES };

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

/** Spellcasting ability for species spells: Elf, Gnome and Tiefling pick one of these. */
export const SPELL_ABILITIES = { int: ABILITY_NAMES.int, wis: ABILITY_NAMES.wis, cha: ABILITY_NAMES.cha };
const abilityChoice = { key: "ability", label: L("Cecha czarowania (czary z gatunku)", "Spellcasting ability (species spells)"), options: SPELL_ABILITIES };

// Spells that species and feats grant come from the shared spell database (js/rules/spells.js).
export const SPECIES_SPELLS = SPELLS;

// uses: "atwill" (cantrip), "long" (once free per Long Rest, also with your slots), "pb" (Proficiency Bonus times per Long Rest)
const spell = (id, at = 1, uses = at === 1 && SPECIES_SPELLS[id].circle === 0 ? "atwill" : "long") => ({ id, at, uses });

export const ELF_LINEAGES = {
  drow: { ...L("Drow", "Drow"), darkvision: 120, spells: [spell("dancing-lights"), spell("faerie-fire", 3), spell("darkness", 5)],
    text: L("Darkvision 120 ft i sztuczka Dancing Lights; Faerie Fire od 3. poziomu, Darkness od 5.", "Darkvision 120 ft and the Dancing Lights cantrip; Faerie Fire from level 3, Darkness from level 5.") },
  high: { ...L("Wysoki elf (High Elf)", "High Elf"), spells: [spell("prestidigitation"), spell("detect-magic", 3), spell("misty-step", 5)],
    text: L("Sztuczka Prestidigitation; po długim odpoczynku możesz ją zamienić na inną sztuczkę z listy Czarodzieja. Detect Magic od 3. poziomu, Misty Step od 5.", "The Prestidigitation cantrip; after a Long Rest you may swap it for another Wizard cantrip. Detect Magic from level 3, Misty Step from level 5.") },
  wood: { ...L("Leśny elf (Wood Elf)", "Wood Elf"), speed: 35, spells: [spell("druidcraft"), spell("longstrider", 3), spell("pass-without-trace", 5)],
    text: L("Szybkość 35 ft i sztuczka Druidcraft; Longstrider od 3. poziomu, Pass without Trace od 5.", "Speed 35 ft and the Druidcraft cantrip; Longstrider from level 3, Pass without Trace from level 5.") },
};

export const GNOME_LINEAGES = {
  forest: { ...L("Gnom leśny (Forest Gnome)", "Forest Gnome"), spells: [spell("minor-illusion"), spell("speak-with-animals", 1, "pb")],
    text: L("Sztuczka Minor Illusion; Speak with Animals zawsze przygotowane, bez slotu tyle razy, ile wynosi PB.", "The Minor Illusion cantrip; Speak with Animals always prepared, cast without a slot a number of times equal to your PB.") },
  rock: { ...L("Gnom skalny (Rock Gnome)", "Rock Gnome"), spells: [spell("mending"), spell("prestidigitation")],
    text: L("Sztuczki Mending i Prestidigitation; potrafisz budować drobne mechanizmy (patrz niżej).", "The Mending and Prestidigitation cantrips; you can build tiny clockwork devices (see below).") },
};

export const FIENDISH_LEGACIES = {
  abyssal: { ...L("Otchłanne (Abyssal)", "Abyssal"), resist: "poison", spells: [spell("poison-spray"), spell("ray-of-sickness", 3), spell("hold-person", 5)],
    text: L("Odporność na truciznę i sztuczka Poison Spray; Ray of Sickness od 3. poziomu, Hold Person od 5.", "Poison resistance and the Poison Spray cantrip; Ray of Sickness from level 3, Hold Person from level 5.") },
  chthonic: { ...L("Chtoniczne (Chthonic)", "Chthonic"), resist: "necrotic", spells: [spell("chill-touch"), spell("false-life", 3), spell("ray-of-enfeeblement", 5)],
    text: L("Odporność na obrażenia nekrotyczne i sztuczka Chill Touch; False Life od 3. poziomu, Ray of Enfeeblement od 5.", "Necrotic resistance and the Chill Touch cantrip; False Life from level 3, Ray of Enfeeblement from level 5.") },
  infernal: { ...L("Piekielne (Infernal)", "Infernal"), resist: "fire", spells: [spell("fire-bolt"), spell("hellish-rebuke", 3), spell("darkness", 5)],
    text: L("Odporność na ogień i sztuczka Fire Bolt; Hellish Rebuke od 3. poziomu, Darkness od 5.", "Fire resistance and the Fire Bolt cantrip; Hellish Rebuke from level 3, Darkness from level 5.") },
};

export const GIANT_ANCESTRIES = {
  cloud: { ...L("Chmurny olbrzym: Cloud's Jaunt", "Cloud Giant: Cloud's Jaunt"),
    text: L("Akcja bonusowa: teleportujesz się do 30 ft w widoczne wolne miejsce.", "Bonus Action: teleport up to 30 ft to an unoccupied space you can see.") },
  fire: { ...L("Ognisty olbrzym: Fire's Burn", "Fire Giant: Fire's Burn"),
    text: L("Gdy trafisz atakiem i zadasz obrażenia: +1d10 obrażeń od ognia.", "When you hit with an attack roll and deal damage: +1d10 fire damage.") },
  frost: { ...L("Mroźny olbrzym: Frost's Chill", "Frost Giant: Frost's Chill"),
    text: L("Gdy trafisz atakiem i zadasz obrażenia: +1d6 od zimna, a cel ma −10 ft szybkości do początku Twojej następnej tury.", "When you hit with an attack roll and deal damage: +1d6 cold damage and the target's Speed drops by 10 ft until the start of your next turn.") },
  hill: { ...L("Wzgórzowy olbrzym: Hill's Tumble", "Hill Giant: Hill's Tumble"),
    text: L("Gdy trafisz atakiem istotę Large lub mniejszą i zadasz obrażenia: przewracasz ją (Prone).", "When you hit a Large or smaller creature with an attack roll and deal damage: knock it Prone.") },
  stone: { ...L("Kamienny olbrzym: Stone's Endurance", "Stone Giant: Stone's Endurance"),
    text: (c) => L(`Reakcja, gdy dostajesz obrażenia: zmniejszasz je o 1d12 + KON (${c.mods.con >= 0 ? "+" : ""}${c.mods.con}).`, `Reaction when you take damage: reduce it by 1d12 + CON (${c.mods.con >= 0 ? "+" : ""}${c.mods.con}).`) },
  storm: { ...L("Burzowy olbrzym: Storm's Thunder", "Storm Giant: Storm's Thunder"),
    text: L("Reakcja, gdy istota w zasięgu 60 ft zada Ci obrażenia: zadajesz jej 1d8 od grzmotu.", "Reaction when a creature within 60 ft damages you: deal 1d8 thunder damage to it.") },
};

const pickOf = (sp, c, key) => sp.choices?.find((x) => x.key === key)?.options[c.choice?.[key]] || null;
const darkvisionFeature = (ft) => ({ lv: 1, id: "darkvision", name: L("Darkvision (Widzenie w ciemności)", "Darkvision"), desc: () => L(`${ft} ft.`, `${ft} ft.`) });
const textOf = (x, c) => (typeof x === "function" ? x(c) : x);

export const SPECIES = {
  aasimar: {
    source: "phb2024", name: L("Aasimar", "Aasimar"), speed: 30, darkvision: 60, sizes: ["medium", "small"], type: "humanoid",
    spellAbility: "cha",
    resist: () => ["necrotic", "radiant"],
    spells: () => [spell("light")],
    resources: (c) => [
      { id: "healing-hands", max: 1, recharge: "long", name: L("Healing Hands (Uzdrawiające dłonie)", "Healing Hands") },
      { id: "revelation", max: c.level >= 3 ? 1 : 0, recharge: "long", name: L("Celestial Revelation (Niebiańskie objawienie)", "Celestial Revelation") },
    ],
    summary: (c) => [
      { label: L("Healing Hands", "Healing Hands"), value: `${c.pb}d4 HP`, note: L("akcja Magic, dotyk; raz na długi odpoczynek", "Magic action, touch; once per long rest") },
      ...(c.level >= 3 ? [{ label: L("Celestial Revelation", "Celestial Revelation"), value: `+${c.pb}`,
        note: L("akcja bonusowa, 1 minuta: raz na turę +PB obrażeń; raz na długi odpoczynek", "Bonus Action, 1 minute: once per turn +PB damage; once per long rest") }] : []),
    ],
    features: [
      { lv: 1, id: "resist", name: L("Celestial Resistance (Niebiańska odporność)", "Celestial Resistance"),
        desc: () => L("Odporność na obrażenia nekrotyczne i promieniste.", "Resistance to Necrotic and Radiant damage.") },
      darkvisionFeature(60),
      { lv: 1, id: "healing-hands", name: L("Healing Hands (Uzdrawiające dłonie)", "Healing Hands"),
        desc: (c) => L(`Akcja Magic: dotykasz istoty, która odzyskuje ${c.pb}d4 HP (tyle k4, ile wynosi PB). Raz na długi odpoczynek.`, `Magic action: touch a creature, it regains ${c.pb}d4 HP (d4s equal to your PB). Once per long rest.`) },
      { lv: 1, id: "light-bearer", name: L("Light Bearer (Niosący światło)", "Light Bearer"),
        desc: () => L("Znasz sztuczkę Light (cecha czarowania: CHA).", "You know the Light cantrip (Charisma is your spellcasting ability for it).") },
      { lv: 3, id: "revelation", name: L("Celestial Revelation (Niebiańskie objawienie)", "Celestial Revelation"),
        desc: (c) => L(`Akcja bonusowa: przemiana na 1 minutę, raz na długi odpoczynek. Raz na każdą swoją turę zadajesz jednemu celowi +${c.pb} obrażeń (atakiem lub czarem). Wybierasz przy każdej przemianie: Heavenly Wings — latasz z prędkością równą szybkości (+${c.pb} promieniste); Inner Radiance — świecisz 10 ft i na końcu każdej tury zadajesz ${c.pb} promienistych istotom w promieniu 10 ft; Necrotic Shroud — wrogowie w promieniu 10 ft rzucają CHA przeciw DC ${8 + c.mods.cha + c.pb} albo są Frightened do końca Twojej następnej tury (+${c.pb} nekrotyczne).`,
          `Bonus Action: transform for 1 minute, once per long rest. Once on each of your turns deal +${c.pb} damage to one target (attack or spell). Choose each time: Heavenly Wings — fly speed equal to your Speed (+${c.pb} radiant); Inner Radiance — shed light 10 ft and deal ${c.pb} radiant to each creature within 10 ft at the end of each of your turns; Necrotic Shroud — creatures other than allies within 10 ft make a CHA save against DC ${8 + c.mods.cha + c.pb} or are Frightened until the end of your next turn (+${c.pb} necrotic).`) },
    ],
  },
  dragonborn: {
    source: "srd52", name: L("Smokowiec (Dragonborn)", "Dragonborn"), speed: 30, darkvision: 60, sizes: ["medium"], type: "humanoid",
    choices: [{ key: "ancestry", label: L("Smoczy przodek", "Draconic ancestry"), options: ANCESTRIES }],
    resist: (c) => (ANCESTRIES[c.choice.ancestry] ? [ANCESTRIES[c.choice.ancestry].dmg] : []),
    resources: (c) => [
      { id: "breath", max: c.pb, recharge: "long", name: L("Zionięcie (Breath Weapon)", "Breath Weapon") },
      { id: "flight", max: c.level >= 5 ? 1 : 0, recharge: "long", name: L("Draconic Flight", "Draconic Flight") },
    ],
    summary: (c) => {
      const a = ANCESTRIES[c.choice.ancestry];
      const d = a ? DAMAGE_NAMES[a.dmg] : L("?", "?");
      return [{ label: L("Zionięcie", "Breath Weapon"), value: `${breathDice(c.level)}, DC ${8 + c.mods.con + c.pb}`,
        note: L(`${d.pl}; stożek 15 ft albo linia 30 ft; ${c.pb}× na długi odpoczynek`, `${d.en}; 15-ft cone or 30-ft line; ${c.pb}× per long rest`) }];
    },
    features: [
      { lv: 1, id: "breath", name: L("Zionięcie (Breath Weapon)", "Breath Weapon"),
        desc: (c) => L(`Zamiast jednego ataku z akcji Attack ziejesz: stożek 15 ft albo linia 30 ft. Wrogowie rzucają ZRĘ przeciw DC ${8 + c.mods.con + c.pb}: porażka = ${breathDice(c.level)}, sukces = połowa. ${c.pb}× na długi odpoczynek.`,
          `In place of one attack of the Attack action you exhale a 15-ft cone or 30-ft line. Targets make a DEX save against DC ${8 + c.mods.con + c.pb}: ${breathDice(c.level)} on a fail, half on a success. ${c.pb}× per long rest.`) },
      { lv: 1, id: "resist", name: L("Odporność smoczego przodka", "Damage Resistance"),
        desc: (c) => { const a = ANCESTRIES[c.choice.ancestry]; return a ? L(`Odporność na obrażenia: ${DAMAGE_NAMES[a.dmg].pl}.`, `Resistance to ${DAMAGE_NAMES[a.dmg].en} damage.`) : L("Odporność zależna od smoczego przodka (wybierz go w kreatorze).", "Resistance set by your draconic ancestry (pick it in the creator)."); } },
      darkvisionFeature(60),
      { lv: 5, id: "flight", name: L("Draconic Flight (Smoczy lot)", "Draconic Flight"),
        desc: () => L("Akcja bonusowa: widmowe skrzydła na 10 minut, latasz z pełną prędkością. Raz na długi odpoczynek.", "Bonus action: spectral wings for 10 minutes, fly speed equal to your speed. Once per long rest.") },
    ],
  },
  dwarf: {
    source: "srd52", name: L("Krasnolud (Dwarf)", "Dwarf"), speed: 30, darkvision: 120, sizes: ["medium"], type: "humanoid", hpPerLevel: 1,
    resist: () => ["poison"],
    resources: (c) => [{ id: "stonecunning", max: c.pb, recharge: "long", name: L("Stonecunning", "Stonecunning") }],
    features: [
      darkvisionFeature(120),
      { lv: 1, id: "resilience", name: L("Dwarven Resilience", "Dwarven Resilience"),
        desc: () => L("Odporność na truciznę i Przewaga na rzuty przeciw zatruciu (Poisoned).", "Resistance to poison damage and Advantage on saves to avoid or end being Poisoned.") },
      { lv: 1, id: "toughness", name: L("Dwarven Toughness", "Dwarven Toughness"),
        desc: (c) => L(`+1 HP na poziom (teraz +${c.level}). Już wliczone w maksymalne HP.`, `+1 HP per level (now +${c.level}). Already included in your maximum HP.`) },
      { lv: 1, id: "stonecunning", name: L("Stonecunning", "Stonecunning"),
        desc: (c) => L(`Akcja bonusowa: Tremorsense 60 ft na 10 minut, gdy stoisz na kamieniu lub go dotykasz. ${c.pb}× na długi odpoczynek.`, `Bonus action: Tremorsense 60 ft for 10 minutes while on or touching stone. ${c.pb}× per long rest.`) },
    ],
  },
  elf: {
    source: "srd52", name: L("Elf", "Elf"), speed: 30, darkvision: 60, sizes: ["medium"], type: "humanoid",
    choices: [{ key: "lineage", label: L("Linia elfów", "Elven lineage"), options: ELF_LINEAGES }, abilityChoice],
    spellAbility: "choose",
    speedFor: (c) => ELF_LINEAGES[c.choice.lineage]?.speed || 30,
    darkvisionFor: (c) => ELF_LINEAGES[c.choice.lineage]?.darkvision || 60,
    spells: (c) => ELF_LINEAGES[c.choice.lineage]?.spells || [],
    skillChoice: { id: "species", label: L("Elf: Keen Senses", "Elf: Keen Senses"), count: 1, from: ["insight", "perception", "survival"] },
    features: [
      { lv: 1, id: "darkvision", name: L("Darkvision (Widzenie w ciemności)", "Darkvision"),
        desc: (c) => L(`${c.choice.lineage === "drow" ? 120 : 60} ft.`, `${c.choice.lineage === "drow" ? 120 : 60} ft.`) },
      { lv: 1, id: "lineage", name: L("Elven Lineage (Linia elfów)", "Elven Lineage"),
        desc: (c) => { const l = ELF_LINEAGES[c.choice.lineage]; return l ? L(`${l.pl}: ${l.text.pl} Czary z poziomów 3 i 5 masz zawsze przygotowane; raz na długi odpoczynek rzucasz każdy bez slotu.`, `${l.en}: ${l.text.en} Level 3 and 5 spells are always prepared; cast each once per long rest without a slot.`) : L("Wybierz linię: Drow, Wysoki elf albo Leśny elf.", "Pick a lineage: Drow, High Elf or Wood Elf."); } },
      { lv: 1, id: "fey", name: L("Fey Ancestry", "Fey Ancestry"),
        desc: () => L("Przewaga na rzuty, by uniknąć lub zakończyć zauroczenie (Charmed).", "Advantage on saves to avoid or end being Charmed.") },
      { lv: 1, id: "senses", name: L("Keen Senses", "Keen Senses"),
        desc: () => L("Biegłość w Insight, Perception albo Survival.", "Proficiency in Insight, Perception or Survival.") },
      { lv: 1, id: "trance", name: L("Trance", "Trance"),
        desc: () => L("Nie śpisz, magia nie może Cię uśpić. Długi odpoczynek zajmuje 4 godziny medytacji.", "You don't sleep and magic can't put you to sleep. A Long Rest takes 4 hours of meditation.") },
    ],
  },
  gnome: {
    source: "phb2024", name: L("Gnom (Gnome)", "Gnome"), speed: 30, darkvision: 60, sizes: ["small"], type: "humanoid",
    choices: [{ key: "lineage", label: L("Linia gnomów", "Gnomish lineage"), options: GNOME_LINEAGES }, abilityChoice],
    spellAbility: "choose",
    spells: (c) => GNOME_LINEAGES[c.choice.lineage]?.spells || [],
    saveAdvantage: ["int", "wis", "cha"],
    features: [
      darkvisionFeature(60),
      { lv: 1, id: "cunning", name: L("Gnomish Cunning (Gnomi spryt)", "Gnomish Cunning"),
        desc: () => L("Przewaga na rzuty obronne INT, MĄD i CHA.", "Advantage on Intelligence, Wisdom and Charisma saving throws.") },
      { lv: 1, id: "lineage", name: L("Gnomish Lineage (Linia gnomów)", "Gnomish Lineage"),
        desc: (c) => { const l = GNOME_LINEAGES[c.choice.lineage]; return l ? L(`${l.pl}: ${l.text.pl}`, `${l.en}: ${l.text.en}`) : L("Wybierz linię: leśny albo skalny gnom.", "Pick a lineage: Forest or Rock Gnome."); } },
      { lv: 1, id: "clockwork", name: L("Mechanizmy (Rock Gnome)", "Clockwork Devices (Rock Gnome)"), only: { lineage: "rock" },
        desc: () => L("10 minut rzucania Prestidigitation tworzy drobny mechanizm (AC 5, 1 HP), np. zabawkę, krzesiwo albo pozytywkę. Wybierasz mu jeden efekt Prestidigitation; ktoś aktywuje go dotykiem jako akcja bonusowa. Najwyżej 3 naraz; każdy rozpada się po 8 godzinach.",
          "Casting Prestidigitation for 10 minutes builds a Tiny device (AC 5, 1 HP), such as a toy, fire starter or music box. Pick one Prestidigitation effect for it; anyone activates it with a touch as a Bonus Action. Up to 3 at a time; each falls apart after 8 hours.") },
    ],
  },
  goliath: {
    source: "phb2024", name: L("Goliat (Goliath)", "Goliath"), speed: 35, darkvision: 0, sizes: ["medium"], type: "humanoid",
    choices: [{ key: "giant", label: L("Przodek olbrzym", "Giant ancestry"), options: GIANT_ANCESTRIES }],
    resources: (c) => [
      { id: "giant", max: c.choice.giant ? c.pb : 0, recharge: "long", name: GIANT_ANCESTRIES[c.choice.giant] || L("Giant Ancestry", "Giant Ancestry") },
      { id: "large-form", max: c.level >= 5 ? 1 : 0, recharge: "long", name: L("Large Form (Wielka postać)", "Large Form") },
    ],
    summary: (c) => {
      const g = GIANT_ANCESTRIES[c.choice.giant];
      return g ? [{ label: L("Dar olbrzymów", "Giant Ancestry"), value: `${c.pb}×`, note: L(`${g.pl.split(": ")[1]} — ${textOf(g.text, c).pl}`, `${g.en.split(": ")[1]} — ${textOf(g.text, c).en}`) }] : [];
    },
    features: [
      { lv: 1, id: "giant", name: L("Giant Ancestry (Przodek olbrzym)", "Giant Ancestry"),
        desc: (c) => { const g = GIANT_ANCESTRIES[c.choice.giant]; return g ? L(`${g.pl}. ${textOf(g.text, c).pl} ${c.pb}× na długi odpoczynek.`, `${g.en}. ${textOf(g.text, c).en} ${c.pb}× per long rest.`) : L("Wybierz dar jednego z olbrzymów.", "Pick one giant's boon."); } },
      { lv: 1, id: "powerful-build", name: L("Powerful Build (Potężna budowa)", "Powerful Build"),
        desc: () => L("Przewaga na rzuty, by zakończyć pochwycenie (Grappled). Udźwig liczysz jak istota o rozmiar większa.", "Advantage on saves to end being Grappled. You count as one size larger for carrying capacity.") },
      { lv: 5, id: "large-form", name: L("Large Form (Wielka postać)", "Large Form"),
        desc: () => L("Akcja bonusowa: przez 10 minut jesteś Large (jeśli jest miejsce), masz Przewagę na testy SIŁ i +10 ft szybkości. Raz na długi odpoczynek.", "Bonus Action: for 10 minutes you are Large (if there's room), with Advantage on STR checks and +10 ft Speed. Once per long rest.") },
    ],
  },
  halfling: {
    source: "srd52", name: L("Niziołek (Halfling)", "Halfling"), speed: 30, darkvision: 0, sizes: ["small"], type: "humanoid",
    features: [
      { lv: 1, id: "brave", name: L("Brave", "Brave"), desc: () => L("Przewaga na rzuty, by uniknąć lub zakończyć strach (Frightened).", "Advantage on saves to avoid or end being Frightened.") },
      { lv: 1, id: "nimble", name: L("Halfling Nimbleness", "Halfling Nimbleness"),
        desc: () => L("Możesz przechodzić przez pole istoty o rozmiar większej, ale nie możesz się w nim zatrzymać.", "You can move through the space of a creature a size larger than you, but can't stop there.") },
      { lv: 1, id: "luck", name: L("Luck", "Luck"), desc: () => L("Wyrzucone 1 na k20 w teście k20 przerzucasz i bierzesz nowy wynik.", "When you roll a 1 on a d20 Test, reroll it and use the new roll.") },
      { lv: 1, id: "stealthy", name: L("Naturally Stealthy", "Naturally Stealthy"),
        desc: () => L("Możesz się ukryć (Hide) za istotą co najmniej o rozmiar większą.", "You can take the Hide action when obscured only by a creature at least one size larger.") },
    ],
  },
  human: {
    source: "srd52", name: L("Człowiek (Human)", "Human"), speed: 30, darkvision: 0, sizes: ["medium", "small"], type: "humanoid",
    skillChoice: { id: "species", label: L("Człowiek: Skillful", "Human: Skillful"), count: 1, from: null },
    featSlot: { id: "versatile", category: "origin", label: L("Człowiek: Versatile (feat pochodzenia)", "Human: Versatile (origin feat)") },
    resources: () => [{ id: "inspiration", max: 1, recharge: "long", name: L("Heroic Inspiration", "Heroic Inspiration") }],
    features: [
      { lv: 1, id: "resourceful", name: L("Resourceful (Zaradność)", "Resourceful"),
        desc: () => L("Po każdym długim odpoczynku dostajesz Heroic Inspiration: raz przerzucasz dowolną kość k20.", "You gain Heroic Inspiration after every long rest: reroll any one d20.") },
      { lv: 1, id: "skillful", name: L("Skillful (Wszechstronność)", "Skillful"),
        desc: () => L("Biegłość w jednej dodatkowej umiejętności.", "Proficiency in one extra skill.") },
      { lv: 1, id: "versatile", name: L("Versatile", "Versatile"),
        desc: () => L("Dodatkowy feat pochodzenia (podręcznik poleca Skilled).", "An extra origin feat (the handbook recommends Skilled).") },
    ],
  },
  orc: {
    source: "srd52", name: L("Ork (Orc)", "Orc"), speed: 30, darkvision: 120, sizes: ["medium"], type: "humanoid",
    resources: (c) => [
      { id: "adrenaline", max: c.pb, recharge: "short", name: L("Adrenaline Rush", "Adrenaline Rush") },
      { id: "endurance", max: 1, recharge: "long", name: L("Relentless Endurance", "Relentless Endurance") },
    ],
    features: [
      darkvisionFeature(120),
      { lv: 1, id: "adrenaline", name: L("Adrenaline Rush", "Adrenaline Rush"),
        desc: (c) => L(`Dash jako akcja bonusowa i ${c.pb} tymczasowych HP. ${c.pb}× na krótki lub długi odpoczynek.`, `Dash as a bonus action and gain ${c.pb} temporary HP. ${c.pb}× per short or long rest.`) },
      { lv: 1, id: "endurance", name: L("Relentless Endurance", "Relentless Endurance"),
        desc: () => L("Raz na długi odpoczynek zamiast spaść do 0 HP zostajesz z 1 HP.", "Once per long rest, drop to 1 HP instead of 0.") },
    ],
  },
  tiefling: {
    source: "srd52", name: L("Tiefling", "Tiefling"), speed: 30, darkvision: 60, sizes: ["medium", "small"], type: "humanoid",
    choices: [{ key: "legacy", label: L("Piekielne dziedzictwo", "Fiendish legacy"), options: FIENDISH_LEGACIES }, abilityChoice],
    spellAbility: "choose",
    resist: (c) => (FIENDISH_LEGACIES[c.choice.legacy] ? [FIENDISH_LEGACIES[c.choice.legacy].resist] : []),
    spells: (c) => [spell("thaumaturgy"), ...(FIENDISH_LEGACIES[c.choice.legacy]?.spells || [])],
    features: [
      darkvisionFeature(60),
      { lv: 1, id: "legacy", name: L("Fiendish Legacy (Piekielne dziedzictwo)", "Fiendish Legacy"),
        desc: (c) => {
          const g = FIENDISH_LEGACIES[c.choice.legacy];
          if (!g) return L("Wybierz dziedzictwo: otchłanne, chtoniczne albo piekielne.", "Pick a legacy: Abyssal, Chthonic or Infernal.");
          const n = (id) => SPECIES_SPELLS[id].name;
          return L(`${g.pl}: odporność (${DAMAGE_NAMES[g.resist].pl}), sztuczka ${n(g.spells[0].id).pl.split(" (")[0]}; ${n(g.spells[1].id).pl.split(" (")[0]} od 3. poziomu, ${n(g.spells[2].id).pl.split(" (")[0]} od 5. Czary z poziomów 3 i 5 masz zawsze przygotowane; raz na długi odpoczynek rzucasz każdy bez slotu.`,
            `${g.en}: ${DAMAGE_NAMES[g.resist].en} resistance, the ${n(g.spells[0].id).en} cantrip; ${n(g.spells[1].id).en} from level 3, ${n(g.spells[2].id).en} from level 5. Level 3 and 5 spells are always prepared; cast each once per long rest without a slot.`);
        } },
      { lv: 1, id: "presence", name: L("Otherworldly Presence", "Otherworldly Presence"),
        desc: () => L("Znasz sztuczkę Thaumaturgy (ta sama cecha czarowania co dziedzictwo).", "You know the Thaumaturgy cantrip (same spellcasting ability as your legacy).") },
    ],
  },
  other: {
    // Kept only so characters made before 0.4 still load; not offered in the creator.
    source: "homebrew", name: L("Inna (stara wersja)", "Other (old version)"), speed: 30, darkvision: 0, custom: true, legacy: true, features: [], sizes: ["medium", "small"], type: "humanoid",
    skillChoice: { id: "species", label: L("Rasa własna (jeśli daje umiejętność)", "Custom species (if it grants a skill)"), count: 1, from: null },
  },
};


export const REBORN_RESISTANCES = { cold: DAMAGE_NAMES.cold, necrotic: DAMAGE_NAMES.necrotic, poison: DAMAGE_NAMES.poison };
const sizesMS = ["medium", "small"];

// Ravenloft: The Horrors Within — offered only when the game type is Ravenloft.
Object.assign(SPECIES, {
  dhampir: {
    source: "ravenloft", name: L("Dhampir", "Dhampir"), speed: 35, darkvision: 60, sizes: sizesMS, type: "humanoid",
    climb: true,
    resist: () => ["necrotic"],
    resources: (c) => [{ id: "bite", max: c.pb, recharge: "long", name: L("Vampiric Bite: wzmocnienie", "Vampiric Bite: empower") }],
    summary: (c) => [{ label: L("Vampiric Bite", "Vampiric Bite"), value: `1d4${c.mods.con >= 0 ? "+" : ""}${c.mods.con}`,
      note: L(`kłute, zamiast zwykłego ciosu; wzmocnienie ${c.pb}× na długi odpoczynek`, `piercing, instead of a normal Unarmed Strike; empower ${c.pb}× per long rest`) }],
    features: [
      darkvisionFeature(60),
      { lv: 1, id: "spider-climb", name: L("Spider Climb (Pajęcza wspinaczka)", "Spider Climb"),
        desc: (c) => c.level >= 3 ? L("Wspinasz się z pełną szybkością, także po pionowych ścianach i sufitach, z wolnymi rękami.", "Climb Speed equal to your Speed, including vertical surfaces and ceilings, with your hands free.")
          : L("Wspinasz się z pełną szybkością. Od 3. poziomu także po ścianach i sufitach z wolnymi rękami.", "Climb Speed equal to your Speed. From level 3 also along walls and ceilings with your hands free.") },
      { lv: 1, id: "trace", name: L("Trace of Undeath (Ślad nieżycia)", "Trace of Undeath"),
        desc: () => L("Odporność na obrażenia nekrotyczne.", "Resistance to Necrotic damage.") },
      { lv: 1, id: "bite", name: L("Vampiric Bite (Wampirze ugryzienie)", "Vampiric Bite"),
        desc: (c) => L(`Gdy trafiasz ciosem (Unarmed Strike) i zadajesz obrażenia, możesz ugryźć: 1k4 + KON (${c.mods.con >= 0 ? "+" : ""}${c.mods.con}) kłutych zamiast zwykłych. Jeśli cel nie jest Constructem ani Undeadem, możesz się wzmocnić (${c.pb}× na długi odpoczynek): Drain — odzyskujesz tyle HP, ile zadałeś; Strengthen — premia równa tym obrażeniom do następnego testu cechy lub ataku w ciągu minuty.`,
          `When you deal damage with an Unarmed Strike you can bite: 1d4 + CON (${c.mods.con >= 0 ? "+" : ""}${c.mods.con}) piercing instead of the normal damage. If the target isn't a Construct or Undead you can empower yourself (${c.pb}× per long rest): Drain — regain HP equal to the damage; Strengthen — that much bonus to your next ability check or attack roll within a minute.`) },
    ],
  },
  hexblood: {
    source: "ravenloft", name: L("Hexblood (Krew wiedźmy)", "Hexblood"), speed: 30, darkvision: 60, sizes: sizesMS, type: "fey",
    choices: [abilityChoice],
    spellAbility: "choose",
    spells: () => [spell("disguise-self", 1, "long"), spell("hex", 1, "long")],
    resources: () => [{ id: "eerie-token", max: 1, recharge: "long", name: L("Eerie Token (Upiorny żeton)", "Eerie Token") }],
    features: [
      { lv: 1, id: "fey-type", name: L("Typ istoty: Fey", "Creature type: Fey"),
        desc: () => L("Jesteś istotą typu Fey, nie Humanoid. Czary działające tylko na humanoidy (np. Charm Person, Hold Person) Cię nie dotyczą, a te na Fey — tak.", "You are a Fey, not a Humanoid. Spells that affect only Humanoids (such as Charm Person or Hold Person) don't affect you; those that target Fey do.") },
      darkvisionFeature(60),
      { lv: 1, id: "eerie-token", name: L("Eerie Token (Upiorny żeton)", "Eerie Token"),
        desc: () => L("Akcja bonusowa: tworzysz żeton (kosmyk włosów, paznokieć). Dopóki istnieje (do długiego odpoczynku), w zasięgu 10 mil możesz akcją Magic: wysłać telepatycznie do 25 słów temu, kto go trzyma, albo przez minutę widzieć i słyszeć z miejsca żetonu (potem żeton znika). Raz na długi odpoczynek.",
          "Bonus Action: make a token (a lock of hair, a nail). While it lasts (until a long rest), within 10 miles you can take a Magic action to send a telepathic message of up to 25 words to whoever holds it, or see and hear from the token for 1 minute (then it crumbles). Once per long rest.") },
      { lv: 1, id: "hex-magic", name: L("Hex Magic (Magia klątw)", "Hex Magic"),
        desc: () => L("Disguise Self i Hex masz zawsze przygotowane; każdy rzucasz raz na długi odpoczynek bez slotu (albo ze slotów).", "Disguise Self and Hex are always prepared; cast each once per long rest without a slot (or with your slots).") },
    ],
  },
  lupin: {
    source: "ravenloft", name: L("Lupin (Wilkołaczy)", "Lupin"), speed: 30, darkvision: 60, sizes: sizesMS, type: "humanoid",
    unarmed: L("cięte", "slashing"),
    skillChoice: { id: "species", label: L("Lupin: Werewolf Instincts", "Lupin: Werewolf Instincts"), count: 1, from: ["perception", "stealth", "survival"] },
    resources: (c) => [{ id: "howl", max: c.pb, recharge: "long", name: L("Howl (Wycie)", "Howl") }],
    summary: (c) => [{ label: L("Howl", "Howl"), value: `DC ${8 + c.mods.con + c.pb}`,
      note: L(`akcja bonusowa, 15 ft, rzut MĄD; ${c.pb}× na długi odpoczynek`, `Bonus Action, 15 ft, WIS save; ${c.pb}× per long rest`) }],
    features: [
      darkvisionFeature(60),
      { lv: 1, id: "pounce", name: L("Feral Pounce (Dziki skok)", "Feral Pounce"),
        desc: () => L("Twoje ciosy (Unarmed Strike) zadają obrażenia cięte zamiast obuchowych. Raz na turę, gdy trafisz ciosem w akcji Attack, możesz jednocześnie zadać obrażenia i pchnąć (Damage i Shove).", "Your Unarmed Strikes deal Slashing damage instead of Bludgeoning. Once per turn, when you hit with an Unarmed Strike as part of the Attack action, you can use both the Damage and the Shove options.") },
      { lv: 1, id: "howl", name: L("Howl (Wycie)", "Howl"),
        desc: (c) => L(`Akcja bonusowa: wybrane istoty w promieniu 15 ft rzucają MĄD przeciw DC ${8 + c.mods.con + c.pb}; porażka = Utrudnienie na ataki i rzuty obronne do początku Twojej następnej tury. ${c.pb}× na długi odpoczynek.`,
          `Bonus Action: creatures you choose within 15 ft make a WIS save against DC ${8 + c.mods.con + c.pb} or have Disadvantage on attack rolls and saving throws until the start of your next turn. ${c.pb}× per long rest.`) },
      { lv: 1, id: "instincts", name: L("Werewolf Instincts (Wilcze instynkty)", "Werewolf Instincts"),
        desc: () => L("Biegłość w Perception, Stealth albo Survival.", "Proficiency in Perception, Stealth or Survival.") },
    ],
  },
  reborn: {
    source: "ravenloft", name: L("Reborn (Odrodzony)", "Reborn"), speed: 30, darkvision: 0, sizes: sizesMS, type: "humanoid",
    deathSaves: "adv",
    choices: [{ key: "endurance", label: L("Strange Endurance: odporność", "Strange Endurance: resistance"), options: REBORN_RESISTANCES }],
    resist: (c) => (REBORN_RESISTANCES[c.choice.endurance] ? [c.choice.endurance] : []),
    skillChoice: { id: "species", label: L("Reborn: Knowledge from a Past Life", "Reborn: Knowledge from a Past Life"), count: 1, from: null },
    resources: (c) => [{ id: "past-life", max: c.pb, recharge: "long", name: L("Knowledge from a Past Life (+1k6)", "Knowledge from a Past Life (+1d6)") }],
    features: [
      { lv: 1, id: "escaped-death", name: L("Escaped Death (Ucieczka przed śmiercią)", "Escaped Death"),
        desc: () => L("Przewaga na rzuty przeciw śmierci.", "Advantage on Death Saving Throws.") },
      { lv: 1, id: "everlasting", name: L("Everlasting (Wieczny)", "Everlasting"),
        desc: () => L("Brak Exhaustion od głodu, pragnienia i duszenia się. Nie śpisz, magia Cię nie uśpi; długi odpoczynek to 4 godziny bezruchu w pełnej świadomości.", "No Exhaustion from hunger, thirst or suffocation. You don't sleep and magic can't put you to sleep; a Long Rest is 4 hours of motionless stillness, fully aware.") },
      { lv: 1, id: "past-life", name: L("Knowledge from a Past Life (Wiedza z poprzedniego życia)", "Knowledge from a Past Life"),
        desc: (c) => L(`Biegłość w jednej dowolnej umiejętności. Gdy oblejesz test cechy, możesz dodać 1k6 do k20 — ${c.pb}× na długi odpoczynek.`, `Proficiency in one skill of your choice. When you fail an ability check you can add 1d6 to the d20 — ${c.pb}× per long rest.`) },
      { lv: 1, id: "endurance", name: L("Strange Endurance (Dziwna wytrzymałość)", "Strange Endurance"),
        desc: (c) => REBORN_RESISTANCES[c.choice.endurance] ? L(`Odporność: ${REBORN_RESISTANCES[c.choice.endurance].pl}.`, `Resistance to ${REBORN_RESISTANCES[c.choice.endurance].en} damage.`) : L("Odporność do wyboru: zimno, nekrotyczne albo trucizna.", "Resistance of your choice: Cold, Necrotic or Poison.") },
    ],
  },
});

export const CREATURE_TYPES = { humanoid: L("Humanoid (humanoid)", "Humanoid"), fey: L("Fey (istota baśniowa)", "Fey") };

/** Species details for the chosen options: speed, darkvision, resistances, spells with their uses. */
export function speciesTraits(sp, c) {
  const ability = sp.spellAbility === "choose" ? (SPELL_ABILITIES[c.choice.ability] ? c.choice.ability : "") : sp.spellAbility || "";
  const spells = (sp.spells ? sp.spells(c) : []).filter((s) => s.at <= c.level).map((s) => ({ ...s, ...SPECIES_SPELLS[s.id], text: SPECIES_SPELLS[s.id].desc(c) }));
  return {
    speed: sp.speedFor ? sp.speedFor(c) : sp.speed,
    darkvision: sp.darkvisionFor ? sp.darkvisionFor(c) : sp.darkvision,
    resist: sp.resist ? sp.resist(c) : [],
    saveAdvantage: sp.saveAdvantage || [],
    deathSaves: sp.deathSaves || "", climb: !!sp.climb, unarmed: sp.unarmed || null,
    magic: spells.length ? { ability, dc: ability ? 8 + c.mods[ability] + c.pb : null, attack: ability ? c.mods[ability] + c.pb : null, spells } : null,
    spellResources: spells.filter((s) => s.uses !== "atwill").map((s) => ({ id: "sp-" + s.id, max: s.uses === "pb" ? c.pb : 1, recharge: "long", name: s.name, spell: true })),
    missing: (sp.choices || []).filter((x) => !x.options[c.choice[x.key]]),
    pickOf: (key) => pickOf(sp, c, key),
  };
}
