# Migration TODO - Krezus Application

## ✨ Ostatnie zmiany

### 2025-11-09: Automatyczne okresy budżetowe (DONE ✅)
- [x] Zmodyfikowano `calculateSpendingPeriods()` aby automatycznie wyznaczać daty z planowanych przychodów
- [x] Dodano funkcję `getNextPlannedIncomeDates()` która znajduje 2 najbliższe daty planowanych wpływów
- [x] Zaktualizowano UI w ustawieniach - usunięto manualne pola dat
- [x] Zaktualizowano `saveSettings()` i `loadSettings()` - daty nie są już zapisywane/ładowane
- [x] Dodano informacyjny box w ustawieniach wyjaśniający automatyczne daty

**Jak to działa:**
System automatycznie używa dat zaplanowanych przychodów (type='planned') jako okresów budżetowych.
Kafelki w sekcji podsumowania pokazują teraz te automatyczne daty.

## 🎯 Priorytet 1: Bezpieczeństwo (DONE ✅)

- [x] Zainstalować DOMPurify
- [x] Dodać funkcje sanityzacji (sanitizer.js)
- [x] Naprawić XSS w modals.js (createElement zamiast innerHTML)
- [x] Naprawić XSS w renderCategories()
- [x] Escapować dane użytkowników w tabelach (expenses, incomes)
- [x] Escapować getBudgetUserName()
- [x] Zaktualizować Firebase do najnowszej wersji

## ⚠️ Priorytet 2: Inline Event Handlers (PARTIAL ✅)

### Zrobione:
- [x] Usunięto onclick z modals.js (budgetUsersList)
- [x] Usunięto onclick z renderCategories()
- [x] Usunięto onclick z descriptionSuggestions

### Do zrobienia:
- [ ] Usunąć onclick/onsubmit z index.html (26 handlerów):
  - [ ] showAuthTab (x2)
  - [ ] handleLogin, handleRegister
  - [ ] openProfile, handleLogout
  - [ ] showSection (x7)
  - [ ] addIncome, addCorrection, addExpense
  - [ ] addCategory
  - [ ] selectPeriod (x5)
  - [ ] applyCustomPeriod
  - [ ] saveSettings
  - [ ] clearLogs

### Plan migracji:
1. Utworzyć `src/init/attachEventListeners.js`
2. Przenieść wszystkie handlery z index.html do tego pliku
3. Użyć `document.getElementById()` + `addEventListener()`
4. Wywołać `attachEventListeners()` w app.js po DOMContentLoaded

## 🔄 Priorytet 3: Refaktoryzacja window.* (DOCUMENTED ✅)

### Zrobione:
- [x] Utworzono globalHandlers.js z listą wszystkich window.* funkcji
- [x] Dodano dokumentację i TODO

### Do zrobienia:
- [ ] Przenieść wszystkie window.* funkcje do osobnych modułów
- [ ] Zastąpić window.* funkcje event listenerami
- [ ] Użyć data attributes zamiast onclick

## 📦 Priorytet 4: Modularyzacja (PARTIAL ✅)

### Zrobione:
- [x] Utworzono UI moduły (renderSummary.js, renderDailyEnvelope.js)
- [x] Utworzono utils moduły (uiHelpers.js, sanitizer.js)
- [x] Utworzono handlers moduły (eventHandlers.js)
- [x] Utworzono confirmModal.js

### Do zrobienia:
- [ ] Wyekstrahować więcej funkcji z app.js:
  - [ ] renderExpenses -> ui/renderExpenses.js
  - [ ] renderIncomes -> ui/renderIncomes.js
  - [ ] renderAnalytics -> ui/renderAnalytics.js
  - [ ] renderLogs -> ui/renderLogs.js
- [ ] Docelowo app.js powinien być <500 linii (obecnie ~2100)

## 🧪 Priorytet 5: Testy

- [ ] Dodać vitest
- [ ] Napisać testy jednostkowe dla:
  - [ ] sanitizer.js
  - [ ] validators.js
  - [ ] budgetCalculator.js
  - [ ] dataManager.js
- [ ] Dodać testy integracyjne dla:
  - [ ] Auth flow
  - [ ] CRUD operations
- [ ] Cel: >50% code coverage

## 🔒 Priorytet 6: Firebase Security

- [ ] Skonfigurować Firebase Security Rules
- [ ] Dodać Firebase App Check
- [ ] Ograniczyć API Key w Google Cloud Console
- [ ] Włączyć Rate Limiting

## 📝 Priorytet 7: Tooling

- [x] Dodać vite.config.js
- [ ] Dodać ESLint
- [ ] Dodać Prettier
- [ ] Dodać pre-commit hooks (husky)
- [ ] Dodać commitlint

## 🚀 Priorytet 8: CI/CD

- [ ] Utworzyć .github/workflows/ci.yml
- [ ] Dodać automatyczne testy
- [ ] Dodać automatyczny build
- [ ] Dodać deployment do Firebase Hosting

## 📊 Priorytet 9: Monitoring

- [ ] Dodać Sentry dla error tracking
- [ ] Dodać Google Analytics
- [ ] Dodać performance monitoring

## 🎨 Priorytet 10: TypeScript (opcjonalnie)

- [ ] Dodać TypeScript
- [ ] Migrować moduły jeden po drugim
- [ ] Dodać typy dla Firebase
- [ ] Docelowo: 100% TypeScript coverage
