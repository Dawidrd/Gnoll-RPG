// The character sheet: header with level, vitals bar, tabs.
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { getById, upsert, exportFile } from "../store.js";
import { compute, LANGUAGES, ALIGNMENTS, SIZES, SETTINGS, CREATURE_TYPES, DAMAGE_NAMES } from "../rules/index.js";
import { msg } from "./msg.js";
import { levelChoiceUI, levelChoiceDone } from "./levelchoice.js";
import { trimSkills } from "../rules/skills.js";
import { ABILITIES, ABILITY_NAMES, signed, clamp, rollDie } from "../rules/core.js";
import { glossify } from "../glossary.js";
import { CATALYSTS } from "../rules/feats-ravenloft.js";

const TABS = ["start", "character", "levelup", "notes"];
let lastHp = null; // undo snapshot for the open character
let lastId = null;
let pending = null; // decisions for the next level on the Level up tab, applied together on confirm

export function renderSheet(root, go, id, tab) {
  if (id !== lastId) { lastHp = null; pending = null; lastId = id; }
  const ch = getById(id);
  if (!ch) return go("#/");
  if (!TABS.includes(tab)) tab = "start";
  let c = compute(ch);
  if (ch.hp.cur == null) { ch.hp.cur = c.hpMax; upsert(ch); }

  const save = () => { if (!upsert(ch)) toast(t("app.saveError")); draw(); };

  function draw() {
    c = compute(ch);
    ch.hp.cur = clamp(ch.hp.cur, 0, c.hpMax);
    const hpPct = c.hpMax ? (ch.hp.cur / c.hpMax) * 100 : 0;
    const spName = ch.speciesId === "other" ? ch.customSpecies?.name || tr(c.sp.name) : tr(c.sp.name);
    const subName = c.cls.subclasses?.[ch.subclass] ? tr(c.cls.subclasses[ch.subclass].name) : ch.subclass === "custom" ? ch.subclassCustom : "";

    const header = h("header", { cls: "mast" }, [
      h("div", { cls: "who" }, [
        h("a", { cls: "eyebrow back", href: "#/", text: "← " + t("sheet.back") }),
        h("h1", { cls: "name", text: ch.name }),
        h("p", { cls: "sub", text: [spName, tr(c.cls.name), subName].filter(Boolean).join(" · ") }),
      ]),
      h("div", { cls: "mast-ctl" }, [
        h("div", { cls: "lvl" }, [
          t("sheet.level"), " ", h("b", { text: c.level }),
        ]),
        h("div", { cls: "row" }, [
          h("a", { cls: "btn ghost", href: `#/edit/${ch.id}`, text: t("sheet.edit") }),
          h("button", { type: "button", cls: "btn ghost", text: t("sheet.export"), onclick: () => exportFile(ch) }),
        ]),
      ]),
    ]);

    const vitals = h("div", { cls: "vitals" }, [
      h("div", { cls: "vit hp" }, [h("span", { cls: "k", text: "HP" }), h("span", { cls: "v", text: `${ch.hp.cur}/${c.hpMax}` }),
        ch.hp.temp ? h("span", { cls: "v small", text: "+" + ch.hp.temp }) : null]),
      h("div", { cls: "vit" }, [h("span", { cls: "k", text: "AC" }), h("span", { cls: "v", text: c.ac.value })]),
      ...[...c.resources].sort((a, b) => (!b.slot && b.max > 1) - (!a.slot && a.max > 1)).slice(0, 2).map((r) => h("div", { cls: "vit" }, [h("span", { cls: "k", text: shortRes(r) }), h("span", { cls: "v", text: `${r.max - r.used}/${r.max}` })])),
      h("div", { cls: "quick" }, [
        h("button", { type: "button", cls: "btn blood sq", "aria-label": "−1 HP", text: "−1", onclick: () => changeHp(-1) }),
        h("button", { type: "button", cls: "btn sq", "aria-label": "+1 HP", text: "+1", onclick: () => changeHp(1) }),
      ]),
    ]);

    const nav = h("nav", { cls: "tabs", "aria-label": "Sections" }, TABS.map((k) =>
      h("a", { href: `#/c/${ch.id}/${k}`, "aria-current": k === tab ? "page" : false, text: t("tab." + k) })));

    const body = { start: tabStart, character: tabCharacter, levelup: tabLevel, notes: tabNotes }[tab]();
    root.replaceChildren(header, vitals, h("div", { cls: "shell" }, [nav, h("main", { cls: "panel" }, body)]));
    root.querySelectorAll(".gl").forEach(glossify);

    // --- tabs -------------------------------------------------------------
    function tabStart() {
      const amt = h("input", { type: "number", min: 0, inputmode: "numeric", placeholder: "0", "aria-label": t("hp.amount") });
      const val = () => { const v = parseInt(amt.value, 10); return v > 0 ? v : 0; };
      const hpCard = h("section", { cls: "card hpbox" }, [
        h("h4", { text: t("hp.title") }),
        h("div", { cls: "hpline" }, [
          h("div", { cls: "hpbig" }, [h("span", { cls: "cur", text: ch.hp.cur }), h("span", { cls: "max", text: "/ " + c.hpMax }),
            ch.hp.temp ? h("span", { cls: "tmp", text: `+${ch.hp.temp} ${t("hp.tempShort")}` }) : null]),
        ]),
        h("div", { cls: "bar", "aria-hidden": "true" }, [h("i", { style: `width:${hpPct}%` })]),
        h("div", { cls: "row" }, [
          amt,
          h("button", { type: "button", cls: "btn blood", text: t("hp.damage"), onclick: () => { const v = val(); if (v) changeHp(-v); } }),
          h("button", { type: "button", cls: "btn", text: t("hp.heal"), onclick: () => { const v = val(); if (v) changeHp(v); } }),
          h("button", { type: "button", cls: "btn ghost", text: t("hp.temp"), onclick: () => { const v = val(); if (v) { ch.hp.temp = Math.max(ch.hp.temp || 0, v); save(); } } }),
        ]),
        lastHp ? h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn ghost", text: t("hp.undo"), onclick: () => {
          ch.hp = lastHp.hp; ch.death = lastHp.death; lastHp = null; save(); toast(t("hp.undone"));
        } })]) : null,
        h("p", { cls: "hint", text: t("hp.hint") }),
        ch.hp.cur === 0 ? deathBox() : null,
      ]);

      const resCard = h("section", { cls: "card" }, [
        h("h4", { text: t("res.title") }),
        c.resources.length ? h("div", { cls: "res" }, c.resources.map(resRow)) : h("p", { cls: "hint", text: t("res.none") }),
        restControls(),
      ]);

      const rows = [
        [t("sum.ac"), String(c.ac.value), [tr(c.ac.note), ...(c.ac.warnings || []).map(tr)].join(" ")],
        [t("sum.init"), signed(c.initiative), c.feats.some((f) => f.initiativeBonus) ? tr({ pl: "ZRĘ + PB (Alert)", en: "DEX + PB (Alert)" }) : tr({ pl: "ZRĘ", en: "DEX" })],
        [t("sum.speed"), `${c.speed} ft`, t("sum.squares", { n: c.speed / 5 })],
        [t("sum.pb"), signed(c.pb), ""],
        [t("sum.passive"), String(c.passivePerception), ""],
        [t("sum.dark"), c.darkvision ? `${c.darkvision} ft` : t("sum.none"), ""],
        ...(c.climb ? [[t("sum.climb"), `${c.speed} ft`, c.level >= 3 ? t("sum.climbWalls") : ""]] : []),
        ...(c.blindsight ? [[t("sum.blindsight"), `${c.blindsight} ft`, ""]] : []),
        ...(c.deathSaves ? [[t("sum.deathSaves"), t(c.deathSaves === "adv" ? "char.saveAdv" : "sum.disadv"), ""]] : []),
        ...(c.spells ? [[t("char.spellDc"), String(c.spells.dc), t("char.spellAttack") + " " + signed(c.spells.attack)]] : []),
        ...(c.resistances.length ? [[t("sum.resist"), c.resistances.map((d) => tr(DAMAGE_NAMES[d])).join(", "), t("sum.resistNote")]] : []),
        ...(c.speciesMagic?.dc != null ? [[t("sum.speciesMagic"), "DC " + c.speciesMagic.dc, t("char.spellAttack") + " " + signed(c.speciesMagic.attack) + " · " + ABILITY_NAMES[c.speciesMagic.ability].short[lang()]]] : []),
        ...c.summary.map((r) => [tr(r.label), tr(r.value), tr(r.note)]),
      ];
      const table = h("div", { cls: "tw" }, [h("table", { cls: "sumtab" }, [h("tbody", { cls: "gl" }, rows.map(([k, v, n]) =>
        h("tr", {}, [h("th", { text: k }), h("td", {}, [h("div", { cls: "cell" }, [h("b", { cls: "num", text: v }), n ? h("span", { cls: "note", text: n }) : null])])])))])]);

      const { todo, errors } = c.review;
      const banner = todo.length || errors.length ? h("section", { cls: "todobanner", id: "todo-banner" }, [
        h("h4", { text: `${t("sheet.todoTitle")} (${todo.length + errors.length})` }),
        h("ul", {}, [...errors, ...todo].slice(0, 6).map((x) => h("li", { text: msg(x) }))),
        h("a", { cls: "btn gold", href: `#/edit/${ch.id}`, text: t("sheet.todoFix") }),
      ]) : null;
      // The price of Dark Gifts: what happens on a natural 1 (or other trigger), with the DC worked out.
      const flawBlk = c.flaws.length ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("sum.flaws") }), h("dl", { cls: "qa gl" },
        c.flaws.flatMap((f) => [h("dt", { text: tr(f.name) }), h("dd", {}, [h("p", { text: tr(f.text) })])]))]) : null;
      return [banner, h("div", { cls: "cols" }, [hpCard, resCard]), h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("sum.title") }), table]), flawBlk];
    }

    function tabCharacter() {
      const abil = h("div", { cls: "abgrid" }, ABILITIES.map((a) => h("div", { cls: "abcell" + (c.saves[a].prof ? " prof" : "") }, [
        h("span", { cls: "abk", text: ABILITY_NAMES[a].short[lang()] }),
        h("span", { cls: "abv", text: signed(c.mods[a]) }),
        h("span", { cls: "abs", text: c.abilities[a] }),
        h("span", { cls: "absave", text: `${t("char.save")} ${signed(c.saves[a].value)}` }),
        c.saveAdvantage.includes(a) ? h("span", { cls: "absave", text: t("char.saveAdv") }) : null,
      ])));
      const skills = h("div", { cls: "skills" }, c.skills.map((s) => h("div", { cls: "skill" + (s.prof ? " prof" : "") }, [
        h("span", {}, [s[lang()], s.expert ? h("small", { cls: "lvtag", text: t("char.expertTag") }) : null, s.fromBg ? h("small", { cls: "lvtag", text: t("form.fromBg") }) : null, s.fromSub ? h("small", { cls: "lvtag", text: t("form.fromSub") }) : null, s.fromFeat ? h("small", { cls: "lvtag", text: t("form.fromFeat") }) : null]), h("b", { text: signed(s.value) }),
      ])));
      const featList = (list) => h("dl", { cls: "qa gl" }, list.flatMap((f) => [
        h("dt", {}, [tr(f.name), " ", h("small", { cls: "lvtag", text: `${f.lv}` })]), h("dd", {}, [h("p", { text: tr(f.text) })]),
      ]));
      const extra = [];
      const idRow = (k, v) => h("div", {}, [h("dt", { text: k }), h("dd", { text: v || "—" })]);
      const identity = h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.identity") }), h("dl", { cls: "idgrid" }, [
        idRow(t("char.setting"), tr(SETTINGS[c.setting])),
        idRow(t("char.background"), c.bg ? tr(c.bg.name) : ""),
        idRow(t("char.type"), tr(CREATURE_TYPES[c.creatureType])),
        idRow(t("char.size"), c.size ? tr(SIZES[c.size]) : ""),
        idRow(t("char.alignment"), c.alignment ? tr(ALIGNMENTS[c.alignment]) : ""),
        idRow(t("char.languages"), c.languages.known.map((k) => tr(LANGUAGES[k].name)).join(", ")),
        idRow(t("char.tools"), c.tools.map(tr).join(", ")),
      ])]);
      if (c.feats.length || ch.featsOther) {
        extra.push(h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.feats") }), h("dl", { cls: "qa gl" }, [
          ...c.feats.flatMap((f) => [h("dt", {}, [tr(f.name), f.fromBackground ? [" ", h("small", { cls: "lvtag", text: t("form.fromBg") })] : null,
            f.darkGift ? [" ", h("small", { cls: "lvtag", text: "Dark Gift" })] : null,
            f.atLevel ? [" ", h("small", { cls: "lvtag", text: t("lvl.tag", { n: f.atLevel }) })] : null].flat()), h("dd", {}, [
            f.inc && Object.keys(f.inc).length ? h("p", { cls: "hint", text: Object.entries(f.inc).map(([a, n]) => `${ABILITY_NAMES[a][lang()]} +${n}`).join(", ") }) : null,
            h("p", { text: tr(f.desc) }),
            f.catalyst && f.choice?.catalyst ? h("p", { cls: "hint", text: `${t("form.catalyst")}: ${tr(CATALYSTS[f.choice.catalyst])}` }) : null,
            f.expertisePick && f.choice?.expertise ? h("p", { cls: "hint", text: `${t("form.featExpertise")}: ${c.skills.find((x) => x.id === f.choice.expertise)?.[lang()] || ""}` }) : null,
            c.flaws.some((x) => x.id === f.id) ? h("p", { cls: "warn small", text: `${t("form.flaw")}: ${tr(c.flaws.find((x) => x.id === f.id).text)}` }) : null,
            f.spellAbility && (f.choice.ability || f.choice.spells) ? h("p", { cls: "hint", text: [f.choice.ability ? t("form.spellAbility") + ": " + ABILITY_NAMES[f.choice.ability][lang()] : "", f.choice.spells || ""].filter(Boolean).join(" · ") }) : null,
          ])]),
          ch.featsOther ? h("dd", {}, [h("p", { cls: "pre", text: ch.featsOther })]) : null,
        ])]));
      }
      if (ch.speciesId === "other" && ch.customSpecies?.notes) {
        extra.push(h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.speciesFeatures") }), h("p", { cls: "pre", text: ch.customSpecies.notes })]));
      }
      return [
        h("section", { cls: "blk" }, [h("p", { cls: "lead gl", text: tr(c.cls.role) })]),
        identity,
        h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.abilities") }), abil]),
        h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.skills") }), skills]),
        h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.classFeatures") }), featList(c.classFeatures)]),
        c.subclassFeatures.length ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: tr(c.subclass.name) }), featList(c.subclassFeatures)]) : null,
        c.customSubclass ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: c.customSubclass }), h("p", { cls: "hint", text: t("char.customSubclassHint") })]) : null,
        c.spells ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.spells") }), h("dl", { cls: "qa" }, [
          h("dt", { text: t("char.spellDc") + " " + c.spells.dc + " · " + t("char.spellAttack") + " " + signed(c.spells.attack) }),
          h("dd", {}, [h("p", { cls: "hint", text: t("char.spellsRule", { list: tr(c.spells.list), slots: c.spells.slots.map((n, i) => `${n}× ${i + 1}`).join(", ") }) })]),
          h("dt", { text: t("char.cantrips", { n: c.spells.cantrips }) }), h("dd", {}, [h("p", { cls: "pre", text: ch.spells?.cantrips || "—" })]),
          h("dt", { text: t("char.prepared", { n: c.spells.prepared }) }), h("dd", {}, [h("p", { cls: "pre", text: ch.spells?.prepared || "—" })]),
          c.spells.always.length ? h("dt", { text: t("form.alwaysPrepared") }) : null,
          c.spells.always.length ? h("dd", {}, [h("p", { text: c.spells.always.join(", ") })]) : null,
        ])]) : null,
        c.speciesFeatures.length ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.speciesFeatures") }), featList(c.speciesFeatures)]) : null,
        c.speciesMagic ? magicBlock(c.speciesMagic, t("char.speciesSpells"), true) : null,
        ...c.featMagic.map((m) => magicBlock(m, `${t("char.featSpells")}: ${tr(m.label).split(" (")[0]}`, m.needsAbility)),
        ...extra,
      ];
    }

    /** Spells from species traits: always prepared, cantrips at will, the rest free once per Long Rest (or PB times). */
    function magicBlock(m, title, needsAbility) {
      const uses = (x) => x.uses === "atwill" ? t("spell.atWill") : x.uses === "pb" ? t("spell.pbPerLong", { n: c.pb }) : t("spell.oncePerLong");
      return h("section", { cls: "blk" }, [h("div", { cls: "orn", text: title }), h("dl", { cls: "qa gl" }, [
        !needsAbility ? null : h("dt", { text: m.ability ? `${t("form.spellAbility")}: ${ABILITY_NAMES[m.ability][lang()]} · DC ${m.dc} · ${t("char.spellAttack")} ${signed(m.attack)}` : t("char.speciesSpellsNoAbility") }),
        h("dd", {}, [h("p", { cls: "hint", text: t("char.speciesSpellsRule") })]),
        ...m.spells.flatMap((x) => [
          h("dt", {}, [tr(x.name), " ", h("small", { cls: "lvtag", text: x.circle ? t("spell.circle", { n: x.circle }) : t("spell.cantrip") }),
            x.conc ? [" ", h("small", { cls: "lvtag", text: t("spell.conc") })] : null, x.ritual ? [" ", h("small", { cls: "lvtag", text: t("spell.ritual") })] : null].flat()),
          h("dd", {}, [h("p", { text: tr(x.text) }), h("p", { cls: "hint", text: uses(x) })]),
        ]),
      ])]);
    }

    function tabLevel() {
      const out = [];
      const nx = c.next;
      if (nx) {
        if (!pending || pending.level !== nx.level) pending = { level: nx.level, hp: null, subclass: "", skill: "", lc: null };
        const N = nx.level;
        const draft = structuredClone(ch);
        draft.level = N;
        draft.hpRolls = { ...(draft.hpRolls || {}) };
        if (typeof pending.hp === "number") draft.hpRolls[N] = pending.hp; else delete draft.hpRolls[N];
        if (pending.subclass) draft.subclass = pending.subclass;
        if (pending.skill) draft.skills = [...(draft.skills || []), pending.skill];
        draft.levelChoices = { ...(draft.levelChoices || {}) };
        if (pending.lc) draft.levelChoices[N] = pending.lc; else delete draft.levelChoices[N];
        const cn = compute(structuredClone(draft));
        const gainOf = (die) => Math.max(1, die + nx.conMod) + nx.extra;
        const steps = [];
        const ok = [];

        // 1. Hit points
        const hpBox = h("div", { cls: "stack" }, [h("h4", { text: t("lvl.stepHp") })]);
        if (pending.hp == null) {
          hpBox.append(h("p", { cls: "hint", text: t("lvl.hpChoose", { d: nx.hitDie, n: nx.fixed, con: signed(nx.conMod) }) }),
            h("div", { cls: "row" }, [
              h("button", { type: "button", cls: "btn gold", id: "lvl-roll", text: t("lvl.roll", { d: nx.hitDie }), onclick: () => { pending.hp = rollDie(nx.hitDie); draw(); } }),
              h("button", { type: "button", cls: "btn", id: "lvl-fixed", text: t("lvl.fixedPick", { n: nx.fixed, hp: gainOf(nx.fixed) }), onclick: () => { pending.hp = "fixed"; draw(); } }),
            ]));
        } else {
          const die = pending.hp === "fixed" ? nx.fixed : pending.hp;
          hpBox.append(h("p", { cls: "rollres" }, [pending.hp === "fixed" ? t("lvl.fixedChosen", { n: nx.fixed }) + " " : t("lvl.rolled", { d: nx.hitDie }) + " ",
            h("b", { text: die }), " → " + t("lvl.gain", { hp: gainOf(die) })]));
        }
        steps.push(hpBox); ok.push(pending.hp != null);

        // 2. Subclass
        if (N >= (c.cls.subclassLevel || 99) && !c.cls.subclasses?.[ch.subclass]) {
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: t("lvl.stepSubclass") }),
            h("label", { cls: "wide" }, [t("form.subclass", { n: c.cls.subclassLevel }), h("select", { id: "lvl-subclass", onchange: (e) => { pending.subclass = e.target.value; draw(); } }, [
              h("option", { value: "", text: t("form.subclassNone") }),
              ...Object.entries(c.cls.subclasses).filter(([, sc]) => (sc.source !== "ravenloft") || c.setting === "ravenloft").map(([k, sc]) => h("option", { value: k, text: tr(sc.name), selected: k === pending.subclass })),
            ])])]));
          ok.push(!!pending.subclass);
        }

        // 3. New skill slots (e.g. Barbarian Primal Knowledge)
        const newSlots = (c.cls.extraSkills ? c.cls.extraSkills(N) : []).filter((sl) => !(c.cls.extraSkills(N - 1) || []).some((x) => x.id === sl.id));
        for (const sl of newSlots) {
          const have = c.skills.filter((x) => x.prof).map((x) => x.id);
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: tr(sl.label) }),
            h("label", { cls: "wide" }, [t("lvl.newSkill"), h("select", { id: "lvl-skill", onchange: (e) => { pending.skill = e.target.value; draw(); } }, [
              h("option", { value: "", text: "—" }),
              ...sl.from.filter((x) => !have.includes(x)).map((x) => h("option", { value: x, text: c.skills.find((k) => k.id === x)[lang()], selected: x === pending.skill })),
            ])])]));
          ok.push(!!pending.skill);
        }

        // 4. Ability Score Improvement or feat
        if ((c.cls.asiLevels || []).includes(N)) {
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: t("lvl.asiTitle", { n: N }) }),
            levelChoiceUI({ draft, L: N, profSkills: c.skills.filter((x) => x.prof).map((x) => x.id), onChange: (lc) => { pending.lc = lc; draw(); } })]));
          ok.push(levelChoiceDone(draft, N));
        }

        // 5. Spells: new counts (picking from a list arrives with the spells update)
        if (cn.spells && c.spells && (cn.spells.cantrips !== c.spells.cantrips || cn.spells.prepared !== c.spells.prepared || cn.spells.slots.length !== c.spells.slots.length)) {
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: t("lvl.stepSpells") }),
            h("p", { text: t("lvl.spellCounts", { c1: c.spells.cantrips, c2: cn.spells.cantrips, p1: c.spells.prepared, p2: cn.spells.prepared }) }),
            h("p", { cls: "hint", text: t("lvl.spellsHint") })]));
        } else if (cn.spells && !c.spells) {
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: t("lvl.stepSpells") }), h("p", { cls: "hint", text: t("lvl.spellsNew", { c2: cn.spells.cantrips, p2: cn.spells.prepared }) })]));
        }

        const ready = ok.every(Boolean);
        out.push(h("section", { cls: "card key gl" }, [
          h("h3", { text: t("lvl.next", { n: N }) }),
          h("ul", {}, [
            ...tr(nx.items).map((x) => h("li", { text: x })),
            // Species gifts that arrive at this character level (Celestial Revelation, Large Form, lineage spells...)
            ...cn.speciesFeatures.filter((f) => f.lv === N).map((f) => h("li", { text: `${tr(f.name)} (${tr(c.sp.name).split(" (")[0]})` })),
            ...(cn.speciesMagic?.spells || []).filter((x) => x.at === N).map((x) => h("li", { text: t("lvl.speciesSpell", { name: tr(x.name) }) })),
          ]),
          ...steps,
          h("p", { cls: "picked" + (ready ? " done" : ""), text: ready ? t("lvl.ready") : t("lvl.notReady", { n: ok.filter((x) => !x).length }) }),
          h("div", { cls: "row" }, [
            h("button", { type: "button", cls: "btn gold", id: "lvl-confirm", disabled: !ready, text: t("lvl.up", { n: N }), onclick: () => {
              const before = c.hpMax;
              Object.assign(ch, { level: N, hpRolls: draft.hpRolls, subclass: draft.subclass, skills: draft.skills, levelChoices: draft.levelChoices });
              const after = compute(ch).hpMax;
              ch.hp.cur = clamp(ch.hp.cur + (after - before), 0, after);
              pending = null; save(); toast(t("lvl.done", { n: N }));
            } }),
            pending.hp != null || pending.lc || pending.subclass || pending.skill
              ? h("button", { type: "button", cls: "btn ghost", text: t("lvl.reset"), onclick: () => { pending = null; draw(); } }) : null,
          ]),
        ]));
      } else {
        out.push(h("p", { cls: "lead", text: t("lvl.max", { n: c.cls.maxLevel }) }));
      }
      if (c.hpPerLevel.length) {
        out.push(h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("lvl.history") }), h("div", { cls: "tw" }, [h("table", {}, [h("tbody", {}, [
          h("tr", {}, [h("th", { text: t("form.hpLevel", { n: 1 }) }), h("td", { cls: "num", text: `+${c.cls.hitDie + c.mods.con}` }), h("td", { text: t("lvl.histFirst", { d: c.cls.hitDie }) })]),
          ...c.hpPerLevel.map((p) => h("tr", {}, [h("th", { text: t("form.hpLevel", { n: p.level }) }), h("td", { cls: "num", text: `+${p.gain}` }),
            h("td", { text: p.rolled ? t("lvl.histRolled", { d: c.cls.hitDie, n: p.die }) : t("lvl.histFixed", { n: p.die }) })])),
        ])])])]));
      }
      if (c.level > 1) {
        const box = h("div", { cls: "confirm" });
        out.push(h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn ghost", text: t("lvl.down"), onclick: () => {
          box.replaceChildren(h("span", { cls: "small", text: t("sheet.levelDownAsk", { n: c.level - 1 }) }),
            h("button", { type: "button", cls: "btn gold", text: t("sheet.yes"), onclick: () => levelDown(c.level - 1) }),
            h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => box.classList.remove("open") }));
          box.classList.add("open");
        } })]), box);
      }
      return out;
    }

    /** Going back a level removes what that level gave (HP roll, ASI/feat, extra skill picks). */
    function levelDown(n) {
      const before = c.hpMax;
      for (const l of Object.keys(ch.hpRolls || {})) if (+l > n) delete ch.hpRolls[l];
      for (const l of Object.keys(ch.levelChoices || {})) if (+l > n) delete ch.levelChoices[l];
      ch.level = n;
      const cd = compute(structuredClone(ch));
      const chosen = (ch.skills || []).filter((x) => !cd.granted.includes(x));
      const kept = trimSkills(chosen, cd.slots);
      ch.skills = [...(ch.skills || []).filter((x) => cd.granted.includes(x)), ...kept];
      const after = compute(ch).hpMax;
      ch.hp.cur = clamp(ch.hp.cur + (after - before), 0, after);
      pending = null; save();
    }

    function tabNotes() {
      const state = h("span", { cls: "hint" });
      let timer;
      const ta = h("textarea", { cls: "notes", rows: 16, oninput: () => {
        clearTimeout(timer);
        timer = setTimeout(() => { ch.notes = ta.value; if (upsert(ch)) state.textContent = t("notes.saved"); else toast(t("app.saveError")); }, 400);
      } }, ch.notes || "");
      return [h("section", { cls: "blk" }, [h("h2", { text: t("notes.title") }), h("p", { cls: "hint", text: t("notes.hint") }), ta, state])];
    }

    // --- pieces -----------------------------------------------------------
    function resRow(r) {
      const left = r.max - r.used;
      const pips = h("div", { cls: "pips" }, Array.from({ length: r.max }, (_, i) => h("button", {
        type: "button", cls: "pip" + (i < left ? " on" : ""), "aria-label": `${tr(r.name)} ${i + 1}/${r.max}`,
        onclick: () => { const nowLeft = left === i + 1 ? i : i + 1; ch.used = { ...ch.used, [r.id]: r.max - nowLeft }; save(); },
      })));
      return h("div", { cls: "resrow" }, [h("span", { cls: "lbl" }, [tr(r.name), h("small", { text: `${left} / ${r.max} · ${t(r.shortRegain ? "res.recharge.partial" : "res.recharge." + r.recharge)}` })]), pips]);
    }

    function restControls() {
      const box = h("div", { cls: "confirm" });
      const ask = (kind) => {
        box.replaceChildren(h("span", { cls: "small", text: t(kind === "long" ? "res.longAsk" : "res.shortAsk") }),
          h("button", { type: "button", cls: "btn gold", text: t("sheet.yes"), onclick: () => rest(kind) }),
          h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => box.classList.remove("open") }));
        box.classList.add("open");
      };
      return h("div", { cls: "stack" }, [h("div", { cls: "row" }, [
        h("button", { type: "button", cls: "btn", text: t("res.short"), onclick: () => ask("short") }),
        h("button", { type: "button", cls: "btn gold", text: t("res.long"), onclick: () => ask("long") }),
      ]), box]);
    }

    function deathBox() {
      const d = ch.death || { ok: 0, fail: 0 };
      const pipRow = (kind) => h("div", { cls: "pips" }, [0, 1, 2].map((i) => h("button", {
        type: "button", cls: `pip ${kind}` + (i < d[kind] ? " on" : ""), "aria-label": `${t("death." + kind)} ${i + 1}`,
        onclick: () => { ch.death = { ...d, [kind]: d[kind] === i + 1 ? i : i + 1 }; save(); },
      })));
      let msg = null;
      if (d.fail >= 3) msg = h("p", { cls: "alert", text: t(d.massive ? "death.massive" : "death.dead") });
      else if (d.ok >= 3) msg = h("p", { cls: "good", text: t("death.stable") });
      return h("div", { cls: "death" }, [
        h("h4", { text: t("death.title") }),
        h("div", { cls: "resrow" }, [h("span", { cls: "lbl" }, [t("death.ok"), h("small", { text: t("death.okSub") })]), pipRow("ok")]),
        h("div", { cls: "resrow" }, [h("span", { cls: "lbl" }, [t("death.fail"), h("small", { text: t("death.failSub") })]), pipRow("fail")]),
        msg,
        h("div", { cls: "row" }, [
          h("button", { type: "button", cls: "btn blood", text: t("death.two"), onclick: () => { snap(); ch.death = { ...d, fail: Math.min(3, d.fail + 2) }; save(); } }),
          h("button", { type: "button", cls: "btn", text: t("death.nat20"), onclick: () => { snap(); ch.hp.cur = 1; ch.death = { ok: 0, fail: 0 }; save(); toast(t("death.up")); } }),
        ]),
        c.deathSaves ? h("p", { cls: "note", text: t(c.deathSaves === "adv" ? "death.adv" : "death.dis") }) : null,
        h("p", { cls: "hint", text: t("death.hint") }),
      ]);
    }
  }

  // --- state changes ------------------------------------------------------
  function snap() { lastHp = structuredClone({ hp: ch.hp, death: ch.death || { ok: 0, fail: 0 } }); }

  function changeHp(delta) {
    snap();
    const hp = ch.hp, max = compute(ch).hpMax;
    ch.death = ch.death || { ok: 0, fail: 0 };
    let massive = false;
    if (delta < 0) {
      let dmg = -delta;
      const fromTemp = Math.min(hp.temp || 0, dmg); hp.temp = (hp.temp || 0) - fromTemp; dmg -= fromTemp;
      if (dmg > 0) {
        if (hp.cur === 0) { ch.death.fail = Math.min(3, ch.death.fail + 1); if (dmg >= max) massive = true; }
        else { const rest = dmg - hp.cur; hp.cur = Math.max(0, hp.cur - dmg); if (hp.cur === 0 && rest >= max) massive = true; }
      }
    } else {
      if (hp.cur === 0) ch.death = { ok: 0, fail: 0 };
      hp.cur = Math.min(max, hp.cur + delta);
    }
    if (massive) { ch.death = { ok: 0, fail: 3, massive: true }; toast(t("death.massive")); }
    save();
  }

  function rest(kind) {
    const res = compute(ch).resources;
    const used = { ...ch.used };
    for (const r of res) {
      if (kind === "long" || r.recharge === "short") used[r.id] = 0;
      else if (r.shortRegain) used[r.id] = Math.max(0, (used[r.id] || 0) - r.shortRegain);
    }
    ch.used = used;
    if (kind === "long") { ch.hp.cur = compute(ch).hpMax; ch.hp.temp = 0; ch.death = { ok: 0, fail: 0 }; }
    save(); toast(t(kind === "long" ? "res.longDone" : "res.shortDone"));
  }

  draw();
}

function shortRes(r) {
  const map = { focus: "FP", breath: { pl: "Zion.", en: "Breath" }, inspiration: "Insp.", adrenaline: "Adr." };
  const m = map[r.id];
  return m ? tr(m) : tr(r.name).split(" ")[0];
}
