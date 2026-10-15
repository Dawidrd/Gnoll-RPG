// Weapons from chapter 6 of the 2024 Player's Handbook: damage, properties, mastery property, weight and cost.
// Mastery descriptions are our own paraphrase.
const L = (pl, en) => ({ pl, en });

export const DAMAGE = { b: L("obuchowe", "Bludgeoning"), p: L("kłute", "Piercing"), s: L("cięte", "Slashing") };

/** Mastery properties (usable only with a feature such as Weapon Mastery). */
export const MASTERY = {
  cleave: { name: L("Cleave (Rozpłatanie)", "Cleave"),
    desc: (dc) => L("Po trafieniu atakiem wręcz atakujesz drugą istotę w 5 ft od pierwszej i w zasięgu; przy trafieniu obrażenia bez modyfikatora cechy (chyba że ujemny). Raz na turę.", "After a melee hit, attack a second creature within 5 ft of the first and in reach; on a hit it takes the weapon's damage without your ability modifier (unless negative). Once per turn.") },
  graze: { name: L("Graze (Draśnięcie)", "Graze"),
    desc: () => L("Gdy chybisz, cel i tak dostaje obrażenia równe modyfikatorowi cechy użytej do ataku.", "When you miss, the target still takes damage equal to the ability modifier you attacked with.") },
  nick: { name: L("Nick (Nacięcie)", "Nick"),
    desc: () => L("Dodatkowy atak bronią lekką wykonujesz w ramach akcji Attack, a nie akcją bonusową (raz na turę).", "Make the extra Light-weapon attack as part of the Attack action instead of a Bonus Action (once per turn).") },
  push: { name: L("Push (Odepchnięcie)", "Push"),
    desc: () => L("Po trafieniu odpychasz cel Duży lub mniejszy o 10 ft od siebie.", "On a hit, push a Large or smaller target 10 ft straight away from you.") },
  sap: { name: L("Sap (Osłabienie)", "Sap"),
    desc: () => L("Po trafieniu cel ma Utrudnienie na swój następny atak przed Twoją kolejną turą.", "On a hit, the target has Disadvantage on its next attack roll before your next turn.") },
  slow: { name: L("Slow (Spowolnienie)", "Slow"),
    desc: () => L("Po trafieniu z obrażeniami prędkość celu spada o 10 ft do początku Twojej tury (nie więcej niż 10 ft łącznie).", "On a damaging hit, the target's Speed drops by 10 ft until the start of your next turn (10 ft at most in total).") },
  topple: { name: L("Topple (Przewrócenie)", "Topple"),
    desc: (dc) => L(`Po trafieniu cel rzuca KON przeciw DC ${dc} albo pada (Prone).`, `On a hit, the target makes a CON save against DC ${dc} or falls Prone.`) },
  vex: { name: L("Vex (Nękanie)", "Vex"),
    desc: () => L("Po trafieniu z obrażeniami masz Przewagę na następny atak w ten cel przed końcem Twojej następnej tury.", "On a damaging hit, you have Advantage on your next attack against that target before the end of your next turn.") },
};

export const PROPERTIES = {
  finesse: L("finezyjna", "Finesse"), light: L("lekka", "Light"), heavy: L("ciężka", "Heavy"), two: L("dwuręczna", "Two-Handed"),
  reach: L("zasięg", "Reach"), loading: L("przeładowanie", "Loading"), ammo: L("amunicja", "Ammunition"), thrown: L("rzucana", "Thrown"), versatile: L("uniwersalna", "Versatile"),
};

// [id, pl, en, category, ranged?, dice, damage type, properties, mastery, weight (lb), cost (gp)]
// properties: f finesse, l light, h heavy, 2 two-handed, r reach, L loading, t:20/60 thrown, a:80/320 ammunition, v:1d8 versatile
const ROWS = [
  ["club", "Pałka", "Club", "simple", false, "1d4", "b", "l", "slow", 2, 0.1],
  ["dagger", "Sztylet", "Dagger", "simple", false, "1d4", "p", "f l t:20/60", "nick", 1, 2],
  ["greatclub", "Maczuga", "Greatclub", "simple", false, "1d8", "b", "2", "push", 10, 0.2],
  ["handaxe", "Toporek", "Handaxe", "simple", false, "1d6", "s", "l t:20/60", "vex", 2, 5],
  ["javelin", "Oszczep", "Javelin", "simple", false, "1d6", "p", "t:30/120", "slow", 2, 0.5],
  ["light-hammer", "Lekki młot", "Light Hammer", "simple", false, "1d4", "b", "l t:20/60", "nick", 2, 2],
  ["mace", "Buzdygan", "Mace", "simple", false, "1d6", "b", "", "sap", 4, 5],
  ["quarterstaff", "Kij", "Quarterstaff", "simple", false, "1d6", "b", "v:1d8", "topple", 4, 0.2],
  ["sickle", "Sierp", "Sickle", "simple", false, "1d4", "s", "l", "nick", 2, 1],
  ["spear", "Włócznia", "Spear", "simple", false, "1d6", "p", "t:20/60 v:1d8", "sap", 3, 1],
  ["dart", "Strzałka", "Dart", "simple", true, "1d4", "p", "f t:20/60", "vex", 0.25, 0.05],
  ["light-crossbow", "Lekka kusza", "Light Crossbow", "simple", true, "1d8", "p", "a:80/320 L 2", "slow", 5, 25],
  ["shortbow", "Krótki łuk", "Shortbow", "simple", true, "1d6", "p", "a:80/320 2", "vex", 2, 25],
  ["sling", "Proca", "Sling", "simple", true, "1d4", "b", "a:30/120", "slow", 0, 0.1],
  ["battleaxe", "Topór bojowy", "Battleaxe", "martial", false, "1d8", "s", "v:1d10", "topple", 4, 10],
  ["flail", "Korbacz", "Flail", "martial", false, "1d8", "b", "", "sap", 2, 10],
  ["glaive", "Gizarma", "Glaive", "martial", false, "1d10", "s", "h r 2", "graze", 6, 20],
  ["greataxe", "Wielki topór", "Greataxe", "martial", false, "1d12", "s", "h 2", "cleave", 7, 30],
  ["greatsword", "Miecz dwuręczny", "Greatsword", "martial", false, "2d6", "s", "h 2", "graze", 6, 50],
  ["halberd", "Halabarda", "Halberd", "martial", false, "1d10", "s", "h r 2", "cleave", 6, 20],
  ["lance", "Kopia", "Lance", "martial", false, "1d10", "p", "h r 2", "topple", 6, 10],
  ["longsword", "Długi miecz", "Longsword", "martial", false, "1d8", "s", "v:1d10", "sap", 3, 15],
  ["maul", "Młot dwuręczny", "Maul", "martial", false, "2d6", "b", "h 2", "topple", 10, 10],
  ["morningstar", "Morgensztern", "Morningstar", "martial", false, "1d8", "p", "", "sap", 4, 15],
  ["pike", "Pika", "Pike", "martial", false, "1d10", "p", "h r 2", "push", 18, 5],
  ["rapier", "Rapier", "Rapier", "martial", false, "1d8", "p", "f", "vex", 2, 25],
  ["scimitar", "Sejmitar", "Scimitar", "martial", false, "1d6", "s", "f l", "nick", 3, 25],
  ["shortsword", "Krótki miecz", "Shortsword", "martial", false, "1d6", "p", "f l", "vex", 2, 10],
  ["trident", "Trójząb", "Trident", "martial", false, "1d8", "p", "t:20/60 v:1d10", "topple", 4, 5],
  ["warhammer", "Młot bojowy", "Warhammer", "martial", false, "1d8", "b", "v:1d10", "push", 5, 15],
  ["war-pick", "Nadziak", "War Pick", "martial", false, "1d8", "p", "v:1d10", "sap", 2, 5],
  ["whip", "Bicz", "Whip", "martial", false, "1d4", "s", "f r", "slow", 3, 2],
  ["blowgun", "Dmuchawka", "Blowgun", "martial", true, "1", "p", "a:25/100 L", "vex", 1, 10],
  ["hand-crossbow", "Kusza ręczna", "Hand Crossbow", "martial", true, "1d6", "p", "a:30/120 l L", "vex", 3, 75],
  ["heavy-crossbow", "Ciężka kusza", "Heavy Crossbow", "martial", true, "1d10", "p", "a:100/400 h L 2", "push", 18, 50],
  ["longbow", "Długi łuk", "Longbow", "martial", true, "1d8", "p", "a:150/600 h 2", "slow", 2, 50],
  ["musket", "Muszkiet", "Musket", "martial", true, "1d12", "p", "a:40/120 L 2", "slow", 10, 500],
  ["pistol", "Pistolet", "Pistol", "martial", true, "1d10", "p", "a:30/90 L", "vex", 3, 250],
];

function parseProps(s) {
  const p = {};
  for (const x of s.split(" ").filter(Boolean)) {
    if (x === "f") p.finesse = true; else if (x === "l") p.light = true; else if (x === "h") p.heavy = true;
    else if (x === "2") p.two = true; else if (x === "r") p.reach = true; else if (x === "L") p.loading = true;
    else if (x.startsWith("t:")) p.thrown = x.slice(2); else if (x.startsWith("a:")) p.ammo = x.slice(2); else if (x.startsWith("v:")) p.versatile = x.slice(2);
  }
  return p;
}

export const WEAPONS = Object.fromEntries(ROWS.map(([id, pl, en, cat, ranged, dice, type, props, mastery, weight, cost]) => [id, {
  id, cat, ranged, dice, type, props: parseProps(props), mastery, weight, cost, name: L(`${en} (${pl})`, en),
}]));

const kd = (s) => s.replace(/(\d)d(\d)/g, "$1k$2");
/** "finezyjna, lekka, rzucana 20/60 ft" */
export function propsText(w) {
  const p = w.props;
  const one = (k, v) => v === true ? PROPERTIES[k] : L(`${PROPERTIES[k].pl} ${k === "versatile" ? kd(v) : v + " ft"}`, `${PROPERTIES[k].en} ${k === "versatile" ? v : v + " ft"}`);
  const list = Object.keys(PROPERTIES).filter((k) => p[k]).map((k) => one(k, p[k]));
  return L(list.map((x) => x.pl).join(", "), list.map((x) => x.en).join(", "));
}

/** Weapon Mastery as a class option list: each weapon kind you may pick (filter = which kinds the class can choose). */
export function masteryOptions(filter = () => true) {
  return Object.fromEntries(Object.values(WEAPONS).filter(filter).map((w) => [w.id, {
    name: L(`${w.name.pl}: ${MASTERY[w.mastery].name.en}`, `${w.name.en}: ${MASTERY[w.mastery].name.en}`),
    desc: (c) => MASTERY[w.mastery].desc(8 + Math.max(c.mods.str, c.mods.dex) + c.pb), weapon: w.id,
  }]));
}

/** Option group for Weapon Mastery; changeable after each long rest. */
export const masteryGroup = (count, filter) => ({ key: "mastery", label: L("Weapon Mastery (Mistrzostwo broni)", "Weapon Mastery"), count, options: masteryOptions(filter), changeRule: "longRest" });

const dieSize = (d) => +(String(d).split("d")[1] || 0);
/** "1d8+3" / "1k8+3" */
export const dmgText = (dice, bonus) => L(kd(dice) + (bonus ? (bonus > 0 ? "+" : "") + bonus : ""), dice + (bonus ? (bonus > 0 ? "+" : "") + bonus : ""));

/**
 * Attacks with the weapons the character carries.
 * proficient(w): weapon training; styles: Fighting Style feat ids; mastered: weapon ids whose mastery you can use;
 * monkDie: Martial Arts die ("d6") for Monk weapons; rage: Rage damage bonus while raging.
 */
export function weaponAttacks({ list, mods, abilities, pb, proficient, styles = [], mastered = [], monkDie = "", rage = 0 }) {
  return list.map((it) => {
    const w = WEAPONS[it.id];
    if (!w) return null;
    const p = w.props, melee = !w.ranged;
    const monkWeapon = !!monkDie && melee && (w.cat === "simple" || p.light);
    const best = mods.dex > mods.str ? "dex" : "str";
    const ab = w.ranged ? (p.finesse ? best : "dex") : p.finesse || monkWeapon ? best : "str";
    const prof = proficient(w);
    const notes = [];
    const hit = mods[ab] + (prof ? pb : 0) + (styles.includes("archery") && w.ranged ? 2 : 0);
    let dice = w.dice;
    if (monkWeapon && dieSize(monkDie) > dieSize(dice) && !dice.startsWith("2")) dice = "1" + monkDie;
    let bonus = mods[ab], duel = 0;
    if (styles.includes("dueling") && melee && !p.two) { bonus += 2; duel = 2; notes.push(L("Pojedynkowanie: +2, gdy nie trzymasz innej broni", "Dueling: +2 while holding no other weapon")); }
    if (rage && melee && ab === "str") { bonus += rage; notes.push(L(`Szał: +${rage}`, `Rage: +${rage}`)); }
    if (styles.includes("archery") && w.ranged) notes.push(L("Łucznictwo: +2 do trafienia", "Archery: +2 to hit"));
    if (styles.includes("thrown-weapon-fighting") && p.thrown) notes.push(L("Rzucona: +2 obrażeń (Walka bronią rzucaną)", "Thrown: +2 damage (Thrown Weapon Fighting)"));
    if (styles.includes("great-weapon-fighting") && melee && (p.two || p.versatile)) notes.push(L("Oburącz: 1 i 2 na kościach liczysz jako 3", "Two-handed: treat 1s and 2s on the dice as 3"));
    if (styles.includes("two-weapon-fighting") && p.light) notes.push(L("Drugi atak bronią lekką z modyfikatorem do obrażeń", "Extra Light-weapon attack adds your modifier to damage"));
    if (!prof) notes.push(L("Brak biegłości: bez premii z biegłości", "Not proficient: no proficiency bonus"));
    if (p.heavy && abilities[w.ranged ? "dex" : "str"] < 13) notes.push(L(`Ciężka: Utrudnienie (${w.ranged ? "ZRĘ" : "SIŁ"} poniżej 13)`, `Heavy: Disadvantage (${w.ranged ? "DEX" : "STR"} below 13)`));
    if (monkWeapon) notes.push(L("Broń mnicha: ZRĘ lub SIŁ i kość Martial Arts", "Monk weapon: DEX or STR and the Martial Arts die"));
    const range = p.ammo || p.thrown || "";
    const mastery = mastered.includes(w.id) ? { id: w.mastery, ...MASTERY[w.mastery], text: MASTERY[w.mastery].desc(8 + mods[ab] + pb) } : null;
    return { uid: it.uid, id: w.id, name: w.name, ab, prof, hit, dice, bonus, type: DAMAGE[w.type], props: propsText(w),
      versatile: p.versatile ? dmgText(p.versatile, bonus - duel) : null, damage: dmgText(dice, bonus), range, reach: p.reach ? 10 : melee ? 5 : 0, mastery, notes };
  }).filter(Boolean);
}
