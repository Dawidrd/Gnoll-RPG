// "What's new": one entry per version that changes something players can see, newest first.
// The first entry's version must match js/config.js and sw.js. 2–4 points each, in plain words, PL and EN.
export const RELEASES = [
  {
    version: "0.40.0", date: "2026-10-17",
    points: [
      { pl: "Efekty dźwiękowe: przycisk z głośnikiem obok „Edytuj” i „Eksportuj” na karcie postaci. Domyślnie wyłączone; telefon pamięta Twój wybór.", en: "Sound effects: a speaker button next to “Edit” and “Export” on the character sheet. Off by default; your device remembers the choice." },
      { pl: "Dźwięk gra przy ataku i Eldritch Blast w planerze tury, przy wejściu w Szał i gdy postać spada do 0 HP.", en: "A sound plays for attacks and Eldritch Blast in the turn planner, when you start a Rage, and when your character drops to 0 HP." },
    ],
  },
  {
    version: "0.39.2", date: "2026-10-17",
    points: [
      { pl: "Portrety postaci w zakładce Drużyna już nie migają, gdy ktoś zmieni HP albo coś innego na swojej karcie.", en: "Character portraits on the Party tab no longer flicker when someone changes their HP or anything else on their sheet." },
    ],
  },
  {
    version: "0.39.1", date: "2026-10-17",
    points: [
      { pl: "Pytanie „Na pewno?” przy usuwaniu albo przenoszeniu notatki pokazuje się teraz tuż pod tą notatką — strona już nie skacze na górę.", en: "The “Are you sure?” question when deleting or moving a note now shows right under that note — the page no longer jumps to the top." },
      { pl: "Działa też z klawiatury: Esc anuluje, a po usunięciu kursor przechodzi na następną notatkę.", en: "It works with the keyboard too: Esc cancels, and after deleting the cursor moves to the next note." },
    ],
  },
  {
    version: "0.39.0", date: "2026-10-17",
    points: [
      { pl: "Stuknięcie w kropkę zasobu (np. Szał, sloty czarów) zużywa zawsze dokładnie 1 — nieważne, którą pełną kropkę stukniesz.", en: "Tapping a resource dot (e.g. Rage, spell slots) always uses exactly 1, whichever full dot you tap." },
      { pl: "Zużytej kropki nie da się już „odklikać”. Zasoby wracają po odpoczynku albo przez „Odzyskaj (zasada lub MG)” pod nazwą zasobu.", en: "A used dot can no longer be tapped back. Resources come back on a rest, or through “Regain (rule or GM)” under the resource's name." },
      { pl: "Pomyłka? Po zużyciu na dole pojawia się „Cofnij” na kilka sekund.", en: "Tapped by mistake? After using one, “Undo” shows at the bottom for a few seconds." },
    ],
  },
  {
    version: "0.38.0", date: "2026-10-17",
    points: [
      { pl: "Gdy zapiszesz postać z brakami „ustalone z MG”, MG widzi listę tych braków w Widoku MG w drużynie.", en: "When you save a character with gaps “agreed with the GM”, the GM sees the list of those gaps in the party's GM view." },
      { pl: "Lista znika sama, kiedy uzupełnisz kartę.", en: "The list clears by itself once you complete the sheet." },
    ],
  },
  {
    version: "0.37.0", date: "2026-10-17",
    points: [
      { pl: "Postać może mieć portret: dodaj zdjęcie albo rysunek w kreatorze (krok „Charakter i tożsamość”) albo na karcie w zakładce Postać.", en: "A character can have a portrait: add a photo or drawing in the creator (the identity step) or on the sheet's Character tab." },
      { pl: "Sam ustawiasz kadr: przesuń zdjęcie i powiększ je, a zapisze się to, co jest w kółku.", en: "You frame it yourself: drag and zoom the picture, and what is inside the circle is saved." },
      { pl: "Portret widać na liście postaci, na karcie i w drużynie (widzą go pozostali gracze i MG).", en: "The portrait shows on the character list, on the sheet and in the party (the other players and the GM see it)." },
    ],
  },
  {
    version: "0.36.0", date: "2026-10-17",
    points: [
      { pl: "Wszystkie notatki są teraz w jednym miejscu — w zakładce „Notatki” na karcie postaci.", en: "All your notes are now in one place — the “Notes” tab on the character sheet." },
      { pl: "Przy każdej notatce wybierasz: 🔒 tylko ja albo 👥 drużyna. Notatkę można później przełączyć.", en: "For each note you choose: 🔒 only me or 👥 party. You can switch a note later." },
      { pl: "Dziennik, notatki chowańca i „Moje notatki” z drużyny przeniosły się same do Notatek — nic nie zginęło.", en: "The journal, the familiar's notes and the party's “My notes” moved into Notes by themselves — nothing was lost." },
    ],
  },
  {
    version: "0.35.0", date: "2026-10-17",
    points: [
      { pl: "Postać z chowańcem (czar Find Familiar, Pakt Łańcucha, Wild Companion druida) ma nową zakładkę „Chowaniec”.", en: "A character with a familiar (Find Familiar, Pact of the Chain, the Druid's Wild Companion) has a new “Familiar” tab." },
      { pl: "Wybierasz formę z listy (np. kruk, sowa, imp) i od razu widzisz jej statystyki: KP, szybkość, cechy, zmysły, akcje.", en: "Pick a form from the list (e.g. raven, owl, imp) and see its stats right away: AC, speed, abilities, senses, actions." },
      { pl: "HP chowańca w kropkach, przełącznik „przy Tobie / odesłany / zniknął”, przycisk „Przywołaj znowu” i notatki.", en: "The familiar's HP as dots, a “with you / dismissed / gone” switch, a “Summon again” button and notes." },
    ],
  },
  {
    version: "0.34.0", date: "2026-10-17",
    points: [
      { pl: "Przy tworzeniu postaci i przy awansie ramka, w której wszystko jest już wybrane, robi się zielona ze znaczkiem ✓.", en: "When creating a character and when levelling up, a box where everything is already chosen turns green with a ✓." },
      { pl: "Od razu widać, co zostało do zrobienia.", en: "You can see at a glance what's left to do." },
    ],
  },
  {
    version: "0.33.0", date: "2026-10-17",
    points: [
      { pl: "Przy awansie nowy krąg czarów jest podświetlony na niebiesko ze znaczkiem „Nowe” — nowe miejsca na czary i czary, które możesz teraz wybrać.", en: "When you level up, a new spell level is highlighted in blue with a “New” badge — the new spell slots and the spells you can now pick." },
      { pl: "Podświetlenie zostaje po awansie i znika, gdy obejrzysz zakładkę Czary.", en: "The highlight stays after levelling up and goes away once you've looked at the Spells tab." },
    ],
  },
  {
    version: "0.32.0", date: "2026-10-17",
    points: [
      { pl: "Kliknięcie kropki zasobu (np. Bardic Inspiration, miejsca na czary) najpierw pyta „Użyć 1×…?” i przypomina, kiedy zasób wraca.", en: "Tapping a resource dot (e.g. Bardic Inspiration, spell slots) first asks “Use 1×…?” and reminds you when it comes back." },
      { pl: "Oddanie kropki działa od razu, bez pytania.", en: "Giving a dot back works at once, without asking." },
      { pl: "Pytanie można wyłączyć dla postaci: „Nie pytaj więcej” albo przełącznik pod zasobami.", en: "You can switch the question off for a character: “Don't ask again” or the switch under resources." },
    ],
  },
  {
    version: "0.31.0", date: "2026-10-17",
    points: [
      { pl: "Notatki drużyny są podpisane imieniem postaci, np. „Grok (Bartek)”, a MG bez postaci podpisuje się „MG”.", en: "Party notes are signed with the character's name, e.g. “Grok (Bart)”, and a GM without a character signs as “GM”." },
      { pl: "Starsze notatki zostają z dawnym podpisem; po edycji dostają nowy.", en: "Older notes keep their old signature; editing one gives it the new one." },
    ],
  },
  {
    version: "0.30.0", date: "2026-10-17",
    points: [
      { pl: "Na ekranie głównym jest teraz karta „Co nowego” — krótko o tym, co się zmieniło w aplikacji.", en: "The home screen now has a “What's new” card — a short note on what changed in the app." },
      { pl: "Pod linkiem „Zobacz wcześniejsze zmiany” jest cała historia zmian.", en: "“See earlier changes” opens the full history." },
    ],
  },
  {
    version: "0.29.0", date: "2026-10-17",
    points: [
      { pl: "Przy tworzeniu postaci listy broni i zbroi pokazują tylko to, czym Twoja postać umie się posługiwać.", en: "When creating a character, the weapon and armor lists show only what your character can use." },
      { pl: "Przełącznik „Pokaż wszystkie” odsłania resztę z ostrzeżeniem o braku biegłości.", en: "“Show all” reveals the rest, with a warning about missing proficiency." },
      { pl: "Tarcza bez biegłości nie daje już +2 do KP, zgodnie z zasadami.", en: "A shield without proficiency no longer gives +2 AC, as the rules say." },
    ],
  },
  {
    version: "0.28.0", date: "2026-10-17",
    points: [
      { pl: "Umiejętności do wyboru stoją w grupach pod cechami, np. „ZRĘ 16 (+3)”: Akrobatyka, Zręczne palce, Skradanie.", en: "Skills to pick are grouped under abilities, e.g. “DEX 16 (+3)”: Acrobatics, Sleight of Hand, Stealth." },
      { pl: "Tak samo przy tworzeniu postaci i przy awansie.", en: "Both when creating a character and when levelling up." },
    ],
  },
  {
    version: "0.27.0", date: "2026-10-17",
    points: [
      { pl: "Przy wyborze języków podpowiedź, jaki język jest typowy dla Twojego gatunku, i przycisk „Wybierz typowy”.", en: "When picking languages, a hint shows your species' typical language, with a “Pick the typical one” button." },
      { pl: "To tylko podpowiedź — nadal możesz wybrać dowolne języki.", en: "It is only a hint — you can still pick any languages." },
    ],
  },
  {
    version: "0.26.0", date: "2026-10-17",
    points: [
      { pl: "Możesz podać płeć postaci (albo nie podawać). Widać ją na karcie pod imieniem.", en: "You can set your character's gender (or leave it out). It shows on the sheet under the name." },
      { pl: "To tylko opis — nie zmienia zasad.", en: "It is only a description — it does not change the rules." },
    ],
  },
  {
    version: "0.25.0", date: "2026-10-17",
    points: [
      { pl: "Jeden przycisk „+ Dodaj postać”, a w nim trzy drogi: nowa postać, przepisanie z papierowej karty albo wczytanie z pliku.", en: "One “+ Add a character” button with three ways in: a new character, copying one from a paper sheet, or loading a file." },
      { pl: "Każda droga pamięta, co już wpisałeś.", en: "Each way remembers what you have already filled in." },
    ],
  },
  {
    version: "0.24.0", date: "2026-10-17",
    points: [
      { pl: "Przy tworzeniu postaci przycisk „Dalej” mówi, dokąd prowadzi, a „Zapisz postać” jest na ostatnim kroku.", en: "When creating a character, “Next” says where it leads, and “Save character” is on the last step." },
      { pl: "Postać z brakami zapiszesz tylko jako „ustalone z MG”.", en: "A character with gaps can only be saved as “agreed with the GM”." },
      { pl: "Niedokończona postać czeka na ekranie głównym — „Dokończ tworzenie”.", en: "An unfinished character waits on the home screen — “Continue”." },
    ],
  },
  {
    version: "0.23.2", date: "2026-10-17",
    points: [
      { pl: "W polskiej wersji „Tło” nazywa się teraz „Pochodzenie”.", en: "In the Polish version, “Tło” (background) is now called “Pochodzenie”." },
    ],
  },
  {
    version: "0.23.1", date: "2026-10-17",
    points: [
      { pl: "Gdy otworzysz aplikację z Messengera albo Facebooka, zobaczysz, jak przejść do zwykłej przeglądarki, żeby się zalogować.", en: "If you open the app from Messenger or Facebook, it shows how to switch to a normal browser so you can sign in." },
      { pl: "Nowa instrukcja „Jak zainstalować na telefonie” — link na dole strony.", en: "New “How to install on a phone” guide — linked at the bottom of the page." },
    ],
  },
  {
    version: "0.23.0", date: "2026-10-17",
    points: [
      { pl: "Ekwipunek startowy ma własny krok przy tworzeniu postaci.", en: "Starting equipment has its own step when creating a character." },
      { pl: "Zbroja, tarcza i broń pochodzą z zestawu albo z zakupów — nie ma już nic za darmo.", en: "Armor, shield and weapons come from the starting kit or from shopping — nothing is free any more." },
      { pl: "Postać od 2. poziomu dostaje więcej złota i magiczne przedmioty według tabeli z podręcznika.", en: "A character starting above level 1 gets more gold and magic items, following the book's table." },
    ],
  },
];

export const latest = () => RELEASES[0];

/** Whether the "What's new" card opens on its own: this version not seen yet, and the player had used the app before
 * (seen something earlier, or has characters). A brand-new visitor gets it folded. */
export function isUnseen(seen, hasCharacters, version = latest().version) {
  if (seen === version) return false;
  return !!seen || hasCharacters;
}
