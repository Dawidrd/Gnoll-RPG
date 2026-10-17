// Offline support: keep the app shell and fonts cached. Bump VERSION when files change.
const VERSION = "gnoll-0.41.0";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./css/app.css",
  "./logo.png", "./favicon.png", "./logo192.png", "./logo512.png",
  "./js/main.js", "./js/rules/avatar.js", "./js/views/avatar.js", "./js/config.js", "./js/dom.js", "./js/i18n.js", "./js/store.js", "./js/glossary.js",
  "./js/lang/pl.js", "./js/lang/en.js",
  "./js/rules/core.js", "./js/rules/index.js", "./js/rules/species.js", "./js/rules/backgrounds.js", "./js/rules/classes/monk.js", "./js/rules/classes/barbarian.js", "./js/rules/classes/rogue.js", "./js/rules/classes/cleric.js", "./js/rules/classes/warlock.js", "./js/rules/classes/sorcerer.js", "./js/rules/classes/bard.js", "./js/rules/classes/druid.js", "./js/rules/classes/wizard.js", "./js/rules/beasts.js", "./js/rules/familiars.js", "./js/rules/classes/fighter.js", "./js/rules/classes/paladin.js", "./js/rules/classes/ranger.js", "./js/rules/weapons.js", "./js/rules/options.js", "./js/rules/turn.js", "./js/rules/pageimport.js", "./js/rules/armor.js", "./js/rules/skills.js", "./js/rules/names.js", "./js/rules/tools.js", "./js/rules/identity.js", "./js/rules/checks.js", "./js/rules/feats-general.js", "./js/rules/feats-ravenloft.js", "./js/rules/spells.js", "./js/rules/spells/cantrips.js", "./js/rules/spells/level1.js", "./js/rules/spells/level2.js", "./js/rules/spells/level3.js", "./js/rules/magic.js", "./js/rules/equipment.js", "./js/rules/damage.js",
  "./js/views/home.js", "./js/views/addmode.js", "./js/views/form.js", "./js/views/sheet.js", "./js/views/levelchoice.js", "./js/views/msg.js", "./js/views/spellpicker.js", "./js/views/classoptions.js", "./js/views/combat.js", "./js/views/gear.js", "./js/views/weapons.js", "./js/views/dmgtag.js", "./js/views/account.js", "./js/views/selectsearch.js", "./js/views/skillgroups.js", "./js/views/fieldof.js", "./js/views/familiar.js", "./js/views/notes.js", "./js/views/live.js", "./js/rules/notes.js", "./js/search.js", "./js/sfx.js", "./js/stats.js", "./js/inapp.js",
  "./js/sync/merge.js", "./js/sync/cloud.js", "./js/sync/partylogic.js", "./js/sync/party.js", "./js/views/party.js", "./js/sync/erase.js", "./js/views/privacy.js", "./js/views/install.js", "./js/releases.js", "./js/views/news.js",
  "./assets/audio/sfx/attack.mp3", "./assets/audio/sfx/rage.mp3", "./assets/audio/sfx/down.mp3", "./assets/audio/sfx/eldritch-blast.mp3",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Stale-while-revalidate: answer from cache at once, refresh it in the background.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  // Firebase code (only fetched after signing in), so a signed-in device can start offline too. Its data traffic is not cached here.
  const firebase = url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  if (e.request.method !== "GET" || (url.origin !== location.origin && !fonts && !firebase)) return;
  if (e.request.headers.has("range")) return; // streamed audio (the history's song): straight from the network
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: url.origin === location.origin });
    const net = fetch(e.request).then((res) => { if (res.status === 200 || res.type === "opaque") cache.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
