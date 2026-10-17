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

/** Replace an element's children, skipping null/false like h() does (plain replaceChildren would print "null"). */
export const fill = (el, kids) => el.replaceChildren(...[].concat(kids ?? []).filter((k) => k != null && k !== false));

export const $ = (s, el) => (el || document).querySelector(s);

let toastTimer;
/** Short message at the bottom. Optional action ({ label, run }) adds a button, e.g. "Undo"; it works once and stays a bit longer. */
export function toast(msg, action) {
  let el = $("#toast");
  if (!el) { el = h("div", { id: "toast", cls: "toast", role: "status" }); document.body.appendChild(el); }
  const hide = () => (el.hidden = true);
  el.replaceChildren(msg, ...(action ? [" · ", h("button", { type: "button", cls: "toastbtn", text: action.label, onclick: () => { hide(); action.run(); } })] : []));
  el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(hide, action ? 6000 : 3800);
}
