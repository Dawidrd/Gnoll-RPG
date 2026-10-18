// Sound effects (0.40): short clicks of sound for moments of play, off by default, switched on the sheet's header.
// The choice stays on this device only (localStorage), shared by all characters. Rules stay silent; screens call play().
// Files are added by hand to assets/audio/sfx/; a missing file just means no sound.
// 0.45: each sound (category) can have variants, picked in Settings (js/audio-config.js); the pick stays on this device.
import { storage } from "./store.js";
import { SFX_CATS, catOf, readPicks, variantFor } from "./audio-config.js";

const KEY = "gnoll.sfx";
const PICK_KEY = "gnoll.sfx.pick.v1"; // { category: variant }
/** Every sound the app knows. Offensive spells have their own sound, named after the spell. */
export const SOUNDS = SFX_CATS.map((c) => c.id);
/** Offensive spells with a sound; more can be added with their files. */
const SPELL_SOUNDS = ["eldritch-blast"];
/** A variant's file: its id + ".mp3". */
export const sfxFile = (variant) => `./assets/audio/sfx/${variant}.mp3`;
const MAX_AT_ONCE = 3;

/** Which sound a pick in the turn planner makes (or ""): a spell's own sound, Rage, or an attack.
 * The attack sound needs dealsDamage: an attack that takes the target's hit points. Grapple and Shove
 * are attacks too (made instead of an attack) but deal no damage, so they stay quiet. Every option with
 * attack: true says which it is in js/rules/turn.js; a test keeps new abilities from skipping it. */
export function soundFor(o) {
  if (!o) return "";
  if (o.spell) return SPELL_SOUNDS.includes(o.spell) ? o.spell : ""; // other spells are quiet for now, even attack spells
  if (o.set?.rage) return "rage";
  if (o.attack) return o.dealsDamage ? "attack" : "";
  return "";
}

/** Should the sound start now: switched on, page visible, not already playing, fewer than 3 at once. */
export const mayPlay = ({ on, hidden, playing, name }) =>
  !!on && !hidden && SOUNDS.includes(name) && !playing.has(name) && playing.size < MAX_AT_ONCE;

let on = storage.get(KEY) === "1";
export const sfxOn = () => on;

let picks = readPicks(storage.get(PICK_KEY));
/** The variant a category plays now (the player's pick, or the default). */
export const pickOf = (cat) => variantFor(cat, picks);
/** Pick a variant of a category. Returns false when the device could not remember it (works until a refresh). */
export function setPick(cat, variant) {
  if (!catOf(cat)?.variants.some((v) => v.id === variant)) return true;
  picks = { ...picks, [cat]: variant };
  return storage.set(PICK_KEY, JSON.stringify(picks));
}

let ctx = null;
const buffers = new Map(); // variant -> AudioBuffer, or null when the file is missing
const playing = new Set();
const live = new Map(); // name -> stop(), for sounds that are playing right now

/** Silence everything at once (0.40.2): switching sound off stops what is playing, not just what comes next. */
export function stopAll() {
  for (const stop of [...live.values()]) { try { stop(); } catch { /* already stopped */ } }
  live.clear();
  playing.clear();
  stopSong();
}

/** Switch on or off (from a tap: that tap also unlocks sound on iPhone). Returns false when the device could not remember it. */
export function setSfx(next) {
  on = !!next;
  if (on) unlock(); else stopAll();
  return storage.set(KEY, on ? "1" : "0");
}

function unlock() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    // A moment of silence started inside the tap: iPhone lets the page play sounds from now on.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch { ctx = null; }
}

async function load(variant) {
  if (buffers.has(variant)) return buffers.get(variant);
  let buf = null;
  try {
    const res = await fetch(sfxFile(variant));
    if (res.ok) buf = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch { buf = null; }
  buffers.set(variant, buf);
  return buf;
}

/** Play a sound by name (from SOUNDS). Silent when off, hidden, already playing, or the file is missing. */
export async function play(name) {
  if (!mayPlay({ on, hidden: typeof document !== "undefined" && document.hidden, playing, name })) return;
  playing.add(name);
  const done = () => { playing.delete(name); live.delete(name); };
  try {
    if (!ctx) unlock();
    if (ctx) {
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      const buf = await load(pickOf(name));
      if (!buf || !on) return done(); // switched off while the file was loading
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = done;
      live.set(name, () => src.stop());
      src.start(0);
    } else {
      // Older browsers without Web Audio.
      const a = new Audio(sfxFile(pickOf(name)));
      a.onended = a.onerror = done;
      live.set(name, () => { a.pause(); done(); });
      await a.play().catch(done);
      if (!on) a.pause(); // switched off while it was starting
    }
  } catch { done(); }
}

/** Listen to a variant in Settings (from a tap, which also unlocks sound on iPhone). Plays even with effects
 * switched off — otherwise nobody could choose — and a new tap starts it again at once, without the overlap rule. */
export async function preview(variant) {
  live.get("preview")?.();
  let stopped = false;
  const done = () => { if (live.get("preview") === stop) live.delete("preview"); };
  let halt = () => {};
  const stop = () => { stopped = true; try { halt(); } catch { /* already stopped */ } done(); };
  live.set("preview", stop);
  try {
    unlock();
    if (ctx) {
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      const buf = await load(variant);
      if (!buf || stopped) return done();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = done;
      halt = () => src.stop();
      src.start(0);
    } else {
      const a = new Audio(sfxFile(variant));
      a.onended = a.onerror = done;
      halt = () => a.pause();
      await a.play().catch(done);
    }
  } catch { done(); }
}

// Easter egg (0.40.1): a song for reading the change history. Big file, so not in SHELL: it streams only when played.
export const SONG = "./assets/audio/sfx/news-song.mp3";
let song = null;
/** Start the song (from the tap on "See earlier changes", only with sound effects on). Missing file = silence. */
export function playSong() {
  if (!on || (song && !song.paused)) return;
  try {
    song = song || new Audio(SONG);
    song.loop = true;
    song.play().catch(() => {});
  } catch { song = null; }
}
export const songOn = () => !!song && !song.paused;
export function stopSong() { try { song?.pause(); } catch { /* nothing to stop */ } }

/** For the sheet: start a sound when a planner pick makes one. */
export const playFor = (o) => { const s = soundFor(o); if (s) play(s); };
