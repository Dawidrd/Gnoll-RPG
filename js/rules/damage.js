// Damage types (one list for the whole app) and the damage each spell deals, so the sheet can show a coloured tag
// such as "3k6 🔥 ogień" next to attacks, spells and on-hit features. Spell descriptions stay as they are.
import { cantripCount } from "./spells.js";
import { signed } from "./core.js";

const L = (pl, en) => ({ pl, en });

/** The 13 damage types of the 2024 rules: name and a short sign (the tag always shows the word too). */
export const DAMAGE_TYPES = {
  acid: { name: L("kwas", "acid"), icon: "🧪" },
  cold: { name: L("zimno", "cold"), icon: "❄️" },
  fire: { name: L("ogień", "fire"), icon: "🔥" },
  lightning: { name: L("błyskawice", "lightning"), icon: "⚡" },
  poison: { name: L("trucizna", "poison"), icon: "☠️" },
  necrotic: { name: L("nekrotyczne", "necrotic"), icon: "🖤" },
  radiant: { name: L("promieniste", "radiant"), icon: "✨" },
  thunder: { name: L("grzmot", "thunder"), icon: "🔊" },
  psychic: { name: L("psychiczne", "psychic"), icon: "🧠" },
  force: { name: L("moc", "force"), icon: "💫" },
  bludgeoning: { name: L("obuchowe", "bludgeoning"), icon: "🔨" },
  piercing: { name: L("kłute", "piercing"), icon: "🏹" },
  slashing: { name: L("cięte", "slashing"), icon: "🗡️" },
};
/** Not a real type: "the same type as your weapon" (Sneak Attack, Rage, True Strike…). */
export const WEAPON_TYPE = { name: L("jak broń", "weapon's type"), icon: "⚔️" };

/** Just the names, for lists and sentences. */
export const DAMAGE_NAMES = Object.fromEntries(Object.entries(DAMAGE_TYPES).map(([k, v]) => [k, v.name]));
/** Weapon table letters → type ids. */
export const WEAPON_DAMAGE = { b: "bludgeoning", p: "piercing", s: "slashing" };

export const typeInfo = (id) => (id === "weapon" ? WEAPON_TYPE : DAMAGE_TYPES[id]);

// --- spells ---------------------------------------------------------------
// Each spell: a list of parts. d = dice ({cd:d8} grows with cantrip level, {mod} = spellcasting modifier, {sh} = Shillelagh die),
// t = types, choose = you pick one of them, plus = added to a hit, n = how many (rays, darts; "beams" = Eldritch Blast), min = from level.
const P = (d, t, more) => ({ d, t: [].concat(t), ...more });
const ELEMENTS = ["acid", "cold", "fire", "lightning", "thunder"];

export const SPELL_DAMAGE = {
  // cantrips
  "acid-splash": [P("{cd:d6}", "acid")],
  "chill-touch": [P("{cd:d10}", "necrotic")],
  "eldritch-blast": [P("1d10", "force", { n: "beams" })],
  "fire-bolt": [P("{cd:d10}", "fire")],
  "mind-sliver": [P("{cd:d6}", "psychic")],
  "poison-spray": [P("{cd:d12}", "poison")],
  "produce-flame": [P("{cd:d8}", "fire")],
  "ray-of-frost": [P("{cd:d8}", "cold")],
  "sacred-flame": [P("{cd:d8}", "radiant")],
  shillelagh: [P("{sh}+{mod}", ["bludgeoning", "force"], { choose: true })],
  "shocking-grasp": [P("{cd:d8}", "lightning")],
  "sorcerous-burst": [P("{cd:d8}", ["acid", "cold", "fire", "lightning", "poison", "psychic", "thunder"], { choose: true })],
  "starry-wisp": [P("{cd:d8}", "radiant")],
  "thorn-whip": [P("{cd:d6}", "piercing")],
  thunderclap: [P("{cd:d6}", "thunder")],
  "toll-the-dead": [P("{cd:d8}/{cd:d12}", "necrotic")],
  "true-strike": [P("", ["weapon", "radiant"], { choose: true }), P("{cd:d6}", "radiant", { plus: true, min: 5 })],
  "vicious-mockery": [P("{cd:d6}", "psychic")],
  "word-of-radiance": [P("{cd:d6}", "radiant")],
  // level 1
  "armor-of-agathys": [P("5", "cold")],
  "arms-of-hadar": [P("2d6", "necrotic")],
  "burning-hands": [P("3d6", "fire")],
  "chromatic-orb": [P("3d8", ["acid", "cold", "fire", "lightning", "poison", "thunder"], { choose: true })],
  "dissonant-whispers": [P("3d6", "psychic")],
  "divine-favor": [P("1d4", "radiant", { plus: true })],
  "divine-smite": [P("2d8", "radiant", { plus: true })],
  "ensnaring-strike": [P("1d6", "piercing")],
  "guiding-bolt": [P("4d6", "radiant")],
  "hail-of-thorns": [P("1d10", "piercing")],
  "hellish-rebuke": [P("2d10", "fire")],
  hex: [P("1d6", "necrotic", { plus: true })],
  "hunters-mark": [P("1d6", "force", { plus: true })],
  "ice-knife": [P("1d10", "piercing"), P("2d6", "cold")],
  "inflict-wounds": [P("2d10", "necrotic")],
  "magic-missile": [P("1d4+1", "force", { n: 3 })],
  "ray-of-sickness": [P("2d8", "poison")],
  "searing-smite": [P("1d6", "fire", { plus: true })],
  "thunderous-smite": [P("2d6", "thunder", { plus: true })],
  thunderwave: [P("2d8", "thunder")],
  "witch-bolt": [P("2d12", "lightning")],
  "wrathful-smite": [P("1d6", "necrotic", { plus: true })],
  // level 2
  "cloud-of-daggers": [P("4d4", "slashing")],
  "cordon-of-arrows": [P("2d4", "piercing")],
  "dragons-breath": [P("3d6", ["acid", "cold", "fire", "lightning", "poison"], { choose: true })],
  "enlarge-reduce": [P("1d4", "weapon", { plus: true })],
  "flame-blade": [P("3d6+{mod}", "fire")],
  "flaming-sphere": [P("2d6", "fire")],
  "heat-metal": [P("2d8", "fire")],
  "melfs-acid-arrow": [P("4d4", "acid"), P("2d4", "acid")],
  "mind-spike": [P("3d8", "psychic")],
  moonbeam: [P("2d10", "radiant")],
  "phantasmal-force": [P("2d8", "psychic")],
  "scorching-ray": [P("2d6", "fire", { n: 3 })],
  shatter: [P("3d8", "thunder")],
  "shining-smite": [P("2d6", "radiant", { plus: true })],
  "spike-growth": [P("2d4", "piercing")],
  "spiritual-weapon": [P("1d8+{mod}", "force")],
  // level 3
  "bestow-curse": [P("1d8", "necrotic", { plus: true })],
  "blinding-smite": [P("3d8", "radiant", { plus: true })],
  "call-lightning": [P("3d10", "lightning")],
  "conjure-animals": [P("3d10", "slashing")],
  "conjure-barrage": [P("5d8", "weapon")],
  "crusaders-mantle": [P("1d4", "radiant", { plus: true })],
  "elemental-weapon": [P("1d4", ELEMENTS, { plus: true, choose: true })],
  fireball: [P("8d6", "fire")],
  "glyph-of-warding": [P("5d8", ELEMENTS, { choose: true })],
  "hunger-of-hadar": [P("2d6", "cold"), P("2d6", "acid")],
  "lightning-arrow": [P("4d8", "lightning"), P("2d8", "lightning")],
  "lightning-bolt": [P("8d6", "lightning")],
  "spirit-guardians": [P("3d8", ["radiant", "necrotic"], { choose: true })],
  "vampiric-touch": [P("3d6", "necrotic")],
  "wind-wall": [P("4d8", "bludgeoning")],
};

/** Spells whose text talks about damage but which deal none themselves (resistance, falling, rings…). */
export const NO_DAMAGE_SPELLS = ["resistance", "detect-poison-and-disease", "feather-fall", "purify-food-and-drink", "tashas-hideous-laughter",
  "unseen-servant", "invisibility", "lesser-restoration", "magic-weapon", "protection-from-poison", "ray-of-enfeeblement", "warding-bond",
  "feign-death", "gaseous-form", "hypnotic-pattern", "protection-from-energy", "stinking-cloud", "elementalism",
  "detect-evil-and-good", "protection-from-evil-and-good", "magic-circle"];

const kd = (s) => s.replace(/(\d)d(\d)/g, "$1k$2");

/**
 * Turn parts into tags for this character: [{ dice: {pl,en}, types: [...], choose, plus }].
 * level: character level (cantrip dice, minimum level); mod: spellcasting modifier (or null when unknown).
 */
export function resolveDamage(parts, { level = 1, mod = null } = {}) {
  const n = cantripCount(level);
  return (parts || []).filter((p) => !p.min || level >= p.min).map((p) => {
    let d = p.d.replace(/\{cd:d(\d+)\}/g, (_, x) => `${n}d${x}`).replace("{sh}", level < 5 ? "1d8" : "1d10");
    d = mod == null ? d.replace("+{mod}", " + mod") : d.replace("+{mod}", mod ? signed(mod) : "");
    const count = p.n === "beams" ? n : p.n || 1;
    const en = d ? (count > 1 ? `${count} × ` : "") + (p.plus ? "+" : "") + d : "";
    return { dice: L(kd(en).replace(" + mod", " + mod."), en), types: p.t, choose: !!p.choose, plus: !!p.plus };
  });
}

/** Damage of one spell for this character, or null if the spell deals none. */
export function spellDamage(id, c, mod = null) {
  return SPELL_DAMAGE[id] ? resolveDamage(SPELL_DAMAGE[id], { level: c?.level || 1, mod }) : null;
}

/** One damage tag from dice text and types: dmg("1d8+3", "slashing"); more: { plus, choose, n }. Dice are written with "d". */
export function dmg(d, t, more = {}) {
  const en = (more.n > 1 ? `${more.n} × ` : "") + (more.plus ? "+" : "") + d;
  return { dice: L(kd(en), en), types: [].concat(t), choose: !!more.choose, plus: !!more.plus };
}
