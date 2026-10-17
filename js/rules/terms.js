// Rules glossary: game terms explained in our own words (PHB 2024 appendix C, Ravenloft: The Horrors Within).
// Used by the hover/tap explanations on the sheet (js/glossary.js) and by the searchable glossary panel.
// `re` (optional) finds the term in sheet text, per language; entries without it are only in the panel.
import { fold, textMatch } from "../search.js";

const L = "\\p{L}*"; // any word ending, for Polish inflection

/** Panel groups, in display order. */
export const TERM_CATS = ["action", "condition", "combat", "rule", "rest", "magic", "class", "ravenloft"];

const G = [
  // --- actions ---
  { id: "attack", cat: "action", re: { pl: "\\bAttack\\b", en: "\\bAttack\\b" }, title: { pl: "Attack (Atak)", en: "Attack" },
    text: { pl: "Akcja: atakujesz bronią albo ciosem. Każdy cios możesz zamienić na chwyt (Grapple) albo pchnięcie (Shove).", en: "Action: attack with a weapon or unarmed strike. Any strike can be replaced with a Grapple or Shove." } },
  { id: "dash", cat: "action", re: { pl: "\\bDash\\b", en: "\\bDash\\b" }, title: { pl: "Dash (Sprint)", en: "Dash" },
    text: { pl: "Dodatkowy ruch równy Twojej prędkości, do końca tury.", en: "Extra movement equal to your speed for the rest of the turn." } },
  { id: "disengage", cat: "action", re: { pl: "\\bDisengage\\b", en: "\\bDisengage\\b" }, title: { pl: "Disengage (Odskok)", en: "Disengage" },
    text: { pl: "Do końca tury Twój ruch nie prowokuje ataków okazyjnych.", en: "Your movement doesn't provoke opportunity attacks for the rest of the turn." } },
  { id: "dodge", cat: "action", re: { pl: "\\bDodge\\b", en: "\\bDodge\\b" }, title: { pl: "Dodge (Unik)", en: "Dodge" },
    text: { pl: "Do Twojej następnej tury ataki na Ciebie mają Utrudnienie, a rzuty ZRĘ masz z Przewagą.", en: "Until your next turn, attacks against you have Disadvantage and you make DEX saves with Advantage." } },
  { id: "help", cat: "action", re: { pl: "\\bHelp\\b", en: "\\bHelp\\b" }, title: { pl: "Help (Pomoc)", en: "Help" },
    text: { pl: "Akcja: sojusznik ma Przewagę na najbliższy test umiejętności, w której jesteś biegły, albo na najbliższy atak na wroga stojącego obok Ciebie. Działa do początku Twojej następnej tury. Tą akcją możesz też ratować kogoś z 0 HP (test Medycyny DC 10).", en: "Action: an ally gets Advantage on their next check with a skill you're proficient in, or on their next attack against an enemy next to you. Lasts until the start of your next turn. You can also use it to stabilize someone at 0 HP (DC 10 Medicine check)." } },
  { id: "hide", cat: "action", re: { pl: "\\bHide\\b", en: "\\bHide\\b" }, title: { pl: "Hide (Ukrycie)", en: "Hide" },
    text: { pl: "Akcja: test Skradania DC 15, gdy nikt Cię nie widzi, a masz mocną osłonę albo głęboki cień. Udany = jesteś niewidzialny (Invisible), a Twój wynik to DC, żeby Cię znaleźć. Kończy się, gdy zaatakujesz, głośno się odezwiesz albo ktoś Cię znajdzie.", en: "Action: a DC 15 Stealth check while no one can see you and you're behind solid cover or in heavy shadow. Success = you're Invisible, and your total is the DC to find you. Ends when you attack, speak above a whisper, or someone finds you." } },
  { id: "influence", cat: "action", re: { pl: "\\bInfluence\\b", en: "\\bInfluence\\b" }, title: { pl: "Influence (Wpływ)", en: "Influence" },
    text: { pl: "Akcja: namawiasz, straszysz albo oszukujesz istotę. Jeśli i tak by się zgodziła albo nigdy by tego nie zrobiła, nie ma rzutu. Gdy się waha, robisz test (zwykle CHA), a jej nastawienie (przyjazne, obojętne, wrogie) daje Przewagę albo Utrudnienie.", en: "Action: you urge, scare or trick a creature. If it would agree anyway, or never would, there's no roll. If it hesitates, you make a check (usually CHA), and its attitude (friendly, indifferent, hostile) gives Advantage or Disadvantage." } },
  { id: "magic", cat: "action", title: { pl: "Magic (Magia)", en: "Magic" },
    text: { pl: "Akcja: rzucasz czar, który wymaga akcji, albo używasz zdolności lub magicznego przedmiotu, który jej wymaga. Czary trwające minutę i dłużej wymagają tej akcji w każdej turze i koncentracji.", en: "Action: cast a spell that takes an action, or use a feature or magic item that needs one. Spells that take a minute or longer need this action every turn, plus Concentration." } },
  { id: "ready", cat: "action", re: { pl: "\\bReady\\b", en: "\\bReady\\b" }, title: { pl: "Ready (Przygotowanie)", en: "Ready" },
    text: { pl: "Akcja: ustalasz warunek („gdy wróg wejdzie w drzwi…”) i co wtedy zrobisz. Gdy to nastąpi, działasz jako Reakcja. Przygotowany czar zużywa slot od razu i wymaga koncentracji do Twojej następnej tury.", en: "Action: you set a trigger (\"when the enemy steps through the door…\") and what you'll do. When it happens, you act with your Reaction. A readied spell uses its slot right away and needs Concentration until your next turn." } },
  { id: "search", cat: "action", title: { pl: "Search (Szukanie)", en: "Search" },
    text: { pl: "Akcja: test MĄD, żeby dostrzec coś nieoczywistego — Percepcja (ukryte rzeczy i istoty), Wnikliwość (czyjeś zamiary), Medycyna (choroba, przyczyna śmierci), Przetrwanie (ślady).", en: "Action: a WIS check to notice something that isn't obvious — Perception (hidden things and creatures), Insight (someone's intent), Medicine (illness, cause of death), Survival (tracks)." } },
  { id: "study", cat: "action", re: { pl: "\\bStudy\\b", en: "\\bStudy\\b" }, title: { pl: "Study (Badanie)", en: "Study" },
    text: { pl: "Akcja: test INT, żeby przypomnieć sobie albo wyczytać coś ważnego — Wiedza tajemna (magia), Historia, Śledztwo (pułapki, szyfry), Przyroda, Religia.", en: "Action: an INT check to recall or work out something important — Arcana (magic), History, Investigation (traps, ciphers), Nature, Religion." } },
  { id: "utilize", cat: "action", re: { pl: "\\bUtilize\\b", en: "\\bUtilize\\b" }, title: { pl: "Utilize (Użycie przedmiotu)", en: "Utilize" },
    text: { pl: "Akcja: używasz przedmiotu, który tego wymaga (np. eliksir, lina, dźwignia). Dobycie broni w ataku jest za darmo.", en: "Action: use an object that needs it (a potion, a rope, a lever). Drawing a weapon as part of an attack is free." } },
  { id: "shove", cat: "action", re: { pl: "\\bShove\\b|pchnięci" + L, en: "\\bShove\\b" }, title: { pl: "Shove (Pchnięcie)", en: "Shove" },
    text: { pl: "Zamiast obrażeń: wróg rzuca SIŁ lub ZRĘ. Porażka = odepchnięty o 5 ft albo powalony.", en: "Instead of damage: the target makes a STR or DEX save. Fail = pushed 5 ft or knocked Prone." } },
  { id: "grapple", cat: "action", re: { pl: "\\bGrapple\\b|chwyt" + L, en: "\\bGrapple\\b" }, title: { pl: "Grapple (Chwyt)", en: "Grapple" },
    text: { pl: "Zamiast obrażeń: wróg rzuca SIŁ lub ZRĘ. Porażka = pochwycony, jego prędkość to 0.", en: "Instead of damage: the target makes a STR or DEX save. Fail = Grappled, its speed becomes 0." } },
  { id: "unarmed", cat: "action", re: { pl: "\\bUnarmed Strikes?\\b|[Cc]ios" + L + " bez broni", en: "\\b[Uu]narmed [Ss]trikes?\\b" }, title: { pl: "Unarmed Strike (Cios bez broni)", en: "Unarmed Strike" },
    text: { pl: "Pięść, kopniak, uderzenie głową. Atak SIŁ + biegłość, obrażenia 1 + SIŁ (obuchowe). Zamiast obrażeń możesz chwycić albo pchnąć.", en: "A punch, kick or headbutt. Attack with STR + proficiency, damage 1 + STR (bludgeoning). Instead of damage you can grapple or shove." } },

  // --- conditions ---
  { id: "blinded", cat: "condition", re: { pl: "\\bBlinded\\b|[Oo]ślepion" + L, en: "\\bBlinded\\b" }, title: { pl: "Blinded (Oślepiony)", en: "Blinded" },
    text: { pl: "Nic nie widzi i oblewa testy wymagające wzroku. Ataki na niego mają Przewagę, jego ataki Utrudnienie.", en: "Can't see and fails any check that needs sight. Attacks against it have Advantage, its attacks have Disadvantage." } },
  { id: "charmed", cat: "condition", re: { pl: "Charmed", en: "Charmed" }, title: { pl: "Charmed (Zauroczony)", en: "Charmed" },
    text: { pl: "Nie może atakować ani szkodzić temu, kto go zauroczył; ten ma Przewagę na kontakty społeczne z nim.", en: "Can't attack or harm the charmer; the charmer has Advantage on social checks with it." } },
  { id: "deafened", cat: "condition", re: { pl: "\\bDeafened\\b", en: "\\bDeafened\\b" }, title: { pl: "Deafened (Głuchy)", en: "Deafened" },
    text: { pl: "Nic nie słyszy i oblewa testy wymagające słuchu.", en: "Can't hear and fails any check that needs hearing." } },
  { id: "exhaustion", cat: "condition", re: { pl: "\\bExhaustion\\b|[Ww]yczerpani" + L, en: "\\bExhaustion\\b" }, title: { pl: "Exhaustion (Wyczerpanie)", en: "Exhaustion" },
    text: { pl: "Ma poziomy, które się sumują. Każdy poziom: −2 do każdej k20 (testy, ataki, rzuty obronne) i −5 ft prędkości. Długi odpoczynek zdejmuje 1 poziom. Na 6. poziomie postać umiera.", en: "Comes in levels that add up. Each level: −2 to every d20 roll (checks, attacks, saves) and −5 ft speed. A Long Rest removes 1 level. At level 6 the character dies." } },
  { id: "frightened", cat: "condition", re: { pl: "Frightened", en: "Frightened" }, title: { pl: "Frightened (Przestraszony)", en: "Frightened" },
    text: { pl: "Utrudnienie na testy i ataki, gdy widzi źródło strachu; nie może się do niego zbliżać.", en: "Disadvantage on checks and attacks while it can see the source of fear; can't move closer to it." } },
  { id: "grappled", cat: "condition", re: { pl: "\\bGrappled\\b|[Pp]ochwycon" + L, en: "\\bGrappled\\b" }, title: { pl: "Grappled (Pochwycony)", en: "Grappled" },
    text: { pl: "Prędkość 0. Utrudnienie na ataki w kogoś innego niż ten, kto trzyma. Trzymający może go ciągnąć. Uwolnienie: akcja i test Atletyki albo Akrobatyki przeciw DC chwytu.", en: "Speed 0. Disadvantage on attacks against anyone but the grappler, who can drag it along. To escape: an action and an Athletics or Acrobatics check against the grapple's DC." } },
  { id: "incapacitated", cat: "condition", re: { pl: "\\bIncapacitated\\b|[Oo]bezwładnion" + L, en: "\\bIncapacitated\\b" }, title: { pl: "Incapacitated (Obezwładniony)", en: "Incapacitated" },
    text: { pl: "Żadnych akcji, akcji bonusowych ani reakcji; nie mówi; traci koncentrację. Inicjatywę rzuca z Utrudnieniem.", en: "No actions, Bonus Actions or Reactions; can't speak; loses Concentration. Rolls Initiative with Disadvantage." } },
  { id: "invisible", cat: "condition", re: { pl: "\\bInvisible\\b|[Nn]iewidzialn" + L, en: "\\bInvisible\\b" }, title: { pl: "Invisible (Niewidzialny)", en: "Invisible" },
    text: { pl: "Ataki na niego mają Utrudnienie, jego ataki Przewagę (chyba że wróg jakoś go widzi). Nie działają na niego efekty wymagające widzenia celu. Inicjatywę rzuca z Przewagą.", en: "Attacks against it have Disadvantage, its attacks have Advantage (unless the foe can somehow see it). Effects that need to see the target don't work on it. Rolls Initiative with Advantage." } },
  { id: "paralyzed", cat: "condition", re: { pl: "Paralyzed", en: "Paralyzed" }, title: { pl: "Paralyzed (Sparaliżowany)", en: "Paralyzed" },
    text: { pl: "Nie działa, nie rusza się ani nie mówi; oblewa rzuty SIŁ i ZRĘ; ataki na niego mają Przewagę, a trafienie z 5 ft jest krytyczne.", en: "Can't act, move or speak; fails STR and DEX saves; attacks against it have Advantage and hits from within 5 ft are critical." } },
  { id: "petrified", cat: "condition", re: { pl: "\\bPetrified\\b|[Ss]kamieniał" + L, en: "\\bPetrified\\b" }, title: { pl: "Petrified (Skamieniały)", en: "Petrified" },
    text: { pl: "Zamieniony w kamień (z ubraniem i sprzętem). Obezwładniony, prędkość 0, oblewa rzuty SIŁ i ZRĘ, ataki na niego mają Przewagę. Odporność na wszystkie obrażenia, nie da się go zatruć.", en: "Turned to stone (with clothes and gear). Incapacitated, speed 0, fails STR and DEX saves, attacks against it have Advantage. Resistance to all damage, can't be Poisoned." } },
  { id: "poisoned", cat: "condition", re: { pl: "Poisoned", en: "Poisoned" }, title: { pl: "Poisoned (Zatruty)", en: "Poisoned" },
    text: { pl: "Utrudnienie na ataki i testy cech.", en: "Disadvantage on attack rolls and ability checks." } },
  { id: "prone", cat: "condition", re: { pl: "\\bProne\\b|powalon" + L, en: "\\bProne\\b" }, title: { pl: "Prone (Powalony)", en: "Prone" },
    text: { pl: "Leży. Ataki wręcz na niego mają Przewagę, jego ataki Utrudnienie. Wstanie kosztuje połowę ruchu.", en: "Lying down. Melee attacks against it have Advantage, its attacks have Disadvantage. Standing up costs half its movement." } },
  { id: "restrained", cat: "condition", re: { pl: "\\bRestrained\\b|[Uu]nieruchomion" + L, en: "\\bRestrained\\b" }, title: { pl: "Restrained (Unieruchomiony)", en: "Restrained" },
    text: { pl: "Prędkość 0. Ataki na niego mają Przewagę, jego ataki Utrudnienie. Rzuty ZRĘ z Utrudnieniem.", en: "Speed 0. Attacks against it have Advantage, its attacks have Disadvantage. DEX saves with Disadvantage." } },
  { id: "stunned", cat: "condition", re: { pl: "\\bStunned\\b", en: "\\bStunned\\b" }, title: { pl: "Stunned (Ogłuszony)", en: "Stunned" },
    text: { pl: "Nie działa ani nie reaguje, oblewa rzuty SIŁ i ZRĘ, ataki na niego mają Przewagę.", en: "Can't act or react, fails STR and DEX saves, attacks against it have Advantage." } },
  { id: "unconscious", cat: "condition", re: { pl: "\\bUnconscious\\b|[Nn]ieprzytomn" + L, en: "\\bUnconscious\\b" }, title: { pl: "Unconscious (Nieprzytomny)", en: "Unconscious" },
    text: { pl: "Leży bez świadomości i upuszcza to, co trzymał. Obezwładniony, prędkość 0, oblewa rzuty SIŁ i ZRĘ. Ataki na niego mają Przewagę, a trafienie z 5 ft jest krytyczne.", en: "Lies senseless and drops what it was holding. Incapacitated, speed 0, fails STR and DEX saves. Attacks against it have Advantage and hits from within 5 ft are critical." } },

  // --- combat ---
  { id: "initiative", cat: "combat", re: { pl: "[Ii]nicjatyw" + L, en: "\\bInitiative\\b" }, title: { pl: "Inicjatywa (Initiative)", en: "Initiative" },
    text: { pl: "Na początku walki każdy rzuca k20 + ZRĘ. Od najwyższego wyniku ustala się kolejność tur.", en: "At the start of combat everyone rolls d20 + DEX. Turns go from the highest result down." } },
  { id: "surprise", cat: "combat", re: { pl: "[Zz]askoczon" + L + "|[Zz]askoczenie", en: "\\bSurprise\\b|\\b[Ss]urprised\\b" }, title: { pl: "Zaskoczenie (Surprise)", en: "Surprise" },
    text: { pl: "Kto daje się zaskoczyć na początku walki, rzuca inicjatywę z Utrudnieniem.", en: "A creature caught off guard when combat starts rolls Initiative with Disadvantage." } },
  { id: "reaction", cat: "combat", re: { pl: "[Rr]eakcj" + L, en: "\\b[Rr]eaction\\b" }, title: { pl: "Reakcja (Reaction)", en: "Reaction" },
    text: { pl: "Jedna na rundę: odpowiedź na zdarzenie, także w turze wroga.", en: "One per round: a response to a trigger, even on an enemy's turn." } },
  { id: "bonus", cat: "combat", re: { pl: "[Aa]kcj" + L + " bonusow" + L, en: "\\b[Bb]onus [Aa]ctions?\\b" }, title: { pl: "Akcja bonusowa (Bonus Action)", en: "Bonus Action" },
    text: { pl: "Druga, mniejsza akcja w turze. Masz ją tylko, gdy coś ją daje.", en: "A second, smaller action on your turn. You only have one when something grants it." } },
  { id: "oa", cat: "combat", re: { pl: "[Aa]tak" + L + " okazyjn" + L, en: "\\b[Oo]pportunity [Aa]ttacks?\\b" }, title: { pl: "Atak okazyjny (Opportunity Attack)", en: "Opportunity Attack" },
    text: { pl: "Gdy wychodzisz z zasięgu wroga, może Cię uderzyć jako Reakcja. Chroni przed tym Disengage.", en: "When you leave an enemy's reach it can strike you as a Reaction. Disengage prevents this." } },
  { id: "crit", cat: "combat", re: { pl: "[Tt]rafieni" + L + " krytyczn" + L + "|\\bCritical Hits?\\b", en: "\\b[Cc]ritical [Hh]its?\\b" }, title: { pl: "Trafienie krytyczne (Critical Hit)", en: "Critical Hit" },
    text: { pl: "Naturalne 20 na k20 przy ataku zawsze trafia. Kości obrażeń rzucasz podwójnie, premie dodajesz raz.", en: "A natural 20 on an attack roll always hits. Roll the damage dice twice; add bonuses once." } },
  { id: "cover", cat: "combat", re: { pl: "\\b(?:Half |Three-Quarters |Total )?Cover\\b|[Oo]słon[aąęy]", en: "\\b(?:Half |Three-Quarters |Total )?Cover\\b" }, title: { pl: "Osłona (Cover)", en: "Cover" },
    text: { pl: "Połowiczna: +2 do KP i rzutów ZRĘ. Trzy czwarte: +5. Całkowita: nie można Cię wskazać bezpośrednio. Liczy się tylko najlepsza osłona.", en: "Half: +2 to AC and DEX saves. Three-quarters: +5. Total: you can't be targeted directly. Only the best cover counts." } },
  { id: "terrain", cat: "combat", re: { pl: "[Tt]rudn" + L + " teren" + L + "|\\bDifficult Terrain\\b", en: "\\b[Dd]ifficult [Tt]errain\\b" }, title: { pl: "Trudny teren (Difficult Terrain)", en: "Difficult Terrain" },
    text: { pl: "Każda stopa ruchu kosztuje 2 (5 ft = 10 ft). Np. gruz, gęste krzaki, głęboki śnieg, woda do pasa, stromizna, pole zajęte przez nie-sojusznika.", en: "Every foot of movement costs 2 (5 ft = 10 ft). E.g. rubble, thick undergrowth, deep snow, waist-deep water, a steep slope, a space with a non-ally in it." } },
  { id: "thp", cat: "combat", re: { pl: "[Tt]ymczasow" + L + " HP", en: "\\b[Tt]emporary (HP|Hit Points)\\b" }, title: { pl: "Tymczasowe HP", en: "Temporary Hit Points" },
    text: { pl: "Bufor zdejmowany przed zwykłymi HP. Nie sumują się: zostawiasz wyższą wartość. Znikają po długim odpoczynku.", en: "A buffer lost before your real HP. They don't stack: keep the higher amount. Gone after a Long Rest." } },
  { id: "bloodied", cat: "combat", re: { pl: "\\bBloodied\\b|[Zz]akrwawion" + L, en: "\\bBloodied\\b" }, title: { pl: "Bloodied (Zakrwawiony)", en: "Bloodied" },
    text: { pl: "Istota ma połowę HP albo mniej. Niektóre zdolności działają tylko wtedy.", en: "A creature at half its HP or fewer. Some features only work then." } },
  { id: "zerohp", cat: "combat", re: { pl: "\\b0 HP\\b", en: "\\b0 HP\\b" }, title: { pl: "0 HP", en: "0 HP" },
    text: { pl: "Postać pada nieprzytomna i zaczyna rzuty przeciw śmierci. Ginie od razu, jeśli obrażenia ponad 0 są co najmniej równe jej maksymalnym HP. Każde leczenie ją budzi; tymczasowe HP nie.", en: "The character falls Unconscious and starts making Death Saving Throws. It dies outright if the damage left over past 0 is at least its HP maximum. Any healing wakes it; Temporary HP don't." } },
  { id: "deathsave", cat: "combat", re: { pl: "[Rr]zut" + L + " przeciw(?:ko)? śmierci", en: "\\b[Dd]eath [Ss]aving [Tt]hrows?\\b|\\b[Dd]eath [Ss]aves?\\b" }, title: { pl: "Rzuty przeciw śmierci (Death Saving Throws)", en: "Death Saving Throws" },
    text: { pl: "Na początku tury z 0 HP rzucasz k20: 10+ to sukces, mniej to porażka. 3 sukcesy = stabilny, 3 porażki = śmierć. Wyrzucone 1 to dwie porażki, 20 to od razu 1 HP. Obrażenia przy 0 HP to porażka (krytyk — dwie).", en: "At the start of your turn at 0 HP, roll a d20: 10+ is a success, lower a failure. 3 successes = Stable, 3 failures = death. A 1 counts as two failures, a 20 brings you back with 1 HP. Taking damage at 0 HP is a failure (two on a critical hit)." } },
  { id: "stable", cat: "combat", re: { pl: "\\bStable\\b|[Ss]tabiln" + L, en: "\\bStable\\b" }, title: { pl: "Stabilny (Stable)", en: "Stable" },
    text: { pl: "Ma 0 HP i jest nieprzytomny, ale nie rzuca już przeciw śmierci. Bez leczenia budzi się z 1 HP po 1k4 godzinach. Obrażenia znowu zaczynają rzuty.", en: "At 0 HP and Unconscious, but no longer making Death Saving Throws. Without healing it wakes with 1 HP after 1d4 hours. Taking damage starts the saves again." } },
  { id: "falling", cat: "combat", title: { pl: "Upadek (Falling)", en: "Falling" },
    text: { pl: "1k6 obrażeń obuchowych za każde 10 ft (maks. 20k6) i lądujesz powalony, jeśli dostałeś obrażenia.", en: "1d6 bludgeoning damage per 10 ft fallen (max 20d6), and you land Prone if you took any damage." } },

  // --- rules ---
  { id: "adv", cat: "rule", re: { pl: "[Pp]rzewag" + L, en: "\\b[Aa]dvantage\\b" }, title: { pl: "Przewaga (Advantage)", en: "Advantage" },
    text: { pl: "Rzucasz dwiema k20 i bierzesz lepszy wynik. Kilka Przewag to wciąż jedna; Przewaga i Utrudnienie znoszą się.", en: "Roll two d20s and take the higher. Several Advantages still count as one; Advantage and Disadvantage cancel out." } },
  { id: "dis", cat: "rule", re: { pl: "[Uu]trudnieni" + L, en: "\\b[Dd]isadvantage\\b" }, title: { pl: "Utrudnienie (Disadvantage)", en: "Disadvantage" },
    text: { pl: "Rzucasz dwiema k20 i bierzesz gorszy wynik.", en: "Roll two d20s and take the lower." } },
  { id: "dc", cat: "rule", re: { pl: "\\bDC\\b", en: "\\bDC\\b" }, title: { pl: "DC (Stopień trudności)", en: "DC (Difficulty Class)" },
    text: { pl: "Liczba do pobicia. Wróg rzuca k20 + modyfikator; jeśli wyrzuci mniej, efekt działa.", en: "The number to beat. The target rolls d20 + modifier; below the DC, the effect works." } },
  { id: "check", cat: "rule", re: { pl: "[Tt]est" + L + " cech" + L, en: "\\b[Aa]bility [Cc]hecks?\\b" }, title: { pl: "Test cechy (Ability Check)", en: "Ability Check" },
    text: { pl: "k20 + modyfikator cechy (i biegłość, jeśli pasuje umiejętność) przeciw DC, gdy próbujesz czegoś niepewnego.", en: "d20 + ability modifier (plus proficiency if a skill fits) against a DC when you try something uncertain." } },
  { id: "save", cat: "rule", re: { pl: "[Rr]zut" + L + " obronn" + L, en: "\\b[Ss]aving [Tt]hrows?\\b" }, title: { pl: "Rzut obronny (Saving Throw)", en: "Saving Throw" },
    text: { pl: "k20 + modyfikator cechy (i biegłość, jeśli ją masz w tym rzucie), żeby uniknąć zagrożenia albo mu się oprzeć.", en: "d20 + ability modifier (plus proficiency if you have it in that save) to avoid or resist a threat." } },
  { id: "pb", cat: "rule", re: { pl: "\\bPB\\b", en: "\\bPB\\b|[Pp]roficiency [Bb]onus" }, title: { pl: "PB (Premia z biegłości)", en: "Proficiency Bonus" },
    text: { pl: "Dodawana do rzeczy, w których postać jest biegła. Rośnie z poziomem.", en: "Added to anything your character is proficient in. Grows with level." } },
  { id: "expertise", cat: "rule", re: { pl: "Expertise", en: "Expertise" }, title: { pl: "Expertise (Specjalizacja)", en: "Expertise" },
    text: { pl: "W wybranej umiejętności premia z biegłości liczy się podwójnie.", en: "Your proficiency bonus is doubled for the chosen skill." } },
  { id: "passive", cat: "rule", re: { pl: "[Pp]asywn" + L + " (?:Percepcj|Perception)" + L, en: "\\b[Pp]assive [Pp]erception\\b" }, title: { pl: "Pasywna Percepcja (Passive Perception)", en: "Passive Perception" },
    text: { pl: "10 + Twoja premia do Percepcji (+5 z Przewagą, −5 z Utrudnieniem). MG porównuje ją z ukrytymi rzeczami bez rzucania.", en: "10 + your Perception bonus (+5 with Advantage, −5 with Disadvantage). The DM checks it against hidden things without a roll." } },
  { id: "hi", cat: "rule", re: { pl: "Heroic Inspiration", en: "Heroic Inspiration" }, title: { pl: "Heroic Inspiration (Bohaterska inspiracja)", en: "Heroic Inspiration" },
    text: { pl: "Raz przerzucasz dowolną kość i bierzesz nowy wynik. Można mieć tylko jedną; drugą oddajesz komuś z drużyny.", en: "Reroll any one die and use the new result. You can hold only one; an extra one goes to another player character." } },
  { id: "dark", cat: "rule", re: { pl: "Darkvision", en: "Darkvision" }, title: { pl: "Darkvision (Widzenie w ciemności)", en: "Darkvision" },
    text: { pl: "W ciemności widzisz jak w półmroku, bez kolorów.", en: "You see in darkness as if it were dim light, without color." } },
  { id: "heavy", cat: "rule", re: { pl: "\\bHeavily Obscured\\b|[Ss]ilnie zasłonięt" + L, en: "\\bHeavily Obscured\\b" }, title: { pl: "Heavily Obscured (Silnie zasłonięty)", en: "Heavily Obscured" },
    text: { pl: "Ciemność, gęsta mgła, zwarte listowie. Patrząc w takie miejsce, jesteś jak oślepiony (Blinded).", en: "Darkness, thick fog, dense foliage. Looking into such a space, you're effectively Blinded." } },
  { id: "light", cat: "rule", re: { pl: "\\bLightly Obscured\\b|[Ll]ekko zasłonięt" + L, en: "\\bLightly Obscured\\b" }, title: { pl: "Lightly Obscured (Lekko zasłonięty)", en: "Lightly Obscured" },
    text: { pl: "Półmrok, lekka mgła, rzadkie zarośla. Utrudnienie na Percepcję wzrokiem.", en: "Dim light, light fog, sparse foliage. Disadvantage on Perception checks that rely on sight." } },
  { id: "resist", cat: "rule", re: { pl: "[Oo]dpornoś" + L, en: "\\b[Rr]esistance\\b" }, title: { pl: "Odporność (Resistance)", en: "Resistance" },
    text: { pl: "Obrażenia tego rodzaju zmniejszasz o połowę (zaokrąglając w dół).", en: "Damage of that type is halved (round down)." } },
  { id: "vuln", cat: "rule", re: { pl: "[Pp]odatnoś" + L + "|\\bVulnerability\\b", en: "\\b[Vv]ulnerab(?:le|ility)\\b" }, title: { pl: "Podatność (Vulnerability)", en: "Vulnerability" },
    text: { pl: "Obrażenia tego rodzaju są podwojone.", en: "Damage of that type is doubled." } },
  { id: "immune", cat: "rule", re: { pl: "[Nn]iewrażliwoś" + L + "|\\bImmunity\\b", en: "\\b[Ii]mmun(?:e|ity)\\b" }, title: { pl: "Niewrażliwość (Immunity)", en: "Immunity" },
    text: { pl: "Ten rodzaj obrażeń albo ten stan w ogóle na Ciebie nie działa.", en: "That damage type or condition doesn't affect you at all." } },

  // --- rests ---
  { id: "short", cat: "rest", re: { pl: "[Kk]rótki" + L + " odpoczyn" + L, en: "\\b[Ss]hort [Rr]est\\b" }, title: { pl: "Krótki odpoczynek (Short Rest)", en: "Short Rest" },
    text: { pl: "Ok. 1 godzina spokoju (jedzenie, rozmowa, warta). Możesz wydać kości wytrzymałości na leczenie; część zdolności wraca. Przerywa go walka, czar (poza sztuczką) i obrażenia.", en: "About 1 hour of quiet (eating, talking, keeping watch). You can spend Hit Point Dice to heal; some features come back. Combat, casting a spell (other than a cantrip) or taking damage interrupts it." } },
  { id: "long", cat: "rest", re: { pl: "[Dd]ługi" + L + " odpoczyn" + L, en: "\\b[Ll]ong [Rr]est\\b" }, title: { pl: "Długi odpoczynek (Long Rest)", en: "Long Rest" },
    text: { pl: "Ok. 8 godzin, w tym co najmniej 6 snu. Wracają wszystkie HP, kości wytrzymałości i sloty czarów; −1 poziom Exhaustion. Następny dopiero po 16 godzinach. Trzeba mieć co najmniej 1 HP.", en: "About 8 hours, at least 6 of them asleep. You regain all HP, Hit Point Dice and spell slots; Exhaustion drops by 1. The next one only after 16 hours. You need at least 1 HP to start." } },
  { id: "hd", cat: "rest", re: { pl: "[Kk]oś" + L + " wytrzymałości|\\bHit (?:Point )?Dic?e\\b", en: "\\bHit (?:Point )?Dic?e\\b" }, title: { pl: "Kości wytrzymałości (Hit Point Dice)", en: "Hit Point Dice" },
    text: { pl: "Masz ich tyle, ile poziomów. Na krótkim odpoczynku rzucasz nimi i dodajesz KON, żeby odzyskać HP. Długi odpoczynek oddaje wszystkie.", en: "You have one per level. On a Short Rest you roll them and add CON to regain HP. A Long Rest restores them all." } },

  // --- magic ---
  { id: "conc", cat: "magic", re: { pl: "[Kk]oncentracj" + L, en: "\\b[Cc]oncentration\\b" }, title: { pl: "Koncentracja (Concentration)", en: "Concentration" },
    text: { pl: "Czar trwa, dopóki się skupiasz. Naraz tylko jeden taki czar. Gdy dostaniesz obrażenia, rzut KON (DC 10 albo połowa obrażeń, maks. 30), inaczej czar się kończy.", en: "The spell lasts while you focus. Only one such spell at a time. When you take damage, make a CON save (DC 10 or half the damage, max 30) or the spell ends." } },
  { id: "cantrip", cat: "magic", re: { pl: "[Ss]ztuczk" + L + "|\\bCantrips?\\b", en: "\\b[Cc]antrips?\\b" }, title: { pl: "Sztuczka (Cantrip)", en: "Cantrip" },
    text: { pl: "Czar poziomu 0. Rzucasz go bez slotu, ile razy chcesz.", en: "A level 0 spell. Cast it without a slot, as often as you like." } },
  { id: "ritual", cat: "magic", re: { pl: "[Rr]ytua" + L, en: "\\b[Rr]itual(?! Caster)\\b" }, title: { pl: "Rytuał (Ritual)", en: "Ritual" },
    text: { pl: "Czar z oznaczeniem rytuału możesz rzucić bez slotu, jeśli masz go przygotowanego. Trwa to 10 minut dłużej i zawsze działa na najniższym poziomie.", en: "A spell with the Ritual tag can be cast without a slot if you have it prepared. It takes 10 minutes longer and always works at its lowest level." } },

  // --- class features ---
  { id: "fp", cat: "class", re: { pl: "Focus Points?|\\bFP\\b", en: "Focus Points?|\\bFP\\b" }, title: { pl: "Focus Points (Punkty skupienia)", en: "Focus Points" },
    text: { pl: "Energia Mnicha na techniki. Tyle, ile poziom. Wracają po krótkim odpoczynku.", en: "A Monk's energy for techniques. Equal to your level, regained on a short rest." } },
  { id: "flurry", cat: "class", re: { pl: "Flurry of Blows", en: "Flurry of Blows" }, title: { pl: "Flurry of Blows (Grad ciosów)", en: "Flurry of Blows" },
    text: { pl: "Za 1 FP akcja bonusowa to 2 ciosy zamiast jednego.", en: "For 1 FP your bonus action makes two unarmed strikes instead of one." } },
  { id: "pd", cat: "class", re: { pl: "Patient Defense", en: "Patient Defense" }, title: { pl: "Patient Defense (Cierpliwa obrona)", en: "Patient Defense" },
    text: { pl: "Akcja bonusowa: Disengage za darmo; za 1 FP Disengage i Dodge.", en: "Bonus action: free Disengage; for 1 FP, Disengage and Dodge." } },
  { id: "sotw", cat: "class", re: { pl: "Step of the Wind", en: "Step of the Wind" }, title: { pl: "Step of the Wind (Krok wiatru)", en: "Step of the Wind" },
    text: { pl: "Akcja bonusowa: Dash za darmo; za 1 FP Dash i Disengage, skok ×2.", en: "Bonus action: free Dash; for 1 FP, Dash and Disengage with doubled jump." } },
  { id: "rage", cat: "class", re: { pl: "\\bRage\\b|Szał" + L, en: "\\bRage\\b" }, title: { pl: "Rage (Szał)", en: "Rage" },
    text: { pl: "Barbarzyńca, akcja bonusowa: odporność na obrażenia fizyczne, premia do obrażeń ataków SIŁ, Przewaga na SIŁ. Bez czarów.", en: "Barbarian, bonus action: resistance to physical damage, bonus damage on STR attacks, Advantage on STR. No spells." } },
  { id: "reckless", cat: "class", re: { pl: "Reckless Attack", en: "Reckless Attack" }, title: { pl: "Reckless Attack (Lekkomyślny atak)", en: "Reckless Attack" },
    text: { pl: "Przewaga na ataki SIŁ w tej turze, ale ataki na Ciebie też mają Przewagę do Twojej następnej tury.", en: "Advantage on STR attacks this turn, but attacks against you have Advantage until your next turn." } },
  { id: "sneak", cat: "class", re: { pl: "Sneak Attack", en: "Sneak Attack" }, title: { pl: "Sneak Attack (Atak z zaskoczenia)", en: "Sneak Attack" },
    text: { pl: "Łotr: raz na turę dodatkowe kości obrażeń, gdy ma Przewagę albo sojusznika obok celu. Broń finezyjna lub dystansowa.", en: "Rogue: extra damage dice once per turn with Advantage or an ally next to the target. Finesse or ranged weapon." } },
  { id: "cunning", cat: "class", re: { pl: "Cunning Action", en: "Cunning Action" }, title: { pl: "Cunning Action (Przebiegła akcja)", en: "Cunning Action" },
    text: { pl: "Łotr: Dash, Disengage albo Hide jako akcja bonusowa.", en: "Rogue: Dash, Disengage or Hide as a bonus action." } },
  { id: "cd", cat: "class", re: { pl: "Channel Divinity", en: "Channel Divinity" }, title: { pl: "Channel Divinity (Boska moc)", en: "Channel Divinity" },
    text: { pl: "Kleryk: kilka użyć boskiej mocy, np. Divine Spark albo Turn Undead. Krótki odpoczynek oddaje jedno użycie.", en: "Cleric: a few uses of divine power, such as Divine Spark or Turn Undead. A short rest restores one use." } },
  { id: "turn", cat: "class", re: { pl: "Turn Undead", en: "Turn Undead" }, title: { pl: "Turn Undead (Odpędzenie nieumarłych)", en: "Turn Undead" },
    text: { pl: "Nieumarli w 30 ft rzucają MĄD; porażka = przestraszeni i obezwładnieni na minutę albo do otrzymania obrażeń.", en: "Undead within 30 ft make a WIS save; on a fail they're Frightened and Incapacitated for a minute or until damaged." } },
  { id: "mastery", cat: "class", re: { pl: "Weapon Mastery", en: "Weapon Mastery" }, title: { pl: "Weapon Mastery (Mistrzostwo broni)", en: "Weapon Mastery" },
    text: { pl: "Każda broń ma właściwość mistrzowską (np. Topple, Vex, Push). Używasz jej tylko dla wybranych rodzajów broni.", en: "Each weapon has a mastery property (such as Topple, Vex, Push). You use it only with your chosen kinds of weapons." } },

  // --- Ravenloft ---
  { id: "darkgift", cat: "ravenloft", source: "ravenloft", re: { pl: "\\bDark Gifts?\\b|[Mm]roczn" + L + " dar" + L, en: "\\bDark Gifts?\\b" }, title: { pl: "Dark Gift (Mroczny dar)", en: "Dark Gift" },
    text: { pl: "Nadprzyrodzona moc od Mrocznych Mocy w zamian za straszną cenę. Za zgodą MG bierzesz ją zamiast featu pochodzenia; MG może też dać ją w trakcie przygody.", en: "A supernatural power from the Dark Powers at a terrible price. With the DM's permission you take one instead of an Origin feat; the DM can also grant one during an adventure." } },
];

/** All terms; every entry has `source` (phb2024 unless marked). */
export const TERMS = G.map((g) => ({ source: "phb2024", ...g }));

/** Terms shown in the panel for this game mode and query (Polish and English names and text, case and accents ignored). */
export function findTerms(query, lang, ravenloft = false) {
  const list = TERMS.filter((g) => g.source !== "ravenloft" || ravenloft);
  const q = fold(query).trim();
  if (!q) return list;
  const hits = list.filter((g) => textMatch(q, [g.title.pl, g.title.en, g.text[lang] || g.text.en].join(" ")));
  // Names first, then matches found only in the explanation.
  const named = (g) => textMatch(q, g.title.pl + " " + g.title.en);
  return [...hits.filter(named), ...hits.filter((g) => !named(g))];
}

/** Terms found in sheet text, and one regex for all of them in this language (group g<i> = TERM_LINKS[i]). */
export const TERM_LINKS = TERMS.filter((g) => g.re);
export function termRegex(lang) {
  const parts = TERM_LINKS.map((g, i) => `(?<g${i}>${g.re[lang]})`);
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join("|")})(?![\\p{L}\\p{N}])`, "gu");
}

export const termById = (id) => TERMS.find((g) => g.id === id) || null;
