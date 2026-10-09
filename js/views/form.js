// Create or edit a character. The whole form redraws from `ch` on structural changes;
// text fields write straight into `ch`, so nothing typed is lost.
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { getById, upsert } from "../store.js";
import { CLASSES, PLANNED_CLASSES, SPECIES, BACKGROUNDS, TOOLS, ARMOR, blankCharacter, normalize, compute, finalAbilities, fixedHp } from "../rules/index.js";
import { ABILITIES, ABILITY_NAMES, SKILLS, FEATS, STANDARD_ARRAY, mod, signed, roll4d6, rollDie } from "../rules/core.js";
import { backgroundBonus } from "../rules/backgrounds.js";

export function renderForm(root, go, id) {
  const stored = id ? getById(id) : null;
  if (id && !stored) return go("#/");
  const ch = stored ? normalize(structuredClone(stored)) : blankCharacter();
  const isNew = !id;
  const short = (a) => ABILITY_NAMES[a].short[lang()];
  const field = (label, input, cls) => h("label", { cls }, [label, input]);
  const num = (val, min, max, oninput, extra = {}) => h("input", { type: "number", inputmode: "numeric", min, max, value: val ?? "", oninput, ...extra });
  const seg = (options, current, onpick) => h("div", { cls: "seg", role: "group" }, options.map(([k, label]) =>
    h("button", { type: "button", "aria-pressed": k === current ? "true" : "false", text: label, onclick: () => onpick(k) })));
  const cls = () => CLASSES[ch.classId];

  function draw() {
    const scroll = scrollY;
    root.replaceChildren(build());
    scrollTo(0, scroll);
  }

  function build() {
    const c = compute(structuredClone(ch));
    const bg = BACKGROUNDS[ch.background];

    // --- Basics --------------------------------------------------------------
    const name = h("input", { type: "text", maxlength: 60, value: ch.name, oninput: (e) => (ch.name = e.target.value), id: "f-name" });
    const player = h("input", { type: "text", maxlength: 60, value: ch.player, oninput: (e) => (ch.player = e.target.value), id: "f-player" });
    const clsSel = h("select", { id: "f-class", onchange: (e) => {
      ch.classId = e.target.value; ch.subclass = ""; ch.classChoices = {}; ch.expertise = [];
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
      draw();
    } }, Array.from({ length: cls().maxLevel }, (_, i) => h("option", { value: i + 1, text: i + 1, selected: i + 1 === ch.level })));
    const subSel = h("select", { id: "f-subclass", onchange: (e) => { ch.subclass = e.target.value; draw(); } }, [
      h("option", { value: "", text: t("form.subclassNone") }),
      ...Object.entries(cls().subclasses || {}).map(([k, s]) => h("option", { value: k, text: tr(s.name), selected: k === ch.subclass })),
      h("option", { value: "custom", text: t("form.subclassCustom"), selected: ch.subclass === "custom" }),
    ]);
    const subCustom = ch.subclass === "custom" ? field(t("form.subclassCustomName"), h("input", { type: "text", id: "f-subclass-custom", maxlength: 80, value: ch.subclassCustom || "", oninput: (e) => (ch.subclassCustom = e.target.value) }), "wide") : null;
    const choiceFields = Object.entries(cls().choices || {}).map(([k, d]) => {
      const cur = ch.classChoices[k] || d.default;
      return field(tr(d.label), h("select", { id: "f-choice-" + k, onchange: (e) => { ch.classChoices = { ...ch.classChoices, [k]: e.target.value }; draw(); } },
        Object.entries(d.options).map(([ok, o]) => h("option", { value: ok, text: tr(o), selected: ok === cur }))), "wide");
    });
    const basics = h("div", { cls: "card stack" }, [
      h("div", { cls: "row" }, [field(t("form.name"), name), field(t("form.player"), player)]),
      h("div", { cls: "row" }, [field(t("form.class"), clsSel), field(t("form.level"), levelSel)]),
      choiceFields.length ? h("div", { cls: "row" }, choiceFields) : null,
      h("div", { cls: "row" }, [field(t("form.subclass", { n: cls().subclassLevel }), subSel, "wide"), subCustom]),
      ch.level < cls().subclassLevel ? h("p", { cls: "hint", text: t("form.subclassHint", { n: cls().subclassLevel }) }) : null,
    ]);

    // --- Species -------------------------------------------------------------
    const sp = SPECIES[ch.speciesId];
    const spSel = h("select", { id: "f-species", onchange: (e) => { ch.speciesId = e.target.value; draw(); } },
      Object.entries(SPECIES).map(([k, s]) => h("option", { value: k, text: tr(s.name), selected: k === ch.speciesId })));
    const spExtra = [];
    if (sp.choice) {
      const cur = ch.speciesChoice?.[sp.choice.key] || sp.choice.default;
      ch.speciesChoice = { ...ch.speciesChoice, [sp.choice.key]: cur };
      spExtra.push(field(tr(sp.choice.label), h("select", { id: "f-ancestry", onchange: (e) => (ch.speciesChoice = { ...ch.speciesChoice, [sp.choice.key]: e.target.value }) },
        Object.entries(sp.choice.options).map(([k, o]) => h("option", { value: k, text: tr(o), selected: k === cur })))));
    }
    if (sp.custom) {
      const cs = (ch.customSpecies = ch.customSpecies || { name: "", speed: 30, darkvision: 0, notes: "" });
      spExtra.push(
        field(t("form.customName"), h("input", { type: "text", id: "f-csname", maxlength: 40, value: cs.name, oninput: (e) => (cs.name = e.target.value) })),
        field(t("form.customSpeed"), num(cs.speed, 0, 120, (e) => (cs.speed = +e.target.value || 30), { id: "f-csspeed" })),
        field(t("form.customDark"), num(cs.darkvision, 0, 300, (e) => (cs.darkvision = +e.target.value || 0), { id: "f-csdark" })),
        field(t("form.customNotes"), h("textarea", { rows: 3, id: "f-csnotes", oninput: (e) => (cs.notes = e.target.value) }, cs.notes), "wide"),
      );
    }
    const species = h("div", { cls: "card stack" }, [h("div", { cls: "row" }, [field(t("form.species"), spSel), ...spExtra])]);

    // --- Background ----------------------------------------------------------
    const bgSel = h("select", { id: "f-bg", onchange: (e) => {
      ch.background = e.target.value;
      const b = BACKGROUNDS[ch.background];
      ch.bgIncrease = { mode: "21", plus2: b && !b.custom ? b.abilities[0] : "", plus1: b && !b.custom ? b.abilities[1] : "", three: [] };
      if (b?.feat) ch.feats = ch.feats.filter((f) => f !== b.feat);
      if (b) ch.skills = ch.skills.filter((s) => !b.skills.includes(s));
      draw();
    } }, [
      h("option", { value: "", text: t("form.bgNone") }),
      ...Object.entries(BACKGROUNDS).map(([k, b]) => h("option", { value: k, text: tr(b.name), selected: k === ch.background })),
    ]);
    const bgParts = [h("div", { cls: "row" }, [field(t("form.background"), bgSel, "wide")])];
    if (bg) {
      if (!bg.custom) {
        bgParts.push(h("p", { cls: "bgsum" }, [
          h("span", {}, [h("b", { text: t("form.bgAbilities") + ": " }), bg.abilities.map(short).join(", ")]),
          h("span", {}, [h("b", { text: t("form.bgFeat") + ": " }), tr(FEATS[bg.feat].name)]),
          h("span", {}, [h("b", { text: t("form.bgSkills") + ": " }), bg.skills.map((s) => SKILLS.find((x) => x.id === s)[lang()]).join(", ")]),
          h("span", {}, [h("b", { text: t("form.bgTool") + ": " }), tr(TOOLS[bg.tool])]),
        ]));
      }
      const inc = ch.bgIncrease;
      const allowed = bg.abilities;
      const abSelect = (val, onch, idx) => h("select", { id: "f-inc-" + idx, onchange: (e) => { onch(e.target.value); draw(); } }, [
        h("option", { value: "", text: "—" }), ...allowed.map((a) => h("option", { value: a, text: short(a), selected: a === val })),
      ]);
      const incRow = inc.mode === "111"
        ? (bg.custom
          ? h("div", { cls: "row" }, [0, 1, 2].map((i) => field("+1", abSelect((inc.three || [])[i], (v) => { const th = [...(inc.three || [])]; th[i] = v; inc.three = th; }, "t" + i))))
          : h("p", { cls: "hint", text: t("form.inc111", { list: allowed.map(short).join(", ") }) }))
        : h("div", { cls: "row" }, [
          field("+2", abSelect(inc.plus2, (v) => { inc.plus2 = v; if (inc.plus1 === v) inc.plus1 = ""; }, "p2")),
          field("+1", abSelect(inc.plus1, (v) => { inc.plus1 = v; if (inc.plus2 === v) inc.plus2 = ""; }, "p1")),
        ]);
      bgParts.push(
        h("div", { cls: "stack" }, [h("span", { cls: "lbl-sm", text: t("form.increase") }),
          seg([["21", "+2 / +1"], ["111", "+1 / +1 / +1"]], inc.mode, (m) => { inc.mode = m; draw(); }), incRow]),
      );
    }
    bgParts.push(field(t("form.tools"), h("input", { type: "text", id: "f-tools", maxlength: 200, value: ch.tools, oninput: (e) => (ch.tools = e.target.value) }), "wide"));
    const background = h("div", { cls: "card stack" }, [h("h4", { text: t("form.backgroundTitle") }), ...bgParts]);

    // --- Abilities -----------------------------------------------------------
    const method = ch.abilityMethod;
    const bonus = ch.abilityMethod === "manual" && !ch.background ? {} : backgroundBonus(ch);
    const fin = finalAbilities(ch);
    const pool = method === "array" ? STANDARD_ARRAY : method === "roll" && ch.rolled ? ch.rolled.map((r) => r.total) : null;

    const setMethod = (m) => {
      ch.abilityMethod = m;
      if (m === "array") ch.abilityBase = { ...cls().standardArray };
      if (m === "roll" && ch.rolled) assignByClass(ch.rolled.map((r) => r.total));
      draw();
    };
    const rollAll = () => { ch.rolled = ABILITIES.map(() => roll4d6()); assignByClass(ch.rolled.map((r) => r.total)); draw(); };

    const baseCell = (a) => {
      if (method === "manual") return num(ch.abilityBase[a], 1, 30, (e) => { ch.abilityBase[a] = Math.max(1, Math.min(30, +e.target.value || 10)); refreshScores(); }, { id: "f-ab-" + a, "aria-label": short(a) });
      if (!pool) return h("span", { cls: "hint", text: "—" });
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
        h("span", { cls: "abfinal", "data-fin": a }, [h("b", { text: fin[a] }), " ", h("span", { cls: "abmod", text: signed(mod(fin[a])) })]),
      ])),
    ]);

    const abParts = [
      h("h4", { text: t("form.abilities") }),
      seg([["array", t("form.mArray")], ["roll", t("form.mRoll")], ["manual", t("form.mManual")]], method, setMethod),
      h("p", { cls: "hint", text: t("form.mHint." + method, { cls: tr(cls().name) }) }),
    ];
    if (method === "roll") {
      abParts.push(h("div", { cls: "row" }, [
        h("button", { type: "button", cls: "btn gold", id: "f-rollall", text: t(ch.rolled ? "form.reroll" : "form.rollAll"), onclick: rollAll }),
        ch.rolled ? h("span", { cls: "dice" }, ch.rolled.map((r) => h("span", { cls: "die", title: `${r.dice.join("+")} (−${r.dropped})` }, [h("b", { text: r.total }), h("small", { text: `${r.dice.join(" ")} ·${r.dropped}` })]))) : null,
      ]));
    }
    abParts.push(abRows);
    const abilities = h("div", { cls: "card stack" }, abParts);

    function refreshScores() {
      const f = finalAbilities(ch);
      abilities.querySelectorAll("[data-fin]").forEach((el) => {
        const a = el.dataset.fin; el.querySelector("b").textContent = f[a]; el.querySelector(".abmod").textContent = signed(mod(f[a]));
      });
      const hpOut = root.querySelector("#f-hptotal"); if (hpOut) hpOut.textContent = compute(structuredClone(ch)).hpMax;
    }

    // --- Skills --------------------------------------------------------------
    const choices = cls().skillChoices;
    const bgSkills = bg?.skills || [];
    const skillGrid = h("div", { cls: "checks" }, SKILLS.map((s) => {
      const fromBg = bgSkills.includes(s.id);
      const cb = h("input", { type: "checkbox", id: "f-sk-" + s.id, checked: fromBg || ch.skills.includes(s.id), disabled: fromBg,
        onchange: (e) => {
          ch.skills = e.target.checked ? [...new Set([...ch.skills, s.id])] : ch.skills.filter((x) => x !== s.id);
          if (!e.target.checked) ch.expertise = ch.expertise.filter((x) => x !== s.id);
          if (cls().expertise) draw();
        } });
      return h("label", { cls: "check" + (choices.from.includes(s.id) && !fromBg ? " suggested" : "") + (fromBg ? " locked" : "") },
        [cb, `${s[lang()]} (${short(s.ab)})`, fromBg ? h("small", { text: t("form.fromBg") }) : null]);
    }));
    const expCount = cls().expertise ? cls().expertise(ch.level) : 0;
    const profSkills = SKILLS.filter((s) => bgSkills.includes(s.id) || ch.skills.includes(s.id));
    const expertGrid = expCount ? h("div", { cls: "stack" }, [
      h("h4", { text: t("form.expertise") }),
      h("p", { cls: "hint", text: t("form.expertiseHint", { n: expCount }) }),
      profSkills.length ? h("div", { cls: "checks" }, profSkills.map((s) => h("label", { cls: "check" }, [
        h("input", { type: "checkbox", id: "f-ex-" + s.id, checked: ch.expertise.includes(s.id), onchange: (e) => {
          ch.expertise = e.target.checked ? [...new Set([...ch.expertise, s.id])] : ch.expertise.filter((x) => x !== s.id);
          if (ch.expertise.length > expCount) toast(t("form.expertiseTooMany", { n: expCount }));
        } }), s[lang()],
      ]))) : h("p", { cls: "hint", text: t("form.expertiseFirst") }),
    ]) : null;
    const skills = h("div", { cls: "card stack" }, [
      h("h4", { text: t("form.skills") }),
      h("p", { cls: "hint", text: t("form.skillsHint", { cls: tr(cls().name), n: choices.count }) + (cls().id === "barbarian" && ch.level >= 3 ? " " + t("form.primalHint") : "") }),
      skillGrid, expertGrid,
    ]);

    // --- Feats ---------------------------------------------------------------
    const featGrid = h("div", { cls: "checks" }, Object.entries(FEATS).map(([k, f]) => {
      const fromBg = bg?.feat === k;
      return h("label", { cls: "check" + (fromBg ? " locked" : "") }, [
        h("input", { type: "checkbox", id: "f-ft-" + k, checked: fromBg || ch.feats.includes(k), disabled: fromBg,
          onchange: (e) => { ch.feats = e.target.checked ? [...new Set([...ch.feats, k])] : ch.feats.filter((x) => x !== k); refreshScores(); } }),
        tr(f.name), fromBg ? h("small", { text: t("form.fromBg") }) : null,
      ]);
    }));
    const feats = h("div", { cls: "card stack" }, [
      h("h4", { text: t("form.feats") }), h("p", { cls: "hint", text: t("form.featsHint") }), featGrid,
      field(t("form.featsOther"), h("textarea", { rows: 2, id: "f-featsother", oninput: (e) => (ch.featsOther = e.target.value) }, ch.featsOther || ""), "wide"),
    ]);

    // --- Armor ---------------------------------------------------------------
    const armorCard = h("div", { cls: "card stack" }, [
      h("h4", { text: t("form.armorTitle") }),
      h("p", { cls: "hint", text: t("form.training") + ": " + (c.training.length ? c.training.map((k) => t("armor." + k)).join(", ") : t("armor.none")) }),
      h("div", { cls: "row" }, [
        field(t("form.armor"), h("select", { id: "f-armor", onchange: (e) => { ch.armor = e.target.value; draw(); } },
          Object.entries(ARMOR).map(([k, a]) => h("option", { value: k, text: tr(a.name), selected: k === ch.armor })))),
        h("label", { cls: "check" }, [h("input", { type: "checkbox", id: "f-shield", checked: !!ch.shield, onchange: (e) => { ch.shield = e.target.checked; draw(); } }), t("form.shield")]),
      ]),
      h("p", { cls: "acline" }, ["AC: ", h("b", { text: c.ac.value }), " · " + tr(c.ac.note)]),
      ...(c.ac.warnings || []).map((w) => h("p", { cls: "warn", text: tr(w) })),
      h("details", {}, [h("summary", { cls: "hint", text: t("form.acManualToggle") }),
        h("div", { cls: "row" }, [field(t("form.ac"), num(ch.acOverride, 1, 40, (e) => (ch.acOverride = e.target.value ? +e.target.value : null), { id: "f-ac" }))])]),
    ]);

    // --- Spells --------------------------------------------------------------
    const sc = c.spells;
    const spellsCard = sc ? h("div", { cls: "card stack" }, [
      h("h4", { text: t("form.spellsTitle") }),
      h("p", { cls: "hint", text: t("form.spellsHint", { list: tr(sc.list), cantrips: sc.cantrips, prepared: sc.prepared }) }),
      sc.always.length ? h("p", { cls: "hint" }, [h("b", { text: t("form.alwaysPrepared") + ": " }), sc.always.join(", ")]) : null,
      field(t("form.cantrips", { n: sc.cantrips }), h("textarea", { rows: 2, id: "f-cantrips", oninput: (e) => (ch.spells = { ...ch.spells, cantrips: e.target.value }) }, ch.spells?.cantrips || ""), "wide"),
      field(t("form.prepared", { n: sc.prepared }), h("textarea", { rows: 3, id: "f-prepared", oninput: (e) => (ch.spells = { ...ch.spells, prepared: e.target.value }) }, ch.spells?.prepared || ""), "wide"),
    ]) : null;

    // --- Hit points ----------------------------------------------------------
    const die = cls().hitDie, fixed = fixedHp(die);
    const hpRows = [];
    for (let l = 2; l <= ch.level; l++) {
      const val = ch.hpRolls[l];
      hpRows.push(h("div", { cls: "hprow" }, [
        h("span", { cls: "hplv", text: t("form.hpLevel", { n: l }) }),
        h("select", { id: "f-hp-" + l, "aria-label": t("form.hpLevel", { n: l }), onchange: (e) => { if (e.target.value === "") delete ch.hpRolls[l]; else ch.hpRolls[l] = +e.target.value; draw(); } }, [
          h("option", { value: "", text: t("form.hpFixed", { n: fixed }), selected: val == null }),
          ...Array.from({ length: die }, (_, i) => h("option", { value: i + 1, text: `k${die}: ${i + 1}`, selected: val === i + 1 })),
        ]),
        h("button", { type: "button", cls: "btn ghost", text: t("form.hpRollOne", { d: die }), onclick: () => { ch.hpRolls[l] = rollDie(die); draw(); } }),
      ]));
    }
    const hpCard = h("div", { cls: "card stack" }, [
      h("h4", { text: t("form.hpTitle") }),
      h("p", { cls: "hint", text: t("form.hpRule", { d: die, n: fixed }) }),
      h("div", { cls: "hprow first" }, [h("span", { cls: "hplv", text: t("form.hpLevel", { n: 1 }) }), h("span", { text: t("form.hpFirst", { d: die }) })]),
      ...hpRows,
      ch.level > 1 ? h("div", { cls: "row" }, [
        h("button", { type: "button", cls: "btn", id: "f-hp-rollall", text: t("form.hpRollAll", { d: die }), onclick: () => { for (let l = 2; l <= ch.level; l++) ch.hpRolls[l] = rollDie(die); draw(); } }),
        h("button", { type: "button", cls: "btn ghost", text: t("form.hpAllFixed"), onclick: () => { ch.hpRolls = {}; draw(); } }),
      ]) : null,
      h("p", { cls: "hptotal" }, [t("form.hpTotal") + ": ", h("b", { id: "f-hptotal", text: c.hpMax })]),
    ]);

    return h("form", { cls: "panel cform", novalidate: true, onsubmit: (e) => {
      e.preventDefault();
      if (!ch.name.trim()) { toast(t("form.nameRequired")); root.querySelector("#f-name").focus(); return; }
      if (method === "roll" && !ch.rolled) { toast(t("form.rollFirst")); return; }
      ch.name = ch.name.trim(); ch.player = ch.player.trim();
      ch.abilities = finalAbilities(ch);
      ch.schema = 2;
      const before = stored ? compute(structuredClone(stored)).hpMax : null;
      const after = compute(structuredClone(ch)).hpMax;
      if (ch.hp.cur != null && before != null) ch.hp.cur = Math.max(0, Math.min(after, ch.hp.cur + (after - before)));
      if (!upsert(ch)) { toast(t("app.saveError")); return; }
      go(`#/c/${ch.id}/start`);
    } }, [
      h("header", { cls: "stack" }, [h("h2", { text: t(isNew ? "form.titleNew" : "form.titleEdit") })]),
      basics, species, background, abilities, skills, feats, armorCard, spellsCard, hpCard,
      h("div", { cls: "row" }, [
        h("button", { type: "submit", cls: "btn gold", text: t("form.save") }),
        h("a", { cls: "btn ghost", href: isNew ? "#/" : `#/c/${ch.id}/character`, text: t("form.cancel") }),
      ]),
    ]);
  }

  /** Put the highest values where the class's recommended array puts its highest scores. */
  function assignByClass(values) {
    const order = [...ABILITIES].sort((a, b) => cls().standardArray[b] - cls().standardArray[a]);
    const sorted = [...values].sort((x, y) => y - x);
    ch.abilityBase = Object.fromEntries(order.map((a, i) => [a, sorted[i]]));
  }

  draw();
  if (isNew) root.querySelector("#f-name")?.focus();
}
