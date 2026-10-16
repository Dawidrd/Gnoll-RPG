// Languages, alignments and sizes (2024 Player's Handbook, chapter 2).
import { ABILITIES, STANDARD_ARRAY } from "./core.js";

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

// --- A character copied from a paper sheet (0.19) ---
/** Scores rolled on paper: each a whole number from 3 to 18 (4d6, drop the lowest). */
export const PAPER = { min: 3, max: 18 };
const sorted = (list) => [...list].sort((x, y) => x - y).join(",");
/**
 * Where scores typed from a paper sheet come from: the standard array, a point buy (8–15, at most 27 points),
 * or else a roll made on paper, which the party's GM confirms.
 */
export function paperMethod(base) {
  const v = ABILITIES.map((a) => base[a]);
  if (sorted(v) === sorted(STANDARD_ARRAY)) return "array";
  if (v.every((x) => x >= POINT_BUY.min && x <= POINT_BUY.max) && pointsSpent(base) <= POINT_BUY.budget) return "pointbuy";
  return "paper";
}
export const validPaper = (base) => ABILITIES.every((a) => Number.isInteger(base[a]) && base[a] >= PAPER.min && base[a] <= PAPER.max);
/** Short fingerprint of a character's paper scores (FNV-1a): the GM confirms this, so changed scores are no longer confirmed. */
export function paperSig(ch) {
  const s = `${ch.id}|${ABILITIES.map((a) => ch.abilityBase?.[a]).join(",")}`;
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; }
  return x.toString(16).padStart(8, "0");
}
/** Scores from paper that the GM confirmed, unchanged since: they can no longer be edited. */
export const paperLocked = (ch) => ch.abilityMethod === "paper" && !!ch.paperConfirm && ch.paperConfirm.sig === paperSig(ch);
