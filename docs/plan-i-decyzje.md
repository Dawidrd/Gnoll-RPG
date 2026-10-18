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
- Zasady limitów: przekroczenia blokują zapis; braki od 0.24.0 też, chyba że gracz zapisze „z brakami — ustalone z MG” (wcześniej: szkic z listą „Do uzupełnienia”). Stare postacie zawsze się wczytują (`normalize`), niczego nie kasujemy po cichu.
- Każda reguła ma test w `tests/run.mjs` (uruchamianie: `node tests/run.mjs`). Przed commitem testy muszą przechodzić.
- Tryb Ravenloft: Dark Gift można wziąć zamiast featu pochodzenia (za zgodą DM-a); w grze standardowej opcje z Ravenloftu są zablokowane.
- Czary: baza 213 czarów (sztuczki i kręgi 1–3).
- Dźwięki: nowe pliki generuje właściciel projektu w ElevenLabs; potwierdził 2026-10-18, że jego licencja pozwala rozpowszechniać je w publicznej aplikacji. Od 0.46.0 wszystkie dźwięki i muzyka historii zmian są z ElevenLabs (pliki z myinstants.com i piosenka Rafonixa usunięte). Szczegóły i tabela plików: `docs/zrodla.md`.
- Ręczne poprawki (HP, AC, prędkość) nie istnieją: aplikacja liczy według zasad. Przy imporcie ze starych stron karta „Przeniesione ze strony” pokazuje różnice.
- Dodawanie postaci (0.25.0): jedno wejście „+ Dodaj postać” z trzema trybami — Nowa (kreator), Z karty (przepisanie z papieru), Z pliku (plik z Gnoll RPG albo ze starej strony). Każdy tryb kreatora pamięta swój szkic. Import tylko z pliku — wklejanie tekstu usunięte.

## D1 · Konta (Firebase)
Plan całości: `docs/druzyna-synchronizacja.md`.
- Projekt Firebase **gnoll-rpg** jest założony.
- Włączone: logowanie Google (Authentication), baza Firestore (region europe-central2, tryb production), domena autoryzowana `dawidrd.github.io`.
- Konfiguracja aplikacji (obiekt `firebaseConfig`): konsola Firebase → Project settings → General.
- Analytics jest w projekcie włączony, ale **aplikacja go nie inicjalizuje**.
- Liczenie odwiedzin (0.22.0): GoatCounter, https://gnoll-rpg.goatcounter.com (`statsUrl` w `js/config.js`, kod w `js/stats.js`, bez zewnętrznego skryptu). Liczone: ekrany (bez id i kodów), `character/new|paper/<klasa>`, `import/file|old-page`, `dodaj-nowa|dodaj-karta|dodaj-plik` (wybór sposobu dodania postaci, od 0.25.0), `party/create`, `party/join-request`, `lang/<pl|en>`, `app/opened-installed`, `app/installed`. Wyłączone lokalnie, przy DNT/GPC i po „Nie licz moich wizyt” (ekran Prywatność).
- Reguły bezpieczeństwa Firestore przygotowuje Claude Code w D1, a w konsoli wkleja je użytkownik.

**Jak działa (0.13.0):**
- Aplikacja zawsze czyta postacie z urządzenia (`localStorage`); `js/sync/cloud.js` kopiuje zmiany w obie strony.
- W chmurze: `users/{uid}/characters/{id}` = `{ json, updated, deleted }` (postać jako tekst). Usunięcie zostawia znacznik z czasem, żeby dotarło też do urządzeń, które były offline.
- Konflikt: wygrywa nowsza zmiana (pole `updated`). Pierwsze logowanie na urządzeniu wysyła wszystkie jego postacie.
- Offline: trwała pamięć podręczna Firestore; zmiany czekają i wysyłają się same. Service worker zapamiętuje kod Firebase z `www.gstatic.com/firebasejs/`.
- Kod Firebase (SDK 12.4.0 z gstatic) wczytuje się dopiero po kliknięciu „Zaloguj” albo gdy urządzenie było już zalogowane. Bez konta aplikacja nie łączy się z Google.
- Logowanie: okno Google (popup); gdy przeglądarka je blokuje — przekierowanie. Logowanie linkiem e-mail nie jest włączone.
- **Postacie są przypisane do konta** (decyzja użytkownika): na urządzeniu każde konto ma osobną listę (`gnoll.characters.u.<uid>`), a postacie bez konta swoją (`gnoll.characters.v1`). Aktywne konto: `gnoll.account`. Po wylogowaniu lista konta znika z widoku (zostaje w pamięci urządzenia na następne logowanie), widać postacie bez konta. Przelogowanie na inne konto niczego nie miesza.
- Pierwsze logowanie danego konta na urządzeniu zabiera postacie bez konta na to konto. Przy kolejnych logowaniach postacie bez konta tylko się zgłaszają („Przenieś je na to konto”), bo mogą należeć do kogoś innego.
- Póki `apiKey` w `js/config.js` jest pusty, ramki „Konto” nie ma, a teksty o prywatności są jak dawniej.

**Do zrobienia przez użytkownika:**
1. ~~Konfiguracja `firebaseConfig` w `js/config.js` (bez `measurementId`).~~ Zrobione.
2. ~~`firestore.rules` wklejone w Firestore Database → Rules.~~ Zrobione (odczyt bez logowania: `permission-denied`).
3. ~~`localhost` w Authorized domains.~~ Zrobione.
4. ~~Test na localhost: zalogować się na komputerze i telefonie, zmienić HP na jednym, sprawdzić drugi; to samo w trybie samolotowym.~~ Zrobione.

## D2 · Drużyna
**Jak działa (0.14.0):**
- W chmurze: `teams/{id}` = `{ name, owner, invite, created }`; `teams/{id}/members/{uid}` = `{ role, name, charId, charName, at }`; `teams/{id}/requests/{uid}` = prośby; `invites/{kod}` = `{ team, name }`; `users/{uid}/teams/{id}` = moja lista drużyn (`state`: asked/in).
- Link zaproszenia: `…#/join/<kod>` (20 losowych znaków). Zaproszenie da się odczytać tylko znając kod; nie da się wylistować. „Nowy link” unieważnia stary.
- Prośba zawiera imię z konta Google i wybraną postać (postać obowiązkowa). Admin przyjmuje albo odrzuca. Założyciel może nie mieć postaci (np. MG).
- Role: admin (przyjmuje, odrzuca, usuwa, nadaje/odbiera admina) i gracz. Założyciela nie można usunąć ani zdegradować; on nie opuszcza drużyny, tylko ją usuwa (dla wszystkich).
- Status na liście „Moje drużyny”: w drużynie / prośba czeka / odrzucona / usunięty (albo drużyna usunięta).
- Uprawnień pilnują reguły w `firestore.rules` (serwer). Ekrany: `js/views/team.js`, operacje: `js/sync/team.js`, czyste funkcje i testy: `js/sync/teamlogic.js`.
- Dane o postaci w drużynie: od D3 także gatunek, klasa, poziom, HP i AC (zob. niżej).

**Do zrobienia przez użytkownika:**
1. ~~Wkleić nowe `firestore.rules` w Firestore Database → Rules → Publish.~~ Zrobione.
2. ~~Test: założyć drużynę na jednym koncie, otworzyć link na drugim koncie (np. telefon), poprosić, przyjąć; sprawdzić odrzucenie, usunięcie, nadanie admina, nowy link, opuszczenie i usunięcie drużyny.~~ Zrobione.

## D3 · Wspólne dane
**Jak działa (0.15.0):**
- Ekran drużyny ma trzy zakładki: **Przegląd** (informacje, postacie, szyk), **Notatki**, **Zarządzanie** (prośby, link zaproszenia, opuszczenie/usunięcie).
- Informacje: nazwa, kampania, następna sesja (data i godzina) w `teams/{id}` (`campaign`, `next` = `RRRR-MM-DDTGG:MM`). Edytuje admin. Zmiana nazwy idzie też do zaproszenia; listy „Moje drużyny” innych graczy poprawiają się same przy następnym otwarciu.
- Podgląd postaci: każdy członek wysyła do drużyny tylko `sheet` = gatunek, klasa, podklasa, poziom, HP, tymczasowe HP, AC (`teamlogic.js` `sheetSummary`). Zapisuje go wyłącznie właściciel, kilka sekund po zmianie postaci (zbiorczo, żeby walka nie generowała zapisu na każde kliknięcie) i przy otwarciu ekranu drużyny. Gracz może zmienić postać w drużynie (albo grać bez postaci).
- Szyk: `teams/{id}.march` = `{ mode: "5"|"10", order: [uid] }`. **Ustawia admin** (decyzja z planu potwierdzona w D3); widzą wszyscy na żywo. W szyku są tylko osoby z postacią; nowi trafiają na koniec, a ci, którzy odeszli, znikają sami.
- Notatki drużyny: `teams/{id}/notes/{nid}` = `{ author, name, text, at }`; czyta cała drużyna, edytuje autor, usuwa autor albo admin. Notatki prywatne: `users/{uid}/teams/{id}/notes/{nid}` = `{ text, at }` — tylko autor (admin też nie ma dostępu). Do 4000 znaków. Przy jednoczesnej edycji wygrywa ostatni zapis.
- Opuszczenie drużyny albo „Usuń z listy” kasuje też moje prywatne notatki tej drużyny; usunięcie drużyny kasuje notatki drużyny.
- Ekran nie gubi tego, co piszesz: zmiany z chmury czekają, aż wyjdziesz z pola tekstowego.

**Do zrobienia przez użytkownika:**
1. Wkleić nowe `firestore.rules` w Firestore Database → Rules → Publish (bez tego zapis informacji, szyku, notatek i HP zostanie odrzucony).
2. Test na dwóch kontach: admin wpisuje kampanię i termin, ustawia szyk 5/10 ft; obaj dodają notatki drużyny i prywatne (sprawdzić, że prywatnych drugie konto nie widzi); zmiana HP na karcie gracza pojawia się u admina po kilku sekundach.

## D4 · Zabezpieczenia i wdrożenie
**Jak działa (0.16.0):**
- *(Od 0.17.0 zastąpione emulatorem — zob. „Testy reguł na emulatorze” niżej.)* Testy reguł: `tests/rules-sim.mjs` czyta `firestore.rules` i odpowiada „czy serwer by na to pozwolił” (odczyty, zapisy, paczki zapisów). Bez emulatora Firebase (wymaga Javy, której tu nie ma). Testy w `tests/run.mjs` („rules: …”) sprawdzają m.in.: obcy nie czyta postaci ani drużyny, prośba tylko z ważnym kodem, akceptuje tylko admin, nikt nie usuwa ani nie degraduje założyciela, drużyna widzi tylko skrót postaci, notatki prywatne tylko autor, usunięcie konta da się przeprowadzić do końca. Sprawdzone celowym psuciem reguł: każde osłabienie wywala test.
- **Usuń konto i dane** (ramka „Konto”, `js/sync/erase.js`): Google prosi o ponowne wybranie konta → z serwera (nie z pamięci urządzenia) czytane są drużyny, notatki i postacie → usuwane po kolei: moje notatki drużyny (póki jestem członkiem), moje miejsce lub prośba, drużyny założone przeze mnie (dla wszystkich, jak „Usuń drużynę”), notatki prywatne, postacie → na koniec konto logowania. Wymaga internetu. Synchronizacja jest na ten czas wstrzymana; przy błędzie wraca i odsyła postacie z urządzenia (nic nie ginie).
- Opcja (domyślnie włączona) „Zostaw moje postacie na tym urządzeniu”: postacie konta stają się postaciami bez konta. Na innych urządzeniach kopie zostają w pamięci przeglądarki (aplikacja nie wie, że konto usunięto; tekst w aplikacji to mówi).
- Ekran **Prywatność** (`#/privacy`, link w stopce i pod ramką „Konto”): bez konta, z kontem, w drużynie, usługi (GitHub Pages, Google Fonts, Firebase), czego nie ma, jak usunąć dane.
- `firestore.rules` bez zmian względem 0.15.0 — nie trzeba nic wklejać ponownie (wystarczy wklejenie z D3).

**Do zrobienia przez użytkownika:**
1. Próba z adminem i 1–2 graczami (łącznie z testem D3).
2. Test „Usuń konto i dane” na **zapasowym** koncie Google: założyć postać i drużynę, dołączyć drugim kontem, dodać notatki, usunąć konto; sprawdzić, że drużyna zniknęła u drugiego gracza, a postać została na urządzeniu (gdy opcja była zaznaczona).

## Drużyna w karcie postaci, rola MG (0.17.0)
**Jak działa:**
- Po angielsku drużyna to **Party** wszędzie: w interfejsie, w kodzie (`js/sync/party.js`, `js/sync/partylogic.js`, `js/views/party.js`), w adresach (`#/party`) i w bazie: `parties/{id}`, `users/{uid}/parties/{id}`, pole `party` w `invites/{kod}`. Stare dane testowe pod `teams/` nie są czytane (decyzja użytkownika: zmiana przed prawdziwymi drużynami).
- Karta postaci ma zakładkę **Drużyna** (tylko gdy konto jest dostępne). Postać w drużynie → pełny widok drużyny (Przegląd, Notatki, Zarządzanie). Postać czeka na akceptację → informacja i „Wycofaj prośbę”. Postać bez drużyny → dołączenie linkiem i założenie drużyny z tą postacią. Zakładka i jej połączenia przeżywają odświeżanie karty (np. klik HP); kończą się po wyjściu z karty.
- **Jedna postać = jedna drużyna** (decyzja użytkownika; kilka drużyn na postać — pomysł na przyszłość w backlogu). Moja lista drużyn pamięta postać (`users/{uid}/parties/{id}.charId`); postacie zajęte gdzie indziej są wyłączone w wyborze (zakładanie, dołączanie, zmiana postaci). Odrzucona prośba zwalnia postać.
- **MG bez postaci** wchodzi z listy „Moje drużyny” (ramka Konto); tam też można założyć drużynę bez postaci. „Otwórz” przy drużynie z postacią prowadzi do zakładki na karcie.
- **Rola MG** (`members/{uid}.gm = true`): nadaje i odbiera admin, każdemu — także sobie i założycielowi. Założyciel nie musi być MG.
- **Widok MG**: każdy gracz wysyła obok skrótu postaci osobny dokument `parties/{id}/gm/{uid}` = `{ v, at }` (`partylogic.js` `gmSummary`: pasywna Percepcja/Wnikliwość/Śledztwo, inicjatywa, szybkość, widzenie w ciemności, ST czarów, 6 rzutów obronnych, 18 umiejętności, rzuty przeciw śmierci — same liczby). Czytają go tylko członkowie z rolą MG (reguły). MG wybiera grupy kolumn; wybór zapamiętuje urządzenie (`gnoll.gmview`).
- Opuszczenie drużyny, usunięcie gracza, usunięcie drużyny i usunięcie konta kasują też dokumenty widoku MG.

**Do zrobienia przez użytkownika:**
1. Wkleić nowe `firestore.rules` (Firestore Database → Rules → Publish). Stare drużyny testowe przestaną być widoczne — trzeba założyć nowe.
2. Test na dwóch kontach: założyć drużynę z zakładki „Drużyna” na karcie postaci, wysłać link, dołączyć drugim kontem z jego karty; nadać rolę MG (np. sobie) i sprawdzić Widok MG; sprawdzić, że gracz bez roli MG go nie widzi; zmiana HP/rzutów przeciw śmierci u gracza pojawia się u MG; postać z drużyny nie da się wybrać do drugiej drużyny.

## Postać z papierowej karty (0.19.0)
Projekt: `docs/projekty.md` §1 (zatwierdzony 2026-10-16).
- Przycisk „Wprowadź postać z karty” → `#/paper`, ten sam kreator z `ch.entry = "paper"`: „Dalej” nie blokuje, zapis blokują tylko błędy.
- Cechy wpisywane z kartki (przed premią z tła); `paperMethod` rozpoznaje tablicę standardową, point buy (8–15, do 27 pkt) albo rzut na papierze (`abilityMethod = "paper"`, 3–18). Tablica i point buy są sprawdzane jak zwykle.
- Rzut na papierze: stały znaczek „Cechy z papieru” (karta, podgląd drużyny, Widok MG). Drużyna widzi tylko odcisk wartości (`sheet.paper`, 8 znaków), MG widzi wartości (`gm.v.paper`).
- Potwierdza MG drużyny: zapis `paperOk = { sig, charId, by, name, at }` w dokumencie członka (`firestore.rules`: tylko MG, podpisany własnym uid). Potwierdzenie działa tylko dla tej samej postaci i tych samych wartości. Urządzenie gracza przepisuje je do `ch.paperConfirm`, co blokuje wartości; „Cofnij potwierdzenie” je odblokowuje. Import z pliku nie przenosi potwierdzenia.
- Zamiast ekwipunku startowego: monety i przedmioty (ten sam edytor co zakładka Ekwipunek), broń i zbroja z listy.

## Testy reguł na emulatorze
- Java 21 zainstalowana przez użytkownika; testy uprawnień przeniesione z autorskiego symulatora na oficjalny **Firebase Local Emulator Suite** (emulator Firestore) i `@firebase/rules-unit-testing`. Symulator usunięty.
- `npm run test:rules` uruchamia emulator (projekt `demo-gnoll`, bez łączenia z prawdziwym Firebase), testy z `tests/rules.test.mjs` (16) i zamyka emulator. `node tests/run.mjs` (87) zostaje bez zależności.
- Testy SDK używają `firebase@13` (wymóg `@firebase/rules-unit-testing@6`); aplikacja dalej ładuje SDK 12.4.0 z gstatic — reguły ocenia serwer, więc wersja SDK nie wpływa na wynik.
- Wynik przeniesienia: wszystkie 16 testów przeszło na emulatorze bez zmian w regułach (symulator nie przepuścił żadnej luki). Celowe osłabienia reguł emulator wyłapuje.

## Gdzie co jest w kodzie
- `js/rules/index.js` — `compute(ch)` liczy całą kartę, `normalize` migruje stare zapisy.
- `js/rules/checks.js` — `review()` zwraca todo/errors/notices.
- `js/rules/classes/*.js` — klasy; `species.js`, `backgrounds.js`, `feats.js`, `spells.js`, `options.js`, `turn.js`, `pageimport.js`.
- `js/views/*.js` — widoki (sheet, form, combat, gear, spells, classoptions…).
- `sw.js` — service worker (`VERSION`, `SHELL`).

## Zrobione (wersje)
0.1–0.3: podstawy, Monk, Barbarian, Rogue, Cleric. 0.4: kreator wg rozdz. 2. 0.5: awans krok po kroku, featy. 0.6: wszystkie gatunki PHB. 0.7: tryb Ravenloft. 0.8: czary. 0.9: Warlock i Sorcerer. 0.10: przeniesienie postaci ze starych stron, zakładki Walka (planer tury), Ekwipunek, Dziennik sesji. 0.11: Bard, Druid, Wizard (partia 7). 0.12: Fighter, Paladin, Ranger, broń i Weapon Mastery (partia 8). 0.13: konta (D1). 0.14: drużyna (D2). 0.15: wspólne dane drużyny (D3). 0.16: testy reguł bezpieczeństwa, ekran Prywatność, usuwanie konta (D4). 0.17: drużyna w karcie postaci, rola MG, Party zamiast Team. 0.18: ekwipunek startowy (partia 9). 0.19: postać z papierowej karty.

## Następne kroki (kolejność)
Przeniesione do `docs/backlog.md` (sekcja „Pomysły”).

## Zasady każdej partii
1. Tylko treści z podręczników.
2. Dane sprawdzać z PDF-ami (zob. `docs/zrodla.md`); nazwy, kręgi, wymagania muszą się zgadzać.
3. Testy, podbicie wersji, wpis w README/ten plik, krótki commit.
4. Na końcu krótkie podsumowanie dla użytkownika (nie jest programistą — prostym językiem).

## Otwarte (do ustalenia z graczami / GM-em)
- Niektóre postacie z importu mają braki w kreatorze (rozmiar, narzędzia, języki kampanii spoza PHB). Aplikacja nie przyjmuje języków spoza PHB; mogą trafić do Notatek.
