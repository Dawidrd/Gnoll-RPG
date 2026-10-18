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
    def: "attack",
    variants: [{ id: "attack", name: { pl: "Klasyczny", en: "Classic" } }],
  },
  {
    id: "rage",
    name: { pl: "Rage (Szał)", en: "Rage" },
    hint: { pl: "Barbarzyńca wpada w Szał.", en: "A Barbarian enters a Rage." },
    def: "rage",
    variants: [{ id: "rage", name: { pl: "Klasyczny", en: "Classic" } }],
  },
  {
    id: "down",
    name: { pl: "Spadek do 0 HP", en: "Dropping to 0 HP" },
    hint: { pl: "Twoja postać traci ostatnie punkty życia.", en: "Your character loses their last hit points." },
    def: "down",
    variants: [{ id: "down", name: { pl: "Klasyczny", en: "Classic" } }],
  },
  {
    id: "eldritch-blast",
    name: { pl: "Eldritch Blast", en: "Eldritch Blast" },
    hint: { pl: "Czarnoksiężnik rzuca Eldritch Blast.", en: "A Warlock casts Eldritch Blast." },
    def: "eldritch-blast",
    variants: [{ id: "eldritch-blast", name: { pl: "Klasyczny", en: "Classic" } }],
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
