// Sound catalogue (0.45): every sound category the app plays and the variants a player can pick in Settings.
// A category's id is what the code calls (play("attack")); a variant's id is its file name in assets/audio/sfx/ (id + ".mp3").
// Adding a variant = one line here + the file, no code changes. Only the default variants go to SHELL in sw.js
// (the first sound ever plays at once and offline); the others download on first play and are kept by the service worker.
// Sources and licences of the files: docs/zrodla.md.

export const SFX_CATS = [
  {
    id: "attack",
    name: { pl: "Atak", en: "Attack" },
    hint: { pl: "Atak, który zabiera przeciwnikowi punkty życia.", en: "An attack that takes the target's hit points." },
    def: "attack-1",
    variants: [
      { id: "attack-1", name: { pl: "Podstawowy", en: "Standard" } },
      { id: "attack-2", name: { pl: "Wersja 2", en: "Version 2" } },
    ],
  },
  {
    id: "rage",
    name: { pl: "Rage (Szał)", en: "Rage" },
    hint: { pl: "Barbarzyńca wpada w Szał.", en: "A Barbarian enters a Rage." },
    def: "rage",
    variants: [{ id: "rage", name: { pl: "Podstawowy", en: "Standard" } }],
  },
  {
    id: "down",
    name: { pl: "Spadek do 0 HP", en: "Dropping to 0 HP" },
    hint: { pl: "Twoja postać traci ostatnie punkty życia.", en: "Your character loses their last hit points." },
    def: "down",
    variants: [{ id: "down", name: { pl: "Podstawowy", en: "Standard" } }],
  },
  {
    id: "eldritch-blast",
    name: { pl: "Eldritch Blast", en: "Eldritch Blast" },
    hint: { pl: "Czarnoksiężnik rzuca Eldritch Blast.", en: "A Warlock casts Eldritch Blast." },
    def: "eldritch-blast-1",
    variants: [
      { id: "eldritch-blast-1", name: { pl: "Podstawowy", en: "Standard" } },
      { id: "eldritch-blast-2", name: { pl: "Wersja 2", en: "Version 2" } },
      { id: "eldritch-blast-3", name: { pl: "Wersja 3", en: "Version 3" } },
    ],
  },
  {
    id: "level-up",
    name: { pl: "Awans", en: "Level up" },
    hint: { pl: "Zatwierdzasz awans postaci na wyższy poziom.", en: "You confirm your character's new level." },
    def: "level-up",
    variants: [{ id: "level-up", name: { pl: "Podstawowy", en: "Standard" } }],
  },
];

export const catOf = (id) => SFX_CATS.find((c) => c.id === id);

/** The player's picks from storage ({ category: variant }); broken or missing = {} (all defaults). */
export function readPicks(raw) {
  try {
    const o = JSON.parse(raw || "{}");
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  } catch { return {}; }
}

/** Which variant a category plays: the player's pick when it is still in the catalogue, else the default.
 * An unknown pick is not erased — if that variant comes back, the choice works again. */
export function variantFor(cat, picks) {
  const c = catOf(cat);
  if (!c) return "";
  const p = picks?.[cat];
  return c.variants.some((v) => v.id === p) ? p : c.def;
}
