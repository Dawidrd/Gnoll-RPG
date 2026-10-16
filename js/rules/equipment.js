// Starting equipment (2024 Player's Handbook: ch. 2 step 2, the class tables in ch. 3, the backgrounds in ch. 4;
// Ravenloft backgrounds from The Horrors Within) and the chapter 6 price list.
// Prices are kept in copper pieces (1 gp = 100 cp) so sums stay exact.
import { WEAPONS } from "./weapons.js";
import { ARMOR } from "./armor.js";
import { TOOLS, TOOL_GROUPS } from "./tools.js";

const L = (pl, en) => ({ pl, en });
const N = (pl, en) => L(`${en} (${pl})`, en);
const gp = (n) => Math.round(n * 100);
const SP = 10, CP = 1;

// [id, pl, en, cost in cp, extra]
const GEAR_ROWS = [
  ["acid", "Kwas", "Acid", gp(25)],
  ["alch-fire", "Ogień alchemiczny", "Alchemist's Fire", gp(50)],
  ["antitoxin", "Antidotum", "Antitoxin", gp(50)],
  ["backpack", "Plecak", "Backpack", gp(2)],
  ["ball-bearings", "Kulki łożyskowe", "Ball Bearings", gp(1)],
  ["barrel", "Beczka", "Barrel", gp(2)],
  ["basket", "Kosz", "Basket", 4 * SP],
  ["bedroll", "Posłanie", "Bedroll", gp(1)],
  ["bell", "Dzwonek", "Bell", gp(1)],
  ["blanket", "Koc", "Blanket", 5 * SP],
  ["block-tackle", "Wielokrążek", "Block and Tackle", gp(1)],
  ["book", "Książka", "Book", gp(25)],
  ["bottle", "Szklana butelka", "Glass Bottle", gp(2)],
  ["bucket", "Wiadro", "Bucket", 5 * CP],
  ["caltrops", "Kolczatki", "Caltrops", gp(1)],
  ["candle", "Świeca", "Candle", 1 * CP],
  ["case-bolt", "Futerał na bełty", "Crossbow Bolt Case", gp(1)],
  ["case-map", "Tuba na mapy i zwoje", "Map or Scroll Case", gp(1)],
  ["chain", "Łańcuch", "Chain", gp(5)],
  ["chest", "Skrzynia", "Chest", gp(5)],
  ["climber", "Zestaw wspinaczkowy", "Climber's Kit", gp(25)],
  ["clothes-fine", "Strój elegancki", "Fine Clothes", gp(15)],
  ["clothes-travel", "Strój podróżny", "Traveler's Clothes", gp(2)],
  ["component-pouch", "Sakiewka na komponenty", "Component Pouch", gp(25)],
  ["costume", "Kostium", "Costume", gp(5)],
  ["crowbar", "Łom", "Crowbar", gp(2)],
  ["flask", "Flaszka", "Flask", 2 * CP],
  ["grappling", "Kotwiczka", "Grappling Hook", gp(2)],
  ["healers-kit", "Zestaw uzdrowiciela", "Healer's Kit", gp(5)],
  ["holy-water", "Woda święcona", "Holy Water", gp(25)],
  ["hunting-trap", "Pułapka na zwierzęta", "Hunting Trap", gp(5)],
  ["ink", "Atrament", "Ink", gp(10)],
  ["ink-pen", "Pióro do pisania", "Ink Pen", 2 * CP],
  ["jug", "Dzban", "Jug", 2 * CP],
  ["ladder", "Drabina", "Ladder", 1 * SP],
  ["lamp", "Lampa", "Lamp", 5 * SP],
  ["lantern-bullseye", "Latarnia kierunkowa", "Bullseye Lantern", gp(10)],
  ["lantern-hooded", "Latarnia z przesłoną", "Hooded Lantern", gp(5)],
  ["lock", "Zamek", "Lock", gp(10)],
  ["magnifying", "Lupa", "Magnifying Glass", gp(100)],
  ["manacles", "Kajdany", "Manacles", gp(2)],
  ["map", "Mapa", "Map", gp(1)],
  ["mirror", "Lusterko", "Mirror", gp(5)],
  ["net", "Sieć", "Net", gp(1)],
  ["oil", "Flaszka oleju", "Oil Flask", 1 * SP],
  ["paper", "Arkusz papieru", "Paper Sheet", 2 * SP],
  ["parchment", "Arkusz pergaminu", "Parchment Sheet", 1 * SP],
  ["perfume", "Perfumy", "Perfume", gp(5)],
  ["poison", "Zwykła trucizna", "Basic Poison", gp(100)],
  ["pole", "Tyczka", "Pole", 5 * CP],
  ["pot", "Żelazny garnek", "Iron Pot", gp(2)],
  ["potion-healing", "Mikstura leczenia", "Potion of Healing", gp(50)],
  ["pouch", "Sakiewka", "Pouch", 5 * SP],
  ["quiver", "Kołczan", "Quiver", gp(1)],
  ["ram", "Przenośny taran", "Portable Ram", gp(4)],
  ["rations", "Racja żywnościowa na dzień", "Day of Rations", 5 * SP],
  ["robe", "Szata", "Robe", gp(1)],
  ["rope", "Lina", "Rope", gp(1)],
  ["sack", "Worek", "Sack", 1 * CP],
  ["shovel", "Łopata", "Shovel", gp(2)],
  ["whistle", "Gwizdek sygnałowy", "Signal Whistle", 5 * CP],
  ["spellbook", "Księga czarów", "Spellbook", gp(50)],
  ["scroll-0", "Zwój czaru: sztuczka", "Spell Scroll: Cantrip", gp(30)],
  ["scroll-1", "Zwój czaru: 1. krąg", "Spell Scroll: Level 1", gp(50)],
  ["spikes", "Żelazne kliny", "Iron Spikes", gp(1)],
  ["spyglass", "Luneta", "Spyglass", gp(1000)],
  ["string", "Sznurek", "String", 1 * SP],
  ["tent", "Namiot", "Tent", gp(2)],
  ["tinderbox", "Krzesiwo", "Tinderbox", 5 * SP],
  ["torch", "Pochodnia", "Torch", 1 * CP],
  ["vial", "Fiolka", "Vial", gp(1)],
  ["waterskin", "Bukłak", "Waterskin", 2 * SP],
  // Spellcasting focuses
  ["holy-symbol", "Symbol święty", "Holy Symbol", gp(5), { cat: "focus" }],
  ["focus-crystal", "Fokus magiczny: kryształ", "Arcane Focus: crystal", gp(10), { cat: "focus" }],
  ["focus-orb", "Fokus magiczny: kula", "Arcane Focus: orb", gp(20), { cat: "focus" }],
  ["focus-rod", "Fokus magiczny: berło", "Arcane Focus: rod", gp(10), { cat: "focus" }],
  ["focus-wand", "Fokus magiczny: różdżka", "Arcane Focus: wand", gp(10), { cat: "focus" }],
  ["focus-staff", "Fokus magiczny: kostur, to także kij bojowy", "Arcane Focus: staff, also a Quarterstaff", gp(5), { cat: "focus" }],
  ["focus-mistletoe", "Fokus druidyczny: gałązka jemioły", "Druidic Focus: sprig of mistletoe", gp(1), { cat: "focus" }],
  ["focus-druid-staff", "Fokus druidyczny: drewniany kostur, to także kij bojowy", "Druidic Focus: wooden staff, also a Quarterstaff", gp(5), { cat: "focus" }],
  ["focus-yew", "Fokus druidyczny: cisowa różdżka", "Druidic Focus: yew wand", gp(10), { cat: "focus" }],
  // Ammunition: sold in bundles
  ["arrows", "Strzały", "Arrows", gp(1), { cat: "ammo", bundle: 20 }],
  ["bolts", "Bełty", "Bolts", gp(1), { cat: "ammo", bundle: 20 }],
  ["sling-bullets", "Pociski do procy", "Sling Bullets", 4 * CP, { cat: "ammo", bundle: 20 }],
  ["firearm-bullets", "Kule do broni palnej", "Firearm Bullets", gp(3), { cat: "ammo", bundle: 10 }],
  ["needles", "Igły do dmuchawki", "Blowgun Needles", gp(1), { cat: "ammo", bundle: 50 }],
  // Packs: bought as one, unpacked into separate items
  ["pack-burglar", "Plecak włamywacza", "Burglar's Pack", gp(16), { cat: "pack", contents: [["backpack"], ["ball-bearings"], ["bell"], ["candle", 10], ["crowbar"], ["lantern-hooded"], ["oil", 7], ["rations", 5], ["rope"], ["tinderbox"], ["waterskin"]] }],
  ["pack-diplomat", "Plecak dyplomaty", "Diplomat's Pack", gp(39), { cat: "pack", contents: [["chest"], ["clothes-fine"], ["ink"], ["ink-pen", 5], ["lamp"], ["case-map", 2], ["oil", 4], ["paper", 5], ["parchment", 5], ["perfume"], ["tinderbox"]] }],
  ["pack-dungeoneer", "Plecak grotołaza", "Dungeoneer's Pack", gp(12), { cat: "pack", contents: [["backpack"], ["caltrops"], ["crowbar"], ["oil", 2], ["rations", 10], ["rope"], ["tinderbox"], ["torch", 10], ["waterskin"]] }],
  ["pack-entertainer", "Plecak artysty", "Entertainer's Pack", gp(40), { cat: "pack", contents: [["backpack"], ["bedroll"], ["bell"], ["lantern-bullseye"], ["costume", 3], ["mirror"], ["oil", 8], ["rations", 9], ["tinderbox"], ["waterskin"]] }],
  ["pack-explorer", "Plecak odkrywcy", "Explorer's Pack", gp(10), { cat: "pack", contents: [["backpack"], ["bedroll"], ["oil", 2], ["rations", 10], ["rope"], ["tinderbox"], ["torch", 10], ["waterskin"]] }],
  ["pack-priest", "Plecak kapłana", "Priest's Pack", gp(33), { cat: "pack", contents: [["backpack"], ["blanket"], ["holy-water"], ["lamp"], ["rations", 7], ["robe"], ["tinderbox"]] }],
  ["pack-scholar", "Plecak uczonego", "Scholar's Pack", gp(40), { cat: "pack", contents: [["backpack"], ["book"], ["ink"], ["ink-pen"], ["lamp"], ["oil", 10], ["parchment", 10], ["tinderbox"]] }],
];

export const GEAR = Object.fromEntries(GEAR_ROWS.map(([id, pl, en, cost, extra = {}]) => [id, { id, name: N(pl, en), cost, cat: "gear", ...extra }]));

/** Chapter 6 prices of armor and tools (cp). Weapons carry their own cost in weapons.js. */
export const ARMOR_COST = { padded: gp(5), leather: gp(10), studded: gp(45), hide: gp(10), "chain-shirt": gp(50), scale: gp(50), breastplate: gp(400),
  "half-plate": gp(750), ring: gp(30), "chain-mail": gp(75), splint: gp(200), plate: gp(1500) };
export const SHIELD_COST = gp(10);
export const TOOL_COST = {
  alchemist: gp(50), brewer: gp(20), calligrapher: gp(10), carpenter: gp(8), cartographer: gp(15), cobbler: gp(5), cook: gp(1), glassblower: gp(30),
  jeweler: gp(25), leatherworker: gp(5), mason: gp(10), painter: gp(10), potter: gp(10), smith: gp(20), tinker: gp(50), weaver: gp(1), woodcarver: gp(1),
  dice: 1 * SP, dragonchess: gp(1), cards: 5 * SP, threedragon: gp(1),
  bagpipes: gp(30), drum: gp(6), dulcimer: gp(25), flute: gp(2), horn: gp(3), lute: gp(35), lyre: gp(30), panflute: gp(12), shawm: gp(2), viol: gp(30),
  disguise: gp(25), forgery: gp(15), herbalism: gp(5), navigator: gp(25), poisoner: gp(50), thieves: gp(25),
};

/**
 * Everything on the price list, by key: "w:dagger" weapon, "a:leather" armor, "shield", "t:lute" tool, "g:rope" gear.
 * Each entry: { key, kind, id, name, cost (cp), bundle, cat }.
 */
export const CATALOG = Object.fromEntries([
  ...Object.values(WEAPONS).map((w) => ["w:" + w.id, { kind: "weapon", id: w.id, name: w.name, cost: gp(w.cost), cat: w.cat === "simple" ? "simple" : "martial" }]),
  ...Object.entries(ARMOR_COST).map(([id, cost]) => ["a:" + id, { kind: "armor", id, name: ARMOR[id].name, cost, cat: "armor" }]),
  ["shield", { kind: "shield", id: "shield", name: N("Tarcza", "Shield"), cost: SHIELD_COST, cat: "armor" }],
  ...Object.entries(TOOL_COST).filter(([id]) => TOOLS[id]).map(([id, cost]) => ["t:" + id, { kind: "tool", id, name: TOOLS[id], cost, cat: "tool" }]),
  ...Object.values(GEAR).map((g) => ["g:" + g.id, { kind: g.cat === "pack" ? "pack" : "gear", id: g.id, name: g.name, cost: g.cost, bundle: g.bundle || 1, cat: g.cat }]),
].map(([key, v]) => [key, { key, bundle: 1, ...v }]));

/** Order of the shop's sections. */
export const SHOP_SECTIONS = ["pack", "gear", "ammo", "focus", "tool", "simple", "martial", "armor"];

// Kit entries: [key, quantity, note]. "tool:bg" / "tool:class" = the tool picked for that proficiency;
// "any:<group>" = one kind of that group, chosen at the table.
const kit = (gpAmount, ...items) => ({ gp: gpAmount, items: items.map((x) => (Array.isArray(x) ? x : [x])) });
const coins = (gpAmount) => ({ gp: gpAmount, items: [] });
const book = (pl, en) => ["g:book", 1, L(pl, en)];

/** Class starting equipment: options A, B (and C for the Fighter). */
export const CLASS_KITS = {
  barbarian: { A: kit(15, "w:greataxe", ["w:handaxe", 4], "g:pack-explorer"), B: coins(75) },
  bard: { A: kit(19, "a:leather", ["w:dagger", 2], "tool:class", "g:pack-entertainer"), B: coins(90) },
  cleric: { A: kit(7, "a:chain-shirt", "shield", "w:mace", "g:holy-symbol", "g:pack-priest"), B: coins(110) },
  druid: { A: kit(9, "a:leather", "shield", "w:sickle", "g:focus-druid-staff", "w:quarterstaff", "g:pack-explorer", "t:herbalism"), B: coins(50) },
  fighter: {
    A: kit(4, "a:chain-mail", "w:greatsword", "w:flail", ["w:javelin", 8], "g:pack-dungeoneer"),
    B: kit(11, "a:studded", "w:scimitar", "w:shortsword", "w:longbow", ["g:arrows", 20], "g:quiver", "g:pack-dungeoneer"),
    C: coins(155),
  },
  monk: { A: kit(11, "w:spear", ["w:dagger", 5], "tool:class", "g:pack-explorer"), B: coins(50) },
  paladin: { A: kit(9, "a:chain-mail", "shield", "w:longsword", ["w:javelin", 6], "g:holy-symbol", "g:pack-priest"), B: coins(150) },
  ranger: { A: kit(7, "a:studded", "w:scimitar", "w:shortsword", "w:longbow", ["g:arrows", 20], "g:quiver", "g:focus-mistletoe", "g:pack-explorer"), B: coins(150) },
  rogue: { A: kit(8, "a:leather", ["w:dagger", 2], "w:shortsword", "w:shortbow", ["g:arrows", 20], "g:quiver", "t:thieves", "g:pack-burglar"), B: coins(100) },
  sorcerer: { A: kit(28, "w:spear", ["w:dagger", 2], "g:focus-crystal", "g:pack-dungeoneer"), B: coins(50) },
  warlock: { A: kit(15, "a:leather", "w:sickle", ["w:dagger", 2], "g:focus-orb", book("wiedza tajemna", "occult lore"), "g:pack-scholar"), B: coins(100) },
  wizard: { A: kit(5, ["w:dagger", 2], "g:focus-staff", "w:quarterstaff", "g:robe", "g:spellbook", "g:pack-scholar"), B: coins(55) },
};

/** Background starting equipment: option A or 50 gp. */
export const BG_KITS = {
  acolyte: { A: kit(8, "t:calligrapher", book("modlitwy", "prayers"), "g:holy-symbol", ["g:parchment", 10], "g:robe"), B: coins(50) },
  artisan: { A: kit(32, "tool:bg", ["g:pouch", 2], "g:clothes-travel"), B: coins(50) },
  charlatan: { A: kit(15, "t:forgery", "g:costume", "g:clothes-fine"), B: coins(50) },
  criminal: { A: kit(16, ["w:dagger", 2], "t:thieves", "g:crowbar", ["g:pouch", 2], "g:clothes-travel"), B: coins(50) },
  entertainer: { A: kit(11, "tool:bg", ["g:costume", 2], "g:mirror", "g:perfume", "g:clothes-travel"), B: coins(50) },
  farmer: { A: kit(30, "w:sickle", "t:carpenter", "g:healers-kit", "g:pot", "g:shovel", "g:clothes-travel"), B: coins(50) },
  guard: { A: kit(12, "w:spear", "w:light-crossbow", ["g:bolts", 20], "tool:bg", "g:lantern-hooded", "g:manacles", "g:quiver", "g:clothes-travel"), B: coins(50) },
  guide: { A: kit(3, "w:shortbow", ["g:arrows", 20], "t:cartographer", "g:bedroll", "g:quiver", "g:tent", "g:clothes-travel"), B: coins(50) },
  hermit: { A: kit(16, "w:quarterstaff", "t:herbalism", "g:bedroll", book("filozofia", "philosophy"), "g:lamp", ["g:oil", 3], "g:clothes-travel"), B: coins(50) },
  merchant: { A: kit(22, "t:navigator", ["g:pouch", 2], "g:clothes-travel"), B: coins(50) },
  noble: { A: kit(29, "tool:bg", "g:clothes-fine", "g:perfume"), B: coins(50) },
  sage: { A: kit(8, "w:quarterstaff", "t:calligrapher", book("historia", "history"), ["g:parchment", 8], "g:robe"), B: coins(50) },
  sailor: { A: kit(20, "w:dagger", "t:navigator", "g:rope", "g:clothes-travel"), B: coins(50) },
  scribe: { A: kit(23, "t:calligrapher", "g:clothes-fine", "g:lamp", ["g:oil", 3], ["g:parchment", 12]), B: coins(50) },
  soldier: { A: kit(14, "w:spear", "w:shortbow", ["g:arrows", 20], "tool:bg", "g:healers-kit", "g:quiver", "g:clothes-travel"), B: coins(50) },
  wayfarer: { A: kit(16, ["w:dagger", 2], "t:thieves", "any:gaming", "g:bedroll", ["g:pouch", 2], "g:clothes-travel"), B: coins(50) },
  "haunted-one": { A: kit(14, "tool:bg", "g:crowbar", "g:holy-water", "g:mirror", ["g:oil", 2], "g:whistle", "g:tinderbox", "g:clothes-travel", ["g:torch", 5], "g:waterskin"), B: coins(50) },
  investigator: { A: kit(16, "t:disguise", "g:manacles", "g:shovel", "g:clothes-travel", ["g:vial", 3]), B: coins(50) },
  "mist-wanderer": { A: kit(30, "tool:bg", "g:lamp", ["g:oil", 5], "g:pouch", "g:rope", "g:tinderbox", "g:clothes-travel"), B: coins(50) },
  "spirit-medium": { A: kit(32, "w:dagger", "tool:bg", "g:basket", "g:bell", ["g:candle", 8], "g:ink", "g:ink-pen", ["g:paper", 5], "g:tinderbox", "g:clothes-travel"), B: coins(50) },
};

/** Our own trinkets (a free Tiny keepsake at character creation). */
export const TRINKETS = [
  L("Ząb wilka z wydrapanym imieniem, którego nikt nie pamięta", "A wolf's tooth scratched with a name nobody remembers"),
  L("Mosiężny klucz, który nie pasuje do żadnego zamka", "A brass key that fits no lock you've ever found"),
  L("Zasuszony kwiat zamknięty w szklanej kulce", "A dried flower sealed inside a glass bead"),
  L("Kość do gry z siedmioma oczkami na jednej ściance", "A die with seven pips on one face"),
  L("Lalka ze słomy z guzikami zamiast oczu", "A straw doll with buttons for eyes"),
  L("Moneta z kraju, o którym nikt nie słyszał", "A coin from a land no one has heard of"),
  L("Mały dzwoneczek, który dzwoni tylko w ciemności", "A tiny bell that rings only in the dark"),
  L("Kawałek mapy z czerwonym krzyżykiem", "A torn scrap of map marked with a red cross"),
  L("Pierścień z cyny, za ciasny na każdy palec", "A pewter ring too small for any finger"),
  L("Pióro kruka, które zawsze wskazuje na północ, gdy upadnie", "A raven feather that always lands pointing north"),
  L("List miłosny bez podpisu, wciąż zapieczętowany", "An unsigned love letter, still sealed"),
  L("Szklane oko w aksamitnym woreczku", "A glass eye in a velvet pouch"),
  L("Muszla, w której słychać czyjś szept zamiast morza", "A seashell that holds a whisper instead of the sea"),
  L("Drewniany gwizdek w kształcie żaby", "A wooden whistle carved like a frog"),
  L("Świeca, której knot nie chce się zapalić", "A candle whose wick refuses to light"),
  L("Mała klatka bez drzwiczek", "A small cage with no door"),
  L("Pukiel siwych włosów przewiązany czarną wstążką", "A lock of grey hair tied with a black ribbon"),
  L("Figurka rycerza z ułamaną głową", "A tin knight figurine with its head snapped off"),
  L("Kamień z dziurką, przez który widać mgłę, nawet w słońcu", "A hag stone that shows mist through its hole even in sunlight"),
  L("Pusta fiolka pachnąca deszczem", "An empty vial that smells of rain"),
  L("Rękawiczka dziecięca, zawsze lekko ciepła", "A child's glove that is always faintly warm"),
  L("Kości do gry wyrzeźbione z czyjegoś kłykcia", "Dice carved from someone's knucklebone"),
  L("Kompas, którego igła kręci się w kółko", "A compass whose needle spins in slow circles"),
  L("Medalion z portretem obcej osoby, która wygląda trochę jak Ty", "A locket with a stranger's portrait who looks a bit like you"),
  L("Zardzewiały gwóźdź z trumny", "A rusty coffin nail"),
  L("Mały słoik z jednym, wciąż żywym robaczkiem świętojańskim", "A small jar holding a single firefly that never dies"),
  L("Karta tarota z pustym obrazkiem", "A tarot card with a blank picture"),
  L("Guzik z munduru armii, która przegrała", "A button from the uniform of an army that lost"),
  L("Kawałek kredy, który pisze na czerwono", "A stick of chalk that writes in red"),
  L("Ptasia czaszka owinięta srebrnym drucikiem", "A bird skull wrapped in silver wire"),
  L("Zegarek kieszonkowy zatrzymany na północy", "A pocket watch stopped at midnight"),
  L("Wstążka z nazwą statku, który zatonął", "A ribbon bearing the name of a sunken ship"),
  L("Spinka do włosów w kształcie nietoperza", "A hairpin shaped like a bat"),
  L("Ziarno, które nie chce wykiełkować", "A seed that will not sprout"),
  L("Mała książeczka z modlitwami do nieznanego boga", "A tiny prayer book to an unknown god"),
  L("Kamyk, który zawsze jest zimny", "A pebble that is always cold"),
  L("Lusterko, w którym odbicie mruga sekundę za późno", "A hand mirror whose reflection blinks a moment too late"),
  L("Smycz bez obroży", "A leash with no collar"),
  L("Pieczęć woskowa z herbem wymarłego rodu", "A wax seal stamped with the crest of a dead family"),
  L("Ząb gnolla nawleczony na rzemyk — na szczęście", "A gnoll's tooth on a leather cord, for luck"),
];

/** The picks for starting equipment, with defaults for any missing fields. */
export const blankStartGear = (over = {}) => ({ cls: "", bg: "", buys: [], trinket: null, bonusGp: 0, skip: false, applied: false, ...over });

const resolveKitEntry = ([key, qty = 1, note = null], c) => {
  if (key.startsWith("tool:")) {
    const slot = c?.toolSlots?.find((s) => s.id === key.slice(5));
    const id = slot?.picked?.[0];
    if (id) return { key: "t:" + id, kind: "tool", id, qty, note, name: TOOLS[id] };
    const groups = [...new Set((slot?.from || []).map((x) => Object.keys(TOOL_GROUPS).find((g) => TOOL_GROUPS[g].items[x])))];
    const name = groups.length ? L(groups.map((g) => TOOL_GROUPS[g].name.pl).join(" / "), groups.map((g) => TOOL_GROUPS[g].name.en).join(" / ")) : L("Narzędzia", "Tools");
    return { key, kind: "tool", id: null, qty, note: L("wybierz rodzaj przy biegłościach", "pick the kind with your proficiencies"), name, pending: true };
  }
  if (key.startsWith("any:")) {
    const g = TOOL_GROUPS[key.slice(4)];
    return { key, kind: "tool", id: null, qty, note: L("dowolny rodzaj", "any kind"), name: g.name };
  }
  const item = CATALOG[key];
  return { key, kind: item.kind, id: item.id, qty, note, name: item.name };
};

/**
 * What the starting equipment comes to with the current picks.
 * c = the computed character (for the tools picked in proficiency slots); may be partial.
 */
export function startPlan(ch, c) {
  const sg = blankStartGear(ch.startGear || {});
  const clsKits = CLASS_KITS[ch.classId] || null;
  const bgKits = BG_KITS[ch.background] || null;
  const clsOpt = clsKits?.[sg.cls] || null;
  const bgOpt = bgKits?.[sg.bg] || null;
  const fromKits = [...(clsOpt?.items || []), ...(bgOpt?.items || [])].map((x) => resolveKitEntry(x, c));
  const buys = (sg.buys || []).filter((b) => CATALOG[b.key] && b.qty > 0).map((b) => ({ ...CATALOG[b.key], qty: b.qty }));
  const budget = gp((clsOpt?.gp || 0) + (bgOpt?.gp || 0) + (sg.bonusGp || 0));
  const spent = buys.reduce((n, b) => n + b.cost * b.qty, 0);

  // Weapons: one attack line per kind, with how many are carried.
  const weapons = [];
  const addWeapon = (id, qty) => { const w = weapons.find((x) => x.id === id); if (w) w.qty += qty; else weapons.push({ id, qty }); };
  // Armor: the last armor bought is worn, otherwise the kit's; spare armor and shields go with the other items.
  const armors = [];
  let shields = 0;
  const items = [];
  const addItem = (name, qty, note) => {
    const same = items.find((x) => x.name.en === name.en && JSON.stringify(x.note) === JSON.stringify(note));
    if (same) same.qty += qty; else items.push({ name, qty, note });
  };
  const take = (e, qty, fromShop) => {
    if (e.kind === "weapon") return addWeapon(e.id, qty);
    if (e.kind === "armor") { for (let i = 0; i < qty; i++) armors.push({ id: e.id, fromShop }); return; }
    if (e.kind === "shield") { shields += qty; return; }
    if (e.kind === "pack") {
      for (let i = 0; i < qty; i++) for (const [id, n = 1] of GEAR[e.id].contents) addItem(GEAR[id].name, n, null);
      return;
    }
    addItem(e.name, qty * (fromShop ? e.bundle || 1 : 1), e.note || null);
  };
  for (const e of fromKits) take(e, e.qty, false);
  for (const b of buys) take(b, b.qty, true);
  const worn = [...armors].reverse().find((a) => a.fromShop) || armors[0] || null;
  const armor = worn?.id || null;
  for (const a of armors) if (a !== worn) addItem(ARMOR[a.id].name, 1, null);
  const shield = shields > 0;
  if (shields > 1) addItem(CATALOG.shield.name, shields - 1, null);
  const trinket = typeof sg.trinket === "number" ? TRINKETS[sg.trinket] : typeof sg.trinket === "string" && sg.trinket.trim() ? L(sg.trinket.trim(), sg.trinket.trim()) : null;
  if (trinket) addItem(trinket, 1, L("błyskotka", "trinket"));

  return {
    sg, clsKits, bgKits, clsOpt, bgOpt, fromKits, buys, weapons, armor, shield, items, trinket,
    budget, spent, left: budget - spent,
    pendingTools: fromKits.filter((x) => x.pending).length,
    needsClass: !!clsKits && !sg.cls, needsBg: !!bgKits && !sg.bg,
  };
}

/** A price for people: "15 GP", "5 SP", "2 CP"; mixed amounts in gold with decimals. */
export function priceText(cp) {
  if (cp % 100 === 0) return `${cp / 100} GP`;
  if (cp < 100 && cp % 10 === 0) return `${cp / 10} SP`;
  if (cp < 10) return `${cp} CP`;
  return `${(cp / 100).toFixed(2)} GP`;
}

/** Split copper into coins, largest first (no electrum, no platinum: gold is what the price list uses). */
export function coinsFromCp(cp) {
  const g = Math.floor(cp / 100), s = Math.floor((cp % 100) / 10), c = cp % 10;
  return { gp: g, sp: s, cp: c };
}

/**
 * Keep what the character wears and the attack list in step with the starting-equipment picks, so AC and attacks
 * show at once. Weapons from the kit carry `start: true` until the equipment is handed out.
 * `before` and `after` are startPlan() results.
 */
export function wearStart(ch, before, after) {
  const stamp = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  ch.weapons = [...(ch.weapons || []).filter((w) => !w.start), ...after.weapons.map((w) => ({ uid: stamp(), id: w.id, qty: w.qty, start: true }))];
  if ((before.armor || "none") !== (after.armor || "none") && (ch.armor || "none") === (before.armor || "none")) ch.armor = after.armor || "none";
  if (before.shield !== after.shield && !!ch.shield === before.shield) ch.shield = after.shield;
}

/** Hand out the starting equipment: items and coins go on the sheet, weapons stay. Run once, when the character is saved. */
export function applyStartGear(ch, plan, lang = "pl") {
  if (plan.sg.applied || plan.sg.skip) return false;
  const name = (x) => x[lang] || x.en;
  if (!Array.isArray(ch.items)) ch.items = [];
  ch.gold = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...(ch.gold || {}) };
  for (const it of plan.items) {
    const nm = name(it.name), note = it.note ? name(it.note) : "";
    const same = ch.items.find((x) => x.name === nm && (x.note || "") === note);
    if (same) same.qty += it.qty;
    else ch.items.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2), name: nm, qty: it.qty, note });
  }
  const add = coinsFromCp(Math.max(0, plan.left));
  ch.gold = { ...ch.gold, gp: (ch.gold.gp || 0) + add.gp, sp: (ch.gold.sp || 0) + add.sp, cp: (ch.gold.cp || 0) + add.cp };
  ch.weapons = (ch.weapons || []).map(({ start, ...w }) => w);
  ch.startGear = { ...plan.sg, applied: true };
  return true;
}
