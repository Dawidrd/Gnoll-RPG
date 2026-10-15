# Gnoll RPG

**PL** · Darmowa karta postaci do gier fabularnych opartych na zasadach 5e (2024), która uczy grać Twoją postacią. Działa w przeglądarce i na telefonie, także offline. Język polski i angielski.

**EN** · A free character sheet for 5e (2024) tabletop games that teaches you to play your character. Runs in the browser and on phones, offline too. Polish and English.

## Co już działa / What works

- Kreator w 5 krokach z rozdziału 2 Podręcznika Gracza 2024: klasa → pochodzenie → cechy → charakter → szczegóły
- Limity z podręcznika wbudowane w kreator (umiejętności, języki, narzędzia, featy, point buy, jeden rzut 4k6); lista „Do uzupełnienia”
- Wszystkie 12 klas z PHB: Barbarzyńca, Bard, Czarnoksiężnik, Czarodziej, Druid, Kleryk, Łowca, Mnich, Łotr, Paladyn, Wojownik, Zaklinacz (poziomy 1–5) z podklasami; 16 teł; wszystkie 10 gatunków z PHB z liniami elfów i gnomów, dziedzictwami tieflingów i przodkami goliatów; czary z gatunku z DC, użyciami i odpornościami na karcie
- Czary: wszystkie czary z PHB 2024 od sztuczek do 3. kręgu (213), z listami klas sprawdzonymi z podręcznikiem; wybór z listy z limitami (Kleryk, Czarnoksiężnik, Zaklinacz, Arcane Trickster, Magic Initiate, Fey-Touched, Shadow-Touched, Ritual Caster); zakładka Czary z rzucaniem ze slotów, darmowymi użyciami i koncentracją
- Bard: Bardic Inspiration (k6, k8 od 5. poziomu), Expertise, Jack of All Trades wliczone w umiejętności, 4 kolegia + College of Spirits (Ravenloft); Druid: Primal Order, Wild Shape z 36 formami zwierząt (limit CR, przemiana z KP zwierzęcia i tymczasowymi HP), Wild Companion, 4 kręgi (Krąg Ziemi z wyborem ziemi po odpoczynku); Czarodziej: księga czarów (6 + 2 na poziom), przygotowane czary tylko z księgi, rytuały z księgi, Arcane Recovery, Scholar, 4 szkoły z darmowymi czarami szkoły
- Broń: 38 rodzajów broni z rozdz. 6 (obrażenia, właściwości, mistrzostwo, cena); ataki na karcie liczone z cech, biegłości, stylu walki (Archery, Dueling, Defense…), Szału i broni mnicha; Weapon Mastery do wyboru dla Barbarzyńcy, Łotra, Wojownika, Paladyna i Łowcy (oraz z featu Weapon Master)
- Wojownik: Fighting Style, Second Wind, Action Surge, Battle Master z 20 manewrami, Champion, Eldritch Knight, Psi Warrior; Paladyn: Lay on Hands, Divine Smite (raz za darmo), Blessed Warrior, Channel Divinity, 4 przysięgi; Łowca: Hunter's Mark za darmo, Deft Explorer, Druidic Warrior, 4 podklasy + Hollow Warden (Ravenloft)
- Czarnoksiężnik: Pact Magic (sloty wracają po krótkim odpoczynku), 28 inwokacji z wymaganiami (poziom, pakt, sztuczka, inna inwokacja), Pakty Łańcucha, Ostrza i Księgi; Zaklinacz: Punkty Czarów, Metamagia, Innate Sorcery
- Walka: planer tury (akcja, akcja bonusowa, reakcja, ruch w kratkach, użycie przedmiotu) z opcjami z klasy, podklasy, gatunku, featów i czarów; zasoby i sloty odejmują się same, × je oddaje; podpowiedzi „co jeszcze możesz”
- W użyciu: szał, Mage Armor, zdjęta zbroja, tarcza w ręku (AC i odporności liczą się od razu), chowaniec z imieniem i HP
- Ekwipunek (przedmioty z ilością i notatką, monety PP/GP/EP/SP/CP) i Dziennik sesji
- Import ze starych stron postaci: przycisk „Zapisz plik” na stronie, potem Importuj (albo Wklej tekst); przechodzą postać, HP, zasoby, złoto, ekwipunek, dziennik i pytania do GM-a, a różnice względem strony pokazują się na Starcie
- Tryb Ravenloft (The Horrors Within): gatunki Dhampir, Hexblood, Lupin, Reborn; tła Haunted One, Investigator, Mist Wanderer, Spirit Medium; featy Sharp Eye i Survivor; 9 Dark Gifts z ceną liczoną na karcie; podklasy Grave Domain, Phantom, Undead Patron, Shadow Sorcery, College of Spirits i Hollow Warden. W grze standardowej te opcje są niedostępne
- Awans krok po kroku: HP (rzut albo stała wartość), podklasa na 3. poziomie, na 4. zwiększenie cech (+2 lub +1/+1, maks. 20) albo feat ogólny z wymaganiami; to samo przy tworzeniu postaci od razu na wyższym poziomie
- Tracker HP z tymczasowymi HP, cofaniem i rzutami przeciw śmierci; zasoby z odpoczynkami
- Podpowiedzi przy terminach gry; przełącznik PL / EN; działa offline

## Prywatność / Privacy

Postacie zapisują się tylko w przeglądarce użytkownika (`localStorage`). Nie ma kont, serwera ani analityki.
Characters are stored only in the user's browser. No accounts, no server, no analytics.

## Uruchomienie lokalnie / Run locally

Nie ma kroku budowania. Wystarczy dowolny serwer plików:

```sh
python3 -m http.server 8000
# otwórz http://localhost:8000
```

## Testy / Tests

```sh
node tests/run.mjs
```

Testy reguł (bez zależności). Uruchamiaj przed każdą publikacją.

## Publikacja / Deploy (GitHub Pages)

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)`.
Po każdej zmianie plików podbij `VERSION` w `sw.js`, żeby telefony pobrały nową wersję.

## Struktura / Layout

```
index.html, manifest.webmanifest, sw.js   powłoka aplikacji i tryb offline
css/app.css                               wygląd
js/main.js                                router, górny pasek, stopka
js/config.js                              nazwa, wersja, link do wsparcia
js/i18n.js, js/lang/{pl,en}.js            teksty interfejsu
js/rules/core.js                          matematyka 5e, umiejętności, featy pochodzenia
js/rules/feats-general.js                 featy ogólne i stylu walki (od 4. poziomu)
js/rules/feats-ravenloft.js               featy pochodzenia z Ravenloftu i Dark Gifts
js/rules/spells.js, spells/*.js           baza czarów (sztuczki–3. krąg)
js/rules/magic.js                         źródła czarów i limity wyboru
js/rules/classes/*.js                     klasy: zdolności, zasoby, awans
js/rules/beasts.js                        zwierzęta do Wild Shape (dodatek B PHB)
js/rules/weapons.js                       broń i mistrzostwo broni (rozdz. 6), liczenie ataków
js/views/weapons.js                       lista ataków i wybór broni
js/rules/species.js                       gatunki, linie i dziedzictwa, czary z gatunku
js/rules/backgrounds.js                   tła
js/rules/tools.js, identity.js            narzędzia; języki, charaktery, rozmiary, point buy
js/rules/skills.js                        limity wyborów (dopasowanie do źródeł)
js/rules/checks.js                        „Do uzupełnienia” i błędy blokujące zapis
js/rules/index.js                         silnik: postać → wszystko, co pokazuje karta
js/views/{home,form,sheet}.js             ekrany
js/views/levelchoice.js                   wybór: zwiększenie cech albo feat
js/views/spellpicker.js                   lista czarów z limitem
js/glossary.js                            podpowiedzi przy terminach
```

### Dodanie klasy / Adding a class

1. Skopiuj `js/rules/classes/monk.js` jako np. `fighter.js` i opisz zdolności własnymi słowami, po polsku i angielsku.
2. Dopisz ją do `CLASSES` w `js/rules/index.js` (i usuń z `PLANNED_CLASSES`).
3. Dodaj plik do listy `SHELL` w `sw.js`.

Każdy wpis ma pole `source` (`srd52`, `phb2024`, `ravenloft`), żeby dało się później zbudować wersję opartą tylko na SRD.

## Fan Content

Gnoll RPG is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

Rules text in this project is written in our own words. The app is free and will stay free.
