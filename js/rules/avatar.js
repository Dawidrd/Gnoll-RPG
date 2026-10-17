// Character portrait (0.37): a small square picture the player picks and frames, kept inside the character.
// Pure math for the framing tool and the check of a stored picture; drawing and files are in js/views/avatar.js.

/** Side of the stored square picture, in pixels. */
export const AVATAR_SIDE = 256;
/** Longest stored picture (base64 text). A 256×256 JPEG is usually 15–40 thousand characters. Same limit in firestore.rules. */
export const AVATAR_MAX = 70000;
/** How far the framing tool zooms in (1 = the whole shorter side fits the square). */
export const ZOOM_MAX = 4;

const PATTERN = /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/]+={0,2}$/;
/** A stored picture: only a small JPEG/WebP/PNG written as base64 text, nothing else (no links to other sites). */
export const validAvatar = (s) => typeof s === "string" && s.length <= AVATAR_MAX && PATTERN.test(s);

/**
 * The framing tool shows the photo inside a square of side `view`. At zoom 1 the photo's shorter side fills the square.
 * Returns the photo's scale on screen.
 */
export const coverScale = (w, h, view, zoom = 1) => (view / Math.min(w, h)) * Math.min(ZOOM_MAX, Math.max(1, zoom));

/** Keep the photo covering the whole square: x, y = where its top-left corner is on screen (0 or less). */
export function clampPan(w, h, view, scale, x, y) {
  const lim = (v, size) => Math.min(0, Math.max(view - size * scale, v));
  return { x: lim(x, w), y: lim(y, h) };
}

/** Centre the photo in the square. */
export const centerPan = (w, h, view, scale) => ({ x: (view - w * scale) / 2, y: (view - h * scale) / 2 });

/** Zoom around the middle of the square, keeping the same spot of the photo in the centre. */
export function zoomPan(w, h, view, from, to, x, y) {
  const c = view / 2, k = to / from;
  return clampPan(w, h, view, to, c - (c - x) * k, c - (c - y) * k);
}

/** The part of the photo (in the photo's own pixels) that is inside the square. */
export function sourceRect(w, h, view, scale, x, y) {
  const p = clampPan(w, h, view, scale, x, y);
  const side = Math.min(view / scale, w, h);
  const at = (v, size) => Math.min(size - side, Math.max(0, -v / scale));
  return { sx: at(p.x, w), sy: at(p.y, h), side };
}
