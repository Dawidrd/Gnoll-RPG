// Damage tags: dice plus a coloured type label with a sign and a word ("1k8+3 🗡️ cięte"), the same everywhere.
import { h } from "../dom.js";
import { t, tr } from "../i18n.js";
import { typeInfo } from "../rules/damage.js";

/** One type label: sign + word, coloured by type. */
export function typeChip(id) {
  const x = typeInfo(id);
  if (!x) return null;
  return h("span", { cls: "dt dt-" + id }, [h("span", { "aria-hidden": "true", text: x.icon + " " }), tr(x.name)]);
}

/** One damage part: { dice, types, choose }. Several types read "a / b", with "your choice" when you pick one. */
export function dmgTag(p) {
  const dice = tr(p.dice);
  return h("span", { cls: "dmg" }, [dice ? h("b", { text: dice }) : null,
    ...p.types.flatMap((id, i) => [i ? h("span", { cls: "or", text: "/" }) : null, typeChip(id)]),
    p.choose ? h("small", { cls: "pickone", text: t("dmg.choose") }) : null]);
}

/** All parts of a spell or feature, or null when it deals no damage. */
export const dmgTags = (parts) => (parts?.length ? h("span", { cls: "dmgs" }, parts.map(dmgTag)) : null);

/** Just the signs, for small buttons (the full tag shows once you pick the option). */
export const dmgIcons = (parts) => [...new Set((parts || []).flatMap((p) => p.types))].map((id) => typeInfo(id)?.icon || "").join("");
