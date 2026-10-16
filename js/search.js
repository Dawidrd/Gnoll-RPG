// Text search shared by the lists: letter case, accents and Polish letters don't matter ("łuk" finds "Luk", "zbroj" finds "Zbroja").

/** Lower case, without accents and Polish letters. */
export const fold = (s) => String(s ?? "").toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** True when every word of the query appears somewhere in the text (empty query matches everything). */
export function textMatch(query, text) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const hay = fold(text);
  return words.every((w) => hay.includes(w));
}
