// "What's new": one entry per version that changes something players can see, newest first.
// The first entry's version must match js/config.js and sw.js. 2–4 points each, in plain words, PL and EN.
export const RELEASES = [
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
