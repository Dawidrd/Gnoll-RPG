// The Familiar tab (Find Familiar, Pact of the Chain, the Druid's Wild Companion) and its short line on Start.
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { ABILITIES, ABILITY_NAMES, signed, clamp, pipTarget } from "../rules/core.js";
import { FAMILIARS, FAMILIAR_GROUPS, FAMILIAR_TYPES, FAMILIAR_STATUS, familiarForms, familiarAccess, familiarHpMax, familiarSpeed } from "../rules/familiars.js";

const mod = (score) => Math.floor((score - 10) / 2);
const PIPS_MAX = 30; // more HP than this shows as numbers only

/** The tab shows for a character who can have a familiar, and stays while one is filled in (nothing is hidden silently). */
export function hasFamiliar(ch, c) {
  const f = ch.familiar || {};
  return familiarAccess(c).has || !!(f.name || f.form || f.kind || f.notes);
}

/** "Raven „Claw” · HP 2/2 · with you" — for Start and the tab's header. */
export function familiarLine(f) {
  const form = FAMILIARS[f.form];
  const what = form ? tr(form.plain) : f.kind || t("fam.noForm");
  const max = familiarHpMax(f);
  return [f.name ? `${what} „${f.name}”` : what, max ? `HP ${clamp(f.hp.cur ?? max, 0, max)}/${max}` : "", t("fam.status." + f.status)].filter(Boolean).join(" · ");
}

/** The short box on Start: who the familiar is, HP, where it is, and a link to its tab. */
export function familiarStartBox(ch) {
  return h("div", { cls: "stack famcard", id: "familiar" }, [
    h("div", { cls: "orn", text: t("fam.title") }),
    h("p", { cls: "small", text: familiarLine(ch.familiar) }),
    h("a", { cls: "btn small ghost", href: `#/c/${ch.id}/familiar`, text: t("fam.open") }),
  ]);
}

export function familiarTab({ ch, c, save }) {
  const f = ch.familiar;
  const access = familiarAccess(c);
  const form = FAMILIARS[f.form] || null;
  const max = familiarHpMax(f);
  if (max != null && f.hp.cur == null) f.hp.cur = max;
  const cur = max != null ? clamp(f.hp.cur ?? max, 0, max) : null;
  const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : null; };

  const setHp = (v) => {
    f.hp = { ...f.hp, cur: clamp(v, 0, max) };
    if (f.hp.cur === 0 && f.status !== "gone") { f.status = "gone"; toast(t("fam.dropped")); }
    save();
  };
  // Casting Find Familiar again: the familiar comes back (or takes a new form) at full HP, next to you.
  const summon = () => { f.hp = { ...f.hp, cur: familiarHpMax(f) }; f.status = "here"; save(); toast(t("fam.summoned")); };

  // --- who it is ---------------------------------------------------------
  const forms = familiarForms(access);
  const formSel = h("select", { id: "fam-form", onchange: (e) => {
    f.form = e.target.value;
    if (FAMILIARS[f.form]) f.hp = { ...f.hp, cur: FAMILIARS[f.form].hp };
    save();
  } }, [
    h("option", { value: "", text: t("fam.pickForm"), selected: !f.form }),
    ...FAMILIAR_GROUPS.filter((g) => forms.some((x) => x.group === g)).map((g) => h("optgroup", { label: t("fam.group." + g) },
      forms.filter((x) => x.group === g).map((x) => h("option", { value: x.id, text: tr(x.name), selected: x.id === f.form })))),
    h("option", { value: "other", text: t("fam.other"), selected: f.form === "other" }),
  ]);
  // A Chain form chosen before the pact was dropped stays visible with a warning.
  const lostChain = form && form.group === "chain" && !access.chain;
  const typeSel = access.wildOnly
    ? h("p", { cls: "hint", text: t("fam.typeWild") })
    : h("label", {}, [t("fam.type"), h("select", { id: "fam-type", onchange: (e) => { f.type = e.target.value; save(); } }, [
      h("option", { value: "", text: t("fam.pickType"), selected: !f.type }),
      ...Object.entries(FAMILIAR_TYPES).map(([k, v]) => h("option", { value: k, text: tr(v), selected: k === f.type }))])]);
  const who = h("section", { cls: "card stack" }, [
    h("h4", { text: t("fam.who") }),
    h("label", {}, [t("fam.name"), h("input", { id: "fam-name", value: f.name || "", onchange: (e) => { f.name = e.target.value.trim(); save(); } })]),
    h("label", {}, [t("fam.form"), formSel]),
    lostChain ? h("p", { cls: "warn", text: t("fam.lostChain") }) : null,
    f.form === "other" ? h("div", { cls: "row" }, [
      h("label", {}, [t("fam.kind"), h("input", { id: "fam-kind", value: f.kind || "", placeholder: t("fam.kindPh"), onchange: (e) => { f.kind = e.target.value.trim(); save(); } })]),
      h("label", {}, [t("fam.hpMax"), h("input", { type: "number", min: 1, id: "fam-hpmax", value: f.hp.max ?? "", onchange: (e) => { f.hp = { ...f.hp, max: num(e.target.value) }; save(); } })]),
    ]) : null,
    f.form === "other" ? h("p", { cls: "hint", text: t("fam.otherHint") }) : null,
    typeSel,
  ]);

  // --- HP and where it is --------------------------------------------------
  const amt = h("input", { type: "number", min: 0, inputmode: "numeric", placeholder: "0", "aria-label": t("hp.amount"), id: "fam-amt" });
  const val = () => { const v = parseInt(amt.value, 10); return v > 0 ? v : 0; };
  const hpBox = h("section", { cls: "card stack" }, [
    h("h4", { text: t("fam.hpTitle") }),
    max == null ? h("p", { cls: "hint", text: t("fam.noHp") }) : h("div", { cls: "stack" }, [
      h("div", { cls: "hpbig" }, [h("span", { cls: "cur", text: cur }), h("span", { cls: "max", text: "/ " + max })]),
      max <= PIPS_MAX ? h("div", { cls: "pips famhp" }, Array.from({ length: max }, (_, i) => h("button", {
        type: "button", cls: "pip" + (i < cur ? " on" : ""), "aria-label": `HP ${i + 1}/${max}`, onclick: () => setHp(pipTarget(cur, i)),
      }))) : null,
      h("div", { cls: "row" }, [amt,
        h("button", { type: "button", cls: "btn blood", id: "fam-dmg", text: t("hp.damage"), onclick: () => { const v = val(); if (v) setHp(cur - v); } }),
        h("button", { type: "button", cls: "btn", id: "fam-heal", text: t("hp.heal"), onclick: () => { const v = val(); if (v) setHp(cur + v); } }),
      ]),
    ]),
    h("div", { cls: "row", role: "group", "aria-label": t("fam.where") }, FAMILIAR_STATUS.map((s) => h("button", {
      type: "button", cls: "btn small" + (f.status === s ? " gold" : " ghost"), "aria-pressed": f.status === s ? "true" : "false", id: "fam-st-" + s,
      text: t("fam.status." + s), onclick: () => { f.status = s; save(); } }))),
    h("p", { cls: "hint", text: t("fam.statusHint." + f.status) }),
    h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "fam-summon", text: t("fam.summon"), onclick: summon })]),
    h("p", { cls: "hint", text: access.wildOnly ? t("fam.summonWild") : access.chain ? t("fam.summonChain") : t("fam.summonHint") }),
  ]);

  // --- stat block ----------------------------------------------------------
  const stats = form ? h("section", { cls: "card stack", id: "fam-stats" }, [
    h("h4", { text: tr(form.name) }),
    h("p", { cls: "small", text: t("fam.sizeType", { size: tr(form.size), type: f.type ? tr(FAMILIAR_TYPES[f.type]).split(" (")[0] : access.wildOnly ? "Fey" : t("fam.typeOpen"), kind: tr(form.kind) }) }),
    h("div", { cls: "row" }, [
      h("span", { cls: "vit" }, [h("span", { cls: "k", text: "AC" }), h("span", { cls: "v", text: form.ac })]),
      h("span", { cls: "vit" }, [h("span", { cls: "k", text: t("sum.speed") }), h("span", { cls: "v small", text: tr(familiarSpeed(form, access.investment ? f.move : "")) })]),
    ]),
    h("div", { cls: "abgrid" }, ABILITIES.map((a, i) => h("div", { cls: "abcell" }, [
      h("span", { cls: "abk", text: ABILITY_NAMES[a].short[lang()] }),
      h("span", { cls: "abv", text: signed(mod(form.scores[i])) }),
      h("span", { cls: "abs", text: form.scores[i] }),
    ]))),
    h("dl", { cls: "idgrid" }, [
      form.skills ? [t("fam.skills"), tr(form.skills)] : null,
      [t("fam.senses"), tr(form.senses)],
      form.defenses ? [t("fam.defenses"), tr(form.defenses)] : null,
      [t("fam.languages"), form.languages ? tr(form.languages) : t("fam.noLanguages")],
    ].filter(Boolean).map(([k, v]) => h("div", {}, [h("dt", { text: k }), h("dd", { text: v })]))),
    form.traits ? h("p", { text: tr(form.traits) }) : null,
    h("p", {}, [h("b", { text: t("fam.actions") + ": " }), tr(form.actions)]),
    h("p", { cls: "note", text: access.investment ? t("fam.attackInvest") : access.chain ? t("fam.attackChain") : t("fam.attackNo") }),
  ]) : null;

  // --- Investment of the Chain Master (Warlock 5+) --------------------------
  const invest = access.investment ? h("section", { cls: "card stack", id: "fam-invest" }, [
    h("h4", { text: "Investment of the Chain Master" }),
    h("div", { cls: "row", role: "group", "aria-label": t("fam.investMove") }, ["fly", "swim"].map((m) => h("button", {
      type: "button", cls: "btn small" + (f.move === m ? " gold" : " ghost"), "aria-pressed": f.move === m ? "true" : "false", id: "fam-move-" + m,
      text: t("fam.move." + m), onclick: () => { f.move = m; save(); } }))),
    f.move ? null : h("p", { cls: "hint", text: t("fam.investPick") }),
    h("ul", { cls: "checklist" }, ["1", "2", "3"].map((k) => h("li", { text: t("fam.invest" + k, { dc: c.spells?.dc ?? "—" }) }))),
  ]) : null;

  // --- what a familiar can do ----------------------------------------------
  const rules = h("section", { cls: "card stack" }, [
    h("h4", { text: t("fam.rulesTitle") }),
    h("ul", { cls: "checklist" }, ["1", "2", "3", "4", "5"].map((k) => h("li", { text: t("fam.rule" + k) }))),
  ]);

  // --- notes -----------------------------------------------------------------
  const state = h("span", { cls: "hint" });
  let timer;
  const ta = h("textarea", { cls: "notes famnotes", rows: 6, id: "fam-notes", placeholder: t("fam.notesPh"), oninput: () => {
    clearTimeout(timer);
    timer = setTimeout(() => { f.notes = ta.value; save(false); state.textContent = t("notes.saved"); }, 400);
  } }, f.notes || "");
  const notes = h("section", { cls: "card stack" }, [h("h4", { text: t("fam.notes") }), ta, state]);

  return [h("div", { cls: "stack" }, [
    h("header", { cls: "stack" }, [h("h2", { text: t("fam.title") }), h("p", { cls: "lead", text: familiarLine(f) })]),
    who, hpBox, stats, invest, rules, notes,
  ])];
}
