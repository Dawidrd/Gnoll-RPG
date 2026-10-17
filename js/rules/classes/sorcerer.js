// Sorcerer, levels 1–5, 2024 rules (Player's Handbook ch. 3) + Shadow Sorcery (Ravenloft: The Horrors Within).
// Descriptions are our own paraphrase.
const L = (pl, en) => ({ pl, en });
const SLOTS = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2] };
const PREPARED = { 1: 2, 2: 4, 3: 6, 4: 7, 5: 9 };
const CANTRIPS = { 1: 4, 2: 4, 3: 4, 4: 5, 5: 5 };
const atLeast1 = (n) => Math.max(1, n);
const list = (byLevel) => (lv) => Object.entries(byLevel).filter(([k]) => +k <= lv).flatMap(([, s]) => s);

export const METAMAGIC_OPTIONS = {
  careful: { name: L("Careful Spell (Ostrożny czar)", "Careful Spell"), cost: 1,
    desc: (c) => L(`1 PC: do ${atLeast1(c.mods.cha)} istot (modyfikator CHA) automatycznie zdaje rzut przeciw Twojemu czarowi i nie dostaje obrażeń, jeśli przy sukcesie dostałaby połowę.`, `1 SP: up to ${atLeast1(c.mods.cha)} creatures (CHA modifier) automatically succeed on the spell's save and take no damage where they'd take half.`) },
  distant: { name: L("Distant Spell (Daleki czar)", "Distant Spell"), cost: 1,
    desc: () => L("1 PC: podwajasz zasięg czaru (co najmniej 5 ft); czar z zasięgiem dotyku ma zasięg 30 ft.", "1 SP: double a spell's range (at least 5 ft); a Touch spell gets a 30 ft range.") },
  empowered: { name: L("Empowered Spell (Wzmocniony czar)", "Empowered Spell"), cost: 1,
    desc: (c) => L(`1 PC: przerzucasz do ${atLeast1(c.mods.cha)} kości obrażeń i bierzesz nowe wyniki. Łączy się z inną metamagią.`, `1 SP: reroll up to ${atLeast1(c.mods.cha)} damage dice and use the new rolls. Combines with another Metamagic.`) },
  extended: { name: L("Extended Spell (Przedłużony czar)", "Extended Spell"), cost: 1,
    desc: () => L("1 PC: podwajasz czas trwania czaru (minuta lub dłużej, maks. 24 h); przy Koncentracji masz Przewagę na rzuty, by ją utrzymać.", "1 SP: double a spell's duration (1 minute or more, max 24 hours); with Concentration you have Advantage on saves to keep it.") },
  heightened: { name: L("Heightened Spell (Spotęgowany czar)", "Heightened Spell"), cost: 2,
    desc: () => L("2 PC: jeden cel ma Utrudnienie na rzuty obronne przeciw temu czarowi.", "2 SP: one target has Disadvantage on saves against the spell.") },
  quickened: { name: L("Quickened Spell (Przyspieszony czar)", "Quickened Spell"), cost: 2,
    desc: () => L("2 PC: czar rzucany akcją rzucasz akcją bonusową. Nie w turze, w której rzucasz inny czar 1. kręgu lub wyższego.", "2 SP: cast an action spell as a Bonus Action. Not on a turn when you cast another level 1+ spell.") },
  seeking: { name: L("Seeking Spell (Naprowadzany czar)", "Seeking Spell"), cost: 1,
    desc: () => L("1 PC: po chybionym ataku czarem przerzucasz k20. Łączy się z inną metamagią.", "1 SP: after missing with a spell attack, reroll the d20. Combines with another Metamagic.") },
  subtle: { name: L("Subtle Spell (Dyskretny czar)", "Subtle Spell"), cost: 1,
    desc: () => L("1 PC: czar bez komponentów werbalnych, somatycznych i materialnych (poza drogimi lub zużywanymi).", "1 SP: cast without Verbal, Somatic or Material components (except costly or consumed ones).") },
  transmuted: { name: L("Transmuted Spell (Przemieniony czar)", "Transmuted Spell"), cost: 1,
    desc: () => L("1 PC: zmieniasz rodzaj obrażeń czaru między kwasem, zimnem, ogniem, błyskawicami, trucizną i grzmotem.", "1 SP: change a spell's damage type among acid, cold, fire, lightning, poison and thunder.") },
  twinned: { name: L("Twinned Spell (Bliźniaczy czar)", "Twinned Spell"), cost: 1,
    desc: () => L("1 PC: czar, który na wyższym kręgu obejmuje dodatkowy cel, działa jak o krąg wyższy (np. Charm Person na dwie osoby).", "1 SP: a spell that targets an extra creature at a higher level is treated as one level higher (e.g. Charm Person on two people).") },
};

/** Wild Magic Surge (d100), in short form. */
const SURGE = [
  ["01–04", "przez minutę rzucasz na tę tabelę na początku każdej tury (ignorując ten wynik)", "for a minute, roll on this table at the start of each turn (ignoring this result)"],
  ["05–08", "przyjazna istota pojawia się obok na minutę (k4: modron, flumph, modron, jednorożec)", "a friendly creature appears nearby for a minute (d4: modron, flumph, modron, unicorn)"],
  ["09–12", "przez minutę odzyskujesz 5 HP na początku tury", "for a minute you regain 5 HP at the start of each turn"],
  ["13–16", "cele Twojego następnego czaru z rzutem obronnym mają Utrudnienie", "targets of your next save spell have Disadvantage"],
  ["17–20", "dziwny efekt na minutę (k8: muzyka, większy rozmiar, pierzasta broda, krzyk, motyle, trzecie oko, bańki, niebieska skóra)", "an odd effect for a minute (d8: music, larger size, feather beard, shouting, butterflies, third eye, bubbles, blue skin)"],
  ["21–24", "przez minutę czary rzucane akcją rzucasz akcją bonusową", "for a minute, action spells take a Bonus Action"],
  ["25–28", "trafiasz na Plan Astralny do końca następnej tury", "you go to the Astral Plane until the end of your next turn"],
  ["29–32", "następny czar zadający obrażenia w ciągu minuty: maksymalne kości", "your next damaging spell within a minute deals maximum dice"],
  ["33–36", "przez minutę Odporność na wszystkie obrażenia", "Resistance to all damage for a minute"],
  ["37–40", "jesteś roślinką w doniczce do początku następnej tury", "you're a potted plant until the start of your next turn"],
  ["41–44", "przez minutę akcją bonusową teleportujesz się o 20 ft", "for a minute, teleport 20 ft as a Bonus Action"],
  ["45–48", "Ty i do 3 istot jesteście niewidzialni przez minutę", "you and up to 3 creatures are Invisible for a minute"],
  ["49–52", "widmowa tarcza: +2 KP i odporność na Magic Missile przez minutę", "spectral shield: +2 AC and immunity to Magic Missile for a minute"],
  ["53–56", "dodatkowa akcja w tej turze", "an extra action this turn"],
  ["57–60", "losowy czar bez Koncentracji (k10)", "a random spell without Concentration (d10)"],
  ["61–64", "przez minutę łatwopalne rzeczy, których dotkniesz, zapalają się", "for a minute, flammable things you touch catch fire"],
  ["65–68", "jeśli zginiesz w ciągu godziny, odradzasz się jak po Reincarnate", "if you die within the hour, you return as with Reincarnate"],
  ["69–72", "jesteś przestraszony do końca następnej tury", "you're Frightened until the end of your next turn"],
  ["73–76", "teleportujesz się do 60 ft", "you teleport up to 60 ft"],
  ["77–80", "losowa istota w 60 ft jest zatruta na 1k4 godziny", "a random creature within 60 ft is Poisoned for 1d4 hours"],
  ["81–84", "świecisz przez minutę; kto kończy turę w 5 ft od Ciebie, jest oślepiony", "you shine for a minute; anyone ending a turn within 5 ft is Blinded"],
  ["85–88", "do 3 istot dostaje 1k10 nekrotycznych, a Ty leczysz się o sumę", "up to 3 creatures take 1d10 necrotic each and you heal the total"],
  ["89–92", "do 3 istot dostaje 4k10 od błyskawic", "up to 3 creatures take 4d10 lightning"],
  ["93–96", "Ty i istoty w 30 ft macie przez minutę podatność na kłute", "you and creatures within 30 ft are vulnerable to piercing for a minute"],
  ["97–00", "k6: leczenie 2k10 Ciebie albo sojusznika, odzyskany slot, wszystkie Punkty Czarów albo wszystkie efekty z 17–20 naraz", "d6: 2d10 healing for you or an ally, a slot back, all Sorcery Points back, or every 17–20 effect at once"],
];

export const sorcerer = {
  id: "sorcerer",
  source: "phb2024",
  name: L("Zaklinacz (Sorcerer)", "Sorcerer"),
  maxLevel: 5,
  asiLevels: [4, 8, 12, 16],
  hitDie: 6,
  standardArray: { str: 10, dex: 13, con: 14, int: 8, wis: 12, cha: 15 },
  saves: ["con", "cha"],
  skillChoices: { count: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
  armorTraining: [],
  role: L("Urodzony czarodziej. Mniej czarów niż inni, ale Punkty Czarów i Metamagia pozwalają je naginać: rzucać szybciej, dalej, na dwa cele albo po cichu.",
    "A born spellcaster. Fewer spells than others, but Sorcery Points and Metamagic let you bend them: faster, farther, on two targets or silently."),

  spellcasting: (lv) => ({ ability: "cha", list: L("zaklinacza", "Sorcerer"), listId: "sorcerer", changeRule: "level",
    cantrips: CANTRIPS[lv], prepared: PREPARED[lv], slots: SLOTS[lv] }),

  optionPicks: (c) => (c.level >= 2 ? [{ key: "metamagic", label: L("Metamagia (Metamagic)", "Metamagic"), count: 2, options: METAMAGIC_OPTIONS, changeRule: "level" }] : []),

  resources: (c) => [
    { id: "innate-sorcery", max: 2, recharge: "long", name: L("Innate Sorcery (Wrodzona magia)", "Innate Sorcery") },
    { id: "sorcery-points", max: c.level >= 2 ? c.level : 0, recharge: "long", name: L("Punkty Czarów (Sorcery Points)", "Sorcery Points") },
    { id: "restoration", max: c.level >= 5 ? 1 : 0, recharge: "long", name: L("Sorcerous Restoration", "Sorcerous Restoration") },
  ],

  summary: (c) => [
    { label: L("Innate Sorcery", "Innate Sorcery"), value: `DC ${8 + c.mods.cha + c.pb + 1}`, note: L("akcja bonusowa, 1 minuta: DC +1 i Przewaga na ataki czarami Zaklinacza; 2× na długi odpoczynek", "Bonus Action, 1 minute: DC +1 and Advantage on Sorcerer spell attacks; 2× per long rest") },
  ],

  features: [
    { lv: 1, id: "spellcasting", name: L("Spellcasting (Czary)", "Spellcasting"),
      desc: (c) => L(`Czary zaklinacza na CHA. ${CANTRIPS[c.level]} sztuczki i ${PREPARED[c.level]} przygotowanych czarów z kręgów, na które masz sloty. Przy awansie możesz wymienić jeden przygotowany czar i jedną sztuczkę.`,
        `Sorcerer spells using CHA. ${CANTRIPS[c.level]} cantrips and ${PREPARED[c.level]} prepared spells of levels you have slots for. When you gain a level you can swap one prepared spell and one cantrip.`) },
    { lv: 1, id: "innate-sorcery", name: L("Innate Sorcery (Wrodzona magia)", "Innate Sorcery"),
      desc: (c) => L(`Akcja bonusowa, na minutę: DC Twoich czarów Zaklinacza rośnie o 1 (do ${8 + c.mods.cha + c.pb + 1}), a ataki tymi czarami mają Przewagę. 2× na długi odpoczynek.`,
        `Bonus Action, for 1 minute: your Sorcerer spell save DC rises by 1 (to ${8 + c.mods.cha + c.pb + 1}) and those spells' attack rolls have Advantage. 2× per long rest.`) },
    { lv: 2, id: "font-of-magic", name: L("Font of Magic (Źródło magii)", "Font of Magic"),
      desc: (c) => L(`Masz ${c.level} Punktów Czarów (wracają po długim odpoczynku). Slot zamieniasz na tyle punktów, ile wynosi jego krąg (bez akcji). Akcją bonusową tworzysz slot z punktów: 1. krąg = 2 PC, 2. krąg = 3 PC (od 3. poziomu), 3. krąg = 5 PC (od 5. poziomu). Stworzone sloty znikają po długim odpoczynku.`,
        `You have ${c.level} Sorcery Points (regained on a long rest). Turn a slot into points equal to its level (no action). As a Bonus Action create a slot from points: level 1 = 2 SP, level 2 = 3 SP (from level 3), level 3 = 5 SP (from level 5). Created slots vanish on a long rest.`) },
    { lv: 2, id: "metamagic", name: L("Metamagic (Metamagia)", "Metamagic"),
      desc: () => L("Znasz 2 opcje metamagii (wybór w kroku 5). Na jeden czar zwykle tylko jedna opcja. Przy awansie możesz wymienić jedną.", "You know 2 Metamagic options (pick them in step 5). Usually only one option per spell. When you gain a level you can swap one.") },
    { lv: 3, id: "subclass", name: L("Podklasa (Sorcerer Subclass)", "Sorcerer Subclass"),
      desc: () => L("Wybierasz źródło swojej magii. Jego zdolności i czary zawsze przygotowane pojawią się niżej.", "Choose the source of your magic. Its features and always-prepared spells appear below.") },
    { lv: 4, id: "asi", name: L("Feat albo +2 do cech (ASI)", "Feat or Ability Score Improvement"),
      desc: () => L("Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch) na zakładce Awans.", "Pick a feat or +2 to one ability (or +1 to two) on the Level up tab.") },
    { lv: 5, id: "sorcerous-restoration", name: L("Sorcerous Restoration (Odnowa magii)", "Sorcerous Restoration"),
      desc: (c) => L(`Po krótkim odpoczynku odzyskujesz do ${Math.floor(c.level / 2)} Punktów Czarów. Raz na długi odpoczynek.`, `After a short rest regain up to ${Math.floor(c.level / 2)} Sorcery Points. Once per long rest.`) },
  ],

  subclassLevel: 3,
  subclasses: {
    aberrant: {
      source: "phb2024", name: L("Aberrant Sorcery (Magia aberracji)", "Aberrant Sorcery"),
      domainSpells: list({ 3: ["Arms of Hadar", "Calm Emotions", "Detect Thoughts", "Dissonant Whispers", "Mind Sliver"], 5: ["Hunger of Hadar", "Sending"] }),
      features: [
        { lv: 3, id: "telepathic-speech", name: L("Telepathic Speech (Mowa telepatyczna)", "Telepathic Speech"),
          desc: (c) => L(`Akcja bonusowa: więź telepatyczna z widoczną istotą w 30 ft, na ${c.level} minut i do ${atLeast1(c.mods.cha)} mil. Musicie znać wspólny język.`, `Bonus Action: a telepathic link with a creature you can see within 30 ft, for ${c.level} minutes and up to ${atLeast1(c.mods.cha)} miles. You need a shared language.`) },
      ],
    },
    clockwork: {
      source: "phb2024", name: L("Clockwork Sorcery (Magia mechanizmu)", "Clockwork Sorcery"),
      domainSpells: list({ 3: ["Aid", "Alarm", "Lesser Restoration", "Protection from Evil and Good"], 5: ["Dispel Magic", "Protection from Energy"] }),
      resources: (c) => [{ id: "restore-balance", max: atLeast1(c.mods.cha), recharge: "long", name: L("Restore Balance (Przywrócenie równowagi)", "Restore Balance") }],
      features: [
        { lv: 3, id: "restore-balance", name: L("Restore Balance (Przywrócenie równowagi)", "Restore Balance"),
          desc: (c) => L(`Reakcja, gdy widoczna istota w 60 ft ma rzucić k20 z Przewagą lub Utrudnieniem: rzut odbywa się bez nich. ${atLeast1(c.mods.cha)}× na długi odpoczynek.`, `Reaction when a creature you can see within 60 ft is about to roll a d20 with Advantage or Disadvantage: the roll has neither. ${atLeast1(c.mods.cha)}× per long rest.`) },
      ],
    },
    draconic: {
      source: "phb2024", name: L("Draconic Sorcery (Magia smoków)", "Draconic Sorcery"),
      domainSpells: list({ 3: ["Alter Self", "Chromatic Orb", "Command", "Dragon's Breath"], 5: ["Fear", "Fly"] }),
      hpBonus: (c) => (c.level >= 3 ? c.level : 0),
      unarmored: (c) => ({ value: 10 + c.mods.dex + c.mods.cha, shieldOk: true, note: L("10 + ZRĘ + CHA (smocze łuski), bez zbroi", "10 + DEX + CHA (dragon scales), no armor") }),
      features: [
        { lv: 3, id: "draconic-resilience", name: L("Draconic Resilience (Smocza odporność)", "Draconic Resilience"),
          desc: (c) => L(`Maksymalne HP +${c.level} (3 na 3. poziomie i +1 za każdy kolejny) — już wliczone. Bez zbroi KP = 10 + ZRĘ + CHA (${10 + c.mods.dex + c.mods.cha}).`, `Hit Point maximum +${c.level} (3 at level 3, +1 each level after) — already included. Without armor, AC = 10 + DEX + CHA (${10 + c.mods.dex + c.mods.cha}).`) },
      ],
    },
    "wild-magic": {
      source: "phb2024", name: L("Wild Magic Sorcery (Dzika magia)", "Wild Magic Sorcery"),
      resources: () => [{ id: "tides-of-chaos", max: 1, recharge: "long", name: L("Tides of Chaos (Fale chaosu)", "Tides of Chaos") }],
      features: [
        { lv: 3, id: "wild-magic-surge", name: L("Wild Magic Surge (Dziki wybuch magii)", "Wild Magic Surge"),
          desc: () => L(`Raz na turę, zaraz po rzuceniu czaru Zaklinacza ze slotu, możesz rzucić k20: na 20 rzucasz k100 na tabelę. ${SURGE.map((r) => `${r[0]}: ${r[1]}`).join("; ")}.`,
            `Once per turn, right after casting a Sorcerer spell with a slot, you can roll a d20: on a 20, roll d100 on the table. ${SURGE.map((r) => `${r[0]}: ${r[2]}`).join("; ")}.`) },
        { lv: 3, id: "tides-of-chaos", name: L("Tides of Chaos (Fale chaosu)", "Tides of Chaos"),
          desc: () => L("Dajesz sobie Przewagę na jeden test k20 przed rzutem. Wraca po długim odpoczynku albo gdy rzucisz czar Zaklinacza ze slotu — wtedy automatycznie rzucasz na tabelę dzikiej magii.", "Give yourself Advantage on one D20 Test before rolling. It returns on a long rest, or when you cast a Sorcerer spell with a slot — which then triggers an automatic Wild Magic Surge roll.") },
      ],
    },
    shadow: {
      source: "ravenloft", name: L("Shadow Sorcery (Magia cienia)", "Shadow Sorcery"),
      domainSpells: list({ 3: ["Bane", "Darkness", "Inflict Wounds", "Pass without Trace"], 5: ["Hunger of Hadar", "Nondetection"] }),
      darkvision: 120, blindsight: 10,
      resources: () => [{ id: "strength-of-the-grave", max: 1, recharge: "long", name: L("Strength of the Grave (Siła grobu)", "Strength of the Grave") }],
      features: [
        { lv: 3, id: "eyes-of-the-dark", name: L("Eyes of the Dark (Oczy mroku)", "Eyes of the Dark"),
          desc: () => L("Widzenie w ciemności 120 ft i ślepowidzenie 10 ft (już na karcie). Widzisz normalnie przez ciemność ze swoich czarów.", "Darkvision 120 ft and Blindsight 10 ft (already on the sheet). You see normally through Darkness created by your spells.") },
        { lv: 3, id: "strength-of-the-grave", name: L("Strength of the Grave (Siła grobu)", "Strength of the Grave"),
          desc: (c) => L(`Gdy miałbyś spaść do 0 HP (a nie zginąć od razu), rzucasz CHA (DC 5 + otrzymane obrażenia); sukces = masz ${atLeast1(c.mods.cha + c.level)} HP (CHA + poziom). Raz na długi odpoczynek.`, `When you'd drop to 0 HP (and not die outright), make a CHA save (DC 5 + the damage taken); on a success you have ${atLeast1(c.mods.cha + c.level)} HP (CHA + level) instead. Once per long rest.`) },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Font of Magic: 2 Punkty Czarów", "Metamagia: 2 opcje", "4 przygotowane czary"], en: ["Font of Magic: 2 Sorcery Points", "Metamagic: 2 options", "4 prepared spells"] },
    3: { pl: ["Wybór podklasy", "Sloty 2. kręgu", "6 przygotowanych czarów"], en: ["Choose a subclass", "Level 2 slots", "6 prepared spells"] },
    4: { pl: ["Feat albo +2 do cech", "Sztuczki: 5", "7 przygotowanych czarów"], en: ["Feat or ability score increase", "Cantrips: 5", "7 prepared spells"] },
    5: { pl: ["Sloty 3. kręgu", "Sorcerous Restoration", "9 przygotowanych czarów", "PB +3"], en: ["Level 3 slots", "Sorcerous Restoration", "9 prepared spells", "Proficiency bonus +3"] },
  },
};
