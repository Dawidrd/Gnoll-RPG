// Language handling. UI strings live in js/lang/<code>.js; rules content carries {pl, en} objects.
import pl from "./lang/pl.js";
import en from "./lang/en.js";
import { storage } from "./store.js";

export const LANGS = { pl, en };
let current = storage.get("gnoll.lang") || ((navigator.language || "en").toLowerCase().startsWith("pl") ? "pl" : "en");

export const lang = () => current;
export function setLang(code) {
  if (!LANGS[code]) return;
  current = code;
  storage.set("gnoll.lang", code);
  document.documentElement.lang = code;
}

/** UI string by key, with {name} placeholders. Falls back to English, then the key. */
export function t(key, vars) {
  let s = LANGS[current][key] ?? LANGS.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll("{" + k + "}", vars[k]);
  return s;
}

/** Pick the current language from a {pl, en} content object (or return a plain string). */
export function tr(obj) {
  if (obj == null) return "";
  if (typeof obj === "string") return obj;
  return obj[current] ?? obj.en ?? "";
}

document.documentElement.lang = current;
