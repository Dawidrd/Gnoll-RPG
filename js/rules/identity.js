// Languages, alignments and sizes (2024 Player's Handbook, chapter 2).

export const LANGUAGES = {
  common: { std: true, name: { pl: "Wspólny (Common)", en: "Common" } },
  "common-sign": { std: true, name: { pl: "Wspólny język migowy", en: "Common Sign Language" } },
  draconic: { std: true, name: { pl: "Smoczy", en: "Draconic" } },
  dwarvish: { std: true, name: { pl: "Krasnoludzki", en: "Dwarvish" } },
  elvish: { std: true, name: { pl: "Elfi", en: "Elvish" } },
  giant: { std: true, name: { pl: "Olbrzymi", en: "Giant" } },
  gnomish: { std: true, name: { pl: "Gnomi", en: "Gnomish" } },
  goblin: { std: true, name: { pl: "Gobliński", en: "Goblin" } },
  halfling: { std: true, name: { pl: "Niziołczy", en: "Halfling" } },
  orc: { std: true, name: { pl: "Orczy", en: "Orc" } },
  abyssal: { std: false, name: { pl: "Otchłanny", en: "Abyssal" } },
  celestial: { std: false, name: { pl: "Niebiański", en: "Celestial" } },
  "deep-speech": { std: false, name: { pl: "Mowa Głębin", en: "Deep Speech" } },
  druidic: { std: false, secret: true, name: { pl: "Druidzki", en: "Druidic" } },
  infernal: { std: false, name: { pl: "Piekielny", en: "Infernal" } },
  primordial: { std: false, name: { pl: "Pierwotny", en: "Primordial" } },
  sylvan: { std: false, name: { pl: "Sylvański", en: "Sylvan" } },
  "thieves-cant": { std: false, secret: true, name: { pl: "Złodziejska gwara", en: "Thieves' Cant" } },
  undercommon: { std: false, name: { pl: "Podmrok (Undercommon)", en: "Undercommon" } },
};

/** Standard languages a character may pick at creation (Common is always known). */
export const STANDARD_PICKS = Object.keys(LANGUAGES).filter((k) => LANGUAGES[k].std && k !== "common");
/** Any language from the tables, except secret ones that only their feature teaches. */
export const ANY_PICKS = Object.keys(LANGUAGES).filter((k) => k !== "common" && !LANGUAGES[k].secret);

export const ALIGNMENTS = {
  LG: { pl: "Praworządny dobry", en: "Lawful Good" },
  NG: { pl: "Neutralny dobry", en: "Neutral Good" },
  CG: { pl: "Chaotyczny dobry", en: "Chaotic Good" },
  LN: { pl: "Praworządny neutralny", en: "Lawful Neutral" },
  N: { pl: "Neutralny", en: "Neutral" },
  CN: { pl: "Chaotyczny neutralny", en: "Chaotic Neutral" },
  LE: { pl: "Praworządny zły", en: "Lawful Evil" },
  NE: { pl: "Neutralny zły", en: "Neutral Evil" },
  CE: { pl: "Chaotyczny zły", en: "Chaotic Evil" },
};

export const SIZES = {
  small: { pl: "Mały (Small)", en: "Small" },
  medium: { pl: "Średni (Medium)", en: "Medium" },
};

/** Point buy (chapter 2): 27 points, scores 8–15 before background increases. */
export const POINT_BUY = { budget: 27, min: 8, max: 15, cost: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } };
export const pointsSpent = (base) => Object.values(base).reduce((s, v) => s + (POINT_BUY.cost[v] ?? 99), 0);
