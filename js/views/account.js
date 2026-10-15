// Account box on the home screen: optional Google sign-in and the sync state.
import { h, toast } from "../dom.js";
import { t } from "../i18n.js";
import { account, onAccount, accountAvailable, signIn, signOut, connect, moveGuests } from "../sync/cloud.js";

export function accountBox() {
  if (!accountAvailable()) return null;
  const box = h("section", { cls: "card", id: "account" });
  const draw = (s) => {
    const kids = [h("h3", { text: t("acc.title") })];
    if (s.status === "in") {
      kids.push(h("p", { cls: "small", text: t("acc.signedIn", { name: s.user.name || s.user.email, email: s.user.email }) }),
        h("p", { cls: "small", id: "acc-sync", text: t("acc.sync." + (s.sync || "offline")) }),
        s.guests ? h("div", { cls: "stack", id: "acc-guests" }, [h("p", { cls: "small", text: t("acc.guests", { n: s.guests }) }),
          h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn", id: "acc-move", text: t("acc.move"),
            onclick: () => toast(t("acc.moved", { n: moveGuests() })) })])]) : null,
        h("div", { cls: "row" }, [h("a", { cls: "btn", id: "acc-team", href: "#/team", text: t("team.title") }),
          h("button", { type: "button", cls: "btn ghost", id: "acc-out", text: t("acc.signOut"), onclick: () => signOut() })]),
        h("p", { cls: "hint", text: t("acc.signOutHint") }));
    } else if (s.status === "loading") {
      kids.push(h("p", { cls: "small", text: t("acc.loading") }));
    } else if (s.status === "unreachable") {
      kids.push(h("p", { cls: "small", text: t("acc.unreachable") }),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn", text: t("acc.retry"), onclick: () => connect() })]));
    } else {
      kids.push(h("p", { cls: "small", text: t("acc.why") }),
        h("div", { cls: "row" }, [h("button", { type: "button", cls: "btn gold", id: "acc-in", text: t("acc.signIn"), onclick: () => signIn() })]),
        h("p", { cls: "hint", text: t("acc.firstSync") }));
    }
    if (s.error) kids.push(h("p", { cls: "small", role: "alert", text: t("acc.err." + s.error) }));
    box.replaceChildren(...kids);
  };
  draw(account());
  const off = onAccount((s) => { if (!box.isConnected) return off(); draw(s); });
  return box;
}
