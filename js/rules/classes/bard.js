// Bard, levels 1–5, 2024 rules (Player's Handbook ch. 3) + College of Spirits (Ravenloft: The Horrors Within).
// Descriptions are our own paraphrase.
import { signed } from "../core.js";

const L = (pl, en) => ({ pl, en });
const SLOTS = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2] };
const PREPARED = { 1: 4, 2: 5, 3: 6, 4: 7, 5: 9 };
const CANTRIPS = { 1: 2, 2: 2, 3: 2, 4: 3, 5: 3 };
const atLeast1 = (n) => Math.max(1, n);
const list = (byLevel) => (lv) => Object.entries(byLevel).filter(([k]) => +k <= lv).flatMap(([, s]) => s);
/** Bardic Inspiration die: d6, d8 from level 5 (d10 at 10, d12 at 15). */
export const bardicDie = (lv) => (lv < 5 ? 6 : lv < 10 ? 8 : lv < 15 ? 10 : 12);
const die = (lv, lang) => (lang === "pl" ? "k" : "d") + bardicDie(lv);

/** College of Spirits: Spirits from Beyond, in short form (number = roll of the Bardic Inspiration die). */
const SPIRITS = [
  ["Beloved (Ukochany)", "Beloved", "cel odzyskuje kość inspiracji + CHA HP", "the target regains Inspiration die + CHA HP"],
  ["Sharpshooter (Strzelec)", "Sharpshooter", "cel dostaje kość inspiracji + CHA obrażeń od mocy", "the target takes Inspiration die + CHA Force damage"],
  ["Avenger (Mściciel)", "Avenger", "do końca Twojej następnej tury kto trafi cel wręcz, dostaje kość inspiracji obrażeń od mocy", "until the end of your next turn, whoever hits the target in melee takes Inspiration die Force damage"],
  ["Renegade (Odszczepieniec)", "Renegade", "cel od razu reakcją teleportuje się do 30 ft", "the target can teleport up to 30 ft with its Reaction"],
  ["Fortune Teller (Wróżbita)", "Fortune Teller", "cel ma Przewagę na testy k20 do początku Twojej następnej tury", "the target has Advantage on D20 Tests until the start of your next turn"],
  ["Wayfarer (Wędrowiec)", "Wayfarer", "cel dostaje kość inspiracji + Twój poziom Barda tymczasowych HP i, dopóki je ma, +10 ft prędkości", "the target gains Inspiration die + Bard level Temporary HP and +10 ft Speed while they last"],
  ["Trickster (Kuglarz)", "Trickster", "cel rzuca MĄD: porażka = 2 kości inspiracji obrażeń psychicznych i Charmed do początku Twojej tury, sukces = połowa", "the target makes a WIS save: on a fail 2 Inspiration dice Psychic and Charmed until the start of your turn, half on a success"],
  ["Shade (Cień)", "Shade", "cel jest Invisible do końca swojej tury albo do ataku, obrażeń lub czaru; potem istoty w 5 ft rzucają KON albo dostają 2 kości inspiracji nekrotycznych", "the target is Invisible until the end of its turn or until it attacks, deals damage or casts; then creatures within 5 ft make a CON save or take 2 Inspiration dice Necrotic"],
];

export const bard = {
  id: "bard",
  source: "srd52",
  name: L("Bard", "Bard"),
  maxLevel: 5,
  asiLevels: [4, 8, 12, 16],
  hitDie: 8,
  standardArray: { str: 8, dex: 14, con: 12, int: 13, wis: 10, cha: 15 },
  saves: ["dex", "cha"],
  // Any three skills.
  skillChoices: { count: 3, from: null },
  toolChoice: { count: 3, from: ["instrument"] },
  armorTraining: ["light"],
  expertise: (lv) => (lv < 2 ? 0 : lv < 9 ? 2 : 4),
  // Jack of All Trades (level 2): half the proficiency bonus on checks with skills you lack.
  skillBonus: (c, skill, prof) => (c.level >= 2 && !prof ? Math.floor(c.pb / 2) : 0),
  role: L("Natchniony artysta i czarujący od wszystkiego. Kośćmi inspiracji ratuje nieudane rzuty sojuszników, ma czary leczące, iluzje i zauroczenia, a w umiejętnościach nie ma sobie równych.",
    "An inspired performer and jack of all magic. Bardic Inspiration dice save allies' failed rolls; healing, illusion and charm spells; unrivaled at skills."),

  spellcasting: (lv) => ({ ability: "cha", list: L("barda", "Bard"), listId: "bard", changeRule: "level",
    cantrips: CANTRIPS[lv], prepared: PREPARED[lv], slots: SLOTS[lv] }),

  resources: (c) => [
    { id: "bardic-inspiration", max: atLeast1(c.mods.cha), recharge: c.level >= 5 ? "short" : "long", name: L(`Bardic Inspiration (kość ${die(c.level, "pl")})`, `Bardic Inspiration (d${bardicDie(c.level)})`) },
  ],

  summary: (c) => [
    { label: L("Bardic Inspiration", "Bardic Inspiration"), value: L(`1${die(c.level, "pl")}`, `1d${bardicDie(c.level)}`),
      note: L(`akcja bonusowa, sojusznik w 60 ft; ${atLeast1(c.mods.cha)}× na ${c.level >= 5 ? "krótki" : "długi"} odpoczynek`, `Bonus Action, an ally within 60 ft; ${atLeast1(c.mods.cha)}× per ${c.level >= 5 ? "short" : "long"} rest`) },
    ...(c.level >= 2 ? [{ label: L("Jack of All Trades", "Jack of All Trades"), value: "+" + Math.floor(c.pb / 2), note: L("do testów umiejętności bez biegłości (już na karcie)", "to checks with skills you lack (already on the sheet)") }] : []),
  ],

  features: [
    { lv: 1, id: "bardic-inspiration", name: L("Bardic Inspiration (Bardowska inspiracja)", "Bardic Inspiration"),
      desc: (c) => L(`Akcja bonusowa: istota w 60 ft, która Cię widzi lub słyszy, dostaje kość ${die(c.level, "pl")} (może mieć tylko jedną). W ciągu godziny, gdy obleje test k20, może ją rzucić i dodać wynik. ${atLeast1(c.mods.cha)}× (modyfikator CHA, co najmniej 1), wraca po ${c.level >= 5 ? "krótkim lub długim" : "długim"} odpoczynku.`,
        `Bonus Action: a creature within 60 ft who can see or hear you gains a d${bardicDie(c.level)} (only one at a time). Within an hour, when it fails a D20 Test, it can roll the die and add it. ${atLeast1(c.mods.cha)}× (CHA modifier, at least 1), regained on a ${c.level >= 5 ? "short or long" : "long"} rest.`) },
    { lv: 1, id: "spellcasting", name: L("Spellcasting (Czary)", "Spellcasting"),
      desc: (c) => L(`Czary barda na CHA. ${CANTRIPS[c.level]} sztuczki i ${PREPARED[c.level]} przygotowanych czarów z kręgów, na które masz sloty. Przy awansie możesz wymienić jeden przygotowany czar i jedną sztuczkę. Fokus: instrument muzyczny.`,
        `Bard spells using CHA. ${CANTRIPS[c.level]} cantrips and ${PREPARED[c.level]} prepared spells of levels you have slots for. When you gain a level you can swap one prepared spell and one cantrip. Focus: a musical instrument.`) },
    { lv: 2, id: "expertise", name: L("Expertise (Specjalizacja)", "Expertise"),
      desc: () => L("W dwóch umiejętnościach, w których masz biegłość, premia z biegłości liczy się podwójnie (polecane: Występy i Perswazja).", "In two skills you're proficient in, your proficiency bonus is doubled (Performance and Persuasion are recommended).") },
    { lv: 2, id: "jack-of-all-trades", name: L("Jack of All Trades (Złota rączka)", "Jack of All Trades"),
      desc: (c) => L(`Do testów umiejętności, w których nie masz biegłości, dodajesz połowę premii z biegłości (+${Math.floor(c.pb / 2)}). Już wliczone na karcie.`, `Add half your proficiency bonus (+${Math.floor(c.pb / 2)}) to checks with skills you aren't proficient in. Already on the sheet.`) },
    { lv: 3, id: "subclass", name: L("Kolegium (Bard Subclass)", "Bard Subclass"),
      desc: () => L("Wybierasz kolegium bardów. Jego zdolności pojawią się niżej.", "Choose your bard college. Its features appear below.") },
    { lv: 4, id: "asi", name: L("Feat albo +2 do cech (ASI)", "Feat or Ability Score Improvement"),
      desc: () => L("Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch) na zakładce Awans.", "Pick a feat or +2 to one ability (or +1 to two) on the Level up tab.") },
    { lv: 5, id: "font-of-inspiration", name: L("Font of Inspiration (Źródło inspiracji)", "Font of Inspiration"),
      desc: () => L("Bardic Inspiration wraca już po krótkim odpoczynku. Możesz też wydać slot czaru (bez akcji), żeby odzyskać jedno użycie.", "Bardic Inspiration now returns on a short rest too. You can also spend a spell slot (no action) to regain one use.") },
  ],

  subclassLevel: 3,
  subclasses: {
    dance: {
      source: "phb2024", name: L("College of Dance (Kolegium Tańca)", "College of Dance"),
      unarmored: (c) => ({ value: 10 + c.mods.dex + c.mods.cha, shieldOk: false, note: L("10 + ZRĘ + CHA (taniec), bez zbroi i tarczy", "10 + DEX + CHA (dance), no armor or shield") }),
      summary: (c) => [{ label: L("Cios (Bardic Damage)", "Unarmed Strike (Bardic Damage)"), value: signed(c.mods.dex + c.pb),
        note: L(`ZRĘ; obrażenia 1${die(c.level, "pl")} ${signed(c.mods.dex)} obuchowe, bez zbroi i tarczy`, `DEX; damage 1d${bardicDie(c.level)} ${signed(c.mods.dex)} bludgeoning, no armor or shield`) }],
      features: [
        { lv: 3, id: "dazzling-footwork", name: L("Dazzling Footwork (Olśniewające kroki)", "Dazzling Footwork"),
          desc: (c) => L(`Bez zbroi i tarczy: KP = 10 + ZRĘ + CHA (${10 + c.mods.dex + c.mods.cha}, już na karcie); Przewaga na Występy z tańcem; ciosy bez broni atakujesz ZRĘ i zadajesz nimi 1${die(c.level, "pl")} ${signed(c.mods.dex)} obuchowych (kość się nie zużywa). Gdy wydajesz Bardic Inspiration w akcji, akcji bonusowej albo reakcji, możesz przy tym wykonać jeden cios bez broni.`,
            `Without armor or a shield: AC = 10 + DEX + CHA (${10 + c.mods.dex + c.mods.cha}, already on the sheet); Advantage on Performance checks that involve dancing; Unarmed Strikes use DEX and deal 1d${bardicDie(c.level)} ${signed(c.mods.dex)} Bludgeoning (the die isn't spent). When you spend Bardic Inspiration as part of an action, Bonus Action or Reaction, you can make one Unarmed Strike with it.`) },
      ],
    },
    glamour: {
      source: "phb2024", name: L("College of Glamour (Kolegium Uroku)", "College of Glamour"),
      domainSpells: list({ 3: ["Charm Person", "Mirror Image"] }),
      resources: () => [{ id: "beguiling-magic", max: 1, recharge: "long", name: L("Beguiling Magic (Zwodnicza magia)", "Beguiling Magic") }],
      features: [
        { lv: 3, id: "beguiling-magic", name: L("Beguiling Magic (Zwodnicza magia)", "Beguiling Magic"),
          desc: (c) => L(`Charm Person i Mirror Image masz zawsze przygotowane. Zaraz po rzuceniu czaru zauroczenia lub iluzji ze slotu istota w 60 ft rzuca MĄD przeciw DC ${8 + c.mods.cha + c.pb}: porażka = Charmed albo Frightened (Ty wybierasz) na minutę, z rzutem na końcu każdej jej tury. Raz na długi odpoczynek albo za jedno użycie Bardic Inspiration.`,
            `Charm Person and Mirror Image are always prepared. Right after you cast an Enchantment or Illusion spell with a slot, a creature within 60 ft makes a WIS save against DC ${8 + c.mods.cha + c.pb}: on a fail it's Charmed or Frightened (your choice) for a minute, repeating the save at the end of each of its turns. Once per long rest, or restore it with a use of Bardic Inspiration.`) },
        { lv: 3, id: "mantle-of-inspiration", name: L("Mantle of Inspiration (Płaszcz inspiracji)", "Mantle of Inspiration"),
          desc: (c) => L(`Akcja bonusowa, za Bardic Inspiration: rzucasz kością; do ${atLeast1(c.mods.cha)} innych istot w 60 ft dostaje po 2 × wynik tymczasowych HP i może reakcją przejść swoją prędkość bez ataków okazyjnych.`,
            `Bonus Action, spend Bardic Inspiration: roll the die; up to ${atLeast1(c.mods.cha)} other creatures within 60 ft each gain 2 × the roll in Temporary HP and can use their Reaction to move their Speed without Opportunity Attacks.`) },
      ],
    },
    lore: {
      source: "srd52", name: L("College of Lore (Kolegium Wiedzy)", "College of Lore"),
      extraSkills: (lv) => (lv >= 3 ? [{ id: "lore", label: L("Kolegium Wiedzy: 3 umiejętności", "College of Lore: 3 skills"), count: 3, from: null }] : []),
      features: [
        { lv: 3, id: "bonus-proficiencies", name: L("Bonus Proficiencies (Dodatkowe biegłości)", "Bonus Proficiencies"),
          desc: () => L("Biegłość w trzech dowolnych umiejętnościach (wybór w kroku 5 albo przy awansie).", "Proficiency in three skills of your choice (pick them in step 5 or when leveling up).") },
        { lv: 3, id: "cutting-words", name: L("Cutting Words (Cięte słowa)", "Cutting Words"),
          desc: (c) => L(`Reakcja, za Bardic Inspiration: gdy widoczna istota w 60 ft rzuca na obrażenia albo zdaje test cechy lub trafia atakiem, odejmujesz od wyniku rzut kością ${die(c.level, "pl")} — może to zamienić sukces w porażkę.`,
            `Reaction, spend Bardic Inspiration: when a creature you can see within 60 ft rolls damage, or succeeds on an ability check or attack roll, subtract a d${bardicDie(c.level)} roll from it — possibly turning a success into a failure.`) },
      ],
    },
    valor: {
      source: "phb2024", name: L("College of Valor (Kolegium Męstwa)", "College of Valor"),
      armorTraining: ["medium", "shield"],
      features: [
        { lv: 3, id: "combat-inspiration", name: L("Combat Inspiration (Bojowa inspiracja)", "Combat Inspiration"),
          desc: () => L("Kto ma Twoją kość inspiracji, może jej też użyć: w obronie — reakcją po trafieniu dodaje wynik do KP przeciw temu atakowi; w ataku — zaraz po trafieniu dodaje wynik do obrażeń.",
            "Whoever holds your Inspiration die can also use it: on defense — with a Reaction when hit, add the roll to AC against that attack; on offense — right after a hit, add the roll to the damage.") },
        { lv: 3, id: "martial-training", name: L("Martial Training (Szkolenie bojowe)", "Martial Training"),
          desc: () => L("Biegłość w broni wojennej oraz w średnich zbrojach i tarczach (już na karcie). Broń prosta albo wojenna może być fokusem Twoich czarów barda.",
            "Proficiency with Martial weapons, and Medium armor and Shield training (already on the sheet). A Simple or Martial weapon can be your Bard spellcasting focus.") },
      ],
    },
    spirits: {
      // Ravenloft: The Horrors Within
      source: "ravenloft", name: L("College of Spirits (Kolegium Duchów)", "College of Spirits"),
      bonusCantrips: () => ["guidance"],
      toolsFixed: ["cards"],
      features: [
        { lv: 3, id: "channeler", name: L("Channeler (Medium)", "Channeler"),
          desc: () => L("Znasz sztuczkę Guidance (poza limitem sztuczek), z zasięgiem 60 ft. Masz talię kart i biegłość w niej; karty, kryształowa kula, świeca albo pióro mogą być fokusem Twoich czarów barda.",
            "You know the Guidance cantrip (outside your cantrip limit), with a range of 60 ft. You have a deck of playing cards and proficiency with it; the cards, a crystal or orb, a candle or an ink pen can be your Bard spellcasting focus.") },
        { lv: 3, id: "spirits-from-beyond", name: L("Spirits from Beyond (Duchy z zaświatów)", "Spirits from Beyond"),
          desc: (c) => {
            const n = bardicDie(c.level);
            return L(`Gdy akcją bonusową dajesz komuś Bardic Inspiration, przywołujesz losowego ducha (rzut kością ${die(c.level, "pl")}). Albo akcją bonusową, za Bardic Inspiration, wybierasz ducha o numerze do ${n}. Duch czeka do krótkiego lub długiego odpoczynku; uwalniasz go akcją Magic na widoczną istotę w 30 ft (rzuty przeciw DC ${8 + c.mods.cha + c.pb}). ${SPIRITS.slice(0, n).map((s, i) => `${i + 1}. ${s[0]}: ${s[2]}`).join("; ")}.`,
              `When you give Bardic Inspiration as a Bonus Action, you call a random spirit (roll the d${n}). Or, as a Bonus Action spending Bardic Inspiration, pick a spirit numbered up to ${n}. It stays until a short or long rest; unleash it with a Magic action on a creature you can see within 30 ft (saves against DC ${8 + c.mods.cha + c.pb}). ${SPIRITS.slice(0, n).map((s, i) => `${i + 1}. ${s[1]}: ${s[3]}`).join("; ")}.`);
          } },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Expertise w 2 umiejętnościach", "Jack of All Trades", "5 przygotowanych czarów, 3 sloty 1. kręgu"], en: ["Expertise in 2 skills", "Jack of All Trades", "5 prepared spells, 3 level 1 slots"] },
    3: { pl: ["Wybór kolegium", "Czary 2. kręgu: 2 sloty", "6 przygotowanych czarów"], en: ["Choose a college", "Level 2 spells: 2 slots", "6 prepared spells"] },
    4: { pl: ["Feat albo +2 do cech", "Dodatkowa sztuczka", "7 przygotowanych czarów"], en: ["Feat or ability score increase", "One more cantrip", "7 prepared spells"] },
    5: { pl: ["Kość inspiracji k8", "Font of Inspiration: inspiracja wraca po krótkim odpoczynku", "Czary 3. kręgu: 2 sloty", "9 przygotowanych czarów", "PB +3"], en: ["Inspiration die d8", "Font of Inspiration: Inspiration returns on a short rest", "Level 3 spells: 2 slots", "9 prepared spells", "Proficiency bonus +3"] },
  },
};
