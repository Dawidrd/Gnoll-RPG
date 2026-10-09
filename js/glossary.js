// Hover/tap explanations for game terms. Each entry has a pattern per language.
import { h } from "./dom.js";
import { lang, tr } from "./i18n.js";

const L = "\\p{L}*"; // any word ending, for Polish inflection
const G = [
  { id: "attack", re: { pl: "\\bAttack\\b", en: "\\bAttack\\b" }, title: { pl: "Attack (Atak)", en: "Attack" },
    text: { pl: "Akcja: atakujesz bronią albo ciosem. Każdy cios możesz zamienić na chwyt (Grapple) albo pchnięcie (Shove).", en: "Action: attack with a weapon or unarmed strike. Any strike can be replaced with a Grapple or Shove." } },
  { id: "dash", re: { pl: "\\bDash\\b", en: "\\bDash\\b" }, title: { pl: "Dash (Sprint)", en: "Dash" },
    text: { pl: "Dodatkowy ruch równy Twojej prędkości, do końca tury.", en: "Extra movement equal to your speed for the rest of the turn." } },
  { id: "disengage", re: { pl: "\\bDisengage\\b", en: "\\bDisengage\\b" }, title: { pl: "Disengage (Odskok)", en: "Disengage" },
    text: { pl: "Do końca tury Twój ruch nie prowokuje ataków okazyjnych.", en: "Your movement doesn't provoke opportunity attacks for the rest of the turn." } },
  { id: "dodge", re: { pl: "\\bDodge\\b", en: "\\bDodge\\b" }, title: { pl: "Dodge (Unik)", en: "Dodge" },
    text: { pl: "Do Twojej następnej tury ataki na Ciebie mają Utrudnienie, a rzuty ZRĘ masz z Przewagą.", en: "Until your next turn, attacks against you have Disadvantage and you make DEX saves with Advantage." } },
  { id: "shove", re: { pl: "\\bShove\\b|pchnięci" + L, en: "\\bShove\\b" }, title: { pl: "Shove (Pchnięcie)", en: "Shove" },
    text: { pl: "Zamiast obrażeń: wróg rzuca SIŁ lub ZRĘ. Porażka = odepchnięty o 5 ft albo powalony.", en: "Instead of damage: the target makes a STR or DEX save. Fail = pushed 5 ft or knocked Prone." } },
  { id: "grapple", re: { pl: "\\bGrapple\\b|chwyt" + L, en: "\\bGrapple\\b" }, title: { pl: "Grapple (Chwyt)", en: "Grapple" },
    text: { pl: "Zamiast obrażeń: wróg rzuca SIŁ lub ZRĘ. Porażka = pochwycony, jego prędkość to 0.", en: "Instead of damage: the target makes a STR or DEX save. Fail = Grappled, its speed becomes 0." } },
  { id: "stunned", re: { pl: "\\bStunned\\b", en: "\\bStunned\\b" }, title: { pl: "Stunned (Ogłuszony)", en: "Stunned" },
    text: { pl: "Nie działa ani nie reaguje, oblewa rzuty SIŁ i ZRĘ, ataki na niego mają Przewagę.", en: "Can't act or react, fails STR and DEX saves, attacks against it have Advantage." } },
  { id: "prone", re: { pl: "\\bProne\\b|powalon" + L, en: "\\bProne\\b" }, title: { pl: "Prone (Powalony)", en: "Prone" },
    text: { pl: "Leży. Ataki wręcz na niego mają Przewagę, jego ataki Utrudnienie. Wstanie kosztuje połowę ruchu.", en: "Lying down. Melee attacks against it have Advantage, its attacks have Disadvantage. Standing up costs half its movement." } },
  { id: "adv", re: { pl: "[Pp]rzewag" + L, en: "\\b[Aa]dvantage\\b" }, title: { pl: "Przewaga (Advantage)", en: "Advantage" },
    text: { pl: "Rzucasz dwiema k20 i bierzesz lepszy wynik.", en: "Roll two d20s and take the higher." } },
  { id: "dis", re: { pl: "[Uu]trudnieni" + L, en: "\\b[Dd]isadvantage\\b" }, title: { pl: "Utrudnienie (Disadvantage)", en: "Disadvantage" },
    text: { pl: "Rzucasz dwiema k20 i bierzesz gorszy wynik.", en: "Roll two d20s and take the lower." } },
  { id: "reaction", re: { pl: "[Rr]eakcj" + L, en: "\\b[Rr]eaction\\b" }, title: { pl: "Reakcja (Reaction)", en: "Reaction" },
    text: { pl: "Jedna na rundę: odpowiedź na zdarzenie, także w turze wroga.", en: "One per round: a response to a trigger, even on an enemy's turn." } },
  { id: "bonus", re: { pl: "[Aa]kcj" + L + " bonusow" + L, en: "\\b[Bb]onus action\\b" }, title: { pl: "Akcja bonusowa (Bonus Action)", en: "Bonus Action" },
    text: { pl: "Druga, mniejsza akcja w turze. Masz ją tylko, gdy coś ją daje.", en: "A second, smaller action on your turn. You only have one when something grants it." } },
  { id: "oa", re: { pl: "[Aa]tak" + L + " okazyjn" + L, en: "\\b[Oo]pportunity attacks?\\b" }, title: { pl: "Atak okazyjny (Opportunity Attack)", en: "Opportunity Attack" },
    text: { pl: "Gdy wychodzisz z zasięgu wroga, może Cię uderzyć jako Reakcja. Chroni przed tym Disengage.", en: "When you leave an enemy's reach it can strike you as a Reaction. Disengage prevents this." } },
  { id: "dc", re: { pl: "\\bDC\\b", en: "\\bDC\\b" }, title: { pl: "DC (Stopień trudności)", en: "DC (Difficulty Class)" },
    text: { pl: "Liczba do pobicia. Wróg rzuca k20 + modyfikator; jeśli wyrzuci mniej, efekt działa.", en: "The number to beat. The target rolls d20 + modifier; below the DC, the effect works." } },
  { id: "fp", re: { pl: "Focus Points?|\\bFP\\b", en: "Focus Points?|\\bFP\\b" }, title: { pl: "Focus Points (Punkty skupienia)", en: "Focus Points" },
    text: { pl: "Energia Mnicha na techniki. Tyle, ile poziom. Wracają po krótkim odpoczynku.", en: "A Monk's energy for techniques. Equal to your level, regained on a short rest." } },
  { id: "flurry", re: { pl: "Flurry of Blows", en: "Flurry of Blows" }, title: { pl: "Flurry of Blows (Grad ciosów)", en: "Flurry of Blows" },
    text: { pl: "Za 1 FP akcja bonusowa to 2 ciosy zamiast jednego.", en: "For 1 FP your bonus action makes two unarmed strikes instead of one." } },
  { id: "pd", re: { pl: "Patient Defense", en: "Patient Defense" }, title: { pl: "Patient Defense (Cierpliwa obrona)", en: "Patient Defense" },
    text: { pl: "Akcja bonusowa: Disengage za darmo; za 1 FP Disengage i Dodge.", en: "Bonus action: free Disengage; for 1 FP, Disengage and Dodge." } },
  { id: "sotw", re: { pl: "Step of the Wind", en: "Step of the Wind" }, title: { pl: "Step of the Wind (Krok wiatru)", en: "Step of the Wind" },
    text: { pl: "Akcja bonusowa: Dash za darmo; za 1 FP Dash i Disengage, skok ×2.", en: "Bonus action: free Dash; for 1 FP, Dash and Disengage with doubled jump." } },
  { id: "hi", re: { pl: "Heroic Inspiration", en: "Heroic Inspiration" }, title: { pl: "Heroic Inspiration (Bohaterska inspiracja)", en: "Heroic Inspiration" },
    text: { pl: "Raz przerzucasz dowolną k20 i bierzesz nowy wynik.", en: "Reroll one d20 and use the new result." } },
  { id: "dark", re: { pl: "Darkvision", en: "Darkvision" }, title: { pl: "Darkvision (Widzenie w ciemności)", en: "Darkvision" },
    text: { pl: "W ciemności widzisz jak w półmroku, bez kolorów.", en: "You see in darkness as if it were dim light, without color." } },
  { id: "pb", re: { pl: "\\bPB\\b", en: "\\bPB\\b|[Pp]roficiency bonus" }, title: { pl: "PB (Premia z biegłości)", en: "Proficiency Bonus" },
    text: { pl: "Dodawana do rzeczy, w których postać jest biegła. Rośnie z poziomem.", en: "Added to anything your character is proficient in. Grows with level." } },
  { id: "rest", re: { pl: "[Kk]rótki" + L + " odpoczyn" + L + "|[Dd]ługi" + L + " odpoczyn" + L, en: "\\b[Ss]hort rest\\b|\\b[Ll]ong rest\\b" },
    title: { pl: "Odpoczynek", en: "Rest" }, text: { pl: "Krótki: ok. 1 godzina. Długi: ok. 8 godzin, raz na dobę.", en: "Short: about 1 hour. Long: about 8 hours, once per day." } },
];

let compiled = { lang: null, re: null };
function regex() {
  if (compiled.lang === lang()) return compiled.re;
  const parts = G.map((g, i) => `(?<g${i}>${g.re[lang()]})`);
  compiled = { lang: lang(), re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join("|")})(?![\\p{L}\\p{N}])`, "gu") };
  return compiled.re;
}

const SKIP = "button,input,textarea,select,label,script,style,.term,h1,h2,h3,h4,th,nav,svg,#tip";

/** Wrap known terms inside `scope` once per block. */
export function glossify(scope) {
  const re = regex();
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (!n.nodeValue.trim() || !n.parentElement || n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const txt = n.nodeValue; re.lastIndex = 0;
    const blk = n.parentElement.closest("p,li,td,dd,div") || n.parentElement;
    const used = blk.__g || (blk.__g = {});
    let m, last = 0, frag = null;
    while ((m = re.exec(txt))) {
      const key = Object.keys(m.groups).find((k) => m.groups[k] !== undefined);
      const g = G[+key.slice(1)];
      if (used[g.id]) continue; used[g.id] = 1;
      frag = frag || document.createDocumentFragment();
      frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
      frag.appendChild(h("span", { cls: "term", tabindex: "0", role: "button", "aria-expanded": "false", "data-g": key.slice(1), text: m[0] }));
      last = m.index + m[0].length;
    }
    if (frag) { frag.appendChild(document.createTextNode(txt.slice(last))); n.parentNode.replaceChild(frag, n); }
  }
}

// One shared tooltip for the whole app.
let open = null;
function showTip(el) {
  const g = G[+el.dataset.g]; let tip = document.getElementById("tip");
  if (!tip) { tip = h("div", { id: "tip", role: "tooltip" }); document.body.appendChild(tip); }
  tip.replaceChildren(h("b", { text: tr(g.title) }), document.createTextNode(tr(g.text)));
  tip.hidden = false;
  const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), innerWidth - tw - 12);
  let y = r.bottom + 8; if (y + th > innerHeight - 12) y = r.top - th - 8;
  tip.style.left = x + "px"; tip.style.top = y + "px";
  if (open && open !== el) open.setAttribute("aria-expanded", "false");
  el.setAttribute("aria-expanded", "true"); open = el;
}
function hideTip() { const tip = document.getElementById("tip"); if (tip) tip.hidden = true; if (open) open.setAttribute("aria-expanded", "false"); open = null; }

document.addEventListener("click", (e) => { const t = e.target.closest(".term"); if (t) { if (open === t) hideTip(); else showTip(t); } else hideTip(); });
document.addEventListener("mouseover", (e) => { const t = e.target.closest(".term"); if (t && matchMedia("(hover:hover)").matches) showTip(t); });
document.addEventListener("mouseout", (e) => { if (e.target.closest(".term") && matchMedia("(hover:hover)").matches) hideTip(); });
document.addEventListener("keydown", (e) => { const t = e.target.closest?.(".term"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showTip(t); } if (e.key === "Escape") hideTip(); });
addEventListener("scroll", hideTip, { passive: true });
