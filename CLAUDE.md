# CLAUDE.md — Krezus

Polska aplikacja do zarządzania budżetem domowym. Wdrożona na krezus.vercel.app.

## Stack

- **Frontend:** Vanilla JavaScript (ES Modules)
- **Build:** Vite 7, target es2020
- **Backend:** Firebase Realtime Database + Firebase Auth
- **Sanityzacja:** DOMPurify
- **Testy:** Vitest

```
npm run dev      # dev server na :3000 (użyj dev.sh lub załaduj nvm ręcznie)
npm run build    # build do dist/
npm run preview  # podgląd buildu na :4173
npm run test     # vitest run
```

> Node.js: wersja 20 przez nvm. Aby uruchomić npm, najpierw: `source ~/.nvm/nvm.sh && nvm use 20`

Aliasy Vite: `@` → `src/`, `@modules`, `@components`, `@utils`, `@ui`, `@handlers`.

---

## Indeks plików

### Wejście

| Plik | Odpowiedzialność |
|------|-----------------|
| `index.html` | Struktura HTML, wszystkie sekcje UI (IDs: `summarySection`, `envelopeSection`, `expensesSection`, `sourcesSection`, `categoriesSection`, `simulationSection`, `analyticsSection`, `savingsGoalsSection`, `settingsSection`), brak inline handlerów (używa `data-action`) |
| `src/app.js` (1419 linii) | Orkiestrator: `loadAllData` (l.297), `renderAll` (l.441), `startMidnightChecker` (l.152), `setupExpenseTypeToggle` (l.507), `setupIncomeTypeToggle` (l.525), `setupCategorySuggestions` (l.543), `setupSourceSuggestions` (l.656), `refreshPeriodSelectors` (l.761), `renderSimulationResult` (l.828), `handleExportBudgetData` (l.899), `handleLogin/Register/Logout` (l.1003+), `SECTION_META` (l.926), `getBudgetUserName` (l.436), dependency injection dla handlerów |
| `src/config/firebase.js` | Inicjalizacja Firebase (app, db, auth) — eksportuje trzy instancje |

### Moduły (logika biznesowa)

| Plik | Kluczowe eksporty |
|------|------------------|
| `src/modules/auth.js` (332 linii) | `registerUser`, `loginUser`, `logoutUser`, `onAuthChange` (l.98), `getCurrentUser`, `getUserId`, `getDisplayName`, `updateDisplayName`, `getBudgetUsers`, `addBudgetUser`, `updateBudgetUser`, `deleteBudgetUser`, `subscribeToBudgetUsers` |
| `src/modules/dataManager.js` (851 linii) | **Gettery:** `getCategories/Expenses/Incomes/EndDates/SavingGoal/Savings/EnvelopePeriod/DynamicsPeriod/DailyEnvelope/PurposeBudgets` (l.814+); **Loadery:** `loadCategories` (l.77), `loadExpenses` (l.134), `loadIncomes` (l.184), `loadSavings` (l.260); **Zapisy:** `saveCategories/Expenses/Incomes` (l.351+), `updateSavings` (l.450); **Realtime:** `subscribeToRealtimeUpdates` (l.651); **Auto-realizacja:** `autoRealiseDueTransactions` (l.582); `clearCache` (l.805) |
| `src/modules/budgetCalculator.js` (1382 linii) | `calculateAvailableFunds` (l.224), `calculateCurrentLimits` (l.237), `getOrCalculateLimits` (l.364), `calculateSpendingPeriods` (l.182), `updateDailyEnvelope` (l.518), `recalculateEnvelope` (l.733), `calculateSpendingGauge` (l.847), `getGlobalMedian30d` (l.416), `computeComparisons` (l.958), `calculateSpendingDynamics` (l.997), `simulateExpense` (l.1171), `getTopCategories` (l.872), `getTopSources` (l.927), `clearLimitsCache` (l.70) |
| `src/modules/analytics.js` (316 linii) | `calculatePeriodStats` (l.97), `compareToPreviousPeriod` (l.120), `getMostExpensiveCategories` (l.167), `getCategoriesBreakdown` (l.196), `getUserExpensesBreakdown` (l.226), `getCategoryTransactions` (l.273), `setAnalyticsPeriod` (l.21), `setCustomDateRange` (l.35), `setBudgetUsersCache` (l.17) |
| `src/modules/presence.js` (305 linii) | `initializePresence` (l.33), `cleanupPresence` (l.279), `recordActivity` (l.66), `setPresenceBudgetUsers` (l.25); heartbeat co 30s, throttling 500ms |
| `src/modules/logger.js` (139 linii) | `log` (l.7), `getLogs` (l.34), `clearAllLogs` (l.64), `formatLogEntry` (l.90); max 50 wpisów w Firebase |
| `src/modules/chartRenderer.js` (175 linii) | `createBarChart` (l.35), `createPieChart` (l.75), `createLineChart` (l.99), `generateColorPalette` (l.140), `destroyChart` (l.152) |

### Renderowanie UI (`src/ui/`)

| Plik | Kluczowe eksporty |
|------|------------------|
| `src/ui/renderSummary.js` (417 linii) | `renderSummary` (l.140), `renderSpendingDynamics` (l.233), `renderUpcomingTransactions` (l.346), `setSummaryDeps` (l.27) |
| `src/ui/renderAnalytics.js` (501 linii) | `renderAnalytics` (l.319), `selectPeriod` (l.456), `applyCustomPeriod` (l.479), `refreshCategoriesChart` (l.491) |
| `src/ui/renderDailyEnvelope.js` (286 linii) | `renderDailyEnvelope` (l.127) — pasek gauge gradient zielony→pomarańczowy→czerwony |
| `src/ui/renderExpenses.js` (192 linii) | `renderExpenses` (l.53), `changeExpensePage` (l.174), `setExpenseDeps` (l.16), `setExpenseFilter` (l.24), `setExpenseSearch` (l.30) |
| `src/ui/renderIncomes.js` (195 linii) | `renderSources` (l.54), `changeIncomePage` (l.177), `setIncomeDeps` (l.16), `setIncomeFilter` (l.24), `setIncomeSearch` (l.30) |
| `src/ui/renderCategories.js` (155 linii) | `renderCategories` (l.18), `changeCategoryPage` (l.147), `CAT_COLORS` (l.10) |
| `src/ui/renderSavings.js` (163 linii) | `renderSavingsSection` (l.58), `setSavingsDeps` (l.10) |
| `src/ui/renderLogs.js` (142 linii) | `renderLogs` (l.80), `clearLogs` (l.122), `resetAndRenderLogs` (l.140) |
| `src/ui/charts.js` (209 linii) | `ringGaugeHTML` (l.33), `sparklineHTML` (l.101), `barChartHTML` (l.134), `dailyChartHTML` (l.172), `updateRingGauge` (l.82) |
| `src/ui/initSidebar.js` (111 linii) | `initNavIcons` (l.26), `setActiveNavItem` (l.63), `initMobileDrawer` (l.106), `setMobileDrawer` (l.83), `injectIcons` (l.47) |
| `src/ui/chips.js` (65 linii) | `avatarHTML` (l.38), `userChipHTML` (l.49), `catBadgeHTML` (l.59) |

### Handlery zdarzeń (`src/handlers/`)

| Plik | Kluczowe eksporty |
|------|------------------|
| `src/handlers/clickDelegation.js` (48 linii) | `initClickDelegation(handlers)` (l.8), `getDataAttributes` (l.36) — centralny event delegation dla wszystkich `data-action` |
| `src/handlers/eventHandlers.js` (164 linii) | `initNavigationHandlers` (l.7), `initFormHandlers` (l.35), `initAuthTabHandlers` (l.99), `initAnalyticsPeriodHandlers` (l.136), `showAuthTab` (l.113) |
| `src/handlers/expenseHandlers.js` (259 linii) | `addExpense` (l.35), `editExpense` (l.156), `deleteExpense` (l.191), `realiseExpense` (l.229), `setExpenseHandlerDeps` (l.28) |
| `src/handlers/incomeHandlers.js` (320 linii) | `addIncome` (l.37), `editIncome` (l.135), `deleteIncome` (l.170), `realiseIncome` (l.209), `addCorrection` (l.241), `setIncomeHandlerDeps` (l.29) |
| `src/handlers/categoryHandlers.js` (196 linii) | `addCategory` (l.30), `editCategory` (l.76), `deleteCategory` (l.80), `startMergeCategory` (l.125), `selectMergeTarget` (l.135), `cancelMergeCategory` (l.130), `setCategoryHandlerDeps` (l.21) |

### Komponenty UI (`src/components/`)

| Plik | Kluczowe eksporty |
|------|------------------|
| `src/components/modals.js` (862 linii) | `showProfileModal` (l.52), `showEditCategoryModal` (l.307), `showEditExpenseModal` (l.425), `showEditIncomeModal` (l.573), `showPasswordModal` (l.701), `showAddCategoryModal` (l.789) |
| `src/components/confirmModal.js` (204 linii) | `showConfirmModal` (l.11), `showPromptModal` (l.100) |
| `src/components/savingsModal.js` (177 linii) | `showSavingsModal` (l.86) |
| `src/components/forms.js` (112 linii) | `createFormField` (l.8), `createSelect` (l.50), `clearForm` (l.87), `setFormDisabled` (l.97) |
| `src/components/tables.js` (116 linii) | `createTableRow` (l.8), `createActionButton` (l.27), `clearTableBody` (l.59), `sortTable` (l.72), `filterTable` (l.95) |
| `src/components/summary.js` (82 linii) | `createSummaryCard` (l.9), `createSummaryGroup` (l.26), `formatCurrency` (l.52), `createProgressBar` (l.59) |

### Narzędzia (`src/utils/`)

| Plik | Kluczowe eksporty |
|------|------------------|
| `src/utils/constants.js` (74 linii) | `PAGINATION`, `DAILY_ENVELOPE`, `ADMIN`, `VALIDATION_LIMITS`, `TRANSACTION_TYPES`, `CHART_COLORS`, `STORAGE_KEYS`, `ANIMATION_DELAYS`, `BREAKPOINTS`, `COMPARISON_PERIODS`, `DEFAULT_USERS` |
| `src/utils/validators.js` (177 linii) | `validateAmount` (l.1), `validateDate` (l.20), `validateCategoryName` (l.67), `validateEmail` (l.85), `validatePassword` (l.99), `attachValidator` (l.133), `validateForm` (l.159) |
| `src/utils/sanitizer.js` (59 linii) | `sanitizeHTML` (l.8) — DOMPurify, `escapeHTML` (l.31), `setInnerHTML` (l.42), `appendSanitizedHTML` (l.50) |
| `src/utils/dateHelpers.js` (265 linii) | `getWarsawDateString` (l.54), `getCurrentTimeString` (l.60), `shouldBeRealisedNow` (l.91), `getDaysLeftFor` (l.114), `formatDateLabel` (l.127), `isRealised` (l.156), `calculateRemainingTime` (l.183), `parseDateStr` (l.3) |
| `src/utils/iconMapper.js` (360 linii) | `getCategoryIcon` (l.295), `getSourceIcon` (l.304), `suggestCategoryIcons` (l.334) — fuzzy matching Levenshtein, >150 słów kluczowych |
| `src/utils/icons.js` (110 linii) | `ICONS` (l.17) — mapa SVG Lucide, `icon(name, attrs)` (l.77), `iconEl` (l.90), `logoHTML` (l.103) |
| `src/utils/errorHandler.js` (110 linii) | `showErrorMessage` (l.1), `showSuccessMessage` (l.43), `initGlobalErrorHandler` (l.79), `withErrorHandling` (l.103) |
| `src/utils/llmExport.js` (565 linii) | `exportBudgetDataForLLM(format)` (l.524) — format `'json'` lub `'txt'` |
| `src/utils/uiHelpers.js` (135 linii) | `getBudgetUserName` (l.8), `updatePaginationVisibility` (l.16), `showSection` (l.102), `renderPaginationButtons` (l.62), `hideLoader` (l.49) |
| `src/utils/fmt.js` (31 linii) | `Fmt` — obiekt z metodami formatowania (PLN, daty, procenty) |
| `src/utils/animateNumber.js` (67 linii) | `animateNumber` (l.11), `animateAllNumbers` (l.59) |
| `src/utils/countdownTimer.js` (62 linii) | `startCountdownTimers` (l.13), `stopCountdownTimers` (l.57) |
| `src/utils/globalHandlers.js` (34 linii) | `registerGlobalHandlers` (l.9), `REGISTERED_HANDLERS` (l.32) — lista handlerów (dokumentacja) |
| `src/utils/version.js` (34 linii) | `initVersion` (l.31), `displayAppVersion` (l.19) |

### Testy

| Plik | Odpowiedzialność |
|------|-----------------|
| `src/modules/__tests__/budgetCalculator.test.js` (507 linii) | Testy jednostkowe `budgetCalculator.js` (Vitest) |
| `src/ui/__tests__/charts.test.js` (222 linii) | Testy `charts.js` |
| `src/ui/__tests__/chips.test.js` (143 linii) | Testy `chips.js` |

---

## Style (`src/styles/`)

```
tokens/
  colors.css       (64 linii)  — zmienne CSS: --ink-*, --accent, --surface-*, --success/danger/warning/info
  animations.css   (275 linii) — keyframes + transition utilities
base.css           (77 linii)  — reset CSS
layout/
  sidebar.css      (277 linii) — nawigacja boczna + topbar + układ strony
components/
  misc.css         (127 linii) — headings, scrollbar, loader, nav-btn, auth-shell, utilities, responsive
  buttons.css      (150 linii) — .btn + wszystkie warianty (primary/accent/success/danger/ghost/sm) + btn-icon/link/close
  cards.css        (128 linii) — .card, .section-card, .stat-grid, .stat-card, .metric
  forms.css        (117 linii) — form-group, inputs, select, textarea, field, form-grid, modal-info-box
  progress.css     (60 linii)  — .progress, gauge ring (SVG), envelope, limit-tile, dynamics-card
  analytics.css    (59 linii)  — pagination, period-btn, segmented control (.seg), auth-tabs
  badges.css       (52 linii)  — .badge/.tag/.status-badge, avatar, user-chip, cat-badge, delta
  charts.css       (46 linii)  — .chart-container, .bar-chart-*, .daily-bar-*
  lists.css        (44 linii)  — categories, logs, empty-state, categories-grid, cat-menu-item
  modals.css       (41 linii)  — .modal, .modal-content, .modal-header/body/footer
  savings.css      (62 linii)  — .savings-goal-card (collapsed/expanded), contributions
  tables.css       (38 linii)  — table, thead/th/td, .row-actions, table.table (density variant)
  suggestions.css  (32 linii)  — .suggestion-item (autocomplete), suggestion-box/card (savings modal)
main.css           (21 linii)  — entry point, importuje wszystkie powyższe
```

---

## Architektura

### Przepływ danych

```
Firebase Realtime DB
    ↓ onValue (real-time listeners z debounce 100ms)
dataManager.js (cache in-memory) — subscribeToRealtimeUpdates (l.651)
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

Wszystkie akcje użytkownika obsługiwane są przez event delegation (`clickDelegation.js:8`):
- elementy HTML używają `data-action="nazwa-akcji"` zamiast `onclick`
- `initClickDelegation(handlers)` mapuje nazwy akcji na funkcje
- formularze podpięte przez `addEventListener('submit', handler)` w `DOMContentLoaded`

### Wzorzec dependency injection

Handlery w `src/handlers/` nie importują bezpośrednio `app.js`. Dostają zależności przez setter:
```js
setExpenseHandlerDeps({ getBudgetUserName, getBudgetUsersCache, renderAfterChange, setupExpenseTypeToggle })
setIncomeHandlerDeps({ ..., refreshPeriodSelectors, setupIncomeTypeToggle })
setCategoryHandlerDeps({ renderCategories, renderExpenses })
setSummaryDeps({ getBudgetUsersCache })
setSavingsDeps({ getBudgetUsersCache })
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
    savings/        { current: number, history: [...] }
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

### Sekcje aplikacji (SECTION_META, app.js:926)

| ID sekcji | Nagłówek | Renderuje |
|-----------|----------|-----------|
| `summarySection` | Podsumowanie | `renderSummary`, `renderDailyEnvelope` |
| `envelopeSection` | Koperta dnia | `renderDailyEnvelope` |
| `expensesSection` | Wydatki | `renderExpenses` |
| `sourcesSection` | Przychody | `renderSources` |
| `categoriesSection` | Kategorie | `renderCategories` |
| `simulationSection` | Symulacja wydatku | `renderSimulationResult` |
| `analyticsSection` | Analityka | `renderAnalytics` |
| `savingsGoalsSection` | Oszczędności | `renderSavingsSection` |
| `settingsSection` | Ustawienia | `loadSettings` |

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

> Aktualizowany po każdym deployu. Ostatnia aktualizacja: 2026-05-21 (v1.9.9)

### Do zrobienia — wysoki priorytet

- [ ] **Testy** — testy tylko dla: `budgetCalculator.test.js`, `charts.test.js`, `chips.test.js`. Brakuje testów dla `validators.js`, `sanitizer.js`, `dateHelpers.js`, `analytics.js`, `dataManager.js`
- [ ] **Firebase Security Rules** — zweryfikować i zaktualizować reguły bezpieczeństwa w Firebase console

### Do zrobienia — średni priorytet

- [ ] **ESLint + Prettier** — brak lintingu; dodać `.eslintrc` i `.prettierrc`
- [ ] **Pre-commit hooks** — husky + lint-staged
- [ ] **CI/CD** — GitHub Actions: testy + build przy każdym push
- [ ] **Rozbij `app.js`** — 1419 linii; kandydaci do wydzielenia: `setupCategorySuggestions` (l.543, 110 linii), `setupSourceSuggestions` (l.656, 100 linii), `renderSimulationResult` (l.828, 70 linii)

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
- [x] System oszczędności — model `savings/current + history`, widok z stat-grid + hero + historia, modal "Zmień kwotę"
- [x] Symulacja wydatku — `simulateExpense` z analizą ryzyka
- [x] Eksport danych dla LLM (JSON/TXT)
- [x] System presence — detekcja aktywnych sesji
- [x] Rozbicie `design2.css` — monolith 983 linii → 13 plików komponentowych (max 150 linii każdy)
- [x] Wydzielenie render funkcji z `app.js` do `src/ui/` — `renderAnalytics`, `renderCategories`, `renderLogs`, `renderSavings`, `renderSummary`, `renderDailyEnvelope`, `renderExpenses`, `renderIncomes`
