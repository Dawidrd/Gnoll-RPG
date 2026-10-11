// Character creator in the five steps of chapter 2 of the 2024 Player's Handbook:
// 1 Class → 2 Origin → 3 Ability scores → 4 Alignment and identity → 5 Details.
// The form redraws from `ch` after each structural change; text fields write straight into `ch`.
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { getById, upsert } from "../store.js";
import {
  CLASSES, PLANNED_CLASSES, SPECIES, BACKGROUNDS, TOOLS, TOOL_GROUPS, ARMOR, LANGUAGES, ALIGNMENTS, SIZES, SETTINGS,
  blankCharacter, normalize, compute, finalAbilities, fixedHp,
} from "../rules/index.js";
import { ABILITIES, ABILITY_NAMES, SKILLS, FEATS, STANDARD_ARRAY, mod, signed, roll4d6, rollDie } from "../rules/core.js";
import { POINT_BUY, pointsSpent } from "../rules/identity.js";
import { backgroundBonus } from "../rules/backgrounds.js";
import { fitSkills, trimSkills } from "../rules/skills.js";
import { randomName } from "../rules/names.js";

const STEPS = [1, 2, 3, 4, 5];

export { msg } from "./msg.js";
import { msg } from "./msg.js";
import { levelChoiceUI } from "./levelchoice.js";

export function renderForm(root, go, id) {
  const stored = id ? getById(id) : null;
  if (id && !stored) return go("#/");
  const ch = stored ? normalize(structuredClone(stored)) : blankCharacter();
  const isNew = !id;
  let step = 1;
  const short = (a) => ABILITY_NAMES[a].short[lang()];
  const skillName = (sid) => SKILLS.find((k) => k.id === sid)[lang()];
  const field = (label, input, cls) => h("label", { cls }, [label, input]);
  const seg = (options, current, onpick, disabled = () => false) => h("div", { cls: "seg", role: "group" }, options.map(([k, label]) =>
    h("button", { type: "button", "aria-pressed": k === current ? "true" : "false", disabled: disabled(k), text: label, onclick: () => onpick(k) })));
  const cls = () => CLASSES[ch.classId];
  const card = (title, kids, extra = {}) => h("section", { cls: "card stack", ...extra }, [title ? h("h4", { text: title }) : null, ...kids]);

  // After a change, drop picks that no longer fit their sources (and tell the player).
  // Items a character was opened with stay until the player fixes them.
  let lastSig = null;
  function tidy() {
    const c = compute(structuredClone(ch));
    const sig = JSON.stringify([c.slots.map((x) => [x.id, x.count, x.from]), c.granted, c.expertiseMax, c.languages.slots.map((x) => [x.id, x.count]),
      c.toolSlots.map((x) => [x.id, x.count, x.from.length]), c.featSlots.map((x) => x.id), ch.background, ch.speciesId]);
    const changed = lastSig !== null && sig !== lastSig;
    lastSig = sig;
    if (!changed) return;
    const dropped = [];
    const chosen = ch.skills.filter((x) => !c.granted.includes(x));
    const kept = trimSkills(chosen, c.slots);
    chosen.filter((x) => !kept.includes(x)).forEach((x) => dropped.push(skillName(x)));
    ch.skills = kept;
    const prof = new Set([...c.granted, ...kept]);
    ch.expertise = ch.expertise.filter((x) => prof.has(x)).slice(0, c.expertiseMax);
    const langKept = trimSkills(c.languages.chosen, c.languages.slots);
    c.languages.chosen.filter((x) => !langKept.includes(x)).forEach((x) => dropped.push(tr(LANGUAGES[x].name)));
    ch.languages = langKept;
    const slotIds = new Set(c.toolSlots.map((x) => x.id));
    for (const k of Object.keys(ch.toolPicks)) {
      const sl = c.toolSlots.find((x) => x.id === k);
      if (!slotIds.has(k)) { ch.toolPicks[k].forEach((x) => dropped.push(tr(TOOLS[x]))); delete ch.toolPicks[k]; }
      else ch.toolPicks[k] = ch.toolPicks[k].filter((x) => sl.from.includes(x)).slice(0, sl.count);
    }
    const featSlotIds = new Set(c.featSlots.map((x) => x.id));
    for (const k of Object.keys(ch.featPicks)) if (!featSlotIds.has(k)) { dropped.push(tr(FEATS[ch.featPicks[k]]?.name)); delete ch.featPicks[k]; }
    const bgFeat = BACKGROUNDS[ch.background]?.feat;
    ch.legacyFeats = (ch.legacyFeats || []).filter((x) => x !== bgFeat && !Object.values(ch.featPicks).includes(x));
    if (!SPECIES[ch.speciesId].sizes.includes(ch.size)) ch.size = "";
    if (dropped.length) toast(t("form.dropped", { list: dropped.join(", ") }));
  }

  function draw() {
    tidy();
    const scroll = scrollY;
    root.replaceChildren(build());
    scrollTo(0, scroll);
  }
  const goStep = (n) => { step = n; tidy(); root.replaceChildren(build()); root.querySelector(".stepper")?.scrollIntoView({ block: "start" }); };

  function build() {
    const c = compute(structuredClone(ch));
    const { todo, errors, notices } = c.review;
    const count = (n) => todo.filter((x) => x.step === n).length;
    const bad = (n) => errors.some((x) => x.step === n);

    const stepper = h("nav", { cls: "stepper", "aria-label": t("form.steps") }, STEPS.map((n) => h("button", {
      type: "button", cls: "stepbtn" + (n === step ? " on" : "") + (bad(n) ? " bad" : count(n) ? " todo" : " done"),
      "aria-current": n === step ? "step" : false, onclick: () => goStep(n),
    }, [h("span", { cls: "stepnum", text: n }), h("span", { cls: "steplbl", text: t("step." + n) }),
      h("span", { cls: "stepstate", text: bad(n) ? "!" : count(n) ? String(count(n)) : "✓" })])));

    const body = { 1: stepClass, 2: stepOrigin, 3: stepAbilities, 4: stepIdentity, 5: stepDetails }[step](c);

    const here = [...errors.filter((x) => x.step === step).map((x) => h("li", { cls: "err", text: msg(x) })),
      ...todo.filter((x) => x.step === step).map((x) => h("li", { text: msg(x) })),
      ...notices.filter((x) => x.step === step).map((x) => h("li", { cls: "note", text: msg(x) }))];
    const checklist = here.length ? card(t("form.checklist"), [h("ul", { cls: "checklist" }, here)], { cls: "card stack checkcard" }) : null;

    const nav = h("div", { cls: "row formnav" }, [
      step > 1 ? h("button", { type: "button", cls: "btn ghost", id: "f-prev", text: "← " + t("form.prev"), onclick: () => goStep(step - 1) }) : null,
      step < 5 ? h("button", { type: "button", cls: "btn", id: "f-next", text: t("form.next") + " →", onclick: () => goStep(step + 1) }) : null,
      h("button", { type: "submit", cls: "btn gold", id: "f-save", text: t("form.save") }),
    ]);
    const totalTodo = todo.length;
    const status = h("p", { cls: "formstatus" + (errors.length ? " bad" : totalTodo ? "" : " ok"),
      text: errors.length ? t("form.statusErrors", { n: errors.length }) : totalTodo ? t("form.statusTodo", { n: totalTodo }) : t("form.statusDone") });

    return h("form", { cls: "panel cform", novalidate: true, onsubmit: (e) => { e.preventDefault(); save(); } }, [
      h("header", { cls: "stack" }, [h("div", { cls: "formhead" }, [h("h2", { text: t(isNew ? "form.titleNew" : "form.titleEdit") }),
        h("a", { cls: "btn ghost", href: isNew ? "#/" : `#/c/${ch.id}/character`, text: t("form.cancel") })]), status]),
      stepper,
      h("h3", { cls: "steptitle", text: `${step}. ${t("step." + step + ".title")}` }),
      h("p", { cls: "hint", text: t("step." + step + ".hint") }),
      ...body, checklist, nav,
    ]);
  }

  // --- Step 1: class ---------------------------------------------------------
  function stepClass(c) {
    const settingSel = h("select", { id: "f-setting", onchange: (e) => { ch.setting = e.target.value; draw(); } },
      Object.entries(SETTINGS).map(([k, n]) => h("option", { value: k, text: tr(n), selected: k === (ch.setting || "standard") })));
    const clsSel = h("select", { id: "f-class", onchange: (e) => {
      ch.classId = e.target.value; ch.subclass = ""; ch.classChoices = {}; ch.expertise = []; ch.levelChoices = {};
      ch.level = Math.min(ch.level, cls().maxLevel);
      if (ch.abilityMethod === "array") ch.abilityBase = { ...cls().standardArray };
      if (ch.abilityMethod === "roll" && ch.rolled) assignByClass(ch.rolled.map((r) => r.total));
      draw();
    } }, [
      ...Object.values(CLASSES).map((k) => h("option", { value: k.id, text: tr(k.name), selected: k.id === ch.classId })),
      ...Object.entries(PLANNED_CLASSES).map(([k, n]) => h("option", { value: k, text: `${tr(n)} (${t("form.soon")})`, disabled: true })),
    ]);
    const levelSel = h("select", { id: "f-level", onchange: (e) => {
      ch.level = +e.target.value;
      for (const l of Object.keys(ch.hpRolls)) if (+l > ch.level) delete ch.hpRolls[l];
      for (const l of Object.keys(ch.levelChoices || {})) if (+l > ch.level) delete ch.levelChoices[l];
      draw();
    } }, Array.from({ length: cls().maxLevel }, (_, i) => h("option", { value: i + 1, text: i + 1, selected: i + 1 === ch.level })));
    const subSel = h("select", { id: "f-subclass", onchange: (e) => { ch.subclass = e.target.value; draw(); } }, [
      h("option", { value: "", text: t("form.subclassNone") }),
      ...Object.entries(cls().subclasses || {}).map(([k, s]) => h("option", { value: k, text: tr(s.name), selected: k === ch.subclass })),
      ch.subclass === "custom" ? h("option", { value: "custom", text: `${ch.subclassCustom || "?"} (${t("form.oldVersion")})`, selected: true, disabled: true }) : null,
    ]);
    const choiceFields = Object.entries(cls().choices || {}).map(([k, d]) => {
      const cur = ch.classChoices[k] || d.default;
      return field(tr(d.label), h("select", { id: "f-choice-" + k, onchange: (e) => { ch.classChoices = { ...ch.classChoices, [k]: e.target.value }; draw(); } },
        Object.entries(d.options).map(([ok, o]) => h("option", { value: ok, text: tr(o), selected: ok === cur }))), "wide");
    });
    const classTools = c.toolSlots.filter((s) => s.step === 1).map((s) => toolSlotUI(c, s));
    return [
      card(t("form.settingTitle"), [field(t("form.setting"), settingSel, "wide"),
        h("p", { cls: "hint", text: t(ch.setting === "ravenloft" ? "form.settingRavenloft" : "form.settingStandard") })]),
      card(t("form.class"), [
        h("p", { cls: "lead small", text: tr(cls().role) }),
        h("div", { cls: "row" }, [field(t("form.class"), clsSel), field(t("form.level"), levelSel)]),
        choiceFields.length ? h("div", { cls: "row" }, choiceFields) : null,
        h("div", { cls: "row" }, [field(t("form.subclass", { n: cls().subclassLevel }), subSel, "wide")]),
        ch.level < cls().subclassLevel ? h("p", { cls: "hint", text: t("form.subclassHint", { n: cls().subclassLevel }) }) : null,
      ]),
      ...classTools,
    ];
  }

  // --- Step 2: origin ---------------------------------------------------------
  function stepOrigin(c) {
    const bg = BACKGROUNDS[ch.background];
    const bgSel = h("select", { id: "f-bg", onchange: (e) => {
      ch.background = e.target.value;
      const b = BACKGROUNDS[ch.background];
      ch.bgIncrease = { mode: "21", plus2: b ? b.abilities[0] : "", plus1: b ? b.abilities[1] : "" };
      if (b) ch.skills = ch.skills.filter((s) => !b.skills.includes(s));
      delete ch.toolPicks.bg;
      draw();
    } }, [
      h("option", { value: "", text: t("form.bgNone") }),
      ...Object.entries(BACKGROUNDS).filter(([, b]) => !b.legacy).map(([k, b]) => h("option", { value: k, text: tr(b.name), selected: k === ch.background })),
      bg?.legacy ? h("option", { value: ch.background, text: tr(bg.name), selected: true, disabled: true }) : null,
    ]);
    const bgParts = [field(t("form.background"), bgSel, "wide")];
    if (bg && !bg.legacy) bgParts.push(h("p", { cls: "bgsum" }, [
      h("span", {}, [h("b", { text: t("form.bgAbilities") + ": " }), bg.abilities.map(short).join(", "), " ", h("small", { text: t("form.bgAbilitiesNote") })]),
      h("span", {}, [h("b", { text: t("form.bgFeat") + ": " }), tr(FEATS[bg.feat].name)]),
      h("span", {}, [h("b", { text: t("form.bgSkills") + ": " }), bg.skills.map(skillName).join(", ")]),
      h("span", {}, [h("b", { text: t("form.bgTool") + ": " }), TOOL_GROUPS[bg.tool] ? t("form.oneKindOf", { group: tr(TOOL_GROUPS[bg.tool].name) }) : tr(TOOLS[bg.tool])]),
    ]));
    const bgTools = c.toolSlots.filter((s) => s.id === "bg").map((s) => toolSlotUI(c, s, true));

    const sp = SPECIES[ch.speciesId];
    const spSel = h("select", { id: "f-species", onchange: (e) => { ch.speciesId = e.target.value; ch.size = ""; draw(); } }, [
      ...Object.entries(SPECIES).filter(([, s]) => !s.legacy).map(([k, s]) => h("option", { value: k, text: tr(s.name), selected: k === ch.speciesId })),
      sp.legacy ? h("option", { value: ch.speciesId, text: `${ch.customSpecies?.name || "?"} (${t("form.oldVersion")})`, selected: true, disabled: true }) : null,
    ]);
    const spParts = [h("div", { cls: "row" }, [field(t("form.species"), spSel)])];
    if (sp.choice) {
      const cur = ch.speciesChoice?.[sp.choice.key] || sp.choice.default;
      ch.speciesChoice = { ...ch.speciesChoice, [sp.choice.key]: cur };
      spParts.push(h("div", { cls: "row" }, [field(tr(sp.choice.label), h("select", { id: "f-ancestry", onchange: (e) => (ch.speciesChoice = { ...ch.speciesChoice, [sp.choice.key]: e.target.value }) },
        Object.entries(sp.choice.options).map(([k, o]) => h("option", { value: k, text: tr(o), selected: k === cur }))))]));
    }
    spParts.push(h("div", { cls: "stack" }, [h("span", { cls: "lbl-sm", text: t("form.size") }),
      sp.sizes.length > 1
        ? seg(sp.sizes.map((k) => [k, tr(SIZES[k])]), c.size, (k) => { ch.size = k; draw(); })
        : h("p", { text: tr(SIZES[sp.sizes[0]]) })]));
    spParts.push(h("p", { cls: "hint", text: t("form.speciesFacts", { speed: sp.speed, dark: sp.darkvision ? sp.darkvision + " ft" : t("sum.none") }) }));

    return [card(t("form.backgroundTitle"), bgParts), ...bgTools, card(t("form.species"), spParts), languagesUI(c)];
  }

  function languagesUI(c) {
    const L = c.languages;
    const canAdd = (k) => fitSkills([...L.chosen, k], L.slots).ok;
    const box = (k) => {
      const auto = L.auto.includes(k);
      const on = auto || L.chosen.includes(k);
      const blocked = !on && !canAdd(k);
      return h("label", { cls: "check" + (auto ? " locked" : "") + (blocked ? " blocked" : "") }, [
        h("input", { type: "checkbox", id: "f-lang-" + k, checked: on, disabled: auto || blocked, onchange: (e) => {
          ch.languages = e.target.checked ? [...L.chosen, k] : L.chosen.filter((x) => x !== k); draw();
        } }), tr(LANGUAGES[k].name), auto ? h("small", { text: t("form.auto") }) : null,
      ]);
    };
    const std = Object.keys(LANGUAGES).filter((k) => LANGUAGES[k].std);
    const rare = Object.keys(LANGUAGES).filter((k) => !LANGUAGES[k].std && (L.auto.includes(k) || L.chosen.includes(k) || L.slots.some((s) => s.from.includes(k))));
    return card(t("form.languages"), [
      h("p", { cls: "hint", text: t("form.languagesHint") }),
      budgetList(L.slots, L.fit, (x) => tr(LANGUAGES[x].name)),
      h("p", { cls: "picked" + (L.chosen.length === L.total && L.fit.ok ? " done" : ""), text: t("form.picked", { n: L.chosen.length, max: L.total }) }),
      h("h4", { text: t("form.langStandard") }), h("div", { cls: "checks" }, std.map(box)),
      rare.length ? h("h4", { text: t("form.langRare") }) : null, rare.length ? h("div", { cls: "checks" }, rare.map(box)) : null,
    ], { id: "f-languages" });
  }

  // --- Step 3: ability scores ------------------------------------------------
  function stepAbilities(c) {
    const method = ch.abilityMethod;
    const legacy = method === "manual";
    const locked = !!ch.rolled;
    const bg = BACKGROUNDS[ch.background];
    const bonus = legacy && !ch.background ? {} : backgroundBonus(ch);
    const fin = finalAbilities(ch);
    const pool = method === "array" ? STANDARD_ARRAY : method === "roll" && ch.rolled ? ch.rolled.map((r) => r.total) : null;

    const setMethod = (m) => {
      if (locked && m !== "roll") return;
      ch.abilityMethod = m;
      if (m === "array") ch.abilityBase = { ...cls().standardArray };
      if (m === "pointbuy") ch.abilityBase = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
      if (m === "roll" && ch.rolled) assignByClass(ch.rolled.map((r) => r.total));
      draw();
    };
    const spent = pointsSpent(ch.abilityBase);
    const baseCell = (a) => {
      if (method === "pointbuy") {
        const v = ch.abilityBase[a];
        const nextCost = (POINT_BUY.cost[v + 1] ?? 99) - POINT_BUY.cost[v];
        return h("div", { cls: "pb" }, [
          h("button", { type: "button", cls: "btn sq ghost", id: "f-pb-dn-" + a, "aria-label": "−1 " + short(a), text: "−", disabled: v <= POINT_BUY.min,
            onclick: () => { ch.abilityBase[a] = v - 1; draw(); } }),
          h("b", { text: v }),
          h("button", { type: "button", cls: "btn sq ghost", id: "f-pb-up-" + a, "aria-label": "+1 " + short(a), text: "+", disabled: v >= POINT_BUY.max || spent + nextCost > POINT_BUY.budget,
            onclick: () => { ch.abilityBase[a] = v + 1; draw(); } }),
          h("small", { text: t("form.pbCost", { n: POINT_BUY.cost[v] }) }),
        ]);
      }
      if (!pool) return h("span", { cls: legacy ? "" : "hint", text: legacy ? ch.abilityBase[a] : "—" });
      const values = [...new Set(pool)].sort((x, y) => y - x);
      return h("select", { id: "f-ab-" + a, "aria-label": short(a), onchange: (e) => {
        const v = +e.target.value, old = ch.abilityBase[a];
        const other = ABILITIES.find((b) => b !== a && ch.abilityBase[b] === v);
        if (other) ch.abilityBase[other] = old;
        ch.abilityBase[a] = v; draw();
      } }, values.map((v) => h("option", { value: v, text: v, selected: v === ch.abilityBase[a] })));
    };

    const abRows = h("div", { cls: "abtable", role: "table" }, [
      h("div", { cls: "abrow head", role: "row" }, [t("form.abAbility"), t("form.abBase"), t("form.abBg"), t("form.abFinal")].map((x) => h("span", { role: "columnheader", text: x }))),
      ...ABILITIES.map((a) => h("div", { cls: "abrow", role: "row" }, [
        h("span", { cls: "abname", text: ABILITY_NAMES[a][lang()] }),
        baseCell(a),
        h("span", { cls: "abbonus", text: bonus[a] ? "+" + bonus[a] : "" }),
        h("span", { cls: "abfinal" }, [h("b", { text: fin[a] }), " ", h("span", { cls: "abmod", text: signed(mod(fin[a])) })]),
      ])),
    ]);

    const parts = [
      seg([["array", t("form.mArray")], ["pointbuy", t("form.mPointBuy")], ["roll", t("form.mRoll")]], legacy ? "" : method, setMethod, (k) => locked && k !== "roll"),
      h("p", { cls: "hint", text: legacy ? t("form.mHint.manual") : t("form.mHint." + method, { cls: tr(cls().name) }) }),
    ];
    if (locked) parts.push(h("p", { cls: "hint", text: t("form.rollLocked") }));
    if (method === "pointbuy") parts.push(h("p", { cls: "picked" + (spent === POINT_BUY.budget ? " done" : ""), id: "f-pb-left", text: t("form.pbLeft", { n: POINT_BUY.budget - spent, max: POINT_BUY.budget }) }));
    if (method === "roll") {
      parts.push(h("div", { cls: "row" }, [
        ch.rolled ? null : h("button", { type: "button", cls: "btn gold", id: "f-rollall", text: t("form.rollAll"), onclick: () => {
          ch.rolled = ABILITIES.map(() => roll4d6()); assignByClass(ch.rolled.map((r) => r.total)); draw();
        } }),
        ch.rolled ? h("span", { cls: "dice" }, ch.rolled.map((r) => h("span", { cls: "die", title: `${r.dice.join("+")} (−${r.dropped})` }, [h("b", { text: r.total }), h("small", { text: `${r.dice.join(" ")} ·${r.dropped}` })]))) : null,
      ]));
      if (!ch.rolled) parts.push(h("p", { cls: "warn soft", text: t("form.rollOnce") }));
    }
    parts.push(abRows);

    // Background increase (PHB: "Adjust ability scores" is part of step 3).
    const incParts = [];
    if (!bg) incParts.push(h("p", { cls: "hint", text: t("form.incNoBg") }));
    else if (!bg.legacy) {
      const inc = ch.bgIncrease;
      const abSelect = (val, onch, idx) => h("select", { id: "f-inc-" + idx, onchange: (e) => { onch(e.target.value); draw(); } }, [
        h("option", { value: "", text: "—" }), ...bg.abilities.map((a) => h("option", { value: a, text: short(a), selected: a === val })),
      ]);
      incParts.push(
        h("p", { cls: "hint", text: t("form.incRule", { bg: tr(bg.name), list: bg.abilities.map(short).join(", ") }) }),
        seg([["21", "+2 / +1"], ["111", "+1 / +1 / +1"]], inc.mode === "111" ? "111" : "21", (m) => { inc.mode = m; draw(); }),
        inc.mode === "111" ? h("p", { cls: "hint", text: t("form.inc111", { list: bg.abilities.map(short).join(", ") }) })
          : h("div", { cls: "row" }, [
            field("+2", abSelect(inc.plus2, (v) => { inc.plus2 = v; if (inc.plus1 === v) inc.plus1 = ""; }, "p2")),
            field("+1", abSelect(inc.plus1, (v) => { inc.plus1 = v; if (inc.plus2 === v) inc.plus2 = ""; }, "p1")),
          ]),
      );
    }
    return [card(t("form.abilities"), parts), card(t("form.increase"), incParts)];
  }

  // --- Step 4: alignment and identity -----------------------------------------
  function stepIdentity() {
    const name = h("input", { type: "text", maxlength: 60, value: ch.name, oninput: (e) => (ch.name = e.target.value), id: "f-name" });
    const player = h("input", { type: "text", maxlength: 60, value: ch.player, oninput: (e) => (ch.player = e.target.value), id: "f-player" });
    const grid = h("div", { cls: "aligngrid", role: "group", "aria-label": t("form.alignment") }, Object.entries(ALIGNMENTS).map(([k, n]) =>
      h("button", { type: "button", id: "f-al-" + k, "aria-pressed": ch.alignment === k ? "true" : "false", text: tr(n), onclick: () => { ch.alignment = k; draw(); } })));
    return [
      card(t("form.alignment"), [h("p", { cls: "hint", text: t("form.alignmentHint") }), grid]),
      card(t("form.identity"), [
        h("div", { cls: "row" }, [
          field(t("form.name"), name),
          h("button", { type: "button", cls: "btn ghost", id: "f-name-roll", text: t("form.nameRoll"), title: t("form.nameRollHint"),
            onclick: () => { ch.name = randomName(ch.speciesId, lang()); name.value = ch.name; } }),
        ]),
        h("div", { cls: "row" }, [field(t("form.player"), player)]),
      ]),
    ];
  }

  // --- Step 5: details --------------------------------------------------------
  function stepDetails(c) {
    const bg = BACKGROUNDS[ch.background];
    const out = [skillsUI(c, bg), featsUI(c, bg), ...c.toolSlots.filter((s) => s.step === 5).map((s) => toolSlotUI(c, s)), armorUI(c), spellsUI(c), hpUI(c),
      ...c.asiLevels.map((L) => card(t("lvl.asiTitle", { n: L }), [levelChoiceUI({ draft: ch, L, profSkills: c.skills.filter((s) => s.prof && !s.fromFeat).map((s) => s.id),
        onChange: (lc) => { ch.levelChoices = { ...ch.levelChoices, [L]: lc }; draw(); } })]))];
    const legacy = legacyUI(c);
    if (legacy) out.push(legacy);
    return out.filter(Boolean);
  }

  function skillsUI(c, bg) {
    const granted = c.granted;
    const chosen = ch.skills.filter((x) => !granted.includes(x));
    const fit = c.skillFit;
    const canAdd = (sid) => fitSkills([...chosen, sid], c.slots).ok;
    const classList = cls().skillChoices.from;
    const grid = h("div", { cls: "checks" }, SKILLS.map((s) => {
      const isGranted = granted.includes(s.id);
      const on = isGranted || chosen.includes(s.id);
      const blocked = !on && !canAdd(s.id);
      const tag = isGranted ? ((bg?.skills || []).includes(s.id) ? t("form.fromBg") : t("form.fromSub")) : null;
      return h("label", { cls: "check" + (classList.includes(s.id) && !on && !blocked ? " suggested" : "") + (isGranted ? " locked" : "") + (blocked ? " blocked" : "") }, [
        h("input", { type: "checkbox", id: "f-sk-" + s.id, checked: on, disabled: isGranted || blocked, onchange: (e) => {
          ch.skills = e.target.checked ? [...chosen, s.id] : chosen.filter((x) => x !== s.id);
          if (!e.target.checked) ch.expertise = ch.expertise.filter((x) => x !== s.id);
          draw();
        } }), `${s[lang()]} (${short(s.ab)})`, tag ? h("small", { text: tag }) : null]);
    }));
    const expCount = c.expertiseMax;
    const profSkills = SKILLS.filter((s) => granted.includes(s.id) || chosen.includes(s.id));
    const expert = expCount ? h("div", { cls: "stack" }, [
      h("h4", { text: t("form.expertise") }),
      h("p", { cls: "hint", text: t("form.expertiseHint", { n: expCount }) + " " + t("form.picked", { n: ch.expertise.length, max: expCount }) }),
      profSkills.length ? h("div", { cls: "checks" }, profSkills.map((s) => {
        const on = ch.expertise.includes(s.id);
        const blocked = !on && ch.expertise.length >= expCount;
        return h("label", { cls: "check" + (blocked ? " blocked" : "") }, [
          h("input", { type: "checkbox", id: "f-ex-" + s.id, checked: on, disabled: blocked, onchange: (e) => {
            ch.expertise = e.target.checked ? [...new Set([...ch.expertise, s.id])] : ch.expertise.filter((x) => x !== s.id); draw();
          } }), s[lang()]]);
      })) : h("p", { cls: "hint", text: t("form.expertiseFirst") }),
    ]) : null;
    const total = c.slots.reduce((n, x) => n + x.count, 0);
    return card(t("form.skills"), [
      h("p", { cls: "hint", text: t("form.skillsRules") }),
      budgetList(c.slots, fit, skillName, (sl) => (sl.id === "class" ? t("form.slotClass", { cls: tr(cls().name) }) : null)),
      h("p", { cls: "picked" + (chosen.length === total && fit.ok ? " done" : ""), text: t("form.picked", { n: chosen.length, max: total }) }),
      grid, expert,
    ], { id: "f-skills" });
  }

  function featsUI(c, bg) {
    const parts = [h("p", { cls: "hint", text: t("form.featsRule") })];
    if (bg?.feat) parts.push(h("p", { cls: "featline" }, [h("b", { text: tr(FEATS[bg.feat].name) }), " ", h("small", { cls: "lvtag", text: t("form.fromBg") })]));
    for (const sl of c.featSlots) {
      const cur = ch.featPicks[sl.id] || "";
      const taken = c.featInstances.filter((f) => f.source !== sl.id).map((f) => f.id);
      parts.push(field(tr(sl.label), h("select", { id: "f-feat-" + sl.id, onchange: (e) => {
        if (e.target.value) ch.featPicks[sl.id] = e.target.value; else delete ch.featPicks[sl.id]; draw();
      } }, [
        h("option", { value: "", text: t("form.featChoose") }),
        ...Object.entries(FEATS).filter(([, f]) => f.category === sl.category).map(([k, f]) => h("option", {
          value: k, text: tr(f.name), selected: k === cur, disabled: taken.includes(k) && !f.repeatable,
        })),
      ]), "wide"));
    }
    for (const f of c.feats) {
      const choice = ch.featChoices[f.id] || {};
      const box = [h("b", { text: tr(f.name) }), h("p", { cls: "small", text: tr(f.desc) })];
      if (f.spellAbility) {
        box.push(h("div", { cls: "row" }, [
          field(t("form.spellAbility"), h("select", { id: "f-fa-" + f.id, onchange: (e) => { ch.featChoices[f.id] = { ...choice, ability: e.target.value }; draw(); } }, [
            h("option", { value: "", text: "—" }), ...["int", "wis", "cha"].map((a) => h("option", { value: a, text: ABILITY_NAMES[a][lang()], selected: choice.ability === a })),
          ])),
        ]), field(t("form.featSpells"), h("textarea", { rows: 2, id: "f-fs-" + f.id, oninput: (e) => (ch.featChoices[f.id] = { ...(ch.featChoices[f.id] || {}), spells: e.target.value }) }, choice.spells || ""), "wide"),
        h("p", { cls: "hint", text: t("form.featSpellsHint") }));
      }
      if (f.skillsOrTools) box.push(h("p", { cls: "hint", text: t("form.skilledHint") }));
      if (f.spellAbility || f.skillsOrTools) parts.push(h("div", { cls: "featbox" }, box));
    }
    for (const f of c.featInstances.filter((x) => x.source === "legacy")) {
      parts.push(h("p", { cls: "warn" }, [t("form.legacyFeat", { name: tr(FEATS[f.id].name) }), " ",
        h("button", { type: "button", cls: "btn ghost", id: "f-rmfeat-" + f.id, text: t("form.remove"), onclick: () => { ch.legacyFeats = ch.legacyFeats.filter((x) => x !== f.id); draw(); } })]));
    }
    return card(t("form.feats"), parts, { id: "f-feats" });
  }

  /** Pick tools for one slot. Tools the character already has from elsewhere aren't offered again. */
  function toolSlotUI(c, sl, compact = false) {
    const others = new Set([...c.fixedTools, ...c.toolSlots.filter((x) => x.id !== sl.id).flatMap((x) => x.picked)]);
    const opts = sl.from.filter((x) => !others.has(x));
    const picked = sl.picked;
    const set = (list) => { ch.toolPicks = { ...ch.toolPicks, [sl.id]: list }; draw(); };
    const title = sl.id === "skilled" ? t("form.skilledTools") : t("form.toolsFor", { what: tr(sl.label) });
    let input;
    if (sl.count === 1) {
      input = field(t("form.tool"), h("select", { id: "f-tool-" + sl.id, onchange: (e) => set(e.target.value ? [e.target.value] : []) }, [
        h("option", { value: "", text: "—" }), ...opts.map((k) => h("option", { value: k, text: tr(TOOLS[k]), selected: picked.includes(k) })),
      ]), "wide");
    } else {
      input = h("div", { cls: "checks" }, opts.map((k) => {
        const on = picked.includes(k);
        const blocked = !on && picked.length >= sl.count;
        return h("label", { cls: "check" + (blocked ? " blocked" : "") }, [
          h("input", { type: "checkbox", id: "f-tool-" + sl.id + "-" + k, checked: on, disabled: blocked, onchange: (e) => set(e.target.checked ? [...picked, k] : picked.filter((x) => x !== k)) }),
          tr(TOOLS[k])]);
      }));
    }
    const hint = sl.id === "skilled" ? t("form.skilledToolsHint", { n: picked.length, max: sl.count }) : t("form.picked", { n: picked.length, max: sl.count });
    return compact ? h("div", { cls: "stack" }, [h("span", { cls: "lbl-sm", text: title }), input])
      : card(title, [h("p", { cls: "hint", text: hint }), input]);
  }

  function armorUI(c) {
    return card(t("form.armorTitle"), [
      h("p", { cls: "hint", text: t("form.training") + ": " + (c.training.length ? c.training.map((k) => t("armor." + k)).join(", ") : t("armor.none")) }),
      h("div", { cls: "row" }, [
        field(t("form.armor"), h("select", { id: "f-armor", onchange: (e) => { ch.armor = e.target.value; draw(); } },
          Object.entries(ARMOR).map(([k, a]) => h("option", { value: k, text: tr(a.name), selected: k === ch.armor })))),
        h("label", { cls: "check" }, [h("input", { type: "checkbox", id: "f-shield", checked: !!ch.shield, onchange: (e) => { ch.shield = e.target.checked; draw(); } }), t("form.shield")]),
      ]),
      h("p", { cls: "acline" }, ["AC: ", h("b", { text: c.ac.value }), " · " + tr(c.ac.note)]),
      ...(c.ac.warnings || []).map((w) => h("p", { cls: "warn", text: tr(w) })),
    ]);
  }

  function spellsUI(c) {
    const sc = c.spells;
    if (!sc) return null;
    return card(t("form.spellsTitle"), [
      h("p", { cls: "hint", text: t("form.spellsHint", { list: tr(sc.list), cantrips: sc.cantrips, prepared: sc.prepared }) }),
      sc.always.length ? h("p", { cls: "hint" }, [h("b", { text: t("form.alwaysPrepared") + ": " }), sc.always.join(", ")]) : null,
      field(t("form.cantrips", { n: sc.cantrips }), h("textarea", { rows: 2, id: "f-cantrips", oninput: (e) => (ch.spells = { ...ch.spells, cantrips: e.target.value }) }, ch.spells?.cantrips || ""), "wide"),
      field(t("form.prepared", { n: sc.prepared }), h("textarea", { rows: 3, id: "f-prepared", oninput: (e) => (ch.spells = { ...ch.spells, prepared: e.target.value }) }, ch.spells?.prepared || ""), "wide"),
    ]);
  }

  function hpUI(c) {
    const die = cls().hitDie, fixed = fixedHp(die);
    const rows = [];
    for (let l = 2; l <= ch.level; l++) {
      const val = ch.hpRolls[l];
      rows.push(h("div", { cls: "hprow" }, [
        h("span", { cls: "hplv", text: t("form.hpLevel", { n: l }) }),
        h("select", { id: "f-hp-" + l, "aria-label": t("form.hpLevel", { n: l }), onchange: (e) => { if (e.target.value === "") delete ch.hpRolls[l]; else ch.hpRolls[l] = +e.target.value; draw(); } }, [
          h("option", { value: "", text: t("form.hpFixed", { n: fixed }), selected: val == null }),
          ...Array.from({ length: die }, (_, i) => h("option", { value: i + 1, text: `${t("form.die")}${die}: ${i + 1}`, selected: val === i + 1 })),
        ]),
        h("button", { type: "button", cls: "btn ghost", text: t("form.hpRollOne", { d: die }), onclick: () => { ch.hpRolls[l] = rollDie(die); draw(); } }),
      ]));
    }
    return card(t("form.hpTitle"), [
      h("p", { cls: "hint", text: t("form.hpRule", { d: die, n: fixed }) }),
      h("div", { cls: "hprow first" }, [h("span", { cls: "hplv", text: t("form.hpLevel", { n: 1 }) }), h("span", { text: t("form.hpFirst", { d: die }) })]),
      ...rows,
      ch.level > 1 ? h("div", { cls: "row" }, [
        h("button", { type: "button", cls: "btn", id: "f-hp-rollall", text: t("form.hpRollAll", { d: die }), onclick: () => { for (let l = 2; l <= ch.level; l++) ch.hpRolls[l] = rollDie(die); draw(); } }),
        h("button", { type: "button", cls: "btn ghost", text: t("form.hpAllFixed"), onclick: () => { ch.hpRolls = {}; draw(); } }),
      ]) : null,
      h("p", { cls: "hptotal" }, [t("form.hpTotal") + ": ", h("b", { id: "f-hptotal", text: c.hpMax })]),
    ]);
  }

  /** Values typed by hand before 0.4. They still count until removed. */
  function legacyUI() {
    const rows = [];
    const item = (label, value, onRemove, idk) => rows.push(h("div", { cls: "legacy" }, [
      h("span", {}, [h("b", { text: label + ": " }), value]),
      h("button", { type: "button", cls: "btn ghost", id: "f-rm-" + idk, text: t("form.remove"), onclick: () => { onRemove(); draw(); } }),
    ]));
    if (ch.acOverride) item(t("legacy.ac"), String(ch.acOverride), () => (ch.acOverride = null), "ac");
    if (ch.hp?.maxOverride) item(t("legacy.hp"), String(ch.hp.maxOverride), () => (ch.hp.maxOverride = null), "hp");
    if (ch.featsOther?.trim()) item(t("legacy.featsOther"), ch.featsOther, () => (ch.featsOther = ""), "featsother");
    if (ch.tools?.trim()) item(t("legacy.tools"), ch.tools, () => (ch.tools = ""), "tools");
    return rows.length ? card(t("legacy.title"), [h("p", { cls: "hint", text: t("legacy.hint") }), ...rows]) : null;
  }

  /** "Class: Monk 1/2" style list of where choices come from. */
  function budgetList(slots, fit, nameOf, labelOf = () => null) {
    return h("ul", { cls: "budget" }, slots.map((sl, i) => h("li", { cls: fit.ok && fit.used[i] === sl.count ? "full" : "" }, [
      h("span", { text: labelOf(sl) || tr(sl.label) }),
      h("b", { text: fit.ok ? `${fit.used[i]}/${sl.count}` : `?/${sl.count}` }),
      h("small", { text: sl.from ? (sl.from.length > 12 ? t("form.slotMany", { n: sl.from.length }) : sl.from.map(nameOf).join(", ")) : t("form.slotAny") }),
    ])));
  }

  function save() {
    const c = compute(structuredClone(ch));
    if (!ch.name.trim()) { toast(t("form.nameRequired")); goStep(4); root.querySelector("#f-name")?.focus(); return; }
    const err = c.review.errors[0];
    if (err) { toast(msg(err)); goStep(err.step); return; }
    ch.name = ch.name.trim(); ch.player = (ch.player || "").trim();
    ch.size = c.size;
    ch.abilities = finalAbilities(ch);
    ch.schema = 3;
    const before = stored ? compute(structuredClone(stored)).hpMax : null;
    const after = c.hpMax;
    if (ch.hp.cur != null && before != null) ch.hp.cur = Math.max(0, Math.min(after, ch.hp.cur + (after - before)));
    if (!upsert(ch)) { toast(t("app.saveError")); return; }
    go(`#/c/${ch.id}/start`);
  }

  /** Put the highest values where the class's recommended array puts its highest scores. */
  function assignByClass(values) {
    const order = [...ABILITIES].sort((a, b) => cls().standardArray[b] - cls().standardArray[a]);
    const sorted = [...values].sort((x, y) => y - x);
    ch.abilityBase = Object.fromEntries(order.map((a, i) => [a, sorted[i]]));
  }

  draw();
}
