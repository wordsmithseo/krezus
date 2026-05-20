// ============ SUMMARY (dashboard) ============
function SummarySection() {
  const trend30d = Data.spendSeries.slice(-7).reduce((s,d)=>s+d.value, 0) / 7;
  const trendPrior = Data.spendSeries.slice(-14, -7).reduce((s,d)=>s+d.value, 0) / 7;
  const trendDelta = ((trend30d - trendPrior) / Math.max(trendPrior, 1)) * 100;
  const upcoming = [
    ...Data.expenses.filter(e => e.type === "planned").map(e => ({ ...e, kind: "expense" })),
    ...Data.incomes.filter(i => i.type === "planned").map(i => ({ ...i, kind: "income" })),
  ].sort((a,b)=>a.date.localeCompare(b.date)).slice(0, 5);

  return (
    <div className="col" style={{ gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* Hero: Available funds */}
        <div className="card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Dostępne środki</div>
              <div className="num" style={{ fontSize: "clamp(28px, 5.5vw, 44px)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: 8, whiteSpace: "nowrap" }}>
                {Fmt.zl(Data.availableFunds)}
                <span style={{ fontSize: "0.45em", color: "var(--ink-3)", fontWeight: 400, marginLeft: 4 }}>zł</span>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span className="tag dot success">Po odjęciu oszczędności {Fmt.zl(Data.savingsCurrent)} zł</span>
              </div>
            </div>
            <div className="seg" style={{ flexShrink: 0 }}>
              <button aria-pressed="true">7d</button>
              <button>30d</button>
              <button>90d</button>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <Sparkline data={Data.spendSeries.slice(-30)} height={56}/>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 12 }}>
            <div><span className="text-mute">Średnia 7-dniowa wydatków</span> <strong className="num">{Fmt.zl(trend30d)} zł</strong></div>
            <div className={`delta ${trendDelta > 0 ? "up" : "down good"}`}>
              {trendDelta > 0 ? <Icons.TrendUp size={11}/> : <Icons.TrendDown size={11}/>}
              {Fmt.pct(trendDelta)} vs poprzedni tydzień
            </div>
          </div>
        </div>

        {/* Daily envelope mini */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <RingGauge value={Data.envelopeSpent} max={Data.envelopeAmount} label="Koperta dnia" sublabel={`z ${Fmt.zl(Data.envelopeAmount)} zł`} size={160}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Dziś, {Fmt.dateLong(Data.todayStr)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <Row label="Wydano" value={`${Fmt.zl(Data.envelopeSpent)} zł`}/>
              <Row label="Mediana 30d" value={`${Fmt.zl(Data.envelopeMedian)} zł`}/>
              <Row label="Pozostały dzień" value={"~12h"}/>
            </div>
            <button className="btn sm" style={{ marginTop: 12, width: "100%" }}>Szczegóły koperty →</button>
          </div>
        </div>
      </div>

      {/* Period spending */}
      <div className="card">
        <div className="card-hd">
          <h3>Wydatki w okresach</h3>
          <span className="sub">Aktywny okres budżetowy: 1–31 maja</span>
          <div className="card-hd-actions">
            <button className="btn sm ghost">Eksportuj</button>
          </div>
        </div>
        <div className="stat-grid">
          <Stat label="Dziś" value={Fmt.zl(Data.todayExpenses)} delta="-12.4%" deltaTone="down good" sub="vs średnia"/>
          <Stat label="Ten tydzień" value={Fmt.zl(Data.weekExpenses)} delta="+3.1%" deltaTone="up bad"/>
          <Stat label="Ten miesiąc" value={Fmt.zl(Data.monthExpenses)} delta="-8.6%" deltaTone="down good"/>
          <Stat label="Średnia dzienna" value={Fmt.zl(Data.monthExpenses / 15)} sub="z ostatnich 30 dni"/>
        </div>
      </div>

      {/* Limity dzienne — kluczowy element apki */}
      <div>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, marginBottom: 2 }}>Limity dzienne</h3>
            <div className="text-sm text-mute">Limit „realny" zakłada brak wpływu. „Planowany" zakłada że wpływ dotrze. Każdy kafel = jeden planowany przychód.</div>
          </div>
          <span className="text-sm text-mute">
            Wyliczono: <span className="num">{new Date().toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </span>
        </div>
        {Data.plannedLimits.length === 0 ? (
          <div className="card">
            <EmptyState
              title="Brak planowanych przychodów"
              hint={'Dodaj przychody z typem „Planowany", aby zobaczyć limity dzienne dla każdego okresu budżetowego.'}
              action={<button className="btn accent sm"><Icons.Plus size={13}/>Dodaj planowany przychód</button>}
            />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            {Data.plannedLimits.map((l, i) => <LimitTile key={l.id} limit={l} accent={i === 0}/>)}
          </div>
        )}
      </div>

      {/* Dynamics chart + upcoming */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        <div className="card">
          <div className="card-hd">
            <h3>Dynamika wydatków</h3>
            <span className="sub">Ostatnie 30 dni · weekendy zaakcentowane</span>
          </div>
          <DailyChart height={180}/>
        </div>

        <div className="card flush">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
            <h3 style={{ flex: 1 }}>Nadchodzące transakcje</h3>
            <span className="tag info dot">{upcoming.length}</span>
          </div>
          <div>
            {upcoming.map(u => {
              const cat = u.kind === "expense" ? Data.catById(u.category) : null;
              return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: u.kind === "expense" ? "var(--danger-soft)" : "var(--success-soft)", color: u.kind === "expense" ? "var(--danger)" : "var(--success)", display: "grid", placeItems: "center" }}>
                    {u.kind === "expense" ? <Icons.ArrowDown size={14}/> : <Icons.ArrowUp size={14}/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.kind === "expense" ? u.description : u.source}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", display: "flex", gap: 6, alignItems: "center" }}>
                      <Icons.Calendar size={10}/>
                      <span>{Fmt.relativeDate(u.date)}</span>
                      {cat && <><span>·</span><span>{cat.name}</span></>}
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 13, fontWeight: 500, color: u.kind === "expense" ? "var(--danger)" : "var(--success)" }}>
                    {u.kind === "expense" ? "−" : "+"}{Fmt.zl(u.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className="text-mute">{label}</span>
      <span className="num" style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ============ LIMIT TILE (per planned income) ============
function LimitRow({ icon, label, hint, value, tone }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "accent" ? "var(--accent)" : "var(--ink-1)";
  const labelColor = tone === "accent" ? "var(--accent)" : "var(--ink-3)";
  return (
    <div style={{
      padding: "10px 12px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      borderTop: tone === "accent" ? "1px solid var(--line)" : "none",
      background: tone === "accent" ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "var(--surface)",
      minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: labelColor, flexShrink: 0, whiteSpace: "nowrap", minWidth: 0 }}>
        {icon}
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</span>
      </div>
      <span className="text-mute" style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>· {hint}</span>
      <div className="num" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em", color, whiteSpace: "nowrap", flexShrink: 0 }}>
        {Fmt.zl(value)}
        <span className="text-mute" style={{ fontSize: 11, marginLeft: 2 }}>zł/d</span>
      </div>
    </div>
  );
}

function LimitTile({ limit, accent = false }) {
  const delta = limit.plannedLimit - limit.realLimit;
  const user = Data.userById(limit.userId);
  const sourceIcon = limit.source.toLowerCase().includes("wynagr") ? "💼"
    : limit.source.toLowerCase().includes("faktur") ? "🧾"
    : limit.source.toLowerCase().includes("zwrot") ? "💸"
    : "💰";
  return (
    <div className="card" style={{
      padding: 16,
      background: accent ? "var(--accent-soft)" : "var(--surface)",
      borderColor: accent ? "color-mix(in srgb, var(--accent) 25%, var(--line))" : "var(--line)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minWidth: 0,
    }}>
      {/* Header — single row with icon + name; everything else flows below */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-sunken)", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>{sourceIcon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={limit.source}>{limit.source}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1, flexWrap: "wrap" }}>
            <UserChip user={user}/>
            {accent && <span className="tag accent dot" style={{ background: "var(--accent)", color: "var(--accent-ink)", fontSize: 10 }}>Następny</span>}
          </div>
        </div>
      </div>

      {/* Amount + date row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span className="text-mute" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Wpływ</span>
          <span className="num" style={{ fontSize: 16, fontWeight: 600, color: "var(--success)", whiteSpace: "nowrap" }}>+{Fmt.zl(limit.amount)} zł</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end", minWidth: 0 }}>
          <span className="text-mute" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Data</span>
          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
            <span className="num">{Fmt.date(limit.date)}</span> <span className="text-mute" style={{ fontSize: 11 }}>· za {limit.daysLeft}d</span>
          </span>
        </div>
      </div>

      {/* Two limits stacked */}
      <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--surface)" }}>
        <LimitRow
          icon={<Icons.Wallet size={11}/>}
          label="Realny"
          hint="bez wpływu"
          value={limit.realLimit}
          tone={limit.realLimit < 50 ? "danger" : "neutral"}
        />
        <LimitRow
          icon={<Icons.Sparkles size={11}/>}
          label="Planowany"
          hint="po wpływie"
          value={limit.plannedLimit}
          tone="accent"
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ink-3)", flexWrap: "wrap", gap: 8 }}>
        <span>Różnica: <strong className="num" style={{ color: "var(--success)" }}>+{Fmt.zl(delta)} zł/d</strong></span>
        {limit.plannedExpensesInWindow > 0 && (
          <span>Zobowiązania: <strong className="num">{Fmt.zl(limit.plannedExpensesInWindow)} zł</strong></span>
        )}
      </div>
    </div>
  );
}

// ============ ENVELOPE ============
function EnvelopeSection() {
  const remaining = Data.envelopeAmount - Data.envelopeSpent;
  const pct = (Data.envelopeSpent / Data.envelopeAmount) * 100;
  // generate last 14 days of envelope vs spent
  const last14 = Data.spendSeries.slice(-14);
  return (
    <div className="col" style={{ gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, alignItems: "stretch" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 32 }}>
          <RingGauge value={Data.envelopeSpent} max={Data.envelopeAmount} size={240}/>
          <div style={{ textAlign: "center" }}>
            <div className="text-mute text-sm">Wydano dziś</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 500 }}>
              {Fmt.zl(Data.envelopeSpent)} <span className="text-mute" style={{ fontSize: 13 }}>z {Fmt.zl(Data.envelopeAmount)} zł</span>
            </div>
          </div>
          <div style={{ width: "100%" }} className="progress"><div style={{ width: pct + "%" }}></div></div>
        </div>

        <div className="card">
          <div className="card-hd">
            <h3>Jak działa koperta dnia</h3>
            <span className="sub">Algorytm adaptacyjny</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 16px" }}>
            Koperta dnia to inteligentnie wyliczona kwota, jaką możesz wydać bez naruszenia długoterminowego planu. Bazuje na medianie wydatków z ostatnich 30 dni oraz dostępnym budżecie.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Metric label="Mediana 30 dni" value={`${Fmt.zl(Data.envelopeMedian)} zł`}/>
            <Metric label="Limit dzienny" value={`${Fmt.zl(Data.dailyLimit1)} zł`}/>
            <Metric label="Pozostały dziś" value={`${Fmt.zl(remaining)} zł`} tone="success"/>
            <Metric label="Dni do końca okresu" value={Data.daysLeft1}/>
          </div>
          <hr className="divider"/>
          <div className="card-hd" style={{ marginBottom: 12 }}>
            <h3>Dziś o tej porze</h3>
            <span className="sub">Sugerowane tempo wydatków</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Icons.Clock size={14}/>
            <div style={{ flex: 1 }} className="progress success"><div style={{ width: "52%", background: "var(--success)" }}></div></div>
            <span className="num text-sm">12:00 — 50% dnia</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "10px 0 0" }}>
            O tej porze powinieneś mieć wydane około <strong className="num">{Fmt.zl(Data.envelopeAmount * 0.5)} zł</strong>. Jesteś o <strong className="num">{Fmt.zl(Data.envelopeAmount * 0.5 - Data.envelopeSpent)} zł</strong> pod progiem — masz zapas.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Wydatki vs koperta — ostatnie 14 dni</h3>
          <span className="sub">Przekroczenia na czerwono</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
          {last14.map((d, i) => {
            const over = d.value > Data.envelopeAmount;
            const h = Math.min((d.value / Math.max(Data.envelopeAmount * 1.5, Math.max(...last14.map(x=>x.value)))) * 100, 100);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                <div title={`${Fmt.zl(d.value)} zł`} style={{
                  width: "100%", height: h + "%", minHeight: 2,
                  background: over ? "var(--danger)" : "var(--accent)",
                  borderRadius: 4, position: "relative",
                }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: `${100 - (Data.envelopeAmount / Math.max(Data.envelopeAmount*1.5, Math.max(...last14.map(x=>x.value)))) * 100}%`, borderTop: "1px dashed var(--ink-3)" }}></div>
                </div>
                <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{Fmt.date(d.date).slice(0,2)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 12 }}>
          <div className="row"><div style={{width:10,height:10,background:"var(--accent)",borderRadius:2}}></div><span className="text-mute">Wydatki w normie</span></div>
          <div className="row"><div style={{width:10,height:10,background:"var(--danger)",borderRadius:2}}></div><span className="text-mute">Przekroczenie</span></div>
          <div className="row"><div style={{width:10,height:2,borderTop:"1px dashed var(--ink-3)",background:"transparent"}}></div><span className="text-mute">Koperta dnia ({Fmt.zl(Data.envelopeAmount)} zł)</span></div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div style={{ padding: 14, background: "var(--surface-2)", borderRadius: 8 }}>
      <div className="text-mute text-sm" style={{ fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 18, fontWeight: 500, color: tone === "success" ? "var(--success)" : "var(--ink-1)" }}>{value}</div>
    </div>
  );
}

// ============ TRANSACTIONS (Wydatki + Przychody) ============
function TransactionsSection({ kind }) {
  // kind = "expense" or "income"
  const isExpense = kind === "expense";
  const [tab, setTab] = useState("all");
  const [type, setType] = useState("normal");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const items = isExpense ? Data.expenses : Data.incomes;
  const filtered = items.filter(x => {
    if (tab !== "all" && x.type !== tab) return false;
    if (search) {
      const s = search.toLowerCase();
      const txt = isExpense ? (x.description + " " + (Data.catById(x.category)?.name || "")) : x.source;
      if (!txt.toLowerCase().includes(s)) return false;
    }
    return true;
  }).slice(0, 15);

  const total = filtered.reduce((s,x)=>s+x.amount, 0);

  return (
    <div className="col" style={{ gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Stat label={isExpense ? "Wydatki w tym miesiącu" : "Przychody w tym miesiącu"} value={Fmt.zl(isExpense ? Data.monthExpenses : 14820)} delta={isExpense ? "+3.1%" : "+0%"} deltaTone={isExpense ? "up bad" : "down"} />
        <Stat label={isExpense ? "Średni wydatek" : "Średni przychód"} value={Fmt.zl(isExpense ? 87 : 4900)}/>
        <Stat label="Zaplanowane" value={Fmt.zl(isExpense ? Data.futureExpense : Data.futureIncome)} sub={`${(isExpense ? Data.expenses : Data.incomes).filter(x => x.type === "planned").length} transakcji`}/>
      </div>

      <div className="card flush">
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="seg">
            <button aria-pressed={tab === "all"} onClick={() => setTab("all")}>Wszystkie</button>
            <button aria-pressed={tab === "normal"} onClick={() => setTab("normal")}>Zrealizowane</button>
            <button aria-pressed={tab === "planned"} onClick={() => setTab("planned")}>Planowane</button>
          </div>
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}><Icons.Search size={14}/></span>
            <input className="input" placeholder="Szukaj…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft: 32 }}/>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn sm" title="Filtry"><Icons.Filter size={14}/>Filtry</button>
            {!isExpense && (
              <button className="btn sm" onClick={()=>setShowCorrection(true)}><Icons.Sparkles size={14}/>Korekta budżetu</button>
            )}
            <button className="btn accent sm" onClick={() => setShowForm(true)}><Icons.Plus size={14}/>{isExpense ? "Dodaj wydatek" : "Dodaj przychód"}</button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              {isExpense && <th>Kategoria</th>}
              <th>{isExpense ? "Opis" : "Źródło"}</th>
              <th>Użytkownik</th>
              <th>Typ</th>
              <th className="amount">Kwota</th>
              <th className="actions"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}><EmptyState title="Brak transakcji" hint="Spróbuj zmienić filtry lub dodaj nową"/></td></tr>
            ) : filtered.map(x => {
              const cat = isExpense ? Data.catById(x.category) : null;
              const user = Data.userById(x.userId);
              return (
                <tr key={x.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{Fmt.relativeDate(x.date)}</div>
                    <div className="text-mute" style={{ fontSize: 11 }}>{x.time}</div>
                  </td>
                  {isExpense && <td><CatBadge cat={cat}/></td>}
                  <td>{isExpense ? x.description : x.source}</td>
                  <td><UserChip user={user}/></td>
                  <td>
                    {x.type === "planned"
                      ? <span className="tag info dot">Planowany</span>
                      : <span className="tag success dot">Zrealizowany</span>}
                  </td>
                  <td className="amount" style={{ color: isExpense ? "var(--danger)" : "var(--success)", fontWeight: 500 }}>
                    {isExpense ? "−" : "+"}{Fmt.zl(x.amount)}
                  </td>
                  <td className="actions">
                    {x.type === "planned" && (
                      <button className="btn sm" style={{ color: "var(--success)", borderColor: "color-mix(in srgb, var(--success) 30%, var(--line))", marginRight: 4 }} title="Zrealizuj teraz"><Icons.Check size={13}/>Zrealizuj</button>
                    )}
                    <div className="row-actions">
                      <button className="btn ghost icon-only sm" title="Edytuj"><Icons.Edit size={13}/></button>
                      <button className="btn ghost icon-only sm" title="Usuń"><Icons.Trash size={13}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={isExpense ? 5 : 4} style={{ textAlign: "right", fontWeight: 500, color: "var(--ink-2)", fontSize: 12 }}>Suma widoczna</td>
                <td className="amount" style={{ fontWeight: 600 }}>{Fmt.zl(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", color: "var(--ink-3)", fontSize: 12 }}>
          <div>Wyświetlam {filtered.length} z {items.length}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <button className="btn sm ghost" disabled>‹</button>
            <button className="btn sm" aria-pressed="true">1</button>
            <button className="btn sm ghost">2</button>
            <button className="btn sm ghost">3</button>
            <button className="btn sm ghost">›</button>
          </div>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={isExpense ? "Nowy wydatek" : "Nowy przychód"}
        footer={<><button className="btn" onClick={() => setShowForm(false)}>Anuluj</button><button className="btn accent" onClick={() => setShowForm(false)}>Zapisz</button></>}>
        <div className="form-grid">
          <div className="field">
            <label>Kwota (zł)</label>
            <input className="input mono lg" placeholder="0,00"/>
          </div>
          <div className="field">
            <label>Typ transakcji</label>
            <select className="select"><option>Zwykły</option><option>Planowany</option></select>
          </div>
          <div className="field">
            <label>Data</label>
            <input className="input" type="date" defaultValue={Data.todayStr}/>
          </div>
          <div className="field">
            <label>Godzina</label>
            <input className="input" type="time" defaultValue="12:00"/>
          </div>
          {isExpense && <div className="field full">
            <label>Kategoria</label>
            <CategoryAutocomplete/>
          </div>}
          <div className="field full">
            <label>{isExpense ? "Opis" : "Źródło"}</label>
            <input className="input" placeholder={isExpense ? "np. Biedronka, zakupy" : "np. Wynagrodzenie"}/>
          </div>
          <div className="field full">
            <label>Użytkownik</label>
            <div style={{ display: "flex", gap: 6 }}>
              {Data.users.map(u => (
                <button key={u.id} className="btn sm" style={{ flex: 1 }}>{u.initials} {u.name}</button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={showCorrection} onClose={()=>setShowCorrection(false)} title="Korekta posiadanych środków"
        footer={<><button className="btn" onClick={()=>setShowCorrection(false)}>Anuluj</button><button className="btn accent" onClick={()=>setShowCorrection(false)}>Wprowadź korektę</button></>}>
        <div className="col">
          <div style={{ padding: 14, background: "var(--info-soft)", borderRadius: 10 }}>
            <div className="text-mute" style={{ fontSize: 11, marginBottom: 2 }}>Aktualne dostępne środki</div>
            <div className="num" style={{ fontSize: 24, fontWeight: 500, color: "var(--info)" }}>{Fmt.zl(Data.availableFunds)} <span style={{ fontSize: 14, opacity: 0.7 }}>zł</span></div>
          </div>
          <div className="form-grid">
            <div className="field full">
              <label>Nowa kwota całkowitych środków (zł)</label>
              <input className="input mono lg" placeholder={Fmt.zl(Data.availableFunds)} autoFocus/>
              <div className="hint">Wprowadź kwotę, którą <strong>chcesz mieć po korekcie</strong>. System wyliczy różnicę i zapisze ją jako korektę w historii.</div>
            </div>
            <div className="field full">
              <label>Powód korekty</label>
              <input className="input" placeholder="np. Błąd w rozliczeniu, korekta bankowa, zwrot z urzędu"/>
            </div>
            <div className="field full">
              <label>Data</label>
              <input className="input" type="date" defaultValue={Data.todayStr}/>
            </div>
          </div>
          <div style={{ padding: 12, background: "var(--surface-2)", borderRadius: 8, fontSize: 12, color: "var(--ink-2)", display: "flex", gap: 8 }}>
            <Icons.Info size={14} style={{ flexShrink: 0, marginTop: 1, color: "var(--ink-3)" }}/>
            <div>Korekta to różnica między obecnymi a deklarowanymi środkami. Wpisuje się jako pojedynczy wpis do historii przychodów (dodatnia lub ujemna), nie powiązana z konkretną transakcją.</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

Object.assign(window, { SummarySection, EnvelopeSection, TransactionsSection });
