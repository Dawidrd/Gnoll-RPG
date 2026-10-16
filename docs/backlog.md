# Backlog

Lista błędów i pomysłów. Nowe wpisy na dół swojej sekcji; pomysły w kolejności realizacji.
Po naprawieniu/zrobieniu wpis trafia do „Zrobione” z numerem wersji.

## Błędy

_(brak)_

## Pomysły

1. Test z drużyną (eksport ze starych stron → import w aplikacji).
2. **Tryb „Tryhard ;)”** (niepilne). Co: po wyborze klasy przycisk „Tryhard ;)” wypełnia wszystkie wybory według najmocniejszej strategii dla klasy; graczowi zostaje imię. Po co: szybka, mocna postać dla kogoś, kto nie chce analizować opcji. Jak: dla każdej klasy tabela „najlepszych wyborów” (gatunek, tło, rozkład tablicy standardowej, umiejętności, feat, czary, podklasa, wybory na poziomach); cechy wyłącznie z tablicy standardowej; wynik przechodzi te same sprawdzenia co zwykła postać i można go potem zmienić. Ravenloft tylko w trybie Ravenloft.
3. Jedna postać w kilku drużynach (na przyszłość, niepilne) — dziś obowiązuje zasada: jedna postać = jedna drużyna.
4. Decyzja o licencji kodu (np. MIT) i profil buycoffee (link w `js/config.js`) (niepilne).

## W trakcie

_(brak)_

## Zrobione

- **0.22.0** — Liczenie odwiedzin w GoatCounter (gnoll-rpg.goatcounter.com), bez ciasteczek i bez danych osobowych. Liczone: otwierane ekrany (bez id postaci i kodów zaproszeń), nowa postać i jej klasa (osobno „z karty”), import pliku i ze starych stron, założenie drużyny, prośba o dołączenie, język, otwarcie/instalacja jako aplikacja. Bez zewnętrznego skryptu. Nie liczy lokalnie, przy sygnale „nie śledź” przeglądarki i po zaznaczeniu „Nie licz moich wizyt” na ekranie Prywatność (nowa sekcja „Liczenie odwiedzin”, PL i EN).
- **0.21.1** — Błąd: osoba bez postaci, która dostała zaproszenie do drużyny, po stworzeniu postaci musiała jeszcze raz wkleić link. Teraz przyciski „Nowa postać” i „Wprowadź postać z karty” na ekranie zaproszenia pamiętają zaproszenie; po zapisaniu postaci aplikacja wraca do zaproszenia z tą postacią już wybraną — wystarczy „Wyślij prośbę”. Te same przyciski są też dla kogoś, kto ma już postacie, ale chce zagrać nową.
- **0.21.0** — Wyszukiwanie w długich listach rozwijanych: każda lista z ponad 12 pozycjami (broń, featy, narzędzia, zakupy, błyskotki, tła, featy przy awansie…) ma nad sobą pole „Szukaj na liście…”, które zawęża listę w trakcie pisania. Szuka po nazwie polskiej i angielskiej, bez znaczenia wielkość liter i polskie znaki (np. „luk” znajdzie „Łuk”). Enter otwiera zawężoną listę zamiast zapisywać postać. Wyszukiwarka czarów też ignoruje polskie znaki.
- **0.20.2** — Błąd: w sekcji „Konto” między „Postacie są zsynchronizowane.” a przyciskami wyświetlał się napis „null” (gdy nie ma postaci do przeniesienia). Ten sam błąd groził w Dzienniku podczas edycji wpisu i w zakładkach drużyny. Poprawka: wspólna funkcja `fill()` w `dom.js` pomija puste elementy.
- **0.20.1** — Nowy branding: logo z gnollem w górnym pasku (zamiast napisu), favicon `favicon.png?v=2`, ikony aplikacji na telefon `logo192.png` i `logo512.png` (manifest i apple-touch-icon). Stare ikony z folderu `icons/` usunięte z repo.
- **0.20.0** — Rodzaj obrażeń w walce i przy czarach (projekt §2, oba etapy): jedna lista 13 rodzajów (`js/rules/damage.js`), kolorowa etykieta ze znakiem i słowem (np. „3k6 🔥 ogień”, „wybierz” przy czarach do wyboru). Widać ją przy broni (lista ataków, Ekwipunek, akcja Attack w planerze), przy wszystkich czarach zadających obrażenia (planer, zakładka Czary, wybór czarów) i przy zdolnościach po trafieniu (Sneak Attack, Rage, Divine Fury, Hand of Harm, Psionic Strike, Eldritch Smite — nowa opcja w planerze, Breath Weapon z kolorem przodka…). W Walce linijka „Twoje odporności”.
- **0.19.1** — Font: gotycki font (UnifrakturMaguntia) zamieniony na Cormorant Unicase — logo „Gnoll RPG” w górnym pasku i nazwa postaci na karcie.
- **0.19.0** — „Wprowadź postać z karty”: kreator do przepisania gotowej postaci z papierowej karty — kroki bez blokady, cechy z kartki (tablica/point buy rozpoznane i sprawdzane, rzut na papierze 3–18 ze znaczkiem „Cechy z papieru”), potwierdzanie cech przez MG w Widoku MG (po potwierdzeniu zablokowane, MG może cofnąć), obecne monety i przedmioty zamiast ekwipunku startowego. Nowe zasady w `firestore.rules` + testy na emulatorze (wymaga wklejenia zasad w konsoli Firebase).
- **0.18.2** — Błąd: zakładanie drużyny z postacią kończyło się komunikatem „Serwer nie przyjął zmiany”. Zasady bazy nie pozwalały zapisać Widoku MG założyciela w tej samej paczce, w której powstaje drużyna. Poprawka w `firestore.rules` + test na emulatorze (wymaga wklejenia nowych zasad w konsoli Firebase).
- **0.18.1** — Awans: własny wynik rzutu na HP z kości przy stole (liczba od 1 do kości klasy); wpisany wynik i stałą wartość można zmienić przed awansem, rzutu w aplikacji — nie.
- **0.18.0** — Partia 9: ekwipunek startowy w kreatorze — zestaw albo złoto od klasy i tła (12 klas, 20 teł z Ravenloft), zakupy z cennika rozdz. 6, błyskotka (własna lista), dodatkowe złoto od 5. poziomu za zgodą MG; zbroja i broń z zestawu od razu w KP i atakach, przedmioty i monety w zakładce Ekwipunek po zapisie.
- **0.17.1** — Kreator postaci: „Dalej” otwiera nowy krok od góry strony; nie przechodzi dalej, dopóki krok nie jest uzupełniony (komunikat + przewinięcie do brakującego pola). Test na telefonie zaliczony.
- **0.17.0** — Drużyna w karcie postaci: zakładka „Drużyna”, rola MG z Widokiem MG, „Party” zamiast „Team” w kodzie i w bazie, jedna postać = jedna drużyna. Test na dwóch kontach zaliczony.
- **0.16.0** — Partia D4: testy reguł bezpieczeństwa (symulator), ekran Prywatność, „Usuń konto i dane”. Test z drużyną zaliczony.
- **0.15.0** — Partia D3: wspólne dane drużyny — informacje, szyk 5/10 ft, notatki drużyny i prywatne, podgląd postaci. Test na dwóch kontach zaliczony.
- **0.14.0** — Partia D2: drużyna — zakładanie, link zaproszenia, prośby, akceptacja/odrzucenie, usuwanie graczy, role (admin, gracz). Test na dwóch kontach zaliczony.
- **0.13.0** — Partia D1: konta — opcjonalne logowanie Google, synchronizacja postaci między urządzeniami, offline. Test na dwóch urządzeniach zaliczony.
- **0.12.0** — Partia 8: Fighter, Paladin, Ranger, tabela broni z Weapon Mastery, ataki bronią na karcie.
- **0.11.0** — Partia 7: Bard, Druid, Wizard.
