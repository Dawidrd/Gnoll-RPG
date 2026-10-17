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
