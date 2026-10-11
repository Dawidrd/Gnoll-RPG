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

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
