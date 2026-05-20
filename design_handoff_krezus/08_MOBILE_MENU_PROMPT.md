# Prompt dla Claude Code — Mobile menu (drawer)

Dodajemy do redesignu **menu mobilne (drawer)** — bo dotąd na małych ekranach (≤ 900px) sidebar po prostu znikał i nie było jak nawigować. Wklej ten prompt do Claude Code.

---

## PROMPT (kopiuj od tej linii w dół)

W aktualnym redesignie Krezusa brakuje menu na ekranach mobilnych — sidebar znika przy szerokości ≤ 900px i nie ma żadnej alternatywy. **Zaktualizowany prototyp referencyjny `design_handoff_krezus/reference_design/`** ma już dodane mobile menu (drawer + hamburger). Twoim zadaniem jest odtworzyć ten wzorzec w istniejącej bazie kodu.

**Zasady:**
1. **Najpierw przeczytaj** te 4 pliki w `reference_design/`:
   - `Krezus Redesign.html` — sekcja CSS `/* Mobile menu (drawer) */` (mniej więcej w okolicy `@media (max-width: 900px)`)
   - `src/icons.jsx` — dodana ikona `Menu`
   - `src/components.jsx` — zmiany w `Sidebar` (prop `mobileOpen`, `onMobileClose`, wrapper backdrop) oraz `TopBar` (przycisk hamburger)
   - `src/app.jsx` — state `mobileMenu` + przekazanie propsów
2. **Implementuj krok po kroku** (5 osobnych commitów). Po każdym kroku odpalasz apkę, sprawdzasz że działa, pokazujesz mi diff i czekasz na "OK".
3. Nie ruszaj niczego poza obszarem mobile menu. Wygląd na desktop **musi pozostać identyczny**.

---

### Behawior, który ma być spełniony

✅ Na ≤ 900px sidebar jest schowany.
✅ W topbarze (po lewej, przed `h1`) pojawia się hamburger button (ikona `Menu`).
✅ Klik hamburger → sidebar wjeżdża z lewej (slide-in z `transform: translateX(-100%) → 0`, 220ms, `cubic-bezier(.2,.8,.2,1)`).
✅ Pod sidebarem pojawia się półprzezroczysty backdrop z blur (`color-mix(in srgb, var(--ink-1) 50%, transparent)` + `backdrop-filter: blur(4px)`).
✅ Sidebar na mobile ma szerokość `min(288px, 84vw)` i shadow-lg.
✅ Klik w nav item → drawer się zamyka **i** następuje zmiana widoku.
✅ Klik w backdrop → drawer się zamyka.
✅ Klawisz **Escape** → drawer się zamyka.
✅ Gdy drawer otwarty: `body { overflow: hidden }` (blokada scrolla pod spodem).
✅ Na ≤ 900px presence pill ("Magda online") oraz tekst "Wyloguj" są ukryte w topbarze (zostają same ikony) — żeby na małych ekranach był sens.
✅ Na > 900px (desktop) — wszystko działa jak dotąd. **Hamburger niewidoczny.** Backdrop niewidoczny. Sidebar normalny sticky.

---

### Krok 1 — Ikona Menu

W pliku z ikonami dodaj ikonę `Menu` (3 poziome linie). Wzorzec w `reference_design/src/icons.jsx`:

```jsx
Menu: (p) => <Ic d={<><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>} {...p}/>,
```

Jeśli używasz `lucide-react` — to po prostu `<Menu size={18}/>` z `lucide-react`. Wystarczy zaimportować.

**Kryterium ukończenia:** `<Menu/>` ikona renderuje się w dowolnym komponencie.

---

### Krok 2 — CSS dla drawer + backdrop + hamburger

W globalnym CSS (tam gdzie reszta tokenów / shell styles), **przed** istniejącym `@media (max-width: 900px)`, dodaj:

```css
/* Mobile menu (drawer) */
.mobile-menu-btn { display: none; }
.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--ink-1) 50%, transparent);
  backdrop-filter: blur(4px);
  z-index: 98;
  animation: backdropIn 200ms ease-out;
}
@keyframes backdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

Następnie **zmień** istniejący `@media (max-width: 900px)`:
- Usuń `.sidebar { display: none; }`.
- Dodaj reguły z `reference_design/Krezus Redesign.html` (sekcja "sm screens" pod `@media (max-width: 900px)`).

W skrócie reguły mobile:
```css
@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; }
  .content { padding: 20px 16px 60px; }
  .topbar { padding: 14px 16px; }

  .mobile-menu-btn { display: inline-flex; }

  .sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: min(288px, 84vw);
    z-index: 99;
    transform: translateX(-100%);
    transition: transform 220ms cubic-bezier(.2,.8,.2,1);
    box-shadow: var(--shadow-lg);
    height: 100vh;
  }
  .sidebar[data-open="true"] { transform: translateX(0); }
  .sidebar-backdrop[data-open="true"] { display: block; }

  body[data-drawer-open="true"] { overflow: hidden; }

  .topbar .presence { display: none; }
  .topbar .logout-text { display: none; }
}
```

**Kryterium ukończenia:** w dev tools, gdy ręcznie dodasz `data-open="true"` na `<aside class="sidebar">` na viewport < 900px, sidebar wjedzie z lewej i nie będzie scrollu strony.

---

### Krok 3 — Sidebar: dodaj propsy `mobileOpen` + `onMobileClose`

Zmodyfikuj komponent `Sidebar`:
1. Dodaj propsy `mobileOpen = false`, `onMobileClose`.
2. Dodaj `useEffect` który:
   - Ustawia `document.body.dataset.drawerOpen = mobileOpen ? "true" : ""`.
   - Gdy `mobileOpen` true — nasłuchuje `keydown` na Escape i woła `onMobileClose`.
3. Funkcję wybierania item nawigacji zawiń w wrapper `pick(id)` który robi `onSection(id)` i `onMobileClose()`.
4. Owiń `<aside class="sidebar">` w fragment razem z `<div class="sidebar-backdrop">`:
   ```jsx
   <>
     <div className="sidebar-backdrop"
          data-open={mobileOpen ? "true" : "false"}
          onClick={onMobileClose}
          aria-hidden="true"/>
     <aside className="sidebar" data-open={mobileOpen ? "true" : "false"}>
       {/* ... istniejąca zawartość ... */}
     </aside>
   </>
   ```
5. Wszystkie `<NavItem onClick={() => onSection(item.id)}>` zamień na `onClick={() => pick(item.id)}`.

**Kryterium ukończenia:** Sidebar w dev tools (< 900px) — gdy ustawisz `mobileOpen` true z parent componentu — pokazuje się jako drawer z backdropem. Klik w backdrop go zamyka. Esc też.

---

### Krok 4 — TopBar: hamburger button

Zmodyfikuj `TopBar`:
1. Dodaj prop `onMobileMenu`.
2. **Przed** `<h1>` (jako pierwszy element w `.topbar`) wstaw:
   ```jsx
   <button
     className="btn ghost icon-only mobile-menu-btn"
     onClick={onMobileMenu}
     aria-label="Otwórz menu"
     title="Menu"
   >
     <Menu size={18}/>
   </button>
   ```
3. W actions tekst "Wyloguj" zawiń w `<span className="logout-text">Wyloguj</span>` (żeby CSS mógł go ukryć na mobile, zostawiając samą ikonę).

**Kryterium ukończenia:** na desktopie hamburger niewidoczny. Na mobile widoczny. Klik woła `onMobileMenu`.

---

### Krok 5 — App (root komponent): state + przekazanie

W komponencie głównym (gdzie renderujesz `<Sidebar>` i `<TopBar>`):
1. Dodaj `const [mobileMenu, setMobileMenu] = useState(false);`.
2. Przekaż do `<Sidebar>`: `mobileOpen={mobileMenu}` i `onMobileClose={() => setMobileMenu(false)}`.
3. Przekaż do `<TopBar>`: `onMobileMenu={() => setMobileMenu(true)}`.

**Kryterium ukończenia:** pełen flow działa:
- Na mobile klik hamburger → drawer wjeżdża + backdrop pojawia się + body przestaje skrollować.
- Klik w nav item → drawer się chowa + content się zmienia.
- Klik w backdrop → drawer się chowa.
- Esc → drawer się chowa.
- Wracając na desktop: zero wpływu na obecny wygląd.

---

### Po wszystkim — checklist wizualny

Przetestuj w 3 rozmiarach (Chrome DevTools → device toolbar):
- [ ] 1440px (desktop) — wygląda jak dotąd, hamburger niewidoczny, presence pill widoczna, "Wyloguj" z tekstem.
- [ ] 768px (tablet) — hamburger widoczny, sidebar schowany, presence pill ukryta, "Wyloguj" sama ikona. Po kliku drawer wjeżdża jak ma.
- [ ] 375px (mobile S) — to samo + drawer ma `min(288px, 84vw)` szerokości (czyli ~84% ekranu).

**STOP po każdym kroku. Czekaj na "OK".**
