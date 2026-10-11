// Turn a checks item ({ key, vars }) into text, translating {pl, en} variables.
import { t, tr } from "../i18n.js";

export function msg(item) {
  const vars = item.vars ? Object.fromEntries(Object.entries(item.vars).map(([k, v]) => [k, typeof v === "object" && v ? tr(v) : v])) : undefined;
  return t(item.key, vars);
}
