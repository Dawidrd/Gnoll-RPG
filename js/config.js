// Project settings you can change without touching the rest of the code.
export const CONFIG = {
  name: "Gnoll RPG",
  version: "0.32.0",
  // Paste your buycoffee.to (or other) link here once the profile exists. Empty = the link is hidden.
  supportUrl: "",
  // GoatCounter site for visit counts (no cookies, see js/stats.js and the Privacy screen). Empty = nothing is counted.
  statsUrl: "https://gnoll-rpg.goatcounter.com",
  // Firebase project "gnoll-rpg" (optional account + sync). Copy the values from the Firebase console:
  // Project settings -> General -> Your apps -> SDK setup and configuration -> Config.
  // These values are public by design; access is guarded by firestore.rules. Empty apiKey = no account option.
  // measurementId is left out on purpose: the app does not load Analytics.
  firebase: {
    apiKey: "AIzaSyDGn95RaBcZCc14SedOF2F5soMtADX2Pyo",
    authDomain: "gnoll-rpg.firebaseapp.com",
    projectId: "gnoll-rpg",
    storageBucket: "gnoll-rpg.firebasestorage.app",
    messagingSenderId: "908661267915",
    appId: "1:908661267915:web:e042e766a56c27b5316a4e",
  },
};
