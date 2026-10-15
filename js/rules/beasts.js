// Beasts for the Druid's Wild Shape: every Beast without a Fly Speed and with CR 1 or less from appendix B
// of the 2024 Player's Handbook (flying forms need Druid level 8, beyond this app's levels 1–5).
// Numbers come from the stat blocks; traits are our own short paraphrase.
// While shape-shifted the Druid keeps their own HP, INT, WIS, CHA, skills and saves (PHB ch. 3, Wild Shape).
const L = (pl, en) => ({ pl, en });

export const SIZES_PL = { tiny: L("Drobny", "Tiny"), small: L("Mały", "Small"), medium: L("Średni", "Medium"), large: L("Duży", "Large") };
export const crText = (cr) => (cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr));

// [id, pl, en, cr, size, AC, speeds, STR, DEX, CON, senses, attacks {pl,en}, traits {pl,en} | null]
const ROWS = [
  ["ape", "Małpa", "Ape", 0.5, "medium", 12, { walk: 30, climb: 30 }, 16, 14, 14, "",
    L("Dwa ciosy pięścią: +5, 1k4+3 obuchowe każdy. Rzut kamieniem (odnawia się na 6): +5, 25/50 ft, 2k6+3 obuchowe.", "Two Fist attacks: +5, 1d4+3 bludgeoning each. Rock (Recharge 6): +5, 25/50 ft, 2d6+3 bludgeoning."), null],
  ["black-bear", "Czarny niedźwiedź", "Black Bear", 0.5, "medium", 11, { walk: 30, climb: 30, swim: 30 }, 15, 12, 14, "dv60",
    L("Dwa ataki pazurami (Rend): +4, 1k6+2 cięte każdy.", "Two Rend attacks: +4, 1d6+2 slashing each."), null],
  ["boar", "Dzik", "Boar", 0.25, "medium", 11, { walk: 40 }, 13, 11, 14, "",
    L("Kieł (Gore): +3, 1k6+1 kłute; po szarży 20 ft prosto na cel +1k6 i cel Duży lub mniejszy pada (Prone).", "Gore: +3, 1d6+1 piercing; after a 20-ft straight charge +1d6 and a Large or smaller target falls Prone."),
    L("Gdy jest ranny (Bloodied), ma Przewagę na ataki.", "While Bloodied it has Advantage on attack rolls.")],
  ["brown-bear", "Niedźwiedź brunatny", "Brown Bear", 1, "large", 11, { walk: 40, climb: 30 }, 17, 12, 15, "dv60",
    L("Ugryzienie +5, 1k8+3 kłute i pazur +5, 1k4+3 cięte (cel Ogromny lub mniejszy pada).", "Bite +5, 1d8+3 piercing, and Claw +5, 1d4+3 slashing (a Huge or smaller target falls Prone)."), null],
  ["camel", "Wielbłąd", "Camel", 0.125, "large", 10, { walk: 50 }, 15, 8, 17, "dv60",
    L("Ugryzienie: +4, 1k4+2 obuchowe.", "Bite: +4, 1d4+2 bludgeoning."), null],
  ["cat", "Kot", "Cat", 0, "tiny", 12, { walk: 40, climb: 40 }, 3, 15, 10, "dv60",
    L("Drapnięcie: +4, 1 cięte.", "Scratch: +4, 1 slashing."), L("Skacze na odległość liczoną ze ZRĘ. Percepcja +3, Skradanie +4.", "Jump distance uses DEX. Perception +3, Stealth +4.")],
  ["constrictor-snake", "Wąż dusiciel", "Constrictor Snake", 0.25, "large", 13, { walk: 30, swim: 30 }, 15, 14, 12, "bs10",
    L("Ugryzienie: +4, 1k8+2 kłute. Uścisk: cel Średni lub mniejszy w 5 ft rzuca SIŁ (DC 12), porażka = 3k4 obuchowe i Grappled (ucieczka DC 12).", "Bite: +4, 1d8+2 piercing. Constrict: a Medium or smaller creature within 5 ft makes a STR save (DC 12); on a fail 3d4 bludgeoning and Grappled (escape DC 12)."), null],
  ["crab", "Krab", "Crab", 0, "tiny", 11, { walk: 20, swim: 20 }, 6, 11, 12, "bs30",
    L("Szczypce: +2, 1 obuchowe.", "Claw: +2, 1 bludgeoning."), L("Oddycha powietrzem i wodą.", "Breathes air and water.")],
  ["crocodile", "Krokodyl", "Crocodile", 0.5, "large", 12, { walk: 20, swim: 30 }, 15, 10, 13, "",
    L("Ugryzienie: +4, 1k8+2 kłute; cel Średni lub mniejszy jest Grappled (ucieczka DC 12) i Restrained.", "Bite: +4, 1d8+2 piercing; a Medium or smaller target is Grappled (escape DC 12) and Restrained."),
    L("Wstrzymuje oddech na godzinę.", "Holds its breath for 1 hour.")],
  ["dire-wolf", "Wilk olbrzymi", "Dire Wolf", 1, "large", 14, { walk: 50 }, 17, 15, 15, "dv60",
    L("Ugryzienie: +5, 1k10+3 kłute; cel Ogromny lub mniejszy pada (Prone).", "Bite: +5, 1d10+3 piercing; a Huge or smaller target falls Prone."),
    L("Taktyka stada: Przewaga na atak, gdy sojusznik stoi obok celu.", "Pack Tactics: Advantage on an attack when an ally is next to the target.")],
  ["draft-horse", "Koń pociągowy", "Draft Horse", 0.25, "large", 10, { walk: 40 }, 18, 10, 15, "",
    L("Kopyta: +6, 1k4+4 obuchowe.", "Hooves: +6, 1d4+4 bludgeoning."), null],
  ["elk", "Łoś", "Elk", 0.25, "large", 10, { walk: 50 }, 16, 10, 11, "dv60",
    L("Taranowanie: +5, 1k6+3 obuchowe; po szarży 20 ft +1k6 i cel Ogromny lub mniejszy pada.", "Ram: +5, 1d6+3 bludgeoning; after a 20-ft charge +1d6 and a Huge or smaller target falls Prone."), null],
  ["frog", "Żaba", "Frog", 0, "tiny", 11, { walk: 20, swim: 20 }, 1, 13, 8, "dv30",
    L("Ugryzienie: +3, 1 kłute.", "Bite: +3, 1 piercing."), L("Oddycha powietrzem i wodą. Skok w dal 10 ft, wzwyż 5 ft bez rozbiegu.", "Breathes air and water. Long Jump 10 ft, High Jump 5 ft, no run-up needed.")],
  ["giant-badger", "Olbrzymi borsuk", "Giant Badger", 0.25, "medium", 13, { walk: 30, burrow: 10 }, 13, 10, 17, "dv60",
    L("Ugryzienie: +3, 2k4+1 kłute.", "Bite: +3, 2d4+1 piercing."), L("Odporność na truciznę.", "Resistance to poison.")],
  ["giant-crab", "Olbrzymi krab", "Giant Crab", 0.125, "medium", 15, { walk: 30, swim: 30 }, 13, 13, 11, "bs30",
    L("Szczypce: +3, 1k6+1 obuchowe; cel Średni lub mniejszy jest Grappled (ucieczka DC 11). Dwoje szczypiec, każde trzyma jeden cel.", "Claw: +3, 1d6+1 bludgeoning; a Medium or smaller target is Grappled (escape DC 11). Two claws, each can hold one target."),
    L("Oddycha powietrzem i wodą.", "Breathes air and water.")],
  ["giant-goat", "Olbrzymia koza", "Giant Goat", 0.5, "large", 11, { walk: 40, climb: 30 }, 17, 13, 12, "dv60",
    L("Taranowanie: +5, 1k6+3 obuchowe; po szarży 20 ft +2k4 i cel Ogromny lub mniejszy pada.", "Ram: +5, 1d6+3 bludgeoning; after a 20-ft charge +2d4 and a Huge or smaller target falls Prone."), null],
  ["giant-seahorse", "Olbrzymi konik morski", "Giant Seahorse", 0.5, "large", 14, { walk: 5, swim: 40 }, 15, 12, 11, "",
    L("Taranowanie: +4, 2k6+2 obuchowe (2k8+2 po szarży 20 ft).", "Ram: +4, 2d6+2 bludgeoning (2d8+2 after a 20-ft charge)."),
    L("Oddycha tylko pod wodą. Pod wodą akcją bonusową płynie o pół prędkości bez ataków okazyjnych.", "Breathes only underwater. Underwater, a Bonus Action moves it half its Swim Speed without Opportunity Attacks.")],
  ["giant-spider", "Olbrzymi pająk", "Giant Spider", 1, "large", 14, { walk: 30, climb: 30 }, 14, 16, 12, "dv60",
    L("Ugryzienie: +5, 1k8+3 kłute + 2k6 od trucizny. Sieć (odnawia się na 5–6): istota w 60 ft rzuca ZRĘ (DC 13), porażka = Restrained.", "Bite: +5, 1d8+3 piercing + 2d6 poison. Web (Recharge 5–6): a creature within 60 ft makes a DEX save (DC 13); on a fail Restrained."),
    L("Chodzi po ścianach i suficie, sieci go nie spowalniają. Skradanie +7.", "Walks on walls and ceilings; webs don't slow it. Stealth +7.")],
  ["giant-weasel", "Olbrzymia łasica", "Giant Weasel", 0.125, "medium", 13, { walk: 40, climb: 30 }, 11, 17, 10, "dv60",
    L("Ugryzienie: +5, 1k4+3 kłute.", "Bite: +5, 1d4+3 piercing."), L("Akrobatyka +5, Percepcja +3, Skradanie +5.", "Acrobatics +5, Perception +3, Stealth +5.")],
  ["goat", "Koza", "Goat", 0, "medium", 10, { walk: 40, climb: 30 }, 11, 10, 11, "dv60",
    L("Taranowanie: +2, 1 obuchowe (1k4 po szarży 20 ft).", "Ram: +2, 1 bludgeoning (1d4 after a 20-ft charge)."), null],
  ["lion", "Lew", "Lion", 1, "large", 12, { walk: 50 }, 17, 15, 11, "dv60",
    L("Dwa ataki pazurami (Rend): +5, 1k8+3 cięte. Jeden można zamienić na ryk: istota w 15 ft rzuca MĄD (DC 11), porażka = Frightened do początku Twojej tury.", "Two Rend attacks: +5, 1d8+3 slashing. One can be replaced by Roar: a creature within 15 ft makes a WIS save (DC 11); on a fail Frightened until the start of your turn."),
    L("Taktyka stada. Z rozbiegu 10 ft skacze w dal do 25 ft.", "Pack Tactics. With a 10-ft run-up it long jumps up to 25 ft.")],
  ["lizard", "Jaszczurka", "Lizard", 0, "tiny", 10, { walk: 20, climb: 20 }, 2, 11, 10, "dv30",
    L("Ugryzienie: +2, 1 kłute.", "Bite: +2, 1 piercing."), L("Chodzi po ścianach i suficie.", "Walks on walls and ceilings.")],
  ["mastiff", "Mastyf", "Mastiff", 0.125, "medium", 12, { walk: 40 }, 13, 14, 12, "dv60",
    L("Ugryzienie: +3, 1k6+1 kłute; cel Duży lub mniejszy pada (Prone).", "Bite: +3, 1d6+1 piercing; a Large or smaller target falls Prone."), L("Percepcja +5.", "Perception +5.")],
  ["mule", "Muł", "Mule", 0.125, "medium", 10, { walk: 40 }, 14, 10, 13, "",
    L("Kopyta: +4, 1k4+2 obuchowe.", "Hooves: +4, 1d4+2 bludgeoning."), L("Udźwig jak istota o rozmiar większa.", "Carries as if one size larger.")],
  ["octopus", "Ośmiornica", "Octopus", 0, "small", 12, { walk: 5, swim: 30 }, 4, 15, 11, "dv30",
    L("Macki: +4, 1 obuchowe.", "Tentacles: +4, 1 bludgeoning."),
    L("Oddycha tylko pod wodą, przeciska się przez szczelinę 1 cala. Raz na dzień reakcją wypuszcza chmurę atramentu (sześcian 5 ft) i odpływa.", "Breathes only underwater; squeezes through a 1-inch gap. Once per day, as a Reaction, releases an ink cloud (5-ft Cube) and swims away.")],
  ["panther", "Pantera", "Panther", 0.25, "medium", 12, { walk: 50, climb: 40 }, 14, 15, 10, "dv60",
    L("Skok (Pounce): +4, 1k4+2 cięte (2k4+2 z Przewagą), potem skradanie o pół prędkości bez ataków okazyjnych i akcja Hide.", "Pounce: +4, 1d4+2 slashing (2d4+2 with Advantage), then Prowl half its Speed without Opportunity Attacks and take the Hide action."),
    L("Percepcja +4, Skradanie +6.", "Perception +4, Stealth +6.")],
  ["pony", "Kucyk", "Pony", 0.125, "medium", 10, { walk: 40 }, 15, 10, 13, "",
    L("Kopyta: +4, 1k4+2 obuchowe.", "Hooves: +4, 1d4+2 bludgeoning."), null],
  ["rat", "Szczur", "Rat", 0, "tiny", 10, { walk: 20, climb: 20 }, 2, 11, 9, "dv30",
    L("Ugryzienie: +2, 1 kłute.", "Bite: +2, 1 piercing."), L("Wychodząc z zasięgu wroga nie prowokuje ataku okazyjnego.", "Doesn't provoke Opportunity Attacks when it leaves an enemy's reach.")],
  ["reef-shark", "Rekin rafowy", "Reef Shark", 0.5, "medium", 12, { walk: 5, swim: 30 }, 14, 15, 13, "bs30",
    L("Ugryzienie: +4, 2k4+2 kłute.", "Bite: +4, 2d4+2 piercing."), L("Taktyka stada. Oddycha tylko pod wodą.", "Pack Tactics. Breathes only underwater.")],
  ["riding-horse", "Koń wierzchowy", "Riding Horse", 0.25, "large", 11, { walk: 60 }, 16, 13, 12, "",
    L("Kopyta: +5, 1k8+3 obuchowe.", "Hooves: +5, 1d8+3 bludgeoning."), null],
  ["scorpion", "Skorpion", "Scorpion", 0, "tiny", 11, { walk: 10 }, 2, 11, 8, "bs10",
    L("Żądło: +2, 1 kłute + 1k6 od trucizny.", "Sting: +2, 1 piercing + 1d6 poison."), null],
  ["spider", "Pająk", "Spider", 0, "tiny", 12, { walk: 20, climb: 20 }, 2, 14, 8, "dv30",
    L("Ugryzienie: +4, 1 kłute + 1k4 od trucizny.", "Bite: +4, 1 piercing + 1d4 poison."), L("Chodzi po ścianach i suficie, sieci go nie spowalniają. Skradanie +4.", "Walks on walls and ceilings; webs don't slow it. Stealth +4.")],
  ["tiger", "Tygrys", "Tiger", 1, "large", 13, { walk: 40 }, 17, 16, 14, "dv60",
    L("Skok (Pounce): +5, 1k6+3 cięte; z Przewagą +1k6 i cel Ogromny lub mniejszy pada. Potem skradanie o pół prędkości bez ataków okazyjnych i akcja Hide.", "Pounce: +5, 1d6+3 slashing; with Advantage +1d6 and a Huge or smaller target falls Prone. Then Prowl half its Speed without Opportunity Attacks and take the Hide action."),
    L("Percepcja +3, Skradanie +7.", "Perception +3, Stealth +7.")],
  ["venomous-snake", "Jadowity wąż", "Venomous Snake", 0.125, "tiny", 12, { walk: 30, swim: 30 }, 2, 15, 11, "bs10",
    L("Ugryzienie: +4, 1k4+2 kłute + 1k6 od trucizny.", "Bite: +4, 1d4+2 piercing + 1d6 poison."), null],
  ["warhorse", "Koń bojowy", "Warhorse", 0.5, "large", 11, { walk: 60 }, 18, 12, 13, "",
    L("Kopyta: +6, 2k4+4 obuchowe; po szarży 20 ft +2k4 i cel Ogromny lub mniejszy pada.", "Hooves: +6, 2d4+4 bludgeoning; after a 20-ft charge +2d4 and a Huge or smaller target falls Prone."), null],
  ["weasel", "Łasica", "Weasel", 0, "tiny", 13, { walk: 30, climb: 30 }, 3, 16, 8, "dv60",
    L("Ugryzienie: +5, 1 kłute.", "Bite: +5, 1 piercing."), L("Akrobatyka +5, Percepcja +3, Skradanie +5.", "Acrobatics +5, Perception +3, Stealth +5.")],
  ["wolf", "Wilk", "Wolf", 0.25, "medium", 12, { walk: 40 }, 14, 15, 12, "dv60",
    L("Ugryzienie: +4, 1k6+2 kłute; cel Średni lub mniejszy pada (Prone).", "Bite: +4, 1d6+2 piercing; a Medium or smaller target falls Prone."),
    L("Taktyka stada: Przewaga na atak, gdy sojusznik stoi obok celu. Percepcja +5.", "Pack Tactics: Advantage on an attack when an ally is next to the target. Perception +5.")],
];

const SENSES = { dv30: L("widzenie w ciemności 30 ft", "Darkvision 30 ft"), dv60: L("widzenie w ciemności 60 ft", "Darkvision 60 ft"),
  bs10: L("ślepowidzenie 10 ft", "Blindsight 10 ft"), bs30: L("ślepowidzenie 30 ft", "Blindsight 30 ft") };
const MOVES = { climb: L("wspinaczka", "climb"), swim: L("pływanie", "swim"), burrow: L("kopanie", "burrow") };

export const BEASTS = Object.fromEntries(ROWS.map(([id, pl, en, cr, size, ac, speed, str, dex, con, senses, attacks, traits]) => [id, {
  id, cr, size, ac, speed, str, dex, con, attacks, traits, fly: false,
  name: L(`${en} (${pl})`, en),
  senses: SENSES[senses] || null,
}]));

/** "40 ft, wspinaczka 30 ft" */
export function speedText(b) {
  const parts = [`${b.speed.walk} ft`, ...Object.keys(MOVES).filter((k) => b.speed[k]).map((k) => `${MOVES[k].pl} ${b.speed[k]} ft`)];
  const en = [`${b.speed.walk} ft`, ...Object.keys(MOVES).filter((k) => b.speed[k]).map((k) => `${MOVES[k].en} ${b.speed[k]} ft`)];
  return L(parts.join(", "), en.join(", "));
}
