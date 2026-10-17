// Fighter, levels 1–5, 2024 rules (Player's Handbook ch. 3). Descriptions are our own paraphrase.
import { masteryGroup } from "../weapons.js";

const L = (pl, en) => ({ pl, en });
const atLeast1 = (n) => Math.max(1, n);
const secondWind = (lv) => (lv < 4 ? 2 : lv < 10 ? 3 : 4);
const mastery = (lv) => (lv < 4 ? 3 : lv < 10 ? 4 : lv < 16 ? 5 : 6);
const supDice = (lv) => (lv < 7 ? 4 : lv < 15 ? 5 : 6);
const supDie = (lv) => (lv < 10 ? 8 : lv < 18 ? 10 : 12);
const psiDice = (lv) => (lv < 5 ? 4 : lv < 9 ? 6 : lv < 11 ? 8 : lv < 13 ? 10 : 12);
const psiDie = (lv) => (lv < 5 ? 6 : lv < 11 ? 8 : lv < 17 ? 10 : 12);
const SKILLS = ["acrobatics", "animal", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"];

const mdc = (c) => 8 + Math.max(c.mods.str, c.mods.dex) + c.pb;
const sd = (c) => L(`k${supDie(c.level)}`, `d${supDie(c.level)}`);
const M = (pl, en, dpl, den) => ({ name: L(`${en} (${pl})`, en), desc: (c) => L(dpl(c), den(c)) });

/** Battle Master maneuvers (each spends a Superiority Die unless stated otherwise). */
export const MANEUVERS = {
  ambush: M("Zasadzka", "Ambush", (c) => `Dodajesz kość ${sd(c).pl} do testu Skradania albo Inicjatywy.`, (c) => `Add a ${sd(c).en} to a Stealth check or an Initiative roll.`),
  "bait-and-switch": M("Zamiana miejsc", "Bait and Switch", (c) => `W swojej turze, wydając 5 ft ruchu, zamieniasz się miejscem z chętną istotą obok (bez ataków okazyjnych). Ty albo ona dostajecie +kość ${sd(c).pl} do KP do Twojej następnej tury.`,
    (c) => `On your turn, spending 5 ft of movement, swap places with a willing creature next to you (no Opportunity Attacks). You or it gains +${sd(c).en} AC until your next turn.`),
  "commanders-strike": M("Rozkaz ataku", "Commander's Strike", (c) => `Zamiast jednego ataku w akcji Atak sojusznik, który Cię widzi lub słyszy, reakcją atakuje i dodaje kość ${sd(c).pl} do obrażeń.`,
    (c) => `Instead of one of your Attack-action attacks, an ally who can see or hear you attacks with its Reaction and adds a ${sd(c).en} to the damage.`),
  "commanding-presence": M("Władcza obecność", "Commanding Presence", (c) => `Dodajesz kość ${sd(c).pl} do testu CHA (Zastraszanie, Występy, Perswazja).`, (c) => `Add a ${sd(c).en} to a CHA (Intimidation, Performance, Persuasion) check.`),
  "disarming-attack": M("Rozbrojenie", "Disarming Attack", (c) => `Po trafieniu +kość ${sd(c).pl} do obrażeń; cel rzuca SIŁ (DC ${mdc(c)}) albo upuszcza trzymany przedmiot.`, (c) => `On a hit, +${sd(c).en} damage; the target makes a STR save (DC ${mdc(c)}) or drops an object it holds.`),
  "distracting-strike": M("Rozpraszający cios", "Distracting Strike", (c) => `Po trafieniu +kość ${sd(c).pl} do obrażeń; następny atak w ten cel kogoś innego niż Ty ma Przewagę (do Twojej tury).`, (c) => `On a hit, +${sd(c).en} damage; the next attack against the target by someone else has Advantage (until your turn).`),
  "evasive-footwork": M("Unik w biegu", "Evasive Footwork", (c) => `Akcja bonusowa: Odskok i +kość ${sd(c).pl} do KP do Twojej następnej tury.`, (c) => `Bonus Action: Disengage and +${sd(c).en} AC until your next turn.`),
  "feinting-attack": M("Zwód", "Feinting Attack", (c) => `Akcja bonusowa: Przewaga na następny atak w istotę w 5 ft w tej turze; przy trafieniu +kość ${sd(c).pl} do obrażeń.`, (c) => `Bonus Action: Advantage on your next attack against a creature within 5 ft this turn; on a hit +${sd(c).en} damage.`),
  "goading-attack": M("Prowokacja", "Goading Attack", (c) => `Po trafieniu +kość ${sd(c).pl}; cel rzuca MĄD (DC ${mdc(c)}) albo ma Utrudnienie na ataki w kogoś innego niż Ty do końca Twojej następnej tury.`, (c) => `On a hit, +${sd(c).en}; the target makes a WIS save (DC ${mdc(c)}) or has Disadvantage on attacks against anyone but you until the end of your next turn.`),
  "lunging-attack": M("Wypad", "Lunging Attack", (c) => `Akcja bonusowa: Sprint; jeśli tuż przed trafieniem wręcz przejdziesz 5 ft prosto, +kość ${sd(c).pl} do obrażeń.`, (c) => `Bonus Action: Dash; if you move 5 ft straight right before a melee hit, +${sd(c).en} damage.`),
  "maneuvering-attack": M("Manewr", "Maneuvering Attack", (c) => `Po trafieniu +kość ${sd(c).pl}; sojusznik reakcją przechodzi połowę prędkości bez ataku okazyjnego od celu.`, (c) => `On a hit, +${sd(c).en}; an ally uses its Reaction to move half its Speed without an Opportunity Attack from the target.`),
  "menacing-attack": M("Groźny cios", "Menacing Attack", (c) => `Po trafieniu +kość ${sd(c).pl}; cel rzuca MĄD (DC ${mdc(c)}) albo jest przestraszony do końca Twojej następnej tury.`, (c) => `On a hit, +${sd(c).en}; the target makes a WIS save (DC ${mdc(c)}) or is Frightened until the end of your next turn.`),
  parry: M("Parowanie", "Parry", (c) => `Reakcja, gdy ktoś rani Cię atakiem wręcz: obrażenia −(kość ${sd(c).pl} + SIŁ lub ZRĘ).`, (c) => `Reaction when a melee attack damages you: reduce it by ${sd(c).en} + STR or DEX.`),
  "precision-attack": M("Precyzyjny atak", "Precision Attack", (c) => `Po chybieniu dodajesz kość ${sd(c).pl} do rzutu ataku.`, (c) => `After a miss, add a ${sd(c).en} to the attack roll.`),
  "pushing-attack": M("Odpychający cios", "Pushing Attack", (c) => `Po trafieniu +kość ${sd(c).pl}; cel Duży lub mniejszy rzuca SIŁ (DC ${mdc(c)}) albo zostaje odepchnięty o 15 ft.`, (c) => `On a hit, +${sd(c).en}; a Large or smaller target makes a STR save (DC ${mdc(c)}) or is pushed 15 ft.`),
  rally: M("Zagrzewanie", "Rally", (c) => `Akcja bonusowa: sojusznik w 30 ft dostaje kość ${sd(c).pl} + ${Math.floor(c.level / 2)} tymczasowych HP.`, (c) => `Bonus Action: an ally within 30 ft gains ${sd(c).en} + ${Math.floor(c.level / 2)} Temporary HP.`),
  riposte: M("Riposta", "Riposte", (c) => `Reakcja, gdy ktoś chybi Cię wręcz: atakujesz go wręcz, przy trafieniu +kość ${sd(c).pl}.`, (c) => `Reaction when a melee attack misses you: attack the creature in melee, +${sd(c).en} damage on a hit.`),
  "sweeping-attack": M("Zamaszysty cios", "Sweeping Attack", (c) => `Po trafieniu wręcz druga istota w 5 ft od celu i w zasięgu dostaje kość ${sd(c).pl} obrażeń, jeśli atak by ją trafił.`, (c) => `After a melee hit, a second creature within 5 ft of the target and in reach takes ${sd(c).en} damage if the attack would hit it.`),
  "tactical-assessment": M("Ocena sytuacji", "Tactical Assessment", (c) => `Dodajesz kość ${sd(c).pl} do testu Historii, Śledztwa albo Wnikliwości.`, (c) => `Add a ${sd(c).en} to a History, Investigation or Insight check.`),
  "trip-attack": M("Podcięcie", "Trip Attack", (c) => `Po trafieniu +kość ${sd(c).pl}; cel Duży lub mniejszy rzuca SIŁ (DC ${mdc(c)}) albo zostaje powalony.`, (c) => `On a hit, +${sd(c).en}; a Large or smaller target makes a STR save (DC ${mdc(c)}) or falls Prone.`),
};

export const fighter = {
  id: "fighter",
  source: "srd52",
  name: L("Wojownik (Fighter)", "Fighter"),
  maxLevel: 5,
  asiLevels: [4, 6, 8, 12, 14, 16],
  hitDie: 10,
  standardArray: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 },
  saves: ["str", "con"],
  skillChoices: { count: 2, from: SKILLS },
  armorTraining: ["light", "medium", "heavy", "shield"],
  weaponProf: () => true,
  fightingStyle: 1,
  role: L("Mistrz broni i zbroi. Najwięcej ataków, Action Surge daje drugą akcję w turze, a Second Wind leczy w środku walki.",
    "The master of weapons and armor. The most attacks, Action Surge gives a second action in a turn, and Second Wind heals mid-fight."),

  optionPicks: (c) => [
    masteryGroup(mastery(c.level)),
    ...(c.subclassId === "battle-master" ? [{ key: "maneuvers", label: L("Manewry (Battle Master)", "Maneuvers (Battle Master)"), count: 3, options: MANEUVERS, changeRule: "level" }] : []),
  ],

  resources: (c) => [
    { id: "second-wind", max: secondWind(c.level), recharge: "long", shortRegain: 1, name: L("Second Wind (Drugi oddech)", "Second Wind") },
    { id: "action-surge", max: c.level >= 2 ? 1 : 0, recharge: "short", name: L("Action Surge (Zryw)", "Action Surge") },
  ],

  summary: (c) => [
    { label: L("Second Wind", "Second Wind"), value: L(`1k10 + ${c.level}`, `1d10 + ${c.level}`), note: L("akcja bonusowa, leczenie", "Bonus Action, healing") },
  ],

  features: [
    { lv: 1, id: "fighting-style", name: L("Fighting Style (Styl walki)", "Fighting Style"),
      desc: () => L("Dostajesz feat stylu walki (wybór w kroku 5; polecana Obrona). Przy każdym awansie możesz go wymienić na inny.", "You gain a Fighting Style feat (pick it in step 5; Defense is recommended). Each time you gain a level you can swap it for another.") },
    { lv: 1, id: "second-wind", name: L("Second Wind (Drugi oddech)", "Second Wind"),
      desc: (c) => L(`Akcja bonusowa: odzyskujesz 1k10 + ${c.level} HP. ${secondWind(c.level)} użycia; krótki odpoczynek oddaje jedno.`, `Bonus Action: regain 1d10 + ${c.level} HP. ${secondWind(c.level)} uses; a short rest restores one.`) },
    { lv: 1, id: "weapon-mastery", name: L("Weapon Mastery (Mistrzostwo broni)", "Weapon Mastery"),
      desc: (c) => L(`Używasz właściwości mistrzowskich ${mastery(c.level)} rodzajów broni prostej lub wojennej (wybór w kroku 5). Po długim odpoczynku możesz wymienić jeden.`, `You use the mastery properties of ${mastery(c.level)} kinds of Simple or Martial weapons (pick them in step 5). After a long rest you can change one.`) },
    { lv: 2, id: "action-surge", name: L("Action Surge (Zryw)", "Action Surge"),
      desc: () => L("W swojej turze wykonujesz jedną dodatkową akcję (ale nie Magia). Raz na krótki lub długi odpoczynek.", "On your turn, take one extra action (but not the Magic action). Once per short or long rest.") },
    { lv: 2, id: "tactical-mind", name: L("Tactical Mind (Umysł taktyka)", "Tactical Mind"),
      desc: () => L("Gdy oblejesz test cechy, możesz wydać użycie Second Wind: zamiast leczenia dodajesz 1k10 do testu. Jeśli i tak się nie uda, użycie nie przepada.", "When you fail an ability check, you can spend a use of Second Wind: instead of healing, add 1d10 to the check. If it still fails, the use isn't spent.") },
    { lv: 3, id: "subclass", name: L("Podklasa (Fighter Subclass)", "Fighter Subclass"),
      desc: () => L("Wybierasz archetyp wojownika. Jego zdolności pojawią się niżej.", "Choose your fighter archetype. Its features appear below.") },
    { lv: 4, id: "asi", name: L("Feat albo +2 do cech (ASI)", "Feat or Ability Score Improvement"),
      desc: () => L("Wybierasz feat albo +2 do jednej cechy (lub +1 do dwóch) na zakładce Awans. Kolejne na 6., 8., 12., 14. i 16. poziomie.", "Pick a feat or +2 to one ability (or +1 to two) on the Level up tab. More at levels 6, 8, 12, 14 and 16.") },
    { lv: 5, id: "extra-attack", name: L("Extra Attack (Dodatkowy atak)", "Extra Attack"),
      desc: () => L("Akcją Atak atakujesz dwa razy.", "You attack twice when you take the Attack action.") },
    { lv: 5, id: "tactical-shift", name: L("Tactical Shift (Taktyczny unik)", "Tactical Shift"),
      desc: () => L("Gdy użyjesz Second Wind akcją bonusową, możesz przejść połowę prędkości bez ataków okazyjnych.", "When you use Second Wind as a Bonus Action, you can move half your Speed without provoking Opportunity Attacks.") },
  ],

  subclassLevel: 3,
  subclasses: {
    "battle-master": {
      source: "phb2024", name: L("Battle Master (Mistrz bitwy)", "Battle Master"),
      resources: (c) => [{ id: "superiority", max: supDice(c.level), recharge: "short", name: L(`Kości przewagi (k${supDie(c.level)})`, `Superiority Dice (d${supDie(c.level)})`) }],
      toolChoice: { count: 1, from: ["artisan"] },
      extraSkills: (lv) => (lv >= 3 ? [{ id: "student-of-war", label: L("Student of War: umiejętność wojownika", "Student of War: a Fighter skill"), count: 1, from: SKILLS }] : []),
      features: [
        { lv: 3, id: "combat-superiority", name: L("Combat Superiority (Przewaga w walce)", "Combat Superiority"),
          desc: (c) => L(`Znasz 3 manewry (wybór w kroku 5) i masz ${supDice(c.level)} kości przewagi k${supDie(c.level)}; wracają po krótkim lub długim odpoczynku. Jeden manewr na atak. DC manewrów: ${mdc(c)} (8 + SIŁ lub ZRĘ + PB).`,
            `You know 3 maneuvers (pick them in step 5) and have ${supDice(c.level)} Superiority Dice (d${supDie(c.level)}); they return on a short or long rest. One maneuver per attack. Maneuver DC: ${mdc(c)} (8 + STR or DEX + PB).`) },
        { lv: 3, id: "student-of-war", name: L("Student of War (Uczeń wojny)", "Student of War"),
          desc: () => L("Biegłość w jednym rodzaju narzędzi rzemieślniczych i w jednej umiejętności z listy wojownika (wybór w kroku 5).", "Proficiency with one kind of Artisan's Tools and one skill from the Fighter list (pick them in step 5).") },
      ],
    },
    champion: {
      source: "srd52", name: L("Champion (Czempion)", "Champion"),
      initiativeAdv: true,
      features: [
        { lv: 3, id: "improved-critical", name: L("Improved Critical (Lepsze trafienie krytyczne)", "Improved Critical"),
          desc: () => L("Ataki bronią i ciosy bez broni trafiają krytycznie przy 19 i 20 na k20.", "Your weapon attacks and Unarmed Strikes score a Critical Hit on a 19 or 20.") },
        { lv: 3, id: "remarkable-athlete", name: L("Remarkable Athlete (Wybitny atleta)", "Remarkable Athlete"),
          desc: () => L("Przewaga na Inicjatywę i testy Atletyki. Zaraz po trafieniu krytycznym możesz przejść połowę prędkości bez ataków okazyjnych.", "Advantage on Initiative and Athletics checks. Right after a Critical Hit you can move half your Speed without provoking Opportunity Attacks.") },
      ],
    },
    "eldritch-knight": {
      source: "phb2024", name: L("Eldritch Knight (Rycerz magii)", "Eldritch Knight"),
      spellcasting: (lv) => (lv < 3 ? null : { ability: "int", list: L("czarodzieja", "Wizard"), listId: "wizard", changeRule: "level", cantrips: lv < 10 ? 2 : 3, prepared: lv < 4 ? 3 : lv < 7 ? 4 : 5, slots: lv < 4 ? [2] : lv < 7 ? [3] : [4, 2] }),
      features: [
        { lv: 3, id: "ek-spellcasting", name: L("Spellcasting (Czary)", "Spellcasting"),
          desc: (c) => L(`Czary z listy czarodzieja na INT: 2 sztuczki i ${c.level < 4 ? 3 : 4} przygotowane czary 1. kręgu. Sloty wracają po długim odpoczynku; przy awansie możesz wymienić jeden czar i jedną sztuczkę.`,
            `Wizard spells using INT: 2 cantrips and ${c.level < 4 ? 3 : 4} prepared level 1 spells. Slots return on a long rest; when you gain a level you can swap one spell and one cantrip.`) },
        { lv: 3, id: "war-bond", name: L("War Bond (Więź z bronią)", "War Bond"),
          desc: () => L("Godzinnym rytuałem (może być w krótkim odpoczynku) wiążesz się z bronią, najwyżej z dwiema. Nie da się Cię jej pozbawić (chyba że jesteś obezwładniony), a akcją bonusową przywołujesz ją do ręki z tego samego planu.",
            "With a one-hour ritual (it can be during a short rest) you bond with a weapon, two at most. You can't be disarmed of it (unless Incapacitated), and as a Bonus Action you summon it to your hand from the same plane.") },
      ],
    },
    "psi-warrior": {
      source: "phb2024", name: L("Psi Warrior (Psioniczny wojownik)", "Psi Warrior"),
      resources: (c) => [
        { id: "psi", max: psiDice(c.level), recharge: "long", shortRegain: 1, name: L(`Kości psioniczne (k${psiDie(c.level)})`, `Psionic Energy Dice (d${psiDie(c.level)})`) },
        { id: "telekinetic-movement", max: 1, recharge: "short", name: L("Telekinetic Movement", "Telekinetic Movement") },
      ],
      features: [
        { lv: 3, id: "psionic-power", name: L("Psionic Power (Moc psioniczna)", "Psionic Power"),
          desc: (c) => L(`${psiDice(c.level)} kości k${psiDie(c.level)} (krótki odpoczynek oddaje jedną, długi wszystkie). Protective Field: reakcją zmniejszasz obrażenia swoje albo istoty w 30 ft o kość + ${atLeast1(c.mods.int)}. Psionic Strike: raz na turę po trafieniu bronią celu w 30 ft dodajesz kość + ${c.mods.int} obrażeń od mocy. Telekinetic Movement: akcja Magia, przenosisz przedmiot (Duży lub mniejszy) albo chętną istotę o 30 ft; raz na krótki odpoczynek albo za kość.`,
            `${psiDice(c.level)} d${psiDie(c.level)} dice (a short rest restores one, a long rest all). Protective Field: as a Reaction, reduce damage to you or a creature within 30 ft by a die + ${atLeast1(c.mods.int)}. Psionic Strike: once per turn after a weapon hit on a target within 30 ft, add a die + ${c.mods.int} Force damage. Telekinetic Movement: Magic action, move a Large or smaller object or a willing creature 30 ft; once per short rest or for a die.`) },
      ],
    },
  },

  nextLevel: {
    2: { pl: ["Action Surge (dodatkowa akcja)", "Tactical Mind"], en: ["Action Surge (an extra action)", "Tactical Mind"] },
    3: { pl: ["Wybór podklasy"], en: ["Choose a subclass"] },
    4: { pl: ["Feat albo +2 do cech", "Second Wind: 3 użycia", "Weapon Mastery: 4 rodzaje broni"], en: ["Feat or ability score increase", "Second Wind: 3 uses", "Weapon Mastery: 4 kinds of weapons"] },
    5: { pl: ["Extra Attack: 2 ataki", "Tactical Shift", "PB +3"], en: ["Extra Attack: 2 attacks", "Tactical Shift", "Proficiency bonus +3"] },
  },
};
