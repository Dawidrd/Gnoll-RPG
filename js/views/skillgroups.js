// Skill checkboxes grouped under their ability, with the score and modifier (e.g. "DEX 16 (+3)"),
// so players see which ability each skill uses while picking (0.28).
import { h } from "../dom.js";
import { lang } from "../i18n.js";
import { ABILITY_NAMES, signed } from "../rules/core.js";
import { skillsByAbility } from "../rules/skills.js";

/** ids: skills to show; c: computed character; item(id) → the checkbox label for one skill. */
export function skillGroups(ids, c, item) {
  return h("div", { cls: "skgroups" }, skillsByAbility(ids).map(({ ab, ids: list }) => {
    const score = c.abilities?.[ab];
    const head = ABILITY_NAMES[ab].short[lang()] + (Number.isFinite(score) ? ` ${score} (${signed(c.mods[ab])})` : "");
    return h("div", { cls: "skgroup" }, [h("h4", { cls: "skhead", text: head }), h("div", { cls: "checks" }, list.map(item))]);
  }));
}
