# Źródła zasad (podręczniki)

Podręczniki są chronione prawem autorskim, więc **nie ma ich w repo** (i nie wolno ich tu dodawać). Trzymamy je lokalnie, w folderze obok projektu:

```
Documents/
  Gnoll-RPG/          ← repo
  dnd-zrodla/         ← podręczniki (poza repo)
    phb-2024.pdf
    ravenloft-horrors-within.pdf
    van-richten-wyciag.pdf
```

Skrót: ścieżka z repo to `../dnd-zrodla/`.

## Kolejność wiarygodności
1. Ravenloft: The Horrors Within (zasady 2024) — wygrywa w trybie Ravenloft.
2. PHB 2024 — zasady podstawowe.
3. Van Richten's Guide to Ravenloft (wyciąg) — tylko porównanie i uzupełnienia tam, gdzie Horrors Within czegoś nie ma.

## Jak czytać PDF-y oszczędnie
- Najpierw zamień PDF na zwykły tekst (jednorazowo) do `../dnd-zrodla/tekst/`, np. `pdftotext -layout plik.pdf plik.txt` albo skrypt w Pythonie (`pypdf`). Potem szukaj w tekście zamiast wczytywać całe strony.
- Czytaj tylko potrzebny rozdział (rozdz. 3 klasy, 5 featy, 7 czary, 6 ekwipunek w PHB).
- Przy PDF-ie ze skanu (bez tekstu) czytaj strony jako obrazy, tylko potrzebne.

## Gdzie które rozdziały (PHB 2024)
- Rozdz. 2 — tworzenie postaci; 3 — klasy; 4 — pochodzenie (tła, gatunki); 5 — featy; 6 — ekwipunek; 7 — czary.
- The Horrors Within, rozdz. 1 „Character Options” — gatunki, tła, Dark Gifts, podklasy Ravenloft.

## Dźwięki (`assets/audio/sfx/`, od 0.40.0)
Pliki `.mp3`, krótkie (do ~1,5 s, do ~50 KB). Od 0.45.0 każdy dźwięk (kategoria) może mieć do 3 wariantów do wyboru w Ustawieniach — katalog w `js/audio-config.js`. Nazwa pliku = `id` wariantu + `.mp3` (wariant domyślny ma nazwę kategorii, np. `attack.mp3`). Nowy wariant: plik do folderu + wiersz w katalogu (nazwa PL i EN) + wiersz w tabeli poniżej. Do `SHELL` w `sw.js` trafiają **tylko warianty domyślne**; pozostałe pobierają się przy pierwszym zagraniu (pilnuje tego test).

**Nowe dźwięki generujemy w ElevenLabs** na koncie właściciela projektu. Właściciel potwierdził (2026-10-18), że jego licencja ElevenLabs pozwala rozpowszechniać wygenerowane audio w publicznej aplikacji — to jest podstawa prawna dla tych plików, więc w tabeli wpisujemy „ElevenLabs (konto właściciela projektu)”. Od 0.46.0 wszystkie pliki pochodzą z ElevenLabs; dawne pliki z myinstants.com i piosenka Rafonixa zostały usunięte.

| Plik | Kiedy gra | Źródło | Licencja |
|---|---|---|---|
| `attack-1.mp3` | atak, który zabiera HP (Attack, druga broń, atak okazyjny) — wariant domyślny, w `SHELL` | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |
| `attack-2.mp3` | atak — wariant do wyboru w Ustawieniach | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |
| `rage.mp3` | wejście w Szał (barbarzyńca), w `SHELL` | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |
| `down.mp3` | postać spada do 0 HP, w `SHELL` | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |
| `eldritch-blast-1.mp3` | Eldritch Blast w planerze tury — wariant domyślny, w `SHELL` | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |
| `eldritch-blast-2.mp3` | Eldritch Blast — wariant do wyboru | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |
| `eldritch-blast-3.mp3` | Eldritch Blast — wariant do wyboru | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |
| `level-up.mp3` | zatwierdzenie awansu na wyższy poziom, w `SHELL` | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |
| `news-song.mp3` | easter egg: „Zobacz wcześniejsze zmiany” (przy włączonych dźwiękach), poza `SHELL` (5,6 MB, wczytywany dopiero przy odtwarzaniu) | ElevenLabs (konto właściciela projektu) | licencja planu ElevenLabs właściciela — rozpowszechnianie w publicznej aplikacji dozwolone (potwierdzone 2026-10-18) |