# 09 — Stack guide: Vanilla JS + Vite + ES Modules

**Ten dokument zastępuje React-owe wzorce w `03–05` i `06–08`** na takie, które pasują do Waszego stacku.

Stack docelowy:
- Vanilla JavaScript (ES Modules), target ES2020
- Vite 7 (build, aliasy `@`, `@modules`, `@ui`, …)
- DOMPurify (sanityzacja HTML)
- Firebase Realtime Database + Auth
- Vitest (testy)
- Czysty CSS + design tokens, **bez** preprocessora, **bez** UI frameworka
- **Bez** TypeScript, React, Vue, SSR

Prototyp referencyjny w `reference_design/` jest w React+Babel — to tylko "działający szkic do oglądania". **Nie kopiujesz go 1:1.** Tłumaczysz wzorce na Vanilla według tego dokumentu.

---

## 1. Architektura wysokopoziomowo

Proponowany podział (pasuje pod aliasy `@modules` / `@ui`):

```
src/
  main.js                # entry: bootstrap, montuje root view
  styles/
    tokens.css           # zmienne CSS z 01_DESIGN_TOKENS.md
    base.css             # reset, body, utility (.row, .col, .num, …)
    components.css       # .btn .card .tag .seg .table .progress …
    layout.css           # .app .sidebar .topbar .content
    auth.css             # styl ekranu logowania
  state/
    store.js             # mini-store (pub/sub) — patrz §3
    session.js           # auth state (Firebase) + zalogowany user
    budget.js            # dane budżetu (subskrypcja RTDB)
  ui/                    # alias @ui — atomy i wspólne komponenty
    button.js
    modal.js
    ring-gauge.js
    sparkline.js
    daily-chart.js
    bar-chart.js
    stat.js
    table.js
    category-badge.js
    user-chip.js
    empty-state.js
    icons.js             # SVG ikony jako stringi/funkcje
  modules/               # alias @modules — całe ekrany / feature'y
    shell/
      sidebar.js
      topbar.js
      app-shell.js
    auth/
      auth-screen.js
    summary/
      summary.js
      limit-tile.js
    envelope/
      envelope.js
    transactions/
      transactions.js
      transaction-form.js
      correction-modal.js
    categories/
      categories.js
      category-form.js
    simulation/
      simulation.js
    analytics/
      analytics.js
    savings/
      savings.js
      goal-form.js
    settings/
      settings.js
  data/
    firebase.js          # init Firebase
    repos/               # repozytoria (RTDB read/write)
      expenses.js
      incomes.js
      categories.js
      goals.js
  utils/
    fmt.js               # Fmt.zl, Fmt.date, Fmt.relativeDate, Fmt.pct
    dom.js               # h(), html(), on(), qs(), qsa() — patrz §2
    sanitize.js          # owrap DOMPurify z preset config
```

**Aliasy** (w `vite.config.js`):
- `@` → `src/`
- `@ui` → `src/ui/`
- `@modules` → `src/modules/`

Te ścieżki to **propozycja**. Jeśli baza już ma swoją strukturę — wpasuj się w nią, nie reorganizuj projektu pod ten dokument.

---

## 2. Templating — bez frameworka, bez JSX

### 2.1 Pattern bazowy: tagged template + DOMPurify

Funkcja pomocnicza w `utils/dom.js`:

```js
import DOMPurify from "dompurify";

/**
 * Tagged template — interpoluje wartości jako TEKST (escape'uje HTML).
 * Użyj gdy budujesz string HTML z user inputu lub dynamicznych danych.
 *
 * html`<div>${user.name}</div>` — name zostanie wyescape'owany
 *
 * Jeśli chcesz wstrzyknąć surowy HTML (np. wynik innej funkcji szablonu),
 * przekaż go owrapowany w {raw: "<b>x</b>"} — wtedy nie escape'uje.
 */
export function html(strings, ...values) {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) {
      const v = values[i];
      if (v == null || v === false) {
        // skip
      } else if (Array.isArray(v)) {
        out += v.join("");
      } else if (typeof v === "object" && "raw" in v) {
        out += v.raw;
      } else {
        out += escapeHtml(String(v));
      }
    }
  });
  return out;
}

export const raw = (s) => ({ raw: s });

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/** Sanityzuj cały drzewo HTML przed wstrzyknięciem do innerHTML.
 *  Używaj zawsze przy wstrzykiwaniu czegokolwiek co zawiera dynamiczne dane. */
export function safe(htmlString) {
  return DOMPurify.sanitize(htmlString, { ADD_ATTR: ["aria-current", "aria-pressed", "data-open", "data-theme", "data-density"] });
}

/** Stwórz DocumentFragment ze stringa HTML. */
export function frag(htmlString) {
  const t = document.createElement("template");
  t.innerHTML = safe(htmlString);
  return t.content;
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Event delegation — jeden listener na rodzicu obsługuje wszystkie dzieci pasujące do selectora. */
export function on(root, type, selector, handler) {
  root.addEventListener(type, (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  });
}
```

### 2.2 Komponent — funkcja zwracająca string HTML

Zamiast komponentu React:

```jsx
// REFERENCJA (React):
function Stat({ label, value, unit = "zł", delta, deltaTone }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value"><span>{value}</span>{unit && <span className="unit">{unit}</span>}</div>
      {delta && <div className={`delta ${deltaTone || ""}`}>{delta}</div>}
    </div>
  );
}
```

W Vanilla:

```js
// src/ui/stat.js
import { html, raw } from "@/utils/dom.js";

export function Stat({ label, value, unit = "zł", delta, deltaTone = "" }) {
  return html`
    <div class="stat">
      <div class="label">${label}</div>
      <div class="value"><span>${value}</span>${unit ? raw(`<span class="unit">${unit}</span>`) : ""}</div>
      ${delta ? raw(`<div class="delta ${deltaTone}">${delta}</div>`) : ""}
    </div>
  `;
}
```

Wywołanie z innego komponentu:

```js
import { Stat } from "@ui/stat.js";

const markup = html`
  <div class="stat-grid">
    ${raw(Stat({ label: "Dziś", value: "234,50", delta: "-12.4%", deltaTone: "down good" }))}
    ${raw(Stat({ label: "Tydzień", value: "1 432,00" }))}
  </div>
`;
container.innerHTML = safe(markup);
```

**Złota zasada:** `${zmienna}` w tagged template html — **escape'uje** HTML. `${raw(stringHtml)}` — **NIE escape'uje** (używaj tylko dla zaufanego, wygenerowanego wcześniej HTML-u). Wszystko co finalnie ląduje w `.innerHTML` przepuszczasz przez `safe()`.

### 2.3 Listy

```js
const rowsHtml = data.expenses.map(e => raw(ExpenseRow(e))).join("");
container.innerHTML = safe(html`<table class="table">${raw(rowsHtml)}</table>`);
```

Albo lepiej dla wielokrotnego użycia: użyj `<template>` w HTML + clone (patrz §2.4).

### 2.4 Powtarzające się elementy: `<template>` clone

Dla list z wieloma wierszami `<template>` jest często czystszy i szybszy niż re-budowanie stringa:

```html
<template id="tpl-expense-row">
  <tr>
    <td data-slot="date"></td>
    <td data-slot="category"></td>
    <td data-slot="description"></td>
    <td class="amount" data-slot="amount"></td>
  </tr>
</template>
```

```js
function renderExpenseRow(item) {
  const tpl = qs("#tpl-expense-row").content.cloneNode(true);
  qs("[data-slot=date]", tpl).textContent = Fmt.relativeDate(item.date);
  qs("[data-slot=description]", tpl).textContent = item.description;
  qs("[data-slot=amount]", tpl).textContent = `−${Fmt.zl(item.amount)}`;
  qs("[data-slot=category]", tpl).replaceChildren(frag(CategoryBadge(cat)));
  return tpl;
}
```

`textContent` zawsze escape'uje (nie ma problemu z XSS). Używaj go gdy tylko możesz; `innerHTML` zostaw dla strukturalnego HTML-u.

---

## 3. Stan — minimalny pub/sub store

Bez Reduxa, bez nanostore — wystarczy 30 linii:

```js
// src/state/store.js
export function createStore(initial = {}) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    set: (partial) => {
      const next = typeof partial === "function" ? partial(state) : { ...state, ...partial };
      if (Object.is(next, state)) return;
      state = next;
      subs.forEach(fn => fn(state));
    },
    subscribe: (fn) => { subs.add(fn); fn(state); return () => subs.delete(fn); },
  };
}
```

Użycie — np. globalny session store:

```js
// src/state/session.js
import { createStore } from "./store.js";
export const session = createStore({ user: null, ready: false });
```

Re-render listenera:

```js
import { session } from "@/state/session.js";
const unsub = session.subscribe(s => {
  if (!s.ready) return;
  mountApp(s.user ? "app" : "auth");
});
```

**Pattern: gdy stan się zmienia → wywołaj funkcję `render()`** tego widoku, który zależy od stanu. Funkcja `render()` buduje świeży HTML i wstawia go do kontenera. Nie martw się o "diffing" — przy aplikacji o tej skali pełen re-render fragmentu jest tani i wystarczająco szybki.

### 3.1 Lokalny stan widoku (bez globalnego store)

Dla stanu UI specyficznego dla ekranu (np. który tab jest aktywny w tabeli transakcji):

```js
export function mountTransactions(root, { kind }) {
  let state = { tab: "all", search: "", showForm: false };

  function setState(partial) {
    state = { ...state, ...partial };
    render();
  }

  function render() {
    root.innerHTML = safe(viewTemplate(state, kind));
    bindEvents();
  }

  function bindEvents() {
    on(root, "click", "[data-tab]", (e, btn) => setState({ tab: btn.dataset.tab }));
    on(root, "input", "[data-search]", (e) => setState({ search: e.target.value }));
    // …
  }

  render();
  return () => root.replaceChildren(); // cleanup
}
```

---

## 4. Eventy — delegation

Zamiast 50 `addEventListener` po każdym renderze: jeden listener na rodzicu + atrybut `data-*` na elemencie target.

```html
<button data-action="add-expense">Dodaj</button>
<button data-action="delete-expense" data-id="e123">Usuń</button>
```

```js
on(root, "click", "[data-action]", (e, btn) => {
  const action = btn.dataset.action;
  if (action === "add-expense") openAddModal();
  if (action === "delete-expense") deleteExpense(btn.dataset.id);
});
```

Listener przeżywa re-render (bo siedzi na rodzicu, którego się nie wymienia). To **eliminuje** wycieki listenerów i jest najprostszą drogą w Vanilla.

---

## 5. Ikony — SVG jako stringi

W `src/ui/icons.js`:

```js
const ic = (path, opts = {}) => {
  const size = opts.size ?? 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    width="${size}" height="${size}" fill="none" stroke="currentColor"
    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon">${path}</svg>`;
};

export const Icons = {
  Dashboard: (opts) => ic(`<rect x="3" y="3" width="7" height="9" rx="1"/>…`, opts),
  Plus:      (opts) => ic(`<path d="M12 5v14"/><path d="M5 12h14"/>`, opts),
  Menu:      (opts) => ic(`<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>`, opts),
  // … (przepisz wszystkie z reference_design/src/icons.jsx)
};
```

Użycie w szablonie:

```js
html`<button class="btn">${raw(Icons.Plus({ size: 14 }))} Dodaj</button>`
```

**Nie używaj** `lucide-react`-a (jest pod React). Możesz albo:
- Przepisać ikony z `icons.jsx` na funkcje (jak wyżej) — **rekomendacja**.
- Użyć `lucide` (paczka vanilla, bez `-react`) — to też działa, ale dodaje runtime.

---

## 6. Sanityzacja — zasady

DOMPurify jest do **sanityzacji ostatecznego HTML-u przed wstawieniem do DOM**, nie do escape'owania pojedynczych wartości.

| Sytuacja | Co użyć |
|---|---|
| Wstrzykuję tekst do elementu | `el.textContent = "…"` (nigdy `innerHTML`) |
| Buduję template z mojego (zaufanego) HTML-u + interpoluję dynamiczne stringi | `html\`…${value}…\`` z naszego `dom.js` (escape'uje wartości) |
| Wstawiam zbudowany string do DOM | `el.innerHTML = safe(htmlString)` (DOMPurify na końcu) |
| User wkleił HTML w textarea i chcę go pokazać | `el.innerHTML = DOMPurify.sanitize(userInput)` |
| Niezaufany URL w `href` | sprawdź `new URL(s)` + whitelist scheme'u |

**Reguła:** dopóki nie używasz nigdzie `innerHTML` z dynamicznym kontentem — DOMPurify nie ma co robić. On jest na wypadek gdy musisz `innerHTML` z czymś co nie jest 100% pod Twoją kontrolą.

---

## 7. Firebase — separacja warstw

Zachowaj repo-pattern (folder `src/data/repos/`):

```js
// src/data/repos/expenses.js
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "@/data/firebase.js";

export function subscribeExpenses(uid, cb) {
  const r = ref(db, `users/${uid}/expenses`);
  return onValue(r, (snap) => cb(snap.val() ?? {}));
}

export async function addExpense(uid, expense) {
  return push(ref(db, `users/${uid}/expenses`), expense);
}
```

Komponenty / widoki **nie wywołują Firebase bezpośrednio** — tylko `state/*` subskrybuje repo i pisze do store. Renderery czytają ze store.

To znacznie ułatwia testy (Vitest mocki na `src/data/repos/*`) i wymianę backendu w przyszłości.

---

## 8. Vitest — co testować

Priorytetowo:
- **`utils/fmt.js`** — łatwe testy formatu kwot, dat, procentów.
- **`state/store.js`** — subscribe/unsubscribe, immutable updates.
- **Logika obliczeń** np. `genPlannedLimits()` z `reference_design/src/data.jsx` — port do Vanilla i pokrycie testami (to **kluczowa** logika apki).
- **Komponenty UI** — sprawdź że render() zwraca DOM z odpowiednimi `data-slot` / klasami przy danym props.

Wzorzec:

```js
// stat.test.js
import { describe, it, expect } from "vitest";
import { Stat } from "@ui/stat.js";

describe("Stat", () => {
  it("renderuje label i value", () => {
    const div = document.createElement("div");
    div.innerHTML = Stat({ label: "Dziś", value: "100,00" });
    expect(div.querySelector(".label").textContent).toBe("Dziś");
    expect(div.querySelector(".value span").textContent).toBe("100,00");
  });
  it("dodaje klasę tonu do delty", () => {
    const div = document.createElement("div");
    div.innerHTML = Stat({ label: "Tydzień", value: "1", delta: "-12%", deltaTone: "down good" });
    expect(div.querySelector(".delta").className).toContain("down good");
  });
});
```

---

## 9. Mapowanie React → Vanilla — szybka ściąga

| W referencji (React) | W Vanilla |
|---|---|
| `function Foo({ a, b }) { return <div>{a}</div>; }` | `function Foo({ a, b }) { return html\`<div>${a}</div>\`; }` |
| `{cond && <X/>}` | `${cond ? raw(X()) : ""}` w template literal, lub `el.hidden = !cond` |
| `{list.map(x => <Y k={x.id}/>)}` | `${raw(list.map(x => Y(x)).join(""))}` |
| `useState` | mały store / lokalna zmienna + `render()` |
| `useEffect(() => {…}, [])` | wywołaj w mount funkcji + zwróć cleanup |
| `onClick={fn}` | `on(root, "click", "[data-action=foo]", fn)` (event delegation) |
| `className={...}` | `class="..."` |
| `style={{...}}` | `style="..."` (string CSS) lub `element.style.x = ...` |
| `<>…</>` (fragment) | string albo `DocumentFragment` |
| `useRef` | `qs("[data-ref=x]", root)` |
| `key={...}` (klucz listy) | niepotrzebne (nie ma reconciliation) |

---

## 10. CSS — bez zmian

Cała sekcja `<style>` z `reference_design/Krezus Redesign.html` przenosisz **dosłownie** do `src/styles/*.css`. Vite zaimportuje to z `main.js`:

```js
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/layout.css";
import "@/styles/components.css";
import "@/styles/auth.css";
```

**Klasy z prototypu (`.btn`, `.card`, `.tag`, …) są jedynym kontraktem między designem a kodem.** Trzymaj nazwy 1:1. Jeśli zmienisz nazwę klasy — przepisz też wszystkie szablony, które ją używają.

---

## 11. Przepisanie planu z `05_IMPLEMENTATION_PLAN.md` na Vanilla

Logika kroków jest **identyczna** — fundamenty, atomy, komponenty danych, shell, widoki — tylko sposób budowania komponentów inny. Trzymaj się 18-krokowego planu, ale przy "implementuj komponent X":

1. Stwórz plik `src/ui/x.js` (atomy) lub `src/modules/<feat>/x.js` (feature'y).
2. Eksportuj funkcję `X(props) → string HTML` (albo `mountX(root, props) → cleanup` jeśli komponent musi nasłuchiwać eventów lub trzymać stan).
3. CSS klasy bierzesz z gotowego `src/styles/components.css`.
4. Jeśli komponent ma stan → utwórz lokalny `setState/render` (patrz §3.1).
5. Eventy zawsze przez delegation z `on(...)` (§4).
6. Dynamiczne treści tylko przez `textContent` lub `safe(html\`…\`)` (§6).
7. Test w `*.test.js` (§8).

---

## 12. Smoke-test końcowy

Po wszystkim odpalasz `pnpm dev` (lub `npm run dev`) i sprawdzasz:

- [ ] Wszystkie 9 widoków + auth dostępne i nie crash'ują w konsoli.
- [ ] Brak React-owych klas DevTools — czysty DOM.
- [ ] `document.body.classList` ma poprawne `data-theme`, `data-density` z tokenów.
- [ ] Computed style na `<body>` daje `font-family: "Geist", …` i `background: rgb(246, 242, 234)` (kremowe).
- [ ] Event delegation: kliknięcie w którykolwiek nav item zmienia widok bez przebudowy całego DOM-u apki.
- [ ] DOMPurify ładuje się (sprawdź w Network panel) i nie zostawia śmieciowych `<script>` po wstrzyknięciu.
- [ ] `vitest run` — wszystkie testy zielone.
- [ ] Mobile menu (z `08_MOBILE_MENU_PROMPT.md`) działa po zwężeniu okna.

---

**Krótki TL;DR:**
React-owy prototyp to wzór wyglądu i zachowania. CSS i tokeny — bierzesz **1:1**. Komponenty — przepisujesz na **funkcje zwracające stringi HTML** + DOMPurify na wyjściu + event delegation. Stan — **mini pub/sub store** + funkcja `render()`. Firebase **za repo**. Testy w Vitest na logice i komponentach.
