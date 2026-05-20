# 02 — Layout Shell

App shell (dwukolumnowy: sidebar + main), topbar i ekran autoryzacji. Wszystkie referencje do plików dotyczą `reference_design/`.

---

## 1. App shell (zalogowany użytkownik)

```
┌─────────────┬──────────────────────────────────────────────┐
│             │ TopBar (sticky, blur)                        │
│  Sidebar    ├──────────────────────────────────────────────┤
│  (256px)    │                                              │
│             │   Content (max-width 1280px, centered)       │
│             │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

**CSS:**
```css
.app {
  display: grid;
  grid-template-columns: 256px 1fr;
  min-height: 100vh;
}
```

Mobile (`@media (max-width: 900px)`):
- `grid-template-columns: 1fr;`
- `.sidebar { display: none; }` (na mobile sidebar znika; w realnej apce zaprojektuj burger menu — wykracza poza ten redesign).
- `.content` padding `20px 16px 60px`, `.topbar` padding `14px 16px`.

---

## 2. Sidebar

**Wymiary:** szerokość 256px, sticky pełnowysoki (`height: 100vh; overflow-y: auto`).

**Tło:** `--surface-2`, prawy border `1px solid --line`, padding `22px 16px`. Flex column z `gap: 6px`.

**Struktura (od góry):**

### 2.1 Brand block
```jsx
<div className="brand">
  <div className="brand-mark">K</div>         {/* 32×32, bg --ink-1, fg --bg, serif italic 22px */}
  <div className="brand-name">Krezus</div>    {/* 16px / 600 / letter-spacing -0.01em */}
  <span className="brand-version">v2.0</span> {/* mono 10px w borderze 1px --line, padding 2px 6px, radius 4px, margin-left auto, color --ink-3 */}
</div>
```
Padding `4px 8px 18px`.

### 2.2 Section labels
```jsx
<div className="nav-section-label">Budżet</div>
<div className="nav-section-label">Narzędzia</div>
<div className="nav-section-label">System</div>
```
- Font 10px / 600 / letter-spacing 0.08em / UPPERCASE
- Color `--ink-3`
- Padding `14px 10px 6px`

### 2.3 Nav items
```jsx
<button className="nav-item" aria-current={active ? "page" : undefined}>
  <Icon size={16}/>
  <span>{label}</span>
  {badge && <span className="badge">{badge}</span>}
</button>
```

**Default state:**
- Padding `8px 10px`, radius `8px`, gap `10px`, flex row align-center, width 100%.
- Background: transparent. Color: `--ink-2`. Icon color: `--ink-3`.
- Font weight 500.

**Hover:**
- Background `--surface-sunken`, color `--ink-1`.

**Active (`aria-current="page"`):**
- Background `--surface`, color `--ink-1`, `box-shadow: var(--shadow-sm)`.
- Icon color: `--accent`.

**Badge** (opcjonalny):
- Mono 10px, color `--ink-3`, background `--surface-sunken`, padding `1px 6px`, radius 4px.
- W active: background `--accent-soft`, color `--accent`.
- `margin-left: auto`

**Lista nav items (kolejność):**

Sekcja **Budżet**:
1. `summary` — Podsumowanie — ikona `Dashboard`
2. `envelope` — Koperta dnia — ikona `Envelope` — badge: kwota pozostała (np. `113,90`)
3. `expenses` — Wydatki — ikona `ArrowDown` — badge: liczba zrealizowanych wydatków
4. `incomes` — Przychody — ikona `ArrowUp` — badge: liczba zrealizowanych przychodów

Sekcja **Narzędzia**:
5. `categories` — Kategorie — ikona `Tag` — badge: liczba kategorii
6. `simulation` — Symulacja — ikona `Crystal`
7. `analytics` — Analityka — ikona `Chart`
8. `savings` — Oszczędności — ikona `Target`

Sekcja **System**:
9. `settings` — Ustawienia — ikona `Settings`

### 2.4 Sidebar footer (user pill)
```jsx
<div className="sidebar-footer">
  <div className="avatar">SŁ</div>           {/* 32×32 round, gradient bg, 12px / 600, biały tekst */}
  <div className="user-meta">
    <div className="user-name">Sławek Sprawski</div>   {/* 13px / 500, ellipsis */}
    <div className="user-email">slawek@example.pl</div> {/* 11px, --ink-3, ellipsis */}
  </div>
  <button className="btn ghost icon-only" title="Wyloguj">
    <Logout size={14}/>
  </button>
</div>
```
- `margin-top: auto` (przykleja do dołu)
- `border-top: 1px solid var(--line)`, `padding-top: 14px`
- Avatar tło: `linear-gradient(135deg, var(--accent) 0%, oklch(0.55 0.13 30) 100%)`.

---

## 3. TopBar

**Sticky, full-width, blur:**
```css
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 32px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
}
```

**Struktura:**
```jsx
<div className="topbar">
  <h1>
    <span className="crumb">{crumb}</span>  {/* np. "Budżet", color --ink-3 */}
    <span className="crumb">/</span>        {/*  */}
    {title}                                  {/* np. "Podsumowanie", color --ink-1 */}
  </h1>
  <div className="topbar-actions">
    <div className="presence">…</div>       {/* zob. niżej */}
    {actions}                                {/* slot — buttony per-screen */}
  </div>
</div>
```

`h1`: 18px / 600 / letter-spacing -0.01em. `crumb`: weight 400. Breadcrumb i title rozdzielone spacjami (nie chevronami).

**Mapping screen → {title, crumb}:**

| section | title | crumb |
|---|---|---|
| summary | Podsumowanie | Budżet |
| envelope | Koperta dnia | Budżet |
| expenses | Wydatki | Budżet |
| incomes | Przychody | Budżet |
| categories | Kategorie | Narzędzia |
| simulation | Symulacja wydatku | Narzędzia |
| analytics | Analityka | Narzędzia |
| savings | Oszczędności | Narzędzia |
| settings | Ustawienia | System |

### 3.1 Presence pill
Pokazuje "kto jeszcze jest online" — drugi user budżetu.

```jsx
<div className="presence" title="Sesja aktywna od 2 minut">
  <span className="pulse"/>          {/* 6×6 round, bg --success, animacja pulse 2s */}
  <span>Magda online</span>          {/* 12px, color --ink-2 */}
  <div className="avatar sm" style={{ background: "oklch(0.6 0.15 320)" }}>MA</div>
</div>
```

Styl:
- Tło `--surface`, border `1px solid --line`, radius `999px`, padding `4px 10px 4px 8px`, gap 6.

### 3.2 Topbar actions (domyślne)
```jsx
<>
  <button className="btn accent sm" onClick={openQuickAdd}>
    <Plus size={14}/> Wydatek
  </button>
  <button className="btn ghost icon-only" title="Powiadomienia">
    <Bell size={16}/>
  </button>
  <button className="btn sm" onClick={logout} title="Wyloguj">
    <Logout size={13}/> Wyloguj
  </button>
</>
```

Buttony są spójne na wszystkich ekranach — to "globalne akcje". Per-screen akcje (np. "Eksportuj") siedzą w `card-hd-actions`, nie tutaj.

---

## 4. Content area

```css
.content {
  padding: 28px 32px 80px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
}
```

Zawiera komponent ekranu (`<SummarySection>` etc.). Większość ekranów to `.col` z `gap: 20px`.

---

## 5. Auth screen (niezalogowany)

Split 50/50. Lewa strona — brand storytelling na ciemnym tle. Prawa — formularz.

```css
.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

Mobile (`max-width: 900px`): `grid-template-columns: 1fr; .auth-side { display: none; }`.

### 5.1 Auth side (lewa)
```css
.auth-side {
  background: var(--ink-1);  /* ciemne tło — nawet w trybie kremowym */
  color: var(--bg);
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.auth-side::before {
  content: "";
  position: absolute;
  right: -40%; top: -10%;
  width: 600px; height: 600px;
  background: radial-gradient(circle, var(--accent) 0%, transparent 60%);
  opacity: 0.25;
  pointer-events: none;
}
```

**Zawartość (top → bottom):**

1. **Brand strip:** mała marka po lewej.
   ```jsx
   <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
     <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 28, background: "var(--accent)", color: "var(--ink-1)" }}>K</div>
     <div>
       <div style={{ fontSize: 16, fontWeight: 600 }}>Krezus</div>
       <div className="text-sm" style={{ opacity: 0.7 }}>Inteligentny budżet domowy</div>
     </div>
   </div>
   ```

2. **Tagline (serif italic):**
   ```jsx
   <h2 className="auth-tagline">Pieniądze, nad którymi panujesz.</h2>
   ```
   Font: `--font-serif`, italic, 40px / 1.05 / max-width 18ch, margin `24px 0 16px`.

3. **Opis (1 paragraf):**
   ```
   Krezus liczy za ciebie ile możesz dziś wydać, ostrzega przed problemami
   i prowadzi do celu — bez tabelek w Excelu.
   ```
   Font 14px / 1.6, opacity 0.75, max-width 36ch.

4. **Feature grid (2×3):**
   ```jsx
   <div className="auth-features">
     <Feature icon={<Envelope size={14}/>}  title="Koperta dnia"     text="Adaptacyjny dzienny limit"/>
     <Feature icon={<Target size={14}/>}    title="Cele"             text="Oszczędności z prognozą"/>
     <Feature icon={<Crystal size={14}/>}   title="Symulacja"        text="„Czy stać mnie na…?”"/>
     <Feature icon={<Users size={14}/>}     title="Wspólny budżet"   text="Synchronizacja na żywo"/>
     <Feature icon={<Chart size={14}/>}     title="Analityka"        text="Trendy, porównania okresów"/>
     <Feature icon={<Shield size={14}/>}    title="Bezpieczeństwo"   text="Szyfrowane dane Firebase"/>
   </div>
   ```
   Każdy `Feature`: flex row, ikona 14px (opacity 0.7) + tytuł 13/500 + opis 12 (opacity 0.65). Grid 2 kolumny, gap `12px 24px`.

5. **Footer:** `© 2026 · Stworzone przez Sławomira Sprawskiego` — 12px / opacity 0.5.

### 5.2 Auth form (prawa)
```css
.auth-form-wrap {
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
}
```

**Trzy taby:** `login`, `register`, `forgot` (+ stan terminal `forgot-sent`).

**Header zmienia się per tab:**
- login: `<h2>Witaj ponownie</h2><p>Zaloguj się do swojego budżetu</p>`
- register: `<h2>Załóż konto</h2><p>Zacznij planować w 30 sekund</p>`
- forgot: `<h2>Reset hasła</h2><p>Wyślemy ci link do ustawienia nowego hasła</p>`

`h2` font 26px, paragraf w `--ink-3` margin-top 4px.

**Segmented control (login ↔ register):**
```jsx
{tab !== "forgot" && (
  <div className="seg" style={{ marginBottom: 20, alignSelf: "flex-start" }}>
    <button aria-pressed={tab==="login"} onClick={() => setTab("login")}>Logowanie</button>
    <button aria-pressed={tab==="register"} onClick={() => setTab("register")}>Rejestracja</button>
  </div>
)}
```

**Pola formularza login:**
- Email — `<input class="input lg" type="email" placeholder="twoj@email.pl">`
- Hasło — `<input class="input lg" type="password" placeholder="••••••••">`
- Row between: checkbox "Pamiętaj mnie" (12px) / link "Zapomniałem hasła" (color `--accent`, 12px).
- Submit: `<button class="btn accent" style={{ padding: 12, fontSize: 14 }}>Zaloguj się →</button>`

**Pola formularza register:**
- Imię i nazwisko
- Email
- Hasło (z hintem "Min. 6 znaków, dobre hasło = przyszłość bez stresu")
- Submit: "Załóż konto →"

**Forgot password:**
- Email (autoFocus) + hint "Na ten adres wyślemy link do resetu hasła"
- Submit: "Wyślij link resetujący →"
- Ghost button "← Wróć do logowania"

**Forgot-sent (success state):**
```jsx
<div style={{ padding: 24, background: "var(--success-soft)", borderRadius: 12, textAlign: "center" }}>
  <div /* 56×56 round, bg --success, white check icon */>
    <Check size={28}/>
  </div>
  <div style={{ fontSize: 18, fontWeight: 600, color: "var(--success)" }}>Link wysłany</div>
  <p>Sprawdź swoją skrzynkę. Link jest ważny przez 1 godzinę.</p>
  <button className="btn" onClick={() => setTab("login")}>Wróć do logowania</button>
</div>
```

**Stopka formularza:**
```
Rejestrując się akceptujesz [politykę prywatności](#)
```
12px / `--ink-3`, link w `--ink-2`. `marginTop: 24`, center.

---

## 6. Tweaks panel (rozważenie)

Prototyp używa custom `<TweaksPanel>` (floating bottom-right) z 3 sekcjami:
- **Motyw:** kremowy ↔ ciemny, kolor akcentu (5 swatchy).
- **Układ:** gęstość (komfort ↔ kompakt), zaokrąglenia (ostre / miękkie / okrągłe).
- **Nawigacja:** quick-jump buttons (Podsumowanie, Koperta, Symulacja, Analityka, Logowanie).

**To narzędzie deweloperskie z prototypu — w produkcji prawdopodobnie nie chcesz go pokazywać użytkownikowi.** Ale konfigurowalność motywu/akcentu **może** trafić do prawdziwego Settings (sekcja "Wygląd"). Decyzja zostawiona userowi/PM-owi — nie implementuj automatycznie.
