// General and Fighting Style feats (2024 Player's Handbook, chapter 5). Descriptions are our own short summaries.
//
// prereq:   { ability: ["str","dex"] }   one of these scores is 13+
//           { training: "light"|"medium"|"heavy"|"shield" }
//           { spellcasting: true }       Spellcasting or Pact Magic feature
//           { fightingStyle: true }      a Fighting Style class feature
// increase: abilities the feat raises by 1 (max 20); "any" = any ability; "nonSave" = one without save proficiency
// effects:  training, save (Resilient), speed, tools, skill picks, damage type, spells (noted as text until spells arrive)
import { DAMAGE_NAMES } from "./damage.js";


const STR_DEX = ["str", "dex"];
const MENTAL = ["int", "wis", "cha"];
const g = (pl, en, o) => ({ source: "phb2024", category: "general", name: { pl: `${pl} (${en})`, en }, ...o });
const fs = (pl, en, o) => ({ source: "phb2024", category: "fighting-style", prereq: { fightingStyle: true }, name: { pl: `${pl} (${en})`, en }, ...o });
const D = (pl, en) => ({ pl, en });

export const GENERAL_FEATS = {
  asi: g("Zwiększenie cech", "Ability Score Improvement", { asi: true, repeatable: true,
    desc: D("+2 do jednej cechy albo +1 do dwóch. Żadna nie może przekroczyć 20.", "+2 to one ability or +1 to two. None can go above 20.") }),
  actor: g("Aktor", "Actor", { prereq: { ability: ["cha"] }, increase: ["cha"],
    desc: D("Przewaga na Oszustwo i Występy, gdy udajesz kogoś w przebraniu; naśladujesz głosy i dźwięki.", "Advantage on Deception and Performance while disguised as someone; you mimic voices and sounds.") }),
  athlete: g("Atleta", "Athlete", { prereq: { ability: STR_DEX }, increase: STR_DEX, climb: true,
    desc: D("Prędkość wspinaczki równa zwykłej; wstajesz z ziemi za 5 ft ruchu; skok z rozbiegu po 5 ft.", "Climb speed equal to your speed; standing up costs 5 ft; running jumps after 5 ft.") }),
  charger: g("Szarżownik", "Charger", { prereq: { ability: STR_DEX }, increase: STR_DEX,
    desc: D("Dash daje +10 ft. Po biegu 10 ft w linii prostej trafienie wręcz: +1k8 obrażeń albo odepchnięcie o 10 ft, raz na turę.", "Dash gives +10 ft. After moving 10 ft straight, a melee hit deals +1d8 or pushes 10 ft, once per turn.") }),
  chef: g("Kucharz", "Chef", { increase: ["con", "wis"], tools: ["cook"],
    desc: D("Biegłość w przyborach kucharskich. Posiłek na krótkim odpoczynku leczy dodatkowo 1k8; przekąski dają tymczasowe HP.", "Proficiency with Cook's Utensils. A meal on a short rest heals an extra 1d8; treats give temporary HP.") }),
  "crossbow-expert": g("Kusznik", "Crossbow Expert", { prereq: { ability: ["dex"] }, increase: ["dex"],
    desc: D("Ignorujesz Loading kusz, strzelasz z bliska bez Utrudnienia, dodajesz cechę do obrażeń drugiego strzału z lekkiej kuszy.", "Ignore crossbow Loading, no Disadvantage in melee, add your modifier to the extra light crossbow attack.") }),
  crusher: g("Miażdżyciel", "Crusher", { increase: ["str", "con"],
    desc: D("Raz na turę trafienie obuchowe przesuwa cel o 5 ft. Krytyk obuchowy: ataki na cel mają Przewagę do Twojej następnej tury.", "Once per turn a bludgeoning hit moves the target 5 ft. A bludgeoning crit gives attacks against it Advantage until your next turn.") }),
  "defensive-duelist": g("Obronny szermierz", "Defensive Duelist", { prereq: { ability: ["dex"] }, increase: ["dex"],
    desc: D("Z bronią finezyjną: Reakcja, gdy trafia Cię atak wręcz — dodajesz PB do AC do swojej następnej tury.", "With a finesse weapon: Reaction when a melee attack hits you — add PB to AC until your next turn.") }),
  "dual-wielder": g("Walka dwiema brońmi", "Dual Wielder", { prereq: { ability: STR_DEX }, increase: STR_DEX,
    desc: D("Po ataku bronią lekką dodatkowy atak akcją bonusową inną bronią jednoręczną; dobywasz dwóch broni naraz.", "After attacking with a light weapon, an extra bonus-action attack with another one-handed weapon; draw two weapons at once.") }),
  durable: g("Wytrzymały", "Durable", { increase: ["con"],
    desc: D("Przewaga na rzuty przeciw śmierci. Akcją bonusową wydajesz kość wytrzymałości i leczysz się o wynik.", "Advantage on death saves. As a bonus action spend a Hit Point Die and heal that much.") }),
  "elemental-adept": g("Adept żywiołów", "Elemental Adept", { prereq: { spellcasting: true }, increase: MENTAL, repeatable: true, damageType: true,
    desc: D("Wybrany typ (kwas, zimno, ogień, błyskawice, grzmot): Twoje czary ignorują odporność, a 1 na kości liczysz jako 2.", "Chosen type (acid, cold, fire, lightning, thunder): your spells ignore resistance and 1s on damage dice count as 2.") }),
  "fey-touched": g("Dotknięty przez Fey", "Fey-Touched", { increase: MENTAL, spellAbilityFromIncrease: true,
    innate: [{ id: "misty-step", uses: "long" }], spellPicks: [{ key: "spell", count: 1, circles: [1], schools: ["div", "enc"], uses: "long" }],
    desc: D("Misty Step i jeden czar 1. kręgu z Wieszczenia lub Zauroczeń: zawsze przygotowane, każdy raz na długi odpoczynek za darmo.", "Misty Step and one level 1 Divination or Enchantment spell: always prepared, each free once per long rest.") }),
  grappler: g("Zapaśnik", "Grappler", { prereq: { ability: STR_DEX }, increase: STR_DEX,
    desc: D("Raz na turę cios bez broni w akcji Attack zadaje obrażenia i chwyta naraz; Przewaga na ataki w pochwyconego.", "Once per turn an unarmed strike in the Attack action both damages and grapples; Advantage against creatures you grapple.") }),
  "great-weapon-master": g("Mistrz broni ciężkiej", "Great Weapon Master", { prereq: { ability: ["str"] }, increase: ["str"],
    desc: D("Trafienie bronią ciężką w akcji Attack: +PB obrażeń. Po krytyku albo zabiciu atak akcją bonusową.", "A heavy-weapon hit in the Attack action deals +PB damage. After a crit or a kill, one bonus-action attack.") }),
  "heavily-armored": g("Ciężko opancerzony", "Heavily Armored", { prereq: { training: "medium" }, increase: ["con", "str"], training: ["heavy"],
    desc: D("Biegłość w ciężkich zbrojach.", "Training with heavy armor.") }),
  "heavy-armor-master": g("Mistrz ciężkiej zbroi", "Heavy Armor Master", { prereq: { training: "heavy" }, increase: ["con", "str"],
    desc: D("W ciężkiej zbroi obrażenia obuchowe, kłute i cięte z każdego trafienia maleją o PB.", "In heavy armor, bludgeoning, piercing and slashing damage from each hit is reduced by PB.") }),
  "inspiring-leader": g("Natchniony przywódca", "Inspiring Leader", { prereq: { ability: ["wis", "cha"] }, increase: ["wis", "cha"],
    desc: D("Po odpoczynku przemowa: do 6 sojuszników dostaje tymczasowe HP równe poziomowi + modyfikator podniesionej cechy.", "After a rest, a speech: up to 6 allies gain temporary HP equal to your level + the raised ability's modifier.") }),
  "keen-mind": g("Bystry umysł", "Keen Mind", { prereq: { ability: ["int"] }, increase: ["int"], lore: ["arcana", "history", "investigation", "nature", "religion"],
    desc: D("Jedna z: Arcana, Historia, Śledztwo, Przyroda, Religia — biegłość, a jeśli już ją masz, Expertise. Study akcją bonusową.", "One of Arcana, History, Investigation, Nature, Religion — proficiency, or Expertise if you have it. Study as a bonus action.") }),
  "lightly-armored": g("Lekko opancerzony", "Lightly Armored", { increase: STR_DEX, training: ["light", "shield"],
    desc: D("Biegłość w lekkich zbrojach i tarczach.", "Training with light armor and shields.") }),
  "mage-slayer": g("Pogromca magów", "Mage Slayer", { increase: STR_DEX,
    desc: D("Raniony przez Ciebie wróg ma Utrudnienie na koncentrację. Raz na odpoczynek zamieniasz nieudany rzut INT, MĄD lub CHA w sukces.", "Creatures you damage have Disadvantage on concentration saves. Once per rest turn a failed INT, WIS or CHA save into a success.") }),
  "martial-weapon-training": g("Trening broni wojennej", "Martial Weapon Training", { increase: STR_DEX, weapons: "martial",
    desc: D("Biegłość w broni wojennej.", "Proficiency with martial weapons.") }),
  "medium-armor-master": g("Mistrz średniej zbroi", "Medium Armor Master", { prereq: { training: "medium" }, increase: STR_DEX,
    desc: D("W średniej zbroi dodajesz do AC 3 zamiast 2, jeśli masz ZRĘ 16 lub więcej.", "In medium armor you add 3 instead of 2 to AC if your DEX is 16 or higher.") }),
  "moderately-armored": g("Średnio opancerzony", "Moderately Armored", { prereq: { training: "light" }, increase: STR_DEX, training: ["medium"],
    desc: D("Biegłość w średnich zbrojach.", "Training with medium armor.") }),
  "mounted-combatant": g("Jeździec", "Mounted Combatant", { increase: ["str", "dex", "wis"],
    desc: D("Konno: Przewaga na ataki w mniejsze istoty bez wierzchowca; chronisz wierzchowca przed obrażeniami i przejmujesz ataki na niego.", "Mounted: Advantage against smaller unmounted foes; you protect your mount from damage and can take hits meant for it.") }),
  observant: g("Spostrzegawczy", "Observant", { prereq: { ability: ["int", "wis"] }, increase: ["int", "wis"], lore: ["insight", "investigation", "perception"],
    desc: D("Jedna z: Wnikliwość, Śledztwo, Percepcja — biegłość, a jeśli już ją masz, Expertise. Search akcją bonusową.", "One of Insight, Investigation, Perception — proficiency, or Expertise if you have it. Search as a bonus action.") }),
  piercer: g("Przebijający", "Piercer", { increase: STR_DEX,
    desc: D("Raz na turę przerzucasz jedną kość obrażeń kłutych. Krytyk kłuty: jedna kość obrażeń więcej.", "Once per turn reroll one piercing damage die. Piercing crits roll one extra damage die.") }),
  poisoner: g("Truciciel", "Poisoner", { increase: ["dex", "int"], tools: ["poisoner"],
    desc: D("Biegłość w zestawie trucicielskim; tworzysz trucizny (2k8 i zatrucie). Twoje obrażenia od trucizny ignorują odporność.", "Proficiency with the Poisoner's Kit; you brew poisons (2d8 and Poisoned). Your poison damage ignores resistance.") }),
  "polearm-master": g("Mistrz broni drzewcowej", "Polearm Master", { prereq: { ability: STR_DEX }, increase: STR_DEX,
    desc: D("Po ataku kosturem, włócznią albo ciężką bronią z zasięgiem: atak drugim końcem akcją bonusową (1k4). Reakcja, gdy wróg wchodzi w zasięg.", "After attacking with a quarterstaff, spear or heavy reach weapon: bonus-action strike with the butt (1d4). Reaction attack when a foe enters your reach.") }),
  resilient: g("Odporny", "Resilient", { increase: "nonSave", saveFromIncrease: true,
    desc: D("Wybierasz cechę bez biegłości w rzutach obronnych: +1 do niej i biegłość w jej rzutach obronnych.", "Pick an ability without saving throw proficiency: +1 to it and proficiency in its saves.") }),
  "ritual-caster": g("Rytualista", "Ritual Caster", { prereq: { ability: MENTAL }, increase: MENTAL, spellAbilityFromIncrease: true,
    spellPicks: [{ key: "spell", count: "pb", circles: [1], ritual: true, uses: "ritual" }],
    desc: D("Tyle czarów 1. kręgu z dopiskiem rytuał, ile wynosi PB: zawsze przygotowane. Raz na długi odpoczynek rytuał w zwykłym czasie.", "Level 1 ritual spells equal to your PB, always prepared. Once per long rest cast a ritual at normal speed.") }),
  sentinel: g("Strażnik", "Sentinel", { prereq: { ability: STR_DEX }, increase: STR_DEX,
    desc: D("Atak okazyjny także, gdy wróg obok używa Disengage albo atakuje kogoś innego. Trafienie okazyjne zatrzymuje go w miejscu.", "Opportunity attack also when an adjacent foe Disengages or attacks someone else. Your opportunity hits stop it in place.") }),
  "shadow-touched": g("Dotknięty przez Cień", "Shadow-Touched", { increase: MENTAL, spellAbilityFromIncrease: true,
    innate: [{ id: "invisibility", uses: "long" }], spellPicks: [{ key: "spell", count: 1, circles: [1], schools: ["ill", "nec"], uses: "long" }],
    desc: D("Invisibility i jeden czar 1. kręgu z Iluzji lub Nekromancji: zawsze przygotowane, każdy raz na długi odpoczynek za darmo.", "Invisibility and one level 1 Illusion or Necromancy spell: always prepared, each free once per long rest.") }),
  sharpshooter: g("Strzelec wyborowy", "Sharpshooter", { prereq: { ability: ["dex"] }, increase: ["dex"],
    desc: D("Strzały ignorują połowiczną i trzyćwierciową osłonę, bez Utrudnienia z bliska i na dalekim zasięgu.", "Ranged weapon attacks ignore half and three-quarters cover, no Disadvantage in melee or at long range.") }),
  "shield-master": g("Mistrz tarczy", "Shield Master", { prereq: { training: "shield" }, increase: ["str"],
    desc: D("Raz na turę po trafieniu wręcz uderzasz tarczą (SIŁ: odepchnięcie albo powalenie). Reakcją unikasz obrażeń przy udanym rzucie ZRĘ.", "Once per turn after a melee hit, bash with your shield (STR save: push or Prone). Reaction to take no damage on a successful DEX save.") }),
  "skill-expert": g("Znawca umiejętności", "Skill Expert", { increase: "any", skillPick: true, expertisePick: true,
    desc: D("+1 do dowolnej cechy, biegłość w jednej umiejętności i Expertise w jednej umiejętności, w której masz biegłość.", "+1 to any ability, proficiency in one skill and Expertise in one skill you're proficient in.") }),
  skulker: g("Skrytobójca", "Skulker", { prereq: { ability: ["dex"] }, increase: ["dex"],
    desc: D("Blindsight 10 ft, Przewaga na Skradanie przy Hide w walce, chybiony atak z ukrycia nie zdradza pozycji.", "Blindsight 10 ft, Advantage on Stealth when hiding in combat, a missed attack from hiding doesn't reveal you.") }),
  slasher: g("Siekacz", "Slasher", { increase: STR_DEX,
    desc: D("Raz na turę trafienie cięte zmniejsza prędkość celu o 10 ft. Krytyk cięty: cel ma Utrudnienie na ataki.", "Once per turn a slashing hit reduces the target's speed by 10 ft. A slashing crit gives it Disadvantage on attacks.") }),
  speedy: g("Szybki", "Speedy", { prereq: { ability: ["dex", "con"] }, increase: ["dex", "con"], speed: 10,
    desc: D("+10 ft prędkości. Dash ignoruje trudny teren, ataki okazyjne na Ciebie mają Utrudnienie.", "+10 ft speed. Dash ignores difficult terrain, opportunity attacks against you have Disadvantage.") }),
  "spell-sniper": g("Snajper czarów", "Spell Sniper", { prereq: { spellcasting: true }, increase: MENTAL,
    desc: D("Ataki czarami ignorują osłonę, bez Utrudnienia z bliska, zasięg czarów z atakiem +60 ft.", "Spell attacks ignore cover, no Disadvantage in melee, +60 ft range on attack spells.") }),
  telekinetic: g("Telekinetyk", "Telekinetic", { increase: MENTAL, spellAbilityFromIncrease: true, innate: [{ id: "mage-hand", uses: "atwill" }],
    desc: D("Mage Hand bez komponentów, niewidzialna, +30 ft zasięgu. Akcją bonusową pchasz istotę w 30 ft o 5 ft (rzut SIŁ).", "Mage Hand without components, invisible, +30 ft range. As a bonus action shove a creature within 30 ft by 5 ft (STR save).") }),
  telepathic: g("Telepata", "Telepathic", { increase: MENTAL, spellAbilityFromIncrease: true, innate: [{ id: "detect-thoughts", uses: "long" }],
    desc: D("Mówisz telepatycznie do istot w 60 ft. Detect Thoughts zawsze przygotowany, raz na długi odpoczynek za darmo.", "Speak telepathically to creatures within 60 ft. Detect Thoughts always prepared, free once per long rest.") }),
  "war-caster": g("Bojowy czarodziej", "War Caster", { prereq: { spellcasting: true }, increase: MENTAL,
    desc: D("Przewaga na rzuty koncentracji, czar zamiast ataku okazyjnego, gesty czarów z bronią albo tarczą w rękach.", "Advantage on concentration saves, a spell instead of an opportunity attack, somatic components with weapons or a shield in hand.") }),
  "weapon-master": g("Mistrz broni", "Weapon Master", { increase: STR_DEX,
    desc: D("Mistrzostwo jeszcze jednego rodzaju broni, w której masz biegłość; wybór zmieniasz po długim odpoczynku.", "Mastery of one more kind of weapon you're proficient with; change it after a long rest.") }),
};

export const FIGHTING_STYLE_FEATS = {
  archery: fs("Łucznictwo", "Archery", { desc: D("+2 do ataków bronią dystansową.", "+2 to attack rolls with ranged weapons.") }),
  "blind-fighting": fs("Walka na ślepo", "Blind Fighting", { desc: D("Blindsight 10 ft.", "Blindsight 10 ft.") }),
  defense: fs("Obrona", "Defense", { acArmored: 1, desc: D("+1 do AC, gdy nosisz zbroję.", "+1 AC while wearing armor.") }),
  dueling: fs("Pojedynkowanie", "Dueling", { desc: D("+2 do obrażeń bronią jednoręczną, gdy nie trzymasz innej broni.", "+2 damage with a one-handed melee weapon when holding no other weapon.") }),
  "great-weapon-fighting": fs("Walka bronią dwuręczną", "Great Weapon Fighting", { desc: D("Bronią trzymaną oburącz 1 i 2 na kościach obrażeń liczysz jako 3.", "With a weapon held in two hands, 1s and 2s on damage dice count as 3.") }),
  interception: fs("Przechwycenie", "Interception", { desc: D("Reakcją zmniejszasz obrażenia sojusznika obok o 1k10 + PB.", "Reaction to reduce damage to an adjacent ally by 1d10 + PB.") }),
  protection: fs("Ochrona", "Protection", { desc: D("Reakcją z tarczą nakładasz Utrudnienie na ataki w sojusznika obok.", "Reaction with a shield to impose Disadvantage on attacks against an adjacent ally.") }),
  "thrown-weapon-fighting": fs("Walka bronią rzucaną", "Thrown Weapon Fighting", { desc: D("+2 do obrażeń bronią rzucaną.", "+2 damage with thrown weapon attacks.") }),
  "two-weapon-fighting": fs("Walka dwiema brońmi", "Two-Weapon Fighting", { desc: D("Dodajesz cechę do obrażeń dodatkowego ataku bronią lekką.", "Add your ability modifier to the damage of the extra light-weapon attack.") }),
  "unarmed-fighting": fs("Walka bez broni", "Unarmed Fighting", { desc: D("Cios bez broni 1k6 + SIŁ (1k8 z wolnymi rękami); 1k4 co turę dla pochwyconego.", "Unarmed strikes deal 1d6 + STR (1d8 with free hands); 1d4 each turn to a creature you grapple.") }),
};

/** Class alternatives to a Fighting Style feat: Blessed Warrior (Paladin) and Druidic Warrior (Ranger). */
export const STYLE_ALTS = {
  "blessed-warrior": { source: "phb2024", category: "style-alt", fixedAbility: "cha", name: D("Blessed Warrior (Błogosławiony wojownik)", "Blessed Warrior"),
    desc: D("Zamiast featu stylu walki: dwie sztuczki kleryka na CHA (polecane Guidance i Sacred Flame). Przy awansie możesz wymienić jedną.", "Instead of a Fighting Style feat: two Cleric cantrips using CHA (Guidance and Sacred Flame are recommended). When you gain a level you can swap one."),
    spellPicks: [{ key: "cantrips", count: 2, circles: [0], lists: ["cleric"] }] },
  "druidic-warrior": { source: "phb2024", category: "style-alt", fixedAbility: "wis", name: D("Druidic Warrior (Druidzki wojownik)", "Druidic Warrior"),
    desc: D("Zamiast featu stylu walki: dwie sztuczki druida na MĄD (polecane Guidance i Starry Wisp). Przy awansie możesz wymienić jedną.", "Instead of a Fighting Style feat: two Druid cantrips using WIS (Guidance and Starry Wisp are recommended). When you gain a level you can swap one."),
    spellPicks: [{ key: "cantrips", count: 2, circles: [0], lists: ["druid"] }] },
};

/** Damage types a feat can choose from (Elemental Adept). */
export const DAMAGE_TYPES = Object.fromEntries(["acid", "cold", "fire", "lightning", "thunder"].map((k) => [k, DAMAGE_NAMES[k]]));
