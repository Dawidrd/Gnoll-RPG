// Team screens (D2, D3): my teams and founding one (#/team), one team (#/team/<id>), joining by invite link (#/join/<code>).
import { h, toast } from "../dom.js";
import { t, tr, lang } from "../i18n.js";
import { loadAll } from "../store.js";
import { CLASSES, SPECIES } from "../rules/index.js";
import { account, onAccount, accountAvailable } from "../sync/cloud.js";
import { accountBox } from "./account.js";
import { inviteLink, validCode, codeFrom, canManage, canLeave, sortMembers, cleanName, NAME_MAX, CAMPAIGN_MAX, NOTE_MAX,
  sessionWhen, cleanNote, sortNotes, canEditNote, canDeleteNote, marchOrder, marchRows, moveIn } from "../sync/teamlogic.js";
import * as TEAM from "../sync/team.js";

const fail = () => toast(t("team.err.save"));
const chLabel = (ch) => `${ch.name} — ${CLASSES[ch.classId] ? tr(CLASSES[ch.classId].name).split(" (")[0] : ch.classId} ${ch.level}`;

/** Character picker from the signed-in account's characters. `none`: label of a "no character" choice. */
function charSelect(id, none) {
  const list = loadAll().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return h("select", { id }, [none ? h("option", { value: "", text: none }) : null,
    ...list.map((ch) => h("option", { value: ch.id, text: chLabel(ch) }))]);
}
const pickedChar = (sel) => loadAll().find((c) => c.id === sel.value) || null;

/** In-page yes/no question (native confirm() is blocked in some app views). */
function confirmer() {
  const box = h("div", { cls: "confirm", role: "alert" });
  const ask = (text, fn) => {
    box.replaceChildren(h("span", { cls: "small", text }),
      h("button", { type: "button", cls: "btn gold", text: t("sheet.yes"), onclick: () => { box.classList.remove("open"); fn(); } }),
      h("button", { type: "button", cls: "btn ghost", text: t("sheet.no"), onclick: () => box.classList.remove("open") }));
    box.classList.add("open");
    box.scrollIntoView({ block: "nearest" });
  };
  return { box, ask };
}

/**
 * Shared frame: without an account the screen explains why one is needed and offers signing in.
 * draw(panel) runs once the account is ready; the screen redraws when the account changes.
 */
function frame(root, title, draw) {
  const panel = h("section", { cls: "panel" });
  root.replaceChildren(panel);
  const head = () => h("header", { cls: "stack" }, [h("a", { cls: "hint", href: "#/", text: t("team.back") }), h("h2", { text: title })]);
  const render = () => {
    const s = account();
    if (!accountAvailable()) return panel.replaceChildren(head(), h("p", { cls: "lead", text: t("team.unavailable") }));
    if (s.status !== "in") return panel.replaceChildren(head(), h("p", { cls: "lead", text: t("team.needAccount") }), accountBox());
    panel.replaceChildren(head());
    draw(panel);
  };
  let was = account().status;
  const off = onAccount((s) => {
    if (!panel.isConnected) return off();
    const changed = (s.status === "in") !== (was === "in");
    was = s.status;
    if (changed) { TEAM.stopWatching(); render(); }
  });
  render();
}

// --- #/team: my teams, found a new one, paste an invite link ---
export function renderTeams(root, go) {
  frame(root, t("team.title"), (panel) => {
    const { box, ask } = confirmer();
    const list = h("div", { cls: "ccards", id: "team-list" }, [h("p", { cls: "small", text: t("team.loading") })]);
    TEAM.watchMyTeams((teams) => {
      if (!teams) return list.replaceChildren(h("p", { cls: "small", text: t("team.err.load") }));
      if (!teams.length) return list.replaceChildren(h("p", { cls: "small", text: t("team.none") }));
      list.replaceChildren(...teams.map((tm) => {
        const actions = [];
        if (tm.status === "in") actions.push(h("a", { cls: "btn gold", href: `#/team/${tm.id}`, text: t("home.open") }));
        if (tm.status === "asked") actions.push(h("button", { type: "button", cls: "btn ghost", text: t("team.cancelAsk"),
          onclick: () => ask(t("team.cancelAskConfirm", { name: tm.name }), () => TEAM.leave(tm.id, { request: true }).catch(fail)) }));
        if (tm.status === "rejected" || tm.status === "removed") actions.push(h("button", { type: "button", cls: "btn ghost", text: t("team.forget"),
          onclick: () => TEAM.leave(tm.id).catch(fail) }));
        return h("article", { cls: "ccard" }, [
          h("span", { cls: "ccard-name", text: tm.name }),
          h("span", { cls: "ccard-meta", text: t("team.status." + tm.status) }),
          actions.length ? h("div", { cls: "row" }, actions) : null,
        ]);
      }));
    });

    const nameIn = h("input", { id: "team-name", maxlength: NAME_MAX, placeholder: t("team.namePh") });
    const charIn = charSelect("team-char", t("team.noChar"));
    const create = () => {
      const name = cleanName(nameIn.value);
      if (!name) { nameIn.focus(); return toast(t("team.nameNeeded")); }
      const { id, done } = TEAM.createTeam(name, pickedChar(charIn));
      done.catch(fail);
      go(`#/team/${id}`);
    };
    const linkIn = h("input", { id: "join-link", placeholder: t("team.joinPh") });
    const join = () => {
      const code = codeFrom(linkIn.value);
      if (!code) return toast(t("team.join.bad"));
      go(`#/join/${code}`);
    };

    panel.append(
      h("p", { cls: "small", text: t("team.intro") }),
      list, box,
      h("section", { cls: "card" }, [h("h3", { text: t("team.new") }), h("p", { cls: "small", text: t("team.newHint") }),
        h("div", { cls: "row" }, [h("label", { cls: "wide" }, [t("team.name"), nameIn]), h("label", { cls: "wide" }, [t("team.char"), charIn])]),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "team-create", text: t("team.create"), onclick: create })])]),
      h("section", { cls: "card" }, [h("h3", { text: t("team.joinTitle") }), h("p", { cls: "small", text: t("team.joinHint") }),
        h("div", { cls: "row" }, [h("label", { cls: "wide" }, [t("team.joinLink"), linkIn])]),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn", id: "join-go", text: t("team.joinGo"), onclick: join })])]),
    );
  });
}

// --- #/team/<id>: overview (info, characters, marching order), notes, managing the team ---
const short = (o) => (o ? tr(o.name).split(" (")[0] : "");
/** "Krasnolud · Wojownik (Champion) 3" from the summary the member shared. */
function sheetLine(s) {
  const cls = CLASSES[s.cls];
  const sub = short(cls?.subclasses?.[s.sub]);
  return [short(SPECIES[s.species]) || s.species, `${short(cls) || s.cls}${sub ? ` (${sub})` : ""} ${s.level || ""}`.trim()].filter(Boolean).join(" · ");
}
const when = (d) => d.toLocaleString(lang(), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const stamp = (at) => new Date(at || 0).toLocaleString(lang(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Sections redraw on every change in the cloud (someone's HP, a new note…). A section the user is typing in
 * waits until they leave it, so nothing typed is lost; drafts live in `ui`, outside the redrawn elements.
 * The user's own clicks redraw at once (force), also where the text field keeps focus (Safari does not move it to buttons).
 */
function painter() {
  const waiting = new Map(), hooked = new WeakSet();
  const typing = (el) => el.contains(document.activeElement) && document.activeElement.matches("input, textarea, select");
  const paint = (el, draw, force) => {
    if (!force && typing(el)) {
      waiting.set(el, draw);
      if (!hooked.has(el)) {
        hooked.add(el);
        el.addEventListener("focusout", () => setTimeout(() => { if (waiting.has(el) && !typing(el)) paint(el, waiting.get(el), true); }, 0));
      }
      return;
    }
    waiting.delete(el);
    el.replaceChildren(...draw());
  };
  return paint;
}

export function renderTeam(root, go, id) {
  frame(root, t("team.title"), (panel) => {
    const { box, ask } = confirmer();
    const paint = painter();
    // What the user is doing here; kept across redraws.
    const ui = { tab: "overview", editInfo: null, newNote: { team: "", mine: "" }, editing: null, march: null };
    const body = h("div", { cls: "stack" }, [h("p", { cls: "small", text: t("team.loading") })]);
    const tabs = h("div", { cls: "seg team-tabs", role: "tablist" });
    const sec = { info: h("div"), members: h("div"), march: h("div"), notes: h("div"), mine: h("div"), manage: h("div", { cls: "stack" }) };
    let v = null, built = false;
    panel.append(body, box);

    const btn = (text, onclick, cls = "btn small", attrs = {}) => h("button", { type: "button", cls, text, onclick, ...attrs });

    // --- info: name, campaign, next session ---
    const drawInfo = () => {
      const admin = v.me.role === "admin";
      const e = ui.editInfo;
      if (e) {
        const field = (key, el) => { el.addEventListener("input", () => (e[key] = el.value)); return el; };
        return [h("section", { cls: "card key", id: "team-info" }, [
          h("h3", { text: t("team.info.edit") }),
          h("label", { cls: "wide" }, [t("team.name"), field("name", h("input", { id: "info-name", maxlength: NAME_MAX, value: e.name }))]),
          h("label", { cls: "wide" }, [t("team.info.campaign"), field("campaign", h("input", { id: "info-campaign", maxlength: CAMPAIGN_MAX, value: e.campaign, placeholder: t("team.info.campaignPh") }))]),
          h("label", { cls: "wide" }, [t("team.info.next"), field("next", h("input", { id: "info-next", type: "datetime-local", value: e.next }))]),
          h("div", { cls: "row" }, [
            btn(t("team.save"), () => {
              if (!cleanName(e.name)) return toast(t("team.nameNeeded"));
              TEAM.saveInfo(v.team, e).catch(fail);
              ui.editInfo = null; redraw(true);
            }, "btn gold", { id: "info-save" }),
            btn(t("team.info.clearNext"), () => { e.next = ""; redraw(true); }, "btn ghost"),
            btn(t("team.cancel"), () => { ui.editInfo = null; redraw(true); }, "btn ghost"),
          ]),
        ])];
      }
      const next = sessionWhen(v.team.next);
      return [h("section", { cls: "card team-head", id: "team-info" }, [
        h("h3", { cls: "team-name", text: v.team.name }),
        v.team.campaign ? h("p", { cls: "lead", text: t("team.info.campaignIs", { name: v.team.campaign }) }) : null,
        h("p", { cls: next && !next.past ? "team-next" : "small" }, next
          ? [h("b", { text: t("team.info.nextIs") + " " }), when(next.date), next.past ? " " + t("team.info.past") : ""]
          : t(admin ? "team.info.noNextAdmin" : "team.info.noNext")),
        h("p", { cls: "small", text: t(admin ? "team.youAdmin" : "team.youPlayer") }),
        admin ? h("div", { cls: "row" }, [btn(t("team.info.editBtn"), () => {
          ui.editInfo = { name: v.team.name, campaign: v.team.campaign || "", next: v.team.next || "" }; redraw(true);
        }, "btn small", { id: "info-edit" })]) : null,
      ])];
    };

    // --- members with what they share of their characters ---
    const drawMembers = () => {
      const owner = v.team.owner;
      const card = (m) => {
        const may = canManage(v.me, m, owner);
        const role = m.uid === owner ? t("team.role.owner") : t("team.role." + m.role);
        const s = m.charId ? m.sheet : null;
        const pct = s?.hpMax ? Math.min(100, (s.hp / s.hpMax) * 100) : 0;
        const buttons = [
          may.promote ? btn(t("team.promote"), () => TEAM.setRole(id, m.uid, "admin").catch(fail)) : null,
          may.demote ? btn(t("team.demote"), () => TEAM.setRole(id, m.uid, "player").catch(fail)) : null,
          may.remove ? btn(t("team.remove"), () => ask(t("team.removeConfirm", { name: m.name || "?" }), () => TEAM.removeMember(id, m.uid).catch(fail)), "btn small ghost") : null,
        ].filter(Boolean);
        return h("article", { cls: "ccard member" }, [
          h("span", { cls: "ccard-name", text: m.charName || t("team.noCharShort") }),
          s ? h("span", { cls: "ccard-meta", text: sheetLine(s) }) : m.charId ? h("span", { cls: "hint", text: t("team.sheet.none") }) : null,
          s ? h("div", { cls: "member-vit" }, [
            h("div", { cls: "vit hp" }, [h("span", { cls: "k", text: "HP" }), h("span", { cls: "v", text: `${s.hp}/${s.hpMax}` }),
              s.temp ? h("span", { cls: "v small", text: "+" + s.temp }) : null]),
            h("div", { cls: "vit" }, [h("span", { cls: "k", text: "AC" }), h("span", { cls: "v", text: s.ac })]),
            h("div", { cls: "bar", "aria-hidden": "true" }, [h("i", { style: `width:${pct}%` })]),
          ]) : null,
          h("span", { cls: "ccard-meta", text: `${m.name || "?"}${m.uid === v.uid ? " " + t("team.you") : ""} · ${role}` }),
          buttons.length ? h("div", { cls: "row" }, buttons) : null,
        ]);
      };
      // My character in this team: switch to another one (or none, e.g. as the GM).
      const sel = charSelect("team-mychar", t("team.noChar"));
      sel.value = loadAll().some((c) => c.id === v.me.charId) ? v.me.charId : "";
      sel.addEventListener("change", () => TEAM.setMyChar(id, pickedChar(sel)).then(() => toast(t("team.mychar.done"))).catch(fail));
      return [h("section", { cls: "card" }, [
        h("h3", { text: t("team.members", { n: v.members.length }) }),
        h("p", { cls: "hint", text: t("team.sheet.hint") }),
        h("div", { cls: "ccards", id: "team-members" }, sortMembers(v.members).map(card)),
        h("label", { cls: "wide" }, [t("team.mychar"), sel]),
      ])];
    };

    // --- marching order: everyone sees it; admins set it ---
    const drawMarch = () => {
      const admin = v.me.role === "admin";
      const saved = v.team.march || { mode: "5", order: [] };
      const m = ui.march || { mode: saved.mode, order: marchOrder(saved.order, v.members) };
      const byUid = new Map(v.members.map((x) => [x.uid, x]));
      const who = (u) => byUid.get(u)?.charName || byUid.get(u)?.name || "?";
      const rows = marchRows(m.order, m.mode);
      const diagram = rows.length
        ? h("ol", { cls: "march" + (m.mode === "10" ? " two" : ""), id: "team-march" }, rows.map((r, i) =>
          h("li", {}, [h("span", { cls: "hint", text: String(i + 1) }), ...r.map((u) => h("span", { cls: "march-who" + (u === v.uid ? " me" : ""), text: who(u) }))])))
        : h("p", { cls: "small", text: t("team.march.empty") });
      const parts = [
        h("h3", { text: t("team.march.title") }),
        h("p", { cls: "small", text: t(m.mode === "10" ? "team.march.ten" : "team.march.five") }),
        rows.length ? h("p", { cls: "hint", text: t("team.march.front") }) : null,
        diagram,
        rows.length ? h("p", { cls: "hint", text: t("team.march.back") }) : null,
      ];
      if (admin) {
        const edit = () => (ui.march = ui.march || { mode: m.mode, order: [...m.order] });
        const set = (patch) => { Object.assign(edit(), patch); redraw(true); };
        parts.push(
          h("div", { cls: "seg small", role: "group", "aria-label": t("team.march.title") }, ["5", "10"].map((k) =>
            h("button", { type: "button", "aria-pressed": m.mode === k ? "true" : "false", text: t("team.march.mode" + k), onclick: () => set({ mode: k }) }))),
          m.order.length > 1 ? h("ol", { cls: "march-edit" }, m.order.map((u, i) => h("li", {}, [
            h("span", { text: who(u) }),
            btn("↑", () => set({ order: moveIn(m.order, i, -1) }), "btn small", { "aria-label": t("team.march.up", { name: who(u) }), disabled: i === 0 }),
            btn("↓", () => set({ order: moveIn(m.order, i, 1) }), "btn small", { "aria-label": t("team.march.down", { name: who(u) }), disabled: i === m.order.length - 1 }),
          ]))) : null,
          ui.march ? h("div", { cls: "row" }, [
            btn(t("team.save"), () => { TEAM.saveMarch(id, ui.march).catch(fail); ui.march = null; redraw(true); }, "btn gold", { id: "march-save" }),
            btn(t("team.cancel"), () => { ui.march = null; redraw(true); }, "btn ghost"),
          ]) : null,
        );
      }
      return [h("section", { cls: "card" }, parts)];
    };

    // --- notes: the team's (everyone reads) and mine (only I read) ---
    const drawNotes = (priv) => {
      const key = priv ? "mine" : "team";
      const list = sortNotes(priv ? v.mine : v.notes);
      const editing = (n) => ui.editing?.priv === priv && ui.editing.id === n.id;
      const area = (value, onInput, idAttr) => {
        const el = h("textarea", { rows: 4, maxlength: NOTE_MAX, id: idAttr, placeholder: t(priv ? "team.notes.minePh" : "team.notes.teamPh") });
        el.value = value;
        el.addEventListener("input", () => onInput(el.value));
        return el;
      };
      const note = (n) => {
        if (editing(n)) {
          return h("article", { cls: "note" }, [
            area(ui.editing.text, (x) => (ui.editing.text = x)),
            h("div", { cls: "row" }, [
              btn(t("team.save"), () => {
                if (!cleanNote(ui.editing.text)) return toast(t("team.notes.empty"));
                TEAM.editNote(id, n.id, ui.editing.text, priv).catch(fail); ui.editing = null; redraw(true);
              }, "btn gold"),
              btn(t("team.cancel"), () => { ui.editing = null; redraw(true); }, "btn ghost"),
            ]),
          ]);
        }
        const mayEdit = priv || canEditNote(n, v.uid), mayDelete = priv || canDeleteNote(n, v.me);
        return h("article", { cls: "note" }, [
          h("p", { cls: "note-text", text: n.text }),
          h("p", { cls: "hint", text: priv ? stamp(n.at) : `${n.name || "?"}${n.author === v.uid ? " " + t("team.you") : ""} · ${stamp(n.at)}` }),
          mayEdit || mayDelete ? h("div", { cls: "row" }, [
            mayEdit ? btn(t("team.notes.edit"), () => { ui.editing = { priv, id: n.id, text: n.text }; redraw(true); }) : null,
            mayDelete ? btn(t("team.notes.delete"), () => ask(t("team.notes.deleteConfirm"), () => TEAM.deleteNote(id, n.id, priv).catch(fail)), "btn small ghost") : null,
          ]) : null,
        ]);
      };
      const add = () => {
        if (!cleanNote(ui.newNote[key])) return toast(t("team.notes.empty"));
        TEAM.addNote(id, ui.newNote[key], priv).catch(fail);
        ui.newNote[key] = ""; redraw(true);
      };
      return [h("section", { cls: "card" + (priv ? " note-private" : ""), id: priv ? "notes-mine" : "notes-team" }, [
        h("h3", { text: t(priv ? "team.notes.mine" : "team.notes.team") }),
        h("p", { cls: "hint", text: t(priv ? "team.notes.mineHint" : "team.notes.teamHint") }),
        area(ui.newNote[key], (x) => (ui.newNote[key] = x), priv ? "note-new-mine" : "note-new-team"),
        h("div", { cls: "row" }, [btn(t("team.notes.add"), add, "btn gold", { id: priv ? "note-add-mine" : "note-add-team" })]),
        list.length ? h("div", { cls: "stack" }, list.map(note)) : h("p", { cls: "small", text: t("team.notes.none") }),
      ])];
    };

    // --- managing: requests and the invite link (admins), leaving or deleting ---
    const drawManage = () => {
      const admin = v.me.role === "admin";
      const owner = v.team.owner;
      const parts = [];
      if (admin) {
        parts.push(h("section", { cls: "card key", id: "team-requests" }, [h("h3", { text: t("team.requests", { n: v.requests.length }) }),
          v.requests.length ? h("div", { cls: "ccards" }, v.requests.map((r) => h("article", { cls: "ccard" }, [
            h("span", { cls: "ccard-name", text: r.charName || "?" }),
            h("span", { cls: "ccard-meta", text: r.name || "?" }),
            h("div", { cls: "row" }, [
              btn(t("team.accept"), () => TEAM.accept(id, r).catch(fail), "btn gold"),
              btn(t("team.reject"), () => ask(t("team.rejectConfirm", { name: r.name || "?" }), () => TEAM.reject(id, r.uid).catch(fail)), "btn ghost"),
            ]),
          ]))) : h("p", { cls: "small", text: t("team.noRequests") })]));

        const link = inviteLink(location.href, v.team.invite);
        const linkIn = h("input", { id: "invite-link", readonly: true, value: link, onfocus: (e) => e.target.select() });
        const copy = async () => {
          try { await navigator.clipboard.writeText(link); toast(t("team.copied")); }
          catch { linkIn.focus(); linkIn.select(); toast(t("team.copyManual")); }
        };
        parts.push(h("section", { cls: "card" }, [h("h3", { text: t("team.invite") }), h("p", { cls: "small", text: t("team.inviteHint") }),
          h("label", { cls: "wide" }, [t("team.link"), linkIn]),
          h("div", { cls: "row" }, [
            btn(t("team.copy"), copy, "btn gold", { id: "invite-copy" }),
            navigator.share ? btn(t("team.share"), () => navigator.share({ title: v.team.name, text: t("team.shareText", { name: v.team.name }), url: link }).catch(() => {}), "btn") : null,
            btn(t("team.newLink"), () => ask(t("team.newLinkConfirm"), () => TEAM.newInvite(v.team).then(() => toast(t("team.newLinkDone"))).catch(fail)), "btn ghost", { id: "invite-new" }),
          ])]));
      }
      parts.push(h("div", { cls: "row" }, [canLeave(v.uid, owner)
        ? btn(t("team.leave"), () => ask(t("team.leaveConfirm", { name: v.team.name }), () => { TEAM.leave(id, { member: true }).catch(fail); go("#/team"); }), "btn ghost", { id: "team-leave" })
        : btn(t("team.delete"), () => ask(t("team.deleteConfirm", { name: v.team.name }), () => { TEAM.deleteTeam(v).catch(fail); go("#/team"); }), "btn blood", { id: "team-delete" })]));
      return parts;
    };

    const TABS = ["overview", "notes", "manage"];
    const drawTabs = () => TABS.map((k) => h("button", { type: "button", role: "tab", id: "tab-" + k, "aria-selected": ui.tab === k ? "true" : "false", "aria-pressed": ui.tab === k ? "true" : "false",
      text: t("team.tab." + k) + (k === "manage" && v.me.role === "admin" && v.requests.length ? ` (${v.requests.length})` : ""),
      onclick: () => { ui.tab = k; redraw(true); } }));

    /** force: after the user's own action; without it (changes from the cloud) sections being typed in wait. */
    function redraw(force = false) {
      if (!built) {
        built = true;
        body.replaceChildren(tabs, sec.info, sec.members, sec.march, sec.notes, sec.mine, sec.manage);
      }
      paint(tabs, drawTabs, force);
      const show = { overview: ["info", "members", "march"], notes: ["notes", "mine"], manage: ["manage"] }[ui.tab];
      for (const k in sec) sec[k].hidden = !show.includes(k);
      paint(sec.info, drawInfo, force);
      paint(sec.members, drawMembers, force);
      paint(sec.march, drawMarch, force);
      paint(sec.notes, () => drawNotes(false), force);
      paint(sec.mine, () => drawNotes(true), force);
      paint(sec.manage, drawManage, force);
    }

    TEAM.watchTeam(id, (next) => {
      if (next.missing) { built = false; return body.replaceChildren(h("p", { cls: "lead", text: t("team.gone") }), h("a", { cls: "btn", href: "#/team", text: t("team.toList") })); }
      if (!next.team || !next.me) return;
      v = next;
      redraw();
    });
  });
}

// --- #/join/<code>: see which team invites me, pick a character, send the request ---
export function renderJoin(root, go, code) {
  frame(root, t("team.joinTitle"), async (panel) => {
    const body = h("div", { cls: "stack" }, [h("p", { cls: "small", text: t("team.loading") })]);
    panel.append(body);
    const say = (key) => body.replaceChildren(h("p", { cls: "lead", text: t(key) }), h("a", { cls: "btn", href: "#/team", text: t("team.toList") }));
    if (!validCode(code)) return say("team.join.bad");
    let invite;
    try { invite = await TEAM.readInvite(code); } catch { return say("team.join.offline"); }
    if (!body.isConnected) return;
    if (!invite) return say("team.join.dead");
    if (await TEAM.amMember(invite.team)) return go(`#/team/${invite.team}`);
    if (!body.isConnected) return;

    const chars = loadAll();
    if (!chars.length) {
      return body.replaceChildren(h("p", { cls: "lead", text: t("team.join.invited", { name: invite.name }) }),
        h("p", { cls: "small", text: t("team.join.noChars") }),
        h("div", { cls: "row" }, [h("a", { cls: "btn gold", href: "#/new", text: t("home.new") })]));
    }
    const charIn = charSelect("join-char");
    const send = () => {
      const ch = pickedChar(charIn);
      if (!ch) return;
      TEAM.askToJoin(code, invite, ch).catch(() => toast(t("team.join.refused")));
      toast(t("team.join.sent", { name: invite.name }));
      go("#/team");
    };
    body.replaceChildren(
      h("p", { cls: "lead", text: t("team.join.invited", { name: invite.name }) }),
      h("p", { cls: "small", text: t("team.join.hint") }),
      h("div", { cls: "row" }, [h("label", { cls: "wide" }, [t("team.join.char"), charIn])]),
      h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "join-send", text: t("team.join.send"), onclick: send })]),
    );
  });
}
