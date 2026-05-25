# System zaproszeń do współdzielenia budżetu

## Cel

Zastąpić obecny mechanizm "budżetowych użytkowników" (dodawanych jako etykiety w modalu profilu)
prawdziwym systemem zaproszeń opartym na oddzielnych kontach Firebase Auth.

Każda osoba ma własne konto. Właściciel budżetu zaprasza drugą osobę emailem.
Zaproszona osoba loguje się i akceptuje zaproszenie — od tej chwili widzi i edytuje budżet właściciela.

## Stan obecny

- Dane przechowywane pod `users/{uid}/budget/`
- "Użytkownicy budżetu" to tylko etykiety (imiona) w `budgetUsers/` — nie mają własnych kont Firebase
- Reguła bezpieczeństwa: `$uid === auth.uid` — każdy widzi tylko swoje drzewo
- Transakcje mają pole `userId` wskazujące na ID z `budgetUsers` (nie Firebase UID)

## Decyzje do podjęcia przed startem

1. **Wysyłka emaila** — Firebase nie wysyła emaili. Opcje:
   - EmailJS (client-side, darmowy tier) — apka wysyła email automatycznie
   - Link z tokenem — apka generuje link, właściciel kopiuje i wysyła ręcznie

2. **Kolidujące konta** — co jeśli zaproszony już ma swoje konto krezus?
   - Przełącznik "mój budżet / współdzielony"
   - Albo: zaproszony zawsze pracuje na budżecie właściciela (prostsze MVP)

---

## Plan implementacji

### Faza 0 — Decyzje projektowe
Odpowiedzieć na dwa pytania powyżej przed pisaniem kodu.

### Faza 1 — Nowa struktura danych Firebase

Obecna struktura nie zmienia się. Dochodzą dwie nowe ścieżki:

```
users/{ownerUid}/budget/
  sharedWith/
    {guestUid}/
      email: string
      name: string
      joinedAt: number

pendingInvitations/          ← nowa kolekcja top-level
  {token}/
    ownerUid: string
    ownerName: string
    inviteeEmail: string
    createdAt: number
```

### Faza 2 — Nowe Firebase Security Rules

```json
"users": {
  "$uid": {
    ".read": "$uid === auth.uid || root.child('users/'+$uid+'/budget/sharedWith/'+auth.uid).exists()",
    ".write": "$uid === auth.uid || root.child('users/'+$uid+'/budget/sharedWith/'+auth.uid).exists()"
  }
},
"pendingInvitations": {
  "$token": {
    ".read": "auth.uid !== null",
    ".write": "auth.uid !== null"
  }
}
```

Deploy: `firebase database:rules:deploy`

**Ryzyko:** Zły deploy = brak dostępu do apki. Testować najpierw lokalnie / na staging.

### Faza 3 — Kontekst aktywnego budżetu

Nowy moduł `src/modules/budgetContext.js`:
- `getActiveBudgetUid()` — zwraca UID właściciela aktywnego budżetu
- `setActiveBudgetUid(uid)` — przełączenie budżetu, persist w `sessionStorage`

Zmiana w `app.js`: `loadAllData(getActiveBudgetUid())` zamiast `loadAllData(auth.uid)`

### Faza 4 — Logika zaproszeń

Nowy moduł `src/modules/sharing.js`:
- `createInvitation(inviteeEmail)` → generuje token, zapisuje do `pendingInvitations/`
- `acceptInvitation(token)` → dodaje gościa do `sharedWith` właściciela, usuwa token
- `declineInvitation(token)` → usuwa token
- `revokeAccess(guestUid)` → usuwa gościa z `sharedWith`
- `checkPendingInvitations(userEmail)` → sprawdza zaproszenia po emailu zalogowanego

Wywołanie `checkPendingInvitations` następuje zaraz po zalogowaniu, przed `loadAllData`.

### Faza 5 — Migracja istniejących danych

Jednorazowa operacja:
- Drugi użytkownik rejestruje własne konto Firebase
- Jego transakcje (`userId === stare-id`) mają `userId` przepisane na jego nowy Firebase UID
- Właściciel dostaje `sharedWith/{nowy-uid}` w swojej bazie
- Stary `budgetUsers` zostaje usunięty z Firebase

**Ryzyko:** Dane transakcji — nieodwracalne. Zrobić backup przed migracją.

### Faza 6 — UI

**Profile modal:**
- Usuń sekcję "Dodaj użytkownika" (obecny formularz z imieniem)
- Dodaj pole email + przycisk "Wyślij zaproszenie"
- Pokaż listę osób z dostępem (z opcją "Cofnij dostęp")

**Po zalogowaniu:**
- Jeśli `checkPendingInvitations` zwróci wynik → modal "Masz zaproszenie do budżetu od [X], przyjąć?"
- Po przyjęciu: `setActiveBudgetUid(ownerUid)` + przeładowanie danych

### Faza 7 — Cleanup

Po tym jak wszystko działa:
- Usunąć z `auth.js`: `addBudgetUser`, `updateBudgetUser`, `deleteBudgetUser`, `getBudgetUsers`, `subscribeToBudgetUsers`
- Usunąć walidację `budgetUsers` z Firebase Rules
- Usunąć odpowiednie fragmenty z `modals.js` i `app.js`

---

## Tabela ryzyk

| Faza | Ryzyko | Uwaga |
|------|--------|-------|
| 2 (Rules) | Wysokie | Zły deploy = brak dostępu do apki |
| 3 (kontekst) | Średnie | Bug = cała apka ładuje zły budżet |
| 5 (migracja) | Wysokie | Nieodwracalne — backup beforehand |
| 6 (UI) | Niskie | Czysto frontendowe |

---

## Firebase CLI

Projekt podpięty: `krezus-e3070`
Pliki konfiguracyjne: `.firebaserc`, `firebase.json`, `database.rules.json` (do stworzenia przed deployem)
