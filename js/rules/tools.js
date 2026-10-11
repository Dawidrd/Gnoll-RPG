// Tools from chapter 6 of the 2024 Player's Handbook.
// Some features give "one kind of" a group (Artisan's Tools, Gaming Set, Musical Instrument): the player picks the kind.

const T = (pl, en) => ({ pl, en });

export const TOOL_GROUPS = {
  artisan: {
    name: T("Narzędzia rzemieślnicze", "Artisan's Tools"),
    items: {
      alchemist: T("Przybory alchemika", "Alchemist's Supplies"),
      brewer: T("Przybory piwowara", "Brewer's Supplies"),
      calligrapher: T("Przybory kaligrafa", "Calligrapher's Supplies"),
      carpenter: T("Narzędzia stolarskie", "Carpenter's Tools"),
      cartographer: T("Przybory kartografa", "Cartographer's Tools"),
      cobbler: T("Narzędzia szewskie", "Cobbler's Tools"),
      cook: T("Przybory kucharskie", "Cook's Utensils"),
      glassblower: T("Narzędzia hutnika szkła", "Glassblower's Tools"),
      jeweler: T("Narzędzia jubilerskie", "Jeweler's Tools"),
      leatherworker: T("Narzędzia rymarskie", "Leatherworker's Tools"),
      mason: T("Narzędzia kamieniarskie", "Mason's Tools"),
      painter: T("Przybory malarskie", "Painter's Supplies"),
      potter: T("Narzędzia garncarskie", "Potter's Tools"),
      smith: T("Narzędzia kowalskie", "Smith's Tools"),
      tinker: T("Narzędzia majsterkowicza", "Tinker's Tools"),
      weaver: T("Narzędzia tkackie", "Weaver's Tools"),
      woodcarver: T("Narzędzia snycerskie", "Woodcarver's Tools"),
    },
  },
  gaming: {
    name: T("Zestaw do gry", "Gaming Set"),
    items: {
      dice: T("Kości", "Dice"),
      dragonchess: T("Smocze szachy", "Dragonchess"),
      cards: T("Karty", "Playing Cards"),
      threedragon: T("Three-Dragon Ante", "Three-Dragon Ante"),
    },
  },
  instrument: {
    name: T("Instrument muzyczny", "Musical Instrument"),
    items: {
      bagpipes: T("Dudy", "Bagpipes"),
      drum: T("Bęben", "Drum"),
      dulcimer: T("Cymbały", "Dulcimer"),
      flute: T("Flet", "Flute"),
      horn: T("Róg", "Horn"),
      lute: T("Lutnia", "Lute"),
      lyre: T("Lira", "Lyre"),
      panflute: T("Fletnia Pana", "Pan Flute"),
      shawm: T("Szałamaja", "Shawm"),
      viol: T("Viola", "Viol"),
    },
  },
  other: {
    name: T("Inne narzędzia", "Other Tools"),
    items: {
      disguise: T("Zestaw do przebrań", "Disguise Kit"),
      forgery: T("Zestaw fałszerza", "Forgery Kit"),
      herbalism: T("Zestaw zielarski", "Herbalism Kit"),
      navigator: T("Przyrządy nawigacyjne", "Navigator's Tools"),
      poisoner: T("Zestaw trucicielski", "Poisoner's Kit"),
      thieves: T("Narzędzia złodziejskie", "Thieves' Tools"),
    },
  },
};

/** Every tool by id. */
export const TOOLS = Object.fromEntries(Object.values(TOOL_GROUPS).flatMap((g) => Object.entries(g.items)));

/** Expand a list of group names and tool ids into tool ids. */
export function toolOptions(from) {
  return from.flatMap((x) => (TOOL_GROUPS[x] ? Object.keys(TOOL_GROUPS[x].items) : [x]));
}

export const ALL_TOOLS = Object.keys(TOOLS);
