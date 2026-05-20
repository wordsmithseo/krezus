// Main app
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TITLES = {
  summary: { title: "Podsumowanie", crumb: "Budżet" },
  envelope: { title: "Koperta dnia", crumb: "Budżet" },
  expenses: { title: "Wydatki", crumb: "Budżet" },
  incomes: { title: "Przychody", crumb: "Budżet" },
  categories: { title: "Kategorie", crumb: "Narzędzia" },
  simulation: { title: "Symulacja wydatku", crumb: "Narzędzia" },
  analytics: { title: "Analityka", crumb: "Narzędzia" },
  savings: { title: "Oszczędności", crumb: "Narzędzia" },
  settings: { title: "Ustawienia", crumb: "System" },
};

function App() {
  const [section, setSection] = useStateApp("summary");
  const [auth, setAuth] = useStateApp(true);
  const [quickAdd, setQuickAdd] = useStateApp(false);
  const [mobileMenu, setMobileMenu] = useStateApp(false);

  const t = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "cream",
    "accent": "#B07A3E",
    "density": "comfortable",
    "radius": "soft"
  }/*EDITMODE-END*/);

  // apply tweaks as CSS variables on body
  useEffectApp(() => {
    const root = document.body;
    root.dataset.theme = t.theme === "dark" ? "dark" : "";
    root.dataset.density = t.density === "compact" ? "compact" : "";

    const hex = t.accent || "#B07A3E";
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-soft", t.theme === "dark"
      ? `color-mix(in srgb, ${hex} 25%, #14110D)`
      : `color-mix(in srgb, ${hex} 14%, #FFFFFF)`);
    root.style.setProperty("--accent-ink", "#FFFFFF");

    const radii = { sharp: ["4px", "6px", "10px"], soft: ["8px", "14px", "20px"], round: ["12px", "22px", "32px"] };
    const r = radii[t.radius] || radii.soft;
    root.style.setProperty("--radius-sm", r[0]);
    root.style.setProperty("--radius", r[1]);
    root.style.setProperty("--radius-lg", r[2]);
  }, [t.theme, t.accent, t.density, t.radius]);

  if (!auth) {
    return <AuthScreen onLogin={() => setAuth(true)}/>;
  }

  const meta = TITLES[section];
  return (
    <>
      <div className="app">
        <Sidebar
          section={section}
          onSection={setSection}
          mobileOpen={mobileMenu}
          onMobileClose={() => setMobileMenu(false)}
        />
        <div className="main">
          <TopBar
            title={meta.title}
            crumb={meta.crumb}
            onMobileMenu={() => setMobileMenu(true)}
            actions={
              <>
                <button className="btn accent sm" onClick={() => setQuickAdd(true)} title="Szybkie dodawanie wydatku">
                  <Icons.Plus size={14}/>Wydatek
                </button>
                <button className="btn ghost icon-only" title="Powiadomienia"><Icons.Bell size={16}/></button>
                <button className="btn sm" onClick={() => setAuth(false)} title="Wyloguj"><Icons.Logout size={13}/><span className="logout-text">Wyloguj</span></button>
              </>
            }
          />
          <div className="content">
            {section === "summary" && <SummarySection/>}
            {section === "envelope" && <EnvelopeSection/>}
            {section === "expenses" && <TransactionsSection kind="expense"/>}
            {section === "incomes" && <TransactionsSection kind="income"/>}
            {section === "categories" && <CategoriesSection/>}
            {section === "simulation" && <SimulationSection/>}
            {section === "analytics" && <AnalyticsSection/>}
            {section === "savings" && <SavingsSection/>}
            {section === "settings" && <SettingsSection/>}
          </div>
        </div>
      </div>

      <ExpenseQuickAddModal open={quickAdd} onClose={() => setQuickAdd(false)}/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Motyw">
          <TweakRadio
            label="Tryb"
            value={t.theme}
            options={[
              { label: "Kremowy", value: "cream" },
              { label: "Ciemny", value: "dark" },
            ]}
            onChange={v => t.setTweak("theme", v)}
          />
          <TweakColor
            label="Kolor akcentu"
            value={t.accent}
            options={["#B07A3E", "#3F7A55", "#4F5BD5", "#A33B3B", "#1A1611"]}
            onChange={v => t.setTweak("accent", v)}
          />
        </TweakSection>
        <TweakSection label="Układ">
          <TweakRadio
            label="Gęstość"
            value={t.density}
            options={[
              { label: "Komfort", value: "comfortable" },
              { label: "Kompakt", value: "compact" },
            ]}
            onChange={v => t.setTweak("density", v)}
          />
          <TweakRadio
            label="Zaokrąglenia"
            value={t.radius}
            options={[
              { label: "Ostre", value: "sharp" },
              { label: "Miękkie", value: "soft" },
              { label: "Okrągłe", value: "round" },
            ]}
            onChange={v => t.setTweak("radius", v)}
          />
        </TweakSection>
        <TweakSection label="Nawigacja">
          <TweakButton onClick={() => setSection("summary")} label="Pokaż Podsumowanie"/>
          <TweakButton onClick={() => setSection("envelope")} label="Pokaż Kopertę dnia"/>
          <TweakButton onClick={() => setSection("simulation")} label="Pokaż Symulację"/>
          <TweakButton onClick={() => setSection("analytics")} label="Pokaż Analitykę"/>
          <TweakButton onClick={() => setAuth(false)} label="Pokaż ekran logowania"/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
