// Familiar forms for Find Familiar (PHB 2024, ch. 7) and the Warlock's Pact of the Chain (ch. 3).
// Numbers come from the stat blocks in appendix B; traits and actions are our own short paraphrase.
// The spell's list: Bat, Cat, Frog, Hawk, Lizard, Octopus, Owl, Rat, Raven, Spider, Weasel, or another CR 0 Beast.
// The familiar is a Celestial, Fey or Fiend (your choice) instead of a Beast; Wild Companion (Druid) makes it Fey.
const L = (pl, en) => ({ pl, en });

export const FAMILIAR_GROUPS = ["basic", "beast", "chain"];
export const FAMILIAR_TYPES = { celestial: L("Niebianin (Celestial)", "Celestial"), fey: L("Istota czarodziejska (Fey)", "Fey"), fiend: L("Czart (Fiend)", "Fiend") };
const SIZE = { tiny: L("Drobny", "Tiny"), small: L("Mały", "Small"), medium: L("Średni", "Medium") };
const KIND = { beast: L("Zwierzę", "Beast"), fiend: L("Czart", "Fiend"), dragon: L("Smok", "Dragon"), undead: L("Nieumarły", "Undead"),
  aberration: L("Aberracja", "Aberration"), celestial: L("Niebianin", "Celestial"), fey: L("Istota czarodziejska", "Fey") };
const MOVES = { fly: L("latanie", "fly"), climb: L("wspinaczka", "climb"), swim: L("pływanie", "swim"), burrow: L("kopanie", "burrow") };
const NO_LANG = null;

// [id, en, pl, group, size, kind, AC, HP, speeds, [STR, DEX, CON, INT, WIS, CHA], skills, senses, defenses, languages, traits, actions]
const ROWS = [
  // --- the spell's own list -------------------------------------------------
  ["bat", "Bat", "Nietoperz", "basic", "tiny", "beast", 12, 1, { walk: 5, fly: 30 }, [2, 15, 8, 2, 12, 4], null,
    L("ślepowidzenie 60 ft, pasywna Percepcja 11", "Blindsight 60 ft, Passive Perception 11"), null, NO_LANG, null,
    L("Ugryzienie: +4, 1 kłute.", "Bite: +4, 1 piercing.")],
  ["cat", "Cat", "Kot", "basic", "tiny", "beast", 12, 2, { walk: 40, climb: 40 }, [3, 15, 10, 3, 12, 7], L("Percepcja +3, Skradanie +4", "Perception +3, Stealth +4"),
    L("widzenie w ciemności 60 ft, pasywna Percepcja 13", "Darkvision 60 ft, Passive Perception 13"), null, NO_LANG,
    L("Skacze na odległość liczoną ze Zręczności zamiast Siły.", "Its jump distance uses Dexterity instead of Strength."),
    L("Drapnięcie: +4, 1 cięte.", "Scratch: +4, 1 slashing.")],
  ["frog", "Frog", "Żaba", "basic", "tiny", "beast", 11, 1, { walk: 20, swim: 20 }, [1, 13, 8, 1, 8, 3], L("Percepcja +1, Skradanie +3", "Perception +1, Stealth +3"),
    L("widzenie w ciemności 30 ft, pasywna Percepcja 11", "Darkvision 30 ft, Passive Perception 11"), null, NO_LANG,
    L("Oddycha w powietrzu i pod wodą. Skacze 10 ft w dal i 5 ft w górę, także bez rozbiegu.", "Breathes air and water. Jumps 10 ft long and 5 ft high, with or without a run-up."),
    L("Ugryzienie: +3, 1 kłute.", "Bite: +3, 1 piercing.")],
  ["hawk", "Hawk", "Jastrząb", "basic", "tiny", "beast", 13, 1, { walk: 10, fly: 60 }, [5, 16, 8, 2, 14, 6], L("Percepcja +6", "Perception +6"),
    L("pasywna Percepcja 16", "Passive Perception 16"), null, NO_LANG, null,
    L("Szpony: +5, 1 cięte.", "Talons: +5, 1 slashing.")],
  ["lizard", "Lizard", "Jaszczurka", "basic", "tiny", "beast", 10, 2, { walk: 20, climb: 20 }, [2, 11, 10, 1, 8, 3], null,
    L("widzenie w ciemności 30 ft, pasywna Percepcja 9", "Darkvision 30 ft, Passive Perception 9"), null, NO_LANG,
    L("Chodzi po trudnych powierzchniach, także po suficie, bez testu.", "Climbs difficult surfaces, ceilings too, without a check."),
    L("Ugryzienie: +2, 1 kłute.", "Bite: +2, 1 piercing.")],
  ["octopus", "Octopus", "Ośmiornica", "basic", "small", "beast", 12, 3, { walk: 5, swim: 30 }, [4, 15, 11, 3, 10, 4], L("Percepcja +2, Skradanie +6", "Perception +2, Stealth +6"),
    L("widzenie w ciemności 30 ft, pasywna Percepcja 12", "Darkvision 30 ft, Passive Perception 12"), null, NO_LANG,
    L("Przeciska się przez szparę szeroką na cal. Oddycha tylko pod wodą.", "Squeezes through a gap one inch wide. Breathes only underwater."),
    L("Macki: +4, 1 obuchowe. Raz dziennie, Reakcją pod wodą, gdy ktoś skończy turę obok: chmura atramentu (sześcian 5 ft, całkowicie zasłania na minutę) i odpływa.",
      "Tentacles: +4, 1 bludgeoning. Once a day, as a Reaction underwater when a creature ends its turn next to it: an ink cloud (5-ft cube, heavily obscured for a minute) and it swims away.")],
  ["owl", "Owl", "Sowa", "basic", "tiny", "beast", 11, 1, { walk: 5, fly: 60 }, [3, 13, 8, 2, 12, 7], L("Percepcja +5, Skradanie +5", "Perception +5, Stealth +5"),
    L("widzenie w ciemności 120 ft, pasywna Percepcja 15", "Darkvision 120 ft, Passive Perception 15"), null, NO_LANG,
    L("Wylatując z zasięgu wroga nie prowokuje ataku okazyjnego.", "Flying out of an enemy's reach doesn't provoke an Opportunity Attack."),
    L("Szpony: +3, 1 cięte.", "Talons: +3, 1 slashing.")],
  ["rat", "Rat", "Szczur", "basic", "tiny", "beast", 10, 1, { walk: 20, climb: 20 }, [2, 11, 9, 2, 10, 4], L("Percepcja +2", "Perception +2"),
    L("widzenie w ciemności 30 ft, pasywna Percepcja 12", "Darkvision 30 ft, Passive Perception 12"), null, NO_LANG,
    L("Wychodząc z zasięgu wroga nie prowokuje ataku okazyjnego.", "Moving out of an enemy's reach doesn't provoke an Opportunity Attack."),
    L("Ugryzienie: +2, 1 kłute.", "Bite: +2, 1 piercing.")],
  ["raven", "Raven", "Kruk", "basic", "tiny", "beast", 12, 2, { walk: 10, fly: 50 }, [2, 14, 10, 5, 13, 6], L("Percepcja +3", "Perception +3"),
    L("pasywna Percepcja 13", "Passive Perception 13"), null, NO_LANG,
    L("Naśladuje proste dźwięki, które słyszał (szept, pisk); słuchacz rozpozna podróbkę testem Wnikliwości DC 10.", "Imitates simple sounds it has heard (a whisper, a squeak); a listener spots the fake with a DC 10 Insight check."),
    L("Dziób: +4, 1 kłute.", "Beak: +4, 1 piercing.")],
  ["spider", "Spider", "Pająk", "basic", "tiny", "beast", 12, 1, { walk: 20, climb: 20 }, [2, 14, 8, 1, 10, 2], L("Skradanie +4", "Stealth +4"),
    L("widzenie w ciemności 30 ft, pasywna Percepcja 10", "Darkvision 30 ft, Passive Perception 10"), null, NO_LANG,
    L("Chodzi po trudnych powierzchniach i suficie bez testu. Sieci go nie spowalniają; czuje każdego, kto dotyka tej samej sieci.", "Climbs difficult surfaces and ceilings without a check. Webs don't slow it; it senses anyone touching the same web."),
    L("Ugryzienie: +4, 1 kłute + 1k4 od trucizny.", "Bite: +4, 1 piercing + 1d4 poison.")],
  ["weasel", "Weasel", "Łasica", "basic", "tiny", "beast", 13, 1, { walk: 30, climb: 30 }, [3, 16, 8, 2, 12, 3], L("Akrobatyka +5, Percepcja +3, Skradanie +5", "Acrobatics +5, Perception +3, Stealth +5"),
    L("widzenie w ciemności 60 ft, pasywna Percepcja 13", "Darkvision 60 ft, Passive Perception 13"), null, NO_LANG, null,
    L("Ugryzienie: +5, 1 kłute.", "Bite: +5, 1 piercing.")],
  // --- other CR 0 Beasts from appendix B ("or another Beast that has a Challenge Rating of 0") ------------
  ["badger", "Badger", "Borsuk", "beast", "tiny", "beast", 11, 5, { walk: 20, burrow: 5 }, [10, 11, 16, 2, 12, 5], L("Percepcja +3", "Perception +3"),
    L("widzenie w ciemności 30 ft, pasywna Percepcja 13", "Darkvision 30 ft, Passive Perception 13"), L("Odporność: trucizna", "Resistance: poison"), NO_LANG, null,
    L("Ugryzienie: +2, 1 kłute.", "Bite: +2, 1 piercing.")],
  ["crab", "Crab", "Krab", "beast", "tiny", "beast", 11, 3, { walk: 20, swim: 20 }, [6, 11, 12, 1, 8, 2], L("Skradanie +2", "Stealth +2"),
    L("ślepowidzenie 30 ft, pasywna Percepcja 9", "Blindsight 30 ft, Passive Perception 9"), null, NO_LANG,
    L("Oddycha w powietrzu i pod wodą.", "Breathes air and water."),
    L("Szczypce: +2, 1 obuchowe.", "Claw: +2, 1 bludgeoning.")],
  ["goat", "Goat", "Koza", "beast", "medium", "beast", 10, 4, { walk: 40, climb: 30 }, [11, 10, 11, 2, 10, 5], L("Percepcja +2", "Perception +2"),
    L("widzenie w ciemności 60 ft, pasywna Percepcja 12", "Darkvision 60 ft, Passive Perception 12"), null, NO_LANG, null,
    L("Taranowanie: +2, 1 obuchowe, a po rozbiegu 20 ft prosto na cel 1k4 obuchowe.", "Ram: +2, 1 bludgeoning, or 1d4 bludgeoning after a 20-ft straight run at the target.")],
  ["scorpion", "Scorpion", "Skorpion", "beast", "tiny", "beast", 11, 1, { walk: 10 }, [2, 11, 8, 1, 8, 2], null,
    L("ślepowidzenie 10 ft, pasywna Percepcja 9", "Blindsight 10 ft, Passive Perception 9"), null, NO_LANG, null,
    L("Żądło: +2, 1 kłute + 1k6 od trucizny.", "Sting: +2, 1 piercing + 1d6 poison.")],
  // --- special forms of the Pact of the Chain -------------------------------------------------------------
  ["imp", "Imp", "Imp", "chain", "tiny", "fiend", 13, 21, { walk: 20, fly: 40 }, [6, 17, 13, 11, 12, 14], L("Oszustwo +4, Wnikliwość +3, Skradanie +5", "Deception +4, Insight +3, Stealth +5"),
    L("widzenie w ciemności 120 ft (także w magicznej ciemności), pasywna Percepcja 11", "Darkvision 120 ft (magical Darkness too), Passive Perception 11"),
    L("Odporność: zimno. Niewrażliwy: ogień, trucizna, zatrucie.", "Resistance: cold. Immune: fire, poison, Poisoned."), L("wspólny, piekielny", "Common, Infernal"),
    L("Przewaga w rzutach obronnych przeciw czarom i magii.", "Advantage on saving throws against spells and magic."),
    L("Żądło: +5, 1k6+3 kłute + 2k6 od trucizny. Staje się niewidzialny (czar Invisibility na sobie, bez komponentów). Zmienia wygląd w szczura, kruka albo pająka i z powrotem (zmienia się tylko szybkość).",
      "Sting: +5, 1d6+3 piercing + 2d6 poison. Turns itself invisible (Invisibility on itself, no components). Takes the look of a rat, raven or spider and back (only its Speed changes).")],
  ["pseudodragon", "Pseudodragon", "Pseudosmok", "chain", "tiny", "dragon", 14, 10, { walk: 15, fly: 60 }, [6, 15, 13, 10, 12, 10], L("Percepcja +5, Skradanie +4", "Perception +5, Stealth +4"),
    L("ślepowidzenie 10 ft, widzenie w ciemności 60 ft, pasywna Percepcja 15", "Blindsight 10 ft, Darkvision 60 ft, Passive Perception 15"), null,
    L("rozumie wspólny i smoczy, ale nie mówi", "understands Common and Draconic but can't speak"),
    L("Przewaga w rzutach obronnych przeciw czarom i magii.", "Advantage on saving throws against spells and magic."),
    L("Dwa ugryzienia: +4, 1k4+2 kłute każde. Żądło: istota w 5 ft rzuca KON (DC 12); porażka = 2k4+2 od trucizny i zatrucie na godzinę, a przy porażce o 5 lub więcej także nieprzytomność, aż ktoś ją obudzi albo dostanie obrażenia.",
      "Two Bites: +4, 1d4+2 piercing each. Sting: a creature within 5 ft makes a CON save (DC 12); on a fail 2d4+2 poison and Poisoned for an hour, and failing by 5 or more also Unconscious until woken or damaged.")],
  ["quasit", "Quasit", "Quasit", "chain", "tiny", "fiend", 13, 25, { walk: 40 }, [5, 17, 10, 7, 10, 10], L("Skradanie +5", "Stealth +5"),
    L("widzenie w ciemności 120 ft, pasywna Percepcja 10", "Darkvision 120 ft, Passive Perception 10"),
    L("Odporność: zimno, ogień, błyskawice. Niewrażliwy: trucizna, zatrucie.", "Resistance: cold, fire, lightning. Immune: poison, Poisoned."), L("otchłanny, wspólny", "Abyssal, Common"),
    L("Przewaga w rzutach obronnych przeciw czarom i magii.", "Advantage on saving throws against spells and magic."),
    L("Pazury: +5, 1k4+3 cięte, a cel jest zatruty do początku następnej tury quasita. Staje się niewidzialny (Invisibility na sobie). Raz dziennie Strach: istota w 20 ft rzuca MĄD (DC 10) albo jest przestraszona (powtarza rzut co turę, najwyżej minuta). Zmienia wygląd w nietoperza (latanie 40 ft), stonogę (wspinaczka 40 ft) albo ropuchę (pływanie 40 ft) i z powrotem.",
      "Rend: +5, 1d4+3 slashing, and the target is Poisoned until the start of the quasit's next turn. Turns itself invisible (Invisibility on itself). Once a day Scare: a creature within 20 ft makes a WIS save (DC 10) or is Frightened (repeats the save each turn, a minute at most). Takes the look of a bat (Fly 40 ft), centipede (Climb 40 ft) or toad (Swim 40 ft) and back.")],
  ["skeleton", "Skeleton", "Szkielet", "chain", "medium", "undead", 13, 13, { walk: 30 }, [10, 16, 15, 6, 8, 5], null,
    L("widzenie w ciemności 60 ft, pasywna Percepcja 9", "Darkvision 60 ft, Passive Perception 9"),
    L("Podatny: obuchowe. Niewrażliwy: trucizna, wyczerpanie, zatrucie.", "Vulnerable: bludgeoning. Immune: poison, Exhaustion, Poisoned."),
    L("rozumie języki znane za życia, ale nie mówi", "understands the languages it knew in life but can't speak"), null,
    L("Krótki miecz: +5, 1k6+3 kłute. Krótki łuk: +5, zasięg 80/320 ft, 1k6+3 kłute.", "Shortsword: +5, 1d6+3 piercing. Shortbow: +5, range 80/320 ft, 1d6+3 piercing.")],
  ["slaad-tadpole", "Slaad Tadpole", "Kijanka slaada", "chain", "tiny", "aberration", 12, 7, { walk: 30, burrow: 10 }, [7, 15, 10, 3, 5, 3], L("Skradanie +4", "Stealth +4"),
    L("widzenie w ciemności 60 ft, pasywna Percepcja 7", "Darkvision 60 ft, Passive Perception 7"),
    L("Odporność: kwas, zimno, ogień, błyskawice, grom.", "Resistance: acid, cold, fire, lightning, thunder."), L("rozumie język slaadów, ale nie mówi", "understands Slaad but can't speak"),
    L("Przewaga w rzutach obronnych przeciw czarom i magii.", "Advantage on saving throws against spells and magic."),
    L("Ugryzienie: +4, 1k6+2 kłute.", "Bite: +4, 1d6+2 piercing.")],
  ["sphinx-of-wonder", "Sphinx of Wonder", "Sfinks cudów", "chain", "tiny", "celestial", 13, 24, { walk: 20, fly: 40 }, [6, 17, 13, 15, 12, 11], L("Wiedza tajemna +4, Religia +4, Skradanie +5", "Arcana +4, Religion +4, Stealth +5"),
    L("widzenie w ciemności 60 ft, pasywna Percepcja 11", "Darkvision 60 ft, Passive Perception 11"),
    L("Odporność: nekrotyczne, psychiczne, promieniste.", "Resistance: necrotic, psychic, radiant."), L("niebiański, wspólny", "Celestial, Common"),
    L("Przewaga w rzutach obronnych przeciw czarom i magii.", "Advantage on saving throws against spells and magic."),
    L("Pazury: +5, 1k4+3 cięte + 2k6 promieniste. Dwa razy dziennie, Reakcją: gdy on albo istota w 30 ft robi test cechy lub rzut obronny, dodaje 2 do wyniku.",
      "Rend: +5, 1d4+3 slashing + 2d6 radiant. Twice a day, as a Reaction: when it or a creature within 30 ft makes an ability check or saving throw, it adds 2 to the roll.")],
  ["sprite", "Sprite", "Duszek", "chain", "tiny", "fey", 15, 10, { walk: 10, fly: 40 }, [3, 18, 10, 14, 13, 11], L("Percepcja +3, Skradanie +8", "Perception +3, Stealth +8"),
    L("pasywna Percepcja 13", "Passive Perception 13"), null, L("wspólny, elfi, sylwański", "Common, Elvish, Sylvan"), null,
    L("Igła-miecz: +6, 1k4+4 kłute. Łuk urokliwy: +6, zasięg 40/160 ft, 1 kłute i cel jest zauroczony do początku następnej tury duszka. Wgląd w serce: istota w 5 ft rzuca CHA (DC 10; niebianie, czarty i nieumarli zawsze przegrywają) — przy porażce duszek zna jej emocje i charakter. Staje się niewidzialny (Invisibility na sobie).",
      "Needle Sword: +6, 1d4+4 piercing. Enchanting Bow: +6, range 40/160 ft, 1 piercing and the target is Charmed until the start of the sprite's next turn. Heart Sight: a creature within 5 ft makes a CHA save (DC 10; Celestials, Fiends and Undead always fail) — on a fail the sprite learns its emotions and alignment. Turns itself invisible (Invisibility on itself).")],
  ["venomous-snake", "Venomous Snake", "Jadowity wąż", "chain", "tiny", "beast", 12, 5, { walk: 30, swim: 30 }, [2, 15, 11, 1, 10, 3], null,
    L("ślepowidzenie 10 ft, pasywna Percepcja 10", "Blindsight 10 ft, Passive Perception 10"), null, NO_LANG, null,
    L("Ugryzienie: +4, 1k4+2 kłute + 1k6 od trucizny.", "Bite: +4, 1d4+2 piercing + 1d6 poison.")],
];

export const FAMILIARS = Object.fromEntries(ROWS.map(([id, en, pl, group, size, kind, ac, hp, speed, scores, skills, senses, defenses, languages, traits, actions]) => [id, {
  id, group, ac, hp, speed, scores, skills, senses, defenses, languages, traits, actions,
  name: L(pl === en ? en : `${en} (${pl})`, en), plain: L(pl, en), size: SIZE[size], kind: KIND[kind],
}]));

/** The forms this character can pick: the spell's list, other CR 0 Beasts, and the Chain forms with the Pact of the Chain. */
export function familiarForms(access) {
  return Object.values(FAMILIARS).filter((f) => f.group !== "chain" || access.chain);
}

/**
 * Where the familiar comes from. `wildOnly`: only the Druid's Wild Companion, so it is always Fey and leaves at a long rest.
 * `invocations`: ids of the Warlock's invocations taken (Pact of the Chain, Investment of the Chain Master).
 */
export function familiarAccess(c) {
  const inv = new Set((c.classOptions || []).flatMap((g) => g.chosen.filter((x) => !x.problem).map((x) => x.base)));
  const spell = (c.spellSources || []).some((s) => s.spells.some((x) => x.id === "find-familiar"));
  const wild = c.cls?.id === "druid" && c.level >= 2;
  return { has: spell || wild, chain: inv.has("pact-of-the-chain"), investment: inv.has("investment-of-the-chain-master"), wildOnly: wild && !spell };
}

/** A familiar saved before 0.35.0 had only a typed "kind"; a name from the list becomes that form. */
export function formFromText(text) {
  const k = String(text || "").trim().toLowerCase();
  if (!k) return "";
  const hit = Object.values(FAMILIARS).find((f) => [f.id, f.plain.en, f.plain.pl].some((n) => n.toLowerCase() === k));
  return hit ? hit.id : "";
}

/** The familiar's maximum HP: from its form, or typed by the player for a form outside the list. */
export function familiarHpMax(f) {
  return FAMILIARS[f.form] ? FAMILIARS[f.form].hp : f.hp?.max ?? null;
}

/** Speed with the Investment of the Chain Master's Fly or Swim Speed of 40 ft (never lowers a better speed). */
export function familiarSpeed(form, investMove) {
  const s = { ...form.speed };
  if (investMove === "fly" || investMove === "swim") s[investMove] = Math.max(s[investMove] || 0, 40);
  const parts = (lng) => [`${s.walk} ft`, ...Object.keys(MOVES).filter((k) => s[k]).map((k) => `${MOVES[k][lng]} ${s[k]} ft`)].join(", ");
  return L(parts("pl"), parts("en"));
}

export const FAMILIAR_STATUS = ["here", "pocket", "gone"];

/**
 * 0.35.0: form from the list, creature type, where it is (with you / pocket dimension / gone at 0 HP),
 * the Investment of the Chain Master's movement (its notes moved to the Notes tab in 0.36.0: rules/notes.js). Older familiars keep their typed "kind";
 * a kind that names a listed form becomes that form.
 */
export function normalizeFamiliar(f) {
  const out = { name: "", kind: "", form: "", type: "", hp: { cur: null, max: null }, status: "here", move: "", ...f };
  out.hp = { cur: null, max: null, ...(f.hp || {}) };
  if (!FAMILIAR_STATUS.includes(out.status)) out.status = "here";
  if (f.status == null && f.present === false) out.status = "pocket";
  delete out.present;
  if (out.form && !FAMILIARS[out.form] && out.form !== "other") out.form = "";
  if (!out.form && out.kind) out.form = formFromText(out.kind) || "other";
  if (out.type && !FAMILIAR_TYPES[out.type]) out.type = "";
  return out;
}
