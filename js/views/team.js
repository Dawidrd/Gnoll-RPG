// Team screens (D2): my teams and founding one (#/team), one team (#/team/<id>), joining by invite link (#/join/<code>).
import { h, toast } from "../dom.js";
import { t, tr } from "../i18n.js";
import { loadAll } from "../store.js";
import { CLASSES } from "../rules/index.js";
import { account, onAccount, accountAvailable } from "../sync/cloud.js";
import { accountBox } from "./account.js";
import { inviteLink, validCode, codeFrom, canManage, canLeave, sortMembers, cleanName, NAME_MAX } from "../sync/teamlogic.js";
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

// --- #/team/<id>: members, requests, invite link, leaving ---
export function renderTeam(root, go, id) {
  frame(root, t("team.title"), (panel) => {
    const { box, ask } = confirmer();
    const body = h("div", { cls: "stack" }, [h("p", { cls: "small", text: t("team.loading") })]);
    panel.append(body, box);
    TEAM.watchTeam(id, (v) => {
      if (v.missing) return body.replaceChildren(h("p", { cls: "lead", text: t("team.gone") }), h("a", { cls: "btn", href: "#/team", text: t("team.toList") }));
      if (!v.team || !v.me) return;
      const admin = v.me.role === "admin";
      const owner = v.team.owner;

      const memberRow = (m) => {
        const may = canManage(v.me, m, owner);
        const role = m.uid === owner ? t("team.role.owner") : t("team.role." + m.role);
        const buttons = [
          may.promote ? h("button", { type: "button", cls: "btn small", text: t("team.promote"), onclick: () => TEAM.setRole(id, m.uid, "admin").catch(fail) }) : null,
          may.demote ? h("button", { type: "button", cls: "btn small", text: t("team.demote"), onclick: () => TEAM.setRole(id, m.uid, "player").catch(fail) }) : null,
          may.remove ? h("button", { type: "button", cls: "btn small ghost", text: t("team.remove"),
            onclick: () => ask(t("team.removeConfirm", { name: m.name || "?" }), () => TEAM.removeMember(id, m.uid).catch(fail)) }) : null,
        ].filter(Boolean);
        return h("article", { cls: "ccard" }, [
          h("span", { cls: "ccard-name", text: m.charName || t("team.noCharShort") }),
          h("span", { cls: "ccard-meta", text: `${m.name || "?"}${m.uid === v.uid ? " " + t("team.you") : ""} · ${role}` }),
          buttons.length ? h("div", { cls: "row" }, buttons) : null,
        ]);
      };

      const parts = [h("h3", { cls: "team-name", text: v.team.name }),
        h("p", { cls: "small", text: t(admin ? "team.youAdmin" : "team.youPlayer") })];

      if (admin) {
        parts.push(h("section", { cls: "card key", id: "team-requests" }, [h("h3", { text: t("team.requests", { n: v.requests.length }) }),
          v.requests.length ? h("div", { cls: "ccards" }, v.requests.map((r) => h("article", { cls: "ccard" }, [
            h("span", { cls: "ccard-name", text: r.charName || "?" }),
            h("span", { cls: "ccard-meta", text: r.name || "?" }),
            h("div", { cls: "row" }, [
              h("button", { type: "button", cls: "btn gold", text: t("team.accept"), onclick: () => TEAM.accept(id, r).catch(fail) }),
              h("button", { type: "button", cls: "btn ghost", text: t("team.reject"),
                onclick: () => ask(t("team.rejectConfirm", { name: r.name || "?" }), () => TEAM.reject(id, r.uid).catch(fail)) }),
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
            h("button", { type: "button", cls: "btn gold", id: "invite-copy", text: t("team.copy"), onclick: copy }),
            navigator.share ? h("button", { type: "button", cls: "btn", text: t("team.share"),
              onclick: () => navigator.share({ title: v.team.name, text: t("team.shareText", { name: v.team.name }), url: link }).catch(() => {}) }) : null,
            h("button", { type: "button", cls: "btn ghost", id: "invite-new", text: t("team.newLink"),
              onclick: () => ask(t("team.newLinkConfirm"), () => TEAM.newInvite(v.team).then(() => toast(t("team.newLinkDone"))).catch(fail)) }),
          ])]));
      }

      parts.push(h("section", { cls: "card" }, [h("h3", { text: t("team.members", { n: v.members.length }) }),
        h("div", { cls: "ccards", id: "team-members" }, sortMembers(v.members).map(memberRow))]));

      parts.push(h("div", { cls: "row" }, [canLeave(v.uid, owner)
        ? h("button", { type: "button", cls: "btn ghost", id: "team-leave", text: t("team.leave"),
          onclick: () => ask(t("team.leaveConfirm", { name: v.team.name }), () => { TEAM.leave(id, { member: true }).catch(fail); go("#/team"); }) })
        : h("button", { type: "button", cls: "btn blood", id: "team-delete", text: t("team.delete"),
          onclick: () => ask(t("team.deleteConfirm", { name: v.team.name }), () => { TEAM.deleteTeam(v).catch(fail); go("#/team"); }) })]));

      body.replaceChildren(...parts);
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
