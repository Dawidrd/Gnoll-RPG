// Paladin, levels 1–5, 2024 rules (Player's Handbook ch. 3). Descriptions are our own paraphrase.
import { masteryGroup } from "../weapons.js";

const L = (pl, en) => ({ pl, en });
const atLeast1 = (n) => Math.max(1, n);
const list = (byLevel) => (lv) => Object.entries(byLevel).filter(([k]) => +k <= lv).flatMap(([, s]) => s);
/** Half caster: slots and prepared spells by Paladin (or Ranger) level. */
export const HALF_SLOTS = { 1: [2], 2: [2], 3: [3], 4: [3], 5: [4, 2] };
export const HALF_PREPARED = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
const cd = (lv) => (lv < 3 ? 0 : lv < 11 ? 2 : 3);
const dc = (c) => 8 + c.mods.cha + c.pb;

export const paladin = {
  id: "paladin",
  source: "srd52",
  name: L("Paladyn (Paladin)", "Paladin"),
  maxLevel: 5,
  asiLevels: [4, 8, 12, 16],
  hitDie: 10,
  standardArray: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
  saves: ["wis", "cha"],
  skillChoices: { count: 2, from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
  armorTraining: ["light", "medium", "heavy", "shield"],
  weaponProf: () => true,
  fightingStyle: 2,
  /** Instead of a Fighting Style feat: Blessed Warrior (two Cleric cantrips). */
  styleAlt: "blessed-warrior",
  role: L("Święty rycerz: walczy w ciężkiej zbroi, leczy dotykiem (Lay on Hands), a Divine Smite dokłada potężne obrażenia promieniste po trafieniu.",
    "A holy knight: fights in heavy armor, heals by touch (Lay on Hands), and Divine Smite adds heavy radiant damage on a hit."),

  spellcasting: (lv) => ({ ability: "cha", list: L("paladyna", "Paladin"), listId: "paladin", changeRule: "oneLongRest",
    cantrips: 0, prepared: HALF_PREPARED[lv], slots: HALF_SLOTS[lv] }),
  alwaysSpells: (lv) => [...(lv >= 2 ? ["Divine Smite"] : []), ...(lv >= 5 ? ["Find Steed"] : [])],
  freeCasts: { "divine-smite": "smite-free", "find-steed": "steed-free" },

  optionPicks: () => [masteryGroup(2)],

  resources: (c) => [
    { id: "lay-on-hands", max: 5 * c.level, recharge: "long", name: L("Lay on Hands (pula HP)", "Lay on Hands (HP pool)") },
    { id: "channel", max: cd(c.level), recharge: "long", shortRegain: 1, name: L("Channel Divinity", "Channel Divinity") },
    { id: "smite-free", max: c.level >= 2 ? 1 : 0, recharge: "long", name: L("Divine Smite bez slotu", "Divine Smite without a slot") },
    { id: "steed-free", max: c.level >= 5 ? 1 : 0, recharge: "long", name: L("Find Steed bez slotu", "Find Steed without a slot") },
  ],

  summary: (c) => [
    { label: L("Lay on Hands", "Lay on Hands"), value: L(`${5 * c.level} HP`, `${5 * c.level} HP`), note: L("akcja bonusowa, dotyk; 5 HP z puli usuwa zatrucie", "Bonus Action, touch; 5 HP from the pool removes Poisoned") },
    ...(c.level >= 2 ? [{ label: L("Divine Smite", "Divine Smite"), value: L("2k8 + 1k8/krąg", "2d8 + 1d8/level"), note: L("akcja bonusowa po trafieniu; +1k8 w nieumarłego lub biesa", "Bonus Action after a hit; +1d8 against Undead or Fiends") }] : []),
  ],

  features: [
    { lv: 1, id: "lay-on-hands", name: L("Lay on Hands (Nałożenie rąk)", "Lay on Hands"),
      desc: (c) => L(`Pula ${5 * c.level} HP (5 × poziom), wraca po długim odpoczynku. Akcja bonusowa: dotykasz istotę (albo siebie) i oddajesz jej dowolną liczbę HP z puli. 5 HP z puli może zamiast tego usunąć zatrucie.`,
        `A pool of ${5 * c.level} HP (5 × level), refilled on a long rest. Bonus Action: touch a creature (or yourself) and restore any number of HP from the pool. 5 HP from the pool can instead remove the Poisoned condition.`) },
    { lv: 1, id: "spellcasting", name: L("Spellcasting (Czary)", "Spellcasting"),
      desc: (c) => L(`Czary paladyna na CHA, bez sztuczek. ${HALF_PREPARED[c.level]} przygotowane czary; po długim odpoczynku możesz wymienić jeden. Fokus: święty symbol.`,
        `Paladin spells using CHA, no cantrips. ${HALF_PREPARED[c.level]} prepared spells; after a long rest you can swap one. Focus: a Holy Symbol.`) },
    { lv: 1, id: "weapon-mastery", name: L("Weapon Mastery (Mistrzostwo broni)", "Weapon Mastery"),
      desc: () => L("Używasz właściwości mistrzowskich 2 rodzajów broni (wybór w kroku 5). Po długim odpoczynku możesz je zmienić.", "You use the mastery properties of 2 kinds of weapons (pick them in step 5). After a long rest you can change them.") },
    { lv: 2, id: "fighting-style", name: L("Fighting Style (Styl walki)", "Fighting Style"),
      desc: () => L("Feat stylu walki albo Blessed Warrior: dwie sztuczki kleryka na CHA (polecane Guidance i Sacred Flame). Wybór w kroku 5.", "A Fighting Style feat, or Blessed Warrior: two Cleric cantrips using CHA (Guidance and Sacred Flame are recommended). Pick it in step 5.") },
    { lv: 2, id: "paladins-smite", name: L("Paladin's Smite (Uderzenie paladyna)", "Paladin's Smite"),
      desc: () => L("Divine Smite masz zawsze przygotowany i raz na długi odpoczynek rzucasz go bez slotu. Akcja bonusowa zaraz po trafieniu bronią albo ciosem: +2k8 promienistych (+1k8 za każdy krąg slotu powyżej 1.; +1k8 w nieumarłego albo biesa).",
        "Divine Smite is always prepared, and once per long rest you cast it without a slot. Bonus Action right after a weapon or unarmed hit: +2d8 Radiant (+1d8 per slot level above 1; +1d8 against an Undead or a Fiend).") },
    { lv: 3, id: "channel", name: L("Channel Divinity (Boska moc)", "Channel Divinity"),
      desc: (c) => L(`${cd(c.level)} użycia, krótki odpoczynek oddaje jedno. Divine Sense (akcja bonusowa): przez 10 minut wiesz, gdzie w 60 ft są niebiańscy, biesy i nieumarli, oraz miejsca uświęcone lub zbezczeszczone. DC efektów: ${dc(c)}.`,
        `${cd(c.level)} uses; a short rest restores one. Divine Sense (Bonus Action): for 10 minutes you know where Celestials, Fiends and Undead are within 60 ft, and any consecrated or desecrated place. Effect DC: ${dc(c)}.`) },
    { lv: 3, id: "subclass", name: L("Przysięga (Paladin Subclass)", "Paladin Subclass"),
      desc: () => L("Składasz przysięgę. Jej zdolności i czary zawsze przygotowane pojawią się niżej.", "Swear your oath. Its features and always-prepared spells appear below.") },
    { lv: 4, id: "asi", name: L("Feat albo +2 do cech (ASI)", "Feat or Ability Score Improvement"),
      desc: () => L("Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch) na zakładce Awans.", "Pick a feat or +2 to one ability (or +1 to two) on the Level up tab.") },
    { lv: 5, id: "extra-attack", name: L("Extra Attack (Dodatkowy atak)", "Extra Attack"),
      desc: () => L("Akcją Atak atakujesz dwa razy.", "You attack twice when you take the Attack action.") },
    { lv: 5, id: "faithful-steed", name: L("Faithful Steed (Wierny wierzchowiec)", "Faithful Steed"),
      desc: () => L("Find Steed masz zawsze przygotowany i raz na długi odpoczynek rzucasz go bez slotu.", "Find Steed is always prepared, and once per long rest you cast it without a slot.") },
  ],

  subclassLevel: 3,
  subclasses: {
    devotion: {
      source: "srd52", name: L("Oath of Devotion (Przysięga Oddania)", "Oath of Devotion"),
      domainSpells: list({ 3: ["Protection from Evil and Good", "Shield of Faith"], 5: ["Aid", "Zone of Truth"] }),
      features: [
        { lv: 3, id: "sacred-weapon", name: L("Sacred Weapon (Święta broń)", "Sacred Weapon"),
          desc: (c) => L(`Przy akcji Atak, za Channel Divinity: broń wręcz w ręku na 10 minut dostaje +${atLeast1(c.mods.cha)} do ataku (CHA), może zadawać obrażenia promieniste i świeci (jasne światło 20 ft).`,
            `When you take the Attack action, spend Channel Divinity: a melee weapon you hold gets +${atLeast1(c.mods.cha)} to hit (CHA) for 10 minutes, can deal Radiant damage, and shines (Bright Light 20 ft).`) },
      ],
    },
    glory: {
      source: "phb2024", name: L("Oath of Glory (Przysięga Chwały)", "Oath of Glory"),
      domainSpells: list({ 3: ["Guiding Bolt", "Heroism"], 5: ["Enhance Ability", "Magic Weapon"] }),
      features: [
        { lv: 3, id: "inspiring-smite", name: L("Inspiring Smite (Natchnione uderzenie)", "Inspiring Smite"),
          desc: (c) => L(`Zaraz po Divine Smite, za Channel Divinity: rozdzielasz 2k8 + ${c.level} tymczasowych HP między wybrane istoty w 30 ft (także siebie).`, `Right after Divine Smite, spend Channel Divinity: split 2d8 + ${c.level} Temporary HP among chosen creatures within 30 ft (you included).`) },
        { lv: 3, id: "peerless-athlete", name: L("Peerless Athlete (Niezrównany atleta)", "Peerless Athlete"),
          desc: () => L("Akcja bonusowa, za Channel Divinity: przez godzinę Przewaga na Atletykę i Akrobatykę, a skoki dłuższe o 10 ft.", "Bonus Action, spend Channel Divinity: for an hour, Advantage on Athletics and Acrobatics checks, and your jumps are 10 ft longer.") },
      ],
    },
    ancients: {
      source: "phb2024", name: L("Oath of the Ancients (Przysięga Pradawnych)", "Oath of the Ancients"),
      domainSpells: list({ 3: ["Ensnaring Strike", "Speak with Animals"], 5: ["Misty Step", "Moonbeam"] }),
      features: [
        { lv: 3, id: "natures-wrath", name: L("Nature's Wrath (Gniew natury)", "Nature's Wrath"),
          desc: (c) => L(`Akcja Magia, za Channel Divinity: wybrane istoty w 15 ft rzucają SIŁ (DC ${dc(c)}) albo są unieruchomione na minutę (ponawiają rzut na końcu swoich tur).`, `Magic action, spend Channel Divinity: chosen creatures within 15 ft make a STR save (DC ${dc(c)}) or are Restrained for a minute (repeating the save at the end of their turns).`) },
      ],
    },
    vengeance: {
      source: "phb2024", name: L("Oath of Vengeance (Przysięga Zemsty)", "Oath of Vengeance"),
      domainSpells: list({ 3: ["Bane", "Hunter's Mark"], 5: ["Hold Person", "Misty Step"] }),
      features: [
        { lv: 3, id: "vow-of-enmity", name: L("Vow of Enmity (Ślubowanie wrogości)", "Vow of Enmity"),
          desc: () => L("Przy akcji Atak, za Channel Divinity: wybierasz istotę w 30 ft; przez minutę masz Przewagę na ataki w nią. Gdy spadnie do 0 HP, możesz przenieść ślubowanie na inną w 30 ft.", "When you take the Attack action, spend Channel Divinity: pick a creature within 30 ft; for a minute you have Advantage on attacks against it. If it drops to 0 HP, you can move the vow to another creature within 30 ft.") },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Fighting Style", "Paladin's Smite (Divine Smite)", "3 przygotowane czary"], en: ["Fighting Style", "Paladin's Smite (Divine Smite)", "3 prepared spells"] },
    3: { pl: ["Wybór przysięgi", "Channel Divinity (2 użycia)", "3 sloty 1. kręgu, 4 przygotowane czary"], en: ["Choose an oath", "Channel Divinity (2 uses)", "3 level 1 slots, 4 prepared spells"] },
    4: { pl: ["Feat albo +2 do cech", "5 przygotowanych czarów"], en: ["Feat or ability score increase", "5 prepared spells"] },
    5: { pl: ["Extra Attack: 2 ataki", "Faithful Steed", "Czary 2. kręgu: 2 sloty", "6 przygotowanych czarów", "PB +3"], en: ["Extra Attack: 2 attacks", "Faithful Steed", "Level 2 spells: 2 slots", "6 prepared spells", "Proficiency bonus +3"] },
  },
};
