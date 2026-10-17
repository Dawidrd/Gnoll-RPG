# Gnoll RPG — zasady pracy

Karta postaci 5e (2024) jako PWA: czysty HTML/CSS/JS (moduły ES), bez kroku budowania i bez zależności. Szczegóły struktury plików są w `README.md`.

## Testy

```sh
node tests/run.mjs
```

- Testy reguł bez zależności; uruchamiaj po każdej zmianie i przed każdym commitem. Wszystkie muszą przechodzić.
- Nowa reguła lub poprawka = nowy test w `tests/run.mjs` (`test("nazwa", () => { ... })`, asercje przez `eq`).
- Reguły bezpieczeństwa (`firestore.rules`) testuje oficjalny emulator Firestore: `npm run test:rules` (testy w `tests/rules.test.mjs`, `ok(...)` = dozwolone, `no(...)` = odrzucone). Wymaga Javy 21 (JDK zainstalowany na komputerze, `java` dostępna w PATH albo przez `JAVA_HOME`) i jednorazowego `npm install`. Uruchamiaj przy każdej zmianie `firestore.rules` albo zapisów do Firebase.
- `package.json` i `node_modules` służą tylko testom; aplikacja nadal nie ma zależności ani kroku budowania.
- Podgląd w przeglądarce: `python -m http.server 8765` → http://localhost:8765 (na Windowsie polecenie to `python` albo `py`, nie `python3`).

## Wersja — podbijaj przy każdej zmianie

Każda zmiana plików aplikacji wymaga podbicia wersji w **obu** miejscach, z tą samą wartością:

- `sw.js` → `const VERSION = "gnoll-X.Y.Z";` (inaczej telefony nie pobiorą nowej wersji z cache)
- `js/config.js` → `version: "X.Y.Z"`

Nowy plik JS/CSS/ikonę dopisz też do listy `SHELL` w `sw.js`, żeby działał offline.

Commity nazywamy `X.Y.Z: krótki opis`, a w treści lista zmian.

## Opisy reguł

- Opisy reguł, zdolności, czarów i featów piszemy **własnymi słowami** (parafraza, nie kopiujemy tekstu z podręczników) — wymóg Fan Content Policy.
- Zawsze w **dwóch językach**: treść reguł jako obiekty `{ pl, en }`; teksty interfejsu jako klucze w `js/lang/pl.js` i `js/lang/en.js` (oba pliki naraz).
- Nazwy w polskiej wersji w stylu istniejącego kodu: nazwa angielska + polskie tłumaczenie w nawiasie, np. `"Hand of Harm (Dłoń krzywdy)"`.
- Każdy wpis ma pole `source`: `srd52`, `phb2024` albo `ravenloft`. Treści Ravenloft muszą być niedostępne w grze standardowej.

## Dodawanie klasy

1. Skopiuj `js/rules/classes/monk.js` jako wzór.
2. Dopisz klasę do `CLASSES` w `js/rules/index.js` i usuń ją z `PLANNED_CLASSES`.
3. Dodaj plik do `SHELL` w `sw.js`, podbij wersję, dopisz testy, zaktualizuj listę „Co już działa” w `README.md`.

## Silnik postaci

- Limity blokują zapis (błędy, np. za dużo umiejętności, przekroczone złoto); braki nie blokują — postać zapisuje się jako szkic z listą „Do uzupełnienia”.
- Stare postacie zawsze muszą się wczytać: zmiany formatu obsługuje `normalize` w `js/rules/index.js`. Niczego nie kasujemy po cichu — wybór, który przestał pasować, zostaje widoczny z błędem albo gracz dostaje komunikat, co usunięto.

## Gdzie co jest

- Plan i ustalenia: `docs/` (`backlog.md`, `plan-i-decyzje.md`, `projekty.md` — projekty do zatwierdzenia, `druzyna-synchronizacja.md`, `zrodla.md`).
- Podręczniki (PDF) leżą w `../dnd-zrodla/`, poza repo. **Nigdy nie dodawaj ich do gita** (prawa autorskie). Wersje tekstowe: `../dnd-zrodla/tekst/` — szukaj w nich zamiast czytać całe PDF-y.
- Reguły i dane (ceny, tabele, liczby) sprawdzaj w `../dnd-zrodla/tekst/`, nie z pamięci. Przy rozbieżności między źródłami Ravenloft wygrywa The Horrors Within, nie Van Richten.

## Użytkownik

Użytkownik jest osobą nietechniczną — tłumacz prosto, bez żargonu, i kończ partię krótkim podsumowaniem.

- Po każdej partii podaj 3–5 konkretnych rzeczy do sprawdzenia w przeglądarce (co kliknąć i co powinno się pokazać).
- **Nigdy nie rób `git push` ani nie wysyłaj niczego na GitHub bez wyraźnego „wysyłaj” od użytkownika.** Commit lokalny jest w porządku.

## Backlog i kolejność prac

- Na początku pracy przeczytaj `docs/backlog.md` (sekcje: Błędy, Pomysły, W trakcie, Zrobione). Błędy mają pierwszeństwo przed pomysłami; potem kolejność prac = kolejność w „Pomysły”.
- Gdy użytkownik powie „dopisz do backlogu”, dodaj wpis do „Błędy” albo „Pomysły” (na koniec sekcji).
- Zaczynając wpis, przenieś go do „W trakcie”.
- Po naprawieniu błędu albo zrobieniu pomysłu przenieś wpis do „Zrobione” z numerem wersji, np. `**0.13.0** — …`.

## Prywatność

- Konto Google jest **opcjonalne**. Dane postaci są zawsze lokalnie w `localStorage`; po zalogowaniu synchronizują się w Firestore (postacie i drużyny), a dostęp ograniczają reguły w `firestore.rules`.
- Liczenie odwiedzin w GoatCounter (`js/stats.js`) według ustaleń z 0.22.0: bez ciasteczek, bez danych osobowych, tylko nazwy ekranów i stałe nazwy zdarzeń (nigdy imiona, id, kody zaproszeń ani tekst wpisany przez gracza); wyłączane przez „Nie licz moich wizyt” i sygnał DNT/GPC.
- Każde nowe zdarzenie analityki **zawsze** dopisujemy na ekranie Prywatność (PL i EN).
- Nowe dane wysyłane poza telefon (np. do Firestore) — najpierw uzgodnij z użytkownikiem i opisz na ekranie Prywatność.
