// Spell database: every Player's Handbook (2024) spell from cantrips to level 3 — enough for characters up to level 5.
// Names, levels, schools, class lists and the C/R/M markers were checked against the class spell tables in chapter 3.
import { CANTRIPS } from "./spells/cantrips.js";
import { LEVEL1 } from "./spells/level1.js";
import { LEVEL2 } from "./spells/level2.js";
import { LEVEL3 } from "./spells/level3.js";

const L = (pl, en) => ({ pl, en });

export const SPELL_CLASSES = { B: "bard", C: "cleric", D: "druid", P: "paladin", R: "ranger", S: "sorcerer", K: "warlock", W: "wizard" };
export const SPELL_LIST_NAMES = {
  bard: L("Bard", "Bard"), cleric: L("Kleryk", "Cleric"), druid: L("Druid", "Druid"), paladin: L("Paladyn", "Paladin"),
  ranger: L("Łowca", "Ranger"), sorcerer: L("Zaklinacz", "Sorcerer"), warlock: L("Czarnoksiężnik", "Warlock"), wizard: L("Czarodziej", "Wizard"),
};
export const SCHOOLS = {
  abj: L("odpychanie (Abjuration)", "Abjuration"), con: L("przywoływanie (Conjuration)", "Conjuration"), div: L("wieszczenie (Divination)", "Divination"),
  enc: L("zauroczanie (Enchantment)", "Enchantment"), evo: L("wywoływanie (Evocation)", "Evocation"), ill: L("iluzja (Illusion)", "Illusion"),
  nec: L("nekromancja (Necromancy)", "Necromancy"), tra: L("przemiana (Transmutation)", "Transmutation"),
};

const kDice = (s) => s.replace(/(\d)d(\d)/g, "$1k$2");
const cantripCount = (lv) => (lv < 5 ? 1 : lv < 11 ? 2 : lv < 17 ? 3 : 4);
/** Fill the level-dependent bits of a description: {cd:d8} dice, {beams}, {sh}, {std}, {ts}. */
function fill(text, c, lang) {
  const lv = c?.level || 1;
  return text
    .replace(/\{cd:d(\d+)\}/g, (_, d) => (lang === "pl" ? `${cantripCount(lv)}k${d}` : `${cantripCount(lv)}d${d}`))
    .replace("{beams}", () => { const n = cantripCount(lv); return lang === "pl" ? (n === 1 ? "1 promień" : `${n} promienie`) : (n === 1 ? "1 beam" : `${n} beams`); })
    .replace("{sh}", () => (lang === "pl" ? (lv < 5 ? "k8" : "k10") : lv < 5 ? "d8" : "d10"))
    .replace("{std}", () => (lv < 5 ? "15 ft" : "30 ft"))
    .replace("{ts}", () => (lv < 5 ? "" : lang === "pl" ? " i zadają +1k6 promienistych" : ", and they deal +1d6 radiant"));
}

function build(rows, circle) {
  const out = {};
  for (const [id, school, cls, time, range, comp, dur, flags, pl, en, dpl, den] of rows) {
    out[id] = {
      id, circle, school, classes: [...cls].map((x) => SPELL_CLASSES[x]), time, range, comp, dur,
      conc: flags.includes("C"), ritual: flags.includes("R"), costly: flags.includes("M"),
      name: L(`${en} (${pl})`, en),
      desc: (c) => L(fill(kDice(dpl), c, "pl"), fill(den, c, "en")),
    };
  }
  return out;
}

export const SPELLS = { ...build(CANTRIPS, 0), ...build(LEVEL1, 1), ...build(LEVEL2, 2), ...build(LEVEL3, 3) };

/** "Detect Evil and Good" → "detect-evil-and-good" (the ids used above). */
export const spellId = (name) => name.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Spells of one class list, optionally limited to some circles. */
export function spellsOf(list, circles = null) {
  return Object.values(SPELLS).filter((s) => s.classes.includes(list) && (!circles || circles.includes(s.circle)))
    .sort((a, b) => a.circle - b.circle || a.name.en.localeCompare(b.name.en));
}

// --- labels ---------------------------------------------------------------
const TIMES = { A: L("Akcja", "Action"), BA: L("Akcja bonusowa", "Bonus Action"), R: L("Reakcja", "Reaction"),
  "1m": L("1 minuta", "1 minute"), "10m": L("10 minut", "10 minutes"), "1h": L("1 godzina", "1 hour"), "8h": L("8 godzin", "8 hours") };
const DURS = { I: L("natychmiastowy", "Instantaneous"), "1r": L("1 runda", "1 round"), "1m": L("1 minuta", "1 minute"), "10m": L("10 minut", "10 minutes"),
  "1h": L("1 godzina", "1 hour"), "8h": L("8 godzin", "8 hours"), "24h": L("24 godziny", "24 hours"), "10d": L("10 dni", "10 days"), D: L("do rozproszenia", "Until dispelled") };
const SHAPES = { em: L("emanacja", "Emanation"), cone: L("stożek", "Cone"), cube: L("sześcian", "Cube"), line: L("linia", "Line") };

export function spellFacts(s, lang) {
  const t = (x) => x?.[lang] ?? x;
  let range;
  if (s.range === "self") range = t(L("Ty", "Self"));
  else if (s.range === "touch") range = t(L("Dotyk", "Touch"));
  else if (s.range === "unlimited") range = t(L("bez limitu", "Unlimited"));
  else if (s.range === "1 mile") range = t(L("1 mila", "1 mile"));
  else if (s.range.startsWith("self:")) { const m = s.range.slice(5).match(/(\d+)(\w+)/); range = `${t(L("Ty", "Self"))} (${t(SHAPES[m[2]])} ${m[1]} ft)`; }
  else range = `${s.range} ft`;
  const dur = t(DURS[s.dur]) || s.dur;
  return {
    time: t(TIMES[s.time]) + (s.ritual ? ` · ${t(L("rytuał", "ritual"))}` : ""),
    range,
    comp: [...s.comp].join(", ") + (s.costly ? " *" : ""),
    dur: s.conc ? `${t(L("Koncentracja, do", "Concentration, up to"))} ${dur.toLowerCase()}` : dur,
    school: t(SCHOOLS[s.school]),
  };
}

/**
 * Damaging cantrips, for invocation prerequisites (Agonizing Blast, Eldritch Spear, Repelling Blast):
 * attack = uses an attack roll; range = range in feet (0 = touch or self).
 */
export const DAMAGE_CANTRIPS = {
  "acid-splash": { attack: false, range: 60 }, "chill-touch": { attack: true, range: 0 }, "eldritch-blast": { attack: true, range: 120 },
  "fire-bolt": { attack: true, range: 120 }, "mind-sliver": { attack: false, range: 60 }, "poison-spray": { attack: true, range: 30 },
  "produce-flame": { attack: true, range: 60 }, "ray-of-frost": { attack: true, range: 60 }, "sacred-flame": { attack: false, range: 60 },
  "shocking-grasp": { attack: true, range: 0 }, "sorcerous-burst": { attack: true, range: 120 }, "starry-wisp": { attack: true, range: 60 },
  "thorn-whip": { attack: true, range: 30 }, thunderclap: { attack: false, range: 0 }, "toll-the-dead": { attack: false, range: 60 },
  "vicious-mockery": { attack: false, range: 60 }, "word-of-radiance": { attack: false, range: 0 },
};
