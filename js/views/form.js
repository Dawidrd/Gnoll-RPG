// Character creator in the five steps of chapter 2 of the 2024 Player's Handbook:
// 1 Class → 2 Origin → 3 Ability scores → 4 Alignment and identity → 5 Details.
// The form redraws from `ch` after each structural change; text fields write straight into `ch`.
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { getById, upsert } from "../store.js";
import {
  CLASSES, PLANNED_CLASSES, SPECIES, SPECIES_SPELLS, BACKGROUNDS, TOOLS, TOOL_GROUPS, ARMOR, LANGUAGES, ALIGNMENTS, SIZES, SETTINGS,
  blankCharacter, normalize, compute, finalAbilities, fixedHp,
} from "../rules/index.js";
import { ABILITIES, ABILITY_NAMES, SKILLS, FEATS, STANDARD_ARRAY, mod, signed, roll4d6, rollDie } from "../rules/core.js";
import { POINT_BUY, pointsSpent } from "../rules/identity.js";
import { backgroundBonus } from "../rules/backgrounds.js";
import { stepBlockers } from "../rules/checks.js";
import { fitSkills, trimSkills } from "../rules/skills.js";
import { randomName } from "../rules/names.js";
import { CATALYSTS } from "../rules/feats-ravenloft.js";
import { SPELLS } from "../rules/spells.js";
import { writePick, readPick } from "../rules/magic.js";
import { spellPickUI } from "./spellpicker.js";
import { classOptionUI } from "./classoptions.js";
import { weaponEditor } from "./weapons.js";
import { CATALOG, SHOP_SECTIONS, TRINKETS, priceText, wearStart, applyStartGear } from "../rules/equipment.js";
import { WEAPONS } from "../rules/weapons.js";

const STEPS = [1, 2, 3, 4, 5];
// Where to scroll when "Next" is blocked by a checks item (anything else: the step's checklist).
const FIELD_OF = {
  "todo.subclass": "#f-subclass", "todo.legacySubclass": "#f-subclass",
  "todo.background": "#f-bg", "todo.legacyBackground": "#f-bg",
  "todo.legacySpecies": "#f-species", "todo.size": "#f-species", "todo.speciesChoice": "select[id^='f-sp-']",
  "todo.languages": "#f-languages", "err.languages": "#f-languages",
  "todo.roll": "#f-rollall", "todo.pointbuy": "#f-pb-left", "err.pointbuy": "#f-pb-left",
  "todo.increase": "#f-inc-p2", "err.increase": "#f-inc-p2",
  "todo.alignment": ".aligngrid", "todo.name": "#f-name",
  "todo.skills": "#f-skills", "err.skills": "#f-skills", "todo.expertise": "#f-skills", "err.expertise": "#f-skills", "err.expertiseFrom": "#f-skills",
  "todo.feat": "#f-feats", "todo.featAbility": "#f-feats", "todo.featExpertisePick": "#f-feats", "todo.catalyst": "#f-feats",
  "todo.startClass": "#f-start", "todo.startBg": "#f-start", "err.startGold": "#f-start-coins",
  "todo.spellPick": "#f-spells", "err.spellInvalid": "#f-spells", "err.spellTooMany": "#f-spells",
};

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
  // Ravenloft content is offered only in a Ravenloft game; a current pick stays visible so its error can be read.
  const offered = (x, current) => x.source !== "ravenloft" || ch.setting === "ravenloft" || current;
  const card = (title, kids, extra = {}) => h("section", { cls: "card stack", ...extra }, [title ? h("h4", { text: title }) : null, ...kids]);

  // After a change, drop picks that no longer fit their sources (and tell the player).
  // Items a character was opened with stay until the player fixes them.
  let lastSig = null;
  function tidy() {
    const c = compute(structuredClone(ch));
    const sig = JSON.stringify([c.slots.map((x) => [x.id, x.count, x.from]), c.granted, c.expertiseMax, c.languages.slots.map((x) => [x.id, x.count]),
      c.toolSlots.map((x) => [x.id, x.count, x.from.length]), c.featSlots.map((x) => x.id), ch.background, ch.speciesId,
      c.spellSources.flatMap((s) => s.picks.map((p) => [p.id, p.count, p.options.length])), c.classOptions.map((g) => [g.key, g.count])]);
    const changed = lastSig !== null && sig !== lastSig;
    lastSig = sig;
    if (!changed) return;
    const dropped = [];
    const chosen = ch.skills.filter((x) => !c.granted.includes(x));
    const kept = trimSkills(chosen, c.slots);
    chosen.filter((x) => !kept.includes(x)).forEach((x) => dropped.push(skillName(x)));
    ch.skills = kept;
    const prof = new Set([...c.granted, ...kept]);
    ch.expertise = ch.expertise.filter((x) => prof.has(x) && (!c.expertiseFrom || c.expertiseFrom.includes(x))).slice(0, c.expertiseMax);
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
    ch.legacyFeats = (ch.legacyFeats || []).filter((x) => x !== c.bgFeatId && !Object.values(ch.featPicks).includes(x));
    if (!SPECIES[ch.speciesId].sizes.includes(ch.size)) ch.size = "";
    // Spells that no longer fit (other class, fewer prepared spells after lowering the level) are dropped.
    for (const src of c.spellSources) for (const p of src.picks) {
      if (p.store === "level") continue;
      const keep = readPick(ch, p).filter((id) => p.options.includes(id)).slice(0, p.count);
      readPick(ch, p).filter((id) => !keep.includes(id)).forEach((id) => dropped.push(tr(SPELLS[id]?.name || { pl: id, en: id }).split(" (")[0]));
      writePick(ch, p, keep);
    }
    for (const g of c.classOptions) if (g.chosen.length > g.count) {
      g.chosen.slice(g.count).forEach((x) => dropped.push(x.option ? tr(x.option.name).split(" (")[0] : x.raw));
      ch.classOptions = { ...ch.classOptions, [g.key]: g.chosen.slice(0, g.count).map((x) => x.raw) };
    }
    for (const k of Object.keys(ch.classOptions || {})) if (!c.classOptions.some((g) => g.key === k)) delete ch.classOptions[k];
    if (!c.spells && ch.spellPicks && Object.values(ch.spellPicks).some((x) => x.length)) {
      Object.values(ch.spellPicks).flat().forEach((id) => dropped.push(tr(SPELLS[id]?.name || { pl: id, en: id }).split(" (")[0]));
      ch.spellPicks = {};
    }
    if (dropped.length) toast(t("form.dropped", { list: dropped.join(", ") }));
  }

  function draw() {
    tidy();
    const scroll = scrollY;
    root.replaceChildren(build());
    scrollTo(0, scroll);
  }
  // The stepper is sticky, so scrolling it into view does nothing: a new step always opens at the top of the page.
  const goStep = (n) => { step = n; tidy(); root.replaceChildren(build()); scrollTo(0, 0); };
  // "Next" moves on only when the current step is complete; otherwise it says what's missing and shows where.
  const goNext = () => {
    const first = stepBlockers(compute(structuredClone(ch)).review, step)[0];
    if (!first) return goStep(step + 1);
    toast(t("form.nextBlocked", { what: msg(first) }));
    const el = root.querySelector(FIELD_OF[first.key] || ".checkcard") || root.querySelector(".checkcard");
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    if (el.matches("input, select")) el.focus({ preventScroll: true });
    const box = el.closest(".card");
    if (box) { box.classList.remove("flash"); void box.offsetWidth; box.classList.add("flash"); }
  };

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
      step < 5 ? h("button", { type: "button", cls: "btn", id: "f-next", text: t("form.next") + " →", onclick: goNext }) : null,
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
      ch.classId = e.target.value; ch.subclass = ""; ch.classChoices = {}; ch.expertise = []; ch.levelChoices = {}; ch.classOptions = {}; ch.spellPicks = {};
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
      ...Object.entries(cls().subclasses || {}).filter(([k, s]) => offered(s, k === ch.subclass))
        .map(([k, s]) => h("option", { value: k, text: tr(s.name) + (s.source === "ravenloft" ? " · Ravenloft" : ""), selected: k === ch.subclass })),
      ch.subclass === "custom" ? h("option", { value: "custom", text: `${ch.subclassCustom || "?"} (${t("form.oldVersion")})`, selected: true, disabled: true }) : null,
    ]);
    // Choices tied to a subclass (Circle of the Land: the land) show up only once that subclass is taken.
    const choiceFields = Object.entries(cls().choices || {}).filter(([, d]) => !d.subclass || (ch.subclass === d.subclass && ch.level >= cls().subclassLevel)).map(([k, d]) => {
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
      delete ch.featPicks.bg;
      draw();
    } }, [
      h("option", { value: "", text: t("form.bgNone") }),
      ...Object.entries(BACKGROUNDS).filter(([k, b]) => !b.legacy && offered(b, k === ch.background))
        .map(([k, b]) => h("option", { value: k, text: tr(b.name) + (b.source === "ravenloft" ? " · Ravenloft" : ""), selected: k === ch.background })),
      bg?.legacy ? h("option", { value: ch.background, text: tr(bg.name), selected: true, disabled: true }) : null,
    ]);
    const bgParts = [field(t("form.background"), bgSel, "wide")];
    if (bg && !bg.legacy) bgParts.push(h("p", { cls: "bgsum" }, [
      h("span", {}, [h("b", { text: t("form.bgAbilities") + ": " }), bg.abilities.map(short).join(", "), " ", h("small", { text: t("form.bgAbilitiesNote") })]),
      h("span", {}, [h("b", { text: t("form.bgFeat") + ": " }), bg.feat ? tr(FEATS[bg.feat].name) : [...(bg.featOptions || []).map((x) => tr(FEATS[x].name)), bg.darkGift ? t("form.darkGiftAny") : null].filter(Boolean).join(t("form.or"))]),
      h("span", {}, [h("b", { text: t("form.bgSkills") + ": " }), bg.skills.map(skillName).join(", ")]),
      h("span", {}, [h("b", { text: t("form.bgTool") + ": " }), TOOL_GROUPS[bg.tool] ? t("form.oneKindOf", { group: tr(TOOL_GROUPS[bg.tool].name) }) : tr(TOOLS[bg.tool])]),
    ]));
    const bgSlot = c.featSlots.find((x) => x.id === "bg");
    if (bgSlot && !bgSlot.fixed) bgParts.push(featSlotSelect(c, bgSlot));
    const bgTools = c.toolSlots.filter((s) => s.id === "bg").map((s) => toolSlotUI(c, s, true));

    const sp = SPECIES[ch.speciesId];
    const spSel = h("select", { id: "f-species", onchange: (e) => { ch.speciesId = e.target.value; ch.size = ""; ch.speciesChoice = {}; draw(); } }, [
      ...Object.entries(SPECIES).filter(([k, s]) => !s.legacy && offered(s, k === ch.speciesId))
        .map(([k, s]) => h("option", { value: k, text: tr(s.name) + (s.source === "ravenloft" ? " · Ravenloft" : ""), selected: k === ch.speciesId })),
      sp.legacy ? h("option", { value: ch.speciesId, text: `${ch.customSpecies?.name || "?"} (${t("form.oldVersion")})`, selected: true, disabled: true }) : null,
    ]);
    const spParts = [h("div", { cls: "row" }, [field(t("form.species"), spSel)])];
    // Lineage / legacy / ancestry and the spellcasting ability for species spells: no defaults, the player picks.
    for (const x of sp.choices || []) {
      const cur = ch.speciesChoice?.[x.key] || "";
      spParts.push(h("div", { cls: "row" }, [field(tr(x.label), h("select", { id: "f-sp-" + x.key, onchange: (e) => { ch.speciesChoice = { ...ch.speciesChoice, [x.key]: e.target.value }; draw(); } }, [
        h("option", { value: "", text: "—" }),
        ...Object.entries(x.options).map(([k, o]) => h("option", { value: k, text: tr(o), selected: k === cur })),
      ]))]));
      const o = x.options[cur];
      if (o?.text) spParts.push(h("p", { cls: "hint", text: tr(typeof o.text === "function" ? o.text(c) : o.text) }));
    }
    spParts.push(h("div", { cls: "stack" }, [h("span", { cls: "lbl-sm", text: t("form.size") }),
      sp.sizes.length > 1
        ? seg(sp.sizes.map((k) => [k, tr(SIZES[k])]), c.size, (k) => { ch.size = k; draw(); })
        : h("p", { text: tr(SIZES[sp.sizes[0]]) })]));
    spParts.push(h("p", { cls: "hint", text: t("form.speciesFacts", { speed: c.speciesSpeed, dark: c.darkvision ? c.darkvision + " ft" : t("sum.none") }) + " " +
      t("form.speciesTraits", { list: (sp.features || []).filter((f) => !f.only || Object.entries(f.only).every(([k, v]) => ch.speciesChoice?.[k] === v)).map((f) => tr(f.name).split(" (")[0] + (f.lv > 1 ? ` (${t("lvl.tag", { n: f.lv })})` : "")).join(", ") }) }));
    const spList = sp.spells ? sp.spells({ choice: ch.speciesChoice || {} }) : [];
    if (spList.length) spParts.push(h("p", { cls: "hint", text: t("form.speciesSpells", { list: spList.map((x) => tr(SPECIES_SPELLS[x.id].name).split(" (")[0] + ` (${t("lvl.tag", { n: x.at })})`).join(", ") }) }));

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
    const out = [skillsUI(c, bg), ...c.classOptions.map((g) => card(null, [classOptionUI({ group: g, c, known: c.knownClassCantrips,
      onChange: (raws) => { ch.classOptions = { ...(ch.classOptions || {}), [g.key]: raws }; draw(); } })])), featsUI(c, bg),
      ...c.toolSlots.filter((s) => s.step === 5).map((s) => toolSlotUI(c, s)), startGearUI(c), armorUI(c), spellsUI(c), hpUI(c),
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
    const classList = cls().skillChoices.from || [];
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
    const profSkills = SKILLS.filter((s) => (granted.includes(s.id) || chosen.includes(s.id)) && (!c.expertiseFrom || c.expertiseFrom.includes(s.id)));
    const expert = expCount ? h("div", { cls: "stack" }, [
      h("h4", { text: t("form.expertise") }),
      h("p", { cls: "hint", text: t("form.expertiseHint", { n: expCount }) + (c.expertiseFrom ? " " + t("form.expertiseFrom", { list: c.expertiseFrom.map(skillName).join(", ") }) : "") + " " + t("form.picked", { n: ch.expertise.length, max: expCount }) }),
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

  /** One feat slot: Origin feats (or the background's options), plus Dark Gifts in a Ravenloft game. */
  function featSlotSelect(c, sl) {
    const cur = (ch.featPicks || {})[sl.id] || "";
    const taken = c.featInstances.filter((f) => f.source !== sl.id).map((f) => f.id);
    const ravenloft = ch.setting === "ravenloft";
    const opt = (k, f, suffix = "") => h("option", { value: k, text: tr(f.name) + suffix + (k === sl.recommended ? ` (${t("form.recommended")})` : ""),
      selected: k === cur, disabled: taken.includes(k) && !f.repeatable });
    const base = Object.entries(FEATS).filter(([k, f]) => (sl.options ? sl.options.includes(k) : f.category === sl.category) && (f.source !== "ravenloft" || ravenloft));
    const gifts = sl.darkGift ? Object.entries(FEATS).filter(([, f]) => f.category === "dark-gift") : [];
    const first = sl.default ? h("option", { value: "", text: `${tr(FEATS[sl.default].name)} (${t("form.fromBg")})` }) : h("option", { value: "", text: t(sl.options && !sl.options.length ? "form.darkGiftChoose" : "form.featChoose") });
    const sel = h("select", { id: "f-feat-" + sl.id, onchange: (e) => { if (e.target.value) ch.featPicks[sl.id] = e.target.value; else delete ch.featPicks[sl.id]; draw(); } }, [
      first,
      ...base.filter(([k]) => k !== sl.default).map(([k, f]) => opt(k, f)),
      gifts.length ? h("optgroup", { label: t("form.darkGifts") }, gifts.map(([k, f]) => opt(k, f))) : null,
      cur && !FEATS[cur] ? h("option", { value: cur, text: cur, selected: true, disabled: true }) : null,
    ]);
    const kids = [field(sl.id === "bg" ? t("form.bgFeatPick") : tr(sl.label), sel, "wide")];
    if (sl.darkGift) kids.push(h("p", { cls: "hint", text: t(sl.default ? "form.darkGiftSwap" : "form.darkGiftHint") }));
    const pick = FEATS[sl.pick];
    if (pick && sl.id === "bg") kids.push(h("p", { cls: "small", text: tr(pick.desc) }));
    const flaw = c.flaws.find((x) => x.id === sl.pick);
    if (flaw && sl.id === "bg") kids.push(h("p", { cls: "warn small" }, [h("b", { text: t("form.flaw") + ": " }), tr(flaw.text)]));
    return h("div", { cls: "stack" }, kids);
  }

  function featsUI(c, bg) {
    const parts = [h("p", { cls: "hint", text: t("form.featsRule") })];
    if (c.bgFeatId) parts.push(h("p", { cls: "featline" }, [h("b", { text: tr(FEATS[c.bgFeatId].name) }), " ", h("small", { cls: "lvtag", text: t("form.fromBg") })]));
    for (const sl of c.featSlots.filter((x) => x.id !== "bg")) parts.push(featSlotSelect(c, sl));
    for (const f of c.feats) {
      const choice = ch.featChoices[f.id] || {};
      const box = [h("b", { text: tr(f.name) }), h("p", { cls: "small", text: tr(f.desc) })];
      if (f.spellAbility) {
        box.push(h("div", { cls: "row" }, [field(t("form.spellAbility"), h("select", { id: "f-fa-" + f.id, onchange: (e) => { ch.featChoices[f.id] = { ...choice, ability: e.target.value }; draw(); } }, [
          h("option", { value: "", text: "—" }), ...["int", "wis", "cha"].map((a) => h("option", { value: a, text: ABILITY_NAMES[a][lang()], selected: choice.ability === a })),
        ]))]));
      }
      // Magic Initiate: cantrips and a level 1 spell picked from its list
      const src = !f.atLevel && c.spellSources.find((x) => x.id === "feat-" + f.id);
      for (const p of src ? src.picks : []) box.push(spellPickUI({ pick: p, c, onChange: (ids) => { writePick(ch, p, ids); draw(); } }));
      if (typeof choice.spells === "string" && choice.spells.trim()) box.push(legacySpellText(choice.spells, () => { delete ch.featChoices[f.id].spells; draw(); }));
      if (f.skillsOrTools) box.push(h("p", { cls: "hint", text: t("form.skilledHint") }));
      if (f.skillSlot) box.push(h("p", { cls: "hint", text: t("form.featSkillsHint", { n: f.skillSlot.count }) }));
      if (f.language) box.push(h("p", { cls: "hint", text: t("form.featLanguageHint", { n: f.language }) }));
      if (f.expertisePick) {
        const prof = c.skills.filter((x) => x.prof).map((x) => x.id);
        box.push(field(t("form.featExpertise"), h("select", { id: "f-fx-" + f.id, onchange: (e) => { ch.featChoices[f.id] = { ...choice, expertise: e.target.value }; draw(); } }, [
          h("option", { value: "", text: "—" }), ...SKILLS.filter((x) => prof.includes(x.id)).map((x) => h("option", { value: x.id, text: x[lang()], selected: choice.expertise === x.id })),
        ]), "wide"), h("p", { cls: "hint", text: t("form.featExpertiseHint") }));
      }
      if (f.catalyst) {
        box.push(choice.catalyst
          ? h("p", { cls: "rollres", id: "f-catalyst" }, [t("form.catalyst") + ": ", h("b", { text: `${choice.catalyst} — ${tr(CATALYSTS[choice.catalyst])}` })])
          : h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "f-catalyst-roll", text: t("form.catalystRoll"), onclick: () => { ch.featChoices[f.id] = { ...choice, catalyst: rollDie(6) }; draw(); } }),
            h("span", { cls: "hint", text: t("form.catalystHint") })]));
      }
      const flaw = c.flaws.find((x) => x.id === f.id);
      if (flaw) box.push(h("p", { cls: "warn small" }, [h("b", { text: t("form.flaw") + ": " }), tr(flaw.text)]));
      if (!f.atLevel && (f.spellAbility || f.skillsOrTools || f.darkGift || f.skillSlot || f.expertisePick || f.spellPicks)) parts.push(h("div", { cls: "featbox" }, box));
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

  /** Starting equipment: the class's and the background's option, purchases from the price list, a trinket. */
  function startGearUI(c) {
    const p = c.startGear;
    const sg = ch.startGear;
    if (sg.applied) return card(t("form.startTitle"), [h("p", { cls: "hint", text: t("form.startDone") })], { id: "f-start" });
    // Change the picks, then keep worn armor and the attack list in step (a skipped kit wears nothing).
    const worn = (x) => (x.sg.skip ? { weapons: [], armor: null, shield: false } : x);
    const change = (fn) => {
      const before = worn(compute(structuredClone(ch)).startGear);
      fn(ch.startGear);
      wearStart(ch, before, worn(compute(structuredClone(ch)).startGear));
      draw();
    };
    const skip = h("label", { cls: "check" }, [h("input", { type: "checkbox", id: "f-start-skip", checked: !!sg.skip,
      onchange: (e) => change((g) => { g.skip = e.target.checked; }) }), t("form.startSkip")]);
    if (sg.skip) return card(t("form.startTitle"), [skip], { id: "f-start" });

    const short = (x) => tr(x).split(" (")[0];
    const line = (e) => (e.qty > 1 ? `${e.qty}× ` : "") + tr(e.name) + (e.note ? ` — ${tr(e.note)}` : "");
    // One kit line as the player sees it: a tool from a proficiency shows the tool picked, or that it's still to pick.
    const entry = ([key, qty = 1, note = null]) => {
      if (key.startsWith("tool:")) {
        const id = c.toolSlots.find((s) => s.id === key.slice(5))?.picked[0];
        return { qty, note, name: id ? TOOLS[id] : { pl: t("form.startToolPick"), en: t("form.startToolPick") } };
      }
      if (key.startsWith("any:")) return { qty, note: { pl: "dowolny", en: "any" }, name: TOOL_GROUPS[key.slice(4)].name };
      return { qty, note, name: CATALOG[key].name };
    };
    const options = (kits, cur, field) => h("div", { cls: "kitopts", role: "group" }, Object.entries(kits).map(([k, o]) =>
      h("button", { type: "button", cls: "kitopt", id: `f-start-${field}-${k}`, "aria-pressed": k === cur ? "true" : "false",
        onclick: () => change((g) => { g[field] = k; }) }, [
        h("b", { text: o.items.length ? t("form.startKit", { k }) : t("form.startGoldOnly", { k }) }),
        h("span", { text: [...o.items.map((x) => line(entry(x))), `${o.gp} GP`].join(", ") }),
      ])));

    const parts = [skip, h("p", { cls: "hint", text: t("form.startHint") })];
    parts.push(h("h4", { text: t("form.startFromClass", { cls: short(cls().name) }) }), options(p.clsKits, sg.cls, "cls"));
    if (p.bgKits) parts.push(h("h4", { text: t("form.startFromBg", { bg: short(BACKGROUNDS[ch.background].name) }) }), options(p.bgKits, sg.bg, "bg"));
    else parts.push(h("p", { cls: "hint", text: t("form.startNoBg") }));
    if (p.pendingTools) parts.push(h("p", { cls: "warn soft", text: t("form.startPending") }));
    // PHB: from level 5 the GM may add gold on top of the normal equipment.
    if (ch.level >= 5) parts.push(h("p", { cls: "hint", text: t("form.startBonus", { n: ch.level }) }), h("div", { cls: "row" }, [
      sg.bonusGp ? h("span", { cls: "rollres", text: t("form.startBonusGot", { n: sg.bonusGp }) }) : null,
      h("button", { type: "button", cls: "btn ghost", id: "f-start-bonus", text: t(sg.bonusGp ? "form.startBonusClear" : "form.startBonusRoll"),
        onclick: () => change((g) => { g.bonusGp = g.bonusGp ? 0 : 500 + rollDie(10) * 25; }) })]));

    // Shopping with the coins from the kits.
    const sel = h("select", { id: "f-shop-sel", "aria-label": t("form.shopPick") }, [h("option", { value: "", text: t("form.shopPick") }),
      ...SHOP_SECTIONS.map((sec) => h("optgroup", { label: t("shop." + sec) }, Object.values(CATALOG).filter((x) => x.cat === sec)
        .map((x) => h("option", { value: x.key, text: `${tr(x.name)}${x.bundle > 1 ? ` ×${x.bundle}` : ""} — ${priceText(x.cost)}` }))))]);
    const qty = h("input", { type: "number", min: 1, value: 1, id: "f-shop-qty", "aria-label": t("inv.qty") });
    const bought = sg.buys.map((b, i) => CATALOG[b.key] ? h("div", { cls: "li" }, [
      h("div", {}, [h("div", { cls: "t", text: `${b.qty}× ${tr(CATALOG[b.key].name)}` }), h("div", { cls: "n", text: priceText(CATALOG[b.key].cost * b.qty) })]),
      h("button", { type: "button", cls: "btn small ghost", id: "f-shop-rm-" + i, text: t("inv.remove"), onclick: () => change((g) => { g.buys = g.buys.filter((_, j) => j !== i); }) }),
    ]) : null).filter(Boolean);
    parts.push(
      h("p", { cls: "picked" + (p.left < 0 ? " bad" : p.budget ? " done" : ""), id: "f-start-coins",
        text: t("form.startCoins", { budget: priceText(p.budget), spent: priceText(p.spent), left: p.left < 0 ? "−" + priceText(-p.left) : priceText(p.left) }) }),
      h("details", { cls: "shop", open: sg.buys.length > 0 }, [h("summary", { text: t("form.shopTitle") }),
        h("p", { cls: "hint", text: t("form.shopHint") }),
        h("div", { cls: "row" }, [sel, qty, h("button", { type: "button", cls: "btn", id: "f-shop-buy", text: t("form.shopBuy"), onclick: () => {
          const key = sel.value, n = Math.max(1, parseInt(qty.value, 10) || 1);
          if (!key) return;
          change((g) => { const same = g.buys.find((b) => b.key === key); if (same) same.qty += n; else g.buys = [...g.buys, { key, qty: n }]; });
        } })]),
        bought.length ? h("div", { cls: "list" }, bought) : null]));

    // A free trinket: rolled, chosen from the list or written by the player.
    const own = typeof sg.trinket === "string" ? sg.trinket : "";
    parts.push(h("h4", { text: t("form.trinket") }), h("p", { cls: "hint", text: t("form.trinketHint") }),
      h("div", { cls: "row" }, [
        h("select", { id: "f-trinket", "aria-label": t("form.trinket"), onchange: (e) => change((g) => { g.trinket = e.target.value === "" ? null : +e.target.value; }) }, [
          h("option", { value: "", text: "—", selected: typeof sg.trinket !== "number" }),
          ...TRINKETS.map((x, i) => h("option", { value: i, text: `${i + 1}. ${tr(x)}`, selected: sg.trinket === i }))]),
        h("button", { type: "button", cls: "btn ghost", id: "f-trinket-roll", text: t("form.trinketRoll"), onclick: () => change((g) => { g.trinket = rollDie(TRINKETS.length) - 1; }) }),
      ]),
      field(t("form.trinketOwn"), h("input", { type: "text", maxlength: 120, id: "f-trinket-own", value: own,
        onchange: (e) => change((g) => { g.trinket = e.target.value.trim() || null; }) }), "wide"));

    // What goes on the sheet when the character is saved.
    const all = [
      p.armor ? tr(CATALOG["a:" + p.armor].name) : null, p.shield ? tr(CATALOG.shield.name) : null,
      ...p.weapons.map((w) => (w.qty > 1 ? `${w.qty}× ` : "") + tr(WEAPONS[w.id].name)),
      ...p.items.map(line),
    ].filter(Boolean);
    if (all.length) parts.push(h("details", { cls: "shop", id: "f-start-list" }, [h("summary", { text: t("form.startWill", { n: all.length }) }),
      h("p", { cls: "small", text: all.join(", ") }), h("p", { cls: "hint", text: t("form.startNote") })]));
    return card(t("form.startTitle"), parts, { id: "f-start" });
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
      h("h4", { text: t("wpn.title") }),
      weaponEditor({ ch, c, onChange: draw }),
    ]);
  }

  /** Class spells: cantrips and prepared spells from the class list; domain spells are always prepared on top. */
  function spellsUI(c) {
    const src = c.spellSources.find((x) => x.id === "class");
    if (!src) return null;
    const sc = c.spells;
    const always = src.fixed.filter((x) => x.kind === "always");
    const parts = [
      h("p", { cls: "hint", text: t("form.spellsHint2", { list: tr(sc.list), dc: src.dc, attack: (src.attack >= 0 ? "+" : "") + src.attack, slots: sc.slots.map((n, i) => `${n}× ${i + 1}`).join(", ") }) }),
      always.length ? h("p", { cls: "hint" }, [h("b", { text: t("form.alwaysPrepared") + ": " }), always.map((x) => tr(SPELLS[x.id].name).split(" (")[0]).join(", ")]) : null,
      ...src.fixed.filter((x) => x.fixedBy).map((x) => h("p", { cls: "hint" }, [h("b", { text: t("form.knownCantrip") + ": " }), tr(SPELLS[x.id].name)])),
      // Wizard: the book first, then prepared spells chosen from it
      sc.spellbook ? h("p", { cls: "hint", text: t("form.bookHint", { n: sc.spellbook, p: sc.prepared }) }) : null,
      ...src.picks.map((p) => spellPickUI({ pick: p, c, onChange: (ids) => { writePick(ch, p, ids); draw(); } })),
      // Pact of the Tome: cantrips and rituals from any list, in the Book of Shadows
      ...c.spellSources.filter((x) => x.id === "tome").flatMap((x) => [h("p", { cls: "hint", text: t("form.tomeHint") }),
        ...x.picks.map((p) => spellPickUI({ pick: p, c, onChange: (ids) => { writePick(ch, p, ids); draw(); } }))]),
      c.spells.changeRule === "level" ? h("p", { cls: "hint", text: t("form.changeOnLevel") }) : null,
    ];
    if ((ch.spells?.cantrips || "").trim() || (ch.spells?.prepared || "").trim())
      parts.push(legacySpellText([ch.spells.cantrips, ch.spells.prepared].filter(Boolean).join("\n"), () => { ch.spells = { cantrips: "", prepared: "" }; draw(); }));
    return card(t("form.spellsTitle"), parts, { id: "f-spells" });
  }

  /** Spells typed as text before 0.8: shown until the player clears them. */
  function legacySpellText(text, onClear) {
    return h("div", { cls: "warn" }, [h("p", { cls: "small", text: t("form.legacySpells") }), h("p", { cls: "pre", text }),
      h("button", { type: "button", cls: "btn ghost", text: t("form.legacySpellsClear"), onclick: onClear })]);
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
    applyStartGear(ch, c.startGear, lang());
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
