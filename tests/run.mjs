// Rules tests. Run with: node tests/run.mjs
// No dependencies; each test is a name and a function that throws on failure.
import { compute, blankCharacter, normalize } from "../js/rules/index.js";
import { fitSkills, trimSkills } from "../js/rules/skills.js";
import { pointsSpent } from "../js/rules/identity.js";

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
    bgIncrease: { mode: "21", plus2: "dex", plus1: "wis" }, skills: ["acrobatics", "athletics"], alignment: "ng", languages: ["draconic", "elvish"], toolPicks: { class: ["flute"] } });
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

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
