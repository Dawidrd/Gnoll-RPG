// Name generator. The 2024 Player's Handbook has no name tables, so names are built
// from syllables in a style that fits each species. All syllables are our own.
import { rollDie } from "./core.js";

const pick = (list) => list[rollDie(list.length) - 1];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const join = (parts) => cap(parts.map(pick).join("").toLowerCase());

const STYLES = {
  human: {
    first: [["Al", "Bren", "Cas", "Dar", "El", "Ger", "Is", "Jor", "Ka", "Lio", "Mar", "Ned", "Os", "Ra", "Sel", "Tam", "Va", "Wil", "Ed", "Hel"],
      ["a", "an", "ric", "en", "ia", "os", "ard", "ina", "el", "ys", "or", "ette", "win", "ic", "da", "mund"]],
    last: [["Ash", "Black", "Cor", "Dun", "Fair", "Gray", "Hal", "Mill", "Rook", "Stone", "Thorn", "Well", "Wood", "Marsh", "Brook"],
      ["ford", "wood", "ley", "more", "by", "well", "ton", "croft", "gate", "ridge", "wick"]],
  },
  dwarf: {
    first: [["Bal", "Bru", "Dor", "Dur", "Fal", "Gor", "Har", "Kil", "Mor", "Orn", "Rag", "Thor", "Ul", "Vond", "Hed", "Bry"],
      ["dain", "gar", "grim", "in", "ra", "rik", "unn", "hild", "ek", "ak", "dis", "na", "dred"]],
    last: [["Iron", "Stone", "Deep", "Hammer", "Ember", "Granite", "Anvil", "Coal", "Frost", "Gold", "Copper", "Slate"],
      ["beard", "fist", "forge", "delve", "helm", "shield", "mantle", "vein", "brow", "hold"]],
  },
  elf: {
    first: [["Ae", "Ca", "Ela", "Fae", "Ili", "Ly", "Mi", "Na", "Quel", "Sha", "Tha", "Va", "Ye", "Ara", "Sil"],
      ["la", "ri", "the", "va", "ne", "li", "ra", ""],
      ["dor", "wen", "thil", "riel", "las", "nor", "ith", "ion", "ys", "andra", "nae"]],
    last: [["Amra", "Gala", "Ilph", "Sil", "Thal", "Moon", "Star", "Leaf", "Sun", "Mist", "Dawn"],
      ["kiir", "nodel", "whisper", "vane", "bough", "dew", "renna", "thas", "song", "glade"]],
  },
  halfling: {
    first: [["An", "Bel", "Cor", "Dim", "Eld", "Fen", "Gar", "Lin", "Mer", "Pip", "Ros", "Tob", "Wil", "Pol", "Hob"],
      ["do", "ie", "wick", "ny", "rin", "la", "bo", "y", "sa", "ett", "bin", "ly"]],
    last: [["Brush", "Good", "Green", "Hill", "Tea", "Tall", "Under", "Quick", "Thistle", "Apple", "Honey", "Burrow"],
      ["gather", "barrel", "bottle", "foot", "leaf", "bough", "hollow", "dale", "kettle", "button"]],
  },
  orc: {
    first: [["Dru", "Gar", "Gru", "Kra", "Mog", "Nar", "Ruk", "Shag", "Thok", "Ug", "Vol", "Yur", "Bak", "Ov", "Hro"],
      ["ash", "ak", "gar", "ga", "mash", "nak", "ra", "rok", "sha", "uk", "za", "dur", "gol"]],
    last: null,
  },
  dragonborn: {
    first: [["Ar", "Bal", "Dar", "Ghe", "Kri", "Med", "Nal", "Pan", "Rho", "Sha", "Tor", "Vor", "Kav", "Sor", "Jhe"],
      ["a", "e", "i", "o", ""],
      ["han", "jhan", "rash", "sar", "thra", "vok", "kas", "ra", "dar", "ix", "nyr", "mra"]],
    last: [["Del", "Kep", "Myas", "Nem", "Ophin", "Yar", "Kim", "Dar", "Tur", "Vash", "Ixa"],
      ["mirev", "eshkah", "tuul", "ix", "kesh", "ajir", "rhyn", "zoth", "anar"]],
  },
  tiefling: {
    first: [["Ak", "Bar", "Cri", "Dam", "Ka", "Le", "Mor", "Nem", "Ori", "Ske", "Za", "Iad", "Vel", "Ruh"],
      ["menos", "akas", "ia", "ai", "ros", "eth", "ith", "ra", "ion", "ex", "osa", "ael"]],
    last: null,
    // Tieflings sometimes take a word as a name.
    virtue: {
      pl: ["Nadzieja", "Żar", "Smutek", "Zagadka", "Popiół", "Pieśń", "Cierń", "Wędrówka", "Mrok", "Przysięga", "Pokuta", "Świt"],
      en: ["Hope", "Ember", "Sorrow", "Riddle", "Ash", "Song", "Thorn", "Wander", "Gloom", "Oath", "Penance", "Dawn"],
    },
  },
  aasimar: {
    // Aasimar usually carry names of the people who raised them, often with a bright, bell-like ring.
    first: [["A", "Ca", "Ele", "Ga", "I", "Ly", "Ma", "Ori", "Se", "Ta", "Ve", "Zar"],
      ["ri", "sa", "le", "dri", "ra", "ma", "the", ""],
      ["el", "ah", "iel", "on", "ya", "ra", "is", "ael", "us", "ine"]],
    last: [["Bright", "Dawn", "Gold", "Silver", "Star", "Light", "High", "Halo", "Sun"],
      ["ward", "mantle", "song", "veil", "crest", "hope", "wing", "brand", "spire"]],
  },
  gnome: {
    first: [["Al", "Bim", "Ca", "Dim", "Ell", "Fon", "Gim", "Jeb", "Nack", "Or", "Pal", "Quil", "Rob", "Seeb", "Tink", "Wren", "Zook"],
      ["ble", "bo", "kin", "ny", "wick", "dle", "o", "ella", "ix", "ster", "ri", "pip"]],
    last: [["Beren", "Daer", "Fol", "Garr", "Murn", "Nim", "Raul", "Scheppen", "Timber", "Turen", "Cog", "Sprocket"],
      ["gast", "kin", "ick", "ble", "ers", "bottom", "wrench", "spark", "whistle", "nose"]],
  },
  goliath: {
    // Goliaths have a birth name, a nickname earned by deeds and a clan name.
    first: [["Au", "Eg", "Ga", "Ke", "Lo", "Ma", "Na", "Pa", "Tha", "Va", "Ila", "Kav"],
      ["ak", "lath", "unthi", "nu", "ga", "rek", "lo", "thak", "ni", "gan", "kae"]],
    last: [["Anak", "Gath", "Kalag", "Katho", "Thulu", "Vaimei", "Elan", "Ogolak", "Kola"],
      ["kalathi", "akanu", "vathi", "olavi", "ganu", "ilian", "muni", "athai"]],
  },
};
// Ravenloft: dhampirs and reborn keep the names of the people they came from; lupins and hexbloods get a style of their own.
STYLES.lupin = {
  first: [["Ar", "Bra", "Dra", "Fen", "Gre", "Hro", "Kor", "Lu", "Mar", "Rul", "Sko", "Ul", "Vuk", "Zor"],
    ["ak", "dan", "ga", "kov", "lan", "mir", "nak", "rek", "ska", "vik", "ya", "zan"]],
  last: [["Ash", "Blood", "Grey", "Moon", "Night", "Silver", "Thorn", "Winter", "Black", "Mist"], ["fang", "howl", "mane", "pelt", "claw", "tooth", "run", "coat"]],
};
STYLES.hexblood = {
  first: [["Ag", "Bel", "Cor", "Ess", "Hag", "Ise", "Mor", "Nim", "Rav", "Sab", "Vel", "Wyl"],
    ["a", "e", "i", ""], ["dra", "lith", "mora", "na", "ra", "thea", "wen", "zel", "rys", "beth"]],
  last: null,
  virtue: { pl: ["Ciernica", "Gałązka", "Szept", "Kruczyca", "Jemioła", "Mgiełka", "Znamię", "Węzeł"], en: ["Thistle", "Bramble", "Whisper", "Raven", "Mistletoe", "Mist", "Mark", "Knot"] },
};
STYLES.dhampir = STYLES.human;
STYLES.reborn = STYLES.human;
STYLES.other = { first: [[...STYLES.human.first[0], ...STYLES.elf.first[0]], [...STYLES.human.first[1], ...STYLES.dwarf.first[1]]], last: STYLES.human.last };

/** A random name in the style of the given species. */
export function randomName(speciesId, lang = "en") {
  const st = STYLES[speciesId] || STYLES.other;
  if (st.virtue && rollDie(3) === 1) return pick(st.virtue[lang] || st.virtue.en);
  const first = join(st.first);
  return st.last ? `${first} ${join(st.last)}` : first;
}
