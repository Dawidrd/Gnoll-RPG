// Party screens: the Party tab on a character sheet (partyTab), my parties and founding one (#/party),
// one party on its own (#/party/<id>, e.g. for a Game Master without a character), joining by invite link (#/join/<code>[/<characterId>]).
// One character = one party: characters already in another party cannot be picked.
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { loadAll, getById, storage } from "../store.js";
import { CLASSES, SPECIES } from "../rules/index.js";
import { ABILITIES, ABILITY_NAMES, SKILLS, signed } from "../rules/core.js";
import { account, onAccount, accountAvailable } from "../sync/cloud.js";
import { accountBox } from "./account.js";
import { inviteLink, validCode, codeFrom, canManage, canLeave, sortMembers, cleanName, NAME_MAX, CAMPAIGN_MAX,
  sessionWhen, marchOrder, marchRows, moveIn,
  GM_GROUPS, gmGroups, busyChars, paperState, paperValues, mayDropChar, gmTodoItems } from "../sync/partylogic.js";
import { msg } from "./msg.js";
import * as PARTY from "../sync/party.js";
import { confirmer, painter } from "./live.js";
import { drawBoard, bringPartyNotes } from "./notes.js";
import { countEvent } from "../stats.js";
import { avatarPic } from "./avatar.js";

const fail = () => toast(t("party.err.save"));
const chLabel = (ch) => `${ch.name} — ${CLASSES[ch.classId] ? tr(CLASSES[ch.classId].name).split(" (")[0] : ch.classId} ${ch.level}`;

/** Character picker from the signed-in account's characters. `none`: label of a "no character" choice; `busy`: ids playing elsewhere. */
function charSelect(id, none, busy = new Set()) {
  const sel = h("select", { id });
  fillChars(sel, none, busy);
  return sel;
}
function fillChars(sel, none, busy) {
  const was = sel.value;
  const list = loadAll().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  sel.replaceChildren(...[none ? h("option", { value: "", text: none }) : null,
    ...list.map((ch) => h("option", { value: ch.id, disabled: busy.has(ch.id), text: chLabel(ch) + (busy.has(ch.id) ? " " + t("party.busy") : "") }))].filter(Boolean));
  if ([...sel.options].some((o) => o.value === was && !o.disabled)) sel.value = was;
  else { const free = [...sel.options].find((o) => !o.disabled); sel.value = free ? free.value : ""; }
}
const pickedChar = (sel) => loadAll().find((c) => c.id === sel.value) || null;

/** In-page yes/no question (native confirm() is blocked in some app views). */
/**
 * Shared frame: without an account the screen explains why one is needed and offers signing in.
 * draw(panel) runs once the account is ready; the screen redraws when the account changes.
 */
function frame(root, title, draw) {
  const panel = h("section", { cls: "panel" });
  root.replaceChildren(panel);
  const head = () => h("header", { cls: "stack" }, [h("a", { cls: "hint", href: "#/", text: t("party.back") }), h("h2", { text: title })]);
  gate(panel, head, draw);
}
/** The account part of frame(), also used by the Party tab (head = null: no header). */
function gate(panel, head, draw) {
  const top = () => (head ? [head()] : []);
  const render = () => {
    const s = account();
    if (!accountAvailable()) return panel.replaceChildren(...top(), h("p", { cls: "lead", text: t("party.unavailable") }));
    if (s.status !== "in") return panel.replaceChildren(...top(), h("p", { cls: "lead", text: t("party.needAccount") }), accountBox());
    panel.replaceChildren(...top());
    draw(panel);
  };
  let was = account().status;
  const off = onAccount((s) => {
    if (!panel.isConnected) return off();
    const changed = (s.status === "in") !== (was === "in");
    was = s.status;
    if (changed) { PARTY.stopWatching(); render(); }
  });
  render();
}

// --- #/party: my parties, found a new one, paste an invite link ---
export function renderParties(root, go) {
  frame(root, t("party.title"), (panel) => {
    const { box, ask } = confirmer();
    const list = h("div", { cls: "ccards", id: "party-list" }, [h("p", { cls: "small", text: t("party.loading") })]);
    const charIn = charSelect("party-char", t("party.noChar"));
    PARTY.watchMyParties((parties) => {
      if (!parties) return list.replaceChildren(h("p", { cls: "small", text: t("party.err.load") }));
      fillChars(charIn, t("party.noChar"), busyChars(parties));
      if (!parties.length) return list.replaceChildren(h("p", { cls: "small", text: t("party.none") }));
      list.replaceChildren(...parties.map((tm) => {
        const actions = [];
        // A player opens the party on their character's sheet; without a character here (e.g. the GM) on its own screen.
        if (tm.status === "in") actions.push(h("a", { cls: "btn gold", href: tm.charId && getById(tm.charId) ? `#/c/${tm.charId}/party` : `#/party/${tm.id}`, text: t("home.open") }));
        if (tm.status === "asked") actions.push(h("button", { type: "button", cls: "btn ghost", text: t("party.cancelAsk"),
          onclick: () => ask(t("party.cancelAskConfirm", { name: tm.name }), () => PARTY.leave(tm.id, { request: true }).catch(fail)) }));
        if (tm.status === "rejected" || tm.status === "removed") actions.push(h("button", { type: "button", cls: "btn ghost", text: t("party.forget"),
          onclick: () => PARTY.leave(tm.id).catch(fail) }));
        return h("article", { cls: "ccard" }, [
          h("span", { cls: "ccard-name", text: tm.name }),
          h("span", { cls: "ccard-meta", text: t("party.status." + tm.status) + (tm.charId && getById(tm.charId) ? " · " + getById(tm.charId).name : "") }),
          actions.length ? h("div", { cls: "row" }, actions) : null,
        ]);
      }));
    });

    const nameIn = h("input", { id: "party-name", maxlength: NAME_MAX, placeholder: t("party.namePh") });
    const create = () => {
      const name = cleanName(nameIn.value);
      if (!name) { nameIn.focus(); return toast(t("party.nameNeeded")); }
      const ch = pickedChar(charIn);
      const { id, done } = PARTY.createParty(name, ch);
      countEvent("party/create");
      done.catch(fail);
      go(ch ? `#/c/${ch.id}/party` : `#/party/${id}`);
    };
    const linkIn = h("input", { id: "join-link", placeholder: t("party.joinPh") });
    const join = () => {
      const code = codeFrom(linkIn.value);
      if (!code) return toast(t("party.join.bad"));
      go(`#/join/${code}`);
    };

    panel.append(
      h("p", { cls: "small", text: t("party.intro") }),
      list, box,
      h("section", { cls: "card" }, [h("h3", { text: t("party.new") }), h("p", { cls: "small", text: t("party.newHint") }),
        h("div", { cls: "row" }, [h("label", { cls: "wide" }, [t("party.name"), nameIn]), h("label", { cls: "wide" }, [t("party.char"), charIn])]),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "party-create", text: t("party.create"), onclick: create })])]),
      h("section", { cls: "card" }, [h("h3", { text: t("party.joinTitle") }), h("p", { cls: "small", text: t("party.joinHint") }),
        h("div", { cls: "row" }, [h("label", { cls: "wide" }, [t("party.joinLink"), linkIn])]),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn", id: "join-go", text: t("party.joinGo"), onclick: join })])]),
    );
  });
}

// --- #/party/<id>: overview (info, characters, marching order), notes, managing the party ---
const short = (o) => (o ? tr(o.name).split(" (")[0] : "");
const GM_PICK = "gnoll.gmview"; // the GM's choice of groups, on this device
/** Column name in the GM view. */
function gmLabel({ g, k }) {
  if (g === "saves") return t("party.gm.save", { a: ABILITY_NAMES[k].short[lang()] });
  if (g === "skills") { const sk = SKILLS.find((x) => x.id === k); return sk ? sk[lang()] || sk.en : k; }
  return t("party.gm.k." + k);
}
/** "Scores from paper": not confirmed yet, or confirmed by a GM (by name). */
function paperBadge(m) {
  const p = paperState(m);
  if (!p.state) return null;
  return h("span", { cls: "paperbadge" + (p.state === "ok" ? " ok" : ""), text: p.state === "ok" ? t("paper.badgeOk", { name: p.by || t("party.role.gm") }) : t("paper.badgeOpen") });
}
/** "Krasnolud · Wojownik (Champion) 3" from the summary the member shared. */
function sheetLine(s) {
  const cls = CLASSES[s.cls];
  const sub = short(cls?.subclasses?.[s.sub]);
  return [short(SPECIES[s.species]) || s.species, `${short(cls) || s.cls}${sub ? ` (${sub})` : ""} ${s.level || ""}`.trim()].filter(Boolean).join(" · ");
}
const when = (d) => d.toLocaleString(lang(), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export function renderParty(root, go, id) {
  frame(root, t("party.title"), (panel) => partyBody(panel, go, id, "#/party"));
}

/**
 * One party inside `panel`: overview (info, characters, GM view, marching order), notes, managing.
 * home: where to go after leaving or deleting it. sheetCh: the character whose sheet shows this (its Party tab);
 * there the notes are on the sheet's Notes tab instead. Returns a function that stops its listeners.
 */
function partyBody(panel, go, id, home, sheetCh = null) {
  const onSheet = !!sheetCh;
  const { box, ask } = confirmer();
  const paint = painter();
  // What the user is doing here; kept across redraws.
  const ui = { tab: "overview", editInfo: null, notes: { show: "all", text: "", shared: false, editing: null }, march: null };
  const body = h("div", { cls: "stack" }, [h("p", { cls: "small", text: t("party.loading") })]);
  const tabs = h("div", { cls: "seg party-tabs", role: "tablist" });
  const sec = { info: h("div"), members: h("div"), gm: h("div"), march: h("div"), notes: h("div"), manage: h("div", { cls: "stack" }) };
  let v = null, built = false;
  let busy = new Set(); // my characters playing in other parties
  PARTY.myPartyChars(id).then((b) => { busy = b; if (v) paint(sec.members, drawMembers); });
  panel.append(body, box);

  const btn = (text, onclick, cls = "btn small", attrs = {}) => h("button", { type: "button", cls, text, onclick, ...attrs });
  const leaveBtn = (idAttr) => btn(t("party.leave"), () => ask(t("party.leaveConfirm", { name: v.party.name }),
    () => { PARTY.leave(id, { member: true }).catch(fail); go(home); }), "btn ghost", idAttr ? { id: idAttr } : {});

  // --- info: name, campaign, next session ---
  const drawInfo = () => {
    const admin = v.me.role === "admin";
    const e = ui.editInfo;
    if (e) {
      const field = (key, el) => { el.addEventListener("input", () => (e[key] = el.value)); return el; };
      return [h("section", { cls: "card key", id: "party-info" }, [
        h("h3", { text: t("party.info.edit") }),
        h("label", { cls: "wide" }, [t("party.name"), field("name", h("input", { id: "info-name", maxlength: NAME_MAX, value: e.name }))]),
        h("label", { cls: "wide" }, [t("party.info.campaign"), field("campaign", h("input", { id: "info-campaign", maxlength: CAMPAIGN_MAX, value: e.campaign, placeholder: t("party.info.campaignPh") }))]),
        h("label", { cls: "wide" }, [t("party.info.next"), field("next", h("input", { id: "info-next", type: "datetime-local", value: e.next }))]),
        h("div", { cls: "row" }, [
          btn(t("party.save"), () => {
            if (!cleanName(e.name)) return toast(t("party.nameNeeded"));
            PARTY.saveInfo(v.party, e).catch(fail);
            ui.editInfo = null; redraw(true);
          }, "btn gold", { id: "info-save" }),
          btn(t("party.info.clearNext"), () => { e.next = ""; redraw(true); }, "btn ghost"),
          btn(t("party.cancel"), () => { ui.editInfo = null; redraw(true); }, "btn ghost"),
        ]),
      ])];
    }
    const next = sessionWhen(v.party.next);
    return [h("section", { cls: "card party-head", id: "party-info" }, [
      h("h3", { cls: "party-name", text: v.party.name }),
      v.party.campaign ? h("p", { cls: "lead", text: t("party.info.campaignIs", { name: v.party.campaign }) }) : null,
      h("p", { cls: next && !next.past ? "party-next" : "small" }, next
        ? [h("b", { text: t("party.info.nextIs") + " " }), when(next.date), next.past ? " " + t("party.info.past") : ""]
        : t(admin ? "party.info.noNextAdmin" : "party.info.noNext")),
      h("p", { cls: "small", text: t(admin ? "party.youAdmin" : "party.youPlayer") }),
      v.me.gm ? h("p", { cls: "small", text: t("party.youGm") }) : null,
      admin ? h("div", { cls: "row" }, [btn(t("party.info.editBtn"), () => {
        ui.editInfo = { name: v.party.name, campaign: v.party.campaign || "", next: v.party.next || "" }; redraw(true);
      }, "btn small", { id: "info-edit" })]) : null,
    ])];
  };

  // --- members with what they share of their characters ---
  const drawMembers = () => {
    const owner = v.party.owner;
    const card = (m) => {
      const may = canManage(v.me, m, owner);
      const role = (m.uid === owner ? t("party.role.owner") : t("party.role." + m.role)) + (m.gm ? ", " + t("party.role.gm") : "");
      const s = m.charId ? m.sheet : null;
      const pct = s?.hpMax ? Math.min(100, (s.hp / s.hpMax) * 100) : 0;
      const buttons = [
        may.promote ? btn(t("party.promote"), () => PARTY.setRole(id, m.uid, "admin").catch(fail)) : null,
        may.demote ? btn(t("party.demote"), () => PARTY.setRole(id, m.uid, "player").catch(fail)) : null,
        may.gm ? btn(t(m.gm ? "party.gmTake" : "party.gmGive"), () => PARTY.setGm(id, m.uid, !m.gm).catch(fail), "btn small ghost") : null,
        may.remove ? btn(t("party.remove"), () => ask(t("party.removeConfirm", { name: m.name || "?" }), () => PARTY.removeMember(id, m.uid).catch(fail)), "btn small ghost") : null,
      ].filter(Boolean);
      return h("article", { cls: "ccard member" }, [
        h("div", { cls: "withpic" }, [
          m.charId ? avatarPic(m.avatar, m.charName, "sm") : null,
          h("span", { cls: "ccard-text" }, [
            h("span", { cls: "ccard-name", text: m.charName || t("party.noCharShort") }),
            s ? h("span", { cls: "ccard-meta", text: sheetLine(s) }) : m.charId ? h("span", { cls: "hint", text: t("party.sheet.none") }) : null,
          ]),
        ]),
        paperBadge(m),
        s ? h("div", { cls: "member-vit" }, [
          h("div", { cls: "vit hp" }, [h("span", { cls: "k", text: "HP" }), h("span", { cls: "v", text: `${s.hp}/${s.hpMax}` }),
            s.temp ? h("span", { cls: "v small", text: "+" + s.temp }) : null]),
          h("div", { cls: "vit" }, [h("span", { cls: "k", text: "AC" }), h("span", { cls: "v", text: s.ac })]),
          h("div", { cls: "bar", "aria-hidden": "true" }, [h("i", { style: `width:${pct}%` })]),
        ]) : null,
        h("span", { cls: "ccard-meta", text: `${m.name || "?"}${m.uid === v.uid ? " " + t("party.you") : ""} · ${role}` }),
        buttons.length ? h("div", { cls: "row" }, buttons) : null,
      ]);
    };
    // My character in this party: switch to another one, or none (e.g. as the GM) — only for admins and GMs.
    // A player on their character's sheet gets "Leave the party" instead (switching there would drop them out of the tab).
    let mine = null;
    if (onSheet && !mayDropChar(v.me)) {
      mine = canLeave(v.uid, v.party.owner) ? h("div", { cls: "row" }, [leaveBtn()]) : null;
    } else {
      const sel = charSelect("party-mychar", mayDropChar(v.me) ? t("party.noChar") : null, busy);
      sel.value = loadAll().some((c) => c.id === v.me.charId) ? v.me.charId : "";
      sel.addEventListener("change", () => PARTY.setMyChar(id, pickedChar(sel)).then(() => toast(t("party.mychar.done"))).catch(fail));
      mine = h("label", { cls: "wide" }, [t("party.mychar"), sel]);
    }
    return [h("section", { cls: "card" }, [
      h("h3", { text: t("party.members", { n: v.members.length }) }),
      h("p", { cls: "hint", text: t("party.sheet.hint") }),
      h("div", { cls: "ccards", id: "party-members" }, sortMembers(v.members).map(card)),
      mine,
    ])];
  };

  // --- the GM view: what GMs need for decisions and secret rolls; the GM picks the groups (kept on this device) ---
  const drawGm = () => {
    if (!v.me.gm) return [];
    let groups;
    try { groups = gmGroups(JSON.parse(storage.get(GM_PICK) || "null")); } catch { groups = gmGroups(null); }
    const toggle = (g) => {
      const next = groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g];
      storage.set(GM_PICK, JSON.stringify(Object.keys(GM_GROUPS).filter((k) => next.includes(k))));
      paint(sec.gm, drawGm, true);
    };
    const cols = Object.keys(GM_GROUPS).filter((g) => groups.includes(g)).flatMap((g) => GM_GROUPS[g].map((k) => ({ g, k })));
    const playing = sortMembers(v.members).filter((m) => m.charId);
    const cell = ({ g, k }, val) => (val == null ? "—" : g === "saves" || g === "skills" || k === "init" ? signed(val) : k === "dc" && !val ? "—" : String(val));
    const table = playing.length && cols.length ? h("div", { cls: "tw" }, [h("table", { cls: "gm-table", id: "gm-table" }, [
      h("thead", {}, [h("tr", {}, [h("th", { text: t("party.gm.char") }), ...cols.map((c) => h("th", { text: gmLabel(c) }))])]),
      h("tbody", {}, playing.map((m) => h("tr", {}, [h("th", { text: m.charName || m.name || "?" }), ...cols.map((c) => h("td", { text: cell(c, v.gm[m.uid]?.[c.k]) }))]))),
    ])]) : h("p", { cls: "small", text: t(playing.length ? "party.gm.pick" : "party.gm.empty") });
    // Scores rolled on paper: the GM checks the values and confirms them (or takes the confirmation back).
    const paperRows = playing.filter((m) => paperState(m).state).map((m) => {
      const p = paperState(m), vals = paperValues(v.gm[m.uid]?.paper);
      return h("div", { cls: "li" }, [
        h("div", {}, [h("div", { cls: "t", text: m.charName || m.name || "?" }),
          h("div", { cls: "n", text: vals ? ABILITIES.map((a) => `${ABILITY_NAMES[a].short[lang()]} ${vals[a]}`).join(" · ") : t("party.paper.noValues") }),
          paperBadge(m)]),
        p.state === "ok" ? btn(t("party.paper.undo"), () => PARTY.confirmPaper(id, m, false).catch(fail), "btn small ghost")
          : btn(t("party.paper.confirm"), () => PARTY.confirmPaper(id, m, true).catch(fail), "btn small gold", { disabled: !vals }),
      ]);
    });
    // Gaps a player saved as agreed with the GM (0.38): what is still missing on their sheet.
    const todoRows = playing.map((m) => [m, gmTodoItems(v.gm[m.uid]?.todo)]).filter(([, items]) => items.length).map(([m, items]) =>
      h("div", { cls: "li" }, [h("div", {}, [h("div", { cls: "t", text: `${m.charName || m.name || "?"} (${items.length})` }),
        h("ul", { cls: "gm-todo" }, items.map((x) => h("li", { text: msg(x) })))])]));
    return [h("section", { cls: "card key", id: "party-gm" }, [
      h("h3", { text: t("party.gm.title") }),
      h("p", { cls: "hint", text: t("party.gm.hint") }),
      h("div", { cls: "seg small", role: "group", "aria-label": t("party.gm.groups") }, Object.keys(GM_GROUPS).map((g) =>
        h("button", { type: "button", "aria-pressed": groups.includes(g) ? "true" : "false", text: t("party.gm.group." + g), onclick: () => toggle(g) }))),
      table,
      paperRows.length ? h("div", { cls: "stack", id: "gm-paper" }, [h("h4", { text: t("party.paper.title") }),
        h("p", { cls: "hint", text: t("party.paper.hint") }), h("div", { cls: "list" }, paperRows)]) : null,
      todoRows.length ? h("div", { cls: "stack", id: "gm-todo" }, [h("h4", { text: t("party.gm.todoTitle") }),
        h("p", { cls: "hint", text: t("party.gm.todoHint") }), h("div", { cls: "list" }, todoRows)]) : null,
    ])];
  };

  // --- marching order: everyone sees it; admins set it ---
  const drawMarch = () => {
    const admin = v.me.role === "admin";
    const saved = v.party.march || { mode: "5", order: [] };
    const m = ui.march || { mode: saved.mode, order: marchOrder(saved.order, v.members) };
    const byUid = new Map(v.members.map((x) => [x.uid, x]));
    const who = (u) => byUid.get(u)?.charName || byUid.get(u)?.name || "?";
    const rows = marchRows(m.order, m.mode);
    const diagram = rows.length
      ? h("ol", { cls: "march" + (m.mode === "10" ? " two" : ""), id: "party-march" }, rows.map((r, i) =>
        h("li", {}, [h("span", { cls: "hint", text: String(i + 1) }), ...r.map((u) => h("span", { cls: "march-who" + (u === v.uid ? " me" : ""), text: who(u) }))])))
      : h("p", { cls: "small", text: t("party.march.empty") });
    const parts = [
      h("h3", { text: t("party.march.title") }),
      h("p", { cls: "small", text: t(m.mode === "10" ? "party.march.ten" : "party.march.five") }),
      rows.length ? h("p", { cls: "hint", text: t("party.march.front") }) : null,
      diagram,
      rows.length ? h("p", { cls: "hint", text: t("party.march.back") }) : null,
    ];
    if (admin) {
      const edit = () => (ui.march = ui.march || { mode: m.mode, order: [...m.order] });
      const set = (patch) => { Object.assign(edit(), patch); redraw(true); };
      parts.push(
        h("div", { cls: "seg small", role: "group", "aria-label": t("party.march.title") }, ["5", "10"].map((k) =>
          h("button", { type: "button", "aria-pressed": m.mode === k ? "true" : "false", text: t("party.march.mode" + k), onclick: () => set({ mode: k }) }))),
        m.order.length > 1 ? h("ol", { cls: "march-edit" }, m.order.map((u, i) => h("li", {}, [
          h("span", { text: who(u) }),
          btn("↑", () => set({ order: moveIn(m.order, i, -1) }), "btn small", { "aria-label": t("party.march.up", { name: who(u) }), disabled: i === 0 }),
          btn("↓", () => set({ order: moveIn(m.order, i, 1) }), "btn small", { "aria-label": t("party.march.down", { name: who(u) }), disabled: i === m.order.length - 1 }),
        ]))) : null,
        ui.march ? h("div", { cls: "row" }, [
          btn(t("party.save"), () => { PARTY.saveMarch(id, ui.march).catch(fail); ui.march = null; redraw(true); }, "btn gold", { id: "march-save" }),
          btn(t("party.cancel"), () => { ui.march = null; redraw(true); }, "btn ghost"),
        ]) : null,
      );
    }
    return [h("section", { cls: "card" }, parts)];
  };

  // --- notes: one list, each note "only me" or "party". A player's private notes live in their character (Notes tab);
  // a GM without a character keeps them in the cloud, as before.
  const drawNotes = () => {
    const ch = v.me.charId ? getById(v.me.charId) : null;
    if (ch) {
      return [h("section", { cls: "card", id: "notes-party" }, [h("h3", { text: t("notes.title") }),
        h("p", { cls: "small", text: t("notes.onSheet", { name: ch.name }) }),
        h("div", { cls: "row" }, [h("a", { cls: "btn gold", id: "notes-open-sheet", href: `#/c/${ch.id}/notes`, text: t("notes.openSheet") })])])];
    }
    const ops = {
      add: (text, shared) => PARTY.addNote(id, text, !shared, v.me).catch(fail),
      edit: (n, text) => PARTY.editNote(id, n.id, text, !n.shared, v.me).catch(fail),
      remove: (n) => PARTY.deleteNote(id, n.id, !n.shared).catch(fail),
      move: (n) => PARTY.addNote(id, n.text, n.shared, v.me).then(() => PARTY.deleteNote(id, n.id, !n.shared)).catch(fail),
    };
    return [h("section", { cls: "card stack", id: "notes-party" }, [h("h3", { text: t("notes.title") }), h("p", { cls: "hint", text: t("notes.gmLead") }),
      ...drawBoard({ ui: ui.notes, priv: v.mine, party: v.notes, uid: v.uid, me: v.me, why: "", ops, ask, redraw: () => redraw(true) })])];
  };

  // --- managing: requests and the invite link (admins), leaving or deleting ---
  const drawManage = () => {
    const admin = v.me.role === "admin";
    const owner = v.party.owner;
    const parts = [];
    if (admin) {
      parts.push(h("section", { cls: "card key", id: "party-requests" }, [h("h3", { text: t("party.requests", { n: v.requests.length }) }),
        v.requests.length ? h("div", { cls: "ccards" }, v.requests.map((r) => h("article", { cls: "ccard" }, [
          h("span", { cls: "ccard-name", text: r.charName || "?" }),
          h("span", { cls: "ccard-meta", text: r.name || "?" }),
          h("div", { cls: "row" }, [
            btn(t("party.accept"), () => PARTY.accept(id, r).catch(fail), "btn gold"),
            btn(t("party.reject"), () => ask(t("party.rejectConfirm", { name: r.name || "?" }), () => PARTY.reject(id, r.uid).catch(fail)), "btn ghost"),
          ]),
        ]))) : h("p", { cls: "small", text: t("party.noRequests") })]));

      const link = inviteLink(location.href, v.party.invite);
      const linkIn = h("input", { id: "invite-link", readonly: true, value: link, onfocus: (e) => e.target.select() });
      const copy = async () => {
        try { await navigator.clipboard.writeText(link); toast(t("party.copied")); }
        catch { linkIn.focus(); linkIn.select(); toast(t("party.copyManual")); }
      };
      parts.push(h("section", { cls: "card" }, [h("h3", { text: t("party.invite") }), h("p", { cls: "small", text: t("party.inviteHint") }),
        h("label", { cls: "wide" }, [t("party.link"), linkIn]),
        h("div", { cls: "row" }, [
          btn(t("party.copy"), copy, "btn gold", { id: "invite-copy" }),
          navigator.share ? btn(t("party.share"), () => navigator.share({ title: v.party.name, text: t("party.shareText", { name: v.party.name }), url: link }).catch(() => {}), "btn") : null,
          btn(t("party.newLink"), () => ask(t("party.newLinkConfirm"), () => PARTY.newInvite(v.party).then(() => toast(t("party.newLinkDone"))).catch(fail)), "btn ghost", { id: "invite-new" }),
        ])]));
    }
    parts.push(h("div", { cls: "row" }, [canLeave(v.uid, owner)
      ? leaveBtn("party-leave")
      : btn(t("party.delete"), () => ask(t("party.deleteConfirm", { name: v.party.name }), () => { PARTY.deleteParty(v).catch(fail); go(home); }), "btn blood", { id: "party-delete" })]));
    return parts;
  };

  const TABS = onSheet ? ["overview", "manage"] : ["overview", "notes", "manage"];
  const drawTabs = () => TABS.map((k) => h("button", { type: "button", role: "tab", id: "tab-" + k, "aria-selected": ui.tab === k ? "true" : "false", "aria-pressed": ui.tab === k ? "true" : "false",
    text: t("party.tab." + k) + (k === "manage" && v.me.role === "admin" && v.requests.length ? ` (${v.requests.length})` : ""),
    onclick: () => { ui.tab = k; redraw(true); } }));

  /** force: after the user's own action; without it (changes from the cloud) sections being typed in wait. */
  function redraw(force = false) {
    if (!built) {
      built = true;
      body.replaceChildren(tabs, sec.info, sec.members, sec.gm, sec.march, sec.notes, sec.manage);
    }
    paint(tabs, drawTabs, force);
    const show = { overview: ["info", "members", "gm", "march"], notes: ["notes"], manage: ["manage"] }[ui.tab];
    for (const k in sec) sec[k].hidden = !show.includes(k);
    paint(sec.info, drawInfo, force);
    paint(sec.members, drawMembers, force);
    paint(sec.gm, drawGm, force);
    paint(sec.march, drawMarch, force);
    paint(sec.notes, drawNotes, force);
    paint(sec.manage, drawManage, force);
  }

  return PARTY.watchParty(id, (next) => {
    if (next.missing) { built = false; return body.replaceChildren(h("p", { cls: "lead", text: t("party.gone") }), h("a", { cls: "btn", href: home, text: t("party.toList") })); }
    if (!next.party || !next.me) return;
    v = next;
    // The old "My notes" of this party move into the character playing here (the sheet's own copy when on the sheet).
    const moved = bringPartyNotes(sheetCh || (v.me.charId ? getById(v.me.charId) : null), v);
    if (moved) toast(t("notes.movedFromParty", { n: moved }));
    redraw();
  });
}

// --- #/join/<code>: see which party invites me, pick a character, send the request ---
export function renderJoin(root, go, code, charId = "") {
  frame(root, t("party.joinTitle"), async (panel) => {
    const body = h("div", { cls: "stack" }, [h("p", { cls: "small", text: t("party.loading") })]);
    panel.append(body);
    const say = (key) => body.replaceChildren(h("p", { cls: "lead", text: t(key) }), h("a", { cls: "btn", href: "#/party", text: t("party.toList") }));
    if (!validCode(code)) return say("party.join.bad");
    let invite;
    try { invite = await PARTY.readInvite(code); } catch { return say("party.join.offline"); }
    if (!body.isConnected) return;
    if (!invite) return say("party.join.dead");
    if (await PARTY.amMember(invite.party)) return go(`#/party/${invite.party}`);
    const busy = await PARTY.myPartyChars();
    if (!body.isConnected) return;

    const chars = loadAll();
    if (!chars.length) {
      return body.replaceChildren(h("p", { cls: "lead", text: t("party.join.invited", { name: invite.name }) }),
        h("p", { cls: "small", text: t("party.join.noChars") }), newCharButtons(code));
    }
    const charIn = charSelect("join-char", null, busy);
    if (charId && !busy.has(charId) && getById(charId)) charIn.value = charId;
    const send = () => {
      const ch = pickedChar(charIn);
      if (!ch || busy.has(ch.id)) return toast(t("party.join.pick"));
      countEvent("party/join-request");
      PARTY.askToJoin(code, invite, ch).catch(() => toast(t("party.join.refused")));
      toast(t("party.join.sent", { name: invite.name }));
      go(`#/c/${ch.id}/party`);
    };
    body.replaceChildren(
      h("p", { cls: "lead", text: t("party.join.invited", { name: invite.name }) }),
      h("p", { cls: "small", text: t("party.join.hint") }),
      h("div", { cls: "row" }, [h("label", { cls: "wide" }, [t("party.join.char"), charIn])]),
      h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "join-send", text: t("party.join.send"), onclick: send })]),
      h("p", { cls: "small", text: t("party.join.orNew") }), newCharButtons(code),
    );
  });
}

/** Make a character for this invite: once saved, the creator comes back here with it picked. */
const newCharButtons = (code) => h("div", { cls: "row" }, [
  h("a", { cls: "btn gold", id: "join-new", href: `#/new/join/${code}`, text: t("home.new") }),
  h("a", { cls: "btn ghost", id: "join-paper", href: `#/paper/join/${code}`, text: t("home.paperNew") }),
]);

// --- The Party tab on a character sheet: the party this character plays in, or founding / joining one ---
// The sheet redraws often (every HP click); the tab's element and its listeners survive that and end when the screen changes.
let tabCache = null; // { id, el, alive }

export function partyTab({ ch, go }) {
  if (tabCache?.alive && tabCache.id === ch.id) return [tabCache.el];
  const el = h("div", { cls: "stack", id: "party-tab" });
  const entry = { id: ch.id, el, alive: true };
  tabCache = entry;
  // Signing in or out restarts the listeners (gate stops them all): the tab stays usable for the next sheet redraw.
  gate(el, null, (panel) => { entry.alive = true; PARTY.onStop(() => { entry.alive = false; }); mountTab(panel, ch, go); });
  return [el];
}

function mountTab(panel, ch, go) {
  const box = h("div", { cls: "stack" }, [h("p", { cls: "small", text: t("party.loading") })]);
  const { box: confirmBox, ask } = confirmer();
  panel.append(box, confirmBox);
  const home = `#/c/${ch.id}/party`;
  let shown = null, stop = null; // the party on screen and its listeners
  const ui = { name: "", link: "" }; // typed text survives the redraws

  PARTY.watchMyParties((rows) => {
    if (!rows) { shown = null; stop?.(); return box.replaceChildren(h("p", { cls: "small", text: t("party.err.load") })); }
    const mine = rows.filter((r) => r.charId === ch.id);
    const order = ["in", "asked", "checking", "rejected", "removed"];
    const row = mine.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))[0] || null;
    if (row?.status === "in") {
      if (shown !== row.id) { stop?.(); shown = row.id; box.replaceChildren(); stop = partyBody(box, go, row.id, home, ch); }
      return;
    }
    if (shown) { stop?.(); stop = null; shown = null; }
    if (row?.status === "checking") return box.replaceChildren(h("p", { cls: "small", text: t("party.status.checking") }));
    if (box.contains(document.activeElement) && document.activeElement.matches("input")) return; // do not disturb typing
    box.replaceChildren(...outside(row));
  });

  function outside(row) {
    const parts = [];
    if (row?.status === "asked") {
      parts.push(h("section", { cls: "card key", id: "party-asked" }, [
        h("h3", { text: row.name }),
        h("p", { cls: "small", text: t("party.char.asked") }),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn ghost", text: t("party.cancelAsk"),
          onclick: () => ask(t("party.cancelAskConfirm", { name: row.name }), () => PARTY.leave(row.id, { request: true }).catch(fail)) })]),
      ]));
      return parts;
    }
    if (row) parts.push(h("section", { cls: "card" }, [
      h("h3", { text: row.name }),
      h("p", { cls: "small", text: t("party.status." + row.status) }),
      h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn ghost", text: t("party.forget"), onclick: () => PARTY.leave(row.id).catch(fail) })]),
    ]));
    const nameIn = h("input", { id: "party-name", maxlength: NAME_MAX, placeholder: t("party.namePh"), value: ui.name, oninput: (e) => (ui.name = e.target.value) });
    const linkIn = h("input", { id: "join-link", placeholder: t("party.joinPh"), value: ui.link, oninput: (e) => (ui.link = e.target.value) });
    const create = () => {
      const name = cleanName(ui.name);
      if (!name) { nameIn.focus(); return toast(t("party.nameNeeded")); }
      ui.name = "";
      PARTY.createParty(name, getById(ch.id) || ch).done.catch(fail);
      countEvent("party/create");
    };
    const join = () => {
      const code = codeFrom(ui.link);
      if (!code) return toast(t("party.join.bad"));
      ui.link = "";
      go(`#/join/${code}/${ch.id}`);
    };
    parts.push(
      h("p", { cls: "small", text: t("party.char.intro", { name: ch.name }) }),
      h("section", { cls: "card" }, [h("h3", { text: t("party.joinTitle") }), h("p", { cls: "small", text: t("party.joinHint") }),
        h("div", { cls: "row" }, [h("label", { cls: "wide" }, [t("party.joinLink"), linkIn])]),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "join-go", text: t("party.joinGo"), onclick: join })])]),
      h("section", { cls: "card" }, [h("h3", { text: t("party.new") }), h("p", { cls: "small", text: t("party.char.newHint") }),
        h("div", { cls: "row" }, [h("label", { cls: "wide" }, [t("party.name"), nameIn])]),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn", id: "party-create", text: t("party.create"), onclick: create })])]),
      h("p", { cls: "hint" }, [t("party.char.allHint"), " ", h("a", { href: "#/party", text: t("party.toList") })]),
    );
    return parts;
  }
}
