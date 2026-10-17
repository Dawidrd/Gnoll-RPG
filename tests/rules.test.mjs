// Security rules tests on the official Firestore emulator (firebase-tools + @firebase/rules-unit-testing).
// Run with: npm run test:rules   (needs Java 11+ and `npm install` once; the app itself needs neither)
// Each test starts from an empty database: alice founds the party "t1" (no character, e.g. the GM),
// bob plays in it, carol is a stranger. ok(...) must be allowed by firestore.rules, no(...) refused.
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds as ok, assertFails as no } from "@firebase/rules-unit-testing";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { compute, blankCharacter } from "../js/rules/index.js";
import { gmSummary } from "../js/sync/partylogic.js";

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-gnoll",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
after(() => env?.cleanup());
beforeEach(() => env.clearFirestore());
firebase.firestore.setLogLevel("silent"); // refusals the tests expect would otherwise fill the log

const DELETE = () => firebase.firestore.FieldValue.delete();
const CODE = "Inv1te0Code0Alpha00X", CODE2 = "Inv1te0Code0Bravo00Y";
const chDoc = (n = 1) => ({ json: "{}", updated: n, deleted: false });
const sheetOk = { species: "dwarf", cls: "fighter", sub: "", level: 3, hp: 7, hpMax: 28, temp: 0, ac: 16 };
const fighter = () => Object.assign(blankCharacter(), { classId: "fighter" });
const gmOk = () => gmSummary(fighter(), compute(fighter()));

/** One user's view of the database (null = not signed in), with short names for the calls the app makes. */
function as(uid) {
  const db = (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
  const doc = (p) => db.doc(p);
  return {
    get: (p) => doc(p).get(),
    list: (p) => db.collection(p).get(),
    set: (p, d) => doc(p).set(d),
    update: (p, d) => doc(p).update(d),
    delete: (p) => doc(p).delete(),
    /** [["set"|"update"|"delete", path, data?]], all or nothing */
    batch(writes) {
      const b = db.batch();
      for (const [kind, p, d] of writes) kind === "delete" ? b.delete(doc(p)) : kind === "set" ? b.set(doc(p), d) : b.update(doc(p), d);
      return b.commit();
    },
  };
}
/** Is a document there? (read with the rules switched off) */
async function exists(path) {
  let found = false;
  await env.withSecurityRulesDisabled(async (ctx) => { found = (await ctx.firestore().doc(path).get()).exists; });
  return found;
}
async function world({ bobIn = true } = {}) {
  const [alice, bob, carol, nobody] = ["alice", "bob", "carol", null].map(as);
  await ok(alice.batch([
    ["set", "parties/t1", { name: "Kompania", owner: "alice", invite: CODE, created: 1 }],
    ["set", "parties/t1/members/alice", { role: "admin", name: "Alice", charId: "", charName: "", at: 1 }],
    ["set", `invites/${CODE}`, { party: "t1", name: "Kompania" }],
    ["set", "users/alice/parties/t1", { name: "Kompania", state: "in", at: 1 }],
  ]));
  await ok(bob.batch([
    ["set", "parties/t1/requests/bob", { name: "Bob", charId: "b1", charName: "Grok", code: CODE, at: 2 }],
    ["set", "users/bob/parties/t1", { name: "Kompania", state: "asked", at: 2, charId: "b1" }],
  ]));
  if (bobIn) await ok(alice.batch([
    ["set", "parties/t1/members/bob", { role: "player", name: "Bob", charId: "b1", charName: "Grok", at: 3 }],
    ["delete", "parties/t1/requests/bob"],
  ]));
  return { alice, bob, carol, nobody };
}

test("founding a party with a character: party, membership, invite, my list and the GM view in one batch", async () => {
  const dave = as("dave");
  await ok(dave.batch([
    ["set", "parties/t9", { name: "Drużyna", owner: "dave", invite: CODE2, created: 1 }],
    ["set", "parties/t9/members/dave", { role: "admin", name: "Dave", charId: "d1", charName: "Zed", at: 1 }],
    ["set", `invites/${CODE2}`, { party: "t9", name: "Drużyna" }],
    ["set", "users/dave/parties/t9", { name: "Drużyna", state: "in", at: 1, charId: "d1" }],
    ["set", "parties/t9/gm/dave", { v: gmOk(), at: 1 }],
  ]));
  // a stranger still can't slip a GM view into someone else's party
  const { carol } = await world();
  await no(carol.set("parties/t1/gm/carol", { v: gmOk(), at: 1 }));
});

test("anything not listed in the rules is closed", async () => {
  const { alice, nobody } = await world();
  await no(nobody.get("parties/t1"));
  await no(nobody.list("parties"));
  await no(alice.list("parties"));
  await no(alice.set("other/x", { a: 1 }));
  await no(alice.get("users/alice"));
  if (await exists("other/x")) throw new Error("a refused write changed the database");
});

test("only you read and write your characters, in the expected shape", async () => {
  const { alice, bob, nobody } = await world();
  await ok(alice.set("users/alice/characters/c1", chDoc()));
  await no(bob.get("users/alice/characters/c1"));
  await no(bob.list("users/alice/characters"));
  await no(nobody.get("users/alice/characters/c1"));
  await no(bob.set("users/alice/characters/c2", chDoc()));
  await no(bob.delete("users/alice/characters/c1"));
  await no(alice.set("users/alice/characters/c3", { ...chDoc(), extra: 1 }));
  await no(alice.set("users/alice/characters/c3", { json: "{}", updated: "1", deleted: false }));
  await no(alice.set("users/alice/characters/c3", { json: "x".repeat(900000), updated: 1, deleted: false }));
  await ok(alice.list("users/alice/characters"));
  await ok(alice.delete("users/alice/characters/c1"));
});

test("founding a party needs your own admin seat; nobody founds one for someone else", async () => {
  const { bob, carol } = await world();
  await no(carol.set("parties/t9", { name: "X", owner: "carol", invite: CODE2, created: 1 }));
  await no(carol.batch([
    ["set", "parties/t9", { name: "X", owner: "bob", invite: CODE2, created: 1 }],
    ["set", "parties/t9/members/carol", { role: "admin", name: "C", charId: "", charName: "", at: 1 }],
  ]));
  await no(carol.set("parties/t1/members/carol", { role: "admin", name: "C", charId: "", charName: "", at: 1 }));
  await no(bob.set(`invites/${CODE2}`, { party: "t1", name: "Kompania" }));
});

test("invites open only by their exact code; requests need a working code", async () => {
  const { alice, bob, carol } = await world({ bobIn: false });
  await ok(carol.get(`invites/${CODE}`));
  await no(carol.list("invites"));
  const ask = (code) => carol.set("parties/t1/requests/carol", { name: "C", charId: "c1", charName: "Mira", code, at: 1 });
  await no(ask(CODE2));
  await no(carol.set("parties/t1/requests/carol", { name: "C", charId: "", charName: "", code: CODE, at: 1 }));
  await no(carol.set("parties/t1/requests/bob", { name: "B", charId: "b1", charName: "Grok", code: CODE, at: 1 }));
  await ok(ask(CODE));
  await ok(carol.get("parties/t1/requests/carol"));
  await no(bob.get("parties/t1/requests/carol"));
  await no(bob.list("parties/t1/requests"));
  await ok(alice.list("parties/t1/requests"));
  await no(bob.delete(`invites/${CODE}`));
  // a new link: the old code stops working
  await ok(alice.batch([["delete", `invites/${CODE}`], ["set", `invites/${CODE2}`, { party: "t1", name: "Kompania" }], ["update", "parties/t1", { invite: CODE2 }]]));
  await ok(carol.delete("parties/t1/requests/carol"));
  await no(ask(CODE));
});

test("only admins accept, and only people who asked; members cannot ask again", async () => {
  const { alice, bob, carol } = await world({ bobIn: false });
  const seat = { role: "player", name: "Bob", charId: "b1", charName: "Grok", at: 3 };
  await no(bob.set("parties/t1/members/bob", seat));
  await no(alice.set("parties/t1/members/carol", { ...seat, name: "C" }));
  await no(alice.set("parties/t1/members/bob", { ...seat, role: "admin" }));
  await ok(alice.set("parties/t1/members/bob", seat));
  await no(bob.set("parties/t1/requests/bob", { name: "Bob", charId: "b1", charName: "Grok", code: CODE, at: 4 }));
  await no(carol.get("parties/t1/members/bob"));
});

test("strangers see nothing of a party", async () => {
  const { alice, carol } = await world();
  await ok(alice.set("parties/t1/notes/n1", { author: "alice", name: "Alice", text: "Smok", at: 1 }));
  await no(carol.get("parties/t1"));
  await no(carol.list("parties/t1/members"));
  await no(carol.get("parties/t1/members/alice"));
  await no(carol.list("parties/t1/notes"));
  await no(carol.get("parties/t1/notes/n1"));
  await no(carol.set("parties/t1/notes/n2", { author: "carol", name: "C", text: "hi", at: 1 }));
});

test("only admins change party info and the marching order, within limits", async () => {
  const { alice, bob } = await world();
  const info = { campaign: "Curse of Strahd", next: "2026-10-23T19:00", march: { mode: "10", order: ["bob"] } };
  await no(bob.update("parties/t1", info));
  await ok(alice.update("parties/t1", info));
  await no(alice.update("parties/t1", { march: { mode: "15", order: [] } }));
  await no(alice.update("parties/t1", { next: "Friday" }));
  await no(alice.update("parties/t1", { campaign: "x".repeat(101) }));
  await no(alice.update("parties/t1", { owner: "bob" }));
  await no(alice.update("parties/t1", { secret: 1 }));
});

test("a member shares only the short character summary, and only their own", async () => {
  const { alice, bob } = await world();
  await ok(bob.update("parties/t1/members/bob", { sheet: sheetOk, charName: "Grok" }));
  await no(alice.update("parties/t1/members/bob", { sheet: { ...sheetOk, hp: 0 } }));
  await no(bob.update("parties/t1/members/bob", { sheet: { ...sheetOk, notes: "secret" } }));
  await no(bob.update("parties/t1/members/bob", { sheet: { ...sheetOk, hp: -5 } }));
  await no(bob.update("parties/t1/members/bob", { role: "admin" }));
  await ok(bob.update("parties/t1/members/bob", { charId: "", charName: "", sheet: DELETE() }));
});

test("roles: nobody removes or demotes the founder; leaving", async () => {
  const { alice, bob, carol } = await world();
  await no(bob.delete("parties/t1/members/alice"));
  await ok(alice.update("parties/t1/members/bob", { role: "admin" }));
  await no(bob.update("parties/t1/members/alice", { role: "player" }));
  await no(bob.delete("parties/t1/members/alice"));
  await no(alice.delete("parties/t1/members/alice"));
  await ok(alice.update("parties/t1/members/bob", { role: "player" }));
  await no(carol.delete("parties/t1/members/bob"));
  await ok(bob.delete("parties/t1/members/bob"));
});

test("party notes are edited by their author; admins may remove any", async () => {
  const { alice, bob, carol } = await world();
  await no(bob.set("parties/t1/notes/n1", { author: "alice", name: "Alice", text: "fake", at: 1 }));
  await ok(bob.set("parties/t1/notes/n1", { author: "bob", name: "Bob", text: "Smok w jaskini", at: 1 }));
  await ok(alice.list("parties/t1/notes"));
  await no(alice.update("parties/t1/notes/n1", { text: "edited", at: 2 }));
  await no(bob.update("parties/t1/notes/n1", { author: "alice" }));
  await no(bob.set("parties/t1/notes/n2", { author: "bob", name: "Bob", text: "", at: 1 }));
  await no(bob.set("parties/t1/notes/n2", { author: "bob", name: "Bob", text: "x".repeat(4001), at: 1 }));
  await no(carol.delete("parties/t1/notes/n1"));
  await ok(alice.delete("parties/t1/notes/n1"));
});

test("party notes are signed only with your own character and GM role", async () => {
  const { alice, bob } = await world();
  // bob plays Grok and is not a GM
  await ok(bob.set("parties/t1/notes/n1", { author: "bob", name: "Bob", char: "Grok", gm: false, text: "a", at: 1 }));
  await no(bob.set("parties/t1/notes/n2", { author: "bob", name: "Bob", char: "Strahd", gm: false, text: "a", at: 1 }));
  await no(bob.set("parties/t1/notes/n2", { author: "bob", name: "Bob", char: "Grok", gm: true, text: "a", at: 1 }));
  await no(bob.set("parties/t1/notes/n2", { author: "bob", name: "Bob", char: "Grok", gm: false, text: "a", at: 1, extra: 1 }));
  await ok(bob.update("parties/t1/notes/n1", { char: "Grok", gm: false, text: "b", at: 2 }));
  await no(bob.update("parties/t1/notes/n1", { char: "Strahd", text: "c", at: 3 }));
  // alice has no character; signs as the GM only once she is one
  await no(alice.set("parties/t1/notes/n3", { author: "alice", name: "Alice", char: "", gm: true, text: "a", at: 1 }));
  await ok(alice.update("parties/t1/members/alice", { gm: true }));
  await ok(alice.set("parties/t1/notes/n3", { author: "alice", name: "Alice", char: "", gm: true, text: "a", at: 1 }));
  // notes from before 0.31.0 (no signature fields) still edit as they were
  await ok(bob.set("parties/t1/notes/n4", { author: "bob", name: "Bob", text: "old", at: 1 }));
  await ok(bob.update("parties/t1/notes/n4", { name: "Bob", text: "old, edited", at: 2 }));
});

test("private notes are read only by their author, admins included", async () => {
  const { alice, bob } = await world();
  await ok(bob.set("users/bob/parties/t1/notes/p1", { text: "Alice is a vampire", at: 1 }));
  await no(alice.get("users/bob/parties/t1/notes/p1"));
  await no(alice.list("users/bob/parties/t1/notes"));
  await no(alice.list("users/bob/parties"));
  await no(alice.set("users/bob/parties/t1/notes/p2", { text: "x", at: 1 }));
  await ok(bob.list("users/bob/parties/t1/notes"));
});

test("the founder deletes the whole party in one go; others cannot", async () => {
  const { alice, bob } = await world();
  await ok(bob.set("parties/t1/notes/n1", { author: "bob", name: "Bob", text: "a", at: 1 }));
  await ok(bob.set("parties/t1/gm/bob", { v: gmOk(), at: 1 }));
  await no(bob.delete("parties/t1"));
  await ok(alice.batch([
    ["delete", "parties/t1/notes/n1"], ["delete", "parties/t1/gm/bob"], ["delete", "parties/t1/gm/alice"], ["delete", "parties/t1/members/bob"], ["delete", `invites/${CODE}`],
    ["delete", "parties/t1"], ["delete", "parties/t1/members/alice"], ["delete", "users/alice/parties/t1"],
  ]));
  for (const p of ["parties/t1", "parties/t1/members/alice", "parties/t1/members/bob", "parties/t1/notes/n1", "parties/t1/gm/bob", `invites/${CODE}`]) {
    if (await exists(p)) throw new Error(`${p} is still there`);
  }
});

test("deleting an account can remove everything the user has in the cloud", async () => {
  const { alice, bob, carol } = await world();
  // bob: a character, a party note, a private note, a GM view, a pending request in carol's party
  await ok(bob.set("users/bob/characters/b1", chDoc()));
  await ok(bob.set("parties/t1/notes/n1", { author: "bob", name: "Bob", text: "a", at: 1 }));
  await ok(alice.set("parties/t1/notes/n2", { author: "alice", name: "Alice", text: "b", at: 1 }));
  await ok(bob.set("users/bob/parties/t1/notes/p1", { text: "c", at: 1 }));
  await ok(bob.set("parties/t1/gm/bob", { v: gmOk(), at: 1 }));
  await ok(carol.batch([
    ["set", "parties/t2", { name: "Druga", owner: "carol", invite: CODE2, created: 1 }],
    ["set", "parties/t2/members/carol", { role: "admin", name: "C", charId: "", charName: "", at: 1 }],
    ["set", `invites/${CODE2}`, { party: "t2", name: "Druga" }],
  ]));
  await ok(bob.batch([
    ["set", "parties/t2/requests/bob", { name: "Bob", charId: "b2", charName: "Mira", code: CODE2, at: 2 }],
    ["set", "users/bob/parties/t2", { name: "Druga", state: "asked", at: 2, charId: "b2" }],
  ]));
  // erase.js finds my party notes with a query on the author
  const db = (await env.authenticatedContext("bob")).firestore();
  await ok(db.collection("parties/t1/notes").where("author", "==", "bob").get());
  await ok(bob.batch([["delete", "parties/t1/notes/n1"], ["delete", "users/bob/parties/t1/notes/p1"], ["delete", "parties/t1/gm/bob"], ["delete", "parties/t1/members/bob"], ["delete", "users/bob/parties/t1"]]));
  await no(bob.delete("parties/t1/notes/n2"));
  await ok(bob.batch([["delete", "parties/t2/requests/bob"], ["delete", "users/bob/parties/t2"]]));
  await ok(bob.delete("users/bob/characters/b1"));
  for (const p of ["users/bob/characters/b1", "parties/t1/notes/n1", "users/bob/parties/t1/notes/p1", "parties/t1/gm/bob", "parties/t1/members/bob", "users/bob/parties/t1", "parties/t2/requests/bob", "users/bob/parties/t2"]) {
    if (await exists(p)) throw new Error(`${p} is still there`);
  }
  if (!(await exists("parties/t1/notes/n2"))) throw new Error("someone else's note was removed");
});

test("admins give the GM role (also to themselves and the founder); players cannot", async () => {
  const { alice, bob } = await world();
  await no(bob.update("parties/t1/members/bob", { gm: true }));
  await no(bob.update("parties/t1/members/alice", { gm: true }));
  await ok(alice.update("parties/t1/members/alice", { gm: true }));
  await no(alice.update("parties/t1/members/bob", { gm: "yes" }));
  await no(alice.update("parties/t1/members/bob", { gm: true, role: "admin" })); // one change at a time; the app sends them separately
  await ok(alice.update("parties/t1/members/bob", { role: "admin" }));
  await ok(bob.update("parties/t1/members/alice", { gm: false }));
});

test("the GM view is written only by its player and read only by the party's GMs", async () => {
  const { alice, bob, carol } = await world();
  await ok(bob.set("parties/t1/gm/bob", { v: gmOk(), at: 1 }));
  await no(alice.set("parties/t1/gm/bob", { v: gmOk(), at: 1 }));
  await no(carol.set("parties/t1/gm/carol", { v: gmOk(), at: 1 }));
  await no(bob.set("parties/t1/gm/bob", { v: { ...gmOk(), notes: 1 }, at: 1 }));
  await no(bob.set("parties/t1/gm/bob", { v: { ...gmOk(), per: 5000 }, at: 1 }));
  await no(bob.set("parties/t1/gm/bob", { v: { ...gmOk(), per: "x".repeat(50) }, at: 1 }));
  await no(alice.get("parties/t1/gm/bob"));
  await no(alice.list("parties/t1/gm"));
  await no(carol.get("parties/t1/gm/bob"));
  await ok(bob.get("parties/t1/gm/bob"));
  await ok(alice.update("parties/t1/members/alice", { gm: true }));
  await ok(alice.get("parties/t1/gm/bob"));
  await ok(alice.list("parties/t1/gm"));
  await ok(alice.delete("parties/t1/gm/bob"));
});

test("my list of parties remembers the character playing there", async () => {
  const { bob } = await world();
  await ok(bob.update("users/bob/parties/t1", { charId: "b2" }));
  await no(bob.update("users/bob/parties/t1", { charId: 7 }));
  await no(bob.update("users/bob/parties/t1", { secret: 1 }));
});

test("scores from paper: the party sees a fingerprint, the GM the values; only a GM confirms, signed with their own uid", async () => {
  const { alice, bob, carol } = await world();
  const paperOk = { sig: "a1b2c3d4", charId: "b1", by: "alice", name: "Alice", at: 5 };
  await ok(bob.update("parties/t1/members/bob", { sheet: { ...sheetOk, paper: "a1b2c3d4" }, charName: "Grok" }));
  await no(bob.update("parties/t1/members/bob", { sheet: { ...sheetOk, paper: "x".repeat(17) } }));
  await ok(bob.set("parties/t1/gm/bob", { v: { ...gmOk(), paper: "17,12,14,8,10,11" }, at: 1 }));
  await no(bob.set("parties/t1/gm/bob", { v: { ...gmOk(), paper: 17 }, at: 1 }));
  // Not a GM yet: an admin alone cannot confirm; the player never confirms their own scores.
  await no(alice.update("parties/t1/members/bob", { paperOk }));
  await no(bob.update("parties/t1/members/bob", { paperOk: { ...paperOk, by: "bob" } }));
  await ok(alice.update("parties/t1/members/alice", { gm: true }));
  await no(alice.update("parties/t1/members/bob", { paperOk: { ...paperOk, by: "bob" } }), "signed with someone else's uid");
  await no(alice.update("parties/t1/members/bob", { paperOk: { ...paperOk, extra: 1 } }));
  await no(alice.update("parties/t1/members/bob", { paperOk, role: "admin" }), "one change at a time");
  await ok(alice.update("parties/t1/members/bob", { paperOk }));
  // The player can't touch it while changing their own summary.
  await no(bob.update("parties/t1/members/bob", { paperOk: DELETE() }));
  await ok(bob.update("parties/t1/members/bob", { sheet: sheetOk }));
  await no(carol.update("parties/t1/members/bob", { paperOk: DELETE() }));
  await ok(alice.update("parties/t1/members/bob", { paperOk: DELETE() }));
});

test("0.37: the character's portrait — only a small picture, written only by the member", async () => {
  const { alice, bob } = await world();
  const pic = "data:image/jpeg;base64," + "A".repeat(30000);
  await ok(bob.update("parties/t1/members/bob", { avatar: pic }));
  await ok(bob.update("parties/t1/members/bob", { sheet: sheetOk, charName: "Grok", avatar: pic }));
  await no(alice.update("parties/t1/members/bob", { avatar: pic + "B" }), "someone else's portrait");
  await no(bob.update("parties/t1/members/bob", { avatar: "data:image/jpeg;base64," + "A".repeat(70000) }), "too big");
  await no(bob.update("parties/t1/members/bob", { avatar: "https://example.com/x.jpg" }), "a link to another site");
  await no(bob.update("parties/t1/members/bob", { avatar: "data:image/svg+xml;base64,PHN2Zz4=" }), "SVG can carry scripts");
  await no(bob.update("parties/t1/members/bob", { avatar: 7 }));
  await ok(bob.update("parties/t1/members/bob", { avatar: DELETE() }));
});
