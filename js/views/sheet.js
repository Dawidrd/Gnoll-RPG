// The character sheet: header with level, vitals bar, tabs.
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { getById, upsert, exportFile } from "../store.js";
import { compute, typedHpRoll, LANGUAGES, ALIGNMENTS, SIZES, SETTINGS, CREATURE_TYPES, DAMAGE_NAMES } from "../rules/index.js";
import { msg } from "./msg.js";
import { levelChoiceUI, levelChoiceDone } from "./levelchoice.js";
import { trimSkills } from "../rules/skills.js";
import { paperLocked, genderText } from "../rules/identity.js";
import { ABILITIES, ABILITY_NAMES, signed, clamp, rollDie, pipTarget, rechargeKey, asksBeforeSpend } from "../rules/core.js";
import { glossify } from "../glossary.js";
import { CATALYSTS } from "../rules/feats-ravenloft.js";
import { SPELLS } from "../rules/spells.js";
import { writePick, newSpellCircle } from "../rules/magic.js";
import { spellPickUI, spellTags, spellBody, newBadge } from "./spellpicker.js";
import { dmgTags } from "./dmgtag.js";
import { spellDamage } from "../rules/damage.js";
import { classOptionUI, classOptionList } from "./classoptions.js";
import { combatTab, activeCard } from "./combat.js";
import { attacksBlock } from "./weapons.js";
import { inventoryTab, journalTab } from "./gear.js";
import { partyTab } from "./party.js";
import { accountAvailable } from "../sync/cloud.js";
import { searchSelects } from "./selectsearch.js";
import { skillGroups } from "./skillgroups.js";

const TABS = ["start", "combat", "character", "spells", "inventory", "party", "levelup", "journal", "notes"];
let lastHp = null; // undo snapshot for the open character
let lastId = null;
let pending = null; // decisions for the next level on the Level up tab, applied together on confirm
let freshShown = 0; // the new spell circle being shown on the Spells tab (ch.newCircle is cleared on the first look)

export function renderSheet(root, go, id, tab) {
  if (id !== lastId) { lastHp = null; pending = null; lastId = id; freshShown = 0; }
  if (tab !== "spells") freshShown = 0;
  const ch = getById(id);
  if (!ch) return go("#/");
  let c = compute(ch);
  const tabsFor = (cc) => TABS.filter((k) => (k !== "spells" || cc.spellSources.length) && (k !== "party" || accountAvailable()));
  if (!tabsFor(c).includes(tab)) tab = "start";
  if (ch.hp.cur == null) { ch.hp.cur = c.hpMax; upsert(ch); }

  const save = (redraw = true) => { if (!upsert(ch)) toast(t("app.saveError")); if (redraw) draw(); };
  let editing = null; // which spell pick is open for changes on the Spells tab
  // A spell circle opened by the last level-up: marked "New" (blue) until the Spells tab has been seen.
  const fresh = () => ch.newCircle || freshShown || 0;

  function draw() {
    c = compute(ch);
    ch.hp.cur = clamp(ch.hp.cur, 0, c.hpMax);
    const hpPct = c.hpMax ? (ch.hp.cur / c.hpMax) * 100 : 0;
    const spName = ch.speciesId === "other" ? ch.customSpecies?.name || tr(c.sp.name) : tr(c.sp.name);
    const subName = c.subclass ? tr(c.subclass.name) : c.customSubclass || "";

    const header = h("header", { cls: "mast" }, [
      h("div", { cls: "who" }, [
        h("a", { cls: "eyebrow back", href: "#/", text: "← " + t("sheet.back") }),
        h("h1", { cls: "name", text: ch.name }),
        h("p", { cls: "sub", text: [ch.gender === "none" ? "" : genderText(ch, lang()), spName, tr(c.cls.name), subName].filter(Boolean).join(" · ") }),
        // Scores rolled on paper are always marked; the GM of the character's party confirms them.
        ch.abilityMethod === "paper" ? h("p", { cls: "paperbadge" + (paperLocked(ch) ? " ok" : ""), id: "paper-badge",
          text: paperLocked(ch) ? t("paper.badgeOk", { name: ch.paperConfirm.name || t("party.role.gm") }) : t("paper.badgeOpen") }) : null,
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

    const nav = h("nav", { cls: "tabs", "aria-label": "Sections" }, tabsFor(c).map((k) =>
      h("a", { href: `#/c/${ch.id}/${k}`, "aria-current": k === tab ? "page" : false, text: t("tab." + k) })));

    if (!tabsFor(c).includes(tab)) tab = "start";
    const body = { start: tabStart, character: tabCharacter, spells: tabSpells, levelup: tabLevel, notes: tabNotes,
      combat: () => combatTab({ ch, c, save }), inventory: () => inventoryTab({ ch, c, save, draw }), journal: () => journalTab({ ch, save }), party: () => partyTab({ ch, go }) }[tab]();
    root.replaceChildren(header, vitals, h("div", { cls: "shell" }, [nav, h("main", { cls: "panel" }, body)]));
    root.querySelectorAll(".gl").forEach(glossify);
    searchSelects(root);

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
        c.resources.length ? askToggle() : null,
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
        h("h4", { text: `${t(ch.todoAgreed && !errors.length ? "sheet.todoTitleAgreed" : "sheet.todoTitle")} (${todo.length + errors.length})` }),
        h("ul", {}, [...errors, ...todo].slice(0, 6).map((x) => h("li", { text: msg(x) }))),
        h("a", { cls: "btn gold", href: `#/edit/${ch.id}`, text: t("sheet.todoFix") }),
      ]) : null;
      // The price of Dark Gifts: what happens on a natural 1 (or other trigger), with the DC worked out.
      const flawBlk = c.flaws.length ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("sum.flaws") }), h("dl", { cls: "qa gl" },
        c.flaws.flatMap((f) => [h("dt", { text: tr(f.name) }), h("dd", {}, [h("p", { text: tr(f.text) })])]))]) : null;
      // After moving a character over from its old page: what came along and which numbers differ from the page.
      const im = ch.imported && !ch.imported.dismissed ? ch.imported : null;
      const impCard = im ? h("section", { cls: "card key", id: "import-card" }, [
        h("h4", { text: t("imp.title", { page: im.page }) }),
        h("p", { text: t("imp.counts", { items: im.counts?.items || 0, journal: im.counts?.journal || 0, questions: im.counts?.questions || 0 }) }),
        im.notes?.length ? h("ul", {}, im.notes.map((n) => h("li", { text: t(n.key, n.vars) }))) : h("p", { cls: "hint", text: t("imp.same") }),
        im.notes?.some((n) => n.key !== "imp.levelChanged") ? h("p", { cls: "hint", text: t("imp.diffHint") }) : null,
        h("button", { type: "button", cls: "btn", id: "import-ok", text: t("imp.ok"), onclick: () => { ch.imported = { ...ch.imported, dismissed: true }; save(); } }),
      ]) : null;
      return [impCard, banner, concBanner(), h("div", { cls: "cols" }, [hpCard, resCard]), activeCard({ ch, c, save }), h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("sum.title") }), table]), attacksBlock(c, ch), flawBlk];
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
        idRow(t("char.gender"), genderText(ch, lang())),
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
        ...c.classOptions.map((g) => classOptionList(g, c)),
        c.subclassFeatures.length ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: tr(c.subclass.name) }), featList(c.subclassFeatures)]) : null,
        c.customSubclass ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: c.customSubclass }), h("p", { cls: "hint", text: t("char.customSubclassHint") })]) : null,
        c.speciesFeatures.length ? h("section", { cls: "blk" }, [h("div", { cls: "orn", text: t("char.speciesFeatures") }), featList(c.speciesFeatures)]) : null,
        c.spellSources.length ? h("p", { cls: "hint" }, [h("a", { href: `#/c/${ch.id}/spells`, text: t("char.seeSpells") })]) : null,
        ...extra,
      ];
    }

    /** The spell you're concentrating on, with a reminder of the rule and a button to end it. */
    function concBanner() {
      const k = ch.concentration;
      if (!k || !SPELLS[k]) return null;
      return h("section", { cls: "card conc", id: "conc-banner" }, [
        h("div", { cls: "row" }, [h("span", {}, [t("conc.on") + ": ", h("b", { text: tr(SPELLS[k].name) })]),
          h("button", { type: "button", cls: "btn ghost", id: "conc-end", text: t("conc.end"), onclick: () => { ch.concentration = null; save(); } })]),
        h("p", { cls: "hint gl", text: t("conc.rule") }),
      ]);
    }

    function tabSpells() {
      if (ch.newCircle) { freshShown = ch.newCircle; delete ch.newCircle; save(false); }
      const out = [concBanner()];
      const slotRes = c.resources.filter((r) => r.slot);
      const resOf = (id) => c.resources.find((r) => r.id === id);
      const cast = (spell, how) => {
        // how: { slot: n } spends a spell slot; { res: id } spends a free use
        const id = how.slot ? "slot" + how.slot : how.res;
        const r = resOf(id);
        if (!r || r.used >= r.max) return;
        ch.used = { ...ch.used, [id]: (ch.used?.[id] || 0) + 1 };
        let note = "";
        if (SPELLS[spell].conc) {
          if (ch.concentration && ch.concentration !== spell) note = " " + t("conc.replaced", { name: tr(SPELLS[ch.concentration].name).split(" (")[0] });
          ch.concentration = spell;
        }
        save(); toast(t(how.slot ? "spell.castSlot" : "spell.castFree", { name: tr(SPELLS[spell].name).split(" (")[0], n: how.slot || "" }) + note);
      };
      for (const src of c.spellSources) {
        const head = [h("div", { cls: "orn", text: src.id === "class" ? t("char.spells") + " · " + tr(src.label).split(" (")[0] : tr(src.label).split(" (")[0] })];
        if (src.id === "class" || src.needsAbility) head.push(h("p", { cls: "small" }, src.ability
          ? [t("form.spellAbility") + ": ", h("b", { text: ABILITY_NAMES[src.ability][lang()] }), ` · DC ${src.dc} · ${t("char.spellAttack")} ${signed(src.attack)}`]
          : [t("char.speciesSpellsNoAbility")]));
        if (src.id === "class" && slotRes.length) head.push(h("div", { cls: "res" }, slotRes.map(resRow)));
        // Circle of the Land: pick the land after each long rest; it decides the circle spells.
        const landChoice = c.cls.choices?.land;
        if (src.id === "class" && landChoice && c.subclassId === landChoice.subclass) head.push(h("label", { cls: "wide" }, [tr(landChoice.label),
          h("select", { id: "spell-land", onchange: (e) => { ch.classChoices = { ...(ch.classChoices || {}), land: e.target.value }; save(); } },
            Object.entries(landChoice.options).map(([k, o]) => h("option", { value: k, text: tr(o), selected: k === c.classChoices.land })))]));
        // Wizard: what's in the spellbook (only Rituals are cast straight from it).
        if (src.book?.length) head.push(h("p", { cls: "hint" }, [h("b", { text: t("spell.bookList") + ": " }), src.book.map((id) => tr(SPELLS[id].name).split(" (")[0]).join(", ")]));
        const rows = [];
        const byCircle = [...src.spells].sort((a, b) => SPELLS[a.id].circle - SPELLS[b.id].circle || tr(SPELLS[a.id].name).localeCompare(tr(SPELLS[b.id].name)));
        for (const x of byCircle) {
          const s = SPELLS[x.id];
          const acts = [];
          const free = x.free ? resOf(x.free) : src.resPrefix ? resOf(src.resPrefix + x.id) : null;
          if (free) acts.push(h("button", { type: "button", cls: "btn small", disabled: free.used >= free.max, text: t("spell.free", { n: free.max - free.used, max: free.max }), onclick: () => cast(x.id, { res: free.id }) }));
          if (s.circle > 0 && x.uses !== "ritual" && x.uses !== "atwill") for (const r of slotRes.filter((r) => r.slot >= s.circle)) {
            acts.push(h("button", { type: "button", cls: "btn small ghost", disabled: r.used >= r.max, text: t("spell.slotBtn", { n: r.slot }), title: t("spell.castSlotHint", { n: r.slot }), onclick: () => cast(x.id, { slot: r.slot }) }));
          }
          if ((s.circle === 0 || x.uses === "atwill") && s.conc) acts.push(h("button", { type: "button", cls: "btn small ghost", text: t("conc.start"), onclick: () => { ch.concentration = x.id; save(); } }));
          const why = [x.kind === "always" ? t("spell.always") : x.kind === "book" ? t("spell.bookRitual") : x.uses === "ritual" ? t("spell.ritualOnly") : x.uses === "slotsOrRitual" ? t("spell.slotsOrRitual")
            : x.uses === "atwill" ? (s.circle ? t("spell.noSlot") : t("spell.atWill")) : "", x.self ? t("spell.selfOnly") : ""].filter(Boolean).join(" ");
          const isNew = s.circle && s.circle === fresh();
          rows.push(h("div", { cls: "spellrow sheet" + (ch.concentration === x.id ? " on" : "") + (isNew ? " fresh" : "") }, [
            h("details", {}, [h("summary", {}, [h("span", { cls: "sname", text: tr(s.name) }), " ", isNew ? newBadge() : null, ...spellTags(s), x.kind === "always" ? h("small", { cls: "lvtag", text: t("spell.alwaysTag") }) : null,
              dmgTags(spellDamage(x.id, c, src.ability ? c.mods[src.ability] : null))]), ...spellBody(s, c), why ? h("p", { cls: "hint", text: why }) : null]),
            acts.length ? h("div", { cls: "row acts" }, acts) : null,
          ]));
        }
        if (!rows.length) rows.push(h("p", { cls: "hint", text: t("spell.noneYet") }));
        // Changing picks: the Cleric prepares a new list after each long rest; others pick once.
        const picks = src.picks.filter((p) => p.store !== "level");
        const edit = picks.length ? h("div", { cls: "row" }, picks.map((p) => h("button", { type: "button", cls: "btn ghost", id: "edit-" + p.id.replace(/[^\w-]/g, "_"),
          text: `${t("spell.change")}: ${tr(p.label).toLowerCase()} (${p.chosen.length}/${p.count})`, onclick: () => { editing = editing === p.id ? null : p.id; draw(); } }))) : null;
        const open = picks.find((p) => p.id === editing);
        const rule = src.id === "class" && c.spells?.changeRule === "level" ? h("p", { cls: "hint", text: t("spell.changeLevel") })
          : src.id === "class" && c.spells?.changeRule === "oneLongRest" ? h("p", { cls: "hint", text: t("spell.changeOneLongRest") }) : null;
        out.push(h("section", { cls: "blk gl" }, [...head, ...rows, edit, rule,
          open ? spellPickUI({ pick: open, c, fresh: fresh(), onChange: (ids) => { writePick(ch, open, ids); save(); } }) : null]));
      }
      return out;
    }

    function tabLevel() {
      const out = [];
      const nx = c.next;
      if (nx) {
        if (!pending || pending.level !== nx.level) pending = { level: nx.level, hp: null, hpTyped: false, subclass: "", skills: [], expertise: [], lc: null, spellPicks: null, classOptions: null };
        const N = nx.level;
        const draft = structuredClone(ch);
        draft.level = N;
        draft.hpRolls = { ...(draft.hpRolls || {}) };
        if (typeof pending.hp === "number") draft.hpRolls[N] = pending.hp; else delete draft.hpRolls[N];
        if (pending.subclass) draft.subclass = pending.subclass;
        if (pending.skills.length) draft.skills = [...(draft.skills || []), ...pending.skills];
        if (pending.expertise.length) draft.expertise = [...(draft.expertise || []), ...pending.expertise];
        draft.levelChoices = { ...(draft.levelChoices || {}) };
        if (pending.lc) draft.levelChoices[N] = pending.lc; else delete draft.levelChoices[N];
        draft.spellPicks = structuredClone(pending.spellPicks || ch.spellPicks || {});
        draft.classOptions = structuredClone(pending.classOptions || ch.classOptions || {});
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
              h("button", { type: "button", cls: "btn", id: "lvl-fixed", text: t("lvl.fixedPick", { n: nx.fixed, hp: gainOf(nx.fixed) }), onclick: () => { pending.hp = "fixed"; pending.hpTyped = false; draw(); } }),
            ]));
          // A roll made with real dice at the table.
          const typed = h("input", { type: "number", id: "lvl-typed", min: 1, max: nx.hitDie, step: 1, inputmode: "numeric", "aria-label": t("lvl.typedLabel", { d: nx.hitDie }) });
          const useTyped = () => {
            const v = typedHpRoll(nx.hitDie, typed.value);
            if (v == null) { toast(t("lvl.typedBad", { d: nx.hitDie })); typed.focus(); return; }
            pending.hp = v; pending.hpTyped = true; draw();
          };
          typed.addEventListener("keydown", (e) => { if (e.key === "Enter") useTyped(); });
          hpBox.append(h("p", { cls: "hint", text: t("lvl.typedHint", { d: nx.hitDie }) }),
            h("div", { cls: "row" }, [typed, h("button", { type: "button", cls: "btn ghost", id: "lvl-typed-ok", text: t("lvl.typedOk"), onclick: useTyped })]));
        } else {
          const die = pending.hp === "fixed" ? nx.fixed : pending.hp;
          const label = pending.hp === "fixed" ? t("lvl.fixedChosen", { n: nx.fixed }) : pending.hpTyped ? t("lvl.typedChosen", { d: nx.hitDie }) : t("lvl.rolled", { d: nx.hitDie });
          hpBox.append(h("p", { cls: "rollres" }, [label + " ", h("b", { text: die }), " → " + t("lvl.gain", { hp: gainOf(die) })]));
          // A fixed value or a typed result can be corrected; a roll made in the app is final.
          if (pending.hp === "fixed" || pending.hpTyped)
            hpBox.append(h("button", { type: "button", cls: "btn ghost", id: "lvl-hp-change", text: t("lvl.hpChange"), onclick: () => { pending.hp = null; pending.hpTyped = false; draw(); } }));
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

        // 3. New skill slots (Barbarian Primal Knowledge, College of Lore)
        const newSlots = cn.slots.filter((sl) => !c.slots.some((x) => x.id === sl.id));
        if (newSlots.length) {
          const have = c.skills.filter((x) => x.prof).map((x) => x.id);
          const total = newSlots.reduce((n, sl) => n + sl.count, 0);
          const allowed = c.skills.filter((k) => !have.includes(k.id) && newSlots.some((sl) => !sl.from || sl.from.includes(k.id)));
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: newSlots.map((sl) => tr(sl.label)).join(", ") }),
            h("p", { cls: "hint", text: t("lvl.newSkills", { n: total }) + " " + t("form.picked", { n: pending.skills.length, max: total }) }),
            skillGroups(allowed.map((k) => k.id), c, (sid) => {
              const k = c.skills.find((x) => x.id === sid);
              const on = pending.skills.includes(k.id);
              return h("label", { cls: "check" + (!on && pending.skills.length >= total ? " blocked" : "") }, [h("input", { type: "checkbox", id: "lvl-skill-" + k.id, checked: on,
                disabled: !on && pending.skills.length >= total, onchange: (e) => { pending.skills = e.target.checked ? [...pending.skills, k.id] : pending.skills.filter((x) => x !== k.id); draw(); } }), k[lang()]]);
            })]));
          ok.push(pending.skills.length === total);
        }

        // 3b. Expertise gained at this level (Bard 2, Wizard 2: Scholar)
        const expNew = cn.expertiseMax - Math.min(c.expertiseMax, (ch.expertise || []).length);
        if (expNew > 0) {
          const pool = cn.skills.filter((k) => k.prof && !(ch.expertise || []).includes(k.id) && (!cn.expertiseFrom || cn.expertiseFrom.includes(k.id)));
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: t("form.expertise") }),
            h("p", { cls: "hint", text: t("form.expertiseHint", { n: expNew }) + (cn.expertiseFrom ? " " + t("form.expertiseFrom", { list: cn.expertiseFrom.map((x) => c.skills.find((k) => k.id === x)[lang()]).join(", ") }) : "") }),
            pool.length ? h("div", { cls: "checks" }, pool.map((k) => {
              const on = pending.expertise.includes(k.id);
              return h("label", { cls: "check" + (!on && pending.expertise.length >= expNew ? " blocked" : "") }, [h("input", { type: "checkbox", id: "lvl-exp-" + k.id, checked: on,
                disabled: !on && pending.expertise.length >= expNew, onchange: (e) => { pending.expertise = e.target.checked ? [...pending.expertise, k.id] : pending.expertise.filter((x) => x !== k.id); draw(); } }), k[lang()]]);
            })) : h("p", { cls: "hint", text: t("lvl.noExpertise") })]));
          ok.push(pending.expertise.length === expNew || !pool.length);
        }

        // 4. Ability Score Improvement or feat
        if ((c.cls.asiLevels || []).includes(N)) {
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: t("lvl.asiTitle", { n: N }) }),
            levelChoiceUI({ draft, L: N, profSkills: c.skills.filter((x) => x.prof).map((x) => x.id), onChange: (lc) => { pending.lc = lc; draw(); } })]));
          ok.push(levelChoiceDone(draft, N));
        }

        // 4b. Class options: new invocations (Warlock 2 and 5), Metamagic (Sorcerer 2)
        for (const g of cn.classOptions) {
          const before = c.classOptions.find((x) => x.key === g.key);
          if (before && before.count === g.count && !g.chosen.some((x) => x.problem) && g.chosen.length === g.count) continue;
          steps.push(h("div", { cls: "stack" }, [h("h4", { text: tr(g.label) }), classOptionUI({ group: g, c: cn, known: cn.knownClassCantrips,
            onChange: (raws) => { pending.classOptions = { ...(draft.classOptions || {}), [g.key]: raws }; draw(); } })]));
          ok.push(g.chosen.length === g.count && !g.chosen.some((x) => x.problem));
        }

        // 5. Spells: new cantrips and prepared spells from the class list, picked now
        const srcN = cn.spellSources.find((x) => x.id === "class");
        const nc = newSpellCircle(c, cn);
        if (srcN) {
          const srcB = c.spellSources.find((x) => x.id === "class");
          const box = h("div", { cls: "stack" }, [h("h4", { text: t("lvl.stepSpells") }),
            h("p", { text: srcB ? t("lvl.spellCounts", { c1: c.spells.cantrips, c2: cn.spells.cantrips, p1: c.spells.prepared, p2: cn.spells.prepared })
              : t("lvl.spellsNew", { c2: cn.spells.cantrips, p2: cn.spells.prepared }) }),
            nc ? h("p", { cls: "newcircle", id: "lvl-new-circle" }, [newBadge(), " ", t("lvl.newCircle", { n: nc })]) : null]);
          for (const p of [...srcN.picks, ...(cn.spellSources.find((x) => x.id === "tome")?.picks || [])]) {
            const before = c.spellSources.flatMap((x) => x.picks).find((x) => x.id === p.id);
            if (before && before.count === p.count && p.chosen.length === p.count && p.options.length === before.options.length) continue;
            box.append(spellPickUI({ pick: p, c: cn, fresh: nc, onChange: (ids) => { const d = { spellPicks: structuredClone(draft.spellPicks) }; writePick(d, p, ids); pending.spellPicks = d.spellPicks; draw(); } }));
          }
          const allPicks = [...srcN.picks, ...(cn.spellSources.find((x) => x.id === "tome")?.picks || [])];
          if (box.children.length > 2 || !srcB || allPicks.some((p) => p.chosen.length !== p.count)) { steps.push(box); ok.push(allPicks.every((p) => p.chosen.length === p.count && !p.invalid.length)); }
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
              Object.assign(ch, { level: N, hpRolls: draft.hpRolls, subclass: draft.subclass, skills: draft.skills, expertise: draft.expertise || [], levelChoices: draft.levelChoices, spellPicks: draft.spellPicks, classOptions: draft.classOptions });
              const after = compute(ch).hpMax;
              ch.hp.cur = clamp(ch.hp.cur + (after - before), 0, after);
              if (nc) ch.newCircle = nc;
              pending = null; save(); toast(t("lvl.done", { n: N }));
            } }),
            pending.hp != null || pending.lc || pending.subclass || pending.skills.length || pending.expertise.length || pending.spellPicks || pending.classOptions
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
      delete ch.newCircle; freshShown = 0;
      const cd = compute(structuredClone(ch));
      const chosen = (ch.skills || []).filter((x) => !cd.granted.includes(x));
      const kept = trimSkills(chosen, cd.slots);
      ch.skills = [...(ch.skills || []).filter((x) => cd.granted.includes(x)), ...kept];
      ch.expertise = (ch.expertise || []).filter((x) => cd.skills.find((k) => k.id === x)?.prof).slice(0, cd.expertiseMax);
      // Fewer cantrips or prepared spells at the lower level: keep the first ones picked.
      for (const src of cd.spellSources) for (const p of src.picks) if (p.store === "class") writePick(ch, p, p.chosen.slice(0, p.count));
      if (!cd.spellSources.some((x) => x.id === "class")) ch.spellPicks = {};
      // Fewer invocations at the lower level (Warlock 5 → 4): keep the first ones; Metamagic goes away below Sorcerer 2.
      const keptOpts = {};
      for (const g of cd.classOptions) keptOpts[g.key] = g.chosen.slice(0, g.count).map((x) => x.raw);
      ch.classOptions = keptOpts;
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
    // Spending asks first (unless switched off for this character); giving a dot back never asks.
    let openAsk = null;
    function resRow(r) {
      const left = r.max - r.used;
      const box = h("div", { cls: "confirm spend" });
      const set = (nowLeft) => { ch.used = { ...ch.used, [r.id]: r.max - nowLeft }; save(); };
      const ask = (nowLeft) => {
        if (openAsk && openAsk !== box) openAsk.classList.remove("open");
        const quiet = h("input", { type: "checkbox" });
        box.replaceChildren(
          h("span", { cls: "small", text: t("res.spendAsk", { n: left - nowLeft, name: tr(r.name), when: t("res.back." + rechargeKey(r)) }) }),
          h("button", { type: "button", cls: "btn gold", text: t("res.spendYes"), onclick: () => { if (quiet.checked) ch.askSpend = false; set(nowLeft); } }),
          h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => box.classList.remove("open") }),
          h("label", { cls: "small check" }, [quiet, " ", t("res.dontAsk")]));
        box.classList.add("open"); openAsk = box;
      };
      const pips = h("div", { cls: "pips" }, Array.from({ length: r.max }, (_, i) => h("button", {
        type: "button", cls: "pip" + (i < left ? " on" : ""), "aria-label": `${tr(r.name)} ${i + 1}/${r.max}`,
        onclick: () => { const nowLeft = pipTarget(left, i); if (nowLeft < left && asksBeforeSpend(ch)) ask(nowLeft); else set(nowLeft); },
      })));
      const isNew = r.slot && r.slot === fresh();
      return h("div", { cls: "resrow" + (isNew ? " fresh" : "") }, [h("span", { cls: "lbl" }, [tr(r.name), ...(isNew ? [" ", newBadge()] : []), h("small", { text: `${left} / ${r.max} · ${t("res.recharge." + rechargeKey(r))}` })]), pips, box]);
    }
    /** Card setting: ask before spending a resource (on by default). */
    function askToggle() {
      return h("label", { cls: "small check" }, [
        h("input", { type: "checkbox", checked: asksBeforeSpend(ch), onchange: (e) => { ch.askSpend = e.target.checked; save(); } }),
        " ", t("res.askToggle")]);
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
    if (hp.cur === 0 && ch.active?.rage) ch.active = { ...ch.active, rage: false };
    if (massive) { ch.death = { ok: 0, fail: 3, massive: true }; toast(t("death.massive")); }
    else if (delta < 0 && ch.concentration && SPELLS[ch.concentration]) {
      if (hp.cur === 0) { toast(t("conc.lostZero", { name: tr(SPELLS[ch.concentration].name).split(" (")[0] })); ch.concentration = null; }
      else toast(t("conc.check", { dc: Math.min(30, Math.max(10, Math.floor(-delta / 2))) }));
    }
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
    if (kind === "long") { ch.hp.cur = compute(ch).hpMax; ch.hp.temp = 0; ch.death = { ok: 0, fail: 0 }; ch.concentration = null; ch.active = { ...ch.active, rage: false }; }
    save(); toast(t(kind === "long" ? "res.longDone" : "res.shortDone"));
  }

  draw();
}

function shortRes(r) {
  const map = { focus: "FP", breath: { pl: "Zion.", en: "Breath" }, inspiration: "Insp.", adrenaline: "Adr.", "sorcery-points": { pl: "PC", en: "SP" } };
  const m = map[r.id];
  return m ? tr(m) : tr(r.name).split(" ")[0];
}
