# 05 — Implementation Plan

**Czytaj uważnie. To jest serce tego handoffu.**

Poprzednie próby implementacji zawalały się, bo zmiany robione były wszystkie naraz, w wielu plikach, bez kolejności. Ten plan dzieli pracę na **18 niezależnych kroków**. Po **każdym** kroku aplikacja **MUSI** się odpalać i przechodzić ręczne sprawdzenie z checklisty.

---

## Złote zasady

1. **Jeden krok = jeden commit.** Nie łącz kroków. Nie omijaj kroków.
2. **Po każdym kroku odpal aplikację i przeklikaj.** Jeśli coś jest zepsute — napraw zanim ruszysz dalej. Nigdy nie kumuluj długu.
3. **Nie zmieniaj struktury plików istniejącego projektu.** Wpasuj się w to co już jest. Jeśli baza ma `src/components/`, dodawaj tam. Jeśli `src/views/` — tam. Bez reorganizacji "przy okazji".
4. **Nie ruszaj backendu / źródeł danych.** Ten redesign to czysto UI. Kształt danych w `reference_design/src/data.jsx` to **wzór**, nie nakaz; podmień pola na realne, ale zachowaj semantykę.
5. **Nie wprowadzaj nowych zależności bez pytania.** Wyjątek: `lucide-react` jeśli baza nie ma żadnej biblioteki ikon. Reszta — nie.
6. **Jeśli czegoś nie rozumiesz — przeczytaj odpowiedni plik referencyjny w `reference_design/`** zamiast zgadywać. Wszystkie sekcje, komponenty i dane są tam dokładnie zaimplementowane.
7. **Komentarze w kodzie po polsku, bo cała aplikacja jest po polsku.** Nazwy zmiennych po angielsku, jak w prototypie.

---

## Mapa kroków

```
FAZA 1 — Fundamenty (kroki 1–3)
  [1] Design tokens (CSS variables, motyw, fonty)
  [2] Globalne style (body, reset, scrollbar, klasy utility)
  [3] System ikon (Lucide lub odpowiednik)

FAZA 2 — Atomy (kroki 4–7)
  [4] Button + Input + Field + Form grid
  [5] Card + Card header + Tag + Segmented control
  [6] Avatar / UserChip / CategoryBadge
  [7] Modal + EmptyState + Progress bar + Metric tile

FAZA 3 — Komponenty danych (kroki 8–10)
  [8] Stat + StatGrid
  [9] RingGauge + Sparkline
  [10] BarChart + DailyChart + Table

FAZA 4 — Shell (kroki 11–12)
  [11] Sidebar (nav + brand + footer)
  [12] TopBar + Auth screen

FAZA 5 — Widoki (kroki 13–18) — każdy widok osobno
  [13] Summary (dashboard)
  [14] Envelope (koperta dnia)
  [15] Transactions (Wydatki + Przychody)
  [16] Categories
  [17] Simulation + Analytics
  [18] Savings + Settings
```

---

## FAZA 1 — Fundamenty

### Krok 1 — Design tokens

**Cel:** wprowadź zmienne CSS i fonty.

**Zadania:**
1. Dodaj importy fontów Google (Geist + Geist Mono + Instrument Serif) — `<link>` w `<head>` lub `@import` w globalnym CSS, zależnie od konwencji bazy.
2. W globalnym arkuszu stylów (np. `src/styles/tokens.css`, `src/index.css` — wpasuj w istniejącą strukturę) zdefiniuj **wszystkie** zmienne z `01_DESIGN_TOKENS.md` w `:root` (motyw kremowy) i `[data-theme="dark"]`.
3. Dodaj `[data-density="compact"]` z nadpisaniem `--density-pad` i `--density-row`.
4. Ustaw `font-family: var(--font-sans)` na `body`.

**NIE dotykaj komponentów.** Aplikacja po tym kroku może wyglądać tak samo jak wcześniej — to OK.

**Kryterium ukończenia:**
- Otwórz dev tools → Elements → :root. Widzisz wszystkie `--bg`, `--surface`, `--accent` itd.
- Dodanie `data-theme="dark"` na body w dev tools przełącza schemat kolorów.
- Fonty się ładują (network tab pokazuje `Geist`, `Geist Mono`, `Instrument Serif`).

---

### Krok 2 — Globalne style

**Cel:** reset + utility klasy używane w całej apce.

**Zadania:**
1. `* { box-sizing: border-box; }`, `html, body { margin: 0; padding: 0; }`.
2. Styl `body`: `background: var(--bg); color: var(--ink-1); font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; font-feature-settings: "cv11" 1, "ss01" 1;`.
3. Klasy utility:
   - `.num, .mono` — font-family mono, tnum + zero feature, letter-spacing -0.01em.
   - `.text-mute` (color `--ink-3`), `.text-sm` (font-size 12).
   - `.row` (flex, gap 12, align center), `.row.between` (justify-content space-between).
   - `.col` (flex column, gap 12), `.grow` (flex 1 min-width 0), `.hidden` (display none !important).
   - `.divider` — `height: 1px; background: var(--line); margin: 24px 0; border: none;`.
4. Webkit scrollbar (8px, transparent track, `--line-strong` thumb).
5. Animacja `@keyframes pulse` (dla presence indicator).

**Kryterium ukończenia:**
- Dodanie `<div class="row between"><span class="text-mute">A</span><span class="num">123,45</span></div>` w dowolnym widoku renderuje się poprawnie (mono dla liczby, spread).

---

### Krok 3 — System ikon

**Cel:** ujednolicony zestaw ikon dostępny w całej apce.

**Zadania:**
1. Jeśli baza nie ma biblioteki ikon — dodaj `lucide-react` (lub `lucide-vue-next`, etc. wg frameworka).
2. Stwórz wrapper `Icon` (lub re-eksport) z domyślnymi propsami: `strokeWidth: 1.5`, `size: 16`.
3. Stwórz mapping ze starych nazw → Lucide (tabela w `03_COMPONENTS.md` § Ikony).
4. Custom logo "K": prosty komponent SVG (rect 32×32 radius 8 currentColor + tekst K w Instrument Serif italic 22px kolor `var(--bg)`).

**Kryterium ukończenia:**
- Możesz wstawić `<Plus size={14}/>` w komponencie i się renderuje.
- Logo `K` renderuje się i można zmienić kolor przez `color: var(--accent)`.

---

## FAZA 2 — Atomy

### Krok 4 — Button + Input + Field + Form grid

**Cel:** dwa najczęstsze elementy formularzy, na nich oprze się reszta.

**Zadania:**
1. `.btn` z wariantami `primary`, `accent`, `ghost`, `danger`, modifierami `sm`, `icon-only`. Stany hover/active.
2. `.btn-row` — flex gap 8 wrap.
3. `.input`, `.select`, `.textarea` z modifierami `mono`, `lg`. Focus z border `--accent` + box-shadow `0 0 0 3px var(--accent-soft)`.
4. `.field` (flex col gap 6) z `label` i `.hint`.
5. `.form-grid` z modifierami `three` i `.full`.

**Kryterium ukończenia:** stwórz testową stronę / Storybook z każdym wariantem buttona i pola. Wszystkie style się aplikują, focus ring wygląda OK na kremowym i ciemnym.

---

### Krok 5 — Card + Tag + Segmented

**Cel:** kontener (`.card`) używany przez ~80% UI.

**Zadania:**
1. `.card`, `.card.flush`. Padding bierze `var(--density-pad)`.
2. `.card-hd` z `h3` (14/600), `.sub` (12 mute), `.card-hd-actions` (margin-left auto).
3. `h2` (22/600 -0.015em), `h3` osobno (14/600 -0.005em). `.lead` (color `--ink-2`, max-width 64ch).
4. `.tag` + warianty `success`, `danger`, `info`, `accent`. Modifier `.dot` (pseudo-element).
5. `.seg` (segmented control) z `button[aria-pressed]`.

**Kryterium ukończenia:** testowa karta z header + sub + 3 tagów różnych kolorów + segmented z aktywnym buttonem renderuje się jak w `reference_design`.

---

### Krok 6 — Avatar / UserChip / CategoryBadge

**Cel:** identyfikatory osób i kategorii.

**Zadania:**
1. `.avatar` (32×32 round, gradient bg, mono?-no, sans 12/600 białym) + modifier `.sm` (22×22 / 10).
2. Komponent `<UserChip user={...}>` — avatar sm + nazwa 12.
3. Komponent `<CatBadge cat={...} sm?>` — emoji + nazwa, tinted bg + color z `cat.color` (`color-mix` 10%).

**Kryterium ukończenia:** test z 2 userami i kategorią renderuje się jak na screenshotach Summary.

---

### Krok 7 — Modal + EmptyState + Progress + Metric

**Cel:** pomocnicze klocki użyte w wielu widokach.

**Zadania:**
1. `<Modal open onClose title footer>` z overlay + blur + max-width 480.
2. `<EmptyState title hint action>` — centered, padding 40.
3. `.progress > div` z modifierami `success`, `danger`. Animacja width 400ms.
4. `<Metric label value tone?>` — kafelka 18px mono.

**Kryterium ukończenia:** modal otwiera się klikiem, zamyka klikiem w overlay i guzikiem X. Progress bar animuje się płynnie.

---

## FAZA 3 — Komponenty danych

### Krok 8 — Stat + StatGrid

**Zadania:**
1. `<Stat label value unit delta deltaTone icon sub>`.
2. `.stat-grid` (auto-fit minmax 200 1fr, gap 14).
3. Klasy `.delta.up`, `.delta.down`, `.delta.up.good`, `.delta.down.bad` — kolor wg semantyki.

**Kryterium ukończenia:** 4-statowy grid renderuje się z poprawnymi kolorami delt (`-12.4% down good` zielony, `+3.1% up bad` czerwony).

---

### Krok 9 — RingGauge + Sparkline

**Zadania:**
1. `<RingGauge value max size label sublabel>` — SVG donut z animacją stroke-dashoffset. Logika kolorów wg progu wypełnienia.
2. `<Sparkline data height color>` — area + line path, viewBox 240×h, preserveAspectRatio none.

**Kryterium ukończenia:** ring renderuje się prawidłowo dla wartości 0%, 35%, 65%, 90% (kolor zmienia się przy 60% i 85%). Sparkline rośnie/spada zgodnie z danymi.

---

### Krok 10 — BarChart + DailyChart + Table

**Zadania:**
1. `<BarChart items={[{label,value,color,icon}]} total>` — lista poziomych progress barów z emoji.
2. `<DailyChart height>` — pionowe słupki z weekend highlight + tooltip + animacja height.
3. Style `.table` (z `.amount`, `.actions`, `.row-actions`), `tr:hover`, sticky-free `th` z UPPERCASE letter-spacing.

**Kryterium ukończenia:**
- BarChart z 8 kategoriami renderuje się z kolorami i procentami.
- DailyChart: weekendy widocznie inaczej, hover na słupek pokazuje datę+kwotę.
- Table z 5 wierszami: hover podświetla, row-actions pojawiają się na hover.

---

## FAZA 4 — Shell

### Krok 11 — Sidebar

**Zadania:**
1. `.app` grid 256px + 1fr.
2. `.sidebar` sticky 100vh, padding 22px 16px.
3. Brand block (mark 32×32 z literą K + nazwa + version pill).
4. `.nav-section-label` (UPPERCASE 10px).
5. `<NavItem item active onClick>` z badge.
6. `.sidebar-footer` z `margin-top: auto`.
7. **Mapuj nav items wg listy w `02_LAYOUT_SHELL.md §2.3`.** Badge w "Koperta" / "Wydatki" / "Przychody" / "Kategorie" bierze realne dane.

**Kryterium ukończenia:** Sidebar pokazuje 9 itemów w 3 sekcjach. Klik zmienia widok (zaślepka — wystarczy `console.log(id)`). Aktywny item ma akcent na ikonie i wyróżnione tło.

---

### Krok 12 — TopBar + Auth

**Zadania:**
1. `<TopBar title crumb actions>` — sticky, blur backdrop.
2. Mapping `section → {title, crumb}` (tabela w `02 §3`).
3. `<Presence>` pill z animacją `pulse`.
4. Domyślne `actions` w topbarze (Wydatek / Bell / Wyloguj).
5. **Auth screen** (`02 §5`) — split 50/50, taby login/register/forgot/forgot-sent. Submit → setAuth(true).

**Kryterium ukończenia:** możesz przełączać `auth` state — widzisz auth screen z brand-side + form, działają taby. Presence pulsuje (animacja).

---

## FAZA 5 — Widoki (po jednym!)

### Krok 13 — Summary

**To największy widok.** Implementuj w 4 podkrokach, weryfikując każdy z osobna.

13a. Hero row (Dostępne środki + Koperta mini)
13b. Wydatki w okresach (stat grid w karcie)
13c. Limity dzienne (siatka LimitTile)
13d. Bottom row (DailyChart card + Nadchodzące transakcje list)

Po każdym podkroku otwórz Summary i sprawdź wizualnie. Cały szczegół w `04_SCREENS.md §2`.

---

### Krok 14 — Envelope (`04 §3`)

Dwie sekcje:
- Hero row (duży ring + opis algorytmu z dwoma sub-sekcjami).
- Wykres 14-dniowy z dashed-line progu.

---

### Krok 15 — Transactions (Wydatki + Przychody) (`04 §4`)

Jeden komponent generyczny z propem `kind`. Zaimplementuj **najpierw widok Wydatków**, potem podmień prop na "income" i sprawdź czy działa też dla Przychodów (różnice: brak kolumny Kategoria, jest button "Korekta budżetu").

Modale (Nowy wydatek / Nowy przychód / Korekta budżetu) — dopiero po działającej tabeli.

---

### Krok 16 — Categories (`04 §5`)

Najprostszy z widoków. Cards grid + 3 modale (Nowa / Edytuj / Usuń). Mechanizm scalania — banner na górze + outline na kartach + click handler.

---

### Krok 17 — Simulation + Analytics

Dwa średnie widoki, blisko siebie pod względem wymagań (oba bazują na okresach/parametrach + ComparisonCells, BarChart).

17a. Simulation (`04 §6`) — formularz + dynamiczna karta wyniku z kolorami ryzyka.
17b. Analytics (`04 §7`) — selektor okresu, stat grid, 4 komórki porównania, 2 karty side-by-side (BarChart + użytkownicy), DailyChart na dole.

---

### Krok 18 — Savings + Settings

18a. Savings (`04 §8`) — lista celów + szczegół + 3 modale (Nowy / Edytuj / Wpłata / Usuń).
18b. Settings (`04 §9`) — 6 kart pod sobą. Modal "Zmień hasło".

---

## Walidacja końcowa

Po wszystkich 18 krokach, przeklikaj cały prototyp `reference_design/Krezus Redesign.html` obok swojej implementacji. Porównaj:

- [ ] Wszystkie 9 widoków + auth są dostępne i nie crash'ują.
- [ ] Sidebar zaznacza aktywny widok (kolor akcentu na ikonie).
- [ ] Topbar pokazuje correct breadcrumb dla każdego widoku.
- [ ] Wszystkie modale otwierają się i zamykają (overlay click + X).
- [ ] Tabele transakcji: filtry działają, hover pokazuje row-actions.
- [ ] Wykresy (Sparkline, DailyChart, RingGauge, BarChart) renderują się i animują.
- [ ] Wszystkie kwoty w `var(--font-mono)` z tnum.
- [ ] Polskie znaki diakrytyczne renderują się poprawnie (Geist obsługuje).
- [ ] Tryb ciemny działa (przełącz `data-theme="dark"` na body w dev tools).
- [ ] Mobile (≤ 900px): sidebar znika, content zachowuje czytelność.

---

## Jeśli się zaciąłeś

Otwórz `reference_design/Krezus Redesign.html` w przeglądarce i **odpal odpowiedni komponent w dev tools**. Wszystkie style są zdefiniowane w `<style>` na górze pliku, wszystkie komponenty React w `src/*.jsx`. To jest single source of truth — w razie wątpliwości przeczytaj kod.

**Nie zgaduj. Nie wymyślaj. Sprawdź referencję.**

Jeśli plik referencyjny jest niespójny z tym co napisano w `01–04` — **referencja wygrywa**. Te markdowny opisują INTENCJĘ; kod jest implementacją.

Powodzenia. Krok po kroku, bez skrótów.
