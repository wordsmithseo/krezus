# Prompt dla Claude Code — Czyszczenie starych styli

Stary styl przenika do nowego. To problem **kaskady CSS** — gdzieś leżą jeszcze stare reguły, które wygrywają z nowymi tokenami albo działają obok nich. Wklej ten prompt do Claude Code.

---

## PROMPT (kopiuj od tej linii w dół)

W projekcie Krezus przenikają się style stare ze starym designem i nowe z `design_handoff_krezus/`. Twoim zadaniem jest **zlokalizować i usunąć / zneutralizować WSZYSTKIE pozostałości starego stylu** — żeby działały tylko nowe tokeny i nowe komponenty.

**NIE pisz nowych styli. NIE refaktoruj. Tylko znajdź stare i usuń je.** To czysta operacja czyszczenia.

---

### FAZA 1 — Inwentaryzacja starego stylu (bez zmian!)

Przejrzyj cały projekt i wypisz mi listę. Dla każdego punktu podaj plik + numer linii.

#### A. Importy CSS / stylesheets

- [ ] Wymień **wszystkie pliki CSS / SCSS / Less / styled-components** w projekcie. Dla każdego napisz: czy to nowy (z design_handoff_krezus) czy stary?
- [ ] Pokaż **importy CSS w `main.tsx`/`index.tsx`/`App.tsx`** (lub odpowiednik). Czy importujesz stary CSS gdzieś jeszcze, oprócz nowych tokenów?
- [ ] Czy w `<head>` (lub w komponencie root) są jakieś `<link rel="stylesheet">` z poprzedniej wersji?

#### B. Stare zmienne CSS

- [ ] Czy istnieją zmienne CSS, które nie są w `01_DESIGN_TOKENS.md` (np. `--primary`, `--secondary`, `--text-color`, `--gray-100`, cokolwiek z poprzedniej palety)? Wymień je wszystkie.
- [ ] Czy któreś z **nowych** zmiennych (`--bg`, `--ink-1`, `--accent` itd.) są **gdzieś nadpisywane drugi raz** poza `:root` i `[data-theme="dark"]`?

#### C. Stare klasy globalne

Otwórz każdy plik CSS w projekcie i sprawdź czy są:
- [ ] Stare reset / normalize różne niż w `02 §reset`?
- [ ] Stare `body`, `html`, `*` rules z innymi wartościami niż nasze?
- [ ] Stare klasy podobne nazwami do nowych (`.button` vs `.btn`, `.card-old`, `.container`, `.wrapper`, `.text-primary`)?
- [ ] Reguły z `!important` które wymuszają kolory / fonty / spacing?

#### D. Stare komponenty wciąż używane

- [ ] Wymień **wszystkie komponenty w `src/components/`** (lub odpowiednik). Dla każdego: nowy (z handoffu) czy stary?
- [ ] Sprawdź czy w widokach (sekcjach) **nie używasz jeszcze starych komponentów** obok nowych (np. stary `<Button>` w jednym miejscu, nowy `.btn` w innym).
- [ ] Sprawdź czy nie ma starych komponentów z **inline stylami** wymuszającymi inne kolory / fonty.

#### E. Stare assety

- [ ] Stare fonty importowane oprócz Geist / Geist Mono / Instrument Serif (Inter, Roboto, system fonts z poprzedniej wersji)?
- [ ] Stare ikony (font-awesome, materialicons, heroicons) wciąż używane obok Lucide?
- [ ] Tailwind / Bootstrap / Material UI / Chakra / inne UI framework — czy są wciąż w `package.json` i ich klasy są wciąż używane w JSX?

#### F. Konflikty na poziomie kaskady

W przeglądarce otwórz dev tools → wybierz **3 widoczne elementy które wyglądają źle** (np. nagłówek, button, card) → zakładka Styles. Sprawdź:
- [ ] Czy są **przekreślone** reguły (overridden)? Skąd pochodzą — z którego pliku?
- [ ] Czy są reguły z wyższą specyficznością niż nasze (np. `#root .card` zamiast `.card`)?
- [ ] Czy są inline `style={{...}}` na elementach, które nie powinny ich mieć?

**Pokaż mi wynik tej inwentaryzacji jako listę. STOP. Czekaj na moje OK.**

---

### FAZA 2 — Plan czyszczenia

Po inwentaryzacji ułóż plan w kolejności:

1. **Usuń całe stare pliki CSS** (jeśli są bezpieczne do usunięcia — nie używane przez stare komponenty, które dalej żyją).
2. **Usuń importy starych CSS** z entry pointu i z komponentów.
3. **Usuń stare zmienne CSS** które nie są w design system.
4. **Usuń stare klasy globalne** które konfliktują z nowymi (`!important`, alternatywne `.button` zamiast `.btn` itd.).
5. **Zamień stare komponenty na nowe** w miejscach gdzie się jeszcze przewijają.
6. **Usuń stare zależności** z `package.json` (Tailwind etc. jeśli już nie używasz) — TYLKO po sprawdzeniu że nic od nich nie zależy.

Pokaż mi plan. **STOP. Czekaj na OK.**

---

### FAZA 3 — Egzekucja (jedna pozycja naraz)

Po zatwierdzeniu planu:
1. Bierzesz **jedną pozycję**.
2. Wprowadzasz zmianę.
3. **Odpalasz apkę i sprawdzasz że nic się nie wywaliło** (powiedz mi, że odpaliłeś).
4. Pokazujesz diff.
5. Czekasz na "OK, dalej".

**Złota zasada przy czyszczeniu:** jeśli usunięcie X miałoby zepsuć Y — najpierw zamień Y na nowy komponent, potem usuń X. Nie odwrotnie.

---

### Częste pułapki — sprawdź dodatkowo

- **CSS Modules** — czy stare style nie są wciąż importowane jako `import styles from "./Foo.module.css"` w aktywnym komponencie?
- **Tailwind preflight** — jeśli Tailwind jest wciąż w buildzie, jego `@tailwind base` resetuje H1/H2/buttons po naszych regułach. Albo wyłącz preflight, albo usuń Tailwind.
- **CSS-in-JS** (styled-components / emotion) — stare komponenty mogą mieć swoje style w JS, których nie widać w `.css`. Sprawdź `styled(...)` wywołania.
- **Globalne style w `<head>`** — czy ktoś nie injectuje styli przez `<style>` w `index.html`?
- **CDN-y starego frameworku** — `<link>` do Bootstrap CSS, FontAwesome itp. w `index.html`?

---

Zaczynaj od **Fazy 1**. Tylko inwentaryzacja. Bez zmian w kodzie.
