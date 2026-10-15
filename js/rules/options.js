// Class option lists picked by the player: Eldritch Invocations (Warlock), Metamagic (Sorcerer).
// Stored as ch.classOptions[key] = ["armor-of-shadows", "agonizing-blast@eldritch-blast", …] — "@cantrip" for options tied to a cantrip.
import { DAMAGE_CANTRIPS, SPELLS } from "./spells.js";

const L = (pl, en) => ({ pl, en });

/** Cantrips that qualify for an option's "a Warlock cantrip that deals damage / attacks / reaches 10+ ft" prerequisite. */
export function qualifyingCantrips(kind, known) {
  return known.filter((id) => {
    const d = DAMAGE_CANTRIPS[id];
    if (!d) return false;
    return kind === "damage" || (kind === "attack" && d.attack) || (kind === "range" && d.range >= 10);
  });
}

/**
 * Evaluate the option picks of a class.
 * known: Warlock cantrips the character knows (class picks + Pact of the Tome).
 * Returns groups with each chosen entry checked: { raw, base, cantrip, problem } (problem = {pl,en} or null).
 */
export function classOptions(ch, cls, ctx, known) {
  const groups = (cls.optionPicks ? cls.optionPicks(ctx) : []).map((g) => {
    const raw = (ch.classOptions?.[g.key] || []);
    const parsed = raw.map((r) => { const [base, cantrip] = r.split("@"); return { raw: r, base, cantrip: cantrip || "" }; });
    const has = (id) => parsed.some((x) => x.base === id && g.options[id]);
    for (const x of parsed) { // only the later copy of a duplicate is flagged
      const o = g.options[x.base];
      const p = o?.prereq || {};
      let problem = null;
      if (!o) problem = L("nieznana opcja", "unknown option");
      else if (p.level && ctx.level < p.level) problem = L(`wymaga ${p.level}. poziomu`, `requires level ${p.level}`);
      else if (p.pact && !has(`pact-of-the-${p.pact}`)) problem = L(`wymaga Pact of the ${p.pact[0].toUpperCase() + p.pact.slice(1)}`, `requires Pact of the ${p.pact[0].toUpperCase() + p.pact.slice(1)}`);
      else if (p.invocation && !has(p.invocation)) problem = L(`wymaga ${g.options[p.invocation].name.pl}`, `requires ${g.options[p.invocation].name.en}`);
      else if (p.cantrip) {
        if (!x.cantrip) { problem = L("wybierz sztuczkę", "pick a cantrip"); x.pending = true; }
        else if (!qualifyingCantrips(p.cantrip, known).includes(x.cantrip)) problem = L("ta sztuczka się nie nadaje albo jej nie znasz", "that cantrip doesn't qualify or isn't known");
      }
      if (!problem && parsed.slice(0, parsed.indexOf(x)).some((y) => y.base === x.base && (!o.repeatable || y.cantrip === x.cantrip)))
        problem = L("wybrane dwa razy", "picked twice");
      x.problem = problem;
      x.option = o || null;
    }
    return { ...g, chosen: parsed };
  });
  const valid = Object.fromEntries(groups.map((g) => [g.key, g.chosen.filter((x) => !x.problem)]));
  return { groups, valid };
}

/** Spells an option lets you cast (only those in the spell database, i.e. up to level 3). */
export const optionInnate = (entries) => entries.flatMap((x) => (x.option?.innate || []).filter((s) => SPELLS[s.id]).map((s) => ({ ...s, from: x.base })));
