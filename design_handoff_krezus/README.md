# Handoff: Krezus — Redesign v2.0

Pakiet przekazania (handoff) dla developera pracującego w Claude Code, mający na celu wdrożenie nowego designu aplikacji Krezus do istniejącej bazy kodu.

---

## ⚠️ Najważniejsze na start — przeczytaj zanim zaczniesz cokolwiek robić

**Ten pakiet zawiera redesign aplikacji do zarządzania domowym budżetem.** Pliki w `reference_design/` to **prototyp w React+Babel (in-browser)** — nie produkcyjny kod. Twoim zadaniem nie jest skopiowanie tych plików 1:1.

**Docelowy stack:** Vanilla JavaScript (ES Modules) + Vite 7 + DOMPurify + Firebase RTDB/Auth + Vitest. **Bez React, Vue, TypeScript ani UI frameworka.**

Przepisujesz React-owy prototyp na Vanilla JS według wzorców z **`09_VANILLA_STACK_GUIDE.md`** (ten plik to mapowanie JSX → Vanilla, templating, stan, event delegation, sanityzacja).

**Fidelity:** to jest **hi-fi** — kolory, typografia, spacing, radii, cienie, copy i mikrointerakcje są DOPRACOWANE i mają być odtworzone wiernie. Nie improwizuj na poziomie wizualnym. CSS i tokeny bierzesz **1:1** z prototypu.

**Czemu ten dokument istnieje:** poprzednie próby implementacji rozjeżdżały się, bo zmiany robione były wszystkie naraz, w kilku plikach jednocześnie, bez kolejności. **Trzymaj się planu z `05_IMPLEMENTATION_PLAN.md`** (logika kroków) + wzorców z **`09_VANILLA_STACK_GUIDE.md`** (jak komponent zaprogramować w Vanilla). Po każdym kroku aplikacja musi się odpalać i być sprawdzalna.

---

## Pliki w tym pakiecie

| Plik | Co zawiera |
|---|---|
| `README.md` | Ten plik. Spis treści + kontekst. |
| `01_DESIGN_TOKENS.md` | Wszystkie zmienne CSS — kolory, typografia, spacing, radii, cienie, motyw light/dark. **Zacznij od tego.** |
| `02_LAYOUT_SHELL.md` | App shell (sidebar + topbar + content), ekran autoryzacji. |
| `03_COMPONENTS.md` | Atomowe komponenty: button, input, card, tag, modal, segmented control, stat, ring gauge, sparkline, progress bar, table itd. |
| `04_SCREENS.md` | Pełny opis każdego widoku: Podsumowanie, Koperta dnia, Wydatki, Przychody, Kategorie, Symulacja, Analityka, Oszczędności, Ustawienia. |
| `05_IMPLEMENTATION_PLAN.md` | **Krok po kroku jak to wdrożyć**, bez rozpierdolenia projektu. Każdy krok ma jasne wejście / wyjście / kryterium ukończenia. |
| `06_AUDIT_PROMPT.md` | Prompt dla Claude Code — audyt różnic między implementacją a designem. |
| `07_CLEANUP_PROMPT.md` | Prompt do usunięcia pozostałości starego stylu. |
| `08_MOBILE_MENU_PROMPT.md` | Prompt do wdrożenia menu mobilnego (drawer + hamburger). |
| `09_VANILLA_STACK_GUIDE.md` | **Mapowanie z React-owego prototypu na Vanilla JS + Vite + ES Modules + DOMPurify.** Przeczytaj jako drugi (po `01_DESIGN_TOKENS`). |
| `reference_design/` | Działający prototyp HTML do uruchomienia w przeglądarce (otwórz `Krezus Redesign.html`). **Jest w React+Babel — to tylko podgląd, nie kopiujesz 1:1.** |

---

## Co to za aplikacja

Krezus to aplikacja webowa do zarządzania **wspólnym budżetem domowym** (dla 2+ osób). Polski interfejs, PLN, model rodzinny.

**Kluczowe mechanizmy:**
- **Dostępne środki** — całkowita kasa minus oszczędności.
- **Koperta dnia** — adaptacyjny dzienny limit wydatków, liczony z mediany 30-dniowej.
- **Limity dzienne** — dwa rodzaje na każdy planowany przychód: „realny" (bez wpływu) i „planowany" (po wpływie).
- **Wydatki / Przychody** — z typem „zrealizowany" lub „planowany"; planowane transformują się w zrealizowane.
- **Kategorie** — emoji + kolor, edytowalne, scalalne.
- **Symulacja** — „czy stać mnie na X zł w dacie Y?", z analizą ryzyka.
- **Cele oszczędnościowe** — wiele celów, każdy z ringiem postępu.

---

## Ekrany (lista 9 widoków)

| # | Klucz | Tytuł | Sekcja | Co tu robi user |
|---|---|---|---|---|
| 1 | `summary` | Podsumowanie | Budżet | Pulpit: dostępne środki, koperta dnia, dynamika wydatków, limity dzienne, nadchodzące transakcje. |
| 2 | `envelope` | Koperta dnia | Budżet | Wyjaśnienie + ring postępu + porównanie z medianą + tempo dnia + wykres 14-dniowy. |
| 3 | `expenses` | Wydatki | Budżet | Tabela wszystkich wydatków, filtry, dodawanie, edycja, planowane → realizacja. |
| 4 | `incomes` | Przychody | Budżet | Jak wyżej, plus **korekta budżetu** (różnica realnych vs zaksięgowanych środków). |
| 5 | `categories` | Kategorie | Narzędzia | Karty kategorii z udziałami procentowymi, edycja / scalanie / usuwanie. |
| 6 | `simulation` | Symulacja wydatku | Narzędzia | Parametry (kwota, data, kategoria) → wynik (bezpiecznie / w normie / ostrożność / ryzykowne). |
| 7 | `analytics` | Analityka | Narzędzia | Wybór okresu, porównanie z poprzednim, udziały kategorii, podział użytkowników. |
| 8 | `savings` | Oszczędności | Narzędzia | Lista celów + szczegół wybranego (ring, wpłaty, sugestie). |
| 9 | `settings` | Ustawienia | System | Profil, budżet, współdzielenie, eksport, logi. |

Plus dwa „nie-ekrany":
- **Auth** — ekran logowania / rejestracji / reset hasła (split screen 50/50, lewa strona to brand).
- **Quick-add expense modal** — globalny modal otwierany z topbara guzikiem „+ Wydatek".

---

## Zasoby zewnętrzne

- **Fonty:** Google Fonts — `Geist` (sans, 300/400/500/600/700), `Geist Mono` (400/500/600), `Instrument Serif` (regular + italic).
- **Ikony:** Inline SVG (styl Lucide, stroke 1.5). Pełny zestaw w `reference_design/src/icons.jsx`. Możesz użyć biblioteki Lucide w React (`lucide-react`) — mapping ikon w `03_COMPONENTS.md`.
- **Emoji:** Używane dla ikon kategorii i celów oszczędnościowych — natywne, nie SVG.
- **Dane testowe:** `reference_design/src/data.jsx` — kategorie, użytkownicy, generator transakcji. Zachowaj kształt danych, podmień źródło na realny backend.

---

## Pierwsze kroki

1. **Otwórz `reference_design/Krezus Redesign.html`** w przeglądarce — to działający prototyp. Przeklikaj wszystkie 9 widoków przez sidebar. Pobaw się Tweaks (prawy dolny róg, ikona "ołówka") — przełączanie motywu kremowy↔ciemny, akcent, gęstość, zaokrąglenia.
2. **Przeczytaj `01_DESIGN_TOKENS.md`** — to fundament, wszystko z tego korzysta.
3. **Idź do `05_IMPLEMENTATION_PLAN.md`** i pracuj krok po kroku.
4. **NIE** próbuj zaimplementować wszystkiego w jednym commit. Każdy krok = osobny commit, osobna sprawdzona iteracja.

---

## Co NIE jest tu opisane

- Backend / API — strukturę danych masz w `data.jsx`, ale to mocki. Realna integracja zależy od tego co już jest w aplikacji.
- Routing — w prototypie to prosty state `section`. Wpasuj w istniejący router (React Router, Vue Router, etc.).
- Persystencja — w prototypie wszystko in-memory. Zachowaj istniejące mechanizmy zapisu.
- Walidacja formularzy — pokazany jest **wygląd** pól, hintów i błędów. Logikę walidacji wpasuj w już istniejące wzorce.
