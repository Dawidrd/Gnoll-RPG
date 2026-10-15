// Wizard, levels 1–5, 2024 rules (Player's Handbook ch. 3). Descriptions are our own paraphrase.
const L = (pl, en) => ({ pl, en });
const SLOTS = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2] };
const PREPARED = { 1: 4, 2: 5, 3: 6, 4: 7, 5: 9 };
const CANTRIPS = { 1: 3, 2: 3, 3: 3, 4: 4, 5: 4 };
/** Spellbook: six level 1 spells at level 1, two more each level after. */
export const bookSize = (lv) => 6 + 2 * (lv - 1);
const SCHOLAR = ["arcana", "history", "investigation", "medicine", "nature", "religion"];

/**
 * Savant (every subclass): two spells of the school, up to level 2, added to the book for free;
 * one more of that school each time a new spell level opens (level 5 here: level 3 slots).
 */
const savant = (school, pl, en) => (lv) => [
  ...(lv >= 3 ? [{ key: "savant", label: L(`Savant (${pl}): 2 darmowe czary`, `${en} Savant: 2 free spells`), count: 2, circles: [1, 2], schools: [school] }] : []),
  ...(lv >= 5 ? [{ key: "savant5", label: L(`Savant (${pl}): darmowy czar za sloty 3. kręgu`, `${en} Savant: free spell for level 3 slots`), count: 1, circles: [1, 2, 3], schools: [school] }] : []),
];
const savantText = (pl, en) => L(`Dwa czary czarodzieja ze szkoły ${pl} (do 2. kręgu) dopisujesz do księgi za darmo, a przy każdym nowym kręgu slotów jeszcze jeden z tej szkoły. Nie liczą się do czarów księgi z awansu.`,
  `Add two ${en} Wizard spells (up to level 2) to your spellbook for free, plus one more of that school whenever you gain a new level of spell slots. They don't count against the spells you add for leveling up.`);

export const wizard = {
  id: "wizard",
  source: "srd52",
  name: L("Czarodziej (Wizard)", "Wizard"),
  maxLevel: 5,
  asiLevels: [4, 8, 12, 16],
  hitDie: 6,
  standardArray: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 },
  saves: ["int", "wis"],
  skillChoices: { count: 2, from: ["arcana", "history", "insight", "investigation", "medicine", "nature", "religion"] },
  armorTraining: [],
  // Scholar (level 2): Expertise in one of these skills you're proficient in.
  expertise: (lv) => (lv >= 2 ? 1 : 0),
  expertiseFrom: SCHOLAR,
  role: L("Uczony mag z księgą czarów. Najwięcej czarów do wyboru, rytuały bez slotów i szkoła magii, w której jest mistrzem — ale mało HP i bez zbroi.",
    "A scholarly mage with a spellbook. The widest choice of spells, rituals without slots and a school of magic they master — but few HP and no armor."),

  spellcasting: (lv) => ({ ability: "int", list: L("czarodzieja", "Wizard"), listId: "wizard", spellbook: bookSize(lv),
    cantrips: CANTRIPS[lv], prepared: PREPARED[lv], slots: SLOTS[lv] }),

  resources: (c) => [
    { id: "arcane-recovery", max: 1, recharge: "long", name: L(`Arcane Recovery (sloty o sumie kręgów ${Math.ceil(c.level / 2)})`, `Arcane Recovery (slots totaling ${Math.ceil(c.level / 2)} levels)`) },
  ],

  features: [
    { lv: 1, id: "spellcasting", name: L("Spellcasting (Czary)", "Spellcasting"),
      desc: (c) => L(`Czary czarodzieja na INT. ${CANTRIPS[c.level]} sztuczki (jedną możesz wymienić po długim odpoczynku). Księga czarów ma ${bookSize(c.level)} czarów (6 na start, +2 na każdy kolejny poziom, z kręgów, na które masz sloty). Z księgi przygotowujesz ${PREPARED[c.level]} czarów; listę zmieniasz po długim odpoczynku. Fokus: fokus arkanów albo księga.`,
        `Wizard spells using INT. ${CANTRIPS[c.level]} cantrips (swap one after a long rest). Your spellbook holds ${bookSize(c.level)} spells (6 to start, +2 each level after, of levels you have slots for). You prepare ${PREPARED[c.level]} of them; change the list after a long rest. Focus: an arcane focus or the book.`) },
    { lv: 1, id: "ritual-adept", name: L("Ritual Adept (Biegły w rytuałach)", "Ritual Adept"),
      desc: () => L("Każdy czar z oznaczeniem rytuału, który masz w księdze, rzucasz jako rytuał (10 minut dłużej, bez slotu) — nie musi być przygotowany. Czytasz go wtedy z księgi.", "You can cast any Ritual spell in your spellbook as a Ritual (10 minutes longer, no slot) — it doesn't need to be prepared. You read it from the book.") },
    { lv: 1, id: "arcane-recovery", name: L("Arcane Recovery (Magiczne odnowienie)", "Arcane Recovery"),
      desc: (c) => L(`Po krótkim odpoczynku odzyskujesz zużyte sloty o łącznym kręgu do ${Math.ceil(c.level / 2)} (połowa poziomu w górę, bez slotów 6.+). Raz na długi odpoczynek.`, `After a short rest regain expended slots with a combined level of up to ${Math.ceil(c.level / 2)} (half your level, rounded up; none level 6+). Once per long rest.`) },
    { lv: 2, id: "scholar", name: L("Scholar (Uczony)", "Scholar"),
      desc: () => L("Expertise w jednej umiejętności, w której masz biegłość: Arcana, Historia, Śledztwo, Medycyna, Natura albo Religia (wybór w kroku 5).", "Expertise in one skill you're proficient in: Arcana, History, Investigation, Medicine, Nature or Religion (pick it in step 5).") },
    { lv: 3, id: "subclass", name: L("Szkoła (Wizard Subclass)", "Wizard Subclass"),
      desc: () => L("Wybierasz szkołę magii. Jej zdolności pojawią się niżej.", "Choose your school of magic. Its features appear below.") },
    { lv: 4, id: "asi", name: L("Feat albo +2 do cech (ASI)", "Feat or Ability Score Improvement"),
      desc: () => L("Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch) na zakładce Awans.", "Pick a feat or +2 to one ability (or +1 to two) on the Level up tab.") },
    { lv: 5, id: "memorize-spell", name: L("Memorize Spell (Zapamiętanie czaru)", "Memorize Spell"),
      desc: () => L("Po krótkim odpoczynku możesz wymienić jeden przygotowany czar na inny czar 1.+ kręgu z księgi.", "After a short rest you can swap one prepared level 1+ spell for another level 1+ spell from your book.") },
  ],

  subclassLevel: 3,
  subclasses: {
    abjurer: {
      source: "phb2024", name: L("Abjurer (Odpychacz)", "Abjurer"),
      bookPicks: savant("abj", "odpychania", "Abjuration"),
      resources: (c) => [{ id: "arcane-ward", max: 2 * c.level + c.mods.int, recharge: "long", name: L("Arcane Ward (HP osłony)", "Arcane Ward (ward HP)") }],
      features: [
        { lv: 3, id: "abjuration-savant", name: L("Abjuration Savant (Znawca odpychania)", "Abjuration Savant"), desc: () => savantText("odpychania", "Abjuration") },
        { lv: 3, id: "arcane-ward", name: L("Arcane Ward (Magiczna osłona)", "Arcane Ward"),
          desc: (c) => L(`Gdy rzucasz czar odpychania ze slotu, tworzysz osłonę (raz na długi odpoczynek), która trwa do długiego odpoczynku. Ma ${2 * c.level + c.mods.int} HP (2 × poziom + INT) i przyjmuje obrażenia zamiast Ciebie (po odpornościach). Każdy kolejny czar odpychania ze slotu oddaje jej 2 × krąg slotu HP; możesz też akcją bonusową wydać slot na to samo. Na karcie: użycia = HP stracone przez osłonę.`,
            `When you cast an Abjuration spell with a slot, you create a ward (once per long rest) that lasts until a long rest. It has ${2 * c.level + c.mods.int} HP (2 × level + INT) and takes damage instead of you (after resistances). Each later Abjuration spell cast with a slot restores 2 × the slot level HP; you can also spend a slot as a Bonus Action for the same. On the sheet: uses = HP the ward has lost.`) },
      ],
    },
    diviner: {
      source: "phb2024", name: L("Diviner (Wieszczbiarz)", "Diviner"),
      bookPicks: savant("div", "wieszczenia", "Divination"),
      resources: () => [{ id: "portent", max: 2, recharge: "long", name: L("Portent (Przepowiednia)", "Portent") }],
      features: [
        { lv: 3, id: "divination-savant", name: L("Divination Savant (Znawca wieszczenia)", "Divination Savant"), desc: () => savantText("wieszczenia", "Divination") },
        { lv: 3, id: "portent", name: L("Portent (Przepowiednia)", "Portent"),
          desc: () => L("Po długim odpoczynku rzucasz dwiema k20 i zapisujesz wyniki. Przed dowolnym testem k20 swoim albo widocznej istoty możesz zastąpić rzut jednym z nich (raz na turę). Każdy wynik działa raz; niewykorzystane przepadają przy długim odpoczynku. Zapisz je w notatkach.",
            "After a long rest roll two d20s and record them. Before any D20 Test by you or a creature you can see, you can replace the roll with one of them (once per turn). Each roll works once; unused ones are lost on a long rest. Note them in Notes.") },
      ],
    },
    evoker: {
      source: "srd52", name: L("Evoker (Ewokator)", "Evoker"),
      bookPicks: savant("evo", "wywoływania", "Evocation"),
      features: [
        { lv: 3, id: "evocation-savant", name: L("Evocation Savant (Znawca wywoływania)", "Evocation Savant"), desc: () => savantText("wywoływania", "Evocation") },
        { lv: 3, id: "potent-cantrip", name: L("Potent Cantrip (Silna sztuczka)", "Potent Cantrip"),
          desc: () => L("Gdy chybisz sztuczką albo cel zda rzut obronny przeciw niej, i tak dostaje połowę jej obrażeń (bez dodatkowych efektów).", "When you miss with a cantrip or the target succeeds on its save, it still takes half the cantrip's damage (but no extra effect).") },
      ],
    },
    illusionist: {
      source: "phb2024", name: L("Illusionist (Iluzjonista)", "Illusionist"),
      bookPicks: savant("ill", "iluzji", "Illusion"),
      bonusCantrips: () => ["minor-illusion"],
      features: [
        { lv: 3, id: "illusion-savant", name: L("Illusion Savant (Znawca iluzji)", "Illusion Savant"), desc: () => savantText("iluzji", "Illusion") },
        { lv: 3, id: "improved-illusions", name: L("Improved Illusions (Lepsze iluzje)", "Improved Illusions"),
          desc: () => L("Iluzje rzucasz bez komponentów werbalnych, a te z zasięgiem 10+ ft mają zasięg dłuższy o 60 ft. Znasz Minor Illusion poza limitem sztuczek (jeśli już ją znałeś, wybierz w jej miejsce inną sztuczkę); jednym rzuceniem tworzysz dźwięk i obraz, a rzucasz ją akcją bonusową.",
            "You cast Illusion spells without Verbal components, and those with a range of 10+ ft reach 60 ft farther. You know Minor Illusion outside your cantrip limit (if you already knew it, pick another cantrip in its place); one casting makes both a sound and an image, and you cast it as a Bonus Action.") },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Scholar: Expertise w jednej umiejętności", "+2 czary w księdze", "5 przygotowanych czarów, 3 sloty 1. kręgu"], en: ["Scholar: Expertise in one skill", "+2 spells in your book", "5 prepared spells, 3 level 1 slots"] },
    3: { pl: ["Wybór szkoły (2 darmowe czary do księgi)", "+2 czary w księdze", "Czary 2. kręgu: 2 sloty", "6 przygotowanych czarów"], en: ["Choose a school (2 free spells for your book)", "+2 spells in your book", "Level 2 spells: 2 slots", "6 prepared spells"] },
    4: { pl: ["Feat albo +2 do cech", "Dodatkowa sztuczka", "+2 czary w księdze", "7 przygotowanych czarów"], en: ["Feat or ability score increase", "One more cantrip", "+2 spells in your book", "7 prepared spells"] },
    5: { pl: ["Memorize Spell", "+2 czary w księdze (i darmowy czar szkoły)", "Czary 3. kręgu: 2 sloty", "9 przygotowanych czarów", "PB +3"], en: ["Memorize Spell", "+2 spells in your book (and a free school spell)", "Level 3 spells: 2 slots", "9 prepared spells", "Proficiency bonus +3"] },
  },
};
