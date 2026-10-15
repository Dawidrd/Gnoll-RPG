// Where a character's spells come from, and how many they may pick.
//
// A "source" is the class, a species, or a feat. Each has a spellcasting ability (DC and attack), fixed spells
// (always known or always prepared — outside every limit) and "picks": a number of spells chosen from a filtered list.
// Picks are stored on the character:
//   class picks        ch.spellPicks.cantrips / ch.spellPicks.prepared (Wizard also .book, .savant, .savant5)
//   origin feat picks  ch.featChoices[featId].picks[key]      (Magic Initiate)
//   level feat picks   ch.levelChoices[L].spells               (Fey-Touched, Shadow-Touched, Ritual Caster)
import { SPELLS, spellId } from "./spells.js";
import { FEATS } from "./core.js";

const MENTAL = ["int", "wis", "cha"];
const L = (pl, en) => ({ pl, en });
const PICK_LABEL = {
  cantrips: L("Sztuczki", "Cantrips"), prepared: L("Przygotowane czary", "Prepared spells"), spell: L("Czary", "Spells"), book: L("Księga czarów", "Spellbook"),
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
export function spellSources({ ch, ctx, cls, subclass, casting, sp, spt, originFeats, levelFeats, extra = [] }) {
  const { level, pb, mods } = ctx;
  const out = [];
  const finish = (src) => {
    for (const p of src.picks) {
      p.options = pickOptions(p);
      // Wizard: prepared spells come from the spellbook (picks listed in fromKeys, filled earlier in the list).
      if (p.fromKeys) { const pool = new Set(src.picks.filter((q) => p.fromKeys.includes(q.key)).flatMap((q) => q.chosen || [])); p.options = p.options.filter((id) => pool.has(id)); }
      const raw = readPick(ch, p);
      p.chosen = raw.filter((id) => p.options.includes(id));
      p.invalid = raw.filter((id) => !p.options.includes(id));
      p.label = p.label || PICK_LABEL[p.key] || PICK_LABEL.spell;
    }
    const castable = src.picks.filter((p) => !p.book);
    const prepared = new Set(castable.flatMap((p) => p.chosen));
    // Spellbook spells aren't cast from the book, except Rituals (Ritual Adept) that aren't prepared.
    src.book = [...new Set(src.picks.filter((p) => p.book).flatMap((p) => p.chosen))];
    src.spells = [
      ...src.fixed,
      ...castable.flatMap((p) => p.chosen.map((id) => entry(id, p.uses || (SPELLS[id].circle === 0 ? "atwill" : src.id === "class" ? "slots" : "long"), p.key === "cantrips" ? "cantrip" : "picked", { pick: p.id }))),
      ...src.book.filter((id) => SPELLS[id].ritual && !prepared.has(id)).map((id) => entry(id, "ritual", "book")),
    ].filter((x) => SPELLS[x.id]);
    out.push(src);
  };

  // Class spellcasting (Cleric, Bard, Druid, Wizard…; Arcane Trickster): cantrips + prepared spells of circles you have slots for.
  // Always-prepared spells come from the class (Druidic) and the subclass; bonus cantrips (Guidance, Minor Illusion) are outside the limit.
  if (casting) {
    const always = [...new Set([...(cls.alwaysSpells ? cls.alwaysSpells(level, ctx) : []), ...(subclass?.domainSpells ? subclass.domainSpells(level, ctx) : [])])].map(spellId).filter((id) => SPELLS[id]);
    const fixedC = casting.fixedCantrips || [];
    const bonusC = (subclass?.bonusCantrips ? subclass.bonusCantrips(level) : []).filter((id) => SPELLS[id] && !always.includes(id) && !fixedC.includes(id));
    const freeCasts = subclass?.freeCasts || {};
    const circles = casting.slots.map((_, i) => i + 1);
    // Wizard: the spellbook (+2 per level) and the subclass's free school spells; prepared spells are picked from them.
    const book = casting.spellbook ? [
      { id: "class:book", store: "class", key: "book", count: casting.spellbook, circles, lists: [casting.listId], exclude: always, book: true },
      ...(subclass?.bookPicks ? subclass.bookPicks(level) : []).map((p) => ({ ...p, id: "class:" + p.key, store: "class", lists: [casting.listId], exclude: always, book: true })),
    ] : [];
    finish({
      id: "class", kind: "class", label: subclass?.spellcasting ? subclass.name : cls.name, list: casting.listId, ability: casting.ability,
      ...magicNumbers(casting.ability, mods, pb), slots: casting.slots, resPrefix: null,
      fixed: [...[...fixedC, ...bonusC].map((id) => entry(id, "atwill", "cantrip", { fixedBy: "class" })),
        ...always.map((id) => entry(id, SPELLS[id].circle ? "slots" : "atwill", "always", freeCasts[id] ? { free: freeCasts[id] } : {}))],
      picks: [
        { id: "class:cantrips", store: "class", key: "cantrips", count: Math.max(0, casting.cantrips - fixedC.length), circles: [0], lists: [casting.listId], exclude: [...fixedC, ...bonusC, ...always] },
        ...book,
        { id: "class:prepared", store: "class", key: "prepared", count: casting.prepared, circles, lists: [casting.listId], exclude: always, fromKeys: book.length ? book.map((p) => p.key) : null },
      ],
    });
  }

  // Class extras: spells from Eldritch Invocations and the Book of Shadows.
  for (const src of extra) finish({ ...src, ...magicNumbers(src.ability, mods, pb), fixed: [...src.fixed], picks: src.picks.map((p) => ({ ...p })) });

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
