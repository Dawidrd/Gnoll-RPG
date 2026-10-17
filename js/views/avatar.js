// Character portrait (0.37): the small round picture on lists and the sheet, and the tool to pick and frame it.
// The photo never leaves the device as it is: only the framed 256×256 square is kept, inside the character (rules/avatar.js).
import { h, fill, toast } from "../dom.js";
import { t } from "../i18n.js";
import { AVATAR_SIDE, ZOOM_MAX, keeper, validAvatar, coverScale, clampPan, centerPan, zoomPan, sourceRect } from "../rules/avatar.js";

const VIEW = 240; // side of the framing square on screen, CSS pixels (same as .avcrop in app.css)
const FILE_MAX = 40 * 1024 * 1024; // bigger files are not photos from a phone

/** The portrait, or the first letter of the name in a circle when there is none. size: "sm" | "md" | "lg". */
export function avatarPic(src, name, size = "md") {
  const cls = "avatar " + size;
  if (validAvatar(src)) return h("img", { cls, src, alt: t("av.alt", { name: name || "?" }), loading: "lazy", decoding: "async" });
  const letter = (String(name || "").trim().match(/\p{L}|\p{N}/u) || ["?"])[0].toUpperCase();
  return h("span", { cls: cls + " none", "aria-hidden": "true", text: letter });
}

/** avatarPic for lists redrawn from the cloud: the same element while the member's picture and name stay the same. */
export function keptPics() {
  const k = keeper();
  return (key, src, name, size = "md") => k.get(key, [size, name || "", src || ""].join("|"), () => avatarPic(src, name, size));
}

/** The framed square as a small JPEG; lower quality until it fits the limit. Two steps for big photos (smoother result). */
function encode(img, r) {
  let src = img, sx = r.sx, sy = r.sy, side = r.side;
  if (side > AVATAR_SIDE * 4) {
    const mid = document.createElement("canvas");
    mid.width = mid.height = AVATAR_SIDE * 4;
    const m = mid.getContext("2d");
    m.imageSmoothingQuality = "high";
    m.drawImage(img, sx, sy, side, side, 0, 0, mid.width, mid.height);
    src = mid; sx = 0; sy = 0; side = mid.width;
  }
  const out = document.createElement("canvas");
  out.width = out.height = AVATAR_SIDE;
  const g = out.getContext("2d");
  g.fillStyle = "#201a23"; // transparent parts of a PNG would turn black in a JPEG
  g.fillRect(0, 0, AVATAR_SIDE, AVATAR_SIDE);
  g.imageSmoothingQuality = "high";
  g.drawImage(src, sx, sy, side, side, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
  for (const q of [0.85, 0.75, 0.65, 0.5, 0.35]) {
    const url = out.toDataURL("image/jpeg", q);
    if (validAvatar(url)) return url;
  }
  return "";
}

/** Framing: drag (finger or mouse) to move, slider / pinch / wheel / + − to zoom. done(url) or done(null) on cancel. */
function cropper(img, done) {
  const w = img.naturalWidth, hgt = img.naturalHeight;
  let zoom = 1, scale = coverScale(w, hgt, VIEW, 1), pos = centerPan(w, hgt, VIEW, scale);
  const pic = h("img", { src: img.src, alt: "", draggable: "false" });
  const place = () => {
    pos = clampPan(w, hgt, VIEW, scale, pos.x, pos.y);
    pic.style.width = `${w * scale}px`;
    pic.style.height = `${hgt * scale}px`;
    pic.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  };
  const setZoom = (z) => {
    z = Math.min(ZOOM_MAX, Math.max(1, z));
    const next = coverScale(w, hgt, VIEW, z);
    pos = zoomPan(w, hgt, VIEW, scale, next, pos.x, pos.y);
    zoom = z; scale = next; slider.value = String(z); place();
  };
  const slider = h("input", { type: "range", id: "av-zoom", min: 1, max: ZOOM_MAX, step: 0.01, value: 1, "aria-label": t("av.zoom"),
    oninput: (e) => setZoom(+e.target.value) });

  // Pointers on the square: one moves the photo, two pinch to zoom.
  const pts = new Map();
  let pinch = null;
  const spread = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  const stage = h("div", { cls: "avcrop", id: "av-stage", tabindex: "0", role: "group", "aria-label": t("av.stage"),
    onpointerdown: (e) => { stage.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) pinch = { d: spread(), z: zoom }; },
    onpointermove: (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) { pos = { x: pos.x + e.clientX - p.x, y: pos.y + e.clientY - p.y }; place(); }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch) setZoom(pinch.z * (spread() / pinch.d));
    },
    onpointerup: (e) => { pts.delete(e.pointerId); pinch = null; },
    onpointercancel: (e) => { pts.delete(e.pointerId); pinch = null; },
    onwheel: (e) => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); },
    onkeydown: (e) => {
      const step = 12, move = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
      if (move) { e.preventDefault(); pos = { x: pos.x + move[0], y: pos.y + move[1] }; place(); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(zoom * 1.15); }
      else if (e.key === "-") { e.preventDefault(); setZoom(zoom / 1.15); }
    },
  }, [pic, h("span", { cls: "avring", "aria-hidden": "true" })]);
  place();

  const box = h("div", { cls: "avedit card", id: "av-crop" }, [
    h("p", { cls: "hint", text: t("av.cropHint") }),
    stage,
    h("label", { cls: "avzoom" }, [h("span", { cls: "small", text: "−" }), slider, h("span", { cls: "small", text: "+" })]),
    h("div", { cls: "row" }, [
      h("button", { type: "button", cls: "btn gold", id: "av-use", text: t("av.use"), onclick: () => {
        const url = encode(img, sourceRect(w, hgt, VIEW, scale, pos.x, pos.y));
        if (!url) return toast(t("av.tooBig"));
        done(url);
      } }),
      h("button", { type: "button", cls: "btn ghost", id: "av-cancel", text: t("av.cancel"), onclick: () => done(null) }),
    ]),
  ]);
  setTimeout(() => stage.focus({ preventScroll: true }), 0);
  return box;
}

/**
 * Pick, frame, change or remove the portrait. get(): the current picture; set(url or ""): store it (the caller saves).
 * The whole box redraws itself; the caller redraws only after set().
 */
export function avatarEditor({ get, set, name }) {
  const root = h("div", { cls: "avbox", id: "avatar-edit" });
  const file = h("input", { type: "file", accept: "image/*", id: "av-file", hidden: true, onchange: (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if ((f.type && !f.type.startsWith("image/")) || f.size > FILE_MAX) return toast(t("av.bad"));
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) { URL.revokeObjectURL(url); return toast(t("av.bad")); }
      draw(cropper(img, (out) => { URL.revokeObjectURL(url); if (out) set(out); draw(); }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(t("av.bad")); };
    img.src = url;
  } });
  const confirm = h("div", { cls: "confirm" });
  function draw(crop) {
    const has = validAvatar(get());
    confirm.classList.remove("open");
    fill(root, [
      h("div", { cls: "avrow" }, [
        avatarPic(get(), name(), "lg"),
        h("div", { cls: "stack" }, [
          h("div", { cls: "row" }, [
            h("button", { type: "button", cls: "btn", id: "av-pick", text: t(has ? "av.change" : "av.add"), onclick: () => file.click() }),
            has ? h("button", { type: "button", cls: "btn ghost", id: "av-remove", text: t("av.remove"), onclick: () => {
              confirm.replaceChildren(h("span", { cls: "small", text: t("av.removeAsk") }),
                h("button", { type: "button", cls: "btn gold", id: "av-remove-yes", text: t("sheet.yes"), onclick: () => { set(""); draw(); } }),
                h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => confirm.classList.remove("open") }));
              confirm.classList.add("open");
            } }) : null,
          ]),
          confirm,
          h("p", { cls: "hint", text: t("av.hint") }),
        ]),
      ]),
      crop || null,
      file,
    ]);
    crop?.scrollIntoView?.({ block: "nearest" });
  }
  draw();
  return root;
}
