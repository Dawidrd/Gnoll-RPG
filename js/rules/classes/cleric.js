// Cleric, levels 1–5, 2024 rules. Descriptions are our own paraphrase.
import { signed } from "../core.js";

const SLOTS = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2] };
const PREPARED = { 1: 4, 2: 5, 3: 6, 4: 7, 5: 9 };
const cdUses = (L) => (L < 2 ? 0 : L < 6 ? 2 : L < 18 ? 3 : 4);
const atLeast1 = (n) => Math.max(1, n);
const domain = (byLevel) => (L) => Object.entries(byLevel).filter(([lv]) => +lv <= L).flatMap(([, s]) => s);

export const cleric = {
  id: "cleric",
  source: "srd52",
  name: { pl: "Kleryk (Cleric)", en: "Cleric" },
  maxLevel: 5,
  hitDie: 8,
  standardArray: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 },
  saves: ["wis", "cha"],
  skillChoices: { count: 2, from: ["history", "insight", "medicine", "persuasion", "religion"] },
  armorTraining: ["light", "medium", "shield"],
  role: {
    pl: "Uzdrowiciel i wsparcie drużyny z boską mocą. Leczy, wzmacnia sojuszników, odpędza nieumarłych i dobrze znosi walkę w zbroi.",
    en: "The party's healer and support, channeling divine power. Heals, buffs allies, turns undead and holds up well in armor.",
  },

  /** Choices made at level 1. */
  choices: {
    order: {
      lv: 1, label: { pl: "Divine Order (Boski porządek)", en: "Divine Order" }, default: "protector",
      options: {
        protector: { pl: "Protector (Obrońca): ciężkie zbroje i broń wojenna", en: "Protector: heavy armor and martial weapons" },
        thaumaturge: { pl: "Thaumaturge (Cudotwórca): +1 sztuczka, premia do Arcany i Religii", en: "Thaumaturge: +1 cantrip, bonus to Arcana and Religion" },
      },
    },
  },
  extraArmorTraining: (c) => (c.classChoices.order === "protector" ? ["heavy"] : []),
  skillBonus: (c, skill) => (c.classChoices.order === "thaumaturge" && (skill === "arcana" || skill === "religion") ? atLeast1(c.mods.wis) : 0),

  spellcasting: (L, c) => ({
    ability: "wis", list: { pl: "kleryka", en: "Cleric" },
    cantrips: (L < 4 ? 3 : 4) + (c.classChoices.order === "thaumaturge" ? 1 : 0),
    prepared: PREPARED[L], slots: SLOTS[L],
  }),

  resources: (c) => [
    { id: "channel", max: cdUses(c.level), recharge: "long", shortRegain: 1, name: { pl: "Channel Divinity", en: "Channel Divinity" } },
  ],

  summary: (c) => {
    const rows = [
      { label: { pl: "Atak bronią (SIŁ)", en: "Weapon attack (STR)" }, value: signed(c.mods.str + c.pb), note: { pl: `obrażenia: kość broni ${signed(c.mods.str)}`, en: `damage: weapon die ${signed(c.mods.str)}` } },
    ];
    if (c.level >= 2) rows.push({ label: { pl: "Divine Spark", en: "Divine Spark" }, value: { pl: `1k8 ${signed(c.mods.wis)}`, en: `1d8 ${signed(c.mods.wis)}` },
      note: { pl: "leczenie albo obrażenia promieniste/nekrotyczne", en: "healing or radiant/necrotic damage" } });
    return rows;
  },

  features: [
    { lv: 1, id: "spellcasting", name: { pl: "Spellcasting (Czary)", en: "Spellcasting" },
      desc: (c) => {
        const s = cleric.spellcasting(c.level, c);
        return { pl: `Czary kleryka na MĄD. ${s.cantrips} sztuczki, ${s.prepared} przygotowanych czarów; listę zmieniasz po długim odpoczynku. Sloty: ${s.slots.map((n, i) => `${n}× ${i + 1}. krąg`).join(", ")}.`,
          en: `Cleric spells using WIS. ${s.cantrips} cantrips, ${s.prepared} prepared spells; change the list after a long rest. Slots: ${s.slots.map((n, i) => `${n}× level ${i + 1}`).join(", ")}.` };
      } },
    { lv: 1, id: "divine-order", name: { pl: "Divine Order (Boski porządek)", en: "Divine Order" },
      desc: (c) => (c.classChoices.order === "thaumaturge"
        ? { pl: `Thaumaturge: jedna sztuczka więcej i +${atLeast1(c.mods.wis)} do testów INT (Arcana, Religion). Już wliczone.`, en: `Thaumaturge: one extra cantrip and +${atLeast1(c.mods.wis)} to INT (Arcana, Religion) checks. Already included.` }
        : { pl: "Protector: biegłość w broni wojennej i ciężkich zbrojach.", en: "Protector: proficiency with martial weapons and heavy armor." }) },
    { lv: 2, id: "channel", name: { pl: "Channel Divinity (Boska moc)", en: "Channel Divinity" },
      desc: (c) => ({
        pl: `${cdUses(c.level)} użycia, krótki odpoczynek oddaje jedno. Divine Spark (akcja Magic): istota w 30 ft — leczenie 1k8 ${signed(c.mods.wis)} albo tyle obrażeń promienistych lub nekrotycznych (rzut KON na połowę). Turn Undead (akcja Magic): nieumarli w 30 ft rzucają MĄD; porażka = przestraszeni i obezwładnieni na minutę albo do otrzymania obrażeń.`,
        en: `${cdUses(c.level)} uses; a short rest restores one. Divine Spark (Magic action): a creature within 30 ft — heal 1d8 ${signed(c.mods.wis)}, or deal that much radiant or necrotic damage (CON save for half). Turn Undead (Magic action): undead within 30 ft make a WIS save; on a fail they're Frightened and Incapacitated for a minute or until damaged.`,
      }) },
    { lv: 3, id: "subclass", name: { pl: "Domena (Cleric Subclass)", en: "Cleric Subclass" },
      desc: () => ({ pl: "Wybierasz domenę w edycji postaci. Jej zdolności i czary pojawią się niżej.", en: "Choose your domain in the character editor. Its features and spells appear below." }) },
    { lv: 4, id: "asi", name: { pl: "Feat albo +2 do cech (ASI)", en: "Feat or Ability Score Improvement" },
      desc: () => ({ pl: "Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch). Zmień cechy w edycji.", en: "Pick a feat or +2 to one ability (or +1 to two). Update scores in the editor." }) },
    { lv: 5, id: "sear-undead", name: { pl: "Sear Undead (Spalenie nieumarłych)", en: "Sear Undead" },
      desc: (c) => ({ pl: `Przy Turn Undead nieumarli, którzy oblali rzut, dostają ${atLeast1(c.mods.wis)}k8 obrażeń promienistych.`, en: `When you use Turn Undead, undead that fail take ${atLeast1(c.mods.wis)}d8 radiant damage.` }) },
  ],

  subclassLevel: 3,
  subclasses: {
    life: {
      source: "srd52", name: { pl: "Life Domain (Domena Życia)", en: "Life Domain" },
      domainSpells: domain({ 3: ["Aid", "Bless", "Cure Wounds", "Lesser Restoration"], 5: ["Mass Healing Word", "Revivify"] }),
      features: [
        { lv: 3, id: "disciple", name: { pl: "Disciple of Life (Uczeń życia)", en: "Disciple of Life" },
          desc: () => ({ pl: "Czar leczący rzucony ze slotu leczy dodatkowo 2 + krąg slotu.", en: "A healing spell cast with a slot heals an extra 2 + the slot's level." }) },
        { lv: 3, id: "preserve", name: { pl: "Preserve Life (Ochrona życia)", en: "Preserve Life" },
          desc: (c) => ({ pl: `Channel Divinity (akcja Magic): rozdzielasz ${5 * c.level} HP między ranne (Bloodied) istoty w 30 ft, każdej najwyżej do połowy jej maksymalnych HP.`,
            en: `Channel Divinity (Magic action): split ${5 * c.level} HP among Bloodied creatures within 30 ft, each up to half its maximum HP.` }) },
      ],
    },
    light: {
      source: "phb2024", name: { pl: "Light Domain (Domena Światła)", en: "Light Domain" },
      domainSpells: domain({ 3: ["Burning Hands", "Faerie Fire", "Scorching Ray", "See Invisibility"], 5: ["Daylight", "Fireball"] }),
      resources: (c) => [{ id: "flare", max: atLeast1(c.mods.wis), recharge: "long", name: { pl: "Warding Flare", en: "Warding Flare" } }],
      features: [
        { lv: 3, id: "dawn", name: { pl: "Radiance of the Dawn (Blask świtu)", en: "Radiance of the Dawn" },
          desc: (c) => ({ pl: `Channel Divinity (akcja Magic): rozpraszasz magiczną ciemność w 30 ft, a wybrani wrogowie rzucają KON: 2k10 + ${c.level} obrażeń promienistych, połowa przy sukcesie.`,
            en: `Channel Divinity (Magic action): dispel magical darkness within 30 ft; chosen enemies make a CON save, taking 2d10 + ${c.level} radiant damage, half on a success.` }) },
        { lv: 3, id: "flare", name: { pl: "Warding Flare (Ochronny błysk)", en: "Warding Flare" },
          desc: (c) => ({ pl: `Reakcja, gdy ktoś w 30 ft atakuje Ciebie albo sojusznika: atak ma Utrudnienie. ${atLeast1(c.mods.wis)}× na długi odpoczynek.`,
            en: `Reaction when a creature within 30 ft attacks you or an ally: the attack has Disadvantage. ${atLeast1(c.mods.wis)}× per long rest.` }) },
      ],
    },
    trickery: {
      source: "phb2024", name: { pl: "Trickery Domain (Domena Podstępu)", en: "Trickery Domain" },
      domainSpells: domain({ 3: ["Charm Person", "Disguise Self", "Invisibility", "Pass without Trace"], 5: ["Hypnotic Pattern", "Nondetection"] }),
      features: [
        { lv: 3, id: "blessing", name: { pl: "Blessing of the Trickster", en: "Blessing of the Trickster" },
          desc: () => ({ pl: "Akcja Magic: Ty albo chętna istota w 30 ft macie Przewagę na Skradanie do Twojego długiego odpoczynku.", en: "Magic action: you or a willing creature within 30 ft gets Advantage on Stealth until your next long rest." }) },
        { lv: 3, id: "duplicity", name: { pl: "Invoke Duplicity (Sobowtór)", en: "Invoke Duplicity" },
          desc: () => ({ pl: "Channel Divinity (akcja bonusowa): iluzja Ciebie na minutę. Możesz rzucać czary z jej miejsca i masz Przewagę na ataki we wrogów obok niej; przesuwasz ją akcją bonusową.",
            en: "Channel Divinity (bonus action): an illusion of you for a minute. You can cast spells from its space and have Advantage on attacks against enemies next to it; move it with a bonus action." }) },
      ],
    },
    war: {
      source: "phb2024", name: { pl: "War Domain (Domena Wojny)", en: "War Domain" },
      domainSpells: domain({ 3: ["Guiding Bolt", "Magic Weapon", "Shield of Faith", "Spiritual Weapon"], 5: ["Crusader's Mantle", "Spirit Guardians"] }),
      resources: (c) => [{ id: "warpriest", max: atLeast1(c.mods.wis), recharge: "short", name: { pl: "War Priest", en: "War Priest" } }],
      features: [
        { lv: 3, id: "guided", name: { pl: "Guided Strike (Prowadzony cios)", en: "Guided Strike" },
          desc: () => ({ pl: "Channel Divinity: gdy Ty albo sojusznik w 30 ft chybiacie atakiem, dodajesz +10 do tego rzutu.", en: "Channel Divinity: when you or an ally within 30 ft misses with an attack, add +10 to that roll." }) },
        { lv: 3, id: "war-priest", name: { pl: "War Priest (Kapłan wojny)", en: "War Priest" },
          desc: (c) => ({ pl: `Akcją bonusową jeden atak bronią albo ciosem. ${atLeast1(c.mods.wis)}× na krótki odpoczynek.`, en: `One weapon or unarmed attack as a bonus action. ${atLeast1(c.mods.wis)}× per short rest.` }) },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Channel Divinity: Divine Spark, Turn Undead (2 użycia)", "5 przygotowanych czarów, 3 sloty 1. kręgu"], en: ["Channel Divinity: Divine Spark, Turn Undead (2 uses)", "5 prepared spells, 3 level 1 slots"] },
    3: { pl: ["Wybór domeny (czary zawsze przygotowane)", "Czary 2. kręgu: 2 sloty", "6 przygotowanych czarów"], en: ["Choose a domain (always-prepared spells)", "Level 2 spells: 2 slots", "6 prepared spells"] },
    4: { pl: ["Feat albo +2 do cech", "Dodatkowa sztuczka", "7 przygotowanych czarów"], en: ["Feat or ability score increase", "One more cantrip", "7 prepared spells"] },
    5: { pl: ["Sear Undead", "Czary 3. kręgu: 2 sloty", "9 przygotowanych czarów", "PB +3"], en: ["Sear Undead", "Level 3 spells: 2 slots", "9 prepared spells", "Proficiency bonus +3"] },
  },
};
