// Druid, levels 1–5, 2024 rules (Player's Handbook ch. 3). Descriptions are our own paraphrase.
import { signed } from "../core.js";
import { BEASTS, SIZES_PL, crText, speedText } from "../beasts.js";

const L = (pl, en) => ({ pl, en });
const SLOTS = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2] };
const PREPARED = { 1: 4, 2: 5, 3: 6, 4: 7, 5: 9 };
const atLeast1 = (n) => Math.max(1, n);
const list = (byLevel) => (lv) => Object.entries(byLevel).filter(([k]) => +k <= lv).flatMap(([, s]) => s);

/** Wild Shape: uses, known forms and the highest Challenge Rating by Druid level (Beast Shapes table). */
export const wildShapeUses = (lv) => (lv < 2 ? 0 : lv < 6 ? 2 : lv < 17 ? 3 : 4);
export const knownForms = (lv) => (lv < 2 ? 0 : lv < 4 ? 4 : lv < 8 ? 6 : 8);
/** Circle of the Moon raises the limit to Druid level ÷ 3 (round down). */
export const maxCr = (lv, moon = false) => Math.max(lv < 4 ? 0.25 : lv < 8 ? 0.5 : 1, moon && lv >= 3 ? Math.floor(lv / 3) : 0);

const beastText = (b) => L(`${SIZES_PL[b.size].pl}, CR ${crText(b.cr)}. KP ${b.ac}, prędkość ${speedText(b).pl}. SIŁ ${b.str}, ZRĘ ${b.dex}, KON ${b.con}${b.senses ? ", " + b.senses.pl : ""}. ${b.attacks.pl}${b.traits ? " " + b.traits.pl : ""}`,
  `${SIZES_PL[b.size].en}, CR ${crText(b.cr)}. AC ${b.ac}, Speed ${speedText(b).en}. STR ${b.str}, DEX ${b.dex}, CON ${b.con}${b.senses ? ", " + b.senses.en : ""}. ${b.attacks.en}${b.traits ? " " + b.traits.en : ""}`);

/** Beast forms as class options: picked in step 5 (or on level up), one can be swapped after each long rest. */
export const FORM_OPTIONS = Object.fromEntries(Object.values(BEASTS).map((b) => [b.id, {
  name: b.name, desc: () => beastText(b), beast: b.id,
  blocked: (c) => (b.cr > maxCr(c.level, c.subclassId === "moon") ? L(`CR ${crText(b.cr)} — za wysokie na tym poziomie`, `CR ${crText(b.cr)} — too high at this level`) : null),
}]));

/** Circle of the Land: the land picked after each long rest decides the circle spells. */
const LAND_SPELLS = {
  arid: { 3: ["Blur", "Burning Hands", "Fire Bolt"], 5: ["Fireball"] },
  polar: { 3: ["Fog Cloud", "Hold Person", "Ray of Frost"], 5: ["Sleet Storm"] },
  temperate: { 3: ["Misty Step", "Shocking Grasp", "Sleep"], 5: ["Lightning Bolt"] },
  tropical: { 3: ["Acid Splash", "Ray of Sickness", "Web"], 5: ["Stinking Cloud"] },
};

export const druid = {
  id: "druid",
  source: "srd52",
  name: L("Druid", "Druid"),
  maxLevel: 5,
  asiLevels: [4, 8, 12, 16],
  hitDie: 8,
  standardArray: { str: 8, dex: 12, con: 14, int: 13, wis: 15, cha: 10 },
  saves: ["int", "wis"],
  skillChoices: { count: 2, from: ["arcana", "animal", "insight", "medicine", "nature", "perception", "religion", "survival"] },
  armorTraining: ["light", "shield"],
  toolsFixed: ["herbalism"],
  languages: { auto: ["druidic"] },
  role: L("Kapłan natury: leczy, kontroluje pole walki czarami żywiołów i zmienia się w zwierzęta (Wild Shape), żeby walczyć, zwiadować albo przetrwać.",
    "A priest of nature: heals, controls the battlefield with elemental spells and turns into animals (Wild Shape) to fight, scout or survive."),

  choices: {
    order: {
      lv: 1, label: L("Primal Order (Pierwotny porządek)", "Primal Order"), default: "magician",
      options: {
        magician: L("Magician (Mag): +1 sztuczka, premia do Arcany i Natury", "Magician: +1 cantrip, bonus to Arcana and Nature"),
        warden: L("Warden (Strażnik): broń wojenna i średnie zbroje", "Warden: martial weapons and medium armor"),
      },
    },
    land: {
      lv: 3, subclass: "land", label: L("Ziemia kręgu (zmienisz ją po długim odpoczynku)", "Circle land (change it after a long rest)"), default: "temperate",
      options: { arid: L("Pustynna (Arid)", "Arid"), polar: L("Polarna (Polar)", "Polar"), temperate: L("Umiarkowana (Temperate)", "Temperate"), tropical: L("Tropikalna (Tropical)", "Tropical") },
    },
  },
  extraArmorTraining: (c) => (c.classChoices.order === "warden" ? ["medium"] : []),
  skillBonus: (c, skill) => (c.classChoices.order === "magician" && (skill === "arcana" || skill === "nature") ? atLeast1(c.mods.wis) : 0),

  spellcasting: (lv, c) => ({ ability: "wis", list: L("druida", "Druid"), listId: "druid",
    cantrips: (lv < 4 ? 2 : 3) + (c.classChoices.order === "magician" ? 1 : 0), prepared: PREPARED[lv], slots: SLOTS[lv] }),
  /** Druidic: Speak with Animals is always prepared. */
  alwaysSpells: () => ["Speak with Animals"],

  optionPicks: (c) => (c.level >= 2 ? [{ key: "forms", label: L("Formy Wild Shape", "Wild Shape forms"), count: knownForms(c.level), options: FORM_OPTIONS, changeRule: "longRest" }] : []),

  resources: (c) => [
    { id: "wild-shape", max: wildShapeUses(c.level), recharge: "long", shortRegain: 1, name: L("Wild Shape (Dziki kształt)", "Wild Shape") },
    { id: "wild-resurgence", max: c.level >= 5 ? 1 : 0, recharge: "long", name: L("Wild Resurgence: slot za Wild Shape", "Wild Resurgence: slot for Wild Shape") },
  ],

  summary: (c) => {
    const rows = [];
    if (c.level >= 2) {
      const moon = c.subclassId === "moon";
      rows.push({ label: L("Wild Shape", "Wild Shape"), value: L(`CR do ${crText(maxCr(c.level, moon))}`, `CR up to ${crText(maxCr(c.level, moon))}`),
        note: L(`akcja bonusowa, ${Math.floor(c.level / 2)} h; ${moon ? 3 * c.level : c.level} tymczasowych HP; ${knownForms(c.level)} znanych form`, `Bonus Action, ${Math.floor(c.level / 2)} h; ${moon ? 3 * c.level : c.level} Temporary HP; ${knownForms(c.level)} known forms`) });
    }
    return rows;
  },

  features: [
    { lv: 1, id: "spellcasting", name: L("Spellcasting (Czary)", "Spellcasting"),
      desc: (c) => {
        const s = druid.spellcasting(c.level, c);
        return L(`Czary druida na MĄD. ${s.cantrips} sztuczki, ${s.prepared} przygotowanych czarów; listę zmieniasz po długim odpoczynku. Przy awansie możesz wymienić jedną sztuczkę. Fokus: przedmiot druidzki.`,
          `Druid spells using WIS. ${s.cantrips} cantrips, ${s.prepared} prepared spells; change the list after a long rest. When you gain a level you can swap one cantrip. Focus: a Druidic Focus.`);
      } },
    { lv: 1, id: "druidic", name: L("Druidic (Druidzki)", "Druidic"),
      desc: () => L("Znasz tajny język druidów i zostawiasz w nim ukryte wiadomości (inni zauważą je testem INT (Investigation) DC 15, ale nie odczytają bez magii). Speak with Animals masz zawsze przygotowany.",
        "You know the Druids' secret language and can leave hidden messages in it (others spot them with a DC 15 INT (Investigation) check but can't read them without magic). Speak with Animals is always prepared.") },
    { lv: 1, id: "primal-order", name: L("Primal Order (Pierwotny porządek)", "Primal Order"),
      desc: (c) => (c.classChoices.order === "warden"
        ? L("Warden: biegłość w broni wojennej i średnich zbrojach.", "Warden: proficiency with Martial weapons and Medium armor training.")
        : L(`Magician: jedna sztuczka więcej i +${atLeast1(c.mods.wis)} do testów INT (Arcana, Nature). Już wliczone.`, `Magician: one extra cantrip and +${atLeast1(c.mods.wis)} to INT (Arcana, Nature) checks. Already included.`)) },
    { lv: 2, id: "wild-shape", name: L("Wild Shape (Dziki kształt)", "Wild Shape"),
      desc: (c) => {
        const moon = c.subclassId === "moon";
        return L(`Akcja bonusowa: zmieniasz się w znane zwierzę (${knownForms(c.level)} form, CR do ${crText(maxCr(c.level, moon))}, bez latania) na ${Math.floor(c.level / 2)} h. Dostajesz ${moon ? 3 * c.level : c.level} tymczasowych HP. Zachowujesz swoje HP, INT, MĄD, CHA, biegłości i zdolności, ale bierzesz statystyki zwierzęcia (KP, prędkość, SIŁ, ZRĘ, KON, ataki). Nie rzucasz czarów${moon ? " (poza czarami kręgu)" : ""}, ale koncentracja trwa. Wracasz akcją bonusową. ${wildShapeUses(c.level)} użycia; krótki odpoczynek oddaje jedno. Po długim odpoczynku możesz wymienić jedną znaną formę.`,
          `Bonus Action: turn into a known Beast (${knownForms(c.level)} forms, CR up to ${crText(maxCr(c.level, moon))}, no flying) for ${Math.floor(c.level / 2)} hours. You gain ${moon ? 3 * c.level : c.level} Temporary HP. You keep your HP, INT, WIS, CHA, proficiencies and features but use the Beast's AC, Speed, STR, DEX, CON and attacks. You can't cast spells${moon ? " (except circle spells)" : ""}, though Concentration continues. Leave as a Bonus Action. ${wildShapeUses(c.level)} uses; a short rest restores one. After a long rest you can swap one known form.`);
      } },
    { lv: 2, id: "wild-companion", name: L("Wild Companion (Dziki towarzysz)", "Wild Companion"),
      desc: () => L("Akcja Magic: za slot albo użycie Wild Shape rzucasz Find Familiar bez komponentów materialnych. Chowaniec jest Fey i znika po długim odpoczynku.",
        "Magic action: spend a spell slot or a use of Wild Shape to cast Find Familiar without Material components. The familiar is Fey and vanishes when you finish a long rest.") },
    { lv: 3, id: "subclass", name: L("Krąg (Druid Subclass)", "Druid Subclass"),
      desc: () => L("Wybierasz krąg druidów. Jego zdolności i czary zawsze przygotowane pojawią się niżej.", "Choose your druid circle. Its features and always-prepared spells appear below.") },
    { lv: 4, id: "asi", name: L("Feat albo +2 do cech (ASI)", "Feat or Ability Score Improvement"),
      desc: () => L("Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch) na zakładce Awans.", "Pick a feat or +2 to one ability (or +1 to two) on the Level up tab.") },
    { lv: 5, id: "wild-resurgence", name: L("Wild Resurgence (Dzikie odrodzenie)", "Wild Resurgence"),
      desc: () => L("Raz w turze, gdy nie masz już użyć Wild Shape, możesz wydać slot czaru, żeby odzyskać jedno (bez akcji). Możesz też wydać użycie Wild Shape, żeby dostać slot 1. kręgu — raz na długi odpoczynek.",
        "Once per turn, with no Wild Shape uses left, you can spend a spell slot to get one back (no action). You can also spend a use of Wild Shape to gain a level 1 spell slot — once per long rest.") },
  ],

  subclassLevel: 3,
  subclasses: {
    land: {
      source: "srd52", name: L("Circle of the Land (Krąg Ziemi)", "Circle of the Land"),
      domainSpells: (lv, c) => list(LAND_SPELLS[c?.classChoices?.land] || LAND_SPELLS.temperate)(lv),
      features: [
        { lv: 3, id: "land-spells", name: L("Circle of the Land Spells (Czary kręgu)", "Circle of the Land Spells"),
          desc: (c) => L(`Po każdym długim odpoczynku wybierasz ziemię: pustynną, polarną, umiarkowaną albo tropikalną. Jej czary masz zawsze przygotowane (teraz: ${{ arid: "pustynna", polar: "polarna", temperate: "umiarkowana", tropical: "tropikalna" }[c.classChoices.land]}). Zmienisz ją na zakładce Czary.`,
            `After each long rest choose a land: arid, polar, temperate or tropical. Its spells are always prepared (now: ${c.classChoices.land}). Change it on the Spells tab.`) },
        { lv: 3, id: "lands-aid", name: L("Land's Aid (Pomoc ziemi)", "Land's Aid"),
          desc: (c) => L(`Akcja Magic, za użycie Wild Shape: kula o promieniu 10 ft w punkcie do 60 ft. Wybrane istoty rzucają KON przeciw DC ${8 + c.mods.wis + c.pb} — 2k6 nekrotycznych, połowa przy sukcesie. Jedna wybrana istota w kuli odzyskuje 2k6 HP.`,
            `Magic action, spend a use of Wild Shape: a 10-ft-radius Sphere at a point within 60 ft. Chosen creatures make a CON save against DC ${8 + c.mods.wis + c.pb} — 2d6 Necrotic, half on a success. One chosen creature in it regains 2d6 HP.`) },
      ],
    },
    moon: {
      source: "phb2024", name: L("Circle of the Moon (Krąg Księżyca)", "Circle of the Moon"),
      domainSpells: list({ 3: ["Cure Wounds", "Moonbeam", "Starry Wisp"], 5: ["Conjure Animals"] }),
      features: [
        { lv: 3, id: "circle-forms", name: L("Circle Forms (Formy kręgu)", "Circle Forms"),
          desc: (c) => L(`W Wild Shape: formy do CR ${crText(maxCr(c.level, true))} (poziom ÷ 3), KP co najmniej 13 + MĄD (${13 + c.mods.wis}) i ${3 * c.level} tymczasowych HP (3 × poziom).`,
            `In Wild Shape: forms up to CR ${crText(maxCr(c.level, true))} (level ÷ 3), AC at least 13 + WIS (${13 + c.mods.wis}) and ${3 * c.level} Temporary HP (3 × level).`) },
        { lv: 3, id: "moon-spells", name: L("Circle of the Moon Spells (Czary kręgu)", "Circle of the Moon Spells"),
          desc: () => L("Czary kręgu masz zawsze przygotowane i możesz je rzucać także w zwierzęcej formie.", "Circle spells are always prepared, and you can cast them even in Wild Shape.") },
      ],
    },
    sea: {
      source: "phb2024", name: L("Circle of the Sea (Krąg Morza)", "Circle of the Sea"),
      domainSpells: list({ 3: ["Fog Cloud", "Gust of Wind", "Ray of Frost", "Shatter", "Thunderwave"], 5: ["Lightning Bolt", "Water Breathing"] }),
      features: [
        { lv: 3, id: "wrath-of-the-sea", name: L("Wrath of the Sea (Gniew morza)", "Wrath of the Sea"),
          desc: (c) => L(`Akcja bonusowa, za użycie Wild Shape: na 10 minut otacza Cię morska mgiełka (emanacja 5 ft). Od razu i potem akcją bonusową w kolejnych turach wybierasz istotę w niej: rzuca KON przeciw DC ${8 + c.mods.wis + c.pb}, porażka = ${atLeast1(c.mods.wis)}k6 od zimna i odepchnięcie o 15 ft (Duża lub mniejsza).`,
            `Bonus Action, spend a use of Wild Shape: ocean spray surrounds you for 10 minutes (5-ft Emanation). Right away and as a Bonus Action on later turns, pick a creature in it: CON save against DC ${8 + c.mods.wis + c.pb}; on a fail ${atLeast1(c.mods.wis)}d6 Cold and pushed 15 ft (Large or smaller).`) },
      ],
    },
    stars: {
      source: "phb2024", name: L("Circle of the Stars (Krąg Gwiazd)", "Circle of the Stars"),
      domainSpells: list({ 3: ["Guidance", "Guiding Bolt"] }),
      freeCasts: { "guiding-bolt": "star-map" },
      resources: (c) => [{ id: "star-map", max: atLeast1(c.mods.wis), recharge: "long", name: L("Star Map: Guiding Bolt bez slotu", "Star Map: Guiding Bolt without a slot") }],
      features: [
        { lv: 3, id: "star-map", name: L("Star Map (Mapa gwiazd)", "Star Map"),
          desc: (c) => L(`Twoja mapa nieba jest fokusem czarów. Trzymając ją, masz przygotowane Guidance i Guiding Bolt, a Guiding Bolt rzucasz bez slotu ${atLeast1(c.mods.wis)}× na długi odpoczynek. Zgubioną mapę odtworzysz godzinnym rytuałem w czasie odpoczynku.`,
            `Your star chart is a spellcasting focus. While holding it you have Guidance and Guiding Bolt prepared and can cast Guiding Bolt without a slot ${atLeast1(c.mods.wis)}× per long rest. A lost map is remade with a 1-hour ceremony during a rest.`) },
        { lv: 3, id: "starry-form", name: L("Starry Form (Gwiezdna postać)", "Starry Form"),
          desc: (c) => L(`Akcja bonusowa, za użycie Wild Shape (zamiast przemiany): na 10 minut świecisz (jasne światło 10 ft) i wybierasz konstelację. Łucznik: od razu i akcją bonusową w kolejnych turach atak czarem ${signed(c.mods.wis + c.pb)} w cel do 60 ft, 1k8 ${signed(c.mods.wis)} promienistych. Kielich: gdy leczysz czarem ze slotu, Ty albo ktoś w 30 ft odzyskuje dodatkowo 1k8 ${signed(c.mods.wis)} HP. Smok: przy testach INT i MĄD oraz rzutach KON na koncentrację wynik 9 lub mniej na k20 liczysz jako 10.`,
            `Bonus Action, spend a use of Wild Shape (instead of shape-shifting): you glow for 10 minutes (Bright Light 10 ft) and pick a constellation. Archer: right away and as a Bonus Action on later turns, a spell attack ${signed(c.mods.wis + c.pb)} at a target within 60 ft, 1d8 ${signed(c.mods.wis)} Radiant. Chalice: when you heal with a slot spell, you or someone within 30 ft regains another 1d8 ${signed(c.mods.wis)} HP. Dragon: on INT and WIS checks and CON saves for Concentration, treat a d20 roll of 9 or lower as a 10.`) },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Wild Shape (2 użycia, 4 formy)", "Wild Companion", "5 przygotowanych czarów, 3 sloty 1. kręgu"], en: ["Wild Shape (2 uses, 4 forms)", "Wild Companion", "5 prepared spells, 3 level 1 slots"] },
    3: { pl: ["Wybór kręgu", "Czary 2. kręgu: 2 sloty", "6 przygotowanych czarów"], en: ["Choose a circle", "Level 2 spells: 2 slots", "6 prepared spells"] },
    4: { pl: ["Feat albo +2 do cech", "Dodatkowa sztuczka", "Wild Shape: 6 form, CR do 1/2", "7 przygotowanych czarów"], en: ["Feat or ability score increase", "One more cantrip", "Wild Shape: 6 forms, CR up to 1/2", "7 prepared spells"] },
    5: { pl: ["Wild Resurgence", "Czary 3. kręgu: 2 sloty", "9 przygotowanych czarów", "PB +3"], en: ["Wild Resurgence", "Level 3 spells: 2 slots", "9 prepared spells", "Proficiency bonus +3"] },
  },
};
