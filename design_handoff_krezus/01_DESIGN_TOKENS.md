# 01 — Design Tokens

**To jest fundament. Wszystkie inne komponenty czerpią z tych zmiennych. Nie implementuj komponentów zanim te tokeny nie są ustawione.**

Wszystkie tokeny są w `:root` (motyw kremowy = domyślny) i `[data-theme="dark"]` (motyw ciemny). Definicja w `reference_design/Krezus Redesign.html` (linie ~10–80).

---

## 1. Kolory — motyw kremowy (domyślny)

| Token | Wartość | Użycie |
|---|---|---|
| `--bg` | `#F6F2EA` | Tło całej aplikacji. |
| `--surface` | `#FFFFFF` | Tło kart, inputów, panelu nawigacji. |
| `--surface-2` | `#FBF7F0` | Tło sidebara, nagłówków tabel, drugorzędne karty (Metric). |
| `--surface-sunken` | `#EFEADF` | Hover state, segmented control track, badges. |
| `--ink-1` | `#1A1611` | Podstawowy tekst, primary button bg. |
| `--ink-2` | `#524A40` | Tekst drugorzędny (labels, body w kartach). |
| `--ink-3` | `#8C8275` | Tekst trzeciorzędny (hinty, captions, placeholdery). |
| `--line` | `#E7DFD0` | Bordery, dividery. |
| `--line-strong` | `#D4C9B4` | Bordery inputów / buttonów. |

**Akcenty (oklch, tonalnie spójne):**

| Token | Wartość | Użycie |
|---|---|---|
| `--accent` | `oklch(0.66 0.13 60)` (≈ `#B07A3E`, ciepły amber) | Primary call-to-action, link, focus ring. |
| `--accent-ink` | `#FFFFFF` | Tekst na tle `--accent`. |
| `--accent-soft` | `oklch(0.95 0.04 70)` | Tinted bg dla akcentowych elementów. |
| `--success` | `oklch(0.55 0.12 155)` | Przychody, zrealizowane, "pozytywne" delty. |
| `--success-soft` | `oklch(0.94 0.05 155)` | Tła tagów / kart sukcesu. |
| `--danger` | `oklch(0.58 0.17 25)` | Wydatki, błędy, "negatywne" delty, destructive. |
| `--danger-soft` | `oklch(0.95 0.04 25)` | Tła tagów / kart danger. |
| `--info` | `oklch(0.6 0.1 245)` | Planowane transakcje, info banery. |
| `--info-soft` | `oklch(0.95 0.03 245)` | Tła tagów info. |

**Uwaga:** akcent jest **konfigurowalny** przez użytkownika (Tweaks). Dostępne presety: `#B07A3E` (amber), `#3F7A55` (zielony), `#4F5BD5` (niebieski), `#A33B3B` (czerwony), `#1A1611` (czarny). `--accent-soft` wylicza się jako `color-mix(in srgb, var(--accent) 14%, #FFFFFF)` w trybie kremowym.

---

## 2. Kolory — motyw ciemny

Aktywowany przez `[data-theme="dark"]` na `<body>`. Nadpisuje:

| Token | Wartość |
|---|---|
| `--bg` | `#131110` |
| `--surface` | `#1C1A17` |
| `--surface-2` | `#232017` |
| `--surface-sunken` | `#0E0D0B` |
| `--ink-1` | `#F2EDE3` |
| `--ink-2` | `#B7AE9F` |
| `--ink-3` | `#7A7264` |
| `--line` | `#2A2620` |
| `--line-strong` | `#3A342B` |
| `--accent` | `oklch(0.74 0.13 70)` (lżejszy akcent dla kontrastu) |
| `--accent-ink` | `#1A1611` |
| `--accent-soft` | `oklch(0.32 0.05 70)` |
| `--success-soft` | `oklch(0.3 0.05 155)` |
| `--danger-soft` | `oklch(0.3 0.06 25)` |
| `--info-soft` | `oklch(0.3 0.04 245)` |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow` | `0 4px 16px -8px rgba(0,0,0,0.5)` |
| `--shadow-lg` | `0 12px 40px -16px rgba(0,0,0,0.6)` |

`--success`, `--danger`, `--info` pozostają takie same w obu motywach (oklch jest dobrze dobrane do kontrastu).

---

## 3. Typografia

**Importy Google Fonts (do `<head>`):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
```

**Rodziny:**

| Token | Wartość | Użycie |
|---|---|---|
| `--font-sans` | `"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif` | Domyślny font całej apki. |
| `--font-mono` | `"Geist Mono", ui-monospace, monospace` | **Wszystkie wartości pieniężne, liczby, statystyki, daty technical, kody.** |
| `--font-serif` | `"Instrument Serif", "Times New Roman", serif` | Tylko: logo "K" (italic), hero tagline na auth screen (italic). |

**Globalne ustawienia body:**
```css
font-family: var(--font-sans);
font-size: 14px;
line-height: 1.5;
-webkit-font-smoothing: antialiased;
text-rendering: optimizeLegibility;
font-feature-settings: "cv11" 1, "ss01" 1;
```

**Liczby (`.num`, `.mono`):**
```css
font-family: var(--font-mono);
font-feature-settings: "tnum" 1, "zero" 1;
letter-spacing: -0.01em;
```

**Skala typograficzna (najczęstsze):**

| Element | Size | Weight | Letter-spacing |
|---|---|---|---|
| Body domyślne | 14px | 400 | — |
| `h2` (page heading) | 22px | 600 | -0.015em |
| `h3` (card heading) | 14px | 600 | -0.005em |
| Topbar `h1` | 18px | 600 | -0.01em |
| Section label (UPPERCASE) | 10–12px | 600 | 0.06–0.08em, `text-transform: uppercase` |
| Stat value (mono) | 26px | 500 | -0.02em |
| Hero "Dostępne środki" | clamp(28px, 5.5vw, 44px) | 500 | -0.03em |
| Auth tagline (serif italic) | 40px | 400 | line-height 1.05 |
| Tabela th | 11px | 500 | 0.06em, UPPERCASE, color `--ink-3` |
| Tabela td | 13px | 400 | — |
| Tag / pill | 11–12px | 500 | — |
| Hint pod inputem | 11px | 400 | color `--ink-3` |

---

## 4. Spacing & Density

Dwa tryby gęstości — przełączane przez `[data-density="compact"]` na `<body>`.

| Token | Comfortable (default) | Compact |
|---|---|---|
| `--density-pad` | `20px` (padding kart) | `14px` |
| `--density-row` | `14px` (padding wierszy tabeli) | `10px` |

**Inne stałe spacing (nie tokenizowane, ale spójne):**
- Topbar padding: `16px 32px`.
- Content padding: `28px 32px 80px`, max-width `1280px`, centered.
- Sidebar padding: `22px 16px`.
- Card gap (między kartami w widoku): `20px` (col gap), `14px` (stat grid).
- Form grid gap: `12px 16px` (row col).
- Sm-screen breakpoint: `900px` (sidebar znika, content padding `20px 16px 60px`).

---

## 5. Border radius

Tokenizowane (modyfikowalne przez Tweaks → "Zaokrąglenia"):

| Token | Sharp | **Soft (default)** | Round |
|---|---|---|---|
| `--radius-sm` | `4px` | `8px` | `12px` |
| `--radius` | `6px` | `14px` | `22px` |
| `--radius-lg` | `10px` | `20px` | `32px` |

**Niezależne** (zostają, nie skalują się z trybem):
- Buttony: `8px`
- Inputs / selects: `8px`
- Tags / pills: `999px`
- Avatar: `50%`
- Brand mark "K": `8px`
- Mała ikona w karcie / nav: `6–10px`
- Progress bar: `999px`

(W praktyce: kart i modali używaj `var(--radius)`, dla małych elementów `var(--radius-sm)`, dla dużych hero `var(--radius-lg)`.)

---

## 6. Cienie

| Token | Wartość |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(33,25,10,0.04), 0 1px 1px rgba(33,25,10,0.02)` |
| `--shadow` | `0 1px 2px rgba(33,25,10,0.04), 0 4px 16px -8px rgba(33,25,10,0.08)` |
| `--shadow-lg` | `0 12px 40px -16px rgba(33,25,10,0.18), 0 1px 2px rgba(33,25,10,0.04)` |

Użycie:
- `--shadow-sm` — active nav item, aktywny segmented button.
- `--shadow` — generic floating element (rzadko, większość kart ma border + brak cienia).
- `--shadow-lg` — modale, dropdowny, mergowanie kategorii.

---

## 7. Tranzycje

Bez globalnego tokena — używane inline:
- Hover na nav/btn: `transition: background 80ms, color 80ms`
- Button active: `transform 80ms`
- Input focus: `transition: border-color 80ms, box-shadow 80ms`
- Ring gauge fill: `transition: stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)`
- Progress bar fill: `transition: width 400ms ease`
- DailyChart bar height: `transition: height 300ms`

**Reguła:** wszystko poniżej 100ms (hover, focus) — 80ms. Animacje danych (progress, gauge): 300–600ms z ease-out.

---

## 8. Globalne miscellanea

- **Box-sizing:** `* { box-sizing: border-box; }`
- **HTML/body reset:** `margin: 0; padding: 0;`
- **Scrollbar (webkit):**
  ```css
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--ink-3); }
  ```
- **Topbar backdrop:** `background: color-mix(in srgb, var(--bg) 80%, transparent); backdrop-filter: blur(8px);` + `position: sticky; top: 0; z-index: 10;`
- **Pulse animation** (presence indicator):
  ```css
  @keyframes pulse {
    0%   { transform: scale(0.8); opacity: 0.6; }
    100% { transform: scale(2); opacity: 0; }
  }
  ```

---

## 9. Formatowanie wartości

Wszystkie kwoty PLN: `Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` — np. `14 380,42`.

Daty:
- **Krótka:** `15 maj` (pl-PL, day 2-digit + month short)
- **Długa:** `15 maja 2026` (pl-PL, day numeric + month long + year)
- **Względna:** "Dziś", "Wczoraj", "Jutro", "za 5 dni", "3 dni temu" — fallback do krótkiej dla > 7 dni.

Procenty: `+3.1%` / `-12.4%` (zawsze ze znakiem, 1 miejsce po przecinku).
