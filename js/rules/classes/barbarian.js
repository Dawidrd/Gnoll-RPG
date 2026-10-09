// Barbarian, levels 1–5, 2024 rules. Descriptions are our own paraphrase.
import { signed } from "../core.js";

const rages = (L) => (L < 3 ? 2 : L < 6 ? 3 : L < 12 ? 4 : L < 17 ? 5 : 6);
const rageDmg = (L) => (L < 9 ? 2 : L < 16 ? 3 : 4);
const mastery = (L) => (L < 4 ? 2 : L < 10 ? 3 : 4);

export const barbarian = {
  id: "barbarian",
  source: "srd52",
  name: { pl: "Barbarzyńca (Barbarian)", en: "Barbarian" },
  maxLevel: 5,
  hitDie: 12,
  standardArray: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
  saves: ["str", "con"],
  skillChoices: { count: 2, from: ["animal", "athletics", "intimidation", "nature", "perception", "survival"] },
  armorTraining: ["light", "medium", "shield"],
  role: {
    pl: "Pierwsza linia drużyny. W Szale przyjmuje połowę obrażeń fizycznych i mocno oddaje, a Lekkomyślny atak daje mu Przewagę kosztem obrony.",
    en: "The party's front line. While raging they take half physical damage and hit hard; Reckless Attack trades defense for Advantage.",
  },
  unarmored: (c) => ({ value: 10 + c.mods.dex + c.mods.con, shieldOk: true, note: { pl: "10 + ZRĘ + KON, bez zbroi (tarcza dozwolona)", en: "10 + DEX + CON, no armor (shield allowed)" } }),
  speedBonus: (c) => (c.level >= 5 && !c.armor.heavy ? 10 : 0),

  resources: (c) => [
    { id: "rage", max: rages(c.level), recharge: "long", shortRegain: 1, name: { pl: "Szał (Rage)", en: "Rage" } },
  ],

  summary: (c) => {
    const rows = [
      { label: { pl: "Atak bronią (SIŁ)", en: "Weapon attack (STR)" }, value: signed(c.mods.str + c.pb),
        note: { pl: `do trafienia; obrażenia: kość broni ${signed(c.mods.str)}`, en: `to hit; damage: weapon die ${signed(c.mods.str)}` } },
      { label: { pl: "Premia z Szału", en: "Rage damage" }, value: "+" + rageDmg(c.level),
        note: { pl: "do obrażeń ataków SIŁ w Szale", en: "to STR attack damage while raging" } },
      { label: { pl: "Weapon Mastery", en: "Weapon Mastery" }, value: String(mastery(c.level)),
        note: { pl: "rodzaje broni z mistrzostwem", en: "kinds of weapons with mastery" } },
    ];
    if (c.level >= 5) rows.push({ label: { pl: "Ataki w akcji Attack", en: "Attacks per Attack action" }, value: "2", note: { pl: "Extra Attack", en: "Extra Attack" } });
    return rows;
  },

  features: [
    { lv: 1, id: "rage", name: { pl: "Rage (Szał)", en: "Rage" },
      desc: (c) => ({
        pl: `Akcja bonusowa, bez ciężkiej zbroi. W Szale: odporność na obrażenia obuchowe, kłute i cięte; +${rageDmg(c.level)} do obrażeń ataków SIŁ; Przewaga na testy i rzuty SIŁ; bez czarów i koncentracji. Trwa do końca Twojej następnej tury; przedłużasz go atakiem, zmuszeniem wroga do rzutu obronnego albo akcją bonusową, maks. 10 minut. ${rages(c.level)}× na długi odpoczynek, krótki odpoczynek oddaje jedno użycie.`,
        en: `Bonus action, not in heavy armor. While raging: resistance to bludgeoning, piercing and slashing; +${rageDmg(c.level)} damage on STR attacks; Advantage on STR checks and saves; no spells or concentration. Lasts until the end of your next turn; extend it by attacking, forcing a save, or a bonus action, up to 10 minutes. ${rages(c.level)}× per long rest; a short rest restores one use.`,
      }) },
    { lv: 1, id: "unarmored-defense", name: { pl: "Unarmored Defense (Obrona bez zbroi)", en: "Unarmored Defense" },
      desc: () => ({ pl: "Bez zbroi AC = 10 + ZRĘ + KON. Tarcza nie przeszkadza.", en: "Without armor your AC is 10 + DEX + CON. A shield is fine." }) },
    { lv: 1, id: "mastery", name: { pl: "Weapon Mastery (Mistrzostwo broni)", en: "Weapon Mastery" },
      desc: (c) => ({ pl: `Używasz właściwości mistrzowskich ${mastery(c.level)} rodzajów broni do walki wręcz. Po długim odpoczynku możesz zmienić jeden wybór.`,
        en: `You use the mastery properties of ${mastery(c.level)} kinds of melee weapons. After a long rest you can swap one choice.` }) },
    { lv: 2, id: "danger-sense", name: { pl: "Danger Sense (Wyczucie zagrożenia)", en: "Danger Sense" },
      desc: () => ({ pl: "Przewaga na rzuty obronne ZRĘ, chyba że jesteś Incapacitated.", en: "Advantage on DEX saving throws unless you're Incapacitated." }) },
    { lv: 2, id: "reckless", name: { pl: "Reckless Attack (Lekkomyślny atak)", en: "Reckless Attack" },
      desc: () => ({ pl: "Przy pierwszym ataku w turze decydujesz: do początku Twojej następnej tury masz Przewagę na ataki SIŁ, ale ataki na Ciebie też mają Przewagę.",
        en: "On your first attack of the turn, decide: until your next turn you have Advantage on STR attacks, but attacks against you have Advantage too." }) },
    { lv: 3, id: "subclass", name: { pl: "Podklasa (Ścieżka)", en: "Barbarian Subclass" },
      desc: () => ({ pl: "Wybierasz ścieżkę barbarzyńcy w edycji postaci. Jej zdolności pojawią się niżej.", en: "Choose your path in the character editor. Its features appear below." }) },
    { lv: 3, id: "primal-knowledge", name: { pl: "Primal Knowledge (Pierwotna wiedza)", en: "Primal Knowledge" },
      desc: () => ({ pl: "Jeszcze jedna umiejętność z listy barbarzyńcy (zaznacz ją w edycji). W Szale testy Akrobatyki, Zastraszania, Percepcji, Skradania i Przetrwania możesz robić na SIŁ.",
        en: "One more skill from the Barbarian list (tick it in the editor). While raging you can use STR for Acrobatics, Intimidation, Perception, Stealth and Survival checks." }) },
    { lv: 4, id: "asi", name: { pl: "Feat albo +2 do cech (ASI)", en: "Feat or Ability Score Improvement" },
      desc: () => ({ pl: "Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch). Zmień cechy w edycji.", en: "Pick a feat or +2 to one ability (or +1 to two). Update scores in the editor." }) },
    { lv: 5, id: "extra-attack", name: { pl: "Extra Attack (Dodatkowy atak)", en: "Extra Attack" },
      desc: () => ({ pl: "Akcja Attack daje 2 ataki zamiast jednego.", en: "The Attack action gives you two attacks instead of one." }) },
    { lv: 5, id: "fast-movement", name: { pl: "Fast Movement (Szybki ruch)", en: "Fast Movement" },
      desc: () => ({ pl: "+10 ft prędkości, gdy nie nosisz ciężkiej zbroi.", en: "+10 ft speed while not wearing heavy armor." }) },
  ],

  subclassLevel: 3,
  subclasses: {
    berserker: {
      source: "srd52", name: { pl: "Path of the Berserker (Ścieżka Berserkera)", en: "Path of the Berserker" },
      features: [
        { lv: 3, id: "frenzy", name: { pl: "Frenzy (Szaleństwo)", en: "Frenzy" },
          desc: (c) => ({ pl: `W Szale z Lekkomyślnym atakiem: pierwszy trafiony w turze cel dostaje dodatkowe ${rageDmg(c.level)}k6 obrażeń.`,
            en: `Raging and using Reckless Attack: the first target you hit on your turn takes an extra ${rageDmg(c.level)}d6 damage.` }) },
      ],
    },
    "wild-heart": {
      source: "phb2024", name: { pl: "Path of the Wild Heart (Ścieżka Dzikiego Serca)", en: "Path of the Wild Heart" },
      features: [
        { lv: 3, id: "animal-speaker", name: { pl: "Animal Speaker", en: "Animal Speaker" },
          desc: () => ({ pl: "Rzucasz Beast Sense i Speak with Animals jako rytuały (na MĄD).", en: "You cast Beast Sense and Speak with Animals as rituals (WIS)." }) },
        { lv: 3, id: "rage-wilds", name: { pl: "Rage of the Wilds (Szał dziczy)", en: "Rage of the Wilds" },
          desc: () => ({ pl: "Przy każdym Szale wybierasz: Niedźwiedź (odporność na wszystko poza mocą, nekrotycznymi, psychicznymi i promienistymi), Orzeł (Dash i Disengage w tej samej akcji bonusowej, potem oba jako akcja bonusowa), Wilk (sojusznicy mają Przewagę na ataki we wrogów obok Ciebie).",
            en: "Each time you rage, pick: Bear (resist everything but force, necrotic, psychic and radiant), Eagle (Dash and Disengage with that bonus action, then both as a bonus action), Wolf (allies have Advantage on attacks against enemies next to you)." }) },
      ],
    },
    "world-tree": {
      source: "phb2024", name: { pl: "Path of the World Tree (Ścieżka Drzewa Świata)", en: "Path of the World Tree" },
      features: [
        { lv: 3, id: "vitality", name: { pl: "Vitality of the Tree (Witalność drzewa)", en: "Vitality of the Tree" },
          desc: (c) => ({ pl: `Wchodząc w Szał dostajesz ${c.level} tymczasowych HP. Na początku każdej tury w Szale możesz dać sojusznikowi w 10 ft ${rageDmg(c.level)}k6 tymczasowych HP.`,
            en: `Entering a Rage gives you ${c.level} temporary HP. At the start of each turn while raging you can give an ally within 10 ft ${rageDmg(c.level)}d6 temporary HP.` }) },
      ],
    },
    zealot: {
      source: "phb2024", name: { pl: "Path of the Zealot (Ścieżka Zeloty)", en: "Path of the Zealot" },
      resources: () => [{ id: "gods", max: 4, recharge: "long", name: { pl: "Warrior of the Gods (k12)", en: "Warrior of the Gods (d12)" } }],
      features: [
        { lv: 3, id: "divine-fury", name: { pl: "Divine Fury (Boska furia)", en: "Divine Fury" },
          desc: (c) => ({ pl: `W Szale pierwszy trafiony w turze wróg dostaje dodatkowe 1k6 + ${Math.floor(c.level / 2)} obrażeń nekrotycznych albo promienistych.`,
            en: `While raging, the first creature you hit each turn takes an extra 1d6 + ${Math.floor(c.level / 2)} necrotic or radiant damage.` }) },
        { lv: 3, id: "warrior-gods", name: { pl: "Warrior of the Gods (Wojownik bogów)", en: "Warrior of the Gods" },
          desc: () => ({ pl: "Pula 4 kości k12. Akcją bonusową wydajesz dowolną liczbę i leczysz się o wynik. Pula wraca po długim odpoczynku.",
            en: "A pool of four d12s. As a bonus action spend any number and heal that much. The pool refills on a long rest." }) },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Danger Sense", "Reckless Attack"], en: ["Danger Sense", "Reckless Attack"] },
    3: { pl: ["Wybór podklasy", "Primal Knowledge: dodatkowa umiejętność", "3 użycia Szału"], en: ["Choose a subclass", "Primal Knowledge: one more skill", "3 Rages"] },
    4: { pl: ["Feat albo +2 do cech", "Weapon Mastery: 3 rodzaje broni"], en: ["Feat or ability score increase", "Weapon Mastery: 3 kinds of weapons"] },
    5: { pl: ["Extra Attack", "Fast Movement +10 ft", "PB +3"], en: ["Extra Attack", "Fast Movement +10 ft", "Proficiency bonus +3"] },
  },
};
