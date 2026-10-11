// How many skills a character may choose, and from where.
// Each source is a "slot" with a count and an optional list of allowed skills (null = any skill).

/** Skills the character gets automatically (background, some subclasses). They can't be unticked. */
export function grantedSkills({ cls, bg, subclass }) {
  return [...new Set([...(bg?.skills || []), ...(subclass?.grantedSkills || [])])];
}

/** Choice slots in a sensible order: restricted lists first, "any skill" last. */
export function skillSlots({ cls, sp, bg, skilledCount = 0, level, extra = [] }) {
  const slots = [{ id: "class", label: cls.name, count: cls.skillChoices.count, from: cls.skillChoices.from }];
  if (cls.extraSkills) slots.push(...cls.extraSkills(level));
  if (sp?.skillChoice) slots.push(sp.skillChoice);
  if (bg?.custom) slots.push({ id: "bg", label: bg.name, count: 2, from: null });
  if (skilledCount > 0) slots.push({ id: "skilled", label: { pl: "Feat Skilled", en: "Skilled feat" }, count: skilledCount, from: null });
  slots.push(...extra);
  return slots.filter((s) => s.count > 0).sort((a, b) => (a.from ? 0 : 1) - (b.from ? 0 : 1));
}

/**
 * Can these chosen skills all fit into the slots? Uses a small bipartite matching,
 * so a skill that could go to two places never blocks a later one.
 * Returns { ok, used: [count per slot] }.
 */
export function fitSkills(chosen, slots) {
  const units = [];
  slots.forEach((s, i) => { for (let n = 0; n < s.count; n++) units.push(i); });
  const owner = new Array(units.length).fill(-1);
  const place = (k, seen) => {
    for (let u = 0; u < units.length; u++) {
      const s = slots[units[u]];
      if (seen[u] || (s.from && !s.from.includes(chosen[k]))) continue;
      seen[u] = true;
      if (owner[u] === -1 || place(owner[u], seen)) { owner[u] = k; return true; }
    }
    return false;
  };
  for (let k = 0; k < chosen.length; k++) if (!place(k, [])) return { ok: false, used: [] };
  const used = slots.map(() => 0);
  owner.forEach((k, u) => { if (k !== -1) used[units[u]]++; });
  return { ok: true, used };
}

/** Keep as many of the chosen skills as fit, in the order they were picked. */
export function trimSkills(chosen, slots) {
  const kept = [];
  for (const s of chosen) if (fitSkills([...kept, s], slots).ok) kept.push(s);
  return kept;
}
