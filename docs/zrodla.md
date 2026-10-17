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
Pliki `.mp3`, krótkie (do ~1,5 s, do ~50 KB). Nazwa pliku = nazwa dźwięku z listy `SOUNDS` w `js/sfx.js`. Gdy plik trafi do folderu, dopisz go do `SHELL` w `sw.js` (pilnuje tego test) i uzupełnij tabelę.

| Plik | Kiedy gra | Źródło | Licencja |
|---|---|---|---|
| `attack.mp3` | atak w planerze tury (Attack, druga broń, atak okazyjny) | — | — |
| `rage.mp3` | wejście w Szał (barbarzyńca) | — | — |
| `down.mp3` | postać spada do 0 HP | — | — |
| `eldritch-blast.mp3` | Eldritch Blast w planerze tury | — | — |
