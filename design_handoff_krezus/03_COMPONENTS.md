# 03 — Components

Atomowe komponenty UI. Wszystkie z `reference_design/src/components.jsx` chyba że napisano inaczej. Implementuj te najpierw — całe widoki z nich się składają.

---

## Spis

1. [Button](#1-button) — primary, accent, ghost, danger, sm, icon-only
2. [Input / Select / Textarea](#2-input--select--textarea)
3. [Field (label + hint)](#3-field)
4. [Form grid](#4-form-grid)
5. [Card](#5-card)
6. [Tag / Pill](#6-tag--pill)
7. [Segmented control](#7-segmented-control)
8. [Stat](#8-stat)
9. [Ring Gauge](#9-ring-gauge)
10. [Sparkline](#10-sparkline)
11. [Bar chart (kategorie)](#11-bar-chart)
12. [Daily chart (słupki dzienne)](#12-daily-chart)
13. [Progress bar](#13-progress-bar)
14. [Table](#14-table)
15. [Avatar / UserChip](#15-avatar--userchip)
16. [CategoryBadge](#16-categorybadge)
17. [Modal](#17-modal)
18. [Empty state](#18-empty-state)
19. [Category autocomplete](#19-category-autocomplete)
20. [Metric tile (small)](#20-metric-tile)

---

## 1. Button

Klasa bazowa `.btn`, warianty modyfikatorami.

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--ink-1);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 80ms, border-color 80ms, transform 80ms;
  white-space: nowrap;
}
.btn:hover { background: var(--surface-sunken); }
.btn:active { transform: translateY(1px); }
```

**Warianty:**

| Klasa | Background | Border | Color | Użycie |
|---|---|---|---|---|
| `.btn` (default) | `--surface` | `--line-strong` | `--ink-1` | Secondary |
| `.btn.primary` | `--ink-1` | `--ink-1` | `--bg` | Primary (rzadko — zwykle używamy `.accent`) |
| `.btn.accent` | `--accent` | `--accent` | `--accent-ink` | **Główne CTA** ("Dodaj wydatek", "Zapisz", "Przeanalizuj") |
| `.btn.ghost` | transparent | transparent | `--ink-2` | Subtelne akcje, icon-only akcje |
| `.btn.danger` | inherit | `color-mix(in srgb, var(--danger) 30%, var(--line))` | `--danger` | Destruktywne |

**Rozmiary / formy:**
- `.btn.sm` — padding `5px 10px`, font 12px.
- `.btn.icon-only` — padding `6px` (kwadrat).

**Hover state:**
- Default `.btn`: bg → `--surface-sunken`
- `.btn.primary`: bg → `color-mix(in srgb, var(--ink-1) 90%, var(--bg))`
- `.btn.ghost`: bg → `--surface-sunken`, color → `--ink-1`

**Z ikoną:**
```jsx
<button className="btn accent sm">
  <Plus size={14}/> Dodaj wydatek
</button>
```
Ikona przed tekstem, `gap: 6px` zapewniony przez `.btn`.

---

## 2. Input / Select / Textarea

```css
.input, .select, .textarea {
  width: 100%;
  padding: 9px 12px;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  color: var(--ink-1);
  font: inherit;
  font-size: 13px;
  transition: border-color 80ms, box-shadow 80ms;
}
.input:focus, .select:focus, .textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.input.mono { font-family: var(--font-mono); }
.input.lg { padding: 12px 14px; font-size: 15px; }
```

Użyj `.mono` dla wszystkich pól z kwotami / liczbami / godzinami. `.lg` dla głównych pól w modalach (kwota wydatku, kwota celu).

---

## 3. Field

Wrapper label + input + hint:
```jsx
<div className="field">
  <label>Kwota (zł)</label>
  <input className="input mono lg" placeholder="0,00"/>
  <div className="hint">Wprowadź planowaną kwotę wydatku</div>
</div>
```

```css
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; font-weight: 500; color: var(--ink-2); }
.field .hint { font-size: 11px; color: var(--ink-3); }
```

---

## 4. Form grid

```css
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.form-grid.three { grid-template-columns: 1fr 1fr 1fr; }
.form-grid > .full { grid-column: 1 / -1; }
```

Domyślnie 2 kolumny. Pole rozciągnięte na całą szerokość: dopisz klasę `full` do `.field`.

---

## 5. Card

```css
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--density-pad);
}
.card.flush { padding: 0; overflow: hidden; }
```

`.card.flush` używamy gdy w środku jest tabela albo lista wierszy borderowanych — wtedy paddingi są wewnątrz wierszy, nie na karcie.

**Card header:**
```jsx
<div className="card-hd">
  <h3>Tytuł karty</h3>
  <span className="sub">Opcjonalny podpis</span>
  <div className="card-hd-actions">
    <button className="btn sm ghost">Eksportuj</button>
  </div>
</div>
```

```css
.card-hd {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.card-hd h3 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: -0.005em; }
.card-hd .sub { font-size: 12px; color: var(--ink-3); }
.card-hd-actions { margin-left: auto; display: flex; gap: 6px; }
```

---

## 6. Tag / Pill

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  background: var(--surface-sunken);
  color: var(--ink-2);
  border: 1px solid var(--line);
}
.tag.success { background: var(--success-soft); color: var(--success); border-color: transparent; }
.tag.danger  { background: var(--danger-soft);  color: var(--danger);  border-color: transparent; }
.tag.info    { background: var(--info-soft);    color: var(--info);    border-color: transparent; }
.tag.accent  { background: var(--accent-soft);  color: var(--accent);  border-color: transparent; }
.tag.dot::before {
  content: "";
  width: 5px; height: 5px;
  background: currentColor;
  border-radius: 50%;
  flex-shrink: 0;
}
```

Użycie kolorów wg semantyki:
- `success` = zrealizowany przychód, "saldo dodatnie"
- `danger` = zrealizowany wydatek, błąd
- `info` = "Planowany" badge na transakcjach
- `accent` = wyróżnione akcje, "Nowa" badge w autocomplete, "Następny" w limit tile

---

## 7. Segmented control

```jsx
<div className="seg">
  <button aria-pressed="true">7d</button>
  <button>30d</button>
  <button>90d</button>
</div>
```

```css
.seg {
  display: inline-flex;
  background: var(--surface-sunken);
  padding: 3px;
  border-radius: 8px;
  gap: 2px;
}
.seg button {
  border: none;
  background: transparent;
  padding: 5px 12px;
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-2);
  cursor: pointer;
}
.seg button[aria-pressed="true"] {
  background: var(--surface);
  color: var(--ink-1);
  box-shadow: var(--shadow-sm);
}
```

Użycie: zakres czasu (7d/30d/90d), tryb tabeli (Wszystkie/Zrealizowane/Planowane), auth tab (Logowanie/Rejestracja).

---

## 8. Stat

Kafelka z metryką. Używana wewnątrz `.stat-grid`.

```jsx
<div className="stat">
  <div className="label">
    {icon && <Icon size={12}/>} {label}
  </div>
  <div className="value">
    <span>{value}</span>
    {unit && <span className="unit">{unit}</span>}
  </div>
  {delta && (
    <div className={`delta ${deltaTone}`}>
      {delta.startsWith("-") ? <TrendDown size={11}/> : <TrendUp size={11}/>}
      {delta}
    </div>
  )}
  {sub && <div className="delta">{sub}</div>}
</div>
```

```css
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.stat .label { font-size: 12px; color: var(--ink-3); font-weight: 500; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.stat .value { font-family: var(--font-mono); font-size: 26px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.1; font-feature-settings: "tnum" 1; }
.stat .value .unit { font-size: 13px; color: var(--ink-3); font-weight: 400; margin-left: 2px; }
.stat .delta { font-size: 12px; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; color: var(--ink-3); }
.delta.up { color: var(--danger); }
.delta.down { color: var(--success); }
.delta.up.good { color: var(--success); }
.delta.down.bad { color: var(--danger); }
```

**Semantyka delty:**
- W przypadku wydatków: wzrost = źle (czerwony) → `up bad`. Spadek = dobrze → `down good`.
- W przypadku przychodów: wzrost = dobrze → `up good`. Spadek = źle → `down bad`.
- Default: `up` = czerwony, `down` = zielony (zakłada perspektywę "wydatki"). Modyfikatory `.good`/`.bad` odwracają.

`unit` (np. "zł", "%", "") — mniejszy, ink-3, po wartości.

---

## 9. Ring Gauge

SVG donut z liczbą w środku.

```jsx
<RingGauge value={64.30} max={178.20} size={200} label="Koperta dnia" sublabel="z 178,20 zł"/>
```

Renderuje:
- Donut 200×200 (lub `size`), stroke 14px.
- Track: kolor `--surface-sunken`.
- Fill: kolor wg progu wypełnienia:
  - `pct > 0.85` → `--danger`
  - `pct > 0.6` → `oklch(0.65 0.15 50)` (pomarańczowy/żółty intermediate)
  - else → `--accent`
- Stroke-linecap: round.
- Animacja `stroke-dashoffset` 600ms cubic-bezier(.2,.8,.2,1).

**Środek (centered text):**
```
[LABEL]                     (11px, --ink-3, uppercase, letter-spacing 0.06em)
123,90 zł                   (mono 26px / 500 / letter-spacing -0.02em)
sublabel                    (12px, --ink-3, mt 2px)
```

**Renderuje liczbę POZOSTAŁĄ** (`max - value`), nie spent — to "ile masz jeszcze".

---

## 10. Sparkline

Mini wykres liniowy z wypełnieniem.

```jsx
<Sparkline data={[{date, value}, ...]} height={56} color="var(--accent)"/>
```

- ViewBox `0 0 240 height`, preserve aspect ratio "none" (rozciąga się na 100% szerokości).
- Path: linia 1.5px, round join/cap, kolor `--accent` (lub override).
- Area pod linią: ten sam kolor, opacity 0.1.

Skala Y: 0 do max(data). 30 dni = 30 punktów.

---

## 11. Bar chart

Lista poziomych słupków per kategoria.

```jsx
<BarChart items={[{label, value, color, icon}, ...]} total={totalAll}/>
```

Każdy item:
- 24×24 box z emoji ikoną, tło `color-mix(in srgb, ${color} 14%, transparent)`, color `${color}`.
- Label + suma (mono, `--ink-3`, "Fmt.zl(value) zł · 12.3%").
- Progress bar (6px height, radius 999, fill kolor kategorii, max width = pct).

Wertycznie: gap 10px.

---

## 12. Daily chart

Słupki per dzień (30 dni domyślnie).

```jsx
<DailyChart height={180}/>
```

Detale:
- Flex row align-end, gap 4px, podpisy ostatniego rzędu skips co 5 dni.
- Każdy słupek: width `flex: 1`, height proporcjonalna do max. Min 2px.
- **Weekendy** (sobota/niedziela): tło `--accent-soft`. **Robocze:** tło `color-mix(in srgb, var(--accent) 25%, transparent)`.
- Górny pasek 2px solid `--accent` (jak "cherry on top").
- Border-radius 3px.
- Hover: tytuł = "data: kwota zł".
- Animacja height 300ms.

---

## 13. Progress bar

```jsx
<div className="progress"><div style={{ width: pct + "%" }}/></div>
```

```css
.progress {
  height: 6px;
  background: var(--surface-sunken);
  border-radius: 999px;
  overflow: hidden;
}
.progress > div {
  height: 100%;
  background: var(--accent);
  border-radius: inherit;
  transition: width 400ms ease;
}
.progress.danger > div { background: var(--danger); }
.progress.success > div { background: var(--success); }
```

Wewnętrzny `<div>` można nadpisać inline `style={{ width: pct + "%", background: customColor }}` — np. kolor kategorii.

---

## 14. Table

```css
table.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th {
  text-align: left;
  font-weight: 500;
  color: var(--ink-3);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
}
.table td {
  padding: var(--density-row) 14px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: var(--surface-2); }
.table .amount { font-family: var(--font-mono); font-feature-settings: "tnum" 1; text-align: right; }
.table .actions { width: 1px; text-align: right; white-space: nowrap; }
.table .row-actions { display: inline-flex; gap: 2px; opacity: 0; transition: opacity 80ms; }
.table tr:hover .row-actions { opacity: 1; }
```

**Konwencja kolumny `.amount`:**
- Wydatki: prefix `−` (minus typograficzny), color `--danger`.
- Przychody: prefix `+`, color `--success`.

**Row actions:** edit/delete ikona pojawiają się tylko na hover (`opacity: 0 → 1`). Akcje typu "Zrealizuj" (dla planowanych) są **zawsze widoczne**.

**tfoot:** suma widocznych wierszy, fontWeight 500–600, padding jak td.

---

## 15. Avatar / UserChip

**Avatar (samodzielny):**
```jsx
<div className="avatar">SŁ</div>          {/* 32×32 */}
<div className="avatar sm">MA</div>        {/* 22×22 */}
```

```css
.avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent) 0%, oklch(0.55 0.13 30) 100%);
  color: var(--accent-ink);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.avatar.sm { width: 22px; height: 22px; font-size: 10px; }
```

Tło per user — możesz nadpisać inline `style={{ background: user.color }}`.

**UserChip** (avatar + imię, używane w tabelach i nagłówkach):
```jsx
<UserChip user={user}/>
// renderuje:
<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
  <span className="avatar sm" style={{ background: user.color }}>{user.initials}</span>
  <span style={{ fontSize: 12 }}>{user.name}</span>
</span>
```

---

## 16. CategoryBadge

Pill z emoji + nazwa kategorii w kolorze kategorii.

```jsx
<CatBadge cat={cat}/>     {/* normal */}
<CatBadge cat={cat} sm/>   {/* small */}
```

```jsx
<span style={{
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: sm ? "1px 6px" : "2px 8px",
  borderRadius: 999, fontSize: sm ? 11 : 12, fontWeight: 500,
  background: `color-mix(in srgb, ${cat.color} 10%, transparent)`,
  color: cat.color,
}}>
  <span>{cat.icon}</span>
  <span>{cat.name}</span>
</span>
```

---

## 17. Modal

Centered, blurred backdrop, click-outside-to-close.

```jsx
<Modal open={open} onClose={onClose} title="Tytuł"
  footer={<><button className="btn" onClick={onClose}>Anuluj</button><button className="btn accent" onClick={onClose}>Zapisz</button></>}>
  {content}
</Modal>
```

**Struktura:**
- Overlay: `position: fixed; inset: 0; background: color-mix(in srgb, var(--ink-1) 50%, transparent); backdrop-filter: blur(4px); z-index: 100; display: grid; place-items: center; padding: 20px;`
- Karta: `max-width: 480px; width: 100%; box-shadow: var(--shadow-lg); padding: 0;`
- Header (padding `16px 20px`, border-bottom `1px --line`): tytuł `h3` (flex 1) + X button (ghost icon-only).
- Body: padding 20px.
- Footer (jeśli przekazany): padding `12px 20px`, border-top `1px --line`, flex justify-end, gap 8.

Click on overlay zamyka. Click w karcie — propagation stopped.

---

## 18. Empty state

```jsx
<EmptyState title="Brak transakcji" hint="Spróbuj zmienić filtry lub dodaj nową" action={<button className="btn accent sm">Dodaj</button>}/>
```

Renderuje: środkowany blok, padding 40px, color `--ink-3`. Tytuł 14/500 w `--ink-2`, hint 12px, akcja na dole (mt 16px).

---

## 19. Category autocomplete

Złożony komponent. Pełny kod w `reference_design/src/components.jsx::CategoryAutocomplete`.

**Behawior:**
- Input z ikoną search lewa + ikoną X (clear) prawa (gdy ma wartość).
- Pod inputem **gdy zamknięty i pusty:** 4 chips najczęstszych kategorii do quick-pick.
- Po focusie / wpisaniu: dropdown z listą pasujących kategorii.
- Każda pozycja: kolorowa kafelka 26×26 z emoji + nazwa + licznik transakcji (po prawej, mute).
- Jeśli wpisany tekst **nie pasuje** do żadnej istniejącej, pierwszy item = "Stwórz: „X"" z plus icon w `--accent`, tag "Nowa".
- Klik poza zamyka dropdown.

Dropdown: `position: absolute; top: calc(100% + 4px); left/right 0; max-height: 280px; overflow-y: auto; padding: 4px;`, ze `shadow-lg`.

---

## 20. Metric tile

Mała kafelka na sztywne metryki w siatce 2×N. Używana w Koperta, Symulacja, Oszczędności, Settings/Logs.

```jsx
<Metric label="Mediana 30 dni" value="156,40 zł"/>
<Metric label="Pozostały dziś" value="113,90 zł" tone="success"/>
```

```jsx
<div style={{ padding: 14, background: "var(--surface-2)", borderRadius: 8 }}>
  <div className="text-mute text-sm" style={{ fontSize: 11, marginBottom: 4 }}>{label}</div>
  <div className="num" style={{ fontSize: 18, fontWeight: 500, color: tone === "success" ? "var(--success)" : "var(--ink-1)" }}>{value}</div>
</div>
```

---

## Ikony — mapping do Lucide

W React produkcyjnym **użyj `lucide-react`** (jeśli baza tego nie ma, dodaj). Mapping z `icons.jsx` na nazwy Lucide:

| W prototypie | Lucide nazwa | Użycie |
|---|---|---|
| `Dashboard` | `LayoutDashboard` | Nav: Podsumowanie |
| `Envelope` | `Mail` | Nav: Koperta dnia |
| `ArrowDown` | `ArrowDownToLine` lub `ArrowDown` | Nav: Wydatki, transakcje |
| `ArrowUp` | `ArrowUpFromLine` lub `ArrowUp` | Nav: Przychody, transakcje |
| `Tag` | `Tag` | Nav: Kategorie |
| `Crystal` | `Gem` lub `Sparkle` | Nav: Symulacja |
| `Chart` | `LineChart` lub `BarChart3` | Nav: Analityka |
| `Target` | `Target` | Nav: Oszczędności |
| `Settings` | `Settings` | Nav: Ustawienia |
| `Plus` | `Plus` | Add buttons |
| `Search` | `Search` | Inputy z search |
| `Filter` | `Filter` | Filter button |
| `Edit` | `Pencil` lub `Edit3` | Row actions |
| `Trash` | `Trash2` | Delete |
| `More` | `MoreHorizontal` | Menu kebab |
| `Check` | `Check` | Confirm, success |
| `X` | `X` | Close, cancel |
| `Calendar` | `Calendar` | Daty |
| `Clock` | `Clock` | Godzina, "Dziś o tej porze" |
| `TrendUp` | `TrendingUp` | Delty up |
| `TrendDown` | `TrendingDown` | Delty down |
| `Wallet` | `Wallet` | Limit "Realny" |
| `Sparkles` | `Sparkles` | Limit "Planowany", "Korekta budżetu", AI |
| `Users` | `Users` | Współdzielenie |
| `Bell` | `Bell` | Powiadomienia |
| `Download` | `Download` | Eksport |
| `Lock` | `Lock` | Zmień hasło |
| `Logout` | `LogOut` | Wyloguj |
| `Eye` | `Eye` | Pokaż hasło |
| `Info` | `Info` | Info banners |
| `Shield` | `Shield` | Bezpieczeństwo |
| `Banknote` | `Banknote` | Niewykorzystane — może w przyszłości |
| `Logo` | (custom SVG) | Brand mark |

Domyślny rozmiar ikony: **16px**. W kartach często 14px, w mniejszych kontekstach 11–13px. Stroke 1.5px (default Lucide).

**Logo "K":** zachowaj jako custom — rect 32×32 zaokrąglony 8px, w środku `Instrument Serif` italic 22px litera K. Kolor tła = `currentColor`, litera = `var(--bg)`. Implementacja w `icons.jsx::Logo`.
