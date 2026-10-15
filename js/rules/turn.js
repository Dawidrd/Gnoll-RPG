// Turn planner: what you can do with your action, bonus action, reaction and free object interaction this turn.
// Options come from the 2024 rules (standard actions), the class, subclass, species, feats and the spells you have,
// filtered by level. Each option may cost a resource use or a spell slot; the sheet spends it and gives it back on undo.
import { SPELLS } from "./spells.js";
import { signed } from "./core.js";
import { BEASTS, speedText } from "./beasts.js";
import { bardicDie } from "./classes/bard.js";

const L = (pl, en) => ({ pl, en });
const has = (c, id) => c.resources.some((r) => r.id === id);
const inv = (c, id) => (c.classOptions || []).some((g) => g.chosen.some((x) => !x.problem && x.base === id));
const martialDie = (lv) => (lv < 5 ? "d6" : lv < 11 ? "d8" : lv < 17 ? "d10" : "d12");

/** Attacks you make when you take the Attack action. */
export function attacksPerAction(c) {
  if (c.level >= 5 && ["barbarian", "monk", "fighter", "paladin", "ranger"].includes(c.cls.id)) return 2;
  if (c.level >= 5 && c.cls.id === "warlock" && inv(c, "thirsting-blade")) return 2;
  return 1;
}

/** DC for Grapple and Shove (Unarmed Strike options); a Monk may use DEX. */
export function grappleDc(c) {
  const ab = c.cls.id === "monk" ? Math.max(c.mods.str, c.mods.dex) : c.mods.str;
  return 8 + ab + c.pb;
}

function standardActions(c) {
  const n = attacksPerAction(c);
  const stealth = c.skills.find((s) => s.id === "stealth")?.value ?? c.mods.dex;
  const dc = grappleDc(c);
  return [
    { id: "attack", group: "attack", label: L(n > 1 ? `Attack (${n} ataki)` : "Attack (atak)", n > 1 ? `Attack (${n} attacks)` : "Attack"),
      desc: L("Atak bronią albo bez broni (Unarmed Strike). Szczegóły trafienia i obrażeń masz na Starcie.", "A weapon or Unarmed Strike attack. Hit and damage are on the Start tab."), attack: true },
    { id: "grapple", group: "attack", label: L("Chwyt (Grapple)", "Grapple"), attack: true,
      desc: L(`Zamiast ataku: cel rzuca SIŁ albo ZRĘ przeciw DC ${dc}; porażka = Grappled.`, `Instead of an attack: the target makes a STR or DEX save against DC ${dc}; on a fail it's Grappled.`) },
    { id: "shove", group: "attack", label: L("Pchnięcie (Shove)", "Shove"), attack: true,
      desc: L(`Zamiast ataku: cel rzuca SIŁ albo ZRĘ przeciw DC ${dc}; porażka = 5 ft dalej albo Prone.`, `Instead of an attack: STR or DEX save against DC ${dc}; on a fail push it 5 ft or knock it Prone.`) },
    { id: "dash", group: "other", label: L("Dash (Sprint)", "Dash"), fx: ["dash"], desc: L(`+${c.speed} ft ruchu w tej turze.`, `+${c.speed} ft of movement this turn.`) },
    { id: "disengage", group: "other", label: L("Disengage (Odskok)", "Disengage"), fx: ["dis"], desc: L("Twój ruch nie prowokuje ataków okazyjnych do końca tury.", "Your movement doesn't provoke Opportunity Attacks this turn.") },
    { id: "dodge", group: "other", label: L("Dodge (Unik)", "Dodge"), fx: ["dodge"], desc: L("Do Twojej następnej tury ataki na Ciebie mają Utrudnienie, a rzuty ZRĘ masz z Przewagą.", "Until your next turn attacks against you have Disadvantage and you have Advantage on DEX saves.") },
    { id: "help", group: "other", label: L("Help (Pomoc)", "Help"), desc: L("Sojusznik ma Przewagę na test albo na pierwszy atak we wroga obok Ciebie.", "An ally gets Advantage on a check, or on the first attack against an enemy next to you.") },
    { id: "hide", group: "other", label: L("Hide (Ukrycie)", "Hide"), desc: L(`Skradanie ${signed(stealth)} przeciw DC 15, za osłoną albo w ciemności, poza wzrokiem wrogów.`, `Stealth ${signed(stealth)} against DC 15, behind cover or in darkness, out of enemies' sight.`) },
    { id: "influence", group: "other", label: L("Influence (Wpływ)", "Influence"), desc: L("Test CHA (albo Animal Handling), żeby zmienić nastawienie istoty.", "A CHA check (or Animal Handling) to change a creature's attitude.") },
    { id: "ready", group: "other", label: L("Ready (Przygotowanie)", "Ready"), desc: L("Ustalasz wyzwalacz i działanie; wykonujesz je Reakcją, gdy wyzwalacz nastąpi.", "Choose a trigger and a response; you take it with your Reaction when the trigger happens.") },
    { id: "search", group: "other", label: L("Search (Szukanie)", "Search"), desc: L("Test MĄD: Insight, Medicine, Perception albo Survival.", "A WIS check: Insight, Medicine, Perception or Survival.") },
    { id: "study", group: "other", label: L("Study (Badanie)", "Study"), desc: L("Test INT: Arcana, History, Investigation, Nature albo Religion.", "An INT check: Arcana, History, Investigation, Nature or Religion.") },
    { id: "utilize", group: "other", label: L("Utilize (Użycie przedmiotu)", "Utilize"), desc: L("Akcja na przedmiot, np. mikstura, lina, drugi przedmiot w turze.", "An action to use an object, e.g. a potion, a rope, a second object this turn.") },
  ];
}

/** Class, subclass, species and feat options, each tagged with the slot it takes. */
function featureOptions(c, ch) {
  const lv = c.level, sub = c.subclass ? ch.subclass : "", out = [];
  const add = (slot, o) => out.push({ slot, group: "feature", ...o });
  const wis = c.mods.wis, pb = c.pb;
  switch (c.cls.id) {
    case "barbarian": {
      const raging = !!c.active?.rage;
      const bonus = lv >= 9 ? 3 : 2;
      if (!raging) add("bonus", { id: "rage", label: L("Szał (Rage)", "Rage"), cost: { res: "rage", n: 1 }, set: { rage: true },
        desc: L(`Odporność na obuchowe, kłute i cięte; +${bonus} do obrażeń atakami Siłą; Przewaga na testy i rzuty SIŁ.`, `Resistance to bludgeoning, piercing and slashing; +${bonus} damage on Strength attacks; Advantage on STR checks and saves.`) });
      else add("bonus", { id: "rage-extend", label: L("Przedłuż szał", "Extend Rage"), desc: L("Gdy w tej turze nie atakujesz wroga ani nie zmuszasz go do rzutu obronnego.", "When this turn you don't attack an enemy or force it to make a save.") });
      if (lv >= 2) add("free", { id: "reckless", label: L("Reckless Attack", "Reckless Attack"), desc: L("Przy pierwszym ataku w turze: Przewaga na ataki SIŁ, ale wrogowie też mają Przewagę na Ciebie.", "On your first attack this turn: Advantage on STR attacks, but enemies have Advantage against you too.") });
      if (sub === "zealot" && lv >= 3 && raging) add("free", { id: "divine-fury", label: L("Divine Fury", "Divine Fury"), desc: L(`Pierwsze trafienie w turze w szale: +1k6 + ${Math.floor(lv / 2)} promienistych albo nekrotycznych.`, `First hit each turn while raging: +1d6 + ${Math.floor(lv / 2)} radiant or necrotic.`) });
      if (sub === "berserker" && lv >= 3 && raging) add("free", { id: "frenzy", label: L("Frenzy", "Frenzy"), desc: L(`W szale z Reckless Attack: pierwsze trafienie w turze +${bonus}k6.`, `While raging with Reckless Attack: first hit each turn deals +${bonus}d6.`) });
      if (sub === "zealot" && lv >= 3) add("bonus", { id: "gods", label: L("Warrior of the Gods", "Warrior of the Gods"), cost: { res: "gods", n: 1 }, desc: L("Wydajesz kości k12 z puli i leczysz się o ich sumę.", "Spend d12s from the pool and heal that much.") });
      break;
    }
    case "monk": {
      const die = martialDie(lv), hit = c.mods.dex + pb, dc = 8 + wis + pb;
      add("bonus", { id: "martial-arts", label: L("Cios (Martial Arts)", "Unarmed Strike (Martial Arts)"), attack: true, desc: L(`${signed(hit)}, 1${die}${signed(c.mods.dex)}.`, `${signed(hit)}, 1${die}${signed(c.mods.dex)}.`) });
      if (lv >= 2) {
        add("bonus", { id: "flurry", label: L("Flurry of Blows", "Flurry of Blows"), attack: true, cost: { res: "focus", n: 1 }, desc: L(`Dwa ciosy zamiast jednego: ${signed(hit)}, 1${die}${signed(c.mods.dex)} każdy.`, `Two strikes instead of one: ${signed(hit)}, 1${die}${signed(c.mods.dex)} each.`) });
        add("bonus", { id: "patient", label: L("Patient Defense", "Patient Defense"), fx: ["dis"], desc: L("Disengage za darmo.", "Free Disengage.") });
        add("bonus", { id: "patient-fp", label: L("Patient Defense + Dodge", "Patient Defense + Dodge"), fx: ["dis", "dodge"], cost: { res: "focus", n: 1 }, desc: L("Disengage i Dodge naraz.", "Disengage and Dodge together.") });
        add("bonus", { id: "step", label: L("Step of the Wind", "Step of the Wind"), fx: ["dash"], desc: L("Dash za darmo.", "Free Dash.") });
        add("bonus", { id: "step-fp", label: L("Step of the Wind + Disengage", "Step of the Wind + Disengage"), fx: ["dash", "dis"], cost: { res: "focus", n: 1 }, desc: L("Dash i Disengage naraz, skok dwa razy dalej.", "Dash and Disengage together, jump distance doubled.") });
      }
      if (lv >= 3) add("reaction", { id: "deflect", label: L("Deflect Attacks", "Deflect Attacks"), desc: L(`Trafienie obuchowe, kłute albo cięte: obrażenia −(1k10 ${signed(c.mods.dex + lv)}). Gdy spadną do 0, za 1 FP odbijasz atak (DC ${dc}).`, `A bludgeoning, piercing or slashing hit: damage −(1d10 ${signed(c.mods.dex + lv)}). If reduced to 0, spend 1 FP to redirect it (DC ${dc}).`) });
      if (lv >= 4) add("reaction", { id: "slow-fall", label: L("Slow Fall", "Slow Fall"), desc: L(`Upadek: obrażenia −${5 * lv}.`, `Falling: damage −${5 * lv}.`) });
      if (lv >= 5) add("free", { id: "stunning", label: L("Stunning Strike", "Stunning Strike"), cost: { res: "focus", n: 1 }, desc: L(`Raz na turę po trafieniu ciosem: cel rzuca KON przeciw DC ${dc}; porażka = Stunned.`, `Once per turn after an unarmed hit: CON save against DC ${dc}; on a fail it's Stunned.`) });
      if (sub === "shadow" && lv >= 3) add("action", { id: "shadow-darkness", label: L("Shadow Arts: Darkness", "Shadow Arts: Darkness"), cost: { res: "focus", n: 1 }, desc: L("Rzucasz Darkness; widzisz w niej.", "Cast Darkness; you can see through it.") });
      if (sub === "mercy" && lv >= 3) add("free", { id: "hand-of-harm", label: L("Hand of Harm", "Hand of Harm"), cost: { res: "focus", n: 1 }, desc: L(`Raz na turę po trafieniu ciosem: +1${die}${signed(wis)} nekrotycznych.`, `Once per turn after an unarmed hit: +1${die}${signed(wis)} necrotic.`) });
      break;
    }
    case "rogue": {
      const sneak = Math.ceil(lv / 2);
      add("free", { id: "sneak", label: L("Sneak Attack", "Sneak Attack"), desc: L(`Raz na turę: +${sneak}k6 przy ataku z Przewagą albo gdy obok celu stoi sojusznik (broń Finesse lub dystansowa).`, `Once per turn: +${sneak}d6 with Advantage, or when an ally is next to the target (Finesse or ranged weapon).`) });
      if (lv >= 2) {
        add("bonus", { id: "cunning-dash", label: L("Cunning Action: Dash", "Cunning Action: Dash"), fx: ["dash"], desc: L(`+${c.speed} ft ruchu.`, `+${c.speed} ft of movement.`) });
        add("bonus", { id: "cunning-dis", label: L("Cunning Action: Disengage", "Cunning Action: Disengage"), fx: ["dis"], desc: L("Bez ataków okazyjnych.", "No Opportunity Attacks.") });
        add("bonus", { id: "cunning-hide", label: L("Cunning Action: Hide", "Cunning Action: Hide"), desc: L("Ukrycie (Stealth przeciw DC 15).", "Hide (Stealth against DC 15).") });
      }
      if (lv >= 3) add("bonus", { id: "steady-aim", label: L("Steady Aim", "Steady Aim"), desc: L("Przewaga na następny atak, jeśli w tej turze się nie ruszasz (prędkość 0).", "Advantage on your next attack if you don't move this turn (Speed 0).") });
      if (lv >= 5) add("reaction", { id: "uncanny-dodge", label: L("Uncanny Dodge", "Uncanny Dodge"), desc: L("Trafia Cię atak, który widzisz: połowa obrażeń.", "An attack you can see hits you: halve the damage.") });
      if (sub === "phantom" && lv >= 3) add("free", { id: "wails", label: L("Wails from the Grave", "Wails from the Grave"), cost: { res: "wails", n: 1 }, desc: L(`Po Sneak Attack: drugi cel w 30 ft dostaje ${Math.ceil(sneak / 2)}k6 nekrotycznych.`, `After a Sneak Attack: a second creature within 30 ft takes ${Math.ceil(sneak / 2)}d6 necrotic.`) });
      if (sub === "arcane-trickster" && lv >= 3) add("bonus", { id: "mage-hand", label: L("Mage Hand (sterowanie)", "Mage Hand (control)"), desc: L("Kierujesz widmową dłonią akcją bonusową.", "Control the spectral hand as a bonus action.") });
      break;
    }
    case "cleric": {
      if (lv >= 2) {
        add("action", { id: "divine-spark", label: L("Divine Spark", "Divine Spark"), cost: { res: "channel", n: 1 }, desc: L(`Istota w 30 ft: leczenie 1k8 ${signed(wis)} albo tyle obrażeń promienistych lub nekrotycznych (KON na połowę).`, `A creature within 30 ft: heal 1d8 ${signed(wis)}, or that much radiant or necrotic damage (CON save for half).`) });
        add("action", { id: "turn-undead", label: L("Turn Undead", "Turn Undead"), cost: { res: "channel", n: 1 }, desc: L(`Nieumarli w 30 ft rzucają MĄD przeciw DC ${8 + wis + pb}; porażka = Frightened i Incapacitated.`, `Undead within 30 ft make a WIS save against DC ${8 + wis + pb}; on a fail Frightened and Incapacitated.`) });
      }
      if (lv >= 3) {
        if (sub === "life") add("action", { id: "preserve", label: L("Preserve Life", "Preserve Life"), cost: { res: "channel", n: 1 }, desc: L(`${5 * lv} HP do rozdzielenia między ranne istoty w 30 ft.`, `${5 * lv} HP to split among Bloodied creatures within 30 ft.`) });
        if (sub === "light") {
          add("action", { id: "dawn", label: L("Radiance of the Dawn", "Radiance of the Dawn"), cost: { res: "channel", n: 1 }, desc: L(`Wrogowie w 30 ft: KON, 2k10 + ${lv} promienistych.`, `Enemies within 30 ft: CON save, 2d10 + ${lv} radiant.`) });
          add("reaction", { id: "flare", label: L("Warding Flare", "Warding Flare"), cost: { res: "flare", n: 1 }, desc: L("Atak na Ciebie albo sojusznika w 30 ft ma Utrudnienie.", "An attack against you or an ally within 30 ft has Disadvantage.") });
        }
        if (sub === "trickery") add("bonus", { id: "duplicity", label: L("Invoke Duplicity", "Invoke Duplicity"), cost: { res: "channel", n: 1 }, desc: L("Iluzja Ciebie na minutę; czarujesz z jej miejsca.", "An illusion of you for a minute; cast spells from its space.") });
        if (sub === "grave") {
          add("bonus", { id: "path-grave", label: L("Path to the Grave", "Path to the Grave"), cost: { res: "channel", n: 1 }, desc: L(`Klątwa na istotę w 30 ft: Utrudnienie na ataki i rzuty; trafienie kończy ją za +${lv} obrażeń.`, `Curse a creature within 30 ft: Disadvantage on attacks and saves; a hit ends it for +${lv} damage.`) });
          add("free", { id: "pull-death", label: L("Pull of Death", "Pull of Death"), desc: L("Raz na turę: +1k4 nekrotycznych w ranną istotę.", "Once per turn: +1d4 necrotic against a wounded creature.") });
        }
        if (sub === "war") {
          add("bonus", { id: "war-priest", label: L("War Priest: atak", "War Priest: attack"), attack: true, cost: { res: "warpriest", n: 1 }, desc: L("Jeden atak bronią albo ciosem.", "One weapon or unarmed attack.") });
          add("reaction", { id: "guided", label: L("Guided Strike", "Guided Strike"), cost: { res: "channel", n: 1 }, desc: L("Chybiony atak (Twój albo sojusznika w 30 ft): +10 do rzutu.", "A missed attack (yours or an ally's within 30 ft): +10 to the roll.") });
        }
      }
      break;
    }
    case "warlock": {
      if (inv(c, "pact-of-the-blade")) add("bonus", { id: "pact-blade", label: L("Broń paktu", "Pact weapon"), desc: L("Przywołujesz albo przyzywasz broń paktu do ręki.", "Conjure or summon your pact weapon to your hand.") });
      if (inv(c, "pact-of-the-chain")) add("free", { id: "chain-attack", label: L("Atak chowańca", "Familiar attack"), desc: L("W akcji Attack możesz oddać jeden atak, żeby chowaniec zaatakował swoją Reakcją.", "In the Attack action you can give up one attack so your familiar attacks with its Reaction.") });
      if (sub === "archfey" && lv >= 3) add("bonus", { id: "fey-step", label: L("Steps of the Fey", "Steps of the Fey"), cost: { res: "fey-steps", n: 1 }, desc: L("Misty Step bez slotu: teleport 30 ft.", "Misty Step without a slot: teleport 30 ft.") });
      if (sub === "celestial" && lv >= 3) add("bonus", { id: "healing-light", label: L("Healing Light", "Healing Light"), cost: { res: "healing-light", n: 1 }, desc: L("Wydajesz k6 z puli (najwyżej tyle, ile CHA) i leczysz istotę w 60 ft.", "Spend d6s from the pool (up to your CHA modifier) to heal a creature within 60 ft.") });
      if (sub === "undead" && lv >= 3) add("bonus", { id: "form-of-dread", label: L("Form of Dread", "Form of Dread"), cost: { res: "form-of-dread", n: 1 }, desc: L(`Minuta: ${lv + 1}k10 tymczasowych HP, odporność na Frightened, raz na turę trafienie straszy (MĄD).`, `One minute: ${lv + 1}d10 temporary HP, immune to Frightened, once per turn a hit can frighten (WIS).`) });
      if (sub === "fiend" && lv >= 3) add("free", { id: "dark-blessing", label: L("Dark One's Blessing", "Dark One's Blessing"), desc: L(`Wróg spada do 0 HP: ${Math.max(1, c.mods.cha + lv)} tymczasowych HP.`, `An enemy drops to 0 HP: ${Math.max(1, c.mods.cha + lv)} temporary HP.`) });
      break;
    }
    case "bard": {
      const d = bardicDie(lv), cha = c.mods.cha, dc = 8 + cha + pb;
      add("bonus", { id: "bardic-inspiration", label: L("Bardic Inspiration", "Bardic Inspiration"), cost: { res: "bardic-inspiration", n: 1 },
        desc: L(`Sojusznik w 60 ft dostaje k${d}; w ciągu godziny doda ją do nieudanego testu k20.`, `An ally within 60 ft gets a d${d}; within an hour they can add it to a failed D20 Test.`) });
      if (sub === "lore" && lv >= 3) add("reaction", { id: "cutting-words", label: L("Cutting Words", "Cutting Words"), cost: { res: "bardic-inspiration", n: 1 },
        desc: L(`Istota w 60 ft rzuca na obrażenia, zdaje test albo trafia: odejmij k${d}.`, `A creature within 60 ft rolls damage, succeeds on a check or hits: subtract a d${d}.`) });
      if (sub === "glamour" && lv >= 3) {
        add("bonus", { id: "mantle-of-inspiration", label: L("Mantle of Inspiration", "Mantle of Inspiration"), cost: { res: "bardic-inspiration", n: 1 },
          desc: L(`Do ${Math.max(1, cha)} istot w 60 ft: 2 × k${d} tymczasowych HP i ruch reakcją bez ataków okazyjnych.`, `Up to ${Math.max(1, cha)} creatures within 60 ft: 2 × d${d} Temporary HP and a Reaction move without Opportunity Attacks.`) });
        add("free", { id: "beguiling-magic", label: L("Beguiling Magic", "Beguiling Magic"), cost: { res: "beguiling-magic", n: 1 },
          desc: L(`Po czarze zauroczenia lub iluzji ze slotu: istota w 60 ft rzuca MĄD (DC ${dc}) albo jest Charmed lub Frightened.`, `After an Enchantment or Illusion spell with a slot: a creature within 60 ft makes a WIS save (DC ${dc}) or is Charmed or Frightened.`) });
      }
      if (sub === "dance" && lv >= 3) add("free", { id: "agile-strikes", label: L("Agile Strikes", "Agile Strikes"),
        desc: L(`Wydajesz inspirację w akcji, akcji bonusowej albo reakcji: do tego cios bez broni ${signed(c.mods.dex + pb)}, k${d} ${signed(c.mods.dex)} obuchowych.`, `When you spend Inspiration in an action, Bonus Action or Reaction: also an Unarmed Strike ${signed(c.mods.dex + pb)}, d${d} ${signed(c.mods.dex)} bludgeoning.`) });
      if (sub === "spirits" && lv >= 3) {
        add("bonus", { id: "controlled-channeling", label: L("Controlled Channeling (wybrany duch)", "Controlled Channeling"), cost: { res: "bardic-inspiration", n: 1 },
          desc: L(`Przywołujesz ducha o numerze do ${d} (opis na karcie Postać).`, `Channel a spirit numbered up to ${d} (see the Character tab).`) });
        add("action", { id: "unleash-spirit", label: L("Uwolnienie ducha", "Unleash a spirit"), desc: L(`Akcja Magic: przywołany duch działa na istotę w 30 ft (DC ${dc}).`, `Magic action: your channeled spirit affects a creature within 30 ft (DC ${dc}).`) });
      }
      break;
    }
    case "druid": {
      const ws = c.wildShape, wsDc = 8 + wis + pb, temp = (sub === "moon" ? 3 : 1) * lv;
      if (lv >= 2) {
        if (!ws) for (const id of c.forms || []) {
          const b = BEASTS[id];
          const ac = sub === "moon" ? Math.max(b.ac, 13 + wis) : b.ac;
          add("bonus", { id: "ws-" + id, label: L(`Wild Shape: ${b.name.pl}`, `Wild Shape: ${b.name.en}`), cost: { res: "wild-shape", n: 1 }, set: { wildShape: id }, tempHp: temp,
            desc: L(`KP ${ac}, ${speedText(b).pl}; ${temp} tymczasowych HP.`, `AC ${ac}, ${speedText(b).en}; ${temp} Temporary HP.`) });
        }
        else add("bonus", { id: "ws-leave", label: L("Powrót do swojej postaci", "Leave Wild Shape"), set: { wildShape: "" }, desc: L("Kończysz Wild Shape.", "End Wild Shape.") });
        add("action", { id: "wild-companion", label: L("Wild Companion", "Wild Companion"), cost: { res: "wild-shape", n: 1 },
          desc: L("Za użycie Wild Shape rzucasz Find Familiar (chowaniec Fey do długiego odpoczynku). Można też za slot.", "Spend a Wild Shape use to cast Find Familiar (a Fey familiar until a long rest). A slot works too.") });
      }
      if (ws) add("attack", { id: "beast-attack", label: L(`Atak: ${ws.beast.name.pl}`, `Attack: ${ws.beast.name.en}`), attack: true, desc: ws.beast.attacks });
      if (sub === "land" && lv >= 3) add("action", { id: "lands-aid", label: L("Land's Aid", "Land's Aid"), cost: { res: "wild-shape", n: 1 },
        desc: L(`Kula 10 ft do 60 ft: wybrane istoty KON (DC ${wsDc}), 2k6 nekrotycznych (połowa przy sukcesie); jedna istota leczy 2k6.`, `10-ft Sphere within 60 ft: chosen creatures CON save (DC ${wsDc}), 2d6 Necrotic (half on a success); one creature heals 2d6.`) });
      if (sub === "sea" && lv >= 3) {
        add("bonus", { id: "wrath-of-the-sea", label: L("Wrath of the Sea", "Wrath of the Sea"), cost: { res: "wild-shape", n: 1 },
          desc: L(`10 minut mgiełki 5 ft; istota w niej: KON (DC ${wsDc}) albo ${Math.max(1, wis)}k6 od zimna i odepchnięcie 15 ft.`, `10 minutes of spray, 5 ft; a creature in it: CON save (DC ${wsDc}) or ${Math.max(1, wis)}d6 Cold and pushed 15 ft.`) });
        add("bonus", { id: "wrath-again", label: L("Wrath of the Sea: kolejny cel", "Wrath of the Sea: next target"), desc: L("Gdy mgiełka trwa: kolejna istota rzuca KON.", "While the spray lasts: another creature makes a CON save.") });
      }
      if (sub === "stars" && lv >= 3) {
        add("bonus", { id: "starry-form", label: L("Starry Form", "Starry Form"), cost: { res: "wild-shape", n: 1 }, desc: L("10 minut: Łucznik, Kielich albo Smok.", "10 minutes: Archer, Chalice or Dragon.") });
        add("bonus", { id: "starry-archer", label: L("Gwiezdna strzała (Łucznik)", "Luminous arrow (Archer)"), attack: true,
          desc: L(`W Starry Form: atak czarem ${signed(wis + pb)}, 60 ft, 1k8 ${signed(wis)} promienistych.`, `In Starry Form: spell attack ${signed(wis + pb)}, 60 ft, 1d8 ${signed(wis)} Radiant.`) });
      }
      break;
    }
    case "wizard": {
      if (sub === "diviner" && lv >= 3) add("free", { id: "portent", label: L("Portent", "Portent"), cost: { res: "portent", n: 1 }, desc: L("Zastępujesz rzut k20 (Twój albo widocznej istoty) zapisanym wynikiem.", "Replace a d20 roll (yours or a creature you can see) with a recorded roll.") });
      if (sub === "evoker" && lv >= 3) add("free", { id: "potent-cantrip", label: L("Potent Cantrip", "Potent Cantrip"), desc: L("Chybiona sztuczka albo zdany rzut celu: i tak połowa obrażeń.", "A missed cantrip or a successful save: still half damage.") });
      if (sub === "illusionist" && lv >= 3) add("bonus", { id: "quick-illusion", label: L("Minor Illusion (akcja bonusowa)", "Minor Illusion (Bonus Action)"), desc: L("Dźwięk i obraz jednym rzuceniem.", "Sound and image with one casting.") });
      if (sub === "abjurer" && lv >= 3) add("bonus", { id: "ward-charge", label: L("Arcane Ward: slot → HP osłony", "Arcane Ward: slot → ward HP"), desc: L("Wydajesz slot; osłona odzyskuje 2 × jego krąg HP.", "Spend a slot; the ward regains 2 × its level HP.") });
      break;
    }
    case "sorcerer": {
      add("bonus", { id: "innate-sorcery", label: L("Innate Sorcery", "Innate Sorcery"), cost: { res: "innate-sorcery", n: 1 }, desc: L("Minuta: DC czarów +1 i Przewaga na ataki czarami Zaklinacza.", "One minute: spell save DC +1 and Advantage on Sorcerer spell attacks.") });
      if (lv >= 2) add("bonus", { id: "font", label: L("Font of Magic", "Font of Magic"), desc: L("Zamieniasz Punkty Czarów na slot albo slot na punkty.", "Turn Sorcery Points into a slot, or a slot into points.") });
      if ((ch.classOptions?.metamagic || []).includes("quickened-spell")) add("bonus", { id: "quickened", label: L("Quickened Spell", "Quickened Spell"), cost: { res: "sorcery-points", n: 2 }, desc: L("Czar z czasem rzucania Akcja rzucasz akcją bonusową (nie razem z innym czarem 1.+ kręgu).", "Cast an Action spell as a Bonus Action (not with another level 1+ spell this turn).") });
      if (sub === "wild-magic" && lv >= 3) add("free", { id: "tides", label: L("Tides of Chaos", "Tides of Chaos"), cost: { res: "tides-of-chaos", n: 1 }, desc: L("Przewaga na jeden test k20.", "Advantage on one d20 test.") });
      break;
    }
    default: break;
  }

  // Species
  const sp = ch.speciesId, choice = ch.speciesChoice || {};
  if (has(c, "breath")) add("attack", { id: "breath", label: L("Zionięcie (Breath Weapon)", "Breath Weapon"), cost: { res: "breath", n: 1 }, attack: true,
    desc: L(`Zamiast jednego ataku: stożek 15 ft albo linia 30 ft, ZRĘ przeciw DC ${8 + c.mods.con + pb}, ${lv < 5 ? 1 : 2}k10.`, `Instead of one attack: 15-ft cone or 30-ft line, DEX save against DC ${8 + c.mods.con + pb}, ${lv < 5 ? 1 : 2}d10.`) });
  if (has(c, "healing-hands")) add("action", { id: "healing-hands", label: L("Healing Hands", "Healing Hands"), cost: { res: "healing-hands", n: 1 }, desc: L(`Dotyk: leczysz ${pb}k4.`, `Touch: heal ${pb}d4.`) });
  if (has(c, "revelation")) add("bonus", { id: "revelation", label: L("Celestial Revelation", "Celestial Revelation"), cost: { res: "revelation", n: 1 }, desc: L(`Minuta przemiany; raz na turę +${pb} obrażeń.`, `A minute of transformation; once per turn +${pb} damage.`) });
  if (has(c, "giant")) {
    if (choice.giant === "cloud") add("bonus", { id: "cloud-jaunt", label: L("Cloud's Jaunt", "Cloud's Jaunt"), cost: { res: "giant", n: 1 }, desc: L("Teleport do 30 ft w widoczne miejsce.", "Teleport up to 30 ft to a space you can see.") });
    if (choice.giant === "stone") add("reaction", { id: "stone-endurance", label: L("Stone's Endurance", "Stone's Endurance"), cost: { res: "giant", n: 1 }, desc: L(`Obrażenia −(1k12 ${signed(c.mods.con)}).`, `Damage −(1d12 ${signed(c.mods.con)}).`) });
    if (choice.giant === "storm") add("reaction", { id: "storm-thunder", label: L("Storm's Thunder", "Storm's Thunder"), cost: { res: "giant", n: 1 }, desc: L("Istota, która Cię zraniła (60 ft), dostaje 1k8 od grzmotu.", "The creature that hurt you (60 ft) takes 1d8 thunder.") });
    if (["fire", "frost", "hill"].includes(choice.giant)) add("free", { id: "giant-hit", label: L({ fire: "Fire's Burn", frost: "Frost's Chill", hill: "Hill's Tumble" }[choice.giant], { fire: "Fire's Burn", frost: "Frost's Chill", hill: "Hill's Tumble" }[choice.giant]), cost: { res: "giant", n: 1 },
      desc: L({ fire: "Po trafieniu: +1k10 od ognia.", frost: "Po trafieniu: +1k6 od zimna, cel −10 ft.", hill: "Po trafieniu: cel Large lub mniejszy pada (Prone)." }[choice.giant], { fire: "After a hit: +1d10 fire.", frost: "After a hit: +1d6 cold, target −10 ft.", hill: "After a hit: a Large or smaller target falls Prone." }[choice.giant]) });
  }
  if (has(c, "large-form")) add("bonus", { id: "large-form", label: L("Large Form", "Large Form"), cost: { res: "large-form", n: 1 }, desc: L("10 minut: Large, Przewaga na testy SIŁ, +10 ft.", "10 minutes: Large, Advantage on STR checks, +10 ft.") });
  if (has(c, "adrenaline")) add("bonus", { id: "adrenaline", label: L("Adrenaline Rush", "Adrenaline Rush"), cost: { res: "adrenaline", n: 1 }, fx: ["dash"], tempHp: pb, desc: L(`Dash i ${pb} tymczasowych HP.`, `Dash and ${pb} temporary HP.`) });
  if (has(c, "stonecunning")) add("bonus", { id: "stonecunning", label: L("Stonecunning", "Stonecunning"), cost: { res: "stonecunning", n: 1 }, desc: L("10 minut Tremorsense 60 ft na kamieniu.", "10 minutes of Tremorsense 60 ft on stone.") });
  if (has(c, "howl")) add("bonus", { id: "howl", label: L("Wycie (Howl)", "Howl"), cost: { res: "howl", n: 1 }, desc: L(`Wybrani wrogowie w 15 ft: MĄD przeciw DC ${8 + c.mods.con + pb}; porażka = Utrudnienie na ataki i rzuty do Twojej tury.`, `Chosen enemies within 15 ft: WIS save against DC ${8 + c.mods.con + pb}; on a fail Disadvantage on attacks and saves until your turn.`) });
  if (has(c, "eerie-token")) add("bonus", { id: "eerie-token", label: L("Eerie Token", "Eerie Token"), cost: { res: "eerie-token", n: 1 }, desc: L("Tworzysz żeton (włos, paznokieć) do wiadomości i podglądu.", "Make a token (hair, a nail) for messages and remote viewing.") });
  if (sp === "dhampir") add("attack", { id: "bite", label: L("Vampiric Bite", "Vampiric Bite"), attack: true, desc: L(`Ugryzienie zamiast ataku: 1k4 ${signed(c.mods.con)} kłutych; Przewaga, gdy masz połowę HP lub mniej.`, `A bite instead of an attack: 1d4 ${signed(c.mods.con)} piercing; Advantage at half HP or less.`) });

  // Feats and Dark Gifts with a reaction
  const featReact = { "steel-yourself": [L("Steel Yourself", "Steel Yourself"), L("Nieudany rzut przeciw Charmed/Frightened: +PB.", "A failed save against Charmed/Frightened: +PB.")],
    "unearthly-scream": [L("Unearthly Scream", "Unearthly Scream"), L(`Trafia Cię atak: +${pb} KP przeciw niemu.`, `An attack hits you: +${pb} AC against it.`)],
    "mist-walk": [L("Mist Walk", "Mist Walk"), L("Obrażenia albo nieudany rzut przeciw Grappled/Restrained: teleport 15 ft.", "Damage or a failed save against Grappled/Restrained: teleport 15 ft.")],
    symbiosis: [L("Sustained Symbiosis", "Sustained Symbiosis"), L("Nieudany rzut obronny: wydajesz kość wytrzymałości i dodajesz wynik.", "A failed save: spend a Hit Point Die and add the roll.")] };
  for (const [id, [label, desc]] of Object.entries(featReact)) if (has(c, id)) add("reaction", { id, label, desc, cost: { res: id, n: 1 } });
  if (has(c, "lengthened-strike")) add("free", { id: "lengthened-strike", label: L("Lengthened Strike", "Lengthened Strike"), cost: { res: "lengthened-strike", n: 1 }, desc: L("Atak wręcz z zasięgiem +10 ft.", "A melee attack with +10 ft reach.") });
  return out;
}

/** Spells you can cast in combat, by casting time: A → action, BA → bonus action, R → reaction. */
function spellOptions(c) {
  const out = [];
  const seen = new Set();
  for (const src of c.spellSources) for (const x of src.spells) {
    const s = SPELLS[x.id];
    if (!s || seen.has(x.id) || x.uses === "ritual") continue;
    if (c.wildShape && !(c.subclassId === "moon" && x.kind === "always")) continue; // no spellcasting in Wild Shape (Moon: circle spells)
    const slot = s.time === "A" ? "action" : s.time === "BA" ? "bonus" : s.time === "R" ? "reaction" : null;
    if (!slot) continue;
    seen.add(x.id);
    const free = x.free ? c.resources.find((r) => r.id === x.free) : src.resPrefix ? c.resources.find((r) => r.id === src.resPrefix + x.id) : null;
    out.push({ slot, group: "spell", id: "spell:" + x.id, spell: x.id, label: s.name, conc: s.conc,
      cost: s.circle > 0 && x.uses !== "atwill" ? { spell: { circle: s.circle, free: free ? free.id : null } } : null,
      desc: L(s.circle ? `${s.circle}. krąg${s.conc ? " · koncentracja" : ""}` : `Sztuczka${s.conc ? " · koncentracja" : ""}`, s.circle ? `Level ${s.circle}${s.conc ? " · concentration" : ""}` : `Cantrip${s.conc ? " · concentration" : ""}`) });
  }
  return out;
}

/** Everything for the planner, grouped by slot. */
export function turnOptions(c, ch) {
  const feats = featureOptions(c, ch);
  const spells = spellOptions(c);
  const std = standardActions(c);
  const attackGroup = [...std.filter((o) => o.group === "attack"), ...feats.filter((o) => o.slot === "attack")].map((o) => ({ ...o, slot: "action" }));
  return {
    attacks: attacksPerAction(c),
    action: [...attackGroup, ...feats.filter((o) => o.slot === "action"), ...spells.filter((o) => o.slot === "action"), ...std.filter((o) => o.group === "other").map((o) => ({ ...o, slot: "action" }))],
    bonus: [...feats.filter((o) => o.slot === "bonus"), ...spells.filter((o) => o.slot === "bonus"),
      { slot: "bonus", group: "other", id: "offhand", attack: true, label: L("Atak drugą bronią (Light)", "Off-hand attack (Light)"), desc: L("Po ataku lekką bronią: atak drugą lekką bronią, bez modyfikatora do obrażeń.", "After attacking with a Light weapon: attack with another Light weapon, no modifier to damage.") }],
    reaction: [{ slot: "reaction", group: "other", id: "oa", attack: true, label: L("Atak okazyjny", "Opportunity Attack"), desc: L("Wróg wychodzi z Twojego zasięgu: jeden atak wręcz.", "An enemy leaves your reach: one melee attack.") },
      { slot: "reaction", group: "other", id: "readied", label: L("Przygotowana akcja (Ready)", "Readied action"), desc: L("Wyzwalacz z akcji Ready nastąpił.", "The trigger from your Ready action happened.") },
      ...feats.filter((o) => o.slot === "reaction"), ...spells.filter((o) => o.slot === "reaction")],
    item: [{ id: "draw", label: L("Dobycie lub schowanie broni", "Draw or stow a weapon") }, { id: "door", label: L("Otwarcie drzwi", "Open a door") },
      { id: "pick", label: L("Podniesienie przedmiotu", "Pick up an item") }, { id: "other", label: L("Coś innego", "Something else") }],
    free: feats.filter((o) => o.slot === "free"),
  };
}

/** Short hints for the current state of the turn. Each: { kind: ""|"ok"|"warn", text: {pl,en} }. */
export function turnTips(c, ch, turn, opts) {
  const tips = [];
  const A = turn.action, B = turn.bonus;
  const fx = new Set([A, B].flatMap((p) => p?.fx || []));
  const per = Math.floor(c.speed / 5), total = per * (fx.has("dash") ? 2 : 1), left = Math.max(0, total - (turn.moved || 0)) * 5;
  const raging = !!c.active?.rage;
  const attacked = !!(A?.attack || B?.attack);
  if (A && B && left === 0) tips.push({ kind: "ok", text: L("Tura wykorzystana. Powiedz GM-owi, że kończysz.", "Turn used up. Tell the GM you're done.") });
  if (!A) tips.push({ kind: "", text: opts.attacks > 1 ? L(`Akcja wolna. Attack to ${opts.attacks} ataki.`, `Action free. Attack gives ${opts.attacks} attacks.`) : L("Akcja wolna.", "Action free.") });
  const bonusFeat = opts.bonus.filter((o) => o.group === "feature" && !o.disabled).slice(0, 3);
  if (!B && bonusFeat.length) tips.push({ kind: "", text: { pl: "Akcja bonusowa wolna: " + bonusFeat.map((o) => o.label.pl.split(" (")[0]).join(", ") + ".", en: "Bonus action free: " + bonusFeat.map((o) => o.label.en).join(", ") + "." } });
  if (raging && A && !attacked && B?.id !== "rage-extend" && B?.id !== "rage") tips.push({ kind: "warn", text: L("Szał trwa, ale w tej turze nie atakujesz. Zaatakuj, zmuś wroga do rzutu albo przedłuż szał akcją bonusową.", "You're raging but not attacking this turn. Attack, force a save or extend Rage with your bonus action.") });
  if (raging) tips.push({ kind: "ok", text: L("W szale: połowa obrażeń obuchowych, kłutych i ciętych. Wpisuj na Starcie już zmniejszone.", "Raging: half bludgeoning, piercing and slashing damage. Enter it already halved on Start.") });
  if (c.cls.id === "monk" && A?.attack && !B) tips.push({ kind: "", text: L("Po akcji Attack masz cios akcją bonusową (Martial Arts) albo Flurry of Blows.", "After the Attack action you get an unarmed strike as a bonus action (Martial Arts) or Flurry of Blows.") });
  if (c.cls.id === "rogue" && attacked) tips.push({ kind: "", text: L("Trafiłeś z Przewagą albo z sojusznikiem obok celu? Doliczasz Sneak Attack (raz na turę).", "Hit with Advantage or with an ally next to the target? Add Sneak Attack (once per turn).") });
  if (c.cls.id === "barbarian" && c.level >= 2 && !A) tips.push({ kind: "", text: L("Reckless Attack: Przewaga na ataki SIŁ w tej turze, ale wrogowie też ją mają na Ciebie.", "Reckless Attack: Advantage on STR attacks this turn, but enemies get it against you too.") });
  if (ch.concentration && SPELLS[ch.concentration]) tips.push({ kind: "", text: { pl: `Koncentrujesz się na ${SPELLS[ch.concentration].name.en}. Nowy czar z koncentracją go zakończy.`, en: `You're concentrating on ${SPELLS[ch.concentration].name.en}. A new concentration spell ends it.` } });
  if (left > 0) tips.push({ kind: "", text: { pl: `Zostało ${left} ft ruchu. Możesz go dzielić przed atakiem i po nim.`, en: `${left} ft of movement left. You can split it before and after attacks.` } });
  if (fx.has("dis")) tips.push({ kind: "ok", text: L("Możesz odchodzić od wrogów bez ataku okazyjnego.", "You can move away from enemies without Opportunity Attacks.") });
  else if (left > 0) tips.push({ kind: "warn", text: L("Bez Disengage odejście od wroga obok Ciebie da mu atak okazyjny.", "Without Disengage, leaving an enemy's reach gives it an Opportunity Attack.") });
  if (!turn.reaction) tips.push({ kind: "", text: L("Reakcja gotowa, zwykle w turze wroga. Wraca na początku Twojej tury.", "Reaction ready, usually on an enemy's turn. It comes back at the start of your turn.") });
  return { tips, movement: { per, total, left, dash: fx.has("dash") }, fx: [...fx] };
}
