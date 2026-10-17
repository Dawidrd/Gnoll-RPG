// Account box on the home screen: optional Google sign-in, the sync state, and deleting the account.
import { h, toast, fill } from "../dom.js";
import { t } from "../i18n.js";
import { storage } from "../store.js";
import { account, onAccount, accountAvailable, signIn, signOut, connect, moveGuests } from "../sync/cloud.js";
import { deleteAccount } from "../sync/erase.js";
import { inAppBrowser, phoneKind } from "../inapp.js";
import { installHelp } from "./install.js";

const NOTICE = "gnoll.notice"; // a message to show after the page reloads

/** Called once at start-up: a message left before a reload (e.g. "account deleted"). */
export function showNotice() {
  const key = storage.get(NOTICE);
  if (key) { storage.del(NOTICE); toast(t(key)); }
}

// What went wrong while deleting, as a key of acc.del.err.*; null = the user just closed Google's window.
function deleteError(e) {
  const code = e?.code || "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (code === "auth/popup-blocked") return "popup";
  if (code === "auth/user-mismatch") return "mismatch";
  if (code === "unavailable" || code === "auth/network-request-failed" || !navigator.onLine) return "offline";
  return "failed";
}

/** In Messenger's (or another app's) built-in browser Google won't sign in: explain how to open the page in a normal browser,
 *  for this phone (iPhone or Android), or both when it can't be told. */
function inAppNote(app) {
  const link = h("input", { id: "acc-inapp-link", readonly: true, value: location.href, "aria-label": t("acc.inapp.link"), onfocus: (e) => e.target.select() });
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.href); toast(t("acc.inapp.copied")); }
    catch { link.focus(); link.select(); toast(t("party.copyManual")); }
  };
  const kind = phoneKind(navigator.userAgent, navigator.maxTouchPoints || 0);
  const phones = kind ? [kind] : ["ios", "android"];
  return h("div", { cls: "stack", id: "acc-inapp" }, [
    h("p", { cls: "warn soft", text: app ? t("acc.inapp.named", { app }) : t("acc.inapp.unnamed") }),
    h("h4", { text: t("acc.inapp.exit") }),
    ...phones.map((k) => h("p", { cls: "small", id: `acc-inapp-${k}` }, [h("b", { text: t(`acc.inapp.${k}.h`) }), " ", t(`acc.inapp.${k}`)])),
    h("p", { cls: "small", text: t("acc.inapp.copyHint") }),
    link,
    h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "acc-inapp-copy", text: t("acc.inapp.copy"), onclick: copy })]),
  ]);
}

export function accountBox() {
  if (!accountAvailable()) return null;
  const app = inAppBrowser(navigator.userAgent);
  const box = h("section", { cls: "card", id: "account" });
  // del: the "delete account" panel; null = closed. { keep, step, error }
  let del = null;

  function deletePanel() {
    const busy = !!del.step;
    const start = async () => {
      del.error = null;
      try {
        await deleteAccount(del.keep, (step) => { del.step = step; draw(account()); });
        storage.set(NOTICE, del.keep ? "acc.del.doneKept" : "acc.del.done");
        location.reload(); // starts clean, without the deleted account's Firebase session
      } catch (e) {
        del.step = null; del.error = deleteError(e);
        draw(account());
      }
    };
    return h("div", { cls: "stack", id: "acc-del" }, [
      h("h4", { text: t("acc.del.title") }),
      h("p", { cls: "small", text: t("acc.del.what") }),
      h("label", { cls: "check" }, [
        h("input", { type: "checkbox", id: "acc-del-keep", checked: del.keep, disabled: busy, onchange: (e) => { del.keep = e.target.checked; } }),
        t("acc.del.keep"),
      ]),
      h("p", { cls: "hint", text: t("acc.del.hint") }),
      busy ? h("p", { cls: "small", role: "status", text: t("acc.del.step." + del.step) }) : null,
      del.error ? h("p", { cls: "small", role: "alert", text: t("acc.del.err." + del.error) }) : null,
      h("div", { cls: "row" }, [
        h("button", { type: "button", cls: "btn blood", id: "acc-del-go", disabled: busy, text: t("acc.del.go"), onclick: start }),
        h("button", { type: "button", cls: "btn ghost", disabled: busy, text: t("party.cancel"), onclick: () => { del = null; draw(account()); } }),
      ]),
    ]);
  }

  const draw = (s) => {
    const kids = [h("h3", { text: t("acc.title") })];
    if (s.status === "in") {
      kids.push(h("p", { cls: "small", text: t("acc.signedIn", { name: s.user.name || s.user.email, email: s.user.email }) }),
        h("p", { cls: "small", id: "acc-sync", text: t("acc.sync." + (s.sync || "offline")) }),
        s.guests ? h("div", { cls: "stack", id: "acc-guests" }, [h("p", { cls: "small", text: t("acc.guests", { n: s.guests }) }),
          h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn", id: "acc-move", text: t("acc.move"),
            onclick: () => toast(t("acc.moved", { n: moveGuests() })) })])]) : null,
        h("div", { cls: "row" }, [h("a", { cls: "btn", id: "acc-party", href: "#/party", text: t("party.toList") }),
          h("button", { type: "button", cls: "btn ghost", id: "acc-out", text: t("acc.signOut"), onclick: () => signOut() })]),
        h("p", { cls: "hint", text: t("acc.signOutHint") }),
        del ? deletePanel() : h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn small ghost", id: "acc-del-open", text: t("acc.del.open"),
          onclick: () => { del = { keep: true, step: null, error: null }; draw(account()); } })]));
    } else if (s.status === "loading") {
      kids.push(h("p", { cls: "small", text: t("acc.loading") }));
    } else if (s.status === "unreachable") {
      kids.push(h("p", { cls: "small", text: t("acc.unreachable") }),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn", text: t("acc.retry"), onclick: () => connect() })]));
    } else if (app !== null) {
      kids.push(h("p", { cls: "small", text: t("acc.why") }), inAppNote(app), installHelp());
    } else {
      kids.push(h("p", { cls: "small", text: t("acc.why") }),
        s.cont ? h("p", { cls: "small", text: t("acc.cont.hint") }) : null,
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "acc-in", text: t(s.cont ? "acc.cont" : "acc.signIn"), onclick: () => signIn() })]),
        h("p", { cls: "hint", text: t("acc.firstSync") }), installHelp());
    }
    if (s.error) kids.push(h("p", { cls: "small", role: "alert", text: t("acc.err." + s.error) }));
    // While deleting, the account signs out on its own at the end: keep showing the progress, not the sign-in button.
    if (del?.step && s.status !== "in") kids.splice(1, kids.length - 1, h("p", { cls: "small", role: "status", text: t("acc.del.step." + del.step) }));
    fill(box, kids);
  };
  draw(account());
  const off = onAccount((s) => { if (!box.isConnected) return off(); draw(s); });
  return box;
}
