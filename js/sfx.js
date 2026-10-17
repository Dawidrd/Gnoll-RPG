// Sound effects (0.40): short clicks of sound for moments of play, off by default, switched on the sheet's header.
// The choice stays on this device only (localStorage), shared by all characters. Rules stay silent; screens call play().
// Files are added by hand to assets/audio/sfx/; a missing file just means no sound.
import { storage } from "./store.js";

const KEY = "gnoll.sfx";
/** Every sound the app knows. Offensive spells have their own sound, named after the spell. */
export const SOUNDS = ["attack", "rage", "down", "eldritch-blast"];
/** Offensive spells with a sound; more can be added with their files. */
const SPELL_SOUNDS = ["eldritch-blast"];
export const sfxFile = (name) => `./assets/audio/sfx/${name}.mp3`;
const MAX_AT_ONCE = 3;

/** Which sound a pick in the turn planner makes (or ""): a spell's own sound, Rage, or an attack. */
export function soundFor(o) {
  if (!o) return "";
  if (o.spell) return SPELL_SOUNDS.includes(o.spell) ? o.spell : ""; // other spells are quiet for now, even attack spells
  if (o.set?.rage) return "rage";
  if (o.attack) return "attack";
  return "";
}

/** Should the sound start now: switched on, page visible, not already playing, fewer than 3 at once. */
export const mayPlay = ({ on, hidden, playing, name }) =>
  !!on && !hidden && SOUNDS.includes(name) && !playing.has(name) && playing.size < MAX_AT_ONCE;

let on = storage.get(KEY) === "1";
export const sfxOn = () => on;

let ctx = null;
const buffers = new Map(); // name -> AudioBuffer, or null when the file is missing
const playing = new Set();

/** Switch on or off (from a tap: that tap also unlocks sound on iPhone). Returns false when the device could not remember it. */
export function setSfx(next) {
  on = !!next;
  if (on) unlock();
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

async function load(name) {
  if (buffers.has(name)) return buffers.get(name);
  let buf = null;
  try {
    const res = await fetch(sfxFile(name));
    if (res.ok) buf = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch { buf = null; }
  buffers.set(name, buf);
  return buf;
}

/** Play a sound by name (from SOUNDS). Silent when off, hidden, already playing, or the file is missing. */
export async function play(name) {
  if (!mayPlay({ on, hidden: typeof document !== "undefined" && document.hidden, playing, name })) return;
  playing.add(name);
  const done = () => playing.delete(name);
  try {
    if (!ctx) unlock();
    if (ctx) {
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      const buf = await load(name);
      if (!buf) return done();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = done;
      src.start(0);
    } else {
      // Older browsers without Web Audio.
      const a = new Audio(sfxFile(name));
      a.onended = a.onerror = done;
      await a.play().catch(done);
    }
  } catch { done(); }
}

/** For the sheet: start a sound when a planner pick makes one. */
export const playFor = (o) => { const s = soundFor(o); if (s) play(s); };
