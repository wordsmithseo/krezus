# Prompt dla Claude Code — Audyt i naprawa odchyleń od projektu

Wklej **CAŁY** ten tekst poniżej jako wiadomość do Claude Code. Trzyma go na krótkiej smyczy — najpierw inwentaryzacja, potem naprawa po jednej rzeczy naraz.

---

## PROMPT (kopiuj od tej linii w dół)

Wdrożyłem redesign Krezusa według `design_handoff_krezus/05_IMPLEMENTATION_PLAN.md`, ale finalna apka **nie wygląda tak jak prototyp referencyjny** w `design_handoff_krezus/reference_design/Krezus Redesign.html`. Twoim zadaniem jest **najpierw zinwentaryzować różnice, potem je poprawić — strikte po kolei, krok po kroku.**

### Zasady gry

1. **NIE zaczynaj naprawiać niczego, dopóki nie skończysz pełnego audytu** (faza 1). Bez "przy okazji poprawię jeszcze X".
2. Każda naprawa = **osobny commit**, po którym czekasz na moje "OK, dalej". Bez kumulowania zmian.
3. Jeśli czegoś nie jesteś pewien jak ma wyglądać — otwórz odpowiedni plik w `design_handoff_krezus/reference_design/` i przeczytaj kod. **Referencja wygrywa z markdownami.**
4. Nie zmieniaj struktury plików projektu, nie dodawaj nowych zależności, nie ruszaj backendu / źródeł danych.

---

### FAZA 1 — Audyt (zrób CAŁY, potem pokaż mi wynik i czekaj)

Sprawdź po kolei każdą pozycję poniżej. Dla każdej napisz **PASS** albo **FAIL: <dokładny opis problemu>**. Nie naprawiaj nic w tej fazie — tylko diagnozuj.

#### A. Fundamenty (Krok 1–3 z planu)

- [ ] **A1. Zmienne CSS w `:root`** — otwórz globalny CSS. Czy są wszystkie zmienne z `01_DESIGN_TOKENS.md` (`--bg`, `--surface`, `--surface-2`, `--surface-sunken`, `--ink-1/2/3`, `--line`, `--line-strong`, `--accent`, `--accent-ink`, `--accent-soft`, `--success`, `--success-soft`, `--danger`, `--danger-soft`, `--info`, `--info-soft`, `--radius-sm/-/-lg`, `--shadow-sm/-/-lg`, `--font-sans/mono/serif`, `--density-pad`, `--density-row`)? Wymień zmienne których brakuje.

- [ ] **A2. Motyw ciemny `[data-theme="dark"]`** — czy istnieje i nadpisuje odpowiednie zmienne?

- [ ] **A3. Importy fontów** — czy w `<head>` (lub przez `@import`) ładuje się Google Fonts URL: `family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1`?

- [ ] **A4. `body` style** — czy ma ustawione: `font-family: var(--font-sans)`, `background: var(--bg)`, `color: var(--ink-1)`, `font-size: 14px`, `line-height: 1.5`?

- [ ] **A5. Klasy utility** — czy istnieją: `.num/.mono`, `.text-mute`, `.text-sm`, `.row`, `.row.between`, `.col`, `.grow`, `.hidden`, `.divider`?

- [ ] **A6. Animacja `pulse`** — czy keyframe `pulse` jest zdefiniowany (do presence indicator)?

- [ ] **A7. Ikony** — czy używasz `lucide-react` (lub odpowiednika) z mappingiem z `03_COMPONENTS.md`? Wymień ikony których jeszcze nie zmapowałeś.

#### B. Atomy (Krok 4–7)

Dla każdego komponentu otwórz go w kodzie i porównaj z definicją w `03_COMPONENTS.md`.

- [ ] **B1. `.btn`** — czy ma warianty: default, `primary`, `accent`, `ghost`, `danger`, modifiery `sm`, `icon-only`? Czy hover state działa (background → `--surface-sunken`)? Czy active ma `transform: translateY(1px)`?
- [ ] **B2. `.input/.select/.textarea`** — focus border + box-shadow (`0 0 0 3px var(--accent-soft)`)? Modifier `.mono`, `.lg`?
- [ ] **B3. `.field`** — label 12/500 ink-2, hint 11 ink-3, gap 6?
- [ ] **B4. `.form-grid`** — 2 kolumny domyślnie, `.three`, `.full` modifier?
- [ ] **B5. `.card`** — background, border, radius, padding `var(--density-pad)`? `.card.flush`?
- [ ] **B6. `.card-hd`** — h3, `.sub`, `.card-hd-actions` (margin-left auto)?
- [ ] **B7. `.tag`** — warianty `success`/`danger`/`info`/`accent` + modifier `.dot`?
- [ ] **B8. `.seg`** — segmented control z `aria-pressed`?
- [ ] **B9. `.avatar`** — 32×32 round, gradient bg, `.sm` modifier?
- [ ] **B10. `<Modal>`** — overlay z blur, max-width 480, header + body + footer, klik-poza-zamyka?
- [ ] **B11. `<EmptyState>`** — title + hint + action, padding 40 center?
- [ ] **B12. `.progress`** — 6px height, fill `--accent`, warianty `danger`/`success`?

#### C. Komponenty danych (Krok 8–10)

- [ ] **C1. `<Stat>`** — label uppercase 12/600/0.08em ink-3, value mono 26/500, delta z trend icon, klasy delty `up/down/up.good/down.bad`?
- [ ] **C2. `<RingGauge>`** — SVG donut stroke 14, kolor wg progu (>85% danger, >60% pomarańcz, else accent), animacja stroke-dashoffset 600ms, środek z label + value mono?
- [ ] **C3. `<Sparkline>`** — area + line path, kolor `--accent`, opacity 0.1 dla area?
- [ ] **C4. `<BarChart>`** — kategorie z emoji boxem + progress + procent?
- [ ] **C5. `<DailyChart>`** — słupki dzienne, weekendy w innym tle (`--accent-soft`), górny pasek 2px solid `--accent`, hover tooltip?
- [ ] **C6. `table.table`** — th UPPERCASE 11 ink-3, td padding `var(--density-row) 14px`, tr:hover background, .row-actions opacity 0 → 1 na hover, .amount font-family mono right-aligned?

#### D. Shell (Krok 11–12)

- [ ] **D1. `.app`** — `grid-template-columns: 256px 1fr`?
- [ ] **D2. Sidebar** — sticky 100vh, brand mark "K" 32×32 (serif italic) + brand-version pill, 3 sekcje (`Budżet/Narzędzia/System`), nav items z badge, footer z avatar + user-meta + logout button?
- [ ] **D3. Nav item active state** — background `--surface`, shadow-sm, ikona w kolorze `--accent`?
- [ ] **D4. `.topbar`** — sticky, blur backdrop (`color-mix(in srgb, var(--bg) 80%, transparent)` + `backdrop-filter: blur(8px)`), h1 z crumb?
- [ ] **D5. `.presence`** — pill z pulse animation + avatar.sm?
- [ ] **D6. Auth screen** — split 50/50, lewa strona `--ink-1` z radial gradient `::before`, prawa z form, taby login/register/forgot/forgot-sent?

#### E. Widoki — sprawdź wizualnie

Otwórz każdy z 9 widoków w swojej apce **obok** prototypu (`reference_design/Krezus Redesign.html` w drugim oknie). Dla każdego napisz: PASS albo lista konkretnych różnic.

- [ ] **E1. Podsumowanie** — hero "Dostępne środki" (kwota clamp 28-44px), Koperta mini, Wydatki w okresach (4 staty), Limity dzienne (kafelki LimitTile), Dynamika + Nadchodzące?
- [ ] **E2. Koperta dnia** — duży ring 240px, opis algorytmu z 4 metric, sekcja "Dziś o tej porze", wykres 14-dniowy z dashed-line progu?
- [ ] **E3. Wydatki** — 3 staty na górze, karta z segmented + search + filtry + dodaj, tabela z hover row-actions, footer z suma + pagination?
- [ ] **E4. Przychody** — jak Wydatki + button "Korekta budżetu" + osobny modal z banner info-soft?
- [ ] **E5. Kategorie** — karty kategorii w siatce z emoji box + progress + kebab menu, banner scalania na górze?
- [ ] **E6. Symulacja** — formularz parametrów + karta wyniku która zmienia kolor wg poziomu ryzyka (safe/ok/warn/risk)?
- [ ] **E7. Analityka** — segmented z okresami, stat grid, "Porównanie z poprzednim okresem" (4 ComparisonCell), BarChart kategorii + user breakdown, DailyChart?
- [ ] **E8. Oszczędności** — stat grid, lista celów (po lewej) + szczegół z ringiem + sugestie?
- [ ] **E9. Ustawienia** — 6 kart pod sobą (Profil / Budżet / Współdzielenie / Eksport / Logi)?

#### F. Detale, które łatwo przeoczyć

- [ ] **F1.** Polskie znaki diakrytyczne renderują się w Geist (sprawdź: ą ć ę ł ń ó ś ź ż)?
- [ ] **F2.** Wszystkie kwoty używają mono z tnum (sprawdź `font-feature-settings: "tnum" 1`)?
- [ ] **F3.** Format kwot to `1 234,56` (PL locale, spacja tysięcy, przecinek)?
- [ ] **F4.** Daty są po polsku (`15 maja 2026`, `Dziś`, `za 5 dni`)?
- [ ] **F5.** `--accent` jest ciepły amber `oklch(0.66 0.13 60)` (≈ `#B07A3E`), nie niebieski/szary?
- [ ] **F6.** Tło apki jest **kremowe** `#F6F2EA`, nie białe / szare?
- [ ] **F7.** Sidebar ma tło `#FBF7F0` (`--surface-2`), nie to samo co main content?
- [ ] **F8.** Mobile (zmniejsz viewport < 900px): sidebar znika, content padding się zmniejsza?

---

### FAZA 2 — Plan napraw (po audycie)

Po wykonaniu Fazy 1 pokaż mi:
1. Pełną listę PASS / FAIL.
2. **Posortowaną listę napraw od najpoważniejszych do kosmetyki:**
   - P0 = fundamenty (tokens, fonty, globalny styl, motyw) — bez tego nic nie wygląda dobrze
   - P1 = atomy (button, input, card) — używane wszędzie
   - P2 = komponenty danych (ring, sparkline, table)
   - P3 = shell (sidebar, topbar)
   - P4 = widoki
   - P5 = kosmetyka (microcopy, ikony, formatowanie)
3. Dla każdej naprawy: **plik(i) do zmiany + krótki opis czego dotyczy**.

**STOP. Czekaj na moje "OK" zanim ruszysz z naprawami.**

---

### FAZA 3 — Naprawy (jedna naraz)

Gdy zatwierdzę listę:
1. Bierzesz **jedną pozycję** z P0 (najwyższy priorytet).
2. Wprowadzasz zmianę.
3. Pokazujesz diff.
4. Czekasz na moje OK.
5. Dopiero potem następna pozycja.

Nie scalaj poprawek. Nie "rób od razu też X bo to małe". Po jednej.

---

Zaczynaj od **Fazy 1**. Pokaż mi wynik audytu.
