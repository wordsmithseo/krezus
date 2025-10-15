# Krezus - Planer Budżetu v2.0

Nowoczesna aplikacja webowa do zarządzania budżetem domowym z funkcjami zaawansowanymi takimi jak koperta dnia, planowanie transakcji i analiza wydatków.

## 🚀 Zmiany w wersji 2.0

### ✅ Zrealizowane ulepszenia

1. **Modularyzacja kodu** - Pełna refaktoryzacja na moduły ES6
2. **TypeScript** - Dodano JSDoc dla lepszego type checking
3. **Ujednolicone komentarze** - Wszystkie komentarze w języku polskim
4. **Firebase Auth** - Pełna integracja z Firebase Authentication
5. **Struktura danych** - Poprawiona hierarchia: `users/{userId}/...`
6. **Edycja profilu** - Modal z możliwością zmiany nazwy użytkownika
7. **Admin przez email** - Automatyczne uprawnienia dla `slawomir.sprawski@gmail.com`
8. **Aria-labels** - Pełna dostępność dla czytników ekranowych
9. **Media queries** - Responsive design dla mobile, tablet i desktop
10. **Clamp() fonts** - Płynne skalowanie czcionek
11. **Walidacja formularzy** - Pełna walidacja wszystkich pól
12. **Error boundaries** - Globalna obsługa błędów
13. **Loading states** - Eleganckie loadery i animacje

### 🔧 Technologie

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Backend**: Firebase (Auth + Realtime Database)
- **Style**: CSS3 z Flexbox/Grid
- **Wykresy**: Chart.js
- **Animacje**: Canvas Confetti

## 📁 Struktura projektu

```
krezus-budget-app/
├── index.html
├── package.json
├── .gitignore
├── README.md
│
├── src/
│   ├── config/
│   │   └── firebase.js          # Konfiguracja Firebase
│   │
│   ├── modules/
│   │   ├── auth.js              # Uwierzytelnianie
│   │   ├── budgetCalculator.js  # Logika budżetowa
│   │   ├── dataManager.js       # Zarządzanie danymi
│   │   └── chartRenderer.js     # Wykresy (TODO)
│   │
│   ├── components/
│   │   ├── modals.js            # Komponenty modali
│   │   ├── forms.js             # (TODO)
│   │   └── tables.js            # (TODO)
│   │
│   ├── utils/
│   │   ├── dateHelpers.js       # Pomocnicze funkcje dat
│   │   ├── validators.js        # Walidatory
│   │   ├── errorHandler.js      # Obsługa błędów
│   │   └── constants.js         # Stałe aplikacji
│   │
│   ├── styles/
│   │   └── main.css             # Style CSS
│   │
│   └── app.js                   # Główna aplikacja
│
└── assets/
    └── images/                  # (opcjonalnie)
```

## 🔨 Instalacja

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/TWOJ-USERNAME/krezus-budget-app.git
cd krezus-budget-app
```

### 2. Zainstaluj zależności

```bash
npm install
```

### 3. Konfiguracja Firebase

Firebase jest już skonfigurowany w `src/config/firebase.js`. Jeśli chcesz użyć własnego projektu:

1. Utwórz projekt na [Firebase Console](https://console.firebase.google.com)
2. Włącz **Authentication** (Email/Password)
3. Włącz **Realtime Database**
4. Skopiuj dane konfiguracyjne do `src/config/firebase.js`

### 4. Uruchom lokalnie

```bash
npm run dev
```

Aplikacja będzie dostępna na `http://localhost:5173`

## 📤 Wrzucanie na GitHub

### Pierwsza publikacja

```bash
# 1. Inicjalizuj git (jeśli jeszcze nie zrobione)
git init

# 2. Dodaj pliki
git add .

# 3. Pierwszy commit
git commit -m "Initial commit: Krezus Budget App v2.0"

# 4. Utwórz repozytorium na GitHub.com
# Następnie dodaj remote:
git remote add origin https://github.com/TWOJ-USERNAME/krezus-budget-app.git

# 5. Wypchnij na GitHub
git branch -M main
git push -u origin main
```

### Kolejne aktualizacje

```bash
git add .
git commit -m "Opis zmian"
git push
```

## 🔐 Konfiguracja Firebase Rules

### Realtime Database Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## 👤 Funkcjonalności użytkownika

### Zwykły użytkownik

- ✅ Dodawanie wydatków (zwykłych i planowanych)
- ✅ Przeglądanie historii
- ✅ Wykresy i statystyki
- ✅ Edycja własnego profilu

### Administrator (slawomir.sprawski@gmail.com)

- ✅ Wszystkie funkcje użytkownika
- ✅ Dodawanie źródeł finansów
- ✅ Edycja/usuwanie kategorii
- ✅ Edycja/usuwanie transakcji
- ✅ Ustawianie dat końcowych
- ✅ Edycja celu oszczędności
- ✅ Edycja stanu środków (korekty)

## 🎨 Responsywność

- **Mobile** (< 480px): Pojedyncze kolumny, pełna szerokość
- **Tablet** (481-768px): 2 kolumny dla kart
- **Desktop** (769-1024px): 3 kolumny dla kart
- **Wide** (> 1024px): 4 kolumny dla kart

## ⌨️ Skróty klawiszowe

- `Escape` - Zamknij modal
- `Enter` - Zatwierdź formularz

## 🐛 Znane problemy i TODO

- [ ] Dokończyć komponenty forms.js i tables.js
- [ ] Dodać eksport do CSV/Excel
- [ ] Dodać powiadomienia push
- [ ] Dodać tryb offline
- [ ] Dodać testy jednostkowe
- [ ] Dodać CI/CD pipeline

## 📝 Changelog

### v2.0.0 (2025-01-XX)

- ✅ Pełna refaktoryzacja na moduły ES6
- ✅ Integracja Firebase Authentication
- ✅ Poprawiona struktura danych
- ✅ Dodano edycję profilu
- ✅ Pełna dostępność (ARIA)
- ✅ Responsive design dla wszystkich urządzeń
- ✅ Walidacja formularzy
- ✅ Globalna obsługa błędów
- ✅ Loading states

### v1.0.0 (2025-01-XX)

- 🎉 Pierwsza wersja aplikacji

## 👨‍💻 Autor

**Sławomir Sprawski**

## 📄 Licencja

MIT License - możesz swobodnie używać i modyfikować kod.

## 🤝 Wkład w projekt

Pull requesty są mile widziane! Dla większych zmian, najpierw otwórz issue.

## 📧 Kontakt

W razie pytań: slawomir.sprawski@gmail.com

---

**Enjoy budgeting! 💰**
