// Tiny DOM helper: h("div", {cls: "card", onclick: fn}, [children])
export function h(tag, attrs, kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === false || v == null) continue;
    if (k === "text") e.textContent = v;
    else if (k === "cls") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "value") e.value = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of [].concat(kids ?? [])) {
    if (c == null || c === false) continue;
    e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return e;
}

export const $ = (s, el) => (el || document).querySelector(s);

let toastTimer;
export function toast(msg) {
  let el = $("#toast");
  if (!el) { el = h("div", { id: "toast", cls: "toast", role: "status" }); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 3800);
}
