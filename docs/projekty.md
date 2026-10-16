# Projekty

Projekty większych zmian z backlogu. Status każdego: **do zatwierdzenia** → **zatwierdzony** (z datą i decyzjami użytkownika) → po wdrożeniu przenosimy skrót do `plan-i-decyzje.md`.

---

## 1. „Wprowadź postać” z papierowej karty

**Status:** wdrożony w 0.19.0 (zatwierdzony 2026-10-16). Skrót w `plan-i-decyzje.md`.

**Decyzje użytkownika:** P1 — cechy z papieru potwierdza w drużynie osoba z rolą MG. P2 — postać z niepotwierdzonymi cechami dołącza do drużyny normalnie. P3 — gracz może poprawić cechy z papieru do chwili potwierdzenia przez MG.

### Problem
Część graczy ma tylko papierową kartę. Nie mają pliku eksportu, więc import nie pomoże. Zwykły kreator prowadzi krok po kroku, jak przy nowej postaci, i nie pozwala wpisać cech wylosowanych kiedyś na papierze: rzut 4k6 można wykonać tylko w aplikacji, raz i ostatecznie. Tak ma zostać dla nowych postaci.

### Co już jest (i zostaje)
- Kreator obsługuje poziomy 1–5: wybór poziomu, podklasy, wyborów na kolejnych poziomach i HP na każdym poziomie (można wybrać wynik kości z listy).
- Ochrona cech: tablica standardowa i point buy są sprawdzane, rzut 4k6 jest jednorazowy i blokuje zmianę metody.

### Rozwiązanie
**Wejście.** Na ekranie głównym obok „Nowa postać” i „Wczytaj z pliku” dochodzi przycisk **„Wprowadź postać z karty”**. Otwiera ten sam kreator w trybie przepisywania (`ch.entry = "paper"`).

**Różnice względem zwykłego kreatora:**
1. **Kroki bez blokady.** Pasek kroków działa od razu, można skakać dowolnie. „Dalej” nie zatrzymuje na brakach. Zapis nadal blokują przekroczenia limitów (jak dziś), a braki trafiają na listę „Do uzupełnienia”.
2. **Cechy: metoda „Z papierowej karty”.** Gracz wpisuje 6 wartości bazowych, czyli **przed** premią z tła (podpowiedź: „odejmij premię z tła z karty”). Premie z tła wybiera osobno, jak dziś. Aplikacja sama rozpoznaje, skąd są liczby:
   - zestaw = tablica standardowa (15, 14, 13, 12, 10, 8) → zapisuje jako tablicę, bez żadnego oznaczenia;
   - mieści się w point buy (8–15, 27 punktów) → zapisuje jako point buy, bez oznaczenia;
   - inaczej → **„rzut na papierze”**: każda wartość 3–18. Postać dostaje stały znaczek **„Cechy z papieru”** widoczny na karcie, w podglądzie drużyny i w Widoku MG.
3. **Potwierdzenie MG** (dotyczy tylko „rzutu na papierze”). Jeśli postać jest w drużynie, MG widzi przy niej „Potwierdź cechy”. Po potwierdzeniu znaczek zmienia się na „Cechy z papieru · potwierdzone przez MG”. Bez drużyny znaczek zostaje „niepotwierdzone”. Postaci to nie blokuje, a informacja jest jawna.
4. **Cechy zamknięte po potwierdzeniu.** Po potwierdzeniu przez MG wartości z papieru są zablokowane jak rzut 4k6, a zmiana metody jest niemożliwa. Do chwili potwierdzenia przez MG gracz może poprawić wartości (decyzja P3); po potwierdzeniu zmiana tylko przez „Cofnij potwierdzenie” u MG.
5. **Ekwipunek.** Zamiast „zestaw albo złoto” na start: gracz od razu wpisuje obecne monety i przedmioty (ten sam edytor co w zakładce Ekwipunek), a broń i zbroję wybiera z listy.
6. **HP.** Na każdym poziomie wybór wyniku kości z listy (już działa). Obecne HP, zużyte zasoby i sloty gracz ustawia potem na karcie, jak w trakcie gry.
7. **Wszystkie pozostałe zasady bez zmian:** limity umiejętności, featów, czarów i języków, wymagania featów, tryb Ravenloft.

### Dlaczego tak
- Tablica i point buy zostają tak samo szczelne. Wyjątek dotyczy tylko „rzutu z papieru” i jest zawsze jawny. Kontrolę przejmuje MG, który i tak widział rzut przy stole.
- Jeden kreator zamiast dwóch: mniej kodu, te same sprawdzenia.

### Zmiany w danych
- `ch.entry = "paper"` (tryb kreatora; po zapisie zostaje jako informacja).
- `ch.abilityMethod = "paper"` tylko dla rzutu z papieru, a `ch.paperConfirm = { by: uid, name, at } | null`. Potwierdzenie zapisuje MG w dokumencie drużyny, bo nie zmienia postaci gracza. *(Szczegóły w regułach Firestore, z testami na emulatorze.)*
- `normalize` nie zmienia starych postaci.

### Pytania do użytkownika
- **P1.** Potwierdzanie przez MG: robimy (rekomendacja) czy wystarczy sam znaczek?
- **P2.** Czy postać z niepotwierdzonymi cechami może dołączyć do drużyny bez ograniczeń? (Rekomendacja: tak, MG potwierdza po dołączeniu).
- **P3.** Czy gracz może poprawić cechy z papieru przed potwierdzeniem MG? (Rekomendacja: tak, do chwili potwierdzenia).

---

## 2. Rodzaj obrażeń w walce i przy czarach

**Status:** zatwierdzony 2026-10-16. Backlog: Pomysły nr 3.

**Decyzje użytkownika:** P4 — etykieta ze znakiem i słowem (np. 🔥 ogień). P5 — własne odporności także w zakładce Walka. P6 — oba etapy po kolei, bez czekania na test; użytkownik testuje później, niezależnie od prac.

### Problem
Gracze zgłosili, że w walce trzeba szybko podać rodzaj zadawanych obrażeń, bo potwory mają odporności i podatności. Dziś:
- broń ma rodzaj w danych (`weapons.js`) i widać go na liście broni, ale **nie w planerze tury** (opis akcji Attack pokazuje tylko trafienie i kość);
- czary mają rodzaj **tylko w zdaniu opisu**, bez osobnego pola, więc nie da się go pokazać jako etykiety;
- zdolności klas (Divine Smite, Sneak Attack, Hex, Rage…) mają rodzaj tylko w opisie.

### Rozwiązanie
**Jedna lista rodzajów.** Dziś są dwie (`DAMAGE_NAMES` w `species.js` i `DAMAGE_TYPES` w `feats-general.js`). Łączymy je w nowy plik `js/rules/damage.js`: 13 rodzajów, nazwy `{pl, en}`, kolor i krótki znak (np. 🔥 ogień, ❄ zimno, ⚡ błyskawice).

**Etykieta obrażeń** wyświetlana jednakowo wszędzie: `[kość + modyfikator] [kolorowa etykieta rodzaju]`, np. `1k8+3 🗡 cięte`, `3k6 🔥 ogień`, `2k8 ✨ promieniste`. Czytelna bez koloru (zawsze ze słowem), żeby działała przy daltonizmie i w trybie ciemnym.

**Dane czarów.** Nowa mapa w `damage.js`: id czaru → rodzaje i kości, np.
```js
"burning-hands": { dmg: "3d6", type: ["fire"] },
"chromatic-orb": { dmg: "3d8", type: ["acid","cold","fire","lightning","poison","thunder"], choose: true },
"toll-the-dead": { dmg: "{cd:d8}", type: ["necrotic"] },
```
Obejmuje wszystkie czary zadające obrażenia z bazy (sztuczki i kręgi 1–3). Każdy wpis sprawdzamy z podręcznikiem. Opisy czarów zostają bez zmian. Test pilnuje, żeby każdy czar, który w opisie wspomina obrażenia, miał wpis w mapie.

**Gdzie widać:**
1. **Planer tury (zakładka Walka):** akcja Attack pokazuje każdą broń z etykietą. Czary pokazują etykietę obok nazwy. Przy czarach „do wyboru” (Chromatic Orb, Dragon's Breath) widać wszystkie rodzaje z dopiskiem „wybierz”.
2. **Lista ataków (Walka/Ekwipunek):** etykieta zamiast samego słowa.
3. **Zakładka Czary:** etykieta przy nazwie czaru.
4. **Dodatki do trafienia** (etap 2): Divine Smite, Hex, Sneak Attack, Rage, Eldritch Smite, Psionic Strike, Divine Strike itd. dostają etykietę, np. „+2k8 ✨ promieniste”. Sneak Attack i Rage zadają ten sam rodzaj co broń, co widać w opisie.

**Etapy:**
- Etap 1: lista rodzajów, etykieta, broń w planerze, wszystkie czary.
- Etap 2: zdolności klas, gatunków i featów (Dragonborn Breath Weapon, Hellish Rebuke…).

### Pytania do użytkownika
- **P4.** Kolorowe etykiety ze znakiem (🔥) czy sam kolorowy tekst bez znaków?
- **P5.** Czy pokazywać też **własne odporności** postaci w zakładce Walka (dziś są w Podsumowaniu)? (Rekomendacja: tak, jedna linijka).
- **P6.** Robimy oba etapy naraz czy najpierw etap 1 do testu przy stole? (Rekomendacja: etap 1, potem 2).
