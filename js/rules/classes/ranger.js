// Ranger, levels 1–5, 2024 rules (Player's Handbook ch. 3) + Hollow Warden (Ravenloft: The Horrors Within).
// Descriptions are our own paraphrase.
import { signed } from "../core.js";
import { masteryGroup } from "../weapons.js";
import { HALF_SLOTS, HALF_PREPARED } from "./paladin.js";

const L = (pl, en) => ({ pl, en });
const atLeast1 = (n) => Math.max(1, n);
const list = (byLevel) => (lv) => Object.entries(byLevel).filter(([k]) => +k <= lv).flatMap(([, s]) => s);
const favored = (lv) => (lv < 5 ? 2 : lv < 9 ? 3 : lv < 13 ? 4 : lv < 17 ? 5 : 6);
const dc = (c) => 8 + c.mods.wis + c.pb;
const atk = (c) => c.mods.wis + c.pb;

/** Beast Master: the Primal Companion's three stat blocks (numbers from the PHB, scaled by Ranger level). */
const COMPANIONS = {
  land: (c) => L(`Bestia lądu (Średnia): KP ${13 + c.mods.wis}, HP ${5 + 5 * c.level}, prędkość 40 ft, wspinaczka 40 ft, widzenie w ciemności 60 ft. Cios bestii: ${signed(atk(c))}, 1k8 ${signed(2 + c.mods.wis)} obuchowe, kłute albo cięte; po szarży 20 ft +1k6 i cel Duży lub mniejszy pada.`,
    `Beast of the Land (Medium): AC ${13 + c.mods.wis}, HP ${5 + 5 * c.level}, Speed 40 ft, Climb 40 ft, Darkvision 60 ft. Beast's Strike: ${signed(atk(c))}, 1d8 ${signed(2 + c.mods.wis)} Bludgeoning, Piercing or Slashing; after a 20-ft charge +1d6 and a Large or smaller target falls Prone.`),
  sea: (c) => L(`Bestia morza (Średnia): KP ${13 + c.mods.wis}, HP ${5 + 5 * c.level}, prędkość 5 ft, pływanie 60 ft, widzenie w ciemności 90 ft, oddycha w wodzie. Cios bestii: ${signed(atk(c))}, 1k6 ${signed(2 + c.mods.wis)} obuchowe albo kłute, a cel jest pochwycony (ucieczka DC ${dc(c)}).`,
    `Beast of the Sea (Medium): AC ${13 + c.mods.wis}, HP ${5 + 5 * c.level}, Speed 5 ft, Swim 60 ft, Darkvision 90 ft, breathes water. Beast's Strike: ${signed(atk(c))}, 1d6 ${signed(2 + c.mods.wis)} Bludgeoning or Piercing, and the target is Grappled (escape DC ${dc(c)}).`),
  sky: (c) => L(`Bestia nieba (Mała): KP ${13 + c.mods.wis}, HP ${4 + 4 * c.level}, prędkość 10 ft, latanie 60 ft, widzenie w ciemności 60 ft, odlatując nie prowokuje ataków okazyjnych. Cios bestii: ${signed(atk(c))}, 1k4 ${signed(3 + c.mods.wis)} cięte.`,
    `Beast of the Sky (Small): AC ${13 + c.mods.wis}, HP ${4 + 4 * c.level}, Speed 10 ft, Fly 60 ft, Darkvision 60 ft, doesn't provoke Opportunity Attacks when flying away. Beast's Strike: ${signed(atk(c))}, 1d4 ${signed(3 + c.mods.wis)} Slashing.`),
};

export const ranger = {
  id: "ranger",
  source: "srd52",
  name: L("Łowca (Ranger)", "Ranger"),
  maxLevel: 5,
  asiLevels: [4, 8, 12, 16],
  hitDie: 10,
  standardArray: { str: 12, dex: 15, con: 13, int: 8, wis: 14, cha: 10 },
  saves: ["str", "dex"],
  skillChoices: { count: 3, from: ["animal", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
  armorTraining: ["light", "medium", "shield"],
  weaponProf: () => true,
  fightingStyle: 2,
  /** Instead of a Fighting Style feat: Druidic Warrior (two Druid cantrips). */
  styleAlt: "druidic-warrior",
  // Deft Explorer (level 2): Expertise in one skill and two languages.
  expertise: (lv) => (lv < 2 ? 0 : lv < 9 ? 1 : 3),
  languages: (lv) => (lv >= 2 ? { pick: { id: "deft-explorer", count: 2, from: "any", label: L("Deft Explorer: 2 języki", "Deft Explorer: 2 languages") } } : {}),
  role: L("Tropiciel i strzelec z magią natury. Hunter's Mark dokłada obrażenia celowi, a czary pomagają w walce i w dziczy.",
    "A tracker and marksman with nature magic. Hunter's Mark adds damage to a chosen target, and spells help in battle and in the wild."),

  choices: {
    companion: {
      lv: 3, subclass: "beast-master", label: L("Pierwotny towarzysz (zmienisz go po długim odpoczynku)", "Primal Companion (change it after a long rest)"), default: "land",
      options: { land: L("Bestia lądu (Beast of the Land)", "Beast of the Land"), sea: L("Bestia morza (Beast of the Sea)", "Beast of the Sea"), sky: L("Bestia nieba (Beast of the Sky)", "Beast of the Sky") },
    },
    prey: {
      lv: 3, subclass: "hunter", label: L("Hunter's Prey (zmienisz po krótkim lub długim odpoczynku)", "Hunter's Prey (change it after a short or long rest)"), default: "colossus",
      options: { colossus: L("Colossus Slayer (Pogromca kolosów)", "Colossus Slayer"), horde: L("Horde Breaker (Łamacz hord)", "Horde Breaker") },
    },
  },

  spellcasting: (lv) => ({ ability: "wis", list: L("łowcy", "Ranger"), listId: "ranger", changeRule: "oneLongRest",
    cantrips: 0, prepared: HALF_PREPARED[lv], slots: HALF_SLOTS[lv] }),
  alwaysSpells: () => ["Hunter's Mark"],
  freeCasts: { "hunters-mark": "favored-enemy" },

  optionPicks: () => [masteryGroup(2)],

  resources: (c) => [
    { id: "favored-enemy", max: favored(c.level), recharge: "long", name: L("Favored Enemy: Hunter's Mark bez slotu", "Favored Enemy: Hunter's Mark without a slot") },
  ],

  summary: (c) => [
    { label: L("Hunter's Mark", "Hunter's Mark"), value: L("+1k6", "+1d6"), note: L(`akcja bonusowa; obrażenia przy każdym trafieniu celu; ${favored(c.level)}× bez slotu na długi odpoczynek`, `Bonus Action; damage on every hit on the target; ${favored(c.level)}× without a slot per long rest`) },
  ],

  features: [
    { lv: 1, id: "spellcasting", name: L("Spellcasting (Czary)", "Spellcasting"),
      desc: (c) => L(`Czary łowcy na MĄD, bez sztuczek. ${HALF_PREPARED[c.level]} przygotowane czary; po długim odpoczynku możesz wymienić jeden. Fokus: przedmiot druidzki.`,
        `Ranger spells using WIS, no cantrips. ${HALF_PREPARED[c.level]} prepared spells; after a long rest you can swap one. Focus: a Druidic Focus.`) },
    { lv: 1, id: "favored-enemy", name: L("Favored Enemy (Ulubiony wróg)", "Favored Enemy"),
      desc: (c) => L(`Hunter's Mark masz zawsze przygotowany i rzucasz go bez slotu ${favored(c.level)}× na długi odpoczynek.`, `Hunter's Mark is always prepared, and you cast it without a slot ${favored(c.level)}× per long rest.`) },
    { lv: 1, id: "weapon-mastery", name: L("Weapon Mastery (Mistrzostwo broni)", "Weapon Mastery"),
      desc: () => L("Używasz właściwości mistrzowskich 2 rodzajów broni (wybór w kroku 5). Po długim odpoczynku możesz je zmienić.", "You use the mastery properties of 2 kinds of weapons (pick them in step 5). After a long rest you can change them.") },
    { lv: 2, id: "deft-explorer", name: L("Deft Explorer (Zręczny odkrywca)", "Deft Explorer"),
      desc: () => L("Specjalizacja w jednej umiejętności, w której masz biegłość, i dwa nowe języki z tabel języków.", "Expertise in one skill you're proficient in, and two more languages from the language tables.") },
    { lv: 2, id: "fighting-style", name: L("Fighting Style (Styl walki)", "Fighting Style"),
      desc: () => L("Feat stylu walki albo Druidic Warrior: dwie sztuczki druida na MĄD (polecane Guidance i Starry Wisp). Wybór w kroku 5.", "A Fighting Style feat, or Druidic Warrior: two Druid cantrips using WIS (Guidance and Starry Wisp are recommended). Pick it in step 5.") },
    { lv: 3, id: "subclass", name: L("Podklasa (Ranger Subclass)", "Ranger Subclass"),
      desc: () => L("Wybierasz ścieżkę łowcy. Jej zdolności pojawią się niżej.", "Choose your ranger path. Its features appear below.") },
    { lv: 4, id: "asi", name: L("Feat albo +2 do cech (ASI)", "Feat or Ability Score Improvement"),
      desc: () => L("Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch) na zakładce Awans.", "Pick a feat or +2 to one ability (or +1 to two) on the Level up tab.") },
    { lv: 5, id: "extra-attack", name: L("Extra Attack (Dodatkowy atak)", "Extra Attack"),
      desc: () => L("Akcją Atak atakujesz dwa razy.", "You attack twice when you take the Attack action.") },
  ],

  subclassLevel: 3,
  subclasses: {
    "beast-master": {
      source: "phb2024", name: L("Beast Master (Władca zwierząt)", "Beast Master"),
      features: [
        { lv: 3, id: "primal-companion", name: L("Primal Companion (Pierwotny towarzysz)", "Primal Companion"),
          desc: (c) => L(`Przyzywasz pierwotną bestię, przyjazną Tobie i drużynie. Działa w Twojej turze: rusza się i używa reakcji sama, ale bez rozkazu robi tylko Unik. Akcją bonusową każesz jej użyć akcji (np. Cios bestii); możesz też oddać jeden swój atak z akcji Atak, by uderzyła. Dodaje Twój PB do swoich testów i rzutów obronnych. Zmarłą w ciągu godziny ożywisz akcją Magia za slot. ${COMPANIONS[c.classChoices.companion || "land"](c).pl}`,
            `You summon a primal beast, friendly to you and your party. It acts on your turn: it moves and uses its Reaction on its own, but without orders it only takes the Dodge action. As a Bonus Action you command it to take an action (e.g. Beast's Strike); you can also give up one of your Attack-action attacks to have it strike. It adds your PB to its checks and saves. If it died within the hour, revive it with a Magic action and a spell slot. ${COMPANIONS[c.classChoices.companion || "land"](c).en}`) },
      ],
    },
    "fey-wanderer": {
      source: "phb2024", name: L("Fey Wanderer (Wędrowiec fey)", "Fey Wanderer"),
      domainSpells: list({ 3: ["Charm Person"], 5: ["Misty Step"] }),
      skillBonus: (c, skill) => (["deception", "intimidation", "performance", "persuasion"].includes(skill) ? atLeast1(c.mods.wis) : 0),
      extraSkills: (lv) => (lv >= 3 ? [{ id: "otherworldly-glamour", label: L("Otherworldly Glamour: jedna umiejętność", "Otherworldly Glamour: one skill"), count: 1, from: ["deception", "performance", "persuasion"] }] : []),
      features: [
        { lv: 3, id: "dreadful-strikes", name: L("Dreadful Strikes (Straszliwe ciosy)", "Dreadful Strikes"),
          desc: () => L("Po trafieniu bronią możesz dodać 1k4 obrażeń psychicznych (każdy cel najwyżej raz na turę).", "When you hit with a weapon, you can add 1d4 Psychic damage (each target at most once per turn).") },
        { lv: 3, id: "otherworldly-glamour", name: L("Otherworldly Glamour (Nieziemski urok)", "Otherworldly Glamour"),
          desc: (c) => L(`Do testów CHA dodajesz +${atLeast1(c.mods.wis)} (MĄD, już na karcie). Biegłość w Oszustwie, Występach albo Perswazji (wybór w kroku 5). Masz też dar z Feywildu (opisz go w notatkach).`,
            `Add +${atLeast1(c.mods.wis)} (WIS) to CHA checks (already on the sheet). Proficiency in Deception, Performance or Persuasion (pick it in step 5). You also have a Feywild gift (describe it in Notes).`) },
      ],
    },
    "gloom-stalker": {
      source: "phb2024", name: L("Gloom Stalker (Mroczny łowca)", "Gloom Stalker"),
      domainSpells: list({ 3: ["Disguise Self"], 5: ["Rope Trick"] }),
      darkvisionPlus: 60,
      initiativeBonus: (c) => c.mods.wis,
      resources: (c) => [{ id: "dreadful-strike", max: atLeast1(c.mods.wis), recharge: "long", name: L("Dreadful Strike (+2k6 psychicznych)", "Dreadful Strike (+2d6 Psychic)") }],
      features: [
        { lv: 3, id: "dread-ambusher", name: L("Dread Ambusher (Straszny zasadzkowicz)", "Dread Ambusher"),
          desc: (c) => L(`Na początku pierwszej tury w walce +10 ft prędkości. Do Inicjatywy dodajesz MĄD (już na karcie). Raz na turę po trafieniu bronią możesz dodać 2k6 obrażeń psychicznych — ${atLeast1(c.mods.wis)}× na długi odpoczynek.`,
            `At the start of your first turn in combat, +10 ft Speed. Add WIS to Initiative (already on the sheet). Once per turn after a weapon hit you can add 2d6 Psychic damage — ${atLeast1(c.mods.wis)}× per long rest.`) },
        { lv: 3, id: "umbral-sight", name: L("Umbral Sight (Wzrok cienia)", "Umbral Sight"),
          desc: () => L("Widzenie w ciemności 60 ft, a jeśli już je masz, dłuższe o 60 ft (już na karcie). W całkowitej ciemności jesteś niewidzialny dla istot, które widzą Cię tylko dzięki widzeniu w ciemności.", "Darkvision 60 ft, or 60 ft more if you already have it (already on the sheet). In complete Darkness you're Invisible to creatures relying on Darkvision to see you.") },
      ],
    },
    hunter: {
      source: "srd52", name: L("Hunter (Myśliwy)", "Hunter"),
      features: [
        { lv: 3, id: "hunters-lore", name: L("Hunter's Lore (Wiedza myśliwego)", "Hunter's Lore"),
          desc: () => L("Dopóki istota jest oznaczona Twoim Hunter's Mark, wiesz, na co jest odporna, niewrażliwa albo podatna.", "While a creature is marked by your Hunter's Mark, you know its Immunities, Resistances and Vulnerabilities.") },
        { lv: 3, id: "hunters-prey", name: L("Hunter's Prey (Zdobycz myśliwego)", "Hunter's Prey"),
          desc: (c) => (c.classChoices.prey === "horde"
            ? L("Horde Breaker: raz w turze, atakując bronią, wykonujesz dodatkowy atak tą samą bronią w inną istotę w 5 ft od celu, której jeszcze nie atakowałeś. (Po odpoczynku możesz zmienić na Colossus Slayer.)", "Horde Breaker: once per turn when you attack with a weapon, make another attack with it against a different creature within 5 ft of the target that you haven't attacked this turn. (After a rest you can switch to Colossus Slayer.)")
            : L("Colossus Slayer: raz w turze, trafiając bronią istotę, której brakuje choć 1 HP, zadajesz +1k8 obrażeń. (Po odpoczynku możesz zmienić na Horde Breaker.)", "Colossus Slayer: once per turn, when you hit a creature that's missing any HP with a weapon, deal +1d8 damage. (After a rest you can switch to Horde Breaker.)")) },
      ],
    },
    "hollow-warden": {
      // Ravenloft: The Horrors Within
      source: "ravenloft", name: L("Hollow Warden (Strażnik Pustki)", "Hollow Warden"),
      domainSpells: list({ 3: ["Wrathful Smite"], 5: ["Alter Self"] }),
      features: [
        { lv: 3, id: "wrath-of-the-wild", name: L("Wrath of the Wild (Gniew dziczy)", "Wrath of the Wild"),
          desc: (c) => L(`Akcja bonusowa, za użycie Favored Enemy: na minutę zmieniasz się w upiorną postać. +1 do KP; zaraz gdy istota w 5 ft zrani Ciebie albo sojusznika, możesz zaatakować ją atakiem okazyjnym; przy przemianie i na początku każdej tury wybrane istoty w 10 ft rzucają MĄD (DC ${dc(c)}) albo są przestraszone do początku Twojej tury.`,
            `Bonus Action, spend a use of Favored Enemy: for a minute you take a ghastly form. +1 AC; right after a creature within 5 ft damages you or an ally, you can make an Opportunity Attack against it; when you transform and at the start of each turn, chosen creatures within 10 ft make a WIS save (DC ${dc(c)}) or are Frightened until the start of your turn.`) },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Deft Explorer: specjalizacja i 2 języki", "Fighting Style", "3 przygotowane czary"], en: ["Deft Explorer: Expertise and 2 languages", "Fighting Style", "3 prepared spells"] },
    3: { pl: ["Wybór podklasy", "3 sloty 1. kręgu, 4 przygotowane czary"], en: ["Choose a subclass", "3 level 1 slots, 4 prepared spells"] },
    4: { pl: ["Feat albo +2 do cech", "5 przygotowanych czarów"], en: ["Feat or ability score increase", "5 prepared spells"] },
    5: { pl: ["Extra Attack: 2 ataki", "Favored Enemy: 3 użycia", "Czary 2. kręgu: 2 sloty", "6 przygotowanych czarów", "PB +3"], en: ["Extra Attack: 2 attacks", "Favored Enemy: 3 uses", "Level 2 spells: 2 slots", "6 prepared spells", "Proficiency bonus +3"] },
  },
};
