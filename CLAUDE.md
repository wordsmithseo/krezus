# CLAUDE.md — Krezus

Polska aplikacja do zarządzania budżetem domowym. Wdrożona na krezus.vercel.app.

## Stack

- **Frontend:** Vanilla JavaScript (ES Modules)
- **Build:** Vite 7, target es2020
- **Backend:** Firebase Realtime Database + Firebase Auth
- **Sanityzacja:** DOMPurify
- **Testy:** Vitest

```
npm run dev      # dev server na :3000
npm run build    # build do dist/
npm run preview  # podgląd buildu na :4173
npm run test     # vitest run
```

Aliasy Vite: `@` → `src/`, `@modules`, `@components`, `@utils`, `@ui`, `@handlers`.

---

## Indeks plików

### Wejście

| Plik | Odpowiedzialność |
|------|-----------------|
| `index.html` | Struktura HTML, wszystkie sekcje UI, brak inline handlerów (używa `data-action`) |
| `src/app.js` (2117 linii) | Główny orkiestrator: inicjalizacja, `onAuthChange`, `loadAllData`, `renderAll`, `renderAnalytics`, `renderCategories`, `renderLogs`, `showSection`, handlery formularzy, dependency injection dla modułów |
| `src/config/firebase.js` | Inicjalizacja Firebase (app, db, auth) — eksportuje trzy instancje |

### Moduły (logika biznesowa)

| Plik | Odpowiedzialność |
|------|-----------------|
| `src/modules/auth.js` | Firebase Auth: login, register, logout, `onAuthChange`, profil, użytkownicy budżetu (CRUD + subskrypcja real-time) |
| `src/modules/dataManager.js` | Warstwa danych: cache in-memory, load/save dla wszystkich encji (kategorie, wydatki, przychody, koperta, oszczędności, okresy), real-time listenery (`subscribeToRealtimeUpdates`), auto-migracja `realised→type`, auto-realizacja planowanych transakcji |
| `src/modules/budgetCalculator.js` (1372 linii) | Obliczenia: dostępne środki, okresy budżetowe, limity dzienne (z progresywnymi progami na ostatnie 7/3/1 dni), koperta dnia (mediana 30d), cache limitów w `localStorage`, wykrywanie anomalii, symulacja wydatku, dynamika wydatków |
| `src/modules/analytics.js` | Statystyki okresu (7/30/90/all/custom), porównanie z poprzednim okresem, top kategorie, breakdown po kategorii i użytkowniku, cache użytkowników budżetu |
| `src/modules/savingsGoalManager.js` | Zarządzanie celami oszczędzania: CRUD, wpłaty, subskrypcja real-time |
| `src/modules/savingsGoalCalculator.js` | Obliczenia dla celów oszczędzania: postęp, prognozy, sugestie |
| `src/modules/presence.js` | Wykrywanie aktywnych sesji innych użytkowników, heartbeat co 30s, throttling 500ms, animacje pulsowania |
| `src/modules/logger.js` | Zapis akcji do Firebase (max 50 wpisów), formatowanie, czyszczenie logów |
| `src/modules/chartRenderer.js` | Pomocnicze funkcje do rysowania wykresów na canvas |

### Komponenty UI

| Plik | Odpowiedzialność |
|------|-----------------|
| `src/components/modals.js` (844 linii) | Modale: profil użytkownika, zmiana hasła, edycja kategorii/wydatku/przychodu — renderują się dynamicznie |
| `src/components/confirmModal.js` | Reużywalny modal potwierdzenia (`showConfirmModal`) |
| `src/components/forms.js` | Pomocnicze funkcje dla formularzy |
| `src/components/tables.js` | Pomocnicze funkcje dla tabel |
| `src/components/summary.js` | Komponenty sekcji podsumowania |
| `src/components/savingsGoalsModals.js` | Modale dla celów oszczędzania |
| `src/components/savingsSuggestionsModal.js` | Modal sugestii oszczędzania |

### Renderowanie UI (src/ui/)

| Plik | Odpowiedzialność |
|------|-----------------|
| `src/ui/renderSummary.js` | Renderuje sekcję podsumowania: salda, kafelki limitów, dynamika wydatków |
| `src/ui/renderDailyEnvelope.js` | Renderuje kopertę dnia z paskiem gauge (gradient zielony→pomarańczowy→czerwony) |
| `src/ui/renderExpenses.js` | Tabela wydatków z paginacją, `changeExpensePage`, `setExpenseDeps` |
| `src/ui/renderIncomes.js` | Tabela przychodów z paginacją, `changeIncomePage`, `setIncomeDeps` |
| `src/ui/renderSavingsGoals.js` | Sekcja celów oszczędzania |

### Handlery zdarzeń (src/handlers/)

| Plik | Odpowiedzialność |
|------|-----------------|
| `src/handlers/clickDelegation.js` | Centralny system event delegation: `initClickDelegation(handlers)`, obsługuje wszystkie `data-action` atrybuty na poziomie `document` |
| `src/handlers/eventHandlers.js` | Dodatkowe handlery zdarzeń |
| `src/handlers/expenseHandlers.js` | CRUD wydatków: `addExpense`, `editExpense`, `deleteExpense`, `realiseExpense`, `setExpenseHandlerDeps` |
| `src/handlers/incomeHandlers.js` | CRUD przychodów: `addIncome`, `editIncome`, `deleteIncome`, `realiseIncome`, `addCorrection`, `setIncomeHandlerDeps` |
| `src/handlers/categoryHandlers.js` | CRUD kategorii: `addCategory`, `editCategory`, `deleteCategory`, `startMergeCategory`, `selectMergeTarget`, `cancelMergeCategory`, `setCategoryHandlerDeps` |

### Narzędzia (src/utils/)

| Plik | Odpowiedzialność |
|------|-----------------|
| `src/utils/constants.js` | Stałe: `PAGINATION`, `DAILY_ENVELOPE`, `ADMIN`, `VALIDATION_LIMITS`, `TRANSACTION_TYPES`, `CHART_COLORS`, `ANIMATION_DELAYS`, `BREAKPOINTS` |
| `src/utils/validators.js` | Walidacja pól formularzy, `attachValidator` |
| `src/utils/sanitizer.js` | `sanitizeHTML` (DOMPurify), `escapeHTML` — używane przed renderowaniem i zapisem |
| `src/utils/iconMapper.js` | Mapowanie nazwy kategorii → emoji, fuzzy matching (Levenshtein), >150 słów kluczowych |
| `src/utils/dateHelpers.js` | Daty w strefie Warsaw: `getWarsawDateString`, `getCurrentTimeString`, `shouldBeRealisedNow` |
| `src/utils/errorHandler.js` | `showErrorMessage`, `showSuccessMessage`, `initGlobalErrorHandler` |
| `src/utils/llmExport.js` | Eksport danych budżetowych do JSON/TXT dla analizy przez LLM |
| `src/utils/uiHelpers.js` | Pomocnicze funkcje UI |
| `src/utils/animateNumber.js` | Animacja liczb (płynna zmiana wartości) |
| `src/utils/countdownTimer.js` | Odliczanie do daty |
| `src/utils/globalHandlers.js` | Lista globalnych handlerów (dokumentacja) |
| `src/utils/version.js` | `initVersion` — wyświetla wersję w nagłówku |

### Style (src/styles/)

Podział na design tokeny i komponenty:

```
tokens/     colors.css, spacing.css, typography.css, shadows.css, animations.css
layout/     header.css, navigation.css, container.css, footer.css, auth.css
components/ buttons.css, cards.css, modals.css, forms.css, tables.css, lists.css, badges.css, misc.css
utilities/  utilities.css
base.css    reset i bazowe style
main.css    entry point importujący wszystkie powyższe
```

### Testy

| Plik | Odpowiedzialność |
|------|-----------------|
| `src/modules/__tests__/budgetCalculator.test.js` | Testy jednostkowe dla `budgetCalculator.js` (Vitest) |

---

## Architektura

### Przepływ danych

```
Firebase Realtime DB
    ↓ onValue (real-time listeners z debounce 100ms)
dataManager.js (cache in-memory)
    ↓ gettery: getExpenses(), getIncomes(), getCategories()...
budgetCalculator.js / analytics.js (obliczenia, cache localStorage)
    ↓
ui/ + app.js (renderowanie)
    ↓
index.html (DOM)
    ↑
handlers/ (CRUD → dataManager → Firebase)
```

### Event handling

Wszystkie akcje użytkownika obsługiwane są przez event delegation (`clickDelegation.js`):
- elementy HTML używają `data-action="nazwa-akcji"` zamiast `onclick`
- `initClickDelegation(handlers)` mapuje nazwy akcji na funkcje
- formularze podpięte przez `addEventListener('submit', handler)` w `DOMContentLoaded`

### Wzorzec dependency injection

Handlery w `src/handlers/` nie importują bezpośrednio `app.js`. Zamiast tego dostają zależności przez setter:
```js
setExpenseHandlerDeps({ getBudgetUserName, getBudgetUsersCache, renderAfterChange, setupExpenseTypeToggle })
setIncomeHandlerDeps({ ..., refreshPeriodSelectors, setupIncomeTypeToggle })
setCategoryHandlerDeps({ renderCategories, renderExpenses })
```

### Struktura Firebase

```
users/{uid}/
  profile/          displayName, email, createdAt
  budget/
    categories/     { [catId]: { id, name, icon } }
    expenses/       { [expId]: { id, amount, category, description, date, time, type, userId } }
    incomes/        { [incId]: { id, amount, source, description, date, time, type, userId } }
    budgetUsers/    { [userId]: { id, name, isOwner } }
    savingGoal      number
    endDate/        { primary, secondary }
    daily_envelope/ { [YYYY-MM-DD]: { ... } }
    envelopePeriod  number (indeks okresu)
    dynamicsPeriod  number (indeks okresu)
  logs/             (max 50 wpisów)
  presence/         { [sessionId]: { timestamp, lastActivity, isManualActivity } }
```

### Typy transakcji

```js
type: 'normal'   // zrealizowana
type: 'planned'  // zaplanowana w przyszłości (auto-realizacja gdy data minie)
wasPlanned: true // flaga po auto-realizacji
```

---

## Konwencje kodowania

- Vanilla JS, bez frameworka — nie sugeruj React/Vue
- `escapeHTML()` przed każdym wstawieniem danych użytkownika do DOM
- `sanitizeHTML()` dla większych bloków HTML (DOMPurify)
- Daty zawsze w strefie Europe/Warsaw — używaj funkcji z `dateHelpers.js`
- Nowe akcje klikalne → `data-action` + wpis w `initClickDelegation` w `app.js`
- Nowe formularze → `addEventListener('submit', handler)` w bloku `DOMContentLoaded`

---

## Roadmap

> Aktualizowany po każdym deployu. Ostatnia aktualizacja: 2026-05-15 (v1.9.9)

### Do zrobienia — wysoki priorytet

- [ ] **Rozbij `app.js`** — `renderAnalytics`, `renderCategories`, `renderLogs` nadal w `app.js` (2117 linii). Wydzielić do `src/ui/renderAnalytics.js`, `src/ui/renderCategories.js`, `src/ui/renderLogs.js`
- [ ] **Testy** — jedyny test: `budgetCalculator.test.js`. Dopisać testy dla `validators.js`, `sanitizer.js`, `dateHelpers.js`, `analytics.js`
- [ ] **Firebase Security Rules** — zweryfikować i zaktualizować reguły bezpieczeństwa w Firebase console

### Do zrobienia — średni priorytet

- [ ] **ESLint + Prettier** — brak lintingu; dodać `.eslintrc` i `.prettierrc`
- [ ] **Pre-commit hooks** — husky + lint-staged
- [ ] **CI/CD** — GitHub Actions: testy + build przy każdym push

### Do zrobienia — niski priorytet / pomysły

- [ ] Import transakcji z CSV/Excel
- [ ] Eksport raportu PDF
- [ ] PWA / powiadomienia push (przypomnienia o limitach)
- [ ] TypeScript (stopniowa migracja, zaczynając od `utils/`)
- [ ] Sentry do śledzenia błędów produkcyjnych

### Zrobione

- [x] Event delegation — brak inline `onclick`, wszystko przez `data-action`
- [x] Sanityzacja — `escapeHTML` i `sanitizeHTML` (DOMPurify) przed zapisem i renderowaniem
- [x] Migracja `realised → type` — automatyczna przy ładowaniu danych
- [x] Auto-realizacja planowanych transakcji — `shouldBeRealisedNow` + `autoRealiseDueTransactions`
- [x] Memory leak w chartTooltip — naprawiony przez referencje do handlerów + cleanup przed re-renderem
- [x] Checker północy — `setInterval` co minutę, reset cache limitów i koperty
- [x] Dependency injection dla handlerów — brak circular imports
- [x] Cele oszczędzania — pełny moduł (manager + calculator + modale + render)
- [x] Symulacja wydatku — `simulateExpense` z analizą ryzyka
- [x] Eksport danych dla LLM (JSON/TXT)
- [x] System presence — detekcja aktywnych sesji
