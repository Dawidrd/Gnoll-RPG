// Monk, levels 1–5, 2024 rules. Descriptions are our own paraphrase.
import { signed } from "../core.js";

const martialDie = (L) => (L < 5 ? "d6" : L < 11 ? "d8" : L < 17 ? "d10" : "d12");
const speedBonus = (L) => (L < 2 ? 0 : L < 6 ? 10 : L < 10 ? 15 : L < 14 ? 20 : L < 18 ? 25 : 30);

export const monk = {
  id: "monk",
  source: "srd52",
  name: { pl: "Mnich (Monk)", en: "Monk" },
  maxLevel: 5,
  hitDie: 8,
  // Recommended standard array from the 2024 rules.
  standardArray: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 },
  saves: ["str", "dex"],
  subclassLevel: 3,
  subclasses: {
    mercy: {
      source: "phb2024", name: { pl: "Warrior of Mercy (Wojownik Miłosierdzia)", en: "Warrior of Mercy" },
      features: [
        { lv: 3, id: "hand-of-harm", name: { pl: "Hand of Harm (Dłoń krzywdy)", en: "Hand of Harm" },
          desc: (c) => ({ pl: `Raz na turę po trafieniu ciosem, za 1 FP: dodatkowe 1${martialDie(c.level)} ${signed(c.mods.wis)} obrażeń nekrotycznych.`,
            en: `Once per turn after an unarmed hit, spend 1 FP: an extra 1${martialDie(c.level)} ${signed(c.mods.wis)} necrotic damage.` }) },
        { lv: 3, id: "hand-of-healing", name: { pl: "Hand of Healing (Dłoń uzdrowienia)", en: "Hand of Healing" },
          desc: (c) => ({ pl: `Akcja Magic za 1 FP: leczysz istotę, której dotykasz, o 1${martialDie(c.level)} ${signed(c.mods.wis)} HP. Możesz też zastąpić tym jeden cios z Flurry of Blows.`,
            en: `Magic action, 1 FP: heal a creature you touch for 1${martialDie(c.level)} ${signed(c.mods.wis)} HP. You can also swap one Flurry of Blows strike for this.` }) },
        { lv: 3, id: "implements", name: { pl: "Implements of Mercy (Narzędzia miłosierdzia)", en: "Implements of Mercy" },
          desc: () => ({ pl: "Biegłość w Insight i Medicine oraz w zestawie zielarskim.", en: "Proficiency in Insight, Medicine and the Herbalism Kit." }) },
      ],
    },
    shadow: {
      source: "phb2024", name: { pl: "Warrior of Shadow (Wojownik Cienia)", en: "Warrior of Shadow" },
      features: [
        { lv: 3, id: "shadow-arts", name: { pl: "Shadow Arts (Sztuki cienia)", en: "Shadow Arts" },
          desc: () => ({ pl: "Za 1 FP rzucasz czar Darkness bez komponentów; widzisz przez tę ciemność i możesz ją przesuwać. Dostajesz Darkvision 60 ft (lub +60 ft) i sztuczkę Minor Illusion.",
            en: "Spend 1 FP to cast Darkness without components; you see through it and can move it. You gain Darkvision 60 ft (or +60 ft) and the Minor Illusion cantrip." }) },
      ],
    },
    elements: {
      source: "phb2024", name: { pl: "Warrior of the Elements (Wojownik Żywiołów)", en: "Warrior of the Elements" },
      features: [
        { lv: 3, id: "attunement", name: { pl: "Elemental Attunement (Zestrojenie z żywiołami)", en: "Elemental Attunement" },
          desc: () => ({ pl: "Na początku tury za 1 FP, na 10 minut: ciosy sięgają 10 ft dalej, mogą zadawać kwas, zimno, ogień, błyskawice albo grzmot, a po trafieniu wróg rzuca SIŁ albo zostaje przesunięty o 10 ft.",
            en: "At the start of your turn, spend 1 FP for 10 minutes: unarmed strikes reach 10 ft further, can deal acid, cold, fire, lightning or thunder damage, and a hit forces a STR save or moves the target 10 ft." }) },
        { lv: 3, id: "manipulate", name: { pl: "Manipulate Elements", en: "Manipulate Elements" },
          desc: () => ({ pl: "Znasz sztuczkę Elementalism.", en: "You know the Elementalism cantrip." }) },
      ],
    },
    "open-hand": {
      source: "srd52", name: { pl: "Warrior of the Open Hand (Wojownik Otwartej Dłoni)", en: "Warrior of the Open Hand" },
      features: [
        { lv: 3, id: "open-hand-technique", name: { pl: "Open Hand Technique (Technika otwartej dłoni)", en: "Open Hand Technique" },
          desc: (c) => ({ pl: `Każdy cios z Flurry of Blows, który trafi, może dodatkowo: odebrać wrogowi Reakcję do jego następnej tury, odepchnąć go o 15 ft (SIŁ przeciw DC ${8 + c.mods.wis + c.pb}) albo powalić (ZRĘ przeciw DC ${8 + c.mods.wis + c.pb}).`,
            en: `Each Flurry of Blows strike that hits can also: take away the target's Reaction until its next turn, push it 15 ft (STR save, DC ${8 + c.mods.wis + c.pb}) or knock it Prone (DEX save, DC ${8 + c.mods.wis + c.pb}).` }) },
      ],
    },
  },
  skillChoices: { count: 2, from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
  role: {
    pl: "Mobilny wojownik walczący gołymi rękami. Doskakuje do słabszych wrogów, uderza kilka razy na turę i odchodzi bez ataków okazyjnych.",
    en: "A mobile unarmed fighter. Rushes the weaker enemies, strikes several times a turn and slips away without opportunity attacks.",
  },

  /** Armor class without armor: 10 + DEX + WIS. */
  armorClass: (c) => ({ value: 10 + c.mods.dex + c.mods.wis, note: { pl: "10 + ZRĘ + MĄD, bez zbroi i tarczy", en: "10 + DEX + WIS, no armor or shield" } }),
  speedBonus: (c) => speedBonus(c.level),

  resources: (c) => [
    { id: "focus", max: c.level >= 2 ? c.level : 0, recharge: "short",
      name: { pl: "Focus Points", en: "Focus Points" } },
    { id: "metabolism", max: c.level >= 2 ? 1 : 0, recharge: "long",
      name: { pl: "Uncanny Metabolism", en: "Uncanny Metabolism" } },
  ],

  summary: (c) => {
    const die = martialDie(c.level);
    const hit = c.mods.dex + c.pb;
    const dc = 8 + c.mods.wis + c.pb;
    const rows = [
      { label: { pl: "Cios", en: "Unarmed strike" }, value: `${signed(hit)}, 1${die}${signed(c.mods.dex)}`,
        note: { pl: "Obuchowe; także jako akcja bonusowa", en: "Bludgeoning; also as a bonus action" } },
    ];
    if (c.level >= 5) rows.push({ label: { pl: "Ataki w akcji Attack", en: "Attacks per Attack action" }, value: "2", note: { pl: "Extra Attack", en: "Extra Attack" } });
    if (c.level >= 2) rows.push({ label: { pl: "DC technik", en: "Focus save DC" }, value: String(dc),
      note: { pl: "Rzuty obronne przeciw Twoim technikom", en: "Saves against your Focus techniques" } });
    return rows;
  },

  features: [
    { lv: 1, id: "martial-arts", name: { pl: "Martial Arts (Sztuki walki)", en: "Martial Arts" },
      desc: (c) => ({
        pl: `Ciosy bez broni i bronie mnisze używają ZRĘ zamiast SIŁ, a obrażenia to kość ${martialDie(c.level)}. Po akcji Attack możesz wyprowadzić dodatkowy cios jako akcję bonusową. Działa bez zbroi i tarczy.`,
        en: `Unarmed strikes and Monk weapons can use DEX instead of STR and deal a ${martialDie(c.level)} die. After the Attack action you can make one extra unarmed strike as a bonus action. Works without armor or shield.`,
      }) },
    { lv: 1, id: "unarmored-defense", name: { pl: "Unarmored Defense (Obrona bez zbroi)", en: "Unarmored Defense" },
      desc: () => ({ pl: "Bez zbroi i tarczy AC = 10 + ZRĘ + MĄD.", en: "Without armor or a shield your AC equals 10 + DEX + WIS." }) },
    { lv: 2, id: "focus", name: { pl: "Monk's Focus (Skupienie)", en: "Monk's Focus" },
      desc: (c) => ({
        pl: `Masz ${c.level} Focus Points; wracają po krótkim odpoczynku. Flurry of Blows: za 1 FP dwa ciosy jako akcja bonusowa. Patient Defense: Disengage jako akcja bonusowa za darmo, a za 1 FP także Dodge. Step of the Wind: Dash jako akcja bonusowa za darmo, a za 1 FP także Disengage i dwa razy dłuższy skok.`,
        en: `You have ${c.level} Focus Points, regained on a short rest. Flurry of Blows: 1 FP for two unarmed strikes as a bonus action. Patient Defense: free Disengage as a bonus action, or Disengage and Dodge for 1 FP. Step of the Wind: free Dash as a bonus action, or Dash and Disengage with doubled jump distance for 1 FP.`,
      }) },
    { lv: 2, id: "unarmored-movement", name: { pl: "Unarmored Movement (Ruch bez zbroi)", en: "Unarmored Movement" },
      desc: (c) => ({ pl: `+${speedBonus(c.level)} ft prędkości bez zbroi i tarczy.`, en: `+${speedBonus(c.level)} ft speed without armor or shield.` }) },
    { lv: 2, id: "uncanny-metabolism", name: { pl: "Uncanny Metabolism (Niezwykły metabolizm)", en: "Uncanny Metabolism" },
      desc: (c) => ({
        pl: `Raz na długi odpoczynek, przy rzucie na Inicjatywę: odzyskujesz wszystkie Focus Points i leczysz 1${martialDie(c.level)} + ${c.level} HP.`,
        en: `Once per long rest, when you roll Initiative: regain all Focus Points and heal 1${martialDie(c.level)} + ${c.level} HP.`,
      }) },
    { lv: 3, id: "deflect", name: { pl: "Deflect Attacks (Odbicie ataku)", en: "Deflect Attacks" },
      desc: (c) => ({
        pl: `Reakcja, gdy trafia Cię atak zadający obrażenia obuchowe, kłute albo cięte: obrażenia maleją o 1d10 ${signed(c.mods.dex + c.level)}. Jeśli spadną do 0, za 1 FP możesz odbić atak w innego wroga.`,
        en: `Reaction when an attack hits you for bludgeoning, piercing or slashing damage: reduce it by 1d10 ${signed(c.mods.dex + c.level)}. If that brings it to 0, spend 1 FP to redirect the attack at another enemy.`,
      }) },
    { lv: 3, id: "subclass", name: { pl: "Podklasa (Monk Subclass)", en: "Monk Subclass" },
      desc: () => ({ pl: "Wybierasz tradycję mnicha w edycji postaci. Jej zdolności pojawią się niżej.", en: "Choose your monastic tradition in the character editor. Its features appear below." }) },
    { lv: 4, id: "asi", name: { pl: "Feat albo +2 do cech (ASI)", en: "Feat or Ability Score Improvement" },
      desc: () => ({ pl: "Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch). Zmień cechy w zakładce Postać.", en: "Pick a feat or +2 to one ability (or +1 to two). Update scores on the Character tab." }) },
    { lv: 4, id: "slow-fall", name: { pl: "Slow Fall (Powolny upadek)", en: "Slow Fall" },
      desc: (c) => ({ pl: `Reakcja przy upadku: obrażenia mniejsze o ${5 * c.level}.`, en: `Reaction when you fall: reduce the damage by ${5 * c.level}.` }) },
    { lv: 5, id: "extra-attack", name: { pl: "Extra Attack (Dodatkowy atak)", en: "Extra Attack" },
      desc: () => ({ pl: "Akcja Attack daje 2 ataki zamiast jednego.", en: "The Attack action gives you two attacks instead of one." }) },
    { lv: 5, id: "stunning-strike", name: { pl: "Stunning Strike (Ogłuszający cios)", en: "Stunning Strike" },
      desc: (c) => ({
        pl: `Raz na turę po trafieniu, za 1 FP: wróg rzuca KON przeciw DC ${8 + c.mods.wis + c.pb}. Porażka = Stunned do początku Twojej następnej tury. Sukces = połowa prędkości i Przewaga na następny atak w niego.`,
        en: `Once per turn after a hit, spend 1 FP: the target makes a CON save against DC ${8 + c.mods.wis + c.pb}. Fail = Stunned until the start of your next turn. Success = half speed and Advantage on the next attack against it.`,
      }) },
  ],

  /** Short list of what each level adds, for the Level up tab. */
  nextLevel: {
    2: { pl: ["Focus Points: Flurry of Blows, Patient Defense, Step of the Wind", "Prędkość +10 ft", "Uncanny Metabolism"],
         en: ["Focus Points: Flurry of Blows, Patient Defense, Step of the Wind", "Speed +10 ft", "Uncanny Metabolism"] },
    3: { pl: ["Deflect Attacks", "Wybór podklasy"], en: ["Deflect Attacks", "Choose a subclass"] },
    4: { pl: ["Feat albo +2 do cech", "Slow Fall"], en: ["Feat or ability score increase", "Slow Fall"] },
    5: { pl: ["Extra Attack", "Stunning Strike", "Kość Martial Arts d8", "PB +3"], en: ["Extra Attack", "Stunning Strike", "Martial Arts die d8", "Proficiency bonus +3"] },
  },
};
