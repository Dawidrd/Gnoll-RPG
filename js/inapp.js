// Browsers built into other apps (Messenger, Facebook, Instagram…). Google refuses to sign in there
// ("400. That's an error… malformed"), so the account box asks to open the page in a normal browser instead.

// Messenger's browser also says FBAN, so it's checked before Facebook.
const APPS = [
  [/Messenger|FB_IAB\/MESSENGER|FBAN\/MessengerForiOS|\bOrca-Android/i, "Messenger"],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A|FBSV/, "Facebook"],
  [/Instagram/i, "Instagram"],
  [/musical_ly|BytedanceWebview|TikTok/i, "TikTok"],
  [/Snapchat/i, "Snapchat"],
  [/LinkedInApp/i, "LinkedIn"],
  [/\bLine\//, "LINE"],
];

/** The app whose built-in browser this is ("Messenger"…), "" for an unnamed Android one, or null in a normal browser. */
export function inAppBrowser(ua = "") {
  for (const [re, name] of APPS) if (re.test(ua)) return name;
  if (/Android/.test(ua) && /; wv\)/.test(ua)) return ""; // Android WebView inside some other app
  return null;
}

/** Which phone the help texts should speak to: "ios", "android" or null (computer, unknown). iPads on iPadOS 13+ say "Macintosh", so touch counts too. */
export function phoneKind(ua = "", touchPoints = 0) {
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

/** Android browser whose install steps differ: "samsung" (Samsung Internet), otherwise "chrome". */
export const androidBrowser = (ua = "") => (/SamsungBrowser/.test(ua) ? "samsung" : "chrome");

/** Install steps to show, by section: this phone's first, the rest folded away (null = a computer: all of them). */
export function installOrder(kind, browser) {
  if (kind === "ios") return { mine: ["ios"], rest: ["chrome", "samsung"] };
  if (kind === "android") return browser === "samsung" ? { mine: ["samsung"], rest: ["chrome", "ios"] } : { mine: ["chrome"], rest: ["samsung", "ios"] };
  return { mine: ["ios", "chrome", "samsung"], rest: [] };
}
