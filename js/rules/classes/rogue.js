// Rogue, levels 1–5, 2024 rules. Descriptions are our own paraphrase.
import { signed } from "../core.js";

const sneak = (L) => Math.ceil(L / 2) + "d6";
const psiDice = (L) => (L < 5 ? 4 : L < 9 ? 6 : L < 13 ? 8 : L < 17 ? 10 : 12);
const psiDie = (L) => (L < 5 ? "6" : L < 11 ? "8" : L < 17 ? "10" : "12");

export const rogue = {
  id: "rogue",
  source: "srd52",
  name: { pl: "Łotr (Rogue)", en: "Rogue" },
  maxLevel: 5,
  hitDie: 8,
  standardArray: { str: 12, dex: 15, con: 13, int: 14, wis: 10, cha: 8 },
  saves: ["dex", "int"],
  skillChoices: { count: 4, from: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleight", "stealth"] },
  expertise: (L) => (L < 6 ? 2 : 4),
  classTools: { pl: "Narzędzia złodziejskie (klasa)", en: "Thieves' Tools (class)" },
  armorTraining: ["light"],
  role: {
    pl: "Precyzyjny zabójca i specjalista od zamków, pułapek i rozmów. Raz na turę dokłada Sneak Attack, gdy ma Przewagę albo sojusznika obok celu.",
    en: "A precise striker and the expert at locks, traps and talk. Once per turn they add Sneak Attack when they have Advantage or an ally next to the target.",
  },

  summary: (c) => {
    const dc = 8 + c.mods.dex + c.pb;
    const rows = [
      { label: { pl: "Atak bronią finezyjną lub dystansową", en: "Finesse or ranged attack" }, value: signed(c.mods.dex + c.pb),
        note: { pl: `ZRĘ; obrażenia: kość broni ${signed(c.mods.dex)}`, en: `DEX; damage: weapon die ${signed(c.mods.dex)}` } },
      { label: { pl: "Sneak Attack", en: "Sneak Attack" }, value: sneak(c.level),
        note: { pl: "raz na turę, z Przewagą albo z sojusznikiem obok celu", en: "once per turn, with Advantage or an ally next to the target" } },
    ];
    if (c.level >= 5) rows.push({ label: { pl: "DC Cunning Strike", en: "Cunning Strike DC" }, value: String(dc), note: { pl: "8 + ZRĘ + PB", en: "8 + DEX + PB" } });
    return rows;
  },

  features: [
    { lv: 1, id: "expertise", name: { pl: "Expertise (Specjalizacja)", en: "Expertise" },
      desc: () => ({ pl: "W dwóch umiejętnościach, w których masz biegłość, premia z biegłości liczy się podwójnie. Zaznacz je w edycji (polecane: Zręczne palce i Skradanie).",
        en: "In two skills you're proficient in, your proficiency bonus is doubled. Tick them in the editor (Sleight of Hand and Stealth are recommended)." }) },
    { lv: 1, id: "sneak", name: { pl: "Sneak Attack (Atak z zaskoczenia)", en: "Sneak Attack" },
      desc: (c) => ({ pl: `Raz na turę +${sneak(c.level)} obrażeń, gdy trafiasz bronią finezyjną albo dystansową i masz Przewagę, albo gdy sojusznik stoi obok celu (a Ty nie masz Utrudnienia).`,
        en: `Once per turn, +${sneak(c.level)} damage when you hit with a finesse or ranged weapon and have Advantage, or an ally stands next to the target (and you don't have Disadvantage).` }) },
    { lv: 1, id: "cant", name: { pl: "Thieves' Cant (Złodziejska gwara)", en: "Thieves' Cant" },
      desc: () => ({ pl: "Znasz złodziejską gwarę i jeden dodatkowy język (wpisz go w „Inne narzędzia i języki”).", en: "You know Thieves' Cant and one extra language (note it under “Other tools and languages”)." }) },
    { lv: 1, id: "mastery", name: { pl: "Weapon Mastery (Mistrzostwo broni)", en: "Weapon Mastery" },
      desc: () => ({ pl: "Używasz właściwości mistrzowskich 2 rodzajów broni, np. sztyletu i krótkiego łuku.", en: "You use the mastery properties of 2 kinds of weapons, such as dagger and shortbow." }) },
    { lv: 2, id: "cunning-action", name: { pl: "Cunning Action (Przebiegła akcja)", en: "Cunning Action" },
      desc: () => ({ pl: "Dash, Disengage albo Hide jako akcja bonusowa.", en: "Dash, Disengage or Hide as a bonus action." }) },
    { lv: 3, id: "subclass", name: { pl: "Podklasa łotra", en: "Rogue Subclass" },
      desc: () => ({ pl: "Wybierasz podklasę w edycji postaci. Jej zdolności pojawią się niżej.", en: "Choose your subclass in the character editor. Its features appear below." }) },
    { lv: 3, id: "steady-aim", name: { pl: "Steady Aim (Pewne celowanie)", en: "Steady Aim" },
      desc: () => ({ pl: "Akcja bonusowa, jeśli w tej turze się nie ruszałeś: Przewaga na następny atak. Potem prędkość 0 do końca tury.",
        en: "Bonus action, if you haven't moved this turn: Advantage on your next attack. Your speed is then 0 for the rest of the turn." }) },
    { lv: 4, id: "asi", name: { pl: "Feat albo +2 do cech (ASI)", en: "Feat or Ability Score Improvement" },
      desc: () => ({ pl: "Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch). Zmień cechy w edycji.", en: "Pick a feat or +2 to one ability (or +1 to two). Update scores in the editor." }) },
    { lv: 5, id: "cunning-strike", name: { pl: "Cunning Strike (Przebiegłe uderzenie)", en: "Cunning Strike" },
      desc: (c) => ({ pl: `Gdy zadajesz Sneak Attack, możesz oddać 1k6 z jego kości za efekt (DC ${8 + c.mods.dex + c.pb}): Poison (KON albo Poisoned na minutę; potrzebny zestaw trucicielski), Trip (ZRĘ albo powalony, cel Duży lub mniejszy), Withdraw (od razu ruch o połowę prędkości bez ataków okazyjnych).`,
        en: `When you deal Sneak Attack, give up 1d6 of it for an effect (DC ${8 + c.mods.dex + c.pb}): Poison (CON or Poisoned for a minute; needs a Poisoner's Kit), Trip (DEX or Prone, Large or smaller), Withdraw (move half your speed right away without opportunity attacks).` }) },
    { lv: 5, id: "uncanny-dodge", name: { pl: "Uncanny Dodge (Niesamowity unik)", en: "Uncanny Dodge" },
      desc: () => ({ pl: "Reakcja, gdy trafia Cię widoczny napastnik: obrażenia z tego ataku o połowę.", en: "Reaction when an attacker you can see hits you: halve that attack's damage." }) },
  ],

  subclassLevel: 3,
  subclasses: {
    "arcane-trickster": {
      source: "phb2024", name: { pl: "Arcane Trickster (Magiczny Oszust)", en: "Arcane Trickster" },
      spellcasting: (L) => (L < 3 ? null : { ability: "int", list: { pl: "czarodzieja", en: "Wizard" }, cantrips: L < 10 ? 3 : 4, prepared: L < 4 ? 3 : L < 7 ? 4 : 5, slots: L < 4 ? [2] : L < 7 ? [3] : [4, 2] }),
      features: [
        { lv: 3, id: "at-spellcasting", name: { pl: "Spellcasting (Czary)", en: "Spellcasting" },
          desc: (c) => ({ pl: `Czary z listy czarodzieja na INT: 3 sztuczki (w tym Mage Hand) i ${c.level < 4 ? 3 : 4} przygotowane czary 1. kręgu. Sloty wracają po długim odpoczynku.`,
            en: `Wizard spells using INT: 3 cantrips (including Mage Hand) and ${c.level < 4 ? 3 : 4} prepared level 1 spells. Slots return on a long rest.` }) },
        { lv: 3, id: "legerdemain", name: { pl: "Mage Hand Legerdemain", en: "Mage Hand Legerdemain" },
          desc: () => ({ pl: "Mage Hand rzucasz akcją bonusową, może być niewidzialna i robi za Ciebie testy Zręcznych palców.", en: "You cast Mage Hand as a bonus action; it can be invisible and make Sleight of Hand checks for you." }) },
      ],
    },
    assassin: {
      source: "phb2024", name: { pl: "Assassin (Zabójca)", en: "Assassin" },
      features: [
        { lv: 3, id: "assassinate", name: { pl: "Assassinate (Zamach)", en: "Assassinate" },
          desc: (c) => ({ pl: `Przewaga na Inicjatywę. W pierwszej rundzie walki masz Przewagę na ataki w każdego, kto jeszcze nie miał tury, a cel trafiony Sneak Attack dostaje dodatkowe ${c.level} obrażeń.`,
            en: `Advantage on Initiative. In the first round you have Advantage on attacks against anyone who hasn't taken a turn, and a Sneak Attack target takes an extra ${c.level} damage.` }) },
        { lv: 3, id: "assassin-tools", name: { pl: "Assassin's Tools", en: "Assassin's Tools" },
          desc: () => ({ pl: "Masz zestaw do przebrań i zestaw trucicielski oraz biegłość w nich.", en: "You have a Disguise Kit and a Poisoner's Kit and are proficient with both." }) },
      ],
    },
    soulknife: {
      source: "phb2024", name: { pl: "Soulknife (Psioniczne Ostrze)", en: "Soulknife" },
      resources: (c) => [{ id: "psi", max: psiDice(c.level), recharge: "long", shortRegain: 1, name: { pl: `Kości psioniczne (k${psiDie(c.level)})`, en: `Psionic Energy Dice (d${psiDie(c.level)})` } }],
      features: [
        { lv: 3, id: "psionic-power", name: { pl: "Psionic Power (Moc psioniczna)", en: "Psionic Power" },
          desc: (c) => ({ pl: `${psiDice(c.level)} kości k${psiDie(c.level)}. Po nieudanym teście umiejętności, w której masz biegłość, dodajesz kość (zużywa się tylko przy sukcesie). Telepatia z kilkoma istotami na tyle godzin, ile wyrzucisz. Krótki odpoczynek oddaje jedną kość.`,
            en: `${psiDice(c.level)} d${psiDie(c.level)} dice. After failing a check with a proficient skill, add a die (it's spent only on success). Telepathy with a few creatures for as many hours as you roll. A short rest restores one die.` }) },
        { lv: 3, id: "psychic-blades", name: { pl: "Psychic Blades (Ostrza psychiczne)", en: "Psychic Blades" },
          desc: (c) => ({ pl: `Przy akcji Attack tworzysz ostrze: finezyjne, rzucane 60/120 ft, 1k6 ${signed(c.mods.dex)} obrażeń psychicznych. Drugie ostrze jako akcja bonusowa zadaje 1k4.`,
            en: `With the Attack action you form a blade: finesse, thrown 60/120 ft, 1d6 ${signed(c.mods.dex)} psychic damage. A second blade as a bonus action deals 1d4.` }) },
      ],
    },
    thief: {
      source: "srd52", name: { pl: "Thief (Złodziej)", en: "Thief" },
      features: [
        { lv: 3, id: "fast-hands", name: { pl: "Fast Hands (Szybkie ręce)", en: "Fast Hands" },
          desc: () => ({ pl: "Akcją bonusową: test Zręcznych palców (zamek, pułapka, kieszeń), akcja Utilize albo użycie magicznego przedmiotu.", en: "As a bonus action: a Sleight of Hand check (lock, trap, pocket), the Utilize action, or using a magic item." }) },
        { lv: 3, id: "second-story", name: { pl: "Second-Story Work (Praca na piętrze)", en: "Second-Story Work" },
          desc: () => ({ pl: "Prędkość wspinaczki równa zwykłej. Długość skoku liczysz z ZRĘ zamiast SIŁ.", en: "Climb speed equal to your speed. You use DEX instead of STR for jump distance." }) },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Cunning Action: Dash, Disengage, Hide jako akcja bonusowa"], en: ["Cunning Action: Dash, Disengage, Hide as a bonus action"] },
    3: { pl: ["Wybór podklasy", "Steady Aim", "Sneak Attack 2k6"], en: ["Choose a subclass", "Steady Aim", "Sneak Attack 2d6"] },
    4: { pl: ["Feat albo +2 do cech"], en: ["Feat or ability score increase"] },
    5: { pl: ["Cunning Strike", "Uncanny Dodge", "Sneak Attack 3k6", "PB +3"], en: ["Cunning Strike", "Uncanny Dodge", "Sneak Attack 3d6", "Proficiency bonus +3"] },
  },
};
