# Backlog

Lista błędów i pomysłów. Nowe wpisy na dół swojej sekcji; pomysły w kolejności realizacji.
Po naprawieniu/zrobieniu wpis trafia do „Zrobione” z numerem wersji.

## Błędy

_(brak)_

## Pomysły

1. Test z drużyną (eksport ze starych stron → import w aplikacji).
2. **„Wprowadź postać” z papierowej karty** — projekt zatwierdzony: `docs/projekty.md` §1. Co: osobny przycisk na ekranie głównym, kreator w trybie „przepisuję gotową postać”: wszystkie kroki dostępne od razu, cechy przepisane z kartki, ekwipunek obecny zamiast startowego. Po co: gracze z samą papierową kartą nie mają eksportu, a zwykły kreator nie pozwala wpisać wcześniej wylosowanych cech. Jak: nowa metoda cech „z papieru” — tablica standardowa i point buy sprawdzane jak dziś, wartości rzucone na papierze wymagają potwierdzenia MG i są stale oznaczone.
3. **Rodzaj obrażeń w walce i przy czarach** — projekt zatwierdzony: `docs/projekty.md` §2. Co: przy każdym ataku, czarze i zdolności zadającej obrażenia widoczny rodzaj (np. „1k8+3 cięte”, „3k6 ogień”) jako kolorowa etykieta. Po co: zgłoszenie graczy — w walce trzeba podać rodzaj obrażeń (odporności i podatności potworów), a dziś przy czarach jest tylko w opisie. Jak: rodzaj zapisany w danych czarów (dziś jest tylko w opisie), wyświetlany w planerze tury, liście ataków i zakładce Czary.
4. **Wyszukiwanie w listach rozwijanych w kreatorze.** Co: długie listy (broń, featy, czary, języki, narzędzia, zakupy) dostają pole „szukaj”, które zawęża listę w trakcie pisania. Po co: przewijanie długiej listy na telefonie jest uciążliwe. Jak: jeden wspólny element „lista z wyszukiwaniem” zamiast zwykłego `<select>` tam, gdzie pozycji jest dużo (np. ponad 12); szuka po nazwie polskiej i angielskiej, bez znaczenia wielkość liter i polskie znaki.
5. Decyzja o licencji kodu (np. MIT) i profil buycoffee (link w `js/config.js`).
6. Analityka bez cookies (np. GoatCounter) — wybór narzędzia i lista zdarzeń do mierzenia; zgodnie z zasadą prywatności (Firebase Analytics w projekcie włączony, ale aplikacja go nie używa).
7. **Tryb „Tryhard ;)”** (niepilne). Co: po wyborze klasy przycisk „Tryhard ;)” wypełnia wszystkie wybory według najmocniejszej strategii dla klasy; graczowi zostaje imię. Po co: szybka, mocna postać dla kogoś, kto nie chce analizować opcji. Jak: dla każdej klasy tabela „najlepszych wyborów” (gatunek, tło, rozkład tablicy standardowej, umiejętności, feat, czary, podklasa, wybory na poziomach); cechy wyłącznie z tablicy standardowej; wynik przechodzi te same sprawdzenia co zwykła postać i można go potem zmienić. Ravenloft tylko w trybie Ravenloft.
8. Jedna postać w kilku drużynach (na przyszłość, niepilne) — dziś obowiązuje zasada: jedna postać = jedna drużyna.

## W trakcie

_(brak)_

## Zrobione

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
