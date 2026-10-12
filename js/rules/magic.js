// Where a character's spells come from, and how many they may pick.
//
// A "source" is the class, a species, or a feat. Each has a spellcasting ability (DC and attack), fixed spells
// (always known or always prepared — outside every limit) and "picks": a number of spells chosen from a filtered list.
// Picks are stored on the character:
//   class picks        ch.spellPicks.cantrips / ch.spellPicks.prepared
//   origin feat picks  ch.featChoices[featId].picks[key]      (Magic Initiate)
//   level feat picks   ch.levelChoices[L].spells               (Fey-Touched, Shadow-Touched, Ritual Caster)
import { SPELLS, spellId } from "./spells.js";
import { FEATS } from "./core.js";

const MENTAL = ["int", "wis", "cha"];
const L = (pl, en) => ({ pl, en });
const PICK_LABEL = {
  cantrips: L("Sztuczki", "Cantrips"), prepared: L("Przygotowane czary", "Prepared spells"), spell: L("Czary", "Spells"),
};

export function readPick(ch, p) {
  let v;
  if (p.store === "class") v = ch.spellPicks?.[p.key];
  else if (p.store === "feat") v = ch.featChoices?.[p.featId]?.picks?.[p.key];
  else if (p.store === "level") v = ch.levelChoices?.[p.L]?.spells;
  return Array.isArray(v) ? [...new Set(v)] : [];
}

/** Returns an updated copy of the part of the character that holds this pick (mutates ch). */
export function writePick(ch, p, ids) {
  if (p.store === "class") ch.spellPicks = { ...(ch.spellPicks || {}), [p.key]: ids };
  else if (p.store === "feat") {
    const fc = ch.featChoices?.[p.featId] || {};
    ch.featChoices = { ...(ch.featChoices || {}), [p.featId]: { ...fc, picks: { ...(fc.picks || {}), [p.key]: ids } } };
  } else if (p.store === "level") ch.levelChoices = { ...(ch.levelChoices || {}), [p.L]: { ...(ch.levelChoices?.[p.L] || {}), spells: ids } };
}

/** Spell ids a pick may choose from. */
export function pickOptions(p) {
  return Object.values(SPELLS).filter((s) => p.circles.includes(s.circle)
    && (!p.lists || p.lists.some((l) => s.classes.includes(l)))
    && (!p.schools || p.schools.includes(s.school))
    && (!p.ritual || s.ritual)
    && !(p.exclude || []).includes(s.id))
    .sort((a, b) => a.circle - b.circle || a.name.en.localeCompare(b.name.en)).map((s) => s.id);
}

const magicNumbers = (ability, mods, pb) => (ability ? { dc: 8 + mods[ability] + pb, attack: mods[ability] + pb } : { dc: null, attack: null });
const entry = (id, uses, kind, extra = {}) => ({ id, uses, kind, ...extra });

/**
 * All spell sources of a character.
 * ctx: { level, pb, mods }, cls, subclass, casting (class spellcasting or null), species traits (spt), originFeats, levelFeats.
 */
export function spellSources({ ch, ctx, cls, subclass, casting, sp, spt, originFeats, levelFeats }) {
  const { level, pb, mods } = ctx;
  const out = [];
  const finish = (src) => {
    for (const p of src.picks) {
      p.options = pickOptions(p);
      const raw = readPick(ch, p);
      p.chosen = raw.filter((id) => p.options.includes(id));
      p.invalid = raw.filter((id) => !p.options.includes(id));
      p.label = p.label || PICK_LABEL[p.key] || PICK_LABEL.spell;
    }
    src.spells = [
      ...src.fixed,
      ...src.picks.flatMap((p) => p.chosen.map((id) => entry(id, p.uses || (SPELLS[id].circle === 0 ? "atwill" : src.id === "class" ? "slots" : "long"), p.key === "cantrips" ? "cantrip" : "picked", { pick: p.id }))),
    ].filter((x) => SPELLS[x.id]);
    out.push(src);
  };

  // Class spellcasting (Cleric; Arcane Trickster): cantrips + prepared spells of circles you have slots for.
  if (casting) {
    const always = (subclass?.domainSpells ? subclass.domainSpells(level) : []).map(spellId).filter((id) => SPELLS[id]);
    const fixedC = casting.fixedCantrips || [];
    const circles = casting.slots.map((_, i) => i + 1);
    finish({
      id: "class", kind: "class", label: subclass?.spellcasting ? subclass.name : cls.name, list: casting.listId, ability: casting.ability,
      ...magicNumbers(casting.ability, mods, pb), slots: casting.slots, resPrefix: null,
      fixed: [...fixedC.map((id) => entry(id, "atwill", "cantrip", { fixedBy: "class" })), ...always.map((id) => entry(id, SPELLS[id].circle ? "slots" : "atwill", "always"))],
      picks: [
        { id: "class:cantrips", store: "class", key: "cantrips", count: Math.max(0, casting.cantrips - fixedC.length), circles: [0], lists: [casting.listId], exclude: [...fixedC, ...always] },
        { id: "class:prepared", store: "class", key: "prepared", count: casting.prepared, circles, lists: [casting.listId], exclude: always },
      ],
    });
  }

  // Species spells (lineages, legacies, Hexblood…): fixed by the species, ability picked in the creator.
  if (spt?.magic) {
    finish({ id: "species", kind: "species", label: sp.name, ability: spt.magic.ability, needsAbility: true, dc: spt.magic.dc, attack: spt.magic.attack, resPrefix: "sp-",
      fixed: spt.magic.spells.map((x) => entry(x.id, x.uses, "innate", { at: x.at })), picks: [] });
  }

  // Origin feats: Magic Initiate (picks) and Dark Gifts (fixed spells).
  for (const f of originFeats) {
    if (!f.innate && !f.spellPicks) continue;
    const ability = f.spellAbility && MENTAL.includes(f.choice.ability) ? f.choice.ability : "";
    finish({ id: "feat-" + f.id, kind: "feat", label: f.name, featId: f.id, ability, needsAbility: !!f.spellAbility, ...magicNumbers(ability, mods, pb), resPrefix: `ft-${f.id}-`,
      fixed: (f.innate || []).map((x) => entry(x.id, x.uses, "innate")),
      picks: (f.spellPicks || []).map((p) => ({ ...p, id: `feat-${f.id}:${p.key}`, store: "feat", featId: f.id, count: p.count === "pb" ? pb : p.count })) });
  }

  // Feats taken at Ability Score Improvement levels: the ability they raised is their spellcasting ability.
  for (const lf of levelFeats) {
    const f = FEATS[lf.id];
    if (!f.innate && !f.spellPicks) continue;
    const ability = f.spellAbilityFromIncrease && MENTAL.includes(lf.pick.inc) ? lf.pick.inc : "";
    finish({ id: "lvl-" + lf.L, kind: "feat", label: f.name, featId: lf.id, L: lf.L, ability, needsAbility: true, ...magicNumbers(ability, mods, pb), resPrefix: `lv${lf.L}-`,
      fixed: (f.innate || []).map((x) => entry(x.id, x.uses, "innate")),
      picks: (f.spellPicks || []).map((p) => ({ ...p, id: `lvl-${lf.L}:${p.key}`, store: "level", L: lf.L, count: p.count === "pb" ? pb : p.count })) });
  }
  return out;
}

/** Free casts per long rest (species, feats) as resources the sheet can track. */
export function spellResources(sources, pb) {
  return sources.filter((s) => s.resPrefix).flatMap((s) => s.spells.filter((x) => x.uses === "long" || x.uses === "pb")
    .map((x) => ({ id: s.resPrefix + x.id, max: x.uses === "pb" ? pb : 1, recharge: "long", name: SPELLS[x.id].name, spell: x.id, source: s.id })));
}
