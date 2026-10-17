// Ravenloft: The Horrors Within, chapter 1 — new Origin feats and Dark Gift feats. Descriptions in our own words.
//
// Dark Gifts (category "dark-gift") need a Ravenloft campaign. With the DM's permission a Dark Gift can be taken
// whenever you'd gain an Origin feat (background, Human Versatile). Mist Wanderer and Spirit Medium give one directly.
//
// Extra fields used by the engine:
//   innate:       spells the feat grants [{ id, uses: "atwill" | "long" | "pb" }] (see SPECIES_SPELLS in species.js)
//   spellAbility: the player picks INT, WIS or CHA for those spells
//   grants:       { skill, expertise } — proficiency if you lack it, and Expertise
//   skillSlot:    { count, from } — skills you pick (from: null = any)
//   expertisePick: pick Expertise in one skill you're proficient in
//   language:     extra languages to pick
//   deathSaves:   "adv" | "dis"
//   flaw:         the price: { save, text(ctx) } — rolled immediately after a natural 1 on a D20 Test (unless the text says otherwise)
//   catalyst:     roll 1d6 once on the Change Catalyst table (Second Skin)

const D = (pl, en) => ({ pl, en });
const o = (pl, en, x) => ({ source: "ravenloft", category: "origin", name: D(`${en} (${pl})`, en), ...x });
const dg = (pl, en, x) => ({ source: "ravenloft", category: "dark-gift", darkGift: true, name: D(`${en} (${pl})`, en), ...x });
const flawDc = (c) => 13 + c.pb;

export const RAVENLOFT_ORIGIN_FEATS = {
  "sharp-eye": o("Bystre oko", "Sharp Eye", {
    desc: D("Przy akcji Search albo Study możesz dać sobie Przewagę na test. Tyle razy, ile wynosi PB, na długi odpoczynek; nieudany test nie zużywa użycia.",
      "When you take the Search or Study action you can give yourself Advantage on the check. PB times per long rest; a failed check doesn't spend the use."),
    resource: (c) => ({ id: "sharp-eye", max: c.pb, recharge: "long", name: D("Sharp Eye (Bystre oko)", "Sharp Eye") }),
  }),
  survivor: o("Ocalały", "Survivor", {
    desc: D("Hypervigilance: wynik 9 lub mniej na k20 Inicjatywy przerzucasz (bierzesz nowy). Steel Yourself: raz na długi odpoczynek, gdy oblejesz rzut przeciw Charmed albo Frightened, Reakcją dodajesz PB do wyniku.",
      "Hypervigilance: reroll an Initiative d20 of 9 or lower (use the new roll). Steel Yourself: once per long rest, when you fail a save to avoid or end Charmed or Frightened, add your PB to it as a Reaction."),
    initiativeReroll: 9, // Hypervigilance: the party's Initiative roll (0.41) rerolls a kept d20 of 9 or lower
    resource: () => ({ id: "steel-yourself", max: 1, recharge: "long", name: D("Steel Yourself (Survivor)", "Steel Yourself (Survivor)") }),
  }),
};

export const CATALYSTS = {
  1: D("Widok określonej fazy księżyca", "Seeing a particular phase of the moon"),
  2: D("Zapach określonego kwiatu", "Smelling the scent of a certain type of flower"),
  3: D("Dźwięk dzwonów świątynnych", "Hearing temple bells ringing"),
  4: D("Określona melodia", "Hearing a particular melody"),
  5: D("Dotyk czystego srebra gołą skórą", "Touching pure silver with your bare skin"),
  6: D("Ktoś podobny do konkretnej osoby", "Seeing someone who resembles a specific individual"),
};

export const DARK_GIFTS = {
  "aberrant-anatomy": dg("Nieludzka anatomia", "Aberrant Anatomy", {
    grants: { skill: "perception", expertise: "perception" }, senses: { blindsight: 15 },
    desc: D("Wstrzymujesz oddech na godzinę. Biegłość i Expertise w Perception. Blindsight 15 ft.",
      "You can hold your breath for 1 hour. Proficiency and Expertise in Perception. Blindsight 15 ft."),
    flaw: { save: "con", text: (c) => D(`Warping Flesh: po naturalnej 1 na k20 rzut KON (DC ${flawDc(c)}); porażka = Stunned do końca Twojej następnej tury.`,
      `Warping Flesh: after a natural 1 on a d20, CON save (DC ${flawDc(c)}); on a fail you are Stunned until the end of your next turn.`) },
  }),
  "echoing-soul": dg("Echo duszy", "Echoing Soul", {
    skillSlot: { count: 2, from: null }, expertisePick: true, language: 1,
    desc: D("Biegłość w 2 dowolnych umiejętnościach. Expertise w jednej umiejętności, w której masz biegłość (możesz ją zmienić po długim odpoczynku). Jeden dodatkowy język.",
      "Proficiency in 2 skills of your choice. Expertise in one skill you're proficient in (you can change it after a long rest). One extra language."),
    flaw: { save: "con", text: (c) => D(`Intrusive Echoes: po naturalnej 1 na k20 rzut KON (DC ${flawDc(c)}); porażka = Incapacitated do końca Twojej następnej tury, z połową szybkości.`,
      `Intrusive Echoes: after a natural 1 on a d20, CON save (DC ${flawDc(c)}); on a fail you are Incapacitated until the end of your next turn and your Speed is halved.`) },
  }),
  "gathered-whispers": dg("Zebrane szepty", "Gathered Whispers", {
    spellAbility: true, innate: [{ id: "message", uses: "atwill" }, { id: "augury", uses: "long" }],
    desc: D("Znasz Message (bez komponentów materialnych). Augury masz zawsze przygotowane: raz na długi odpoczynek bez slotu i komponentów. Unearthly Scream: gdy trafi Cię atak, Reakcją dodajesz PB do KP przeciw niemu — PB razy na długi odpoczynek.",
      "You know Message (no Material components). Augury is always prepared: once per long rest without a slot or components. Unearthly Scream: when an attack hits you, add your PB to your AC against it as a Reaction — PB times per long rest."),
    resource: (c) => ({ id: "unearthly-scream", max: c.pb, recharge: "long", name: D("Unearthly Scream (Nieziemski krzyk)", "Unearthly Scream") }),
    flaw: { save: "wis", text: (c) => D(`Voices from Beyond: po naturalnej 1 na k20 rzut MĄD (DC ${flawDc(c)}); porażka = Deafened do końca Twojej następnej tury, z Utrudnieniem na testy cech i ataki.`,
      `Voices from Beyond: after a natural 1 on a d20, WIS save (DC ${flawDc(c)}); on a fail you are Deafened until the end of your next turn, with Disadvantage on ability checks and attack rolls.`) },
  }),
  "living-shadow": dg("Żywy cień", "Living Shadow", {
    spellAbility: true, innate: [{ id: "mage-hand", uses: "atwill" }],
    desc: D("Znasz Mage Hand (bez komponentów). Lengthened Strike: przy ataku wręcz w akcji Attack lub Magic zwiększasz zasięg o 10 ft — PB razy na długi odpoczynek.",
      "You know Mage Hand (no components). Lengthened Strike: on a melee attack as part of the Attack or Magic action, add 10 ft of reach — PB times per long rest."),
    resource: (c) => ({ id: "lengthened-strike", max: c.pb, recharge: "long", name: D("Lengthened Strike (Wydłużony cios)", "Lengthened Strike") }),
    flaw: { save: "wis", text: (c) => D(`Ominous Will: po naturalnej 1 na k20 rzut MĄD (DC ${flawDc(c)}); porażka = Incapacitated do początku Twojej tury, potem k8 na tabeli Shadow's Will: 1 — idziesz w losową stronę (k4), 2–6 — atakujesz losową istotę w zasięgu, 7–8 — padasz (Prone) i tura się kończy.`,
      `Ominous Will: after a natural 1 on a d20, WIS save (DC ${flawDc(c)}); on a fail you are Incapacitated until the start of your turn, then roll d8 on Shadow's Will: 1 — walk in a random direction (d4), 2–6 — attack a random creature in reach, 7–8 — fall Prone and end your turn.`) },
  }),
  "mist-walker": dg("Wędrowiec mgieł", "Mist Walker", {
    desc: D("Domain Traveler: wchodząc w Mgły, działasz jak z talizmanem do znanej z nazwy domeny (granic zamkniętych przez Darklorda to nie omija). Mist Walk: gdy dostajesz obrażenia albo oblejesz rzut przeciw Grappled/Restrained, Reakcją teleportujesz się do 15 ft — PB razy na długi odpoczynek.",
      "Domain Traveler: entering the Mists, you act as if holding a Mist talisman for a domain you know by name (borders a Darklord has closed stay closed). Mist Walk: when you take damage or fail a save against Grappled/Restrained, teleport up to 15 ft as a Reaction — PB times per long rest."),
    resource: (c) => ({ id: "mist-walk", max: c.pb, recharge: "long", name: D("Mist Walk (Krok we mgle)", "Mist Walk") }),
    flaw: { save: "con", text: (c) => D(`Poisoned Roots: po długim odpoczynku okolica w promieniu 10 mil wysysa z Ciebie siły. Każdy krótki odpoczynek tam: rzut KON (DC ${flawDc(c)}); porażka = odpoczynek nic nie daje.`,
      `Poisoned Roots: after a long rest, the land within 10 miles drains you. Each short rest there: CON save (DC ${flawDc(c)}); on a fail the rest gives no benefit.`) },
  }),
  "second-skin": dg("Druga skóra", "Second Skin", {
    spellAbility: true, innate: [{ id: "alter-self", uses: "long" }], catalyst: true,
    desc: D("Alter Self masz zawsze przygotowane: raz na długi odpoczynek bez slotu i komponentów, wtedy bez Koncentracji.",
      "Alter Self is always prepared: once per long rest without a slot or components, and then it needs no Concentration."),
    flaw: { save: "cha", text: (c) => D(`Involuntary Change: po zetknięciu z wyzwalaczem na początku następnej tury rzut CHA (DC ${flawDc(c)}); porażka = od razu rzucasz Alter Self z tej cechy, a jeśli już go zużyłeś — Stunned do początku następnej tury.`,
      `Involuntary Change: after meeting your catalyst, CHA save (DC ${flawDc(c)}) at the start of your next turn; on a fail you cast Alter Self from this feat at once, or if that's spent you are Stunned until the start of your next turn.`) },
  }),
  "symbiotic-being": dg("Symbiont", "Symbiotic Being", {
    skillSlot: { count: 1, from: ["arcana", "deception", "history", "intimidation", "insight", "investigation", "nature", "religion", "perception", "persuasion"] }, language: 1,
    desc: D("Biegłość w jednej z: Arcana, Deception, History, Intimidation, Insight, Investigation, Nature, Religion, Perception, Persuasion; jeden dodatkowy język. Sustained Symbiosis: gdy oblejesz rzut obronny, Reakcją wydajesz kość wytrzymałości i dodajesz wynik — PB razy na długi odpoczynek. Symbiont ginie i wraca razem z Tobą.",
      "Proficiency in one of: Arcana, Deception, History, Intimidation, Insight, Investigation, Nature, Religion, Perception, Persuasion; one extra language. Sustained Symbiosis: when you fail a save, spend a Hit Point Die as a Reaction and add the roll — PB times per long rest. The symbiote dies and returns with you."),
    resource: (c) => ({ id: "symbiosis", max: c.pb, recharge: "long", name: D("Sustained Symbiosis", "Sustained Symbiosis") }),
    flaw: { save: "cha", text: (c) => D(`Symbiotic Agenda: po naturalnej 1 na k20 rzut CHA (DC ${flawDc(c)}); porażka = Charmed na 1k12 godzin i wykonujesz polecenia symbionta (DM). Po każdych obrażeniach ponawiasz rzut.`,
      `Symbiotic Agenda: after a natural 1 on a d20, CHA save (DC ${flawDc(c)}); on a fail you are Charmed for 1d12 hours and follow the symbiote's commands (DM). Repeat the save whenever you take damage.`) },
  }),
  "touch-of-death": dg("Dotyk śmierci", "Touch of Death", {
    spellAbility: true, innate: [{ id: "chill-touch", uses: "atwill" }], deathSaves: "dis",
    desc: D("Znasz Chill Touch (bez komponentów); jego obrażenia nekrotyczne ignorują Odporność.",
      "You know Chill Touch (no components); its Necrotic damage ignores Resistance."),
    flaw: { text: () => D("Pull of the Grave: Utrudnienie na rzuty przeciw śmierci.", "Pull of the Grave: Disadvantage on Death Saving Throws.") },
  }),
  watchers: dg("Obserwatorzy", "Watchers", {
    innate: [{ id: "beast-sense", uses: "long" }, { id: "speak-with-animals", uses: "long" }],
    desc: D("Beast Sense i Speak with Animals masz zawsze przygotowane: każdy raz na długi odpoczynek bez slotu. Heightened Suspicion: przy akcji Search dodajesz 1k4 do testu.",
      "Beast Sense and Speak with Animals are always prepared: each once per long rest without a slot. Heightened Suspicion: when you take the Search action, add 1d4 to the check."),
    flaw: { save: "wis", text: (c) => D(`Incessant Watchers: Utrudnienie na rzuty przeciw Scrying. Po naturalnej 1 na k20 rzut MĄD (DC ${flawDc(c)}); porażka = Utrudnienie na testy k20 przez minutę (ponawiasz rzut na końcu każdej tury).`,
      `Incessant Watchers: Disadvantage on saves against Scrying. After a natural 1 on a d20, WIS save (DC ${flawDc(c)}); on a fail you have Disadvantage on D20 Tests for 1 minute (repeat the save at the end of each turn).`) },
  }),
};
