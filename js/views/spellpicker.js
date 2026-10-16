// Spell list with limits: tick spells, see a short description and the facts (time, range, components, duration).
import { h } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { SPELLS, spellFacts } from "../rules/spells.js";
import { spellDamage } from "../rules/damage.js";
import { dmgTags } from "./dmgtag.js";
import { textMatch } from "../search.js";

// Filter text and level filter survive redraws (the creator rebuilds the page on every change).
const filters = {};

/** Tags after a spell's name: level, concentration, ritual, costly material. */
export function spellTags(s) {
  return [
    h("small", { cls: "lvtag", text: s.circle ? t("spell.circle", { n: s.circle }) : t("spell.cantrip") }),
    s.conc ? h("small", { cls: "lvtag", text: "C", title: t("spell.conc") }) : null,
    s.ritual ? h("small", { cls: "lvtag", text: "R", title: t("spell.ritual") }) : null,
  ];
}

/** Facts and description of one spell, for the character's level. */
export function spellBody(s, c) {
  const f = spellFacts(s, lang());
  return [
    h("p", { cls: "spellfacts small" }, [
      h("span", { text: `${t("spell.time")}: ${f.time}` }), " · ", h("span", { text: `${t("spell.range")}: ${f.range}` }), " · ",
      h("span", { text: `${t("spell.comp")}: ${f.comp}` }), " · ", h("span", { text: `${t("spell.dur")}: ${f.dur}` }),
    ]),
    h("p", { text: tr(s.desc(c)) }),
    h("p", { cls: "hint", text: f.school + (s.costly ? ` · * ${t("spell.costly")}` : "") }),
  ];
}

/**
 * pick: { id, label, count, options: [ids], chosen: [ids] }
 * onChange(ids) is called with the new list.
 */
export function spellPickUI({ pick, c, onChange, title }) {
  const chosen = pick.chosen || [];
  const full = chosen.length >= pick.count;
  const st = (filters[pick.id] ||= { q: "", circle: "all", mine: false });
  const circles = [...new Set(pick.options.map((id) => SPELLS[id].circle))];
  const status = h("p", { cls: "picked" + (chosen.length === pick.count ? " done" : ""), text: t("spell.pickedOf", { n: chosen.length, max: pick.count }) });

  const list = h("div", { cls: "spellpick" });
  const render = () => {
    const ids = pick.options.filter((id) => {
      const s = SPELLS[id];
      if (st.mine && !chosen.includes(id)) return false;
      if (st.circle !== "all" && s.circle !== +st.circle) return false;
      return textMatch(st.q, s.name.pl + " " + s.name.en);
    });
    list.replaceChildren(...ids.map((id) => {
      const s = SPELLS[id];
      const on = chosen.includes(id);
      const box = h("input", { type: "checkbox", id: `sp-${pick.id}-${id}`.replace(/[^\w-]/g, "_"), checked: on, disabled: !on && full,
        "aria-label": tr(s.name), onchange: (e) => onChange(e.target.checked ? [...chosen, id] : chosen.filter((x) => x !== id)) });
      return h("div", { cls: "spellrow" + (on ? " on" : "") }, [box,
        h("details", {}, [h("summary", {}, [h("span", { cls: "sname", text: tr(s.name) }), " ", ...spellTags(s), dmgTags(spellDamage(s.id, c))]), ...spellBody(s, c)])]);
    }));
    if (!ids.length) list.append(h("p", { cls: "hint", text: t("spell.none") }));
  };
  render();

  const search = h("input", { type: "search", placeholder: t("spell.search"), value: st.q, "aria-label": t("spell.search"),
    oninput: (e) => { st.q = e.target.value; render(); } });
  const wrap = h("div", { cls: "stack pickbox", id: `pick-${pick.id}`.replace(/[^\w-]/g, "_") });
  const buttons = [
    ...(circles.length > 1 ? [["all", t("spell.all")], ...circles.map((n) => [String(n), n ? t("spell.circle", { n }) : t("spell.cantrips")])] : []),
    ["mine", t("spell.mine")],
  ];
  const seg = h("div", { cls: "seg small", role: "group" });
  const drawSeg = () => seg.replaceChildren(...buttons.map(([k, label]) => h("button", { type: "button", text: label,
    "aria-pressed": (k === "mine" ? st.mine : !st.mine && st.circle === k) ? "true" : "false",
    onclick: () => { if (k === "mine") st.mine = !st.mine; else { st.mine = false; st.circle = k; } drawSeg(); render(); } })));
  drawSeg();
  wrap.append(h("div", { cls: "pickhead" }, [h("b", { text: title || tr(pick.label) }), status]), h("div", { cls: "row" }, [search, seg]), list);
  return wrap;
}
