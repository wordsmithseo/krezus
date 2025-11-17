# 📋 RAPORT AUDYTU APLIKACJI KREZUS

**Data audytu:** 2025-11-17
**Wersja aplikacji:** 1.2.0
**Audytor:** Claude Code
**Zakres:** Funkcjonalność, jakość kodu, architektura, bezpieczeństwo

---

## 📊 PODSUMOWANIE WYKONAWCZE

**Krezus** to zaawansowana aplikacja do zarządzania budżetem osobistym z funkcjami premium:
- ✅ Inteligentna koperta dnia (algorytm v5)
- ✅ Budżety celowe z automatyczną walidacją
- ✅ Planowanie transakcji
- ✅ Real-time synchronizacja (Firebase)
- ✅ Multi-user support
- ✅ Zaawansowana analityka

### Statystyki projektu:
- **10,438 linii kodu** (27 plików JavaScript)
- **Firebase Realtime Database** jako backend
- **Vanilla JavaScript** + ES6 Modules
- **Vite** jako build tool
- **DOMPurify** do sanityzacji HTML

### Ogólna ocena:
- ✅ **Funkcjonalność:** 9/10 - Bardzo kompletna
- ⚠️ **Bezpieczeństwo:** 5/10 - KRYTYCZNE luki XSS
- ✅ **Architektura:** 7/10 - Dobra modularność
- ⚠️ **Jakość kodu:** 6/10 - Wymaga refaktoryzacji
- ✅ **Wydajność:** 7/10 - Dobra z miejscem na optymalizację

---

## 🎯 CZĘŚĆ I: ANALIZA FUNKCJONALNOŚCI

### 1. Zarządzanie Budżetem

**Lokalizacja:** `src/modules/budgetCalculator.js` (1024 linie)

**Kluczowe funkcje:**

#### 1.1 Dostępne środki
- Obliczanie różnicy: przychody - wydatki
- Uwzględnianie planowanych transakcji
- Podział na okresy budżetowe

#### 1.2 Inteligentne limity dzienne
```javascript
calculateCurrentLimits() {
  // Oblicza limit z zabezpieczeniami progresywnymi:
  // ≤7 dni → 70% limitu
  // ≤3 dni → 50% limitu
  // ≤1 dzień → 30% limitu
}
```

**Cache:** Limity przeliczane raz dziennie o północy

#### 1.3 Automatyczne okresy budżetowe
- Wykorzystuje daty planowanych przychodów
- Dynamiczne dostosowanie do sytuacji użytkownika

#### 1.4 Wykrywanie anomalii
- Wydatki > 2× średnia OR > 3× mediana
- Max 10 anomalii
- Specjalny threshold dla okresu "Wszystko"

### 2. Inteligentna Koperta Dnia (v5)

**Lokalizacja:**
- `src/modules/budgetCalculator.js:updateDailyEnvelope()`
- `src/ui/renderDailyEnvelope.js`

**Algorytm:**
```
1. Pobierz medianę z ostatnich 30 dni (min. 5 transakcji)
2. Porównaj z limitem dziennym:
   - Mediana > 150% limitu → 90% limitu (ostrożnie)
   - Mediana < 30% limitu → 70% limitu (zachęcaj)
   - Standard → 40% mediany + 60% limitu (balans)
3. Cache do północy
4. Przelicz tylko raz dziennie
```

**Wizualizacja:**
- Kwota bazowa
- Wydane środki
- Pozostałe
- Pasek gauge (gradient: zielony → pomarańczowy → czerwony)

### 3. Transakcje (Wydatki + Przychody)

**Struktura danych:**
```javascript
{
  id: string,
  amount: number,
  category: string,        // dla wydatków
  source: string,          // dla przychodów
  description: string,
  date: string (YYYY-MM-DD),
  time: string (HH:MM),
  type: 'normal' | 'planned',
  userId: string,
  purposeBudgetId: string
}
```

**Funkcje:**
- ✅ Dodawanie/edycja/usuwanie
- ✅ Planowanie przyszłych transakcji
- ✅ Automatyczna realizacja planowanych z przeszłości
- ✅ Przypisywanie do budżetów celowych
- ✅ Multi-user tracking
- ✅ Automatyczna migracja `realised → type`

### 4. Kategorie

**Lokalizacja:** `src/modules/dataManager.js`, `src/utils/iconMapper.js`

**Funkcje:**
- ✅ Dynamiczne dodawanie/edycja/usuwanie
- ✅ Inteligentne mapowanie ikon (>150 słów kluczowych)
- ✅ Fuzzy matching (algorytm Levenshteina)
- ✅ Scalanie kategorii
- ✅ Automatyczne ID przy migracji
- ✅ Deduplikacja

**Przykłady mapowania:**
- "spożywcze", "biedronka" → 🛒
- "restauracja", "bistro" → 🍴
- "paliwo", "benzyna" → ⛽

### 5. Budżety Celowe

**Lokalizacja:** `src/modules/purposeBudgetManager.js` (403 linie)

**Kluczowe funkcje:**

#### 5.1 Tworzenie budżetu
```javascript
createPurposeBudget(name, amount) {
  // Walidacja dostępnych środków
  // Tworzenie z timestampem
  // Synchronizacja budżetu "Ogólny"
}
```

#### 5.2 Automatyczna walidacja
```javascript
validateBudgetAllocation() {
  if (totalPurposeBudgets > available) {
    // 🚨 AUTOMATYCZNA LIKWIDACJA wszystkich budżetów!
    // Przeniesienie wydatków do "Ogólny"
    // Zapis w logach
  }
}
```

#### 5.3 Budżet "Ogólny"
- Zawsze istnieje (`ensureDefaultBudget()`)
- Automatyczna synchronizacja: `amount = available - totalOtherBudgets`
- Nie można usunąć

#### 5.4 Statystyki
- Wydane środki
- Pozostałe środki
- Procentowe wykorzystanie
- Kolorowa wizualizacja (gradient RGB)

### 6. Analityka

**Lokalizacja:** `src/modules/analytics.js` (358 linii)

**Okresy:**
- 7 dni
- 30 dni
- 90 dni
- "Wszystko" (od 2000-01-01)
- Custom (dowolny zakres)

**Raporty:**
- 📊 Statystyki okresu (suma, średnia dzienna)
- 📈 Porównanie z poprzednim okresem (%)
- 🏆 Top 3 kategorie
- 📉 Rozbicie po kategoriach
- 👥 Rozbicie po użytkownikach budżetu
- ⚠️ Wykrywanie anomalii
- 📊 Wykres kołowy (canvas)

### 7. System Presence

**Lokalizacja:** `src/modules/presence.js` (247 linii)

**Funkcje:**
- Wykrywanie innych aktywnych sesji
- Unikalny ID: `session_{timestamp}_{random}`
- Heartbeat co 30 sekund
- Detekcja aktywności: ostatnie 2 minuty
- Animacje pulsowania:
  - Manualna aktywność → szybkie (2s)
  - Automatyczna → wolne (5s)
- Throttled update: 500ms

### 8. System Logowania

**Lokalizacja:** `src/modules/logger.js` (139 linii)

**Funkcje:**
- Zapis wszystkich akcji z timestampem
- Data/czas w strefie Warsaw
- Limit: 50 ostatnich wpisów
- Informacja o użytkowniku budżetu wykonującym akcję

**Akcje:**
- LOGIN, LOGOUT
- EXPENSE_ADD, EXPENSE_EDIT, EXPENSE_DELETE, EXPENSE_REALISE
- INCOME_ADD, INCOME_EDIT, INCOME_DELETE
- CATEGORY_ADD, CATEGORY_EDIT, CATEGORY_DELETE, CATEGORY_MERGE
- PURPOSE_BUDGET_*
- AUTO_REALISE
- DATA_FETCH, DATA_SAVE

---

## 🏗️ CZĘŚĆ II: ARCHITEKTURA KODU

### 1. Struktura katalogów

```
krezus/
├── index.html (1 plik, ~3000 linii)
├── src/
│   ├── app.js (~2749 linii) ⚠️ GŁÓWNY PLIK - za duży
│   ├── config/
│   │   └── firebase.js (36 linii)
│   ├── modules/ (logika biznesowa)
│   │   ├── auth.js (325 linii)
│   │   ├── dataManager.js (859 linii)
│   │   ├── budgetCalculator.js (1024 linie)
│   │   ├── analytics.js (358 linii)
│   │   ├── purposeBudgetManager.js (403 linie)
│   │   ├── presence.js (247 linii)
│   │   ├── logger.js (139 linii)
│   │   └── chartRenderer.js (176 linii)
│   ├── components/ (komponenty UI)
│   │   ├── modals.js
│   │   ├── forms.js
│   │   ├── tables.js
│   │   ├── summary.js
│   │   └── confirmModal.js
│   ├── ui/ (renderowanie)
│   │   ├── renderSummary.js (300+ linii)
│   │   └── renderDailyEnvelope.js (117 linii)
│   ├── handlers/
│   │   └── eventHandlers.js (165 linii)
│   ├── utils/
│   │   ├── dateHelpers.js (121 linii)
│   │   ├── constants.js (75 linii)
│   │   ├── iconMapper.js (200+ linii)
│   │   ├── errorHandler.js (119 linii)
│   │   ├── validators.js (176 linii)
│   │   ├── sanitizer.js (50 linii) ⚠️ BŁĘDNA KONFIGURACJA
│   │   ├── animateNumber.js
│   │   ├── uiHelpers.js
│   │   └── llmExport.js
│   └── styles/
│       └── main.css
├── vite.config.js (94 linie)
└── package.json
```

### 2. Przepływ danych

```
┌─────────────────────────────────────────────────┐
│          FIREBASE REALTIME DATABASE              │
│  users/{uid}/                                    │
│    ├── profile/                                  │
│    ├── budget/                                   │
│    │   ├── categories/                           │
│    │   ├── expenses/                             │
│    │   ├── incomes/                              │
│    │   ├── purposeBudgets/                       │
│    │   ├── budgetUsers/                          │
│    │   ├── endDate/                              │
│    │   ├── savingGoal                            │
│    │   └── daily_envelope/{date}/                │
│    ├── logs/                                     │
│    └── presence/{sessionId}/                     │
└─────────────────┬───────────────────────────────┘
                  │ Real-time listeners (onValue)
                  ▼
┌─────────────────────────────────────────────────┐
│              DATA MANAGER                        │
│  • Cache lokalny (in-memory)                    │
│  • Real-time synchronizacja                     │
│  • Automatyczna migracja danych                 │
│  • Debounced updates (100ms)                    │
│  • Deduplikacja                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         BUDGET CALCULATOR                        │
│  • Obliczenia limitów (cache localStorage)     │
│  • Inteligentna koperta (cache do północy)     │
│  • Automatyczna realizacja planowanych          │
│  • Wykrywanie anomalii                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│           RENDEROWANIE UI (app.js)               │
│  • renderSummary() - główny dashboard          │
│  • renderDailyEnvelope() - koperta             │
│  • renderExpenses/Incomes() - tabele           │
│  • renderAnalytics() - wykresy                 │
│  • animateNumber() - płynne animacje           │
└─────────────────────────────────────────────────┘
```

### 3. Wzorce projektowe

#### ✅ Zastosowane wzorce:

**1. Module Pattern (ES6 Modules)**
```javascript
// Każdy moduł eksportuje publiczne API
export { loginUser, registerUser, logoutUser };
```

**2. Singleton (Firebase instance)**
```javascript
// firebase.js
let app, db, auth;
app = initializeApp(firebaseConfig);
export { app, db, auth };
```

**3. Observer Pattern (Real-time listeners)**
```javascript
onValue(ref, (snapshot) => {
  // React to changes
  if (callbacks.onDataChange) {
    callbacks.onDataChange(data);
  }
});
```

**4. Cache Pattern**
```javascript
// budgetCalculator.js
const cached = localStorage.getItem(LIMITS_CACHE_KEY);
if (cached) {
  const data = JSON.parse(cached);
  if (data.timestamp === midnightTimestamp) {
    return data.limits; // Hit
  }
}
// Miss - calculate
```

**5. Debouncing/Throttling**
```javascript
// Real-time updates - debounced 100ms
// Walidacja budżetów - debounced 2000ms
// Aktywność presence - throttled 500ms
```

#### ⚠️ Brakujące wzorce:

**1. Dependency Injection** - moduły importują bezpośrednio zależności
**2. Strategy Pattern** - brak abstrakcji dla różnych typów transakcji
**3. Factory Pattern** - tworzenie obiektów bezpośrednio w kodzie
**4. MVC/MVVM** - logika biznesowa zmieszana z UI

### 4. Modularność

**✅ Mocne strony:**
- Dobrze oddzielone moduły funkcjonalne
- Jasna separacja utils/components/modules
- Reużywalne funkcje pomocnicze

**⚠️ Słabości:**
- app.js jest monolitem (~2749 linii)
- 46 funkcji globalnych (`window.*`)
- Ścisłe powiązanie renderowania z logiką
- Brak separacji concerns w app.js

### 5. Dependency Management

**✅ Minimalne zależności:**
```json
{
  "firebase": "^11.0.2",
  "dompurify": "^3.2.2"
}
```

**Vite dev dependency:**
```json
{
  "vite": "^7.1.10"
}
```

**Brak:**
- Testing frameworks
- Linters (ESLint)
- Type checking (TypeScript)
- CSS preprocessor

---

## 🔒 CZĘŚĆ III: BEZPIECZEŃSTWO

### 🔴 CRITICAL - Luki bezpieczeństwa

#### 1. XSS przez konfigurację DOMPurify

**Plik:** `src/utils/sanitizer.js:13`

**Problem:**
```javascript
ALLOWED_ATTR: ['class', 'style', 'data-value', 'data-budget-id',
               'data-budget-name', 'onclick', 'onmouseover', 'onmouseout']
//                                  ^^^^^^^^  ^^^^^^^^^^^  ^^^^^^^^^^
//                                  NIEBEZPIECZNE!
```

**Exploit:**
```javascript
// Atakujący dodaje kategorię:
name: 'Test' onclick='alert(document.cookie)'

// Wygenerowany HTML:
<button onclick="window.editCategory(...)"
        data-name="Test' onclick='alert(document.cookie)'">
```

**Skutek:** Wykonanie dowolnego JavaScript, kradzież cookies, session hijacking

**Priorytet:** 🔴 NATYCHMIASTOWY

**Rozwiązanie:**
```javascript
ALLOWED_ATTR: ['class', 'style', 'data-value', 'data-budget-id', 'data-budget-name']
// USUŃ: 'onclick', 'onmouseover', 'onmouseout'
```

---

#### 2. Masowe użycie inline onclick (30+ wystąpień)

**Pliki:**
- `src/app.js` (28 wystąpień)
- `index.html` (3 wystąpienia - linie 69, 74, 88)

**Problem:**
```javascript
// app.js:967
onclick="window.editCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')"
//                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                         Escape tylko apostrofów - niewystarczające!

// app.js:1170
onclick="selectDescription('${desc.replace(/'/g, "\\'")}')"
```

**Exploit:**
```javascript
// Opis wydatku: test'); alert('XSS'); //
// Wygenerowany HTML:
onclick="selectDescription('test'); alert('XSS'); //')"
//                         ^^^^^^^^^^^^^^^^^^^^^^^^
//                         Wykonanie kodu!
```

**Dodatkowe problemy:**
- Naruszenie Content Security Policy
- 46 globalnych funkcji (`window.*`)
- Trudność debugowania
- Brak stack trace przy błędach

**Priorytet:** 🔴 WYSOKI

**Rozwiązanie:** Event delegation
```javascript
// Zamiast:
<button onclick="window.editCategory('${id}', '${name}')">

// Użyj:
<button data-action="edit-category"
        data-id="${id}"
        data-name="${escapeHTML(name)}">

// W app.js:
container.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="edit-category"]');
  if (btn) {
    const id = btn.dataset.id;
    const name = btn.dataset.name;
    editCategory(id, name);
  }
});
```

---

#### 3. Brak sanityzacji przed zapisem do Firebase

**Pliki:** `src/app.js` (wszystkie funkcje add*/edit*)

**Problem:**
```javascript
// addCategory:
const newCategory = {
  id: `cat_${Date.now()}`,
  name: name,  // ❌ BRAK SANITYZACJI
  icon: getCategoryIcon(name)
};
await saveCategories([...categories, newCategory]);
```

**Skutek:** Stored XSS - złośliwy kod zapisany w bazie, wykonywany przy każdym renderowaniu

**Priorytet:** 🔴 WYSOKI

**Rozwiązanie:**
```javascript
import { escapeHTML } from '../utils/sanitizer.js';

const newCategory = {
  id: `cat_${Date.now()}`,
  name: escapeHTML(name.trim()),
  icon: getCategoryIcon(name)
};
```

---

### 🟡 MEDIUM - Problemy bezpieczeństwa

#### 4. Brak walidacji amount przed parseFloat

**Problem:**
```javascript
// purposeBudgetManager.js:32
amount: parseFloat(amount)  // ❌ Co jeśli amount = "hack"? → NaN

// validators.js
export function validateAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return false;  // ❌ Kto sprawdza wynik?
}
```

**Skutek:** NaN w obliczeniach budżetu, błędne limity

**Rozwiązanie:**
```javascript
const parsedAmount = parseFloat(amount);
if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
  throw new Error('Invalid amount');
}
```

---

#### 5. localStorage bez szyfrowania

**Problem:**
```javascript
// budgetCalculator.js:22
localStorage.setItem(LIMITS_CACHE_KEY, JSON.stringify({
  limits: limits,  // Wrażliwe dane finansowe
  timestamp: midnightTimestamp
}));
```

**Dostęp:**
- Rozszerzenia przeglądarki
- XSS attacks
- Lokalny dostęp do komputera

**Rozwiązanie:**
1. Przenieś cache do pamięci (memory cache)
2. Lub zaszyfruj AES-256 przed zapisem
3. Napraw najpierw problemy XSS

---

### 🔒 Zalecenia bezpieczeństwa

**Natychmiastowe:**
1. ✅ Napraw konfigurację DOMPurify
2. ✅ Zamień onclick na event delegation
3. ✅ Dodaj sanityzację przed zapisem do Firebase

**Krótkoterminowe:**
4. Dodaj Content Security Policy headers
5. Implementuj rate limiting dla Firebase
6. Dodaj walidację wszystkich parseFloat
7. Zaszyfruj lub usuń localStorage cache

**Długoterminowe:**
8. Przeprowadź penetration testing
9. Implementuj CSRF protection
10. Dodaj security headers (X-Frame-Options, etc.)
11. Regular security audits

---

## 🐛 CZĘŚĆ IV: POTENCJALNE BUGI

### 🔴 HIGH Priority Bugs

#### 1. Race condition w debounced walidacji budżetów

**Plik:** `src/app.js:154-173`

**Problem:**
```javascript
let budgetValidationTimeout;

async function debouncedValidateBudgets() {
  if (budgetValidationTimeout) {
    clearTimeout(budgetValidationTimeout);
  }

  budgetValidationTimeout = setTimeout(async () => {
    console.log('🔍 Uruchamiam opóźnioną walidację budżetów');
    const validation = await validateBudgetAllocation();
    // ❌ Może wywołać się wielokrotnie jeśli poprzednie async dalej działa
    if (validation.liquidated) {
      showErrorMessage(validation.message);
    }
  }, 2000);
}
```

**Scenariusz:**
1. Użytkownik szybko dodaje 5 wydatków
2. Timeout resetowany 5 razy
3. Ale poprzednie async operacje dalej działają
4. Wynik: 5× wywołanie `validateBudgetAllocation()`
5. Wynik: 5× ten sam alert

**Rozwiązanie:**
```javascript
let validationInProgress = false;

async function debouncedValidateBudgets() {
  if (budgetValidationTimeout) clearTimeout(budgetValidationTimeout);

  budgetValidationTimeout = setTimeout(async () => {
    if (validationInProgress) return;  // Guard
    validationInProgress = true;

    try {
      const validation = await validateBudgetAllocation();
      if (validation.liquidated) {
        showErrorMessage(validation.message);
      }
    } finally {
      validationInProgress = false;
    }
  }, 2000);
}
```

---

#### 2. Memory leak w chartTooltip event listeners

**Plik:** `src/app.js:534-856`

**Problem:**
```javascript
function renderCategoriesChart(breakdown) {
  // ...

  // ❌ Event listeners dodawane za każdym razem
  canvas.addEventListener('mousemove', (e) => {
    // Obsługa tooltip
  });

  canvas.addEventListener('mouseleave', () => {
    // Ukryj tooltip
  });

  // Brak removeEventListener!
}
```

**Scenariusz:**
1. Użytkownik zmienia okres analityki 20 razy
2. `renderCategoriesChart()` wywołane 20 razy
3. 40 event listenerów (2× 20) na tym samym canvas
4. Memory leak + spowolnienie aplikacji

**Rozwiązanie:**
```javascript
let mouseMoveHandler = null;
let mouseLeaveHandler = null;

function renderCategoriesChart(breakdown) {
  // Usuń stare listenery
  if (mouseMoveHandler) {
    canvas.removeEventListener('mousemove', mouseMoveHandler);
    canvas.removeEventListener('mouseleave', mouseLeaveHandler);
  }

  // Dodaj nowe
  mouseMoveHandler = (e) => { /* ... */ };
  mouseLeaveHandler = () => { /* ... */ };

  canvas.addEventListener('mousemove', mouseMoveHandler);
  canvas.addEventListener('mouseleave', mouseLeaveHandler);
}
```

---

### 🟡 MEDIUM Priority Bugs

#### 3. JSON.stringify race condition w dataManager

**Plik:** `src/modules/dataManager.js:670-807`

**Problem:**
```javascript
onValue(categoriesRef, (snapshot) => {
  // ...
  if (JSON.stringify(categoriesCache) !== JSON.stringify(uniqueData)) {
    //  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //  1. Kosztowne (O(n))
    //  2. Zawodne (kolejność kluczy)
    //  3. Callback otrzymuje referencję, nie kopię

    categoriesCache = uniqueData;
    if (callbacks.onCategoriesChange) {
      callbacks.onCategoriesChange(categoriesCache);  // ❌ Ref!
    }
  }
});
```

**Problemy:**
1. `JSON.stringify` na dużych tablicach = wolne
2. Porównanie zależy od kolejności kluczy
3. Callback może zmodyfikować cache

**Rozwiązanie:**
```javascript
let lastCategoriesHash = 0;

function hashCode(obj) {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

onValue(categoriesRef, (snapshot) => {
  // ...
  const newHash = hashCode(uniqueData);
  if (lastCategoriesHash !== newHash) {
    categoriesCache = uniqueData;
    lastCategoriesHash = newHash;
    if (callbacks.onCategoriesChange) {
      callbacks.onCategoriesChange([...categoriesCache]);  // Kopia
    }
  }
});
```

---

#### 4. Null/undefined w calculateBudgetSpent

**Plik:** `src/modules/purposeBudgetManager.js:205-214`

**Problem:**
```javascript
export function calculateBudgetSpent(budgetId, excludeExpenseId = null) {
  const expenses = getExpenses();

  const budgetExpenses = expenses.filter(
    e => e.purposeBudgetId === budgetId &&
         e.type === 'normal' &&
         e.id !== excludeExpenseId  // ❌ Co jeśli e.id === undefined?
  );

  return budgetExpenses.reduce(
    (sum, e) => sum + e.amount,  // ❌ Co jeśli e.amount === undefined?
    0
  );
}
```

**Skutek:**
- `undefined + number = NaN`
- Niepoprawne sumy wydatków
- Błędne statystyki budżetów

**Rozwiązanie:**
```javascript
const budgetExpenses = expenses.filter(
  e => e?.purposeBudgetId === budgetId &&
       e?.type === 'normal' &&
       e?.id && e.id !== excludeExpenseId
);

return budgetExpenses.reduce(
  (sum, e) => sum + (e?.amount || 0),
  0
);
```

---

#### 5. Auto-realizacja pomija dzisiejsze transakcje

**Plik:** `src/modules/dataManager.js:570-613`

**Problem:**
```javascript
export async function autoRealiseDueTransactions() {
  const today = getWarsawDateString();

  incomesCache.forEach(inc => {
    if (inc && inc.type === 'planned' && inc.date < today) {
      //                                            ^ tylko PRZED dzisiaj
      inc.type = 'normal';
      // ...
    }
  });
}
```

**Skutek:** Transakcje z dzisiejszą datą nie są automatycznie realizowane

**Rozwiązanie:**
```javascript
if (inc && inc.type === 'planned' && inc.date <= today) {
  //                                            ^^ włącznie z dzisiaj
  inc.type = 'normal';
  // ...
}
```

---

## 🎨 CZĘŚĆ V: ANTI-PATTERNS I CODE SMELLS

### 🔴 HIGH Priority Issues

#### 1. 46 funkcji globalnych (window pollution)

**Problem:**
```javascript
// app.js
window.changeCategoryPage = (page) => { /* ... */ };
window.changeExpensePage = (page) => { /* ... */ };
window.realiseExpense = async (expenseId) => { /* ... */ };
window.editCategory = async (categoryId, currentName) => { /* ... */ };
// ... +42 more

// modals.js
window.showProfileModal = showProfileModal;
window.showPasswordModal = showPasswordModal;
// ... +6 more
```

**Konsekwencje:**
1. **Namespace pollution** - ryzyko kolizji nazw
2. **Niemożliwe testowanie** - funkcje globalne
3. **Memory leaks** - nigdy nie czyszczone
4. **Bezpieczeństwo** - dostępne dla każdego skryptu
5. **Trudne debugowanie** - brak stack trace

**Rozwiązanie:** Event delegation (patrz sekcja Bezpieczeństwo)

---

### 🟡 MEDIUM Priority Issues

#### 2. Monolit app.js (~2749 linii)

**Problem:**
- Główny plik zawiera ~26% całego kodu
- Mieszanie logiki: auth, rendering, event handling, analytics
- Trudny w utrzymaniu i testowaniu

**Sugerowany podział:**
```
app.js (główny entry point, ~200 linii)
├── app/init.js (inicjalizacja, ~100 linii)
├── app/auth.js (UI autoryzacji, ~300 linii)
├── app/categories.js (UI kategorii, ~400 linii)
├── app/expenses.js (UI wydatków, ~400 linii)
├── app/incomes.js (UI przychodów, ~400 linii)
├── app/analytics.js (UI analityki, ~500 linii)
└── app/purposeBudgets.js (UI budżetów celowych, ~400 linii)
```

---

#### 3. Duplikacja kodu między renderExpenses i renderIncomes

**Przykład:**
```javascript
// renderExpenses (linie 1284-1380)
const sortedExpenses = expenses.sort((a, b) => {
  const dateA = new Date(a.date + ' ' + a.time);
  const dateB = new Date(b.date + ' ' + b.time);
  return dateB - dateA;
});

// renderIncomes (linie 1420-1510)
const sortedIncomes = incomes.sort((a, b) => {
  const dateA = new Date(a.date + ' ' + a.time);
  const dateB = new Date(b.date + ' ' + b.time);
  return dateB - dateA;
});
```

**DRY solution:**
```javascript
function sortTransactionsByDate(transactions) {
  return transactions.sort((a, b) => {
    const dateA = new Date(a.date + ' ' + a.time);
    const dateB = new Date(b.date + ' ' + b.time);
    return dateB - dateA;
  });
}
```

---

#### 4. Magic numbers wszędzie

**Przykłady:**
```javascript
// budgetCalculator.js:258-281
if (period.daysLeft <= 7) {
  conservativeFactor = 0.7;  // ❌ Co oznacza 0.7?
}

// budgetCalculator.js:590-598
if (median > limit * 1.5) {  // ❌ Dlaczego 1.5?
  baseAmount = limit * 0.9;
} else if (median < limit * 0.3) {  // ❌ Dlaczego 0.3?
  baseAmount = limit * 0.7;
} else {
  baseAmount = median * 0.4 + limit * 0.6;  // ❌ Dlaczego 0.4 i 0.6?
}

// app.js:586
if (breakdown.length <= 5) {  // ❌ Dlaczego 5?
```

**Rozwiązanie:**
```javascript
const BUDGET_CONSTANTS = {
  // Zachowawcze limity
  CONSERVATIVE_FACTOR_7_DAYS: 0.7,   // 70% dla ostatnich 7 dni
  CONSERVATIVE_FACTOR_3_DAYS: 0.5,   // 50% dla ostatnich 3 dni
  CONSERVATIVE_FACTOR_1_DAY: 0.3,    // 30% dla ostatniego dnia

  // Algorytm koperty
  MEDIAN_HIGH_THRESHOLD: 1.5,        // 150% limitu
  MEDIAN_LOW_THRESHOLD: 0.3,         // 30% limitu
  HIGH_SPENDING_FACTOR: 0.9,         // Ostrożnie przy wysokich wydatkach
  LOW_SPENDING_FACTOR: 0.7,          // Zachęcaj przy niskich
  MEDIAN_WEIGHT: 0.4,                // 40% waga mediany
  LIMIT_WEIGHT: 0.6,                 // 60% waga limitu

  // UI
  SMALL_CATEGORY_THRESHOLD: 5        // Max kategorii dla pełnego wykresu
};
```

---

### 🟢 LOW Priority Issues

#### 5. Brak JSDoc dla publicznych funkcji

**Problem:**
```javascript
// purposeBudgetManager.js
export function calculateBudgetSpent(budgetId, excludeExpenseId = null) {
  // ❌ Brak dokumentacji
  // Co robi? Jakie parametry? Co zwraca? Czy może rzucić błąd?
}
```

**Rozwiązanie:**
```javascript
/**
 * Oblicza sumę wydanych środków z budżetu celowego
 *
 * @param {string} budgetId - ID budżetu celowego
 * @param {string|null} [excludeExpenseId=null] - ID wydatku do wykluczenia z obliczeń
 * @returns {number} Suma wydanych środków w złotych
 *
 * @example
 * const spent = calculateBudgetSpent('budget_123');
 * console.log(`Wydano: ${spent} zł`);
 */
export function calculateBudgetSpent(budgetId, excludeExpenseId = null) {
  // ...
}
```

---

## ⚡ CZĘŚĆ VI: WYDAJNOŚĆ

### 🟡 MEDIUM Priority Issues

#### 1. N+1 problem w renderExpenses

**Plik:** `src/app.js:1307-1333`

**Problem:**
```javascript
const html = paginatedExpenses.map(exp => {
  const categoryIcon = exp.category ?
    getCategoryIcon(exp.category) :  // ❌ N wywołań
    '📌';

  return `
    <tr>
      <td>${exp.userId ? getBudgetUserName(exp.userId) : '-'}</td>
      <!--                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                          N wywołań dla każdego wydatku -->
      <td>${categoryIcon} ${exp.category || '-'}</td>
      <!-- ... -->
    </tr>
  `;
}).join('');
```

**Koszt:** 50 wydatków = 100 wywołań funkcji

**Rozwiązanie:**
```javascript
// Pre-compute mapy
const categoryIconsMap = new Map();
const budgetUsersMap = new Map(
  budgetUsersCache.map(u => [u.id, u.name])
);

const html = paginatedExpenses.map(exp => {
  // Lazy cache dla ikon
  if (!categoryIconsMap.has(exp.category)) {
    categoryIconsMap.set(exp.category, getCategoryIcon(exp.category));
  }
  const categoryIcon = categoryIconsMap.get(exp.category) || '📌';

  // O(1) lookup dla użytkowników
  const userName = budgetUsersMap.get(exp.userId) || '-';

  return `<tr>...</tr>`;
}).join('');
```

---

#### 2. Nieoptymalna pętla w calculateRealisedTotals

**Plik:** `src/modules/budgetCalculator.js:59-89`

**Problem:**
```javascript
export function calculateRealisedTotals(dateStr = null) {
  const incomes = getIncomes();    // ❌ Wszystkie (potencjalnie setki)
  const expenses = getExpenses();  // ❌ Wszystkie (potencjalnie setki)

  // 2 pełne pętle
  incomes.forEach(inc => { /* ... */ });
  expenses.forEach(exp => { /* ... */ });
}

// Funkcja wywoływana w:
// - renderSummary
// - calculateAvailableFunds
// - calculateCurrentLimits
// = Wielokrotnie z tymi samymi parametrami!
```

**Rozwiązanie:**
```javascript
const totalsCache = new Map();

export function calculateRealisedTotals(dateStr = null) {
  const today = dateStr || getWarsawDateString();

  // Cache hit
  if (totalsCache.has(today)) {
    return totalsCache.get(today);
  }

  // Cache miss - oblicz
  const incomes = getIncomes();
  const expenses = getExpenses();

  // ... obliczenia ...

  const result = { sumIncome, sumExpense };

  // Cache result
  totalsCache.set(today, result);

  return result;
}

// Czyść cache przy zmianie danych
export function clearTotalsCache() {
  totalsCache.clear();
}
```

---

#### 3. Throttling presence zbyt agresywny

**Plik:** `src/modules/presence.js:56-71`

**Problem:**
```javascript
activityTimeout = setTimeout(() => {
  set(presenceRef, {
    sessionId: currentSessionId,
    timestamp: serverTimestamp(),
    lastActivity: serverTimestamp(),
    isManualActivity: true
  });
}, 500);  // ❌ 500ms = 2 zapisy/sekundę do Firebase
```

**Koszt Firebase:**
- Intensywne użycie = 2 write/s
- 1 godzina = 7,200 writes
- Firebase Free tier = 50,000 writes/day
- **1 użytkownik przez 7h = cały dzienny limit!**

**Rozwiązanie:**
```javascript
}, 2000);  // 2s = 0.5 write/s (4× mniej writes)
// Nadal responsywne, ale 4× bardziej ekonomiczne
```

---

### 🟢 LOW Priority Issues

#### 4. Brak debouncing dla search inputs

**Plik:** `src/app.js:1097-1114`

**Problem:**
```javascript
newCategoryInput.addEventListener('input', () => {
  const value = newCategoryInput.value.trim().toLowerCase();

  if (value === '') {
    renderCategoryButtons(topCategories);
  } else {
    const allCategories = getCategories();  // ❌ Na każdy keystroke!
    const filtered = allCategories.filter(/* ... */);
    renderCategoryButtons(filtered);        // ❌ Re-render na każdy keystroke!
  }
});
```

**Koszt:** Wpisanie "spożywcze" (10 znaków) = 10× filtrowanie + rendering

**Rozwiązanie:**
```javascript
let inputTimeout;

newCategoryInput.addEventListener('input', () => {
  clearTimeout(inputTimeout);

  inputTimeout = setTimeout(() => {
    const value = newCategoryInput.value.trim().toLowerCase();

    if (value === '') {
      renderCategoryButtons(topCategories);
    } else {
      const allCategories = getCategories();
      const filtered = allCategories.filter(/* ... */);
      renderCategoryButtons(filtered);
    }
  }, 300);  // Debounce 300ms
});
```

---

## 📊 CZĘŚĆ VII: REKOMENDACJE

### 🚀 Plan naprawy (Prioritized Roadmap)

#### FAZA 1: KRYTYCZNE BEZPIECZEŃSTWO (1-2 dni)

**Priorytet: NATYCHMIASTOWY**

1. **Napraw sanitizer.js**
   ```javascript
   // src/utils/sanitizer.js
   ALLOWED_ATTR: ['class', 'style', 'data-value', 'data-budget-id', 'data-budget-name']
   // USUŃ: 'onclick', 'onmouseover', 'onmouseout'
   ```

2. **Zamień inline onclick na event delegation**
   - Utwórz `src/handlers/clickDelegation.js`
   - Przenieś wszystkie handlery z `window.*`
   - Użyj `data-*` attributes
   - Estimate: 6-8 godzin

3. **Dodaj sanityzację przed zapisem do Firebase**
   - Wszystkie funkcje `add*()` i `edit*()`
   - Użyj `escapeHTML()` dla wszystkich user inputs
   - Estimate: 2-3 godziny

**Wynik:** Aplikacja bezpieczna przed XSS

---

#### FAZA 2: KRYTYCZNE BUGI (2-3 dni)

**Priorytet: WYSOKI**

4. **Napraw race condition w walidacji budżetów**
   - Dodaj `validationInProgress` guard
   - Estimate: 30 minut

5. **Napraw memory leak w chartTooltip**
   - Cleanup event listeners
   - Estimate: 1 godzina

6. **Dodaj null/undefined checks**
   - `calculateBudgetSpent()`
   - Wszystkie `parseFloat()` → `Number.isFinite()`
   - Estimate: 2 godziny

7. **Popraw auto-realizację**
   - `inc.date < today` → `inc.date <= today`
   - Estimate: 15 minut

**Wynik:** Aplikacja stabilna, bez crashy

---

#### FAZA 3: REFAKTORYZACJA (1-2 tygodnie)

**Priorytet: ŚREDNI**

8. **Rozbij app.js na moduły**
   ```
   app.js (~200 linii)
   ├── app/init.js
   ├── app/categories.js
   ├── app/expenses.js
   ├── app/incomes.js
   ├── app/analytics.js
   └── app/purposeBudgets.js
   ```
   - Estimate: 3-4 dni

9. **Usuń duplikację kodu**
   - Wspólne funkcje dla expenses/incomes
   - Wspólny renderer transakcji
   - Estimate: 1 dzień

10. **Zastąp magic numbers stałymi**
    - Utwórz `src/utils/budgetConstants.js`
    - Estimate: 2 godziny

11. **Dodaj JSDoc**
    - Wszystkie publiczne funkcje
    - Estimate: 1 dzień

**Wynik:** Kod łatwy w utrzymaniu

---

#### FAZA 4: OPTYMALIZACJA (3-5 dni)

**Priorytet: ŚREDNI-NISKI**

12. **Optymalizuj rendering**
    - Napraw N+1 w renderExpenses/Incomes
    - Dodaj debouncing dla inputs
    - Estimate: 1 dzień

13. **Cache'uj obliczenia**
    - `calculateRealisedTotals()` cache
    - Invalidacja przy zmianie danych
    - Estimate: 1 dzień

14. **Zmień throttling presence**
    - 500ms → 2000ms
    - Estimate: 5 minut

**Wynik:** Aplikacja szybka i ekonomiczna

---

#### FAZA 5: INFRASTRUKTURA (1-2 tygodnie)

**Priorytet: NISKI (ale ważny długoterminowo)**

15. **Dodaj TypeScript**
    - Instalacja + konfiguracja
    - Stopniowa migracja plików
    - Estimate: 1 tydzień

16. **Dodaj testy**
    - Vitest setup
    - Unit testy dla budgetCalculator
    - Integration testy dla dataManager
    - Estimate: 1 tydzień

17. **Dodaj linting**
    - ESLint + Prettier
    - Pre-commit hooks
    - Estimate: 1 dzień

18. **Dodaj CI/CD**
    - GitHub Actions
    - Automated tests
    - Automated deployment
    - Estimate: 1 dzień

**Wynik:** Profesjonalny setup

---

### 💎 Best Practices - Długoterminowe

#### 1. Content Security Policy

Dodaj do `index.html` lub w headers serwera:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://*.firebaseio.com;
               img-src 'self' data:;">
```

#### 2. Firebase Security Rules

Sprawdź i zaktualizuj rules:
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "budget": {
          ".validate": "newData.hasChildren(['categories', 'expenses', 'incomes'])"
        }
      }
    }
  }
}
```

#### 3. Error Boundaries

Dodaj global error handler dla React-like experience:
```javascript
// src/utils/errorBoundary.js
export function setupErrorBoundary() {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showErrorMessage('Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.');

    // Log to external service (Sentry, LogRocket, etc.)
    logErrorToService(event.reason);
  });
}
```

#### 4. Performance Monitoring

Dodaj web vitals:
```javascript
// src/utils/performance.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function measurePerformance() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}
```

---

## 📈 CZĘŚĆ VIII: METRYKI I KPI

### Obecny stan:

| Metryka | Wartość | Ocena |
|---------|---------|-------|
| **Linie kodu** | 10,438 | 🟡 Średni projekt |
| **Plików** | 27 | ✅ Dobra modularność |
| **Największy plik** | 2,749 linii (app.js) | 🔴 Za duży |
| **Funkcji globalnych** | 46 | 🔴 Za dużo |
| **Zależności** | 2 | ✅ Minimalne |
| **Testy** | 0 | 🔴 Brak |
| **Luki bezpieczeństwa** | 5 (1 CRITICAL) | 🔴 Krytyczne |
| **Potencjalne bugi** | 5 (2 HIGH) | 🔴 Wysokie ryzyko |
| **Code smells** | 5 | 🟡 Do poprawy |
| **Performance issues** | 4 | 🟡 Do optymalizacji |

### Cel po naprawach:

| Metryka | Cel | Status |
|---------|-----|--------|
| **Linie kodu** | ~11,000 (z testami) | - |
| **Największy plik** | <500 linii | Po FAZA 3 |
| **Funkcji globalnych** | 0 | Po FAZA 1 |
| **Testy** | >80% coverage | Po FAZA 5 |
| **Luki bezpieczeństwa** | 0 CRITICAL, 0 HIGH | Po FAZA 1 |
| **Potencjalne bugi** | 0 HIGH | Po FAZA 2 |
| **TypeScript coverage** | 100% | Po FAZA 5 |
| **ESLint errors** | 0 | Po FAZA 5 |

---

## ✅ CZĘŚĆ IX: CHECKLIST IMPLEMENTACJI

### Faza 1: Bezpieczeństwo (CRITICAL)

- [ ] Napraw `src/utils/sanitizer.js` - usuń onclick z ALLOWED_ATTR
- [ ] Utwórz `src/handlers/clickDelegation.js`
- [ ] Zamień wszystkie `onclick="window.*"` na `data-action="*"`
- [ ] Dodaj `escapeHTML()` przed zapisem kategorii
- [ ] Dodaj `escapeHTML()` przed zapisem wydatków
- [ ] Dodaj `escapeHTML()` przed zapisem przychodów
- [ ] Dodaj `escapeHTML()` przed zapisem budżetów celowych
- [ ] Usuń `onclick` z `index.html` (linie 69, 74, 88)
- [ ] Test manualny: spróbuj XSS przez nazwy kategorii
- [ ] Test manualny: spróbuj XSS przez opisy wydatków

### Faza 2: Krytyczne bugi (HIGH)

- [ ] Dodaj `validationInProgress` guard w `debouncedValidateBudgets()`
- [ ] Dodaj cleanup event listeners w `renderCategoriesChart()`
- [ ] Zmień `JSON.stringify` comparison na hash comparison
- [ ] Dodaj null checks w `calculateBudgetSpent()`
- [ ] Dodaj `Number.isFinite()` dla wszystkich `parseFloat()`
- [ ] Zmień `inc.date < today` na `inc.date <= today`
- [ ] Test: szybkie dodawanie 10 wydatków (race condition)
- [ ] Test: 20× zmiana okresu analityki (memory leak)

### Faza 3: Refaktoryzacja (MEDIUM)

- [ ] Utwórz `src/app/init.js`
- [ ] Utwórz `src/app/categories.js` - przenieś funkcje kategorii
- [ ] Utwórz `src/app/expenses.js` - przenieś funkcje wydatków
- [ ] Utwórz `src/app/incomes.js` - przenieś funkcje przychodów
- [ ] Utwórz `src/app/analytics.js` - przenieś funkcje analityki
- [ ] Utwórz `src/app/purposeBudgets.js` - przenieś funkcje budżetów
- [ ] Zredukuj `app.js` do <500 linii
- [ ] Utwórz `src/utils/transactionHelpers.js` - wspólny kod
- [ ] Utwórz `src/utils/budgetConstants.js` - wszystkie stałe
- [ ] Dodaj JSDoc do wszystkich publicznych funkcji

### Faza 4: Optymalizacja (MEDIUM)

- [ ] Dodaj pre-computed mapy w `renderExpenses()`
- [ ] Dodaj pre-computed mapy w `renderIncomes()`
- [ ] Dodaj cache dla `calculateRealisedTotals()`
- [ ] Dodaj invalidację cache przy zmianie danych
- [ ] Zmień throttling presence z 500ms na 2000ms
- [ ] Dodaj debouncing (300ms) dla category search
- [ ] Dodaj debouncing (300ms) dla source search
- [ ] Test: renderowanie 100 wydatków (wydajność)
- [ ] Test: 10× keystroke w search (debouncing)

### Faza 5: Infrastruktura (LOW)

- [ ] Instaluj TypeScript + @types
- [ ] Konfiguruj `tsconfig.json`
- [ ] Migruj `src/utils/*.js` → `*.ts`
- [ ] Migruj `src/modules/*.js` → `*.ts`
- [ ] Instaluj Vitest
- [ ] Napisz testy dla `budgetCalculator.js`
- [ ] Napisz testy dla `dataManager.js`
- [ ] Instaluj ESLint + Prettier
- [ ] Konfiguruj pre-commit hooks
- [ ] Setup GitHub Actions (CI)
- [ ] Setup automated deployment
- [ ] Cel: >80% test coverage

---

## 🎓 CZĘŚĆ X: WNIOSKI

### Mocne strony aplikacji:

1. **✅ Zaawansowana funkcjonalność**
   - Inteligentna koperta dnia (algorytm v5) - unikalny feature
   - Budżety celowe z automatyczną walidacją
   - Planowanie transakcji
   - Multi-user support
   - Real-time synchronizacja

2. **✅ Dobra architektura modułowa**
   - Jasny podział na modules/components/utils
   - Reużywalne funkcje
   - ES6 modules

3. **✅ Minimalne zależności**
   - Tylko Firebase + DOMPurify
   - Vanilla JavaScript (brak frameworka)
   - Szybki build (Vite)

4. **✅ Zaawansowane algorytmy**
   - Inteligentne limity z zabezpieczeniami
   - Koperta bazująca na medianie 30d
   - Wykrywanie anomalii
   - Fuzzy matching dla ikon

### Słabości wymagające naprawy:

1. **🔴 KRYTYCZNE problemy bezpieczeństwa**
   - XSS przez błędną konfigurację DOMPurify
   - Masowe użycie inline onclick (46 funkcji globalnych)
   - Brak sanityzacji przed zapisem do Firebase
   - **Priorytet: NATYCHMIASTOWY**

2. **🔴 Bugi wysokiego ryzyka**
   - Race conditions w async operations
   - Memory leaks w event listeners
   - Brak walidacji null/undefined
   - **Priorytet: WYSOKI**

3. **🟡 Code smells**
   - Monolit app.js (2749 linii)
   - Duplikacja kodu
   - Magic numbers
   - Brak dokumentacji
   - **Priorytet: ŚREDNI**

4. **🟡 Brak infrastruktury deweloperskiej**
   - Brak testów
   - Brak TypeScript
   - Brak lintingu
   - Brak CI/CD
   - **Priorytet: NISKI (ale ważny długoterminowo)**

### Rekomendacja końcowa:

**Aplikacja Krezus jest funkcjonalnie zaawansowana i dobrze zaprojektowana**, ale wymaga **natychmiastowych napraw bezpieczeństwa** przed użyciem produkcyjnym.

**Plan działania:**
1. **Tydzień 1:** Napraw CRITICAL security issues (FAZA 1)
2. **Tydzień 2:** Napraw HIGH priority bugs (FAZA 2)
3. **Tydzień 3-4:** Refaktoryzacja (FAZA 3)
4. **Tydzień 5:** Optymalizacja (FAZA 4)
5. **Tydzień 6-7:** Infrastruktura (FAZA 5)

**Po implementacji tych zmian aplikacja będzie gotowa do użycia produkcyjnego.**

---

## 📞 KONTAKT

Pytania dotyczące tego raportu:
- **GitHub Issues:** https://github.com/wordsmithseo/krezus/issues
- **Email:** [autor aplikacji]

---

**Koniec raportu audytu**
*Wygenerowano automatycznie przez Claude Code*
*Data: 2025-11-17*
