# Gnoll RPG

**PL** · Darmowa karta postaci do gier fabularnych opartych na zasadach 5e (2024), która uczy grać Twoją postacią. Działa w przeglądarce i na telefonie, także offline. Język polski i angielski.

**EN** · A free character sheet for 5e (2024) tabletop games that teaches you to play your character. Runs in the browser and on phones, offline too. Polish and English.

## Co już działa / What works

- Kreator w 5 krokach z rozdziału 2 Podręcznika Gracza 2024: klasa → pochodzenie → cechy → charakter → szczegóły
- Limity z podręcznika wbudowane w kreator (umiejętności, języki, narzędzia, featy, point buy, jeden rzut 4k6); lista „Do uzupełnienia”
- Barbarzyńca, Kleryk, Mnich, Łotr (poziomy 1–5) z podklasami; 16 teł; 7 gatunków
- Tracker HP z tymczasowymi HP, cofaniem i rzutami przeciw śmierci; zasoby z odpoczynkami; awans z rzutem na HP
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
js/rules/core.js                          matematyka 5e, umiejętności, featy
js/rules/classes/monk.js                  klasa: zdolności, zasoby, awans
js/rules/species.js                       gatunki
js/rules/backgrounds.js                   tła
js/rules/tools.js, identity.js            narzędzia; języki, charaktery, rozmiary, point buy
js/rules/skills.js                        limity wyborów (dopasowanie do źródeł)
js/rules/checks.js                        „Do uzupełnienia” i błędy blokujące zapis
js/rules/index.js                         silnik: postać → wszystko, co pokazuje karta
js/views/{home,form,sheet}.js             ekrany
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
