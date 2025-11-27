# 🎨 Krezus Unified UI System - Style Guide

> **Version 2.0.0** - Kompleksowy system projektowania dla aplikacji Krezus

## 📋 Spis Treści

1. [Wprowadzenie](#wprowadzenie)
2. [Architektura Systemu](#architektura-systemu)
3. [Design Tokens](#design-tokens)
4. [Komponenty](#komponenty)
5. [Layout](#layout)
6. [Utilities](#utilities)
7. [Wytyczne Użycia](#wytyczne-użycia)
8. [Responsive Design](#responsive-design)

---

## 🌟 Wprowadzenie

Krezus Unified UI System to modularny, skalowalny system projektowania zbudowany na fundamencie **design tokens**, reużywalnych **komponentów** i **utility classes**. Zapewnia spójny wygląd aplikacji i przyspiesza rozwój nowych funkcji.

### Główne Zalety

✅ **Spójność wizualna** - Wszystkie elementy UI oparte na tych samych tokenach
✅ **Szybszy rozwój** - Gotowe komponenty do natychmiastowego użycia
✅ **Łatwe utrzymanie** - Zmiany w tokenach wpływają na całą aplikację
✅ **Skalowalność** - Łatwo dodawać nowe komponenty i warianty
✅ **Responsive** - Built-in wsparcie dla urządzeń mobilnych

---

## 🏗️ Architektura Systemu

```
src/styles/
├── tokens/           # Design tokens (zmienne CSS)
│   ├── colors.css
│   ├── spacing.css
│   ├── typography.css
│   ├── shadows.css
│   └── animations.css
├── layout/           # Struktura layoutu
│   ├── auth.css
│   ├── header.css
│   ├── navigation.css
│   ├── container.css
│   └── footer.css
├── components/       # Komponenty UI
│   ├── buttons.css
│   ├── cards.css
│   ├── forms.css
│   ├── modals.css
│   ├── tables.css
│   ├── badges.css
│   ├── lists.css
│   └── misc.css
├── utilities/        # Klasy pomocnicze
│   └── utilities.css
├── base.css          # Globalne style
└── main.css          # Główny plik (importuje wszystko)
```

---

## 🎨 Design Tokens

Design tokens to fundamentalne wartości definiujące wizualny język aplikacji.

### Kolory

#### Paleta Główna

```css
/* Primary (Niebieski) */
--color-primary-500: #4a9fd8;    /* Główny */
--color-primary-600: #2980b9;    /* Ciemniejszy */

/* Success (Zielony) */
--color-success-400: #5cb88a;    /* Główny */

/* Danger (Czerwony) */
--color-danger-500: #e85c6a;     /* Główny */

/* Warning (Pomarańczowy) */
--color-warning-500: #e89d3f;    /* Główny */

/* Neutral (Szarości) */
--color-neutral-800: #1f2937;    /* Dark */
--color-neutral-500: #6c717a;    /* Gray */
--color-neutral-100: #f8f9fa;    /* Light Gray */
```

#### Aliasy Semantyczne

```css
--primary: var(--color-primary-500);
--success: var(--color-success-400);
--danger: var(--color-danger-500);
--warning: var(--color-warning-500);
--dark: var(--color-neutral-800);
--gray: var(--color-neutral-500);
--light-gray: var(--color-neutral-100);
```

#### Gradient Główny

```css
--gradient-primary: linear-gradient(135deg, #6b7fd7 0%, #9b7ec4 100%);
```

### Spacing (Odstępy)

System odstępów oparty na jednostce **4px**:

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
```

#### Aliasy Semantyczne

```css
--gap-sm: var(--space-2);       /* 8px */
--gap-md: var(--space-3);       /* 12px */
--gap-lg: var(--space-4);       /* 16px */
--padding-md: var(--space-4);   /* 16px */
--margin-lg: var(--space-5);    /* 20px */
```

### Typography

#### Font Family

```css
--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...;
```

#### Rozmiary Czcionek

```css
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.25rem;      /* 20px */
--font-size-xl: 1.5rem;       /* 24px */
--font-size-2xl: 1.875rem;    /* 30px */
--font-size-3xl: 2.25rem;     /* 36px */
--font-size-4xl: 3rem;        /* 48px */
```

#### Wagi Czcionek

```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
```

### Shadows (Cienie)

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
```

### Border Radius

```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-full: 9999px;  /* Pełne zaokrąglenie */
```

### Animations

```css
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-normal: 300ms;
--duration-slow: 500ms;

--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: all var(--duration-normal) var(--ease-in-out);
```

---

## 🧩 Komponenty

### Buttons (Przyciski)

#### Podstawowy Button

```html
<button class="btn btn-primary">Zapisz</button>
```

#### Warianty Kolorystyczne

```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-warning">Warning</button>
<button class="btn btn-secondary">Secondary</button>
```

#### Rozmiary

```html
<button class="btn btn-primary btn--sm">Mały</button>
<button class="btn btn-primary btn--md">Średni (domyślny)</button>
<button class="btn btn-primary btn--lg">Duży</button>
```

#### Icon Button

```html
<button class="btn-icon">✏️</button>
```

### Cards (Karty)

#### Section Card

```html
<div class="section-card">
  <h2>Tytuł Sekcji</h2>
  <p>Treść karty...</p>
</div>
```

#### Stat Card

```html
<div class="stat-card">
  <div class="stat-label">Suma wydatków</div>
  <div class="stat-value">
    1,234.56
    <span class="stat-unit">PLN</span>
  </div>
</div>
```

#### Warianty Stat Card

```html
<div class="stat-card success">...</div>
<div class="stat-card danger">...</div>
<div class="stat-card warning">...</div>
<div class="stat-card beige">...</div>
```

### Forms (Formularze)

#### Form Group

```html
<div class="form-group">
  <label>Nazwa</label>
  <input type="text" placeholder="Wprowadź nazwę">
</div>
```

#### Form Row (Grid Layout)

```html
<div class="form-row">
  <div class="form-group">...</div>
  <div class="form-group">...</div>
</div>
```

### Modals (Okna Modalne)

```html
<div class="modal active">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Tytuł</h2>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">
      Treść modala...
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary">Anuluj</button>
      <button class="btn btn-primary">Zapisz</button>
    </div>
  </div>
</div>
```

### Tables (Tabele)

```html
<div class="table-container">
  <table>
    <thead>
      <tr>
        <th>Kolumna 1</th>
        <th>Kolumna 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Dane 1</td>
        <td>Dane 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Badges (Etykiety)

```html
<span class="badge badge-primary">Primary</span>
<span class="status-badge status-normal">Normal</span>
<span class="status-badge status-completed">Ukończone</span>
```

---

## 📐 Layout

### Container

```html
<div class="container">
  <!-- Treść ograniczona do max-width: 1400px -->
</div>
```

### Stats Grid

```html
<div class="stats-grid">
  <div class="stat-card">...</div>
  <div class="stat-card">...</div>
  <div class="stat-card">...</div>
</div>
```

### Navigation

```html
<nav class="app-nav">
  <div class="nav-container">
    <div class="nav-menu">
      <button class="nav-btn active">📊 Pulpit</button>
      <button class="nav-btn">💰 Przychody</button>
      <button class="nav-btn">💸 Wydatki</button>
    </div>
  </div>
</nav>
```

---

## 🛠️ Utilities

### Spacing

```html
<!-- Margin -->
<div class="mt-4 mb-8">...</div>  <!-- margin-top: 16px, margin-bottom: 32px -->
<div class="mx-auto">...</div>    <!-- margin: 0 auto -->

<!-- Padding -->
<div class="p-4">...</div>        <!-- padding: 16px -->
<div class="px-6 py-4">...</div>  <!-- padding: 16px 24px -->
```

### Text

```html
<div class="text-center text-bold text-primary">
  Wyśrodkowany, pogrubiony, niebieski tekst
</div>

<div class="text-sm text-muted">
  Mały, wyszarzony tekst
</div>
```

### Display & Flex

```html
<div class="flex items-center justify-between gap-4">
  <div class="flex-1">Lewa strona</div>
  <div>Prawa strona</div>
</div>
```

### Kolory Tła

```html
<div class="bg-primary text-white">...</div>
<div class="bg-light">...</div>
<div class="bg-success text-white">...</div>
```

### Cienie i Zaokrąglenia

```html
<div class="shadow-lg rounded-lg">
  Karta z dużym cieniem i zaokrąglonymi rogami
</div>
```

---

## 🎯 Wytyczne Użycia

### Kiedy Użyć Design Tokens

✅ **TAK** - Używaj tokenów zamiast hardcoded wartości:
```css
/* ✅ Dobrze */
.my-element {
  color: var(--primary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}

/* ❌ Źle */
.my-element {
  color: #4a9fd8;
  padding: 16px;
  border-radius: 8px;
}
```

### Kiedy Użyć Komponentów

✅ Używaj gotowych komponentów dla standardowych elementów UI
✅ Rozszerzaj komponenty za pomocą utility classes
✅ Twórz nowe komponenty dla złożonych, powtarzalnych wzorców

### Kiedy Użyć Utilities

✅ Do szybkich, jednorazowych modyfikacji
✅ Dla responsywnego layoutu (flex, grid)
✅ Do spacing i pozycjonowania

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile-first approach */
@media (max-width: 480px)  { /* Mobile */ }
@media (max-width: 768px)  { /* Tablet */ }
@media (max-width: 1024px) { /* Desktop small */ }
@media (min-width: 1200px) { /* Desktop large */ }
```

### Responsive Utilities

```html
<!-- Na mobile: kolumna, na desktop: wiersz -->
<div class="flex flex-column flex-row@md">
  ...
</div>
```

---

## 🚀 Przykłady Użycia

### Przykład 1: Karta Statystyk

```html
<div class="stat-card success">
  <div class="stat-label">Suma przychodów</div>
  <div class="stat-value">
    5,678.90
    <span class="stat-unit">PLN</span>
  </div>
</div>
```

### Przykład 2: Formularz z Grid

```html
<div class="section-card">
  <h2>Dodaj Wydatek</h2>

  <div class="form-row">
    <div class="form-group">
      <label>Kwota</label>
      <input type="number" placeholder="0.00">
    </div>

    <div class="form-group">
      <label>Kategoria</label>
      <select>
        <option>Wybierz kategorię</option>
      </select>
    </div>
  </div>

  <div class="form-actions">
    <button class="btn btn-secondary">Anuluj</button>
    <button class="btn btn-success">Zapisz</button>
  </div>
</div>
```

### Przykład 3: Lista z Akcjami

```html
<div class="category-item">
  <div>
    <span class="category-name">Zakupy</span>
    <span class="category-count">(12 transakcji)</span>
  </div>

  <div class="actions">
    <button class="btn-icon">✏️</button>
    <button class="btn-icon">🗑️</button>
  </div>
</div>
```

---

## 🎓 Najlepsze Praktyki

1. **Zawsze używaj tokenów** zamiast hardcoded wartości
2. **Preferuj komponenty** nad pisaniem custom CSS
3. **Używaj utility classes** do szybkich modyfikacji
4. **Zachowaj spójność** w nazewnictwie i strukturze
5. **Testuj responsywność** na różnych urządzeniach
6. **Dokumentuj** nowe komponenty i wzorce

---

## 📝 Dodatkowe Zasoby

- **Struktura plików**: `/src/styles/`
- **Tokeny**: `/src/styles/tokens/`
- **Komponenty**: `/src/styles/components/`
- **Backup starego CSS**: `/src/styles/main.css.backup`

---

**Pytania?** Skontaktuj się z zespołem deweloperskim lub zobacz przykłady w kodzie aplikacji.

**Wersja**: 2.0.0
**Ostatnia aktualizacja**: 2025-11-27
