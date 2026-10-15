# Gnoll RPG — plan i decyzje

Darmowa web apka (PWA) z kartą postaci, która uczy grać postacią. Strona: https://dawidrd.github.io/Gnoll-RPG/ (GitHub Pages z gałęzi `main`, folder root).

Ten plik jest kopią ustaleń z projektu „DnD” w claude.ai, przygotowaną dla Claude Code. Historia zmian jest w `git log`.

## Ustalone
- Nazwa: Gnoll RPG. Droga fanowska: za darmo, w ramach Fan Content Policy Wizards. Bez płatnych funkcji. Ewentualnie dobrowolne wsparcie przez buycoffee (link wpisuje się w `js/config.js`).
- Bez obowiązkowego logowania: postacie zapisują się w przeglądarce, przenoszone eksportem/importem pliku.
- Języki: polski i angielski (`js/lang/pl.js`, `js/lang/en.js`) — każdy nowy tekst w obu.
- Technika: czysty HTML/CSS/JS (moduły ES), bez kroku budowania. **Po każdej zmianie plików podbić `VERSION` w `sw.js` oraz `version` w `js/config.js`**, a nowe pliki dopisać do `SHELL` w `sw.js`.
- Aplikacja sama pilnuje limitów z tworzenia postaci w PHB 2024; gracz nie sprawdza podręcznika.
- Zakres: wszystkie klasy i gatunki z PHB 2024 oraz tryb Ravenloft (The Horrors Within), poziomy 1–5. Bez trybu GM, bez opcji własnych, rzut 4k6 jeden i ostateczny.
- **Źródła zasad:** PHB 2024, Ravenloft: The Horrors Within, wyciąg z Van Richten's Guide to Ravenloft. Przy rozbieżności wygrywa The Horrors Within. PDF-y nie są w repo (zob. `docs/zrodla.md`).
- Treść danych: opisy własnymi słowami, `{pl, en}`, pole źródła (`phb2024`, `ravenloft`, …). Nie przepisujemy tekstu podręcznika.
- Zasady limitów: przekroczenia blokują zapis, braki nie (szkic z listą „Do uzupełnienia”). Stare postacie zawsze się wczytują (`normalize`), niczego nie kasujemy po cichu.
- Każda reguła ma test w `tests/run.mjs` (uruchamianie: `node tests/run.mjs`). Przed commitem testy muszą przechodzić.
- Tryb Ravenloft: Dark Gift można wziąć zamiast featu pochodzenia (za zgodą DM-a); w grze standardowej opcje z Ravenloftu są zablokowane.
- Czary: baza 213 czarów (sztuczki i kręgi 1–3).
- Ręczne poprawki (HP, AC, prędkość) nie istnieją: aplikacja liczy według zasad. Przy imporcie ze starych stron karta „Przeniesione ze strony” pokazuje różnice.

## Gdzie co jest w kodzie
- `js/rules/index.js` — `compute(ch)` liczy całą kartę, `normalize` migruje stare zapisy.
- `js/rules/checks.js` — `review()` zwraca todo/errors/notices.
- `js/rules/classes/*.js` — klasy; `species.js`, `backgrounds.js`, `feats.js`, `spells.js`, `options.js`, `turn.js`, `pageimport.js`.
- `js/views/*.js` — widoki (sheet, form, combat, gear, spells, classoptions…).
- `sw.js` — service worker (`VERSION`, `SHELL`).

## Zrobione (wersje)
0.1–0.3: podstawy, Monk, Barbarian, Rogue, Cleric. 0.4: kreator wg rozdz. 2. 0.5: awans krok po kroku, featy. 0.6: wszystkie gatunki PHB. 0.7: tryb Ravenloft. 0.8: czary. 0.9: Warlock i Sorcerer. 0.10: przeniesienie postaci ze starych stron, zakładki Walka (planer tury), Ekwipunek, Dziennik sesji.

## Następne kroki (kolejność)
1. **Partia 7 (0.11): Bard, Druid, Wizard.**
   - Bard: Bardic Inspiration, Expertise, 4 kolegia + College of Spirits (Ravenloft).
   - Druid: Primal Order, Wild Shape z formami, Wild Companion, 4 kręgi.
   - Wizard: księga czarów (6 na start, +2 na poziom), Arcane Recovery, 4 szkoły.
2. **Partia 8: Fighter, Paladin, Ranger + broń.** Tabela broni z rozdz. 6 z Weapon Mastery (dla wszystkich klas walczących, także Barbarzyńcy i Łotra), ataki bronią na karcie. Fighter: Fighting Style, Second Wind, Action Surge, Tactical Mind, podklasy (Battle Master, Eldritch Knight…). Paladin: Lay on Hands, Divine Smite, przysięgi. Ranger: Favored Enemy, Deft Explorer, podklasy + Hollow Warden (Ravenloft).
3. **Partie D1–D4: drużyna i synchronizacja (Firebase)** — zob. `docs/druzyna-synchronizacja.md`.
4. **Partia 9: ekwipunek startowy** (opcje A/B klasy i tła, złoto, cennik rozdz. 6, błyskotka; noszona zbroja i broń zasilają AC i ataki).
5. Test z drużyną (eksport ze starych stron → import w aplikacji).
6. Decyzja o licencji kodu (np. MIT) i profil buycoffee (link w `js/config.js`).

## Zasady każdej partii
1. Tylko treści z podręczników.
2. Dane sprawdzać z PDF-ami (zob. `docs/zrodla.md`); nazwy, kręgi, wymagania muszą się zgadzać.
3. Testy, podbicie wersji, wpis w README/ten plik, krótki commit.
4. Na końcu krótkie podsumowanie dla użytkownika (nie jest programistą — prostym językiem).

## Otwarte (do ustalenia z graczami / GM-em)
- Niektóre postacie z importu mają braki w kreatorze (rozmiar, narzędzia, języki kampanii spoza PHB). Aplikacja nie przyjmuje języków spoza PHB; mogą trafić do Notatek.
