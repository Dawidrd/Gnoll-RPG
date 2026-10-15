// Rules tests. Run with: node tests/run.mjs
// No dependencies; each test is a name and a function that throws on failure.
import { compute, blankCharacter, normalize } from "../js/rules/index.js";
import { fitSkills, trimSkills } from "../js/rules/skills.js";
import { pointsSpent } from "../js/rules/identity.js";
import { SPELLS, spellsOf } from "../js/rules/spells.js";
import { turnOptions, turnTips } from "../js/rules/turn.js";
import * as PAGE from "../js/rules/pageimport.js";
import { WEAPONS } from "../js/rules/weapons.js";
import * as MERGE from "../js/sync/merge.js";
import * as TEAM from "../js/sync/teamlogic.js";

// localStorage stand-in, so store.js can be tested in Node.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const STORE = await import("../js/store.js");

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const eq = (a, b, what = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const keys = (list) => list.map((x) => x.key);
const make = (over = {}) => Object.assign(blankCharacter(), over);
const run = (ch) => compute(structuredClone(ch));

// --- Ability scores (PHB ch. 2, step 3) ---
test("point buy costs follow the table", () => {
  eq(pointsSpent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 }), 27);
  eq(pointsSpent({ str: 14, dex: 14, con: 14, int: 12, wis: 10, cha: 8 }), 7 + 7 + 7 + 4 + 2);
});
test("point buy above 27 is an error", () => {
  const c = run(make({ abilityMethod: "pointbuy", abilityBase: { str: 15, dex: 15, con: 15, int: 9, wis: 8, cha: 8 } }));
  eq(keys(c.review.errors).includes("err.pointbuy"), true);
});
test("point buy with points left is only a to-do", () => {
  const c = run(make({ abilityMethod: "pointbuy", abilityBase: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } }));
  eq(keys(c.review.errors).includes("err.pointbuy"), false);
  eq(keys(c.review.todo).includes("todo.pointbuy"), true);
});
test("standard array must be exactly 15 14 13 12 10 8", () => {
  const ok = run(make());
  eq(keys(ok.review.errors).includes("err.array"), false);
  const bad = run(make({ abilityBase: { str: 15, dex: 15, con: 13, int: 12, wis: 10, cha: 8 } }));
  eq(keys(bad.review.errors).includes("err.array"), true);
});
test("background increase is capped at 20", () => {
  const c = run(make({ abilityMethod: "pointbuy", abilityBase: { str: 8, dex: 15, con: 15, int: 15, wis: 8, cha: 8 }, background: "criminal", bgIncrease: { mode: "21", plus2: "dex", plus1: "con" } }));
  eq(c.abilities.dex, 17); eq(c.abilities.con, 16);
});

// --- Origin (PHB ch. 2, step 2) ---
test("Common plus two standard languages", () => {
  const c = run(make());
  eq(c.languages.total, 2);
  eq(c.languages.known, ["common"]);
  eq(fitSkills(["elvish", "dwarvish"], c.languages.slots).ok, true);
  eq(fitSkills(["elvish", "dwarvish", "orc"], c.languages.slots).ok, false);
  eq(fitSkills(["abyssal"], c.languages.slots).ok, false, "rare language at origin");
});
test("Rogue knows Thieves' Cant and picks one more language from any table", () => {
  const c = run(make({ classId: "rogue" }));
  eq(c.languages.known.includes("thieves-cant"), true);
  eq(fitSkills(["elvish", "dwarvish", "abyssal"], c.languages.slots).ok, true);
});
test("Human may be Medium or Small; a single-size species sets it", () => {
  eq(run(make({ speciesId: "human" })).size, "");
  eq(run(make({ speciesId: "human", size: "small" })).size, "small");
  eq(run(make({ speciesId: "halfling" })).size, "small");
});
test("background tool group needs a choice", () => {
  const c = run(make({ background: "noble" }));
  eq(c.toolSlots.find((s) => s.id === "bg").count, 1);
  eq(keys(c.review.todo).includes("todo.tools"), true);
  const done = run(make({ background: "noble", toolPicks: { bg: ["cards"] } }));
  eq(done.toolIds.includes("cards"), true);
});

// --- Feats ---
test("only humans get an extra origin feat", () => {
  eq(run(make({ speciesId: "human" })).featSlots.length, 1);
  eq(run(make({ speciesId: "dwarf" })).featSlots.length, 0);
});
test("a general feat can't fill an origin slot", () => {
  const c = run(make({ speciesId: "human", featPicks: { versatile: "nonexistent" } }));
  eq(c.featInstances.some((f) => f.id === "nonexistent"), false);
});
test("Skilled: tools take places from skills", () => {
  const c = run(make({ background: "charlatan", toolPicks: { skilled: ["dice"] } }));
  eq(c.slots.find((s) => s.id === "skilled").count, 2);
});

// --- Skills ---
test("Monk picks 2 class skills, Human 1 more of any", () => {
  const c = run(make({ speciesId: "human" }));
  eq(fitSkills(["acrobatics", "athletics", "arcana"], c.slots).ok, true);
  eq(fitSkills(["acrobatics", "athletics", "arcana", "nature"], c.slots).ok, false);
  eq(trimSkills(["arcana", "nature", "acrobatics"], c.slots), ["arcana", "acrobatics"]);
});

// --- Migration of older saves ---
test("a v0.1 character still loads with its numbers and flags what to fix", () => {
  const old = { schema: 1, id: "o", name: "Old", classId: "monk", speciesId: "dragonborn", speciesChoice: { ancestry: "gold" }, level: 1,
    abilities: { str: 11, dex: 16, con: 12, int: 6, wis: 14, cha: 9 }, skills: ["acrobatics", "stealth"], feats: ["alert"],
    hp: { cur: 9, temp: 0, maxOverride: null }, death: { ok: 0, fail: 0 }, used: {}, notes: "" };
  const c = run(old);
  eq(c.ac.value, 15, "AC"); eq(c.hpMax, 9, "HP");
  eq(keys(c.review.todo).includes("todo.legacyAbilities"), true);
  eq(keys(c.review.errors).includes("err.legacyFeat"), true);
  const fixed = run({ ...structuredClone(old), background: "criminal" });
  eq(keys(fixed.review.errors).includes("err.legacyFeat"), false, "Alert covered by Criminal");
});
test("a human's free feat migrates into the Versatile slot", () => {
  const n = normalize({ schema: 2, speciesId: "human", background: "", feats: ["tough", "alert"], abilities: {}, abilityMethod: "array" });
  eq(n.featPicks, { versatile: "tough" }); eq(n.legacyFeats, ["alert"]);
});

// --- Advancement (PHB ch. 2 "Level Advancement", ch. 5 feats) ---
const monk4 = (over = {}) => make({ classId: "monk", speciesId: "dwarf", background: "criminal", bgIncrease: { mode: "21", plus2: "dex", plus1: "con" }, level: 4, ...over });
test("level 4 needs an Ability Score Improvement or a feat", () => {
  eq(keys(run(monk4()).review.todo).includes("todo.asiChoice"), true);
  eq(keys(run(monk4({ level: 3 })).review.todo).includes("todo.asiChoice"), false);
});
test("ASI: +2 or +1/+1, never above 20", () => {
  eq(run(monk4({ levelChoices: { 4: { kind: "asi", mode: "11", a: "dex", b: "wis" } } })).abilities.dex, 18);
  const c = run(monk4({ levelChoices: { 4: { kind: "asi", mode: "2", a: "dex" } } }));
  eq(c.abilities.dex, 19); eq(c.ac.value, 10 + 4 + 2, "AC");
  const capped = run(monk4({ abilityMethod: "pointbuy", abilityBase: { str: 8, dex: 15, con: 15, int: 8, wis: 15, cha: 8 }, bgIncrease: { mode: "21", plus2: "dex", plus1: "con" },
    levelChoices: { 4: { kind: "asi", mode: "2", a: "dex" } } }));
  eq(capped.abilities.dex, 19, "17 + 2");
  const over = run(monk4({ abilityMethod: "roll", rolled: [18, 15, 14, 12, 10, 8].map((total) => ({ total })), abilityBase: { str: 8, dex: 18, con: 15, int: 14, wis: 12, cha: 10 },
    levelChoices: { 4: { kind: "asi", mode: "2", a: "dex" } } }));
  eq(keys(over.review.errors).includes("err.asiOver20"), true);
});
test("feat prerequisites block the pick", () => {
  eq(keys(run(monk4({ levelChoices: { 4: { kind: "feat", feat: "great-weapon-master", inc: "str" } } })).review.errors).includes("err.featPrereq"), true, "STR 13 needed");
  eq(keys(run(monk4({ levelChoices: { 4: { kind: "feat", feat: "heavily-armored", inc: "str" } } })).review.errors).includes("err.featPrereq"), true, "medium armor needed");
  eq(keys(run(monk4({ levelChoices: { 4: { kind: "feat", feat: "war-caster", inc: "wis" } } })).review.errors).includes("err.featPrereq"), true, "spellcasting needed");
  eq(run(make({ classId: "cleric", level: 4, levelChoices: { 4: { kind: "feat", feat: "war-caster", inc: "wis" } } })).review.errors.length, 0, "Cleric casts");
});
test("feats change the sheet: Speedy, Resilient, Observant, Lightly Armored", () => {
  eq(run(monk4({ levelChoices: { 4: { kind: "feat", feat: "speedy", inc: "dex" } } })).speed, 30 + 10 + 10);
  const res = run(monk4({ levelChoices: { 4: { kind: "feat", feat: "resilient", inc: "wis" } } }));
  eq(res.saves.wis.prof, true); eq(res.abilities.wis, 15, "array WIS 14 + 1");
  const obs = run(monk4({ skills: ["acrobatics", "insight"], levelChoices: { 4: { kind: "feat", feat: "observant", inc: "wis", lore: "perception" } } }));
  eq(obs.skills.find((s) => s.id === "perception").prof, true);
  const obs2 = run(monk4({ skills: ["acrobatics", "insight"], levelChoices: { 4: { kind: "feat", feat: "observant", inc: "wis", lore: "insight" } } }));
  eq(obs2.skills.find((s) => s.id === "insight").expert, true, "already proficient → Expertise");
  eq(run(monk4({ levelChoices: { 4: { kind: "feat", feat: "lightly-armored", inc: "dex" } } })).training.includes("light"), true);
});
test("Tarhun leveled 1 → 5 matches the numbers worked out by hand", () => {
  // Monk, Dragonborn (gold), Wayfarer; rolled 11 14 12 6 13 9; background +2 DEX +1 WIS.
  const ch = make({ name: "Tarhun", classId: "monk", speciesId: "dragonborn", speciesChoice: { ancestry: "gold" }, background: "wayfarer",
    abilityMethod: "roll", rolled: [11, 14, 12, 6, 13, 9].map((total) => ({ total })), abilityBase: { str: 11, dex: 14, con: 12, int: 6, wis: 13, cha: 9 },
    bgIncrease: { mode: "21", plus2: "dex", plus1: "wis" }, skills: ["acrobatics", "athletics"], alignment: "NG", languages: ["draconic", "elvish"], toolPicks: { class: ["flute"] } });
  const at = (patch) => { Object.assign(ch, patch); const c = run(ch); eq(c.review.todo.length + c.review.errors.length, 0, `level ${ch.level} complete`); return c; };
  let c = at({});
  eq([c.hpMax, c.ac.value, c.speed, c.initiative], [8 + 1, 10 + 3 + 2, 30, 3], "L1");
  c = at({ level: 2, hpRolls: { 2: 5 } });                  // rolled 5: +6
  eq([c.hpMax, c.speed], [15, 40], "L2 (Unarmored Movement)");
  c = at({ level: 3, subclass: "open-hand" });              // fixed 5: +6
  eq(c.hpMax, 21, "L3");
  c = at({ level: 4, hpRolls: { 2: 5, 4: 8 }, levelChoices: { 4: { kind: "asi", mode: "2", a: "dex" } } });  // rolled 8: +9
  eq([c.hpMax, c.abilities.dex, c.ac.value, c.initiative], [30, 18, 10 + 4 + 2, 4], "L4");
  c = at({ level: 5, hpRolls: { 2: 5, 4: 8, 5: 2 } });      // rolled 2: +3
  eq([c.hpMax, c.pb, c.ac.value, c.speed], [33, 3, 16, 40], "L5");
  eq([c.saves.str.value, c.saves.dex.value, c.saves.wis.value], [3, 7, 2], "saves");
  eq(["acrobatics", "athletics", "insight", "stealth"].map((id) => c.skills.find((s) => s.id === id).value), [7, 3, 5, 7], "skills");
  eq(c.resources.find((r) => r.id === "focus").max, 5, "Focus Points");
  eq(c.classFeatures.some((f) => f.id === "extra-attack"), true);
});

// --- Species (PHB ch. 4) ---
const sp = (speciesId, speciesChoice = {}, level = 1, over = {}) => run(make({ classId: "barbarian", speciesId, speciesChoice, level, size: "medium", ...over }));
const choiceTodos = (c) => c.review.todo.filter((x) => x.key === "todo.speciesChoice").length;
test("lineage, legacy, ancestry and spell ability must be picked", () => {
  eq(choiceTodos(sp("elf")), 2); eq(choiceTodos(sp("tiefling")), 2); eq(choiceTodos(sp("gnome", {}, 1, { size: "" })), 2);
  eq(choiceTodos(sp("goliath")), 1); eq(choiceTodos(sp("dragonborn")), 1);
  eq(choiceTodos(sp("elf", { lineage: "high", ability: "int" })), 0);
  eq(choiceTodos(sp("aasimar")), 0, "Aasimar always uses CHA");
});
test("elf lineages change speed, darkvision and spells", () => {
  const wood = sp("elf", { lineage: "wood", ability: "wis" });
  eq([wood.speed, wood.darkvision], [35, 60]);
  const drow = sp("elf", { lineage: "drow", ability: "cha" }, 5);
  eq(drow.darkvision, 120);
  eq(drow.speciesMagic.spells.map((s) => s.id), ["dancing-lights", "faerie-fire", "darkness"]);
  eq(drow.resources.filter((r) => r.spell).map((r) => [r.id, r.max]), [["sp-faerie-fire", 1], ["sp-darkness", 1]]);
  eq(sp("elf", { lineage: "drow", ability: "cha" }, 2).speciesMagic.spells.length, 1, "level 3 spell not yet");
});
test("species spell DC uses the chosen ability", () => {
  // blankCharacter keeps its default array: INT 10 (+0), WIS 14 (+2), CHA 8 (−1)
  eq(sp("tiefling", { legacy: "infernal", ability: "wis" }).speciesMagic.dc, 8 + 2 + 2);
  eq(sp("tiefling", { legacy: "infernal", ability: "cha" }).speciesMagic.attack, -1 + 2);
  eq(sp("tiefling", { legacy: "infernal" }).speciesMagic.dc, null, "no ability picked yet");
});
test("tiefling legacies: resistance and spells by level", () => {
  const t = sp("tiefling", { legacy: "chthonic", ability: "cha" }, 5);
  eq(t.resistances, ["necrotic"]);
  eq(t.speciesMagic.spells.map((s) => s.id), ["thaumaturgy", "chill-touch", "false-life", "ray-of-enfeeblement"]);
  eq(sp("tiefling", { legacy: "abyssal", ability: "cha" }).resistances, ["poison"]);
});
test("Aasimar: resistances, Healing Hands, Celestial Revelation from level 3", () => {
  const a1 = sp("aasimar");
  eq(a1.resistances, ["necrotic", "radiant"]);
  eq(a1.resources.find((r) => r.id === "healing-hands").max, 1);
  eq(a1.resources.some((r) => r.id === "revelation"), false);
  eq(sp("aasimar", {}, 3).resources.find((r) => r.id === "revelation").max, 1);
});
test("Goliath: speed 35, giant boon PB times, Large Form from level 5", () => {
  const g4 = sp("goliath", { giant: "fire" }, 4);
  eq(g4.speed, 35); eq(g4.resources.find((r) => r.id === "giant").max, 2); eq(g4.resources.some((r) => r.id === "large-form"), false);
  const g5 = sp("goliath", { giant: "fire" }, 5);
  eq(g5.speed, 35 + 10, "Barbarian Fast Movement at 5"); eq(g5.resources.find((r) => r.id === "giant").max, 3);
  eq(g5.resources.find((r) => r.id === "large-form").max, 1);
});
test("Gnome: Small, Advantage on INT/WIS/CHA saves, rock gnome devices", () => {
  const g = sp("gnome", { lineage: "rock", ability: "int" }, 1, { size: "" });
  eq(g.size, "small"); eq(g.saveAdvantage, ["int", "wis", "cha"]);
  eq(g.speciesFeatures.some((f) => f.id === "clockwork"), true);
  const f = sp("gnome", { lineage: "forest", ability: "int" }, 5, { size: "" });
  eq(f.speciesFeatures.some((x) => x.id === "clockwork"), false);
  eq(f.resources.find((r) => r.id === "sp-speak-with-animals").max, 3, "PB at level 5");
});

// --- Ravenloft: The Horrors Within, chapter 1 ---
const rv = (over = {}) => make({ setting: "ravenloft", classId: "monk", size: "medium", ...over });
const errKeys = (c) => keys(c.review.errors);
test("Ravenloft content needs the Ravenloft game type", () => {
  eq(errKeys(run(make({ speciesId: "lupin", size: "medium" }))).includes("err.ravenloftOnly"), true, "species");
  eq(errKeys(run(make({ background: "investigator" }))).includes("err.ravenloftOnly"), true, "background");
  eq(errKeys(run(make({ classId: "cleric", subclass: "grave", level: 3 }))).includes("err.ravenloftOnly"), true, "subclass");
  eq(errKeys(run(make({ background: "wayfarer", featPicks: { bg: "living-shadow" } }))).includes("err.featCategory"), true, "Dark Gift outside Ravenloft");
  eq(errKeys(run(rv({ speciesId: "lupin", background: "investigator" }))).includes("err.ravenloftOnly"), false);
});
test("Ravenloft backgrounds: Dark Gift or the listed Origin feat", () => {
  const mw = run(rv({ background: "mist-wanderer" }));
  eq(keys(mw.review.todo).includes("todo.feat"), true, "Mist Wanderer must pick a Dark Gift");
  eq(errKeys(run(rv({ background: "mist-wanderer", featPicks: { bg: "alert" } }))).includes("err.featCategory"), true, "not an Origin feat");
  eq(run(rv({ background: "haunted-one", featPicks: { bg: "survivor" } })).bgFeatId, "survivor");
  eq(run(rv({ background: "haunted-one", featPicks: { bg: "watchers" } })).bgFeatId, "watchers");
  eq(run(rv({ background: "wayfarer" })).bgFeatId, "lucky", "a PHB background keeps its feat by default");
  const swap = run(rv({ background: "wayfarer", featPicks: { bg: "mist-walker" } }));
  eq([swap.bgFeatId, keys(swap.review.notices).includes("note.darkGift")], ["mist-walker", true], "swapped for a Dark Gift, DM reminder");
  eq(run(rv({ speciesId: "human", background: "wayfarer", featPicks: { versatile: "touch-of-death" } })).featIds.includes("touch-of-death"), true, "Human Versatile can be a Dark Gift");
});
test("Dark Gifts change the sheet", () => {
  const aa = run(rv({ background: "wayfarer", featPicks: { bg: "aberrant-anatomy" } }));
  const perc = aa.skills.find((s) => s.id === "perception");
  eq([perc.prof, perc.expert, aa.blindsight], [true, true, 15]);
  eq(aa.flaws[0].text.en.includes("DC 15"), true, "DC 13 + PB");
  const es = run(rv({ speciesId: "dwarf", background: "wayfarer", featPicks: { bg: "echoing-soul" }, skills: ["acrobatics", "athletics", "history", "arcana"], languages: ["elvish", "dwarvish", "abyssal"],
    featChoices: { "echoing-soul": { expertise: "history" } } }));
  eq([es.skillFit.ok, es.languages.fit.ok, es.skills.find((s) => s.id === "history").expert], [true, true, true]);
  eq(keys(es.review.todo).filter((k) => k === "todo.skills" || k === "todo.languages"), []);
  const ls = run(rv({ background: "wayfarer", featPicks: { bg: "living-shadow" }, featChoices: { "living-shadow": { ability: "wis" } } }));
  eq([ls.featMagic[0].spells.map((s) => s.id), ls.featMagic[0].dc, ls.resources.find((r) => r.id === "lengthened-strike").max], [["mage-hand"], 8 + 2 + 2, 2]);
  const ss = run(rv({ background: "wayfarer", featPicks: { bg: "second-skin" }, featChoices: { "second-skin": { ability: "cha" } } }));
  eq(keys(ss.review.todo).includes("todo.catalyst"), true);
});
test("Ravenloft species", () => {
  const d = run(rv({ speciesId: "dhampir" }));
  eq([d.speciesSpeed, d.climb, d.resistances, d.resources.find((r) => r.id === "bite").max], [35, true, ["necrotic"], 2]);
  const hx = run(rv({ speciesId: "hexblood", speciesChoice: { ability: "cha" } }));
  eq([hx.creatureType, hx.speciesMagic.spells.map((s) => s.id), hx.speciesMagic.dc], ["fey", ["disguise-self", "hex"], 8 - 1 + 2]);
  const lu = run(rv({ speciesId: "lupin", skills: ["acrobatics", "athletics", "survival"] }));
  eq([lu.skillFit.ok, lu.summary[0].note.en.startsWith("Slashing"), lu.resources.find((r) => r.id === "howl").max], [true, true, 2]);
  eq(run(rv({ speciesId: "lupin", skills: ["acrobatics", "athletics", "arcana"] })).skillFit.ok, false, "Werewolf Instincts: Perception, Stealth or Survival");
  const rb = run(rv({ speciesId: "reborn", speciesChoice: { endurance: "poison" } }));
  eq([rb.resistances, rb.deathSaves, rb.darkvision], [["poison"], "adv", 0]);
  eq(run(rv({ speciesId: "reborn", speciesChoice: { endurance: "poison" }, background: "wayfarer", featPicks: { bg: "touch-of-death" } })).deathSaves, "", "Advantage and Disadvantage cancel");
});
test("Grave Domain and Phantom", () => {
  const g = run(rv({ classId: "cleric", subclass: "grave", level: 5 }));
  eq(g.spells.always, ["Detect Evil and Good", "False Life", "Gentle Repose", "Ray of Enfeeblement", "Spare the Dying", "Revivify", "Vampiric Touch"]);
  const p = run(rv({ classId: "rogue", subclass: "phantom", level: 5 }));
  eq(p.resources.find((r) => r.id === "wails").max, Math.max(1, p.mods.dex));
  eq(p.subclassFeatures[0].text.en.includes("2d6"), true, "half of 3d6 rounded up");
});
test("Torrik (Lupin Monk, Mist Wanderer, Living Shadow) is complete", () => {
  const c = run(rv({ name: "Torrik", speciesId: "lupin", background: "mist-wanderer", bgIncrease: { mode: "21", plus2: "dex", plus1: "wis" },
    featPicks: { bg: "living-shadow" }, featChoices: { "living-shadow": { ability: "wis" } }, skills: ["acrobatics", "athletics", "perception"],
    languages: ["elvish", "dwarvish"], alignment: "N", toolPicks: { class: ["flute"], bg: ["smith"] } }));
  eq([c.review.todo.length, c.review.errors.length], [0, 0]);
  eq(c.featIds, ["living-shadow"]);
});

// --- Spells (PHB ch. 7; class lists from ch. 3) ---
const src = (c, id) => c.spellSources.find((s) => s.id === id);
test("spell database: cantrips to level 3, class lists as in the handbook", () => {
  eq(Object.keys(SPELLS).length, 213);
  eq(spellsOf("cleric", [0]).map((s) => s.id), ["guidance", "light", "mending", "resistance", "sacred-flame", "spare-the-dying", "thaumaturgy", "toll-the-dead", "word-of-radiance"]);
  eq(SPELLS["detect-magic"].classes.includes("warlock"), true, "2024 Warlock list has Detect Magic");
  eq([SPELLS["shatter"].classes.includes("warlock"), SPELLS["enthrall"].conc, SPELLS["blinding-smite"].conc], [false, true, false]);
});
test("Cleric: cantrip and prepared limits, domain spells outside the limit", () => {
  const ok = run(make({ classId: "cleric", level: 3, subclass: "life", spellPicks: { cantrips: ["guidance", "sacred-flame", "toll-the-dead"], prepared: ["command", "guiding-bolt", "healing-word", "shield-of-faith", "spiritual-weapon", "hold-person"] } }));
  eq([keys(ok.review.todo).includes("todo.spellPick"), ok.review.errors.length], [false, 0]);
  const s = src(ok, "class");
  eq(s.fixed.filter((x) => x.kind === "always").map((x) => x.id), ["aid", "bless", "cure-wounds", "lesser-restoration"]);
  eq(s.picks[1].options.includes("bless"), false, "a domain spell can't take a prepared slot");
  eq(s.picks[1].options.some((id) => SPELLS[id].circle === 3), false, "no level 3 spells without level 3 slots");
  eq(errKeys(run(make({ classId: "cleric", spellPicks: { cantrips: ["fire-bolt"] } }))).includes("err.spellInvalid"), true, "not a Cleric spell");
  eq(errKeys(run(make({ classId: "cleric", spellPicks: { prepared: ["bless", "command", "bane", "sanctuary", "guiding-bolt"] } }))).includes("err.spellTooMany"), true, "4 prepared at level 1");
  eq(src(run(make({ classId: "cleric", classChoices: { order: "thaumaturge" } })), "class").picks[0].count, 4, "Thaumaturge: +1 cantrip");
});
test("Arcane Trickster: Mage Hand known, Wizard list, level 1 spells", () => {
  const s = src(run(make({ classId: "rogue", level: 3, subclass: "arcane-trickster" })), "class");
  eq([s.fixed[0].id, s.picks[0].count, s.picks[1].count, s.list], ["mage-hand", 2, 3, "wizard"]);
  eq(s.picks[1].options.every((id) => SPELLS[id].circle === 1 && SPELLS[id].classes.includes("wizard")), true);
});
test("Magic Initiate and Fey-Touched pick from their lists", () => {
  const mi = run(make({ background: "acolyte", featChoices: { "magic-initiate-cleric": { ability: "wis", picks: { cantrips: ["guidance", "light"], spell: ["bless"] } } } }));
  eq([mi.review.errors.length, keys(mi.review.todo).includes("todo.spellPick")], [0, false]);
  eq(mi.resources.some((r) => r.id === "ft-magic-initiate-cleric-bless"), true, "free cast once per long rest");
  eq(errKeys(run(make({ background: "acolyte", featChoices: { "magic-initiate-cleric": { ability: "wis", picks: { spell: ["magic-missile"] } } } }))).includes("err.spellInvalid"), true);
  const fey = (spell) => run(make({ classId: "monk", level: 4, levelChoices: { 4: { kind: "feat", feat: "fey-touched", inc: "wis", spells: [spell] } } }));
  eq(fey("command").levelProblems[4], { todo: [], errors: [] }, "Enchantment is fine");
  eq(fey("magic-missile").levelProblems[4].errors.length, 1, "Evocation is not");
  eq(src(fey("command"), "lvl-4").fixed[0].id, "misty-step");
});
test("spells typed as text in older versions stay until removed", () => {
  eq(keys(run(make({ classId: "cleric", spells: { cantrips: "Guidance", prepared: "" } })).review.todo).includes("todo.legacySpells"), true);
});

// --- Warlock and Sorcerer (PHB ch. 3; Undead Patron and Shadow Sorcery from The Horrors Within) ---
const wl = (over = {}) => make({ classId: "warlock", abilityBase: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 }, ...over });
const optErr = (c) => c.review.errors.filter((x) => x.key.startsWith("err.classOption")).length;
test("Warlock Pact Magic: same-level slots that return on a short rest", () => {
  const w1 = wl();
  eq(run(w1).resources.filter((r) => r.slot).map((r) => [r.slot, r.max, r.recharge]), [[1, 1, "short"]]);
  const w5 = run(wl({ level: 5 }));
  eq(w5.resources.filter((r) => r.slot).map((r) => [r.slot, r.max, r.recharge]), [[3, 2, "short"]], "two level 3 slots");
  const s = src(w5, "class");
  eq([s.picks[0].count, s.picks[1].count, s.picks[1].circles], [3, 6, [1, 2, 3]]);
});
test("Eldritch Invocations: count by level and prerequisites", () => {
  eq(run(wl()).classOptions[0].count, 1);
  eq(run(wl({ level: 2 })).classOptions[0].count, 3);
  eq(run(wl({ level: 5 })).classOptions[0].count, 5);
  eq(optErr(run(wl({ classOptions: { invocations: ["devils-sight"] } }))), 1, "Devil's Sight needs level 2");
  eq(optErr(run(wl({ level: 5, classOptions: { invocations: ["thirsting-blade"] } }))), 1, "needs Pact of the Blade");
  eq(optErr(run(wl({ level: 5, classOptions: { invocations: ["pact-of-the-blade", "thirsting-blade"] } }))), 0);
  const ag = (cantrips, inv) => run(wl({ level: 2, spellPicks: { cantrips }, classOptions: { invocations: inv } }));
  eq(optErr(ag(["eldritch-blast", "minor-illusion"], ["agonizing-blast@eldritch-blast"])), 0);
  eq(optErr(ag(["minor-illusion", "prestidigitation"], ["agonizing-blast@eldritch-blast"])), 1, "the cantrip must be known");
  eq(optErr(ag(["eldritch-blast", "chill-touch"], ["eldritch-spear@chill-touch"])), 1, "Eldritch Spear needs 10+ ft range");
  eq(optErr(ag(["eldritch-blast", "toll-the-dead"], ["agonizing-blast@eldritch-blast", "agonizing-blast@toll-the-dead"])), 0, "repeatable on another cantrip");
  eq(optErr(ag(["eldritch-blast", "toll-the-dead"], ["agonizing-blast@eldritch-blast", "agonizing-blast@eldritch-blast"])), 1, "not twice on the same cantrip");
  const sum = ag(["eldritch-blast", "minor-illusion"], ["agonizing-blast@eldritch-blast"]).summary.find((r) => r.label.en === "Eldritch Blast");
  eq(sum.value, "1× 1d10+2", "Agonizing Blast adds CHA");
});
test("Invocations give spells and feats: Armor of Shadows, Pact of the Chain and Tome, Lessons of the First Ones", () => {
  const c = run(wl({ level: 2, classOptions: { invocations: ["armor-of-shadows", "pact-of-the-chain", "lessons-of-the-first-ones"] }, featPicks: { "lessons-0": "alert" } }));
  eq(src(c, "invocations").fixed.map((x) => [x.id, x.uses]), [["mage-armor", "atwill"], ["find-familiar", "atwill"]]);
  eq(c.featIds.includes("alert"), true, "Lessons of the First Ones gives an Origin feat");
  const tome = run(wl({ level: 2, classOptions: { invocations: ["pact-of-the-tome"] } }));
  eq(src(tome, "tome").picks.map((p) => [p.count, p.options.length > 0]), [[3, true], [2, true]]);
  eq(src(tome, "tome").picks[1].options.every((id) => SPELLS[id].ritual && SPELLS[id].circle === 1), true);
});
test("Satirev (Aasimar Warlock 1, Acolyte, Armor of Shadows) is complete", () => {
  const c = run(wl({ name: "Satirev", speciesId: "aasimar", size: "medium", background: "acolyte", bgIncrease: { mode: "21", plus2: "cha", plus1: "wis" },
    alignment: "NG", languages: ["elvish", "dwarvish"], skills: ["arcana", "deception"],
    classOptions: { invocations: ["armor-of-shadows"] }, spellPicks: { cantrips: ["eldritch-blast", "prestidigitation"], prepared: ["hex", "charm-person"] },
    featChoices: { "magic-initiate-cleric": { ability: "wis", picks: { cantrips: ["guidance", "light"], spell: ["bless"] } } } }));
  eq([c.review.todo.map((x) => x.key), c.review.errors.length], [[], 0]);
  eq([c.spells.dc, c.spells.attack, c.hpMax], [8 + 3 + 2, 3 + 2, 8 + 1]);
});
test("Prinz (Hexblood Warlock, Haunted One + Watchers, Pact of the Chain) is complete in Ravenloft", () => {
  const c = run(wl({ name: "Prinz", setting: "ravenloft", speciesId: "hexblood", speciesChoice: { ability: "cha" }, size: "medium", background: "haunted-one",
    bgIncrease: { mode: "21", plus2: "cha", plus1: "con" }, featPicks: { bg: "watchers" }, alignment: "N", languages: ["elvish", "dwarvish"],
    skills: ["deception", "history"], toolPicks: { bg: ["dice"] }, classOptions: { invocations: ["pact-of-the-chain"] },
    spellPicks: { cantrips: ["eldritch-blast", "minor-illusion"], prepared: ["hex", "charm-person"] } }));
  eq([c.review.todo.map((x) => x.key), c.review.errors.map((x) => x.key)], [[], []]);
  eq(c.creatureType, "fey");
});
test("Patrons: always-prepared spells; Undead Patron only in Ravenloft", () => {
  const cel = src(run(wl({ level: 5, subclass: "celestial" })), "class");
  eq(cel.fixed.map((x) => x.id), ["aid", "cure-wounds", "guiding-bolt", "lesser-restoration", "light", "sacred-flame", "daylight", "revivify"]);
  eq(run(wl({ level: 3, subclass: "celestial" })).resources.find((r) => r.id === "healing-light").max, 4, "1 + Warlock level d6s");
  eq(errKeys(run(wl({ level: 3, subclass: "undead" }))).includes("err.ravenloftOnly"), true);
  eq(run(wl({ setting: "ravenloft", level: 3, subclass: "undead" })).resources.find((r) => r.id === "form-of-dread").max, 2, "CHA 15 → +2");
});
test("Sorcerer: Sorcery Points, Metamagic, Innate Sorcery, subclasses", () => {
  const so = (over = {}) => run(make({ classId: "sorcerer", abilityBase: { str: 10, dex: 13, con: 14, int: 8, wis: 12, cha: 15 }, ...over }));
  const s1 = so();
  eq([s1.classOptions.length, s1.resources.find((r) => r.id === "innate-sorcery").max, src(s1, "class").picks.map((p) => p.count)], [0, 2, [4, 2]]);
  const s2 = so({ level: 2 });
  eq([s2.classOptions[0].count, s2.resources.find((r) => r.id === "sorcery-points").max], [2, 2]);
  const dr = so({ level: 3, subclass: "draconic" });
  eq([dr.hpMax, dr.ac.value], [6 + 2 + 2 * (4 + 2) + 3, 10 + 1 + 2], "Draconic Resilience: +3 HP at level 3, AC 10 + DEX + CHA");
  const sh = so({ setting: "ravenloft", level: 3, subclass: "shadow", speciesId: "human" });
  eq([sh.darkvision, sh.blindsight], [120, 10]);
  eq(so({ level: 5 }).resources.find((r) => r.id === "restoration").max, 1);
});

// --- 0.10: equipment, journal, turn planner, switched-on effects ---
test("older saves get empty equipment, coins, journal and turn", () => {
  const ch = normalize({ ...make(), items: undefined, gold: undefined, journal: undefined, turn: undefined, active: undefined });
  eq([ch.items, ch.gold, ch.journal, ch.turn.round, ch.active], [[], { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, [], 1, {}]);
});
test("Mage Armor and armor taken off change AC; Rage adds resistances", () => {
  const sat = (active, armor = "leather") => run(wl({ armor, active, classOptions: { invocations: ["armor-of-shadows"] } }));
  eq(sat({}).ac.value, 11 + 2, "leather 11 + DEX");
  eq(sat({ mageArmor: true }).ac.value, 13, "Mage Armor does nothing over armor");
  eq(sat({ mageArmor: true, armorOff: true }).ac.value, 13 + 2, "armor off: 13 + DEX");
  eq(run(wl({ active: { mageArmor: true } })).ac.value, 12, "without the spell the toggle is ignored");
  const b = (active) => run(make({ classId: "barbarian", speciesId: "goliath", speciesChoice: { giant: "cloud" }, active }));
  eq([b({}).resistances.length, b({ rage: true }).resistances], [0, ["bludgeoning", "piercing", "slashing"]]);
  eq(run(make({ classId: "monk", active: { rage: true } })).active.rage, false, "only Barbarians rage");
});
test("turn planner: options by class, level, species and spells", () => {
  const ids = (list) => list.map((o) => o.id);
  const monk2 = run(make({ classId: "monk", level: 2, speciesId: "dragonborn", speciesChoice: { ancestry: "gold" } }));
  const m = turnOptions(monk2, make({ classId: "monk", level: 2 }));
  eq(ids(m.bonus).slice(0, 6), ["martial-arts", "flurry", "patient", "patient-fp", "step", "step-fp"]);
  eq(m.bonus.find((o) => o.id === "flurry").cost, { res: "focus", n: 1 });
  eq(ids(m.action).includes("breath"), true, "Breath Weapon replaces an attack");
  eq(ids(m.reaction).includes("deflect"), false, "Deflect Attacks from level 3");
  eq(turnOptions(run(make({ classId: "monk", level: 5 })), make({ classId: "monk", level: 5 })).attacks, 2);
  const lar = make({ classId: "barbarian", speciesId: "goliath", speciesChoice: { giant: "cloud" } });
  const lb = turnOptions(run(lar), lar);
  eq(ids(lb.bonus).slice(0, 2), ["rage", "cloud-jaunt"]);
  eq(lb.bonus[0].set, { rage: true });
  const raging = { ...lar, active: { rage: true } };
  eq(ids(turnOptions(run(raging), raging).bonus)[0], "rage-extend");
  const sat = wl({ level: 2, classOptions: { invocations: ["armor-of-shadows", "agonizing-blast@eldritch-blast", "pact-of-the-chain"] }, spellPicks: { cantrips: ["eldritch-blast", "prestidigitation"], prepared: ["hex", "hellish-rebuke", "charm-person"] } });
  const so = turnOptions(run(sat), sat);
  eq([ids(so.bonus).includes("spell:hex"), ids(so.reaction).includes("spell:hellish-rebuke"), ids(so.action).includes("spell:eldritch-blast")], [true, true, true]);
  eq(so.bonus.find((o) => o.id === "spell:hex").cost, { spell: { circle: 1, free: null } });
  eq(so.action.find((o) => o.id === "spell:mage-armor").cost, null, "Armor of Shadows: no slot");
  eq(ids(so.action).includes("spell:find-familiar"), false, "1-hour ritual casting isn't a combat action");
  const tips = turnTips(run(raging), raging, { round: 1, action: null, bonus: null, reaction: null, moved: 2 }, turnOptions(run(raging), raging));
  eq([tips.movement.total, tips.movement.left, tips.tips.some((x) => x.kind === "warn" && x.text.en.includes("raging"))], [7, 25, false], "no warning before acting");
  const t2 = turnTips(run(raging), raging, { round: 1, action: { id: "dash", fx: ["dash"] }, bonus: null, reaction: null, moved: 0 }, turnOptions(run(raging), raging));
  eq([t2.movement.total, t2.tips.some((x) => x.kind === "warn" && x.text.en.includes("raging"))], [14, true], "Dash doubles movement; raging without attacking");
});

test("import from an old character page: state, picks, equipment, journal, questions, differences", () => {
  const build = wl({ id: "page-x", name: "Test", level: 1, armor: "leather", classOptions: { invocations: ["armor-of-shadows"] }, spellPicks: { cantrips: ["eldritch-blast", "prestidigitation"], prepared: ["hex", "charm-person"] } });
  const data = { app: "gnoll-rpg-page", version: 1, page: "Test", build, shown: { hpMax: 20, ac: 13 },
    state: { level: 2, hp: { cur: 7, max: 20, temp: 2 }, death: { ok: 1, fail: 0 }, gold: { gp: "23", sp: 4 }, armor: "mage", conc: "Hex",
      levels: { 2: { hp: 5, cant: ["Eldritch Blast", "Prestidigitation"], prep: ["Hex", "Charm Person", "Hellish Rebuke"], inv: ["armor", "agonizing:Eldritch Blast", "chain"] } },
      res: { pact: { cur: 1, max: 2 }, cunning: { cur: 0, max: 1 }, hd: { cur: 1, max: 2 }, nonsense: { cur: 0, max: 3 } } },
    items: [{ id: "b", name: "Lina", qty: 1, order: 2 }, { id: "a", name: "Sztylet", qty: 2, note: "1d4", order: 1 }],
    sessions: [{ id: "s1", title: "Sesja 1", body: "Loch", created: 1790795092149, date: "" }],
    questions: [{ text: "Kto?", group: "gm", order: 1, done: true, answer: "Jeleń" }, { text: "Gdzie?", group: "gra", order: 1 }] };
  const { isPageExport, fromPage } = PAGE;
  eq(isPageExport(data), true);
  const { ch, report } = fromPage(data);
  const c = run(ch);
  eq([ch.level, ch.hpRolls, c.hpMax, ch.hp.cur, ch.hp.temp], [2, { 2: 5 }, 8 + 1 + 5 + 1, 7, 2]);
  eq([ch.classOptions.invocations, ch.spellPicks.prepared], [["armor-of-shadows", "agonizing-blast@eldritch-blast", "pact-of-the-chain"], ["hex", "charm-person", "hellish-rebuke"]]);
  eq([c.review.errors.length, c.review.todo.filter((x) => ["todo.classOption", "todo.spellPick"].includes(x.key)).length], [0, 0], "the level 2 picks are complete");
  eq(ch.used, { slot1: 1, cunning: 1 }, "page resources mapped, unknown ones skipped");
  eq([ch.gold.gp, ch.gold.sp, ch.concentration, c.active.mageArmor, c.ac.value], [23, 4, "hex", true, 15]);
  eq(ch.items.map((x) => x.name), ["Sztylet", "Lina"]);
  eq([ch.journal[0].title, ch.journal[0].date], ["Sesja 1", "2026-09-30"]);
  eq(ch.notes.includes("- [x] Kto?\n  Odpowiedź: Jeleń") && ch.notes.includes("- [ ] Gdzie?"), true);
  eq(report.notes.map((n) => [n.key, n.vars]), [["imp.levelChanged", { from: 1, to: 2 }], ["imp.hpDiff", { page: 20, app: 15 }], ["imp.acDiff", { page: 13, app: 15 }]]);
});

// --- Bard, Druid, Wizard (PHB ch. 3; College of Spirits from The Horrors Within) ---
const todoKeys = (c) => keys(c.review.todo);
test("Bard: any 3 skills, 3 instruments, Bardic Inspiration, Expertise and Jack of All Trades from level 2", () => {
  const b = (over = {}) => run(make({ classId: "bard", speciesId: "dwarf", abilityBase: { str: 8, dex: 14, con: 12, int: 13, wis: 10, cha: 15 }, ...over }));
  const b1 = b();
  eq([b1.slots.find((s) => s.id === "class").count, b1.slots.find((s) => s.id === "class").from], [3, null]);
  eq([b1.toolSlots.find((s) => s.id === "class").count, b1.toolSlots.find((s) => s.id === "class").from.includes("lute")], [3, true]);
  eq([b1.expertiseMax, b1.resources.find((r) => r.id === "bardic-inspiration").max, b1.resources.find((r) => r.id === "bardic-inspiration").recharge], [0, 2, "long"]);
  eq(src(b1, "class").picks.map((p) => p.count), [2, 4]);
  const b2 = b({ level: 2 });
  eq(b2.expertiseMax, 2);
  eq(b2.skills.find((s) => s.id === "athletics").value, -1 + 1, "STR 8 (−1) + half of PB 2");
  eq(b({ level: 2, skills: ["athletics"] }).skills.find((s) => s.id === "athletics").value, -1 + 2, "proficient: no Jack of All Trades on top");
  const b5 = b({ level: 5 });
  eq([b5.resources.find((r) => r.id === "bardic-inspiration").recharge, b5.resources.find((r) => r.id === "bardic-inspiration").name.en], ["short", "Bardic Inspiration (d8)"], "Font of Inspiration, d8");
});
test("Bard colleges: Lore skills, Valor armor, Dance AC, Glamour spells, Spirits only in Ravenloft", () => {
  const b = (subclass, over = {}) => run(make({ classId: "bard", level: 3, subclass, speciesId: "dwarf", abilityBase: { str: 8, dex: 14, con: 12, int: 13, wis: 10, cha: 15 }, ...over }));
  eq(b("lore").slots.find((s) => s.id === "lore").count, 3);
  eq(fitSkills(["arcana", "history", "nature", "religion", "stealth", "survival"], b("lore").slots).ok, true, "3 class + 3 Lore");
  eq(["medium", "shield"].every((x) => b("valor").training.includes(x)), true);
  const dance = { abilityBase: { str: 8, dex: 14, con: 15, int: 13, wis: 10, cha: 12 } };
  eq(b("dance", dance).ac.value, 10 + 2 + 1, "10 + DEX + CHA");
  eq(b("dance", { ...dance, shield: true }).ac.value, 10 + 2 + 2, "a shield turns Dazzling Footwork off: 10 + DEX + shield");
  eq(src(b("glamour"), "class").fixed.filter((x) => x.kind === "always").map((x) => x.id), ["charm-person", "mirror-image"]);
  eq(errKeys(b("spirits")).includes("err.ravenloftOnly"), true);
  const sp = b("spirits", { setting: "ravenloft" });
  eq([src(sp, "class").fixed.map((x) => x.id), src(sp, "class").picks[0].count, sp.toolIds.includes("cards")], [["guidance"], 2, true], "Guidance outside the cantrip limit");
});
test("Druid: Druidic, Speak with Animals, Primal Order", () => {
  const d = (over = {}) => run(make({ classId: "druid", speciesId: "dwarf", ...over }));
  const d1 = d();
  eq([d1.languages.known, d1.toolIds, d1.saves.int.prof, d1.training], [["common", "druidic"], ["herbalism"], true, ["light", "shield"]]);
  eq(src(d1, "class").fixed.map((x) => [x.id, x.kind]), [["speak-with-animals", "always"]]);
  eq(src(d1, "class").picks[0].count, 3, "Magician (default): +1 cantrip");
  eq(d1.skills.find((s) => s.id === "nature").value, 0 + 2, "INT 10 + WIS 14 → +2 (Magician)");
  const w = d({ classChoices: { order: "warden" } });
  eq([w.training.includes("medium"), src(w, "class").picks[0].count, w.skills.find((s) => s.id === "nature").value], [true, 2, 0]);
});
test("Wild Shape: uses, known forms, CR limit, Circle of the Moon", () => {
  const d = (over = {}) => run(make({ classId: "druid", speciesId: "dwarf", ...over }));
  eq(d().classOptions.length, 0, "no Wild Shape at level 1");
  const d2 = d({ level: 2, classOptions: { forms: ["wolf", "cat", "rat", "brown-bear"] } });
  eq([d2.resources.find((r) => r.id === "wild-shape").max, d2.classOptions[0].count], [2, 4]);
  eq(optErr(d2), 1, "Brown Bear (CR 1) is too much at level 2");
  eq(d({ level: 4, classOptions: { forms: ["ape"] } }).classOptions[0].count, 6);
  eq(optErr(d({ level: 4, classOptions: { forms: ["ape"] } })), 0, "CR 1/2 from level 4");
  eq(optErr(d({ level: 3, subclass: "land", classOptions: { forms: ["ape"] } })), 1, "Land: still CR 1/4 at level 3");
  const moon = d({ level: 3, subclass: "moon", classOptions: { forms: ["brown-bear", "wolf", "cat", "rat"] }, active: { wildShape: "brown-bear" } });
  eq([optErr(moon), moon.wildShape.ac, moon.wildShape.tempHp], [0, 13 + 2, 9], "Moon: CR 1, AC 13 + WIS, 3 × level temp HP");
  eq(moon.ac.value, 15, "the sheet shows the form's AC");
  eq(d({ level: 2, classOptions: { forms: ["wolf"] }, active: { wildShape: "wolf" } }).wildShape.ac, 12, "the Beast's own AC");
  eq(d({ level: 2, classOptions: { forms: ["wolf"] }, active: { wildShape: "tiger" } }).wildShape, null, "only a known form");
  const ch = make({ classId: "druid", speciesId: "dwarf", level: 2, classOptions: { forms: ["wolf", "cat"] } });
  const t = turnOptions(run(ch), ch);
  eq([t.bonus.filter((o) => o.id.startsWith("ws-")).map((o) => o.set.wildShape), t.bonus[0].cost], [["wolf", "cat"], { res: "wild-shape", n: 1 }]);
  const shifted = { ...ch, active: { wildShape: "wolf" }, spellPicks: { cantrips: ["produce-flame"], prepared: ["cure-wounds"] } };
  const ts = turnOptions(run(shifted), shifted);
  eq([ts.action.some((o) => o.id === "beast-attack"), ts.action.some((o) => o.group === "spell"), ts.bonus.some((o) => o.id === "ws-leave")], [true, false, true], "no spells in Wild Shape");
});
test("Druid circles: Land spells follow the land, Moon and Sea spells, Star Map", () => {
  const d = (subclass, over = {}) => run(make({ classId: "druid", level: 5, subclass, speciesId: "dwarf", ...over }));
  const always = (c) => src(c, "class").fixed.filter((x) => x.kind === "always").map((x) => x.id);
  eq(always(d("land")), ["speak-with-animals", "misty-step", "shocking-grasp", "sleep", "lightning-bolt"], "temperate by default");
  eq(always(d("land", { classChoices: { land: "arid" } })), ["speak-with-animals", "blur", "burning-hands", "fire-bolt", "fireball"]);
  eq(always(d("moon")), ["speak-with-animals", "cure-wounds", "moonbeam", "starry-wisp", "conjure-animals"]);
  eq(always(d("sea")).length, 1 + 7);
  const st = d("stars");
  eq([st.resources.find((r) => r.id === "star-map").max, src(st, "class").fixed.find((x) => x.id === "guiding-bolt").free], [2, "star-map"]);
});
test("Wizard: spellbook of 6 + 2 per level, prepared spells only from the book, rituals from the book", () => {
  const w = (over = {}) => run(make({ classId: "wizard", speciesId: "dwarf", ...over }));
  const w1 = w();
  eq(src(w1, "class").picks.map((p) => [p.key, p.count]), [["cantrips", 3], ["book", 6], ["prepared", 4]]);
  eq(src(w({ level: 5 }), "class").picks.find((p) => p.key === "book").count, 14);
  const book = ["magic-missile", "shield", "mage-armor", "detect-magic", "sleep", "find-familiar"];
  const s = src(w({ spellPicks: { book, prepared: ["magic-missile", "shield", "sleep", "fire-bolt"] } }), "class");
  eq(s.picks.find((p) => p.key === "prepared").options, ["detect-magic", "find-familiar", "mage-armor", "magic-missile", "shield", "sleep"]);
  eq(s.picks.find((p) => p.key === "prepared").invalid, ["fire-bolt"]);
  eq(s.spells.filter((x) => x.kind === "book").map((x) => [x.id, x.uses]), [["detect-magic", "ritual"], ["find-familiar", "ritual"]], "unprepared Rituals from the book");
  eq(s.spells.some((x) => x.id === "mage-armor"), false, "an unprepared non-ritual spell can't be cast");
});
test("Wizard: Scholar Expertise from its list, school savant picks, Illusionist's Minor Illusion", () => {
  const w = (over = {}) => run(make({ classId: "wizard", speciesId: "dwarf", skills: ["arcana", "insight"], ...over }));
  eq(w({ level: 2 }).expertiseMax, 1);
  eq(errKeys(w({ level: 2, expertise: ["insight"] })).includes("err.expertiseFrom"), true, "Insight isn't a Scholar skill");
  eq(w({ level: 2, expertise: ["arcana"] }).skills.find((s) => s.id === "arcana").expert, true);
  const ev = src(w({ level: 3, subclass: "evoker" }), "class");
  const sav = ev.picks.find((p) => p.key === "savant");
  eq([sav.count, sav.options.every((id) => SPELLS[id].school === "evo" && SPELLS[id].circle <= 2)], [2, true]);
  eq(src(w({ level: 5, subclass: "evoker" }), "class").picks.find((p) => p.key === "savant5").options.includes("fireball"), true);
  const il = src(w({ level: 3, subclass: "illusionist" }), "class");
  eq([il.fixed.map((x) => x.id), il.picks[0].count, il.picks[0].options.includes("minor-illusion")], [["minor-illusion"], 3, false]);
});
test("Bard, Druid and Wizard characters can be completed", () => {
  const base = { speciesId: "dwarf", size: "medium", alignment: "NG", languages: ["elvish", "giant"], name: "Test" };
  const bard = run(make({ ...base, classId: "bard", background: "wayfarer", bgIncrease: { mode: "21", plus2: "cha", plus1: "dex" },
    skills: ["performance", "persuasion", "deception"], toolPicks: { class: ["lute", "flute", "drum"] },
    spellPicks: { cantrips: ["vicious-mockery", "dancing-lights"], prepared: ["charm-person", "healing-word", "dissonant-whispers", "faerie-fire"] } }));
  eq([todoKeys(bard), bard.review.errors.map((x) => x.key)], [[], []], "Bard 1");
  const druid = run(make({ ...base, classId: "druid", level: 2, background: "hermit", bgIncrease: { mode: "21", plus2: "wis", plus1: "con" },
    skills: ["nature", "perception"], classOptions: { forms: ["wolf", "cat", "rat", "riding-horse"] },
    spellPicks: { cantrips: ["druidcraft", "produce-flame", "guidance"], prepared: ["cure-wounds", "entangle", "faerie-fire", "thunderwave", "goodberry"] } }));
  eq([todoKeys(druid), druid.review.errors.map((x) => x.key)], [[], []], "Druid 2");
  const wiz = run(make({ ...base, classId: "wizard", level: 3, subclass: "evoker", background: "criminal", bgIncrease: { mode: "21", plus2: "int", plus1: "con" },
    skills: ["arcana", "history"], expertise: ["arcana"],
    spellPicks: { cantrips: ["fire-bolt", "mage-hand", "light"], book: ["magic-missile", "shield", "mage-armor", "detect-magic", "sleep", "thunderwave", "feather-fall", "find-familiar", "misty-step", "scorching-ray"],
      savant: ["burning-hands", "shatter"], prepared: ["magic-missile", "shield", "mage-armor", "sleep", "misty-step", "shatter"] } }));
  eq([todoKeys(wiz), wiz.review.errors.map((x) => x.key)], [[], []], "Wizard 3");
  eq([wiz.spells.dc, wiz.hpMax], [8 + 1 + 2, 6 + 2 + 2 * (4 + 2) + 3], "INT 12; CON 14, two fixed 4s, Dwarven Toughness +1 per level");
});

const featBlockedKeys = (ch) => errKeys(run(ch)).filter((k) => k === "err.featPrereq");
// --- Weapons and Weapon Mastery (PHB ch. 6); Fighter, Paladin, Ranger (ch. 3); Hollow Warden (The Horrors Within) ---
test("weapon table: 38 weapons with damage, properties, mastery and cost from chapter 6", () => {
  eq(Object.keys(WEAPONS).length, 38);
  const w = (id) => WEAPONS[id];
  eq([w("longsword").dice, w("longsword").props.versatile, w("longsword").mastery, w("longsword").cost], ["1d8", "1d10", "sap", 15]);
  eq([w("dagger").props.finesse, w("dagger").props.light, w("dagger").props.thrown, w("dagger").mastery], [true, true, "20/60", "nick"]);
  eq([w("longbow").ranged, w("longbow").props.heavy, w("longbow").props.ammo, w("longbow").mastery], [true, true, "150/600", "slow"]);
  eq([w("greatsword").dice, w("greataxe").mastery, w("whip").props.reach, w("pistol").cost], ["2d6", "cleave", true, 250]);
});
test("weapon attacks: ability, proficiency, Fighting Styles, Monk weapons, Rage", () => {
  const base = { classId: "fighter", abilityBase: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 } };
  const atk = (over, id) => run(make({ ...base, ...over, weapons: [{ uid: "x", id }] })).attacks[0];
  eq([atk({}, "longsword").hit, atk({}, "longsword").damage.en, atk({}, "longsword").versatile.en], [2 + 2, "1d8+2", "1d10+2"]);
  eq([atk({}, "rapier").ab, atk({}, "shortbow").ab], ["str", "dex"], "finesse picks the better of STR and DEX");
  eq(atk({ featPicks: { style: "archery" } }, "longbow").hit, 2 + 2 + 2, "Archery +2");
  const duel = atk({ featPicks: { style: "dueling" } }, "longsword");
  eq([duel.damage.en, duel.versatile.en], ["1d8+4", "1d10+2"], "Dueling only one-handed");
  eq(atk({ classId: "wizard" }, "longsword").hit, 2, "no proficiency bonus without training");
  eq(atk({ classId: "rogue" }, "rapier").prof, true, "Rogue: Martial Finesse weapons");
  const monk = run(make({ classId: "monk", level: 5, weapons: [{ uid: "q", id: "quarterstaff" }, { uid: "s", id: "shortsword" }] })).attacks;
  eq(monk.map((a) => [a.ab, a.dice]), [["dex", "1d8"], ["dex", "1d8"]], "Martial Arts die and DEX on Monk weapons");
  const barb = run(make({ classId: "barbarian", abilityBase: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 }, weapons: [{ uid: "g", id: "greataxe" }], active: { rage: true } })).attacks[0];
  eq(barb.damage.en, "1d12+4", "STR +2 and Rage +2");
  eq(atk({ abilityBase: { str: 8, dex: 15, con: 14, int: 13, wis: 12, cha: 10 } }, "greatsword").notes.some((n) => n.en.startsWith("Heavy")), true, "Heavy with STR below 13");
});
test("Weapon Mastery: kinds by class, filters, Weapon Master feat", () => {
  const g = (over) => run(make(over)).classOptions.find((x) => x.key === "mastery");
  eq([g({ classId: "fighter" }).count, g({ classId: "fighter", level: 4 }).count, g({ classId: "barbarian" }).count, g({ classId: "paladin" }).count, g({ classId: "ranger" }).count, g({ classId: "rogue" }).count], [3, 4, 2, 2, 2, 2]);
  eq(g({ classId: "monk" }), undefined, "Monks have no Weapon Mastery");
  eq(optErr(run(make({ classId: "barbarian", classOptions: { mastery: ["longbow"] } }))), 1, "Barbarian: melee weapons only");
  eq(optErr(run(make({ classId: "rogue", classOptions: { mastery: ["longsword"] } }))), 1, "Rogue: no Longsword");
  eq(optErr(run(make({ classId: "rogue", classOptions: { mastery: ["rapier", "shortbow"] } }))), 0);
  const c = run(make({ classId: "fighter", classOptions: { mastery: ["longsword"] }, weapons: [{ uid: "a", id: "longsword" }, { uid: "b", id: "dagger" }] }));
  eq(c.attacks.map((a) => a.mastery?.id || null), ["sap", null]);
  const wm = run(make({ classId: "wizard", level: 4, levelChoices: { 4: { kind: "feat", feat: "weapon-master", inc: "dex" } } }));
  eq(wm.classOptions.find((x) => x.key === "mastery").count, 1, "Weapon Master gives a Wizard one kind");
});
test("Fighter: Fighting Style, Second Wind, Action Surge, Defense", () => {
  const f = (over = {}) => run(make({ classId: "fighter", ...over }));
  const f1 = f();
  eq([f1.featSlots.find((s) => s.id === "style").step, f1.resources.find((r) => r.id === "second-wind").max, f1.resources.some((r) => r.id === "action-surge")], [5, 2, false]);
  eq(keys(f1.review.todo).includes("todo.feat"), true, "pick a Fighting Style");
  eq(errKeys(f({ featPicks: { style: "alert" } })).includes("err.featCategory"), true, "an Origin feat isn't a style");
  eq(errKeys(f({ featPicks: { style: "blessed-warrior" } })).includes("err.featCategory"), true, "Blessed Warrior is for Paladins");
  eq([f({ armor: "chain-mail" }).ac.value, f({ armor: "chain-mail", featPicks: { style: "defense" } }).ac.value, f({ featPicks: { style: "defense" } }).ac.value], [16, 17, 10 + 2], "Defense only in armor");
  const f4 = f({ level: 4 });
  eq([f4.resources.find((r) => r.id === "second-wind").max, f4.resources.find((r) => r.id === "action-surge").recharge], [3, "short"]);
  eq(f({ level: 5 }).classFeatures.some((x) => x.id === "extra-attack"), true);
  eq(turnOptions(f({ level: 5 }), make({ classId: "fighter", level: 5 })).attacks, 2);
  eq(featBlockedKeys(make({ classId: "fighter", level: 4, levelChoices: { 4: { kind: "feat", feat: "archery" } } })), [], "Fighting Style feats at level 4");
  eq(featBlockedKeys(make({ classId: "wizard", level: 4, levelChoices: { 4: { kind: "feat", feat: "archery" } } })), ["err.featPrereq"]);
});
test("Fighter subclasses: Battle Master, Eldritch Knight, Psi Warrior, Champion", () => {
  const f = (subclass, over = {}) => run(make({ classId: "fighter", level: 3, subclass, ...over }));
  const bm = f("battle-master");
  eq([bm.classOptions.find((g) => g.key === "maneuvers").count, bm.resources.find((r) => r.id === "superiority").max, bm.toolSlots.some((s) => s.id === "subclass"), bm.slots.some((s) => s.id === "student-of-war")], [3, 4, true, true]);
  const ek = src(f("eldritch-knight"), "class");
  eq([ek.list, ek.picks.map((p) => p.count)], ["wizard", [2, 3]]);
  eq(f("psi-warrior").resources.find((r) => r.id === "psi").max, 4);
  eq(f("psi-warrior", { level: 5 }).resources.find((r) => r.id === "psi").name.en, "Psionic Energy Dice (d8)");
  eq(f("champion").initiativeAdv, true);
});
test("Paladin: Lay on Hands, no cantrips, Divine Smite free once, Blessed Warrior, Channel Divinity", () => {
  const p = (over = {}) => run(make({ classId: "paladin", ...over }));
  const p1 = p();
  eq([p1.resources.find((r) => r.id === "lay-on-hands").max, src(p1, "class").picks.map((x) => x.key), p1.featSlots.some((s) => s.id === "style")], [5, ["prepared"], false]);
  const p2 = p({ level: 2 });
  eq(src(p2, "class").fixed.map((x) => [x.id, x.free]), [["divine-smite", "smite-free"]]);
  eq(p2.resources.find((r) => r.id === "smite-free").max, 1);
  const bw = p({ level: 2, featPicks: { style: "blessed-warrior" }, featChoices: { "blessed-warrior": { picks: { cantrips: ["guidance", "sacred-flame"] } } } });
  const bs = src(bw, "feat-blessed-warrior");
  eq([bs.ability, bs.spells.map((x) => x.id), bw.review.errors.length], ["cha", ["guidance", "sacred-flame"], 0]);
  eq(p({ level: 3 }).resources.find((r) => r.id === "channel").max, 2);
  const p5 = p({ level: 5, subclass: "devotion" });
  eq([src(p5, "class").fixed.map((x) => x.id), p5.resources.filter((r) => r.slot).map((r) => r.max)], [["divine-smite", "find-steed", "protection-from-evil-and-good", "shield-of-faith", "aid", "zone-of-truth"], [4, 2]]);
  const sm = turnOptions(p2, make({ classId: "paladin", level: 2 })).bonus.find((o) => o.id === "spell:divine-smite");
  eq(sm.cost, { spell: { circle: 1, free: "smite-free" } }, "the free Divine Smite comes first");
});
test("Ranger: Favored Enemy, Deft Explorer, Druidic Warrior, subclasses", () => {
  const r = (over = {}) => run(make({ classId: "ranger", ...over }));
  const r1 = r();
  eq([src(r1, "class").fixed.map((x) => [x.id, x.free]), r1.resources.find((x) => x.id === "favored-enemy").max, r1.expertiseMax, r1.languages.total], [[["hunters-mark", "favored-enemy"]], 2, 0, 2]);
  const r2 = r({ level: 2 });
  eq([r2.expertiseMax, r2.languages.total, r2.featSlots.find((s) => s.id === "style").options.includes("druidic-warrior")], [1, 4, true], "Expertise and 2 languages");
  eq(r({ level: 5 }).resources.find((x) => x.id === "favored-enemy").max, 3);
  const gs = r({ level: 3, subclass: "gloom-stalker", speciesId: "dwarf" });
  eq([gs.darkvision, gs.initiative], [120 + 60, 2 + 2], "Dwarf 120 + 60; DEX + WIS");
  eq(r({ level: 3, subclass: "gloom-stalker" }).darkvision, 60, "Human: 60");
  const fw = r({ level: 3, subclass: "fey-wanderer" });
  eq([fw.skills.find((s) => s.id === "persuasion").value, fw.slots.some((s) => s.id === "otherworldly-glamour")], [-1 + 2, true], "CHA −1 + WIS +2");
  eq(errKeys(r({ level: 3, subclass: "hollow-warden" })).includes("err.ravenloftOnly"), true);
  eq(src(r({ setting: "ravenloft", level: 5, subclass: "hollow-warden" }), "class").fixed.map((x) => x.id), ["hunters-mark", "wrathful-smite", "alter-self"]);
  eq(r({ level: 3, subclass: "beast-master", classChoices: { companion: "sky" } }).subclassFeatures[0].text.en.includes("Fly 60 ft"), true);
});
test("Fighter, Paladin and Ranger characters can be completed", () => {
  const base = { speciesId: "dwarf", size: "medium", alignment: "LG", languages: ["elvish", "giant"], name: "Test", abilityBase: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 } };
  const fighter = run(make({ ...base, classId: "fighter", background: "soldier", bgIncrease: { mode: "21", plus2: "str", plus1: "con" }, toolPicks: { bg: ["dice"] },
    skills: ["perception", "survival"], featPicks: { style: "defense" }, classOptions: { mastery: ["longsword", "longbow", "greatsword"] },
    armor: "chain-mail", weapons: [{ uid: "1", id: "longsword" }, { uid: "2", id: "longbow" }] }));
  eq([todoKeys(fighter), fighter.review.errors.map((x) => x.key)], [[], []], "Fighter 1");
  eq([fighter.ac.value, fighter.attacks.map((a) => a.hit)], [17, [3 + 2, 2 + 2]]);
  const paladin = run(make({ ...base, classId: "paladin", level: 2, background: "acolyte", bgIncrease: { mode: "21", plus2: "cha", plus1: "wis" },
    featChoices: { "magic-initiate-cleric": { ability: "wis", picks: { cantrips: ["guidance", "light"], spell: ["bless"] } } },
    skills: ["athletics", "persuasion"], featPicks: { style: "great-weapon-fighting" }, classOptions: { mastery: ["greatsword", "javelin"] },
    spellPicks: { prepared: ["heroism", "searing-smite", "cure-wounds"] } }));
  eq([todoKeys(paladin), paladin.review.errors.map((x) => x.key)], [[], []], "Paladin 2");
  const ranger = run(make({ ...base, classId: "ranger", level: 2, background: "wayfarer", bgIncrease: { mode: "21", plus2: "dex", plus1: "wis" },
    languages: ["elvish", "giant", "orc", "sylvan"], skills: ["athletics", "nature", "survival"], expertise: ["survival"],
    featPicks: { style: "druidic-warrior" }, featChoices: { "druidic-warrior": { picks: { cantrips: ["guidance", "starry-wisp"] } } }, classOptions: { mastery: ["longbow", "shortsword"] },
    spellPicks: { prepared: ["ensnaring-strike", "cure-wounds", "goodberry"] } }));
  eq([todoKeys(ranger), ranger.review.errors.map((x) => x.key)], [[], []], "Ranger 2");
});

// --- Account sync (D1): merging device and cloud, newer change wins ---
const sc = (id, updated, extra = {}) => ({ id, updated, abilities: {}, classId: "monk", ...extra });
test("sync: first sign-in sends every character from the device", () => {
  const p = MERGE.plan([sc("a", 5), sc("b", 7)], {}, {});
  eq(p.push.map((c) => c.id), ["a", "b"]); eq([p.put, p.drop, p.pushGone], [[], [], []]);
});
test("sync: newer cloud copy replaces the device copy, older one is overwritten", () => {
  const p = MERGE.plan([sc("a", 5), sc("b", 9)], {}, { a: { updated: 8, deleted: false, ch: sc("a", 8, { name: "cloud" }) }, b: { updated: 3, deleted: false, ch: sc("b", 3) } });
  eq(p.put.map((c) => [c.id, c.name]), [["a", "cloud"]]); eq(p.push.map((c) => c.id), ["b"]);
});
test("sync: character only in the cloud comes to the device; equal times do nothing", () => {
  const p = MERGE.plan([sc("a", 5)], {}, { a: { updated: 5, deleted: false, ch: sc("a", 5) }, n: { updated: 1, deleted: false, ch: sc("n", 1) } });
  eq([p.put.map((c) => c.id), p.push, p.drop, p.pushGone], [["n"], [], [], []]);
});
test("sync: deletions travel both ways, the later change wins", () => {
  // Deleted in the cloud after the device's last edit: delete here.
  eq(MERGE.plan([sc("a", 5)], {}, { a: { updated: 6, deleted: true, ch: null } }).drop, ["a"]);
  // Edited here after it was deleted elsewhere: the edit wins and goes back up.
  eq(MERGE.plan([sc("a", 9)], {}, { a: { updated: 6, deleted: true, ch: null } }).push.map((c) => c.id), ["a"]);
  // Deleted here (maybe offline) after the cloud's version: send the deletion.
  eq(MERGE.plan([], { a: 10 }, { a: { updated: 6, deleted: false, ch: sc("a", 6) } }).pushGone, [{ id: "a", at: 10 }]);
  // Edited elsewhere after the local deletion: it comes back.
  eq(MERGE.plan([], { a: 4 }, { a: { updated: 6, deleted: false, ch: sc("a", 6) } }).put.map((c) => c.id), ["a"]);
});
test("sync: cloud documents round-trip; broken ones are ignored", () => {
  const ch = sc("abc-1", 42, { name: "Grok", hp: { cur: 3 } });
  eq(MERGE.fromDoc(MERGE.toDoc(ch)), { updated: 42, deleted: false, ch });
  eq(MERGE.fromDoc(MERGE.goneDoc(7)), { updated: 7, deleted: true, ch: null });
  eq(MERGE.fromDoc({ json: "{oops", updated: 1, deleted: false }), null);
  eq(MERGE.fromDoc({ json: JSON.stringify({ id: "x" }), updated: 1, deleted: false }), null);
  eq([MERGE.syncableId("a/b"), MERGE.syncableId(crypto.randomUUID())], [false, true]);
});
test("store: saving and deleting tell the sync, cloud changes do not echo back", () => {
  mem.clear();
  const seen = [];
  const off = STORE.onChange((e) => seen.push(e.type + ":" + (e.ch ? e.ch.id : e.id)));
  STORE.upsert(sc("a", 0)); STORE.remove("a");
  eq(seen, ["put:a", "del:a"]); eq(typeof STORE.gone().a, "number");
  STORE.applyRemote([sc("a", 3), sc("b", 4)], []);
  eq(seen.length, 2, "no echo"); eq(STORE.gone().a, undefined, "deletion mark cleared");
  eq(STORE.loadAll().map((c) => [c.id, c.updated]), [["a", 3], ["b", 4]]);
  STORE.applyRemote([], ["b"]); eq(STORE.loadAll().map((c) => c.id), ["a"]);
  off(); mem.clear();
});

test("store: every account has its own characters on the device", () => {
  mem.clear();
  STORE.upsert(sc("guest-1", 0));
  eq(STORE.knownOwner("uidAAAA"), false);
  STORE.setOwner("uidAAAA");
  eq([STORE.loadAll().length, STORE.knownOwner("uidAAAA")], [0, true], "new account starts empty");
  const sent = []; const off = STORE.onChange((e) => sent.push(e.ch.id));
  eq(STORE.moveGuestCharacters(), 1); off();
  eq([STORE.loadAll().map((c) => c.id), STORE.guestCharacters().length, sent], [["guest-1"], 0, ["guest-1"]], "moved and sent to the cloud");
  STORE.upsert(sc("a-2", 0)); STORE.remove("guest-1");
  STORE.setOwner("uidBBBB");
  eq([STORE.loadAll().length, Object.keys(STORE.gone()).length], [0, 0], "other account sees nothing of A");
  STORE.upsert(sc("b-1", 0));
  STORE.setOwner("");
  eq(STORE.loadAll().length, 0, "signed out: no-account list");
  STORE.setOwner("uidAAAA");
  eq([STORE.loadAll().map((c) => c.id), Object.keys(STORE.gone())], [["a-2"], ["guest-1"]], "back to A as it was");
  eq(STORE.currentOwner(), "uidAAAA"); eq(mem.get("gnoll.account"), "uidAAAA", "remembered for the next start");
  STORE.setOwner(""); mem.clear();
});

// --- Teams (D2): invite links, statuses, who may do what ---
test("team: invite codes are long, random-looking and survive a link round-trip", () => {
  const code = TEAM.makeCode(new Uint8Array(20).map((_, i) => i * 13));
  eq([code.length, TEAM.validCode(code), TEAM.validCode(TEAM.makeCode())], [20, true, true]);
  eq(TEAM.makeCode() === TEAM.makeCode(), false, "two codes differ");
  const link = TEAM.inviteLink("https://dawidrd.github.io/Gnoll-RPG/#/team/abc", code);
  eq(link, `https://dawidrd.github.io/Gnoll-RPG/#/join/${code}`);
  eq([TEAM.codeFrom(link), TEAM.codeFrom("  " + code + " "), TEAM.codeFrom("hello"), TEAM.codeFrom("#/join/a/b")], [code, code, "", ""]);
  eq([TEAM.validCode("short"), TEAM.validCode("a".repeat(16) + "/x"), TEAM.validCode(null)], [false, false, false]);
});
test("team: my status follows my request and membership", () => {
  const s = TEAM.teamStatus;
  eq(s({ state: "asked", member: false, request: true }), "asked");
  eq(s({ state: "asked", member: true, request: false }), "in", "accepted");
  eq(s({ state: "asked", member: false, request: false }), "rejected");
  eq(s({ state: "in", member: false, request: false }), "removed", "removed or team deleted");
  eq([s({ state: "in", member: null, request: null }), s({ state: "asked", member: false, request: null })], ["checking", "checking"], "offline: unknown");
});
test("team: admins manage others, nobody removes or demotes the founder", () => {
  const owner = { uid: "o", role: "admin" }, adm = { uid: "a", role: "admin" }, pl = { uid: "p", role: "player" };
  eq(TEAM.canManage(owner, pl, "o"), { remove: true, promote: true, demote: false });
  eq(TEAM.canManage(owner, adm, "o"), { remove: true, promote: false, demote: true });
  eq(TEAM.canManage(adm, owner, "o"), { remove: false, promote: false, demote: false }, "founder protected");
  eq(TEAM.canManage(pl, adm, "o"), { remove: false, promote: false, demote: false }, "players manage nobody");
  eq(TEAM.canManage(adm, adm, "o").remove, false, "not yourself (use Leave)");
  eq([TEAM.canLeave("p", "o"), TEAM.canLeave("o", "o")], [true, false]);
});
test("team: names are tidied and members listed admins first", () => {
  eq([TEAM.cleanName("  Kompania   Szarej\nMgły "), TEAM.cleanName("x".repeat(80)).length, TEAM.cleanName(null)], ["Kompania Szarej Mgły", 60, ""]);
  eq(TEAM.sortMembers([{ name: "Zoe", role: "player" }, { name: "Bob", role: "player" }, { name: "Ann", role: "admin" }]).map((m) => m.name), ["Ann", "Bob", "Zoe"]);
});

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
