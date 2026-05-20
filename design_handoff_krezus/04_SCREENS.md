# 04 — Screens

Szczegółowy opis każdego z 9 ekranów. Każda sekcja podaje: cel, layout, pola, akcje, mikrointerakcje. Plik referencyjny w nawiasie po nazwie ekranu.

**Kolejność implementacji:** Auth → Summary → Envelope → Expenses → Incomes → Categories → Simulation → Analytics → Savings → Settings. Auth jest pierwszy bo nie zależy od shellu. Potem Summary bo jest najgęstszy — zaimplementowanie go wymusza większość komponentów.

---

## 1. Auth (`sections2.jsx::AuthScreen`)

Pełen layout w **02_LAYOUT_SHELL.md §5**.

**Stany:**
- `tab` ∈ `"login" | "register" | "forgot" | "forgot-sent"`
- Po submit `login`/`register` → wywołaj `onLogin()` (które przełącza app na zalogowany).

**Walidacja:** w prototypie brak. W produkcji: email wymagany + format, hasło min 6 znaków, przy register potwierdzenie zgodne.

---

## 2. Summary / Podsumowanie (`sections.jsx::SummarySection`)

**Cel:** pulpit. Wszystko najważniejsze na jednym ekranie. Najbardziej złożony widok — implementuj go drugiego, po Auth.

**Struktura (kolumna, gap 20px):**

### 2.1 Hero row — 2 karty side-by-side
`display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px`

**Karta A — "Dostępne środki":**
- Padding 24px, position relative.
- Top row (flex justify-between, wrap):
  - Lewa kolumna:
    - Label uppercase: `Dostępne środki` (12px / 600 / 0.08em / `--ink-3`)
    - Wartość: `14 380,42` mono, font-size `clamp(28px, 5.5vw, 44px)`, weight 500, letter-spacing -0.03em, line-height 1.05, margin-top 8. Sufiks `zł` w 0.45em, `--ink-3`, weight 400.
    - Pod wartością: tag `success dot` z tekstem "Po odjęciu oszczędności 3 200,00 zł".
  - Prawa kolumna (`flex-shrink: 0`): segmented `7d | 30d | 90d` (7d aktywny).
- Sparkline (margin-top 20px, height 56), data: ostatnie 30 dni z `Data.spendSeries`.
- Pod sparkline (margin-top 16px, gap 24, font 12):
  - "Średnia 7-dniowa wydatków **123,45 zł**" (strong z `.num`)
  - Delta: `+3.1% vs poprzedni tydzień` (z trend icon) — kolor wg znaku.

**Karta B — "Koperta dnia (mini)":**
- Flex row, gap 20, align-center.
- Po lewej: `<RingGauge size={160}>` z `Data.envelopeSpent / Data.envelopeAmount`, label "Koperta dnia", sublabel "z 178,20 zł".
- Po prawej (`flex: 1`):
  - Heading "Dziś, 15 maja 2026" (13/500 mb 8).
  - 3 wiersze label/value:
    - Wydano: `64,30 zł`
    - Mediana 30d: `156,40 zł`
    - Pozostały dzień: `~12h`
  - Button "Szczegóły koperty →" (btn sm, width 100%, margin-top 12) — przenosi na `envelope`.

### 2.2 "Wydatki w okresach" (card)
Card header: `<h3>Wydatki w okresach</h3>` + sub `Aktywny okres budżetowy: 1–31 maja` + actions: `<button class="btn sm ghost">Eksportuj</button>`.

`.stat-grid` z 4 statami:
- Dziś · `Fmt.zl(Data.todayExpenses)` · delta `-12.4%` `down good` · sub "vs średnia"
- Ten tydzień · `Fmt.zl(Data.weekExpenses)` · `+3.1%` `up bad`
- Ten miesiąc · `Fmt.zl(Data.monthExpenses)` · `-8.6%` `down good`
- Średnia dzienna · `Fmt.zl(monthExpenses/15)` · sub "z ostatnich 30 dni"

### 2.3 "Limity dzienne" — kafelki LimitTile
Header (row between, margin-bottom 14):
- Lewa: h3 "Limity dzienne" (16px) + sub `Limit „realny" zakłada brak wpływu. „Planowany" zakłada że wpływ dotrze. Każdy kafel = jeden planowany przychód.`
- Prawa: "Wyliczono: 15.05.2026, 12:34" (mono dla daty).

Siatka: `repeat(auto-fit, minmax(320px, 1fr))`, gap 14.

**LimitTile** (jeden na każdy `Data.plannedLimits`):
- Card, padding 16, gap 12. Pierwszy kafel: tło `--accent-soft`, border `color-mix(in srgb, var(--accent) 25%, var(--line))`.
- **Header row:**
  - 36×36 round-10 box z emoji ikoną źródła (`💼` dla wynagrodzenia, `🧾` faktura, `💸` zwrot, `💰` default). Tło `--surface-sunken`.
  - Tytuł = `limit.source` (14/600 / -0.005em, ellipsis).
  - Pod tytułem: `<UserChip>` + jeśli accent — tag `accent dot` "Następny" (bg=`--accent`, color=`--accent-ink`).
- **Amount + date row** (flex between, padding `8px 10px`, bg `--surface-2`, radius 8):
  - Lewa (col gap 2): label "Wpływ" (10/600 uppercase) + wartość `+8 400,00 zł` (mono 16 / 600, color `--success`).
  - Prawa (col gap 2 align-end): label "Data" (10/600 uppercase) + `15 maj · za 16d` (13/500, mute dla "za 16d").
- **Limity stacked** (border 1px `--line`, radius 10, overflow hidden):
  - Wiersz "Realny" (`Wallet` icon 11px, hint "bez wpływu", value mono 18/500, kolor `--danger` jeśli <50zł, else `--ink-1`).
  - Wiersz "Planowany" (`Sparkles` icon 11px, hint "po wpływie", value mono 18, color `--accent`, tło `color-mix(in srgb, var(--accent) 6%, transparent)`, border-top `1px --line`, label `--accent`).
  - Każdy wiersz: padding `10px 12px`, suffix `zł/d` mute 11px.
- **Stopka** (font 11 / `--ink-3`, flex between wrap):
  - "Różnica: **+25,30 zł/d**" (strong w `--success`)
  - "Zobowiązania: **1 850,00 zł**" (jeśli `plannedExpensesInWindow > 0`)

Jeśli `plannedLimits.length === 0` — zamiast siatki: `<EmptyState>` w `<div class="card">` z hintem "Dodaj przychody z typem „Planowany"" + button accent sm "Dodaj planowany przychód".

### 2.4 Bottom row — 2 karty
`display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px`

**Karta A — "Dynamika wydatków":**
- Header: h3 "Dynamika wydatków" + sub "Ostatnie 30 dni · weekendy zaakcentowane".
- `<DailyChart height={180}/>`.

**Karta B — "Nadchodzące transakcje" (flush):**
- Header w padding `16px 20px`, border-bottom: h3 "Nadchodzące transakcje" + `tag info dot` z licznikiem `{5}`.
- Lista wierszy (max 5 z planowanych expense + planowanych income, posortowanych po dacie). Każdy wiersz:
  - Flex row gap 12, padding `12px 20px`, border-bottom `1px --line`.
  - Box 36×36 radius 8 — tło `--danger-soft`/`--success-soft`, color `--danger`/`--success`, ikona `ArrowDown`/`ArrowUp` 14px.
  - Tytuł 13/500 (description lub source), ellipsis.
  - Subtitle 11px `--ink-3`: `Calendar` icon 10 + `Fmt.relativeDate(date)` + `· {cat.name}` (jeśli expense).
  - Po prawej kwota mono 13/500: `−{amt}` w `--danger` lub `+{amt}` w `--success`.

---

## 3. Envelope / Koperta dnia (`sections.jsx::EnvelopeSection`)

**Cel:** wyjaśnij co to koperta + pokaż dzisiejsze szczegóły + historia 14-dniowa.

### 3.1 Hero row — 2 karty
`grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); align-items: stretch`

**Karta A — duży ring:**
- Card, padding 32, flex column align-center, gap 16.
- `<RingGauge size={240}>` z `envelopeSpent / envelopeAmount`.
- Pod ringiem:
  - "Wydano dziś" (text-mute text-sm)
  - "64,30 z 178,20 zł" (mono 18/500, "z 178,20 zł" mute 13).
- Progress bar (width 100%, fill pct).

**Karta B — "Jak działa koperta dnia":**
- Header h3 + sub "Algorytm adaptacyjny".
- Paragraf 13px `--ink-2` mb 16: tekst:
  > "Koperta dnia to inteligentnie wyliczona kwota, jaką możesz wydać bez naruszenia długoterminowego planu. Bazuje na medianie wydatków z ostatnich 30 dni oraz dostępnym budżecie."
- Grid 2x2 `<Metric>`:
  - Mediana 30 dni · `156,40 zł`
  - Limit dzienny · `142,50 zł`
  - Pozostały dziś · `113,90 zł` (tone success)
  - Dni do końca okresu · `16`
- `<hr class="divider"/>`
- Sub-header (card-hd mb 12): h3 "Dziś o tej porze" + sub "Sugerowane tempo wydatków".
- Row flex gap 12 align-center:
  - Clock icon 14px
  - Progress success (flex 1, width 52%, fill `--success`)
  - "12:00 — 50% dnia" (num text-sm)
- Paragraf 12 `--ink-3` mt 10:
  > "O tej porze powinieneś mieć wydane około **89,10 zł**. Jesteś o **24,80 zł** pod progiem — masz zapas."

### 3.2 "Wydatki vs koperta — ostatnie 14 dni" (card)
- Header h3 + sub "Przekroczenia na czerwono".
- Słupkowy wykres 14 dni (flex row align-end gap 6, height 140):
  - Każdy słupek: tło `--accent` (lub `--danger` gdy `value > envelopeAmount`).
  - Dashed line (top dashed border `--ink-3`) pokazuje próg `envelopeAmount`.
  - Pod słupkiem skrót daty (dzień, mono 10).
- Legenda (mt 16, font 12):
  - 10×10 `--accent` square — "Wydatki w normie"
  - 10×10 `--danger` square — "Przekroczenie"
  - dashed line — "Koperta dnia (178,20 zł)"

---

## 4. Transactions — Wydatki & Przychody (`sections.jsx::TransactionsSection`)

Jeden komponent z propem `kind = "expense" | "income"`. Renderowany 2x z różnymi parametrami.

### 4.1 Top stats (grid 3 col, gap 14)
- Wydatki/Przychody w tym miesiącu · suma · delta vs poprzedni
- Średni wydatek/przychód · kwota
- Zaplanowane · suma · sub "{n} transakcji"

### 4.2 Główna karta (flush)

**Pasek narzędziowy (padding `14px 20px`, border-bottom):**
- Lewa: segmented `Wszystkie | Zrealizowane | Planowane` — sterujący `tab` state.
- Środek: input z search icon left, placeholder "Szukaj…", max-width 280, flex 1.
- Prawa (margin-left auto, flex gap 8):
  - `<Filter>` "Filtry" (btn sm)
  - **Tylko Przychody:** `<Sparkles>` "Korekta budżetu" (btn sm) — otwiera modal korekty.
  - `<Plus>` "Dodaj wydatek"/"Dodaj przychód" (btn accent sm) — otwiera modal form.

**Tabela:**
Kolumny:
- Data — `Fmt.relativeDate(date)` (500) + `time` (mute 11)
- **Tylko Wydatki:** Kategoria — `<CatBadge>`
- Opis/Źródło — text
- Użytkownik — `<UserChip>`
- Typ — tag `info dot` "Planowany" / tag `success dot` "Zrealizowany"
- Kwota — `.amount`, prefix `−`/`+`, kolor wg kind
- Akcje (`.actions`):
  - Jeśli `type === "planned"`: button sm w kolorze `--success` (border tinted), `<Check>` "Zrealizuj" — **zawsze widoczny**.
  - Plus `.row-actions` (`<Edit>` + `<Trash>` jako ghost icon-only sm) — widoczne na hover.

**Footer tabeli (tfoot):** "Suma widoczna" (col-span do amount column) + `Fmt.zl(suma)` w `.amount` weight 600.

**Pasek na dole karty (padding `12px 20px`, border-top):**
- "Wyświetlam {filtered.length} z {items.length}"
- Pagination (margin-left auto): `‹` `1` `2` `3` `›` (mock, brak logiki).

### 4.3 Modal "Nowy wydatek" / "Nowy przychód"
Form-grid 2 kolumny:
- **Kwota (zł)** — `input mono lg`, placeholder "0,00", autoFocus
- **Typ transakcji** — select `Zwykły / Planowany`
- **Data** — date input, default `Data.todayStr`
- **Godzina** — time input
- **Tylko expense:** Kategoria (full) — `<CategoryAutocomplete>`
- **Opis/Źródło** (full) — input
- **Użytkownik** (full) — 2 buttony sm flex 1 z avatarem + imieniem (pierwszy active, accent ramka)

Footer: Anuluj / Zapisz (accent).

### 4.4 Modal "Korekta budżetu" (tylko Przychody)
Nagłówek banner (padding 14, bg `--info-soft`, radius 10):
- Label "Aktualne dostępne środki" (11, mute)
- Wartość mono 24/500 w `--info`: `14 380,42 zł`

Form-grid:
- (full) Nowa kwota całkowitych środków (zł) — `input mono lg`, autoFocus + hint "Wprowadź kwotę, którą **chcesz mieć po korekcie**. System wyliczy różnicę i zapisze ją jako korektę w historii."
- (full) Powód korekty — input, placeholder "np. Błąd w rozliczeniu, korekta bankowa, zwrot z urzędu"
- Data — date input

Info box na dole (padding 12, bg `--surface-2`, radius 8, font 12):
- Icon `Info` 14, color `--ink-3` + tekst: "Korekta to różnica między obecnymi a deklarowanymi środkami. Wpisuje się jako pojedynczy wpis do historii przychodów (dodatnia lub ujemna), nie powiązana z konkretną transakcją."

Footer: Anuluj / "Wprowadź korektę" (accent).

---

## 5. Categories / Kategorie (`sections2.jsx::CategoriesSection`)

**Cel:** zarządzanie kategoriami + szybki przegląd udziału procentowego.

### 5.1 Header
- Lead: "Organizuj wydatki według własnych kategorii. Statystyki za ostatnie 30 dni."
- Po prawej: button accent "Nowa kategoria" + `<Plus>`.

### 5.2 Banner scalania (warunkowy)
Pojawia się gdy `mergeFrom` ustawione. Tło `--accent-soft`, border tinted `--accent`.
- Lewa: ikona kategorii źródłowej (kolorowa 36×36).
- Środek: "Scalanie kategorii: [emoji + nazwa]" (600) + sub "Wybierz kategorię docelową poniżej — wszystkie transakcje zostaną przeniesione, a [Nazwa] usunięte."
- Prawa: button sm "Anuluj" + `<X>`.

### 5.3 Siatka kart kategorii
`repeat(auto-fill, minmax(240px, 1fr))`, gap 14.

Każda karta:
- Padding 18.
- Header (flex row gap 10 mb 12):
  - 36×36 round-10 box z emoji ikoną w kolorze kategorii (tło `color-mix 14%`).
  - Nazwa 13/500 + sub 11px mute `{count} transakcji`.
  - Po prawej: `<CatMenu>` (kebab `<More>` ikon button → dropdown z `Edytuj / Scal z inną… / Usuń`).
- Wartość mono 20/500: `{total} zł` (zł w mute 12).
- Progress (mt 8), fill kolorem kategorii, width = `(total/totalAll)*100%`.
- "12.4% wszystkich wydatków" (mute 11, mt 6).

**Stan merge:**
- Karta source: outline `2px solid --accent`, opacity 0.6.
- Inne karty: outline `1px dashed --accent`, cursor pointer.
  - Hover overlay: `position: absolute; inset: 0; background: color-mix(in srgb, var(--accent) 8%, transparent); display: grid; place-items: center` z tagiem `accent` "Scal tutaj →".
  - Klik = wykonaj merge i wyczyść `mergeFrom`.

### 5.4 Modale
- **Nowa kategoria / Edytuj** — `<CategoryForm>`:
  - Nazwa (input), placeholder "np. Hobby"
  - Ikona (emoji) — input maxLength 2 + hint "Możesz pominąć — wybierzemy automatycznie na podstawie nazwy"
- **Usuń kategorię** — confirm modal:
  - "Czy na pewno chcesz usunąć kategorię **{emoji} {name}**?"
  - Box `--danger-soft` 13px color `--danger`: "**Uwaga:** {n} transakcji w tej kategorii zostanie odznaczone (kategoria „bez kategorii"). Aby je zachować — rozważ **scalenie** kategorii z inną zamiast usuwania."
  - Footer: Anuluj + Usuń (button z bg `--danger`, color white).

---

## 6. Simulation / Symulacja (`sections2.jsx::SimulationSection`)

**Cel:** "czy stać mnie na X zł w dacie Y?" — analiza ryzyka.

### 6.1 Lead
"Sprawdź czy w danej dacie bezpiecznie jest dokonać planowanego wydatku. Algorytm uwzględnia środki, zobowiązania, historię i twoje przyzwyczajenia."

### 6.2 Dwie karty side-by-side
`repeat(auto-fit, minmax(360px, 1fr))`, gap 20.

**Karta A — "Parametry symulacji":**
- h3.
- Pola (col):
  - Data wydatku (date input)
  - Kwota (zł) — `input mono lg`, type number + hint "Wprowadź planowaną kwotę wydatku"
  - Kategoria (select z opcją "Bez kategorii" + lista z emoji)
- Button accent "Przeanalizuj" + `<Sparkles>`.

**Karta B — Wynik:**
Tło zmienia się wg poziomu ryzyka (`risk.soft`). Animacja `background 300ms`.

**Poziomy ryzyka:**
| amount | level | title | color | soft |
|---|---|---|---|---|
| < 100 | safe | Bezpiecznie | `--success` | `--success-soft` |
| < 500 | ok | W normie | `--accent` | `--accent-soft` |
| < 1500 | warn | Zachowaj ostrożność | `oklch(0.62 0.17 60)` | `oklch(0.95 0.06 60)` |
| ≥ 1500 | risk | Ryzykowne | `--danger` | `--danger-soft` |

Header karty (flex row gap 12 mb 16):
- 48×48 round-12 z `risk.color` tłem i białą ikoną (`<Check>` dla safe/ok, `<Info>` dla warn, `<X>` dla risk).
- Tytuł:
  - Label "Wynik analizy" uppercase 11/600 0.08em w `risk.color`.
  - Tytuł risku 22/600 -0.01em.
- Po prawej (margin-left auto): kwota mono 28/500 w `risk.color`, `zł` w 14 opacity 0.6.

Grid 2x2 `<Metric>`:
- Środki po wydatku · `{after} zł`
- Nowy limit dzienny · `{newLimit} zł`
- Wpływ na limit · `±X.X%`
- Zobowiązania planowane · `{futureExpense} zł`

`<hr class="divider"/>`

h3 "Analiza krok po kroku".

Ordered list (`ol`), padding-left 18, font 13 `--ink-2`, line-height 1.7:
1. Aktualne dostępne środki: **`{availableFunds} zł`**
2. Po wydatku zostanie: **`{after} zł`**
3. Po odjęciu planowanych zobowiązań: **`{after - futureExpense} zł`**
4. Podzielone na `{daysLeft}` dni: **`{newLimit} zł/dzień`**
5. Historyczna mediana wydatków dziennych: **`{envelopeMedian} zł`** — limit PONIŻEJ/POWYŻEJ mediany

Wszystkie kwoty `.num`. Gdy `run === false` (nie kliknięto Przeanalizuj): `<EmptyState title="Brak wyników" hint="Wprowadź dane i kliknij Przeanalizuj"/>`.

---

## 7. Analytics / Analityka (`sections2.jsx::AnalyticsSection`)

**Cel:** analiza wydatków vs poprzedni okres, podział kategorii i użytkowników.

### 7.1 Top bar
- Lewa: lead "Analiza wydatków i przychodów w wybranym okresie. Porównanie z analogicznym poprzednim okresem."
- Prawa: segmented `7d | 14d | 30d | 90d | Wszystko | Własny`.

### 7.2 Karta wyboru zakresu (tylko gdy "Własny")
Row gap 12 align-end:
- "Data od" date input
- "Data do" date input
- Mute text-sm padding-bottom 10: "Zakres: **{days}** dni · porównanie z poprzedzającymi {days} dniami"

### 7.3 Stat grid (auto-fit minmax 200, gap 14)
- Wydatki w okresie · `Fmt.zl(totalExpense)` · delta vs prev · tone wg znaku (`up bad`/`down good`)
- Przychody w okresie · `Fmt.zl(totalIncome)` · delta · (`up good`/`down bad`)
- Bilans · `Fmt.zl(income - expense)` · sub "Saldo dodatnie/ujemne"
- Liczba transakcji · `{n}` · sub "{wydatkow} wydatków · {przychodow} przychodów"

### 7.4 "Porównanie z poprzednim okresem" (card)
Header h3 + sub: "{prevStart} – {prevEnd} · {days} dni".

Grid 4 kolumny gap 14, każda komórka (`ComparisonCell`):
- Tło `--surface-2`, padding 14, radius 10.
- Label 11 mute mb 6.
- Wartość mono 20/500 + jednostka mute 12 obok.
- Delta z trend icon + procent.
- "Poprzednio: {prev_value}" mute 11 mt 4.

Komórki: Suma wydatków · Suma przychodów · Liczba wydatków · Liczba przychodów. `lowerIsBetter` dla "Suma wydatków" i "Liczba wydatków".

### 7.5 Dwie karty side-by-side
`auto-fit minmax(360px, 1fr)`, gap 20.

**Karta A — "Udział kategorii":**
- Header h3 + sub "Top {min(catTotals.length, 8)}".
- `<BarChart>` top 8 kategorii (filtered po `value > 0`, sorted desc).

**Karta B — "Wydatki użytkowników":**
- Header h3.
- Lista (col): per user:
  - Row align-center gap 10 mb 8: avatar 32 (user color) + nazwa 13/500 + sub "X transakcji" / kwota mono 500.
  - Progress bar fill kolor usera, width = pct.
  - "X.X%" mute 11 mt 4 right.
- `<hr class="divider"/>`
- h3 "Top 3 kategorii" mb 12.
- Lista 3 (col gap 8):
  - Mono `#1` `#2` `#3` (mute 11 width 16).
  - 28×28 emoji box w kolorze kategorii.
  - Nazwa 13/500.
  - Kwota mono.

### 7.6 "Trend dzienny" (card pełna szerokość)
- Header h3 + sub "Wydatki w ostatnich 30 dniach".
- `<DailyChart height={200}/>`.

---

## 8. Savings / Oszczędności (`sections2.jsx::SavingsSection`)

**Cel:** wiele celów oszczędnościowych. Lewa kolumna = lista, prawa = szczegóły wybranego.

**Mockowe cele (`SAVINGS_GOALS`):**
- `g1` 🛟 Poduszka bezpieczeństwa · 8400/12000 · 2026-12-31 · zielony
- `g2` 🏖️ Wakacje w Grecji · 3200/5000 · 2026-07-01 · niebieski
- `g3` 💻 Nowy laptop · 1200/6500 · 2026-09-15 · fioletowy

### 8.1 Header
- Lead "Wiele celów oszczędnościowych. Łączna kwota odłożonych środków zostaje wyłączona z dostępnego budżetu."
- Button accent "Nowy cel" `<Plus>`.

### 8.2 Stat grid (4 col)
- Łącznie odłożone · `12 800,00 zł` · sub "z 23 500,00 zł"
- Cele aktywne · `3` · sub "0 osiągniętych"
- Postęp ogólny · `54%` · delta · tone good
- Wpłaty w tym mies. · `1 200,00 zł`

### 8.3 Dwie kolumny
`auto-fit minmax(320px, 1fr)`, gap 20.

**Karta A — Lista celów (flush):**
- Header (padding `14px 18px` border-bottom): h3 "Twoje cele" + tag z liczbą.
- Lista buttonów (1 per cel):
  - Width 100%, padding `12px 18px`, border-bottom, flex gap 12.
  - Aktywny: bg `--surface-2`, border-left `3px solid {color}`.
  - Niebieski: bg transparent, border-left `3px solid transparent`.
  - 36×36 round-10 emoji box w kolorze.
  - Nazwa 13/500 + sub (mute 11) deadline w `Fmt.relativeDate`.
  - Po prawej: % mono 12/500 + progress bar width 60 mt 4.

**Karta B — Szczegół aktywnego celu:**
- Top row (align-start mb 16):
  - 56×56 round-14 emoji box (kolor celu, font 28).
  - Tytuł 20/600 -0.01em + sub mute "Termin: **{Fmt.dateLong}** · {Fmt.relativeDate}".
  - Po prawej (row gap 6): `<Edit> Edytuj` (btn sm), `<Trash>` (btn sm danger icon-only).
- Body grid `auto 1fr` gap 24 align-center:
  - Lewa: `<RingGauge size={180}>` z `current/target`, label "Postęp", sublabel "{X}% celu".
  - Prawa (col gap 10):
    - `<Metric>` Odłożone · `{current} zł` · tone success
    - `<Metric>` Cel · `{target} zł`
    - `<Metric>` Pozostało · `{target - current} zł`
    - Button accent `<Plus> Wpłać na ten cel` (mt 6).
- `<hr class="divider"/>`
- h3 "Historia wpłat" mb 12.
- Tabela mockowa (3 wiersze):
  - Date / User / Note / Amount (+ `.amount` w `--success`).
- `<hr class="divider"/>`
- h3 "Sugestie" mb 12.
- Lista `<SuggestRow>` (col gap 10):
  - 🎯 "Przy obecnym tempie cel osiągniesz za X mies."
  - 💡 "Aby zdążyć przed [data], wpłacaj Y zł/mies."

  Box: flex gap 10, padding 12, bg `--surface-2`, radius 10. Emoji 18px + tekst 13 w `--ink-2`.

### 8.4 Modale
- **Nowy cel / Edytuj** — `<GoalForm>`:
  - (full) Nazwa celu — placeholder "np. Wakacje w Grecji"
  - Ikona (emoji) maxLength 2
  - Termin (date)
  - Kwota celu (zł) mono
  - Już odłożone (zł) mono
- **Wpłata: {nazwa celu}** — form-grid:
  - (full) Kwota wpłaty (zł) `mono lg` + hint "Kwota zostanie odjęta od dostępnych środków i dopisana do celu"
  - Data
  - Użytkownik (select)
  - (full) Notatka (opcjonalnie)
- **Usuń cel** — confirm + box `--danger-soft`: "**{current} zł** wróci do dostępnych środków. Historia wpłat zostanie zachowana w logach."

---

## 9. Settings / Ustawienia (`sections2.jsx::SettingsSection`)

**Cel:** profil, preferencje budżetu, współdzielenie, eksport, logi. Sekcje jako osobne karty pod sobą.

### 9.1 Lead
"Profil, ustawienia budżetu, eksport danych i logi."

### 9.2 Karta "Profil i bezpieczeństwo"
Header h3 + sub "Zarządzaj swoim kontem".

Form-grid:
- Wyświetlana nazwa (input, defaultValue "Sławek Sprawski") + hint "Widoczna dla innych użytkowników budżetu"
- Adres email (disabled, "slawek@example.pl") + hint "Email nie może zostać zmieniony"
- (full) Hasło — row: input password disabled "••••••••" (flex 1) + button "Zmień hasło" + `<Lock>` → otwiera modal.

Button accent "Zapisz profil" (mt 16).

**Modal "Zmień hasło":**
- Obecne hasło
- Nowe hasło + hint "Min. 6 znaków. Dobre hasło = przyszłość bez stresu."
- Powtórz nowe hasło

### 9.3 Karta "Ustawienia budżetu"
Header h3 + sub "Wpływają na obliczenia limitów".

Form-grid:
- Okres dla Koperty Dnia (select: "Najkrótszy okres (domyślnie)" / "Do końca miesiąca" / "Do następnej wypłaty") + hint
- Okres dla Dynamiki Wydatków (select: 30/14/7 dni)
- Strefa czasowa (select: "Europa/Warszawa (UTC+1)")
- Format waluty (select: "PLN — 1 234,56 zł" / "PLN — 1,234.56 zł")

Button accent "Zapisz ustawienia" (mt 16).

### 9.4 Karta "Współdzielony budżet"
Header h3 + sub "Zarządzaj dostępem rodziny".

Lista userów (każdy w wierszu z border-bottom):
- Avatar (kolor) + nazwa 500 + sub mute "Właściciel · pełen dostęp" / "Członek · edycja transakcji"
- Po prawej: jeśli owner — tag `accent` "Ty"; else — button sm "Zarządzaj".

Button (mt 12) "Zaproś użytkownika" + `<Plus>`.

### 9.5 Karta "Eksport danych"
Header h3 + sub "Format kompatybilny z LLM".
Paragraf: "Pobierz kompletne dane budżetowe (przychody, wydatki, kategorie, limity) w formacie gotowym do analizy przez ChatGPT lub Claude."
Btn row (gap 8):
- `<Download>` JSON (technical)
- `<Download>` TXT (czytelny dla LLM)
- `<Download>` CSV (Excel)

### 9.6 Karta "Logi systemu"
Header h3 + sub "Ostatnie 50 wpisów".

Row gap 24 mb 16:
- `<Metric label="Rozmiar" value="12.4 KB"/>`
- `<Metric label="Wpisy" value="47"/>`

Konsola — pre-styled box:
- `background: var(--surface-2); border-radius: 8px; padding: 12px; font-family: var(--font-mono); font-size: 11px; line-height: 1.7; color: var(--ink-2); max-height: 200px; overflow-y: auto;`
- Mockowe wpisy:
  - `15:32:14` · **EXPENSE** (success) · Dodano wydatek 87,30 zł (Spożywcze) — Sławek
  - `14:18:02` · **SAVINGS** (info) · Aktualizacja celu oszczędności: 5000 zł
  - `12:04:55` · **EXPENSE** (success) · Dodano wydatek 24,50 zł (Restauracje) — Magda
  - `11:30:21` · **AUTO** (accent) · Auto-realizacja planowanego: Spotify 23,99 zł
  - `09:15:00` · **LOGIN** (info) · Logowanie ze Slawek@example.pl
  - `08:00:00` · **SYSTEM** (`--ink-3`) · Reset koperty dnia, mediana zaktualizowana 156,40 zł

Button "Wyczyść logi" danger sm + `<Trash>` (mt 12).
