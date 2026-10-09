// Create or edit a character.
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { getById, upsert } from "../store.js";
import { CLASSES, PLANNED_CLASSES, SPECIES, blankCharacter } from "../rules/index.js";
import { ABILITIES, ABILITY_NAMES, SKILLS, FEATS, mod, signed } from "../rules/core.js";

export function renderForm(root, go, id) {
  const ch = id ? structuredClone(getById(id)) : blankCharacter();
  if (!ch) return go("#/");
  const isNew = !id;

  const field = (label, input, extra) => h("label", { cls: extra }, [label, input]);
  const num = (val, min, max, onInput) => h("input", { type: "number", inputmode: "numeric", min, max, value: val ?? "", oninput: onInput });

  // Basics
  const name = h("input", { type: "text", maxlength: 60, value: ch.name, required: true });
  const player = h("input", { type: "text", maxlength: 60, value: ch.player });

  const clsSel = h("select", {}, [
    ...Object.values(CLASSES).map((c) => h("option", { value: c.id, text: tr(c.name), selected: c.id === ch.classId })),
    ...Object.entries(PLANNED_CLASSES).map(([k, n]) => h("option", { value: k, text: `${tr(n)} (${t("form.soon")})`, disabled: true })),
  ]);
  const subclass = h("input", { type: "text", maxlength: 60, value: ch.subclass });

  const spSel = h("select", { onchange: () => { ch.speciesId = spSel.value; drawSpeciesExtra(); } },
    Object.entries(SPECIES).map(([k, s]) => h("option", { value: k, text: tr(s.name), selected: k === ch.speciesId })));
  const spExtra = h("div", { cls: "row" });
  function drawSpeciesExtra() {
    const sp = SPECIES[ch.speciesId];
    spExtra.replaceChildren();
    if (sp.choice) {
      const cur = ch.speciesChoice?.[sp.choice.key] || sp.choice.default;
      const s = h("select", { onchange: () => (ch.speciesChoice = { ...ch.speciesChoice, [sp.choice.key]: s.value }) },
        Object.entries(sp.choice.options).map(([k, o]) => h("option", { value: k, text: tr(o), selected: k === cur })));
      ch.speciesChoice = { ...ch.speciesChoice, [sp.choice.key]: cur };
      spExtra.appendChild(field(tr(sp.choice.label), s));
    }
    if (sp.custom) {
      const cs = (ch.customSpecies = ch.customSpecies || { name: "", speed: 30, darkvision: 0, notes: "" });
      spExtra.append(
        field(t("form.customName"), h("input", { type: "text", maxlength: 40, value: cs.name, oninput: (e) => (cs.name = e.target.value) })),
        field(t("form.customSpeed"), num(cs.speed, 0, 120, (e) => (cs.speed = +e.target.value || 30))),
        field(t("form.customDark"), num(cs.darkvision, 0, 300, (e) => (cs.darkvision = +e.target.value || 0))),
        field(t("form.customNotes"), h("textarea", { rows: 3, oninput: (e) => (cs.notes = e.target.value) }, cs.notes), "wide"),
      );
    }
  }
  drawSpeciesExtra();

  const cls = () => CLASSES[clsSel.value];
  const level = h("select", {}, Array.from({ length: cls().maxLevel }, (_, i) => h("option", { value: i + 1, text: i + 1, selected: i + 1 === ch.level })));

  // Abilities
  const abGrid = h("div", { cls: "abgrid" }, ABILITIES.map((a) => {
    const out = h("output", { cls: "abmod", text: signed(mod(ch.abilities[a])) });
    const inp = num(ch.abilities[a], 1, 30, (e) => { ch.abilities[a] = Math.max(1, Math.min(30, +e.target.value || 10)); out.textContent = signed(mod(ch.abilities[a])); });
    return h("label", { cls: "abfield" }, [ABILITY_NAMES[a].short[lang()], inp, out]);
  }));

  // Skills
  const skillSet = new Set(ch.skills);
  const choices = cls().skillChoices;
  const skillGrid = h("div", { cls: "checks" }, SKILLS.map((s) => {
    const cb = h("input", { type: "checkbox", checked: skillSet.has(s.id), onchange: (e) => (e.target.checked ? skillSet.add(s.id) : skillSet.delete(s.id)) });
    return h("label", { cls: "check" + (choices.from.includes(s.id) ? " suggested" : "") }, [cb, `${s[lang()]} (${ABILITY_NAMES[s.ab].short[lang()]})`]);
  }));

  // Feats
  const featSet = new Set(ch.feats);
  const featGrid = h("div", { cls: "checks" }, Object.entries(FEATS).map(([k, f]) => h("label", { cls: "check" }, [
    h("input", { type: "checkbox", checked: featSet.has(k), onchange: (e) => (e.target.checked ? featSet.add(k) : featSet.delete(k)) }), tr(f.name),
  ])));
  const featsOther = h("textarea", { rows: 2 }, ch.featsOther || "");

  const acIn = num(ch.acOverride, 1, 40);
  const hpIn = num(ch.hp.maxOverride, 1, 999);

  const form = h("form", { cls: "panel cform", novalidate: true, onsubmit: (e) => {
    e.preventDefault();
    if (!name.value.trim()) { toast(t("form.nameRequired")); name.focus(); return; }
    Object.assign(ch, {
      name: name.value.trim(), player: player.value.trim(), classId: clsSel.value, subclass: subclass.value.trim(),
      level: +level.value, skills: [...skillSet], feats: [...featSet], featsOther: featsOther.value,
      acOverride: acIn.value ? +acIn.value : null,
    });
    ch.hp.maxOverride = hpIn.value ? +hpIn.value : null;
    if (!upsert(ch)) { toast(t("app.saveError")); return; }
    go(`#/c/${ch.id}/start`);
  } }, [
    h("header", { cls: "stack" }, [h("h2", { text: t(isNew ? "form.titleNew" : "form.titleEdit") })]),
    h("div", { cls: "card stack" }, [
      h("div", { cls: "row" }, [field(t("form.name"), name), field(t("form.player"), player)]),
      h("div", { cls: "row" }, [field(t("form.class"), clsSel), field(t("form.level"), level), field(t("form.subclass"), subclass)]),
      h("div", { cls: "row" }, [field(t("form.species"), spSel)]),
      spExtra,
    ]),
    h("div", { cls: "card stack" }, [h("h4", { text: t("form.abilities") }), h("p", { cls: "hint", text: t("form.abilitiesHint") }), abGrid]),
    h("div", { cls: "card stack" }, [
      h("h4", { text: t("form.skills") }),
      h("p", { cls: "hint", text: t("form.skillsHint", { cls: tr(cls().name), n: choices.count }) }),
      skillGrid,
    ]),
    h("div", { cls: "card stack" }, [
      h("h4", { text: t("form.feats") }), featGrid, field(t("form.featsOther"), featsOther, "wide"),
      h("div", { cls: "row" }, [field(t("form.ac"), acIn), field(t("form.hpMax"), hpIn)]),
    ]),
    h("div", { cls: "row" }, [
      h("button", { type: "submit", cls: "btn gold", text: t("form.save") }),
      h("a", { cls: "btn ghost", href: isNew ? "#/" : `#/c/${ch.id}/character`, text: t("form.cancel") }),
    ]),
  ]);
  root.replaceChildren(form);
  if (isNew) name.focus();
}
