# Gnoll RPG — plan: drużyna i synchronizacja

**Cel:** gracze tworzą postać w kreatorze i mają ją na każdym urządzeniu. Drużyna łączy się w jedną grupę zarządzaną przez admina (właściciel projektu). Szyk, informacje o drużynie i notatki synchronizują się na żywo.

Prace zaczynają się **po partiach z klasami (7–8)**.

## Technika
- **Firebase** (Google): logowanie (Authentication) + baza na żywo (Firestore), region europe-central2 (Warszawa).
- Strona zostaje na GitHub Pages, bez kroku budowania (SDK Firebase jako moduły ES).
- **Logowanie opcjonalne:** bez konta aplikacja działa jak dziś (postacie w przeglądarce). Konto potrzebne tylko do drużyny i synchronizacji.
- Logowanie: konto Google albo link na e-mail.
- Offline: zmiany zapisują się lokalnie, wysyłają po powrocie sieci.
- Uprawnienia pilnują reguły bezpieczeństwa Firestore (serwer), nie sama aplikacja.
- Koszt: darmowy plan Spark (50 000 odczytów, 20 000 zapisów dziennie, 1 GiB).
- Odrzucone: Supabase (darmowy projekt usypia po 7 dniach), własny serwer, wymiana plików.

## Dołączanie do drużyny
1. Admin zakłada drużynę i dostaje link z kodem zaproszenia.
2. Gracz otwiera link, loguje się, wybiera postać i wysyła prośbę.
3. Admin akceptuje albo odrzuca w zakładce „Drużyna”; może później usunąć gracza.
4. Dopiero po akceptacji gracz widzi dane drużyny.

## Co widzą inni gracze
Tylko: **nazwa, gatunek, klasa, HP, AC, miejsce w szyku.** Reszta karty prywatna.

## Szyk
- **5 ft** — gęsiego (1-1-1-1…).
- **10 ft** — po dwie osoby w rzędzie (2-2-2…); przy nieparzystej liczbie ostatni rząd ma jedną osobę.
- Widzą wszyscy na żywo; ustawia admin (do potwierdzenia w D3).

## Notatki
- **Publiczna** — czyta cała drużyna.
- **Wewnętrzna** — widzi tylko autor (także admin nie ma dostępu).
- Każda notatka to osobny wpis z autorem i datą; przy jednoczesnej edycji wygrywa ostatni zapis.

## Partie
- **D1 · Konta:** opcjonalne logowanie; przy pierwszym logowaniu postacie z urządzenia trafiają do chmury; synchronizacja między urządzeniami; offline.
- **D2 · Drużyna:** zakładanie, link zaproszenia, prośby, akceptacja/odrzucenie, usuwanie graczy, role (admin, gracz).
- **D3 · Wspólne dane:** informacje o drużynie (nazwa, kampania, następna sesja), szyk 5/10 ft, notatki publiczne i wewnętrzne, podgląd postaci drużyny.
- **D4 · Zabezpieczenia i wdrożenie:** testy reguł bezpieczeństwa, tekst o prywatności w aplikacji i README (dziś „bez kont i serwera”), przycisk „usuń konto i dane”, próba z adminem i 1–2 graczami.

## Po stronie admina
- Założyć projekt w konsoli Firebase (ok. 10 min; instrukcja krok po kroku przy D1) i wkleić przygotowane reguły bezpieczeństwa.
- Pełne testy logowania i reguł na tym projekcie wykonuje admin (Claude Code może przygotować kod i emulator, ale prawdziwe logowanie wymaga konsoli).
