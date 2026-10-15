// Warlock, levels 1–5, 2024 rules (Player's Handbook ch. 3) + Undead Patron (Ravenloft: The Horrors Within).
// Descriptions are our own paraphrase.
import { signed } from "../core.js";

const L = (pl, en) => ({ pl, en });
const PREPARED = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
const CANTRIPS = { 1: 2, 2: 2, 3: 2, 4: 3, 5: 3 };
const INVOCATIONS = { 1: 1, 2: 3, 3: 3, 4: 3, 5: 5 };
const PACT_SLOTS = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 2 };
const SLOT_LEVEL = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 };
const atLeast1 = (n) => Math.max(1, n);
const list = (byLevel) => (lv) => Object.entries(byLevel).filter(([k]) => +k <= lv).flatMap(([, s]) => s);
/** Pact Magic slots as an array by spell level: e.g. level 5 → [0, 0, 2] (two level 3 slots). */
const pactSlots = (lv) => { const out = Array(SLOT_LEVEL[lv]).fill(0); out[SLOT_LEVEL[lv] - 1] = PACT_SLOTS[lv]; return out; };

/**
 * Eldritch Invocations. prereq: level, pact ("blade" | "chain" | "tome"), cantrip ("damage" | "attack" | "range": a known
 * Warlock cantrip that deals damage / uses an attack roll / deals damage with 10+ ft range), invocation (another one first).
 * Repeatable ones pick a different cantrip each time. innate: spells cast without a slot (self only where noted).
 */
export const INVOCATION_OPTIONS = {
  "agonizing-blast": { name: L("Agonizing Blast (Bolesny wybuch)", "Agonizing Blast"), prereq: { level: 2, cantrip: "damage" }, repeatable: true,
    desc: L("Do obrażeń wybranej sztuczki Czarnoksiężnika dodajesz modyfikator CHA.", "Add your Charisma modifier to the damage of one chosen Warlock cantrip.") },
  "armor-of-shadows": { name: L("Armor of Shadows (Zbroja cieni)", "Armor of Shadows"), innate: [{ id: "mage-armor", uses: "atwill", self: true }],
    desc: L("Mage Armor na siebie bez slotu, kiedy chcesz (KP 13 + ZRĘ bez zbroi).", "Cast Mage Armor on yourself without a slot, at will (AC 13 + DEX without armor).") },
  "ascendant-step": { name: L("Ascendant Step (Wznoszący krok)", "Ascendant Step"), prereq: { level: 5 }, innate: [{ id: "levitate", uses: "atwill", self: true }],
    desc: L("Levitate na siebie bez slotu.", "Cast Levitate on yourself without a slot.") },
  "devils-sight": { name: L("Devil's Sight (Diabelski wzrok)", "Devil's Sight"), prereq: { level: 2 },
    desc: L("Widzisz normalnie w przyćmionym świetle i ciemności, także magicznej, do 120 ft.", "You see normally in Dim Light and Darkness, magical or not, out to 120 ft.") },
  "devouring-blade": { name: L("Devouring Blade (Pożerające ostrze)", "Devouring Blade"), prereq: { level: 12, invocation: "thirsting-blade" },
    desc: L("Thirsting Blade daje dwa dodatkowe ataki zamiast jednego.", "Thirsting Blade grants two extra attacks instead of one.") },
  "eldritch-mind": { name: L("Eldritch Mind (Niesamowity umysł)", "Eldritch Mind"),
    desc: L("Przewaga na rzuty KON, by utrzymać Koncentrację.", "Advantage on CON saves to maintain Concentration.") },
  "eldritch-smite": { name: L("Eldritch Smite (Niesamowite porażenie)", "Eldritch Smite"), prereq: { level: 5, pact: "blade" },
    desc: L("Raz na turę po trafieniu bronią paktu: wydajesz slot paktu, cel dostaje 1k8 + 1k8 za krąg slotu obrażeń od mocy i możesz go przewrócić (Prone, do rozmiaru Huge).", "Once per turn when you hit with your pact weapon: spend a Pact Magic slot for 1d8 + 1d8 per slot level force damage, and you can knock the target Prone (Huge or smaller).") },
  "eldritch-spear": { name: L("Eldritch Spear (Niesamowita włócznia)", "Eldritch Spear"), prereq: { level: 2, cantrip: "range" }, repeatable: true,
    desc: (c) => L(`Zasięg wybranej sztuczki zadającej obrażenia (z zasięgiem 10+ ft) rośnie o ${30 * c.level} ft (30 × poziom).`, `One chosen damaging cantrip with 10+ ft range gains ${30 * c.level} ft of range (30 × level).`) },
  "fiendish-vigor": { name: L("Fiendish Vigor (Piekielny wigor)", "Fiendish Vigor"), prereq: { level: 2 }, innate: [{ id: "false-life", uses: "atwill", self: true }],
    desc: L("False Life na siebie bez slotu; zamiast rzucać kością bierzesz maksimum (12 tymczasowych HP).", "Cast False Life on yourself without a slot, taking the maximum instead of rolling (12 Temporary HP).") },
  "gaze-of-two-minds": { name: L("Gaze of Two Minds (Spojrzenie dwóch umysłów)", "Gaze of Two Minds"), prereq: { level: 5 },
    desc: L("Akcja bonusowa: dotykasz chętnej istoty i widzisz jej zmysłami do końca następnej tury (przedłużasz akcją bonusową). Możesz rzucać czary z jej miejsca, jeśli jest w 60 ft.", "Bonus Action: touch a willing creature and perceive through its senses until the end of your next turn (extend with a Bonus Action). You can cast spells as if from its space within 60 ft.") },
  "gift-of-the-depths": { name: L("Gift of the Depths (Dar głębin)", "Gift of the Depths"), prereq: { level: 5 }, innate: [{ id: "water-breathing", uses: "long" }],
    desc: L("Oddychasz pod wodą i pływasz z pełną szybkością. Raz na długi odpoczynek Water Breathing bez slotu.", "You breathe underwater and swim at your Speed. Water Breathing once per long rest without a slot.") },
  "gift-of-the-protectors": { name: L("Gift of the Protectors (Dar obrońców)", "Gift of the Protectors"), prereq: { level: 9, pact: "tome" },
    desc: L("Imiona wpisane do Księgi Cieni: gdy ktoś z nich spadnie do 0 HP, zostaje z 1 HP (raz na długi odpoczynek).", "Names written in your Book of Shadows: when one of them drops to 0 HP, it stays at 1 HP instead (once per long rest).") },
  "investment-of-the-chain-master": { name: L("Investment of the Chain Master (Dar pana łańcucha)", "Investment of the Chain Master"), prereq: { level: 5, pact: "chain" },
    desc: L("Chowaniec: latanie albo pływanie 40 ft, atak na Twoją akcję bonusową, obrażenia nekrotyczne lub promieniste, Twoje DC; Reakcją dajesz mu Odporność na obrażenia.", "Familiar: Fly or Swim Speed 40 ft, attacks on your Bonus Action, necrotic or radiant damage, uses your DC; as a Reaction give it Resistance to damage.") },
  "lessons-of-the-first-ones": { name: L("Lessons of the First Ones (Lekcje Pierwszych)", "Lessons of the First Ones"), prereq: { level: 2 }, repeatable: true, originFeat: true,
    desc: L("Dostajesz jeden feat pochodzenia (wybierasz go w kroku 5).", "You gain one Origin feat (pick it in step 5).") },
  lifedrinker: { name: L("Lifedrinker (Pijący życie)", "Lifedrinker"), prereq: { level: 9, pact: "blade" },
    desc: L("Raz na turę po trafieniu bronią paktu: +1k6 nekrotycznych, psychicznych lub promienistych i możesz wydać kość wytrzymałości na leczenie.", "Once per turn on a pact weapon hit: +1d6 necrotic, psychic or radiant, and you can spend a Hit Point Die to heal.") },
  "mask-of-many-faces": { name: L("Mask of Many Faces (Maska wielu twarzy)", "Mask of Many Faces"), prereq: { level: 2 }, innate: [{ id: "disguise-self", uses: "atwill" }],
    desc: L("Disguise Self bez slotu.", "Cast Disguise Self without a slot.") },
  "master-of-myriad-forms": { name: L("Master of Myriad Forms (Mistrz wielu postaci)", "Master of Myriad Forms"), prereq: { level: 5 }, innate: [{ id: "alter-self", uses: "atwill" }],
    desc: L("Alter Self bez slotu.", "Cast Alter Self without a slot.") },
  "misty-visions": { name: L("Misty Visions (Mgliste wizje)", "Misty Visions"), prereq: { level: 2 }, innate: [{ id: "silent-image", uses: "atwill" }],
    desc: L("Silent Image bez slotu.", "Cast Silent Image without a slot.") },
  "one-with-shadows": { name: L("One with Shadows (Jedno z cieniami)", "One with Shadows"), prereq: { level: 5 }, innate: [{ id: "invisibility", uses: "atwill", self: true }],
    desc: L("W przyćmionym świetle lub ciemności rzucasz Invisibility na siebie bez slotu.", "In Dim Light or Darkness, cast Invisibility on yourself without a slot.") },
  "otherworldly-leap": { name: L("Otherworldly Leap (Nieziemski skok)", "Otherworldly Leap"), prereq: { level: 2 }, innate: [{ id: "jump", uses: "atwill", self: true }],
    desc: L("Jump na siebie bez slotu.", "Cast Jump on yourself without a slot.") },
  "pact-of-the-blade": { name: L("Pact of the Blade (Pakt ostrza)", "Pact of the Blade"), pact: "blade",
    desc: L("Akcja bonusowa: przywołujesz broń wręcz (prostą lub wojenną) albo wiążesz się z magiczną bronią. Władasz nią biegle, atakujesz i zadajesz obrażenia CHA zamiast SIŁ/ZRĘ, możesz zadawać nekrotyczne, psychiczne lub promieniste; służy jako fokus.", "Bonus Action: conjure a Simple or Martial melee weapon, or bond with a magic weapon. You're proficient with it, use CHA for its attack and damage rolls, can deal necrotic, psychic or radiant damage, and can use it as a focus.") },
  "pact-of-the-chain": { name: L("Pact of the Chain (Pakt łańcucha)", "Pact of the Chain"), pact: "chain", innate: [{ id: "find-familiar", uses: "atwill" }],
    desc: L("Znasz Find Familiar i rzucasz go akcją Magic bez slotu; poza zwykłymi formami możesz wybrać impa, pseudosmoka, quasita, szkieleta, kijankę slaada, sfinksa cudów, duszka albo jadowitego węża. W akcji Attack możesz oddać jeden atak, by chowaniec zaatakował Reakcją.", "You know Find Familiar and cast it as a Magic action without a slot; besides the usual forms it can be an imp, pseudodragon, quasit, skeleton, slaad tadpole, sphinx of wonder, sprite or venomous snake. When you take the Attack action you can give up one attack so your familiar attacks with its Reaction.") },
  "pact-of-the-tome": { name: L("Pact of the Tome (Pakt księgi)", "Pact of the Tome"), pact: "tome",
    desc: L("Księga Cieni: 3 sztuczki i 2 czary 1. kręgu z dopiskiem rytuał, z dowolnych list (wybierasz w kroku 5). Masz je przygotowane, dopóki masz księgę; działają jak czary Czarnoksiężnika.", "Book of Shadows: 3 cantrips and 2 level 1 Ritual spells from any lists (pick them in step 5). They're prepared while you have the book and count as Warlock spells.") },
  "repelling-blast": { name: L("Repelling Blast (Odpychający wybuch)", "Repelling Blast"), prereq: { level: 2, cantrip: "attack" }, repeatable: true,
    desc: L("Gdy trafisz wybraną sztuczką z rzutem ataku istotę Large lub mniejszą, możesz ją odepchnąć o 10 ft.", "When you hit a Large or smaller creature with the chosen attack-roll cantrip, you can push it 10 ft away.") },
  "thirsting-blade": { name: L("Thirsting Blade (Spragnione ostrze)", "Thirsting Blade"), prereq: { level: 5, pact: "blade" },
    desc: L("Extra Attack bronią paktu: dwa ataki w akcji Attack.", "Extra Attack with your pact weapon: two attacks with the Attack action.") },
  "visions-of-distant-realms": { name: L("Visions of Distant Realms (Wizje dalekich krain)", "Visions of Distant Realms"), prereq: { level: 9 },
    desc: L("Arcane Eye bez slotu.", "Cast Arcane Eye without a slot.") },
  "whispers-of-the-grave": { name: L("Whispers of the Grave (Szepty grobu)", "Whispers of the Grave"), prereq: { level: 7 }, innate: [{ id: "speak-with-dead", uses: "atwill" }],
    desc: L("Speak with Dead bez slotu.", "Cast Speak with Dead without a slot.") },
  "witch-sight": { name: L("Witch Sight (Wiedźmi wzrok)", "Witch Sight"), prereq: { level: 15 },
    desc: L("Truesight 30 ft.", "Truesight out to 30 ft.") },
};

export const warlock = {
  id: "warlock",
  source: "phb2024",
  name: L("Czarnoksiężnik (Warlock)", "Warlock"),
  maxLevel: 5,
  asiLevels: [4, 8, 12, 16],
  hitDie: 8,
  standardArray: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 },
  saves: ["wis", "cha"],
  skillChoices: { count: 2, from: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
  armorTraining: ["light"],
  role: L("Czarujący z mocą od patrona. Kilka slotów, które wracają po krótkim odpoczynku, sztuczka Eldritch Blast jako główny atak i inwokacje, które zmieniają styl gry.",
    "A caster powered by a patron. A few slots that return on a short rest, Eldritch Blast as the main attack, and invocations that shape the play style."),

  spellcasting: (lv) => ({ ability: "cha", list: L("czarnoksiężnika", "Warlock"), listId: "warlock", pact: true, changeRule: "level",
    cantrips: CANTRIPS[lv], prepared: PREPARED[lv], slots: pactSlots(lv) }),

  /** Picks from the class's own option list (Eldritch Invocations). */
  optionPicks: (c) => [{ key: "invocations", label: L("Eldritch Invocations (Inwokacje)", "Eldritch Invocations"), count: INVOCATIONS[c.level], options: INVOCATION_OPTIONS, changeRule: "level" }],

  resources: (c) => [
    { id: "cunning", max: c.level >= 2 ? 1 : 0, recharge: "long", name: L("Magical Cunning (Magiczna przebiegłość)", "Magical Cunning") },
  ],

  summary: (c) => {
    const rows = [];
    const inv = c.classOptions?.invocations || [];
    if (c.knownSpells?.includes("eldritch-blast")) {
      const beams = c.level < 5 ? 1 : 2;
      const agon = inv.some((x) => x.base === "agonizing-blast" && x.cantrip === "eldritch-blast");
      rows.push({ label: L("Eldritch Blast", "Eldritch Blast"), value: `${beams}× 1d10${agon ? signed(c.mods.cha) : ""}`,
        note: L(`atak czarem ${signed(c.mods.cha + c.pb)}, 120 ft, moc${agon ? " (z Agonizing Blast)" : ""}`, `spell attack ${signed(c.mods.cha + c.pb)}, 120 ft, force${agon ? " (Agonizing Blast)" : ""}`) });
    }
    if (inv.some((x) => x.base === "pact-of-the-blade")) rows.push({ label: L("Broń paktu", "Pact weapon"), value: signed(c.mods.cha + c.pb),
      note: L(`obrażenia: kość broni ${signed(c.mods.cha)}${inv.some((x) => x.base === "thirsting-blade") ? "; 2 ataki" : ""}`, `damage: weapon die ${signed(c.mods.cha)}${inv.some((x) => x.base === "thirsting-blade") ? "; 2 attacks" : ""}`) });
    rows.push({ label: L("Sloty paktu", "Pact slots"), value: `${PACT_SLOTS[c.level]}× ${SLOT_LEVEL[c.level]}`, note: L("wracają po krótkim odpoczynku", "return on a short rest") });
    return rows;
  },

  features: [
    { lv: 1, id: "invocations", name: L("Eldritch Invocations (Inwokacje)", "Eldritch Invocations"),
      desc: (c) => L(`Znasz ${INVOCATIONS[c.level]} inwokacji (wybór w kroku 5). Przy każdym awansie możesz wymienić jedną na inną, jeśli spełniasz wymagania.`,
        `You know ${INVOCATIONS[c.level]} invocations (pick them in step 5). Each time you gain a level you can swap one for another you qualify for.`) },
    { lv: 1, id: "pact-magic", name: L("Pact Magic (Magia paktu)", "Pact Magic"),
      desc: (c) => L(`Czary czarnoksiężnika na CHA. ${CANTRIPS[c.level]} sztuczki, ${PREPARED[c.level]} przygotowanych czarów do ${SLOT_LEVEL[c.level]}. kręgu. ${PACT_SLOTS[c.level]}× slot ${SLOT_LEVEL[c.level]}. kręgu — każdy czar rzucasz na tym kręgu, a sloty wracają po krótkim lub długim odpoczynku. Przy awansie możesz wymienić jeden przygotowany czar i jedną sztuczkę.`,
        `Warlock spells using CHA. ${CANTRIPS[c.level]} cantrips, ${PREPARED[c.level]} prepared spells up to level ${SLOT_LEVEL[c.level]}. ${PACT_SLOTS[c.level]}× level ${SLOT_LEVEL[c.level]} slots — every spell is cast at that level, and the slots return on a short or long rest. When you gain a level you can swap one prepared spell and one cantrip.`) },
    { lv: 2, id: "magical-cunning", name: L("Magical Cunning (Magiczna przebiegłość)", "Magical Cunning"),
      desc: (c) => L(`Minutowy rytuał: odzyskujesz do ${Math.ceil(PACT_SLOTS[c.level] / 2)} zużytych slotów paktu (połowa maksimum, w górę). Raz na długi odpoczynek.`,
        `A one-minute rite: regain up to ${Math.ceil(PACT_SLOTS[c.level] / 2)} expended Pact Magic slots (half your maximum, rounded up). Once per long rest.`) },
    { lv: 3, id: "subclass", name: L("Patron (Warlock Subclass)", "Warlock Subclass"),
      desc: () => L("Wybierasz patrona. Jego zdolności i czary zawsze przygotowane pojawią się niżej.", "Choose your patron. Its features and always-prepared spells appear below.") },
    { lv: 4, id: "asi", name: L("Feat albo +2 do cech (ASI)", "Feat or Ability Score Improvement"),
      desc: () => L("Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch) na zakładce Awans.", "Pick a feat or +2 to one ability (or +1 to two) on the Level up tab.") },
  ],

  subclassLevel: 3,
  subclasses: {
    archfey: {
      source: "phb2024", name: L("Archfey Patron (Patron Arcyfey)", "Archfey Patron"),
      domainSpells: list({ 3: ["Calm Emotions", "Faerie Fire", "Misty Step", "Phantasmal Force", "Sleep"], 5: ["Blink", "Plant Growth"] }),
      resources: (c) => [{ id: "fey-steps", max: atLeast1(c.mods.cha), recharge: "long", name: L("Steps of the Fey (Kroki Fey)", "Steps of the Fey") }],
      features: [
        { lv: 3, id: "steps-of-the-fey", name: L("Steps of the Fey (Kroki Fey)", "Steps of the Fey"),
          desc: (c) => L(`Misty Step bez slotu ${atLeast1(c.mods.cha)}× na długi odpoczynek. Przy każdym Misty Step możesz dodać: Refreshing Step — Ty albo istota w 10 ft dostaje 1k10 tymczasowych HP; Taunting Step — istoty w 5 ft od miejsca, które opuszczasz, rzucają MĄD przeciw DC ${8 + c.mods.cha + c.pb} albo mają Utrudnienie na ataki w kogokolwiek poza Tobą do początku Twojej tury.`,
            `Misty Step without a slot ${atLeast1(c.mods.cha)}× per long rest. Each time you cast it you can add: Refreshing Step — you or a creature within 10 ft gains 1d10 Temporary HP; Taunting Step — creatures within 5 ft of the space you leave make a WIS save against DC ${8 + c.mods.cha + c.pb} or have Disadvantage on attacks against anyone but you until the start of your turn.`) },
      ],
    },
    celestial: {
      source: "phb2024", name: L("Celestial Patron (Patron Niebiański)", "Celestial Patron"),
      domainSpells: list({ 3: ["Aid", "Cure Wounds", "Guiding Bolt", "Lesser Restoration", "Light", "Sacred Flame"], 5: ["Daylight", "Revivify"] }),
      resources: (c) => [{ id: "healing-light", max: 1 + c.level, recharge: "long", name: L("Healing Light (kości k6)", "Healing Light (d6s)") }],
      features: [
        { lv: 3, id: "healing-light", name: L("Healing Light (Uzdrawiające światło)", "Healing Light"),
          desc: (c) => L(`Pula ${1 + c.level} kości k6 na długi odpoczynek. Akcja bonusowa: leczysz siebie albo widoczną istotę w 60 ft, wydając do ${atLeast1(c.mods.cha)} kości naraz.`,
            `A pool of ${1 + c.level} d6s per long rest. Bonus Action: heal yourself or a creature you can see within 60 ft, spending up to ${atLeast1(c.mods.cha)} dice at once.`) },
      ],
    },
    fiend: {
      source: "phb2024", name: L("Fiend Patron (Patron Diabelski)", "Fiend Patron"),
      domainSpells: list({ 3: ["Burning Hands", "Command", "Scorching Ray", "Suggestion"], 5: ["Fireball", "Stinking Cloud"] }),
      summary: (c) => [{ label: L("Dark One's Blessing", "Dark One's Blessing"), value: L(`${atLeast1(c.mods.cha + c.level)} tymcz. HP`, `${atLeast1(c.mods.cha + c.level)} temp HP`),
        note: L("gdy wróg spadnie do 0 HP (Twoją ręką albo w 10 ft od Ciebie)", "when an enemy drops to 0 HP (by you or within 10 ft of you)") }],
      features: [
        { lv: 3, id: "dark-ones-blessing", name: L("Dark One's Blessing (Błogosławieństwo Mrocznego)", "Dark One's Blessing"),
          desc: (c) => L(`Gdy sprowadzisz wroga do 0 HP — albo ktoś inny zrobi to w promieniu 10 ft od Ciebie — dostajesz ${atLeast1(c.mods.cha + c.level)} tymczasowych HP (CHA + poziom).`,
            `When you reduce an enemy to 0 HP — or someone else does within 10 ft of you — you gain ${atLeast1(c.mods.cha + c.level)} Temporary HP (CHA + level).`) },
      ],
    },
    "great-old-one": {
      source: "phb2024", name: L("Great Old One Patron (Patron Wielki Przedwieczny)", "Great Old One Patron"),
      domainSpells: list({ 3: ["Detect Thoughts", "Dissonant Whispers", "Phantasmal Force", "Tasha's Hideous Laughter"], 5: ["Clairvoyance", "Hunger of Hadar"] }),
      features: [
        { lv: 3, id: "awakened-mind", name: L("Awakened Mind (Przebudzony umysł)", "Awakened Mind"),
          desc: (c) => L(`Akcja bonusowa: więź telepatyczna z widoczną istotą w 30 ft, na ${c.level} minut i do ${atLeast1(c.mods.cha)} mil odległości. Musicie znać wspólny język.`,
            `Bonus Action: a telepathic link with a creature you can see within 30 ft, for ${c.level} minutes and up to ${atLeast1(c.mods.cha)} miles apart. You need a shared language.`) },
        { lv: 3, id: "psychic-spells", name: L("Psychic Spells (Psychiczne czary)", "Psychic Spells"),
          desc: () => L("Obrażenia Twoich czarów Czarnoksiężnika mogą być psychiczne. Czary zauroczeń i iluzji rzucasz bez komponentów werbalnych i somatycznych.", "Your Warlock spells' damage can be psychic. You cast Enchantment and Illusion spells without Verbal or Somatic components.") },
      ],
    },
    undead: {
      source: "ravenloft", name: L("Undead Patron (Patron Nieumarły)", "Undead Patron"),
      domainSpells: list({ 3: ["Bane", "Blindness/Deafness", "Phantasmal Force", "Ray of Sickness"], 5: ["Speak with Dead", "Summon Undead"] }),
      resources: (c) => [{ id: "form-of-dread", max: atLeast1(c.mods.cha), recharge: "long", name: L("Form of Dread (Postać grozy)", "Form of Dread") }],
      features: [
        { lv: 3, id: "form-of-dread", name: L("Form of Dread (Postać grozy)", "Form of Dread"),
          desc: (c) => L(`Akcja bonusowa, ${atLeast1(c.mods.cha)}× na długi odpoczynek, na minutę: dostajesz 1k10 + ${c.level} tymczasowych HP, nie możesz być Frightened, a raz na turę po trafieniu atakiem cel rzuca MĄD przeciw DC ${8 + c.mods.cha + c.pb} albo jest Frightened do końca Twojej następnej tury.`,
            `Bonus Action, ${atLeast1(c.mods.cha)}× per long rest, for 1 minute: gain 1d10 + ${c.level} Temporary HP, you can't be Frightened, and once per turn when you hit with an attack the target makes a WIS save against DC ${8 + c.mods.cha + c.pb} or is Frightened until the end of your next turn.`) },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Magical Cunning", "Inwokacje: 3", "Sloty paktu: 2", "3 przygotowane czary"], en: ["Magical Cunning", "Invocations: 3", "Pact slots: 2", "3 prepared spells"] },
    3: { pl: ["Wybór patrona", "Sloty paktu 2. kręgu", "4 przygotowane czary"], en: ["Choose a patron", "Level 2 pact slots", "4 prepared spells"] },
    4: { pl: ["Feat albo +2 do cech", "Sztuczki: 3", "5 przygotowanych czarów"], en: ["Feat or ability score increase", "Cantrips: 3", "5 prepared spells"] },
    5: { pl: ["Sloty paktu 3. kręgu", "Inwokacje: 5", "6 przygotowanych czarów", "PB +3", "Eldritch Blast: 2 promienie"], en: ["Level 3 pact slots", "Invocations: 5", "6 prepared spells", "Proficiency bonus +3", "Eldritch Blast: 2 beams"] },
  },
};
