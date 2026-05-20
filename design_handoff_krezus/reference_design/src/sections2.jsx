// ============ CATEGORIES ============
function CategoriesSection() {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [mergeFrom, setMergeFrom] = useState(null);
  // compute stats per category over last 30 days
  const monthStart = (() => { const d = new Date(Data.today); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })();
  const stats = Data.categories.map(c => {
    const items = Data.expenses.filter(e => e.category === c.id && e.type === "normal" && e.date >= monthStart);
    return { ...c, total: items.reduce((s,e)=>s+e.amount, 0), count: items.length };
  }).sort((a,b)=>b.total-a.total);
  const totalAll = stats.reduce((s,c)=>s+c.total, 0);

  return (
    <div className="col" style={{ gap: 20 }}>
      {mergeFrom && (
        <div className="card" style={{ background: "var(--accent-soft)", borderColor: "color-mix(in srgb, var(--accent) 30%, var(--line))" }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${mergeFrom.color} 14%, transparent)`, color: mergeFrom.color, display: "grid", placeItems: "center", fontSize: 18 }}>{mergeFrom.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Scalanie kategorii: <span style={{ color: mergeFrom.color }}>{mergeFrom.icon} {mergeFrom.name}</span></div>
              <div className="text-sm text-mute" style={{ marginTop: 2 }}>Wybierz kategorię docelową poniżej — wszystkie transakcje zostaną przeniesione, a <strong>{mergeFrom.name}</strong> usunięte.</div>
            </div>
            <button className="btn sm" onClick={()=>setMergeFrom(null)}><Icons.X size={13}/>Anuluj</button>
          </div>
        </div>
      )}

      <div className="row between">
        <p className="lead" style={{ marginBottom: 0 }}>Organizuj wydatki według własnych kategorii. Statystyki za ostatnie 30 dni.</p>
        <button className="btn accent" onClick={()=>setShowAdd(true)}><Icons.Plus size={14}/>Nowa kategoria</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {stats.map(c => {
          const isMergeSource = mergeFrom?.id === c.id;
          const isMergeCandidate = mergeFrom && !isMergeSource;
          return (
            <div key={c.id} className="card" style={{
              padding: 18,
              outline: isMergeSource ? "2px solid var(--accent)" : isMergeCandidate ? "1px dashed var(--accent)" : "none",
              opacity: isMergeSource ? 0.6 : 1,
              cursor: isMergeCandidate ? "pointer" : "default",
              position: "relative",
            }} onClick={() => isMergeCandidate && setMergeFrom(null)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${c.color} 14%, transparent)`, color: c.color, display: "grid", placeItems: "center", fontSize: 18 }}>{c.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div className="text-mute" style={{ fontSize: 11 }}>{c.count} transakcji</div>
                </div>
                {!mergeFrom && <CatMenu cat={c} onEdit={()=>setEditing(c)} onMerge={()=>setMergeFrom(c)} onDelete={()=>setDeleting(c)}/>}
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 500 }}>
                {Fmt.zl(c.total)} <span className="text-mute" style={{ fontSize: 12 }}>zł</span>
              </div>
              <div className="progress" style={{ marginTop: 8 }}><div style={{ width: (totalAll ? (c.total/totalAll)*100 : 0) + "%", background: c.color }}></div></div>
              <div className="text-mute" style={{ fontSize: 11, marginTop: 6 }}>{totalAll ? ((c.total/totalAll)*100).toFixed(1) : 0}% wszystkich wydatków</div>
              {isMergeCandidate && (
                <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderRadius: "inherit", display: "grid", placeItems: "center" }}>
                  <span className="tag accent" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Scal tutaj →</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Nowa kategoria"
        footer={<><button className="btn" onClick={()=>setShowAdd(false)}>Anuluj</button><button className="btn accent" onClick={()=>setShowAdd(false)}>Dodaj</button></>}>
        <CategoryForm/>
      </Modal>

      <Modal open={!!editing} onClose={()=>setEditing(null)} title={`Edytuj: ${editing?.name || ""}`}
        footer={<><button className="btn" onClick={()=>setEditing(null)}>Anuluj</button><button className="btn accent" onClick={()=>setEditing(null)}>Zapisz</button></>}>
        {editing && <CategoryForm cat={editing}/>}
      </Modal>

      <Modal open={!!deleting} onClose={()=>setDeleting(null)} title="Usuń kategorię"
        footer={<><button className="btn" onClick={()=>setDeleting(null)}>Anuluj</button><button className="btn" style={{ background: "var(--danger)", color: "white", borderColor: "var(--danger)" }} onClick={()=>setDeleting(null)}>Usuń</button></>}>
        {deleting && (
          <div>
            <p style={{ margin: "0 0 12px" }}>Czy na pewno chcesz usunąć kategorię <strong>{deleting.icon} {deleting.name}</strong>?</p>
            <div style={{ padding: 12, background: "var(--danger-soft)", borderRadius: 8, fontSize: 13, color: "var(--danger)" }}>
              <strong>Uwaga:</strong> {Data.expenses.filter(e=>e.category===deleting.id).length} transakcji w tej kategorii zostanie odznaczone (kategoria „bez kategorii"). Aby je zachować — rozważ <strong>scalenie</strong> kategorii z inną zamiast usuwania.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CategoryForm({ cat }) {
  return (
    <div className="col">
      <div className="field">
        <label>Nazwa</label>
        <input className="input" defaultValue={cat?.name || ""} placeholder="np. Hobby"/>
      </div>
      <div className="field">
        <label>Ikona (emoji)</label>
        <input className="input" defaultValue={cat?.icon || ""} placeholder="🎨" maxLength={2}/>
        <div className="hint">Możesz pominąć — wybierzemy automatycznie na podstawie nazwy</div>
      </div>
    </div>
  );
}

function CatMenu({ cat, onEdit, onMerge, onDelete }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [open]);
  return (
    <div style={{ position: "relative" }} onClick={e=>e.stopPropagation()}>
      <button className="btn ghost icon-only sm" onClick={()=>setOpen(!open)}><Icons.More size={14}/></button>
      {open && (
        <div className="card" style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, minWidth: 160, padding: 4, zIndex: 5, boxShadow: "var(--shadow-lg)" }}>
          <MenuItem icon={<Icons.Edit size={13}/>} onClick={()=>{ onEdit(); setOpen(false); }}>Edytuj</MenuItem>
          <MenuItem icon={<Icons.Sparkles size={13}/>} onClick={()=>{ onMerge(); setOpen(false); }}>Scal z inną…</MenuItem>
          <MenuItem icon={<Icons.Trash size={13}/>} danger onClick={()=>{ onDelete(); setOpen(false); }}>Usuń</MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8,
      width: "100%", padding: "7px 10px", border: "none",
      background: "transparent", borderRadius: 6,
      font: "inherit", fontSize: 13, cursor: "pointer", textAlign: "left",
      color: danger ? "var(--danger)" : "var(--ink-1)",
    }} onMouseEnter={e=>e.currentTarget.style.background="var(--surface-sunken)"}
       onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      {icon} {children}
    </button>
  );
}

// ============ SIMULATION ============
function SimulationSection() {
  const [amount, setAmount] = useState(450);
  const [date, setDate] = useState(Data.todayStr);
  const [run, setRun] = useState(true);

  const risk = (() => {
    if (amount < 100) return { level: "safe", title: "Bezpiecznie", color: "var(--success)", soft: "var(--success-soft)" };
    if (amount < 500) return { level: "ok", title: "W normie", color: "var(--accent)", soft: "var(--accent-soft)" };
    if (amount < 1500) return { level: "warn", title: "Zachowaj ostrożność", color: "oklch(0.62 0.17 60)", soft: "oklch(0.95 0.06 60)" };
    return { level: "risk", title: "Ryzykowne", color: "var(--danger)", soft: "var(--danger-soft)" };
  })();

  const after = Data.availableFunds - amount;
  const newLimit = (after - Data.futureExpense) / Data.daysLeft1;

  return (
    <div className="col" style={{ gap: 20 }}>
      <p className="lead">Sprawdź czy w danej dacie bezpiecznie jest dokonać planowanego wydatku. Algorytm uwzględnia środki, zobowiązania, historię i twoje przyzwyczajenia.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Parametry symulacji</h3>
          <div className="col">
            <div className="field">
              <label>Data wydatku</label>
              <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
            <div className="field">
              <label>Kwota (zł)</label>
              <input className="input mono lg" type="number" value={amount} onChange={e=>setAmount(parseFloat(e.target.value)||0)}/>
              <div className="hint">Wprowadź planowaną kwotę wydatku</div>
            </div>
            <div className="field">
              <label>Kategoria (opcjonalnie)</label>
              <select className="select">
                <option value="">Bez kategorii</option>
                {Data.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <button className="btn accent" onClick={()=>setRun(true)}><Icons.Sparkles size={14}/>Przeanalizuj</button>
          </div>
        </div>

        <div className="card" style={{ background: run ? risk.soft : undefined, transition: "background 300ms" }}>
          {run ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: risk.color, color: "var(--bg)", display: "grid", placeItems: "center" }}>
                  {risk.level === "safe" || risk.level === "ok" ? <Icons.Check size={20}/> : risk.level === "warn" ? <Icons.Info size={20}/> : <Icons.X size={20}/>}
                </div>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: risk.color, fontWeight: 600 }}>Wynik analizy</div>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{risk.title}</div>
                </div>
                <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 500, color: risk.color }}>
                  {Fmt.zl(amount)} <span style={{ fontSize: 14, opacity: 0.6 }}>zł</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Metric label="Środki po wydatku" value={`${Fmt.zl(after)} zł`}/>
                <Metric label="Nowy limit dzienny" value={`${Fmt.zl(newLimit)} zł`}/>
                <Metric label="Wpływ na limit" value={`${Fmt.pct(((newLimit - Data.dailyLimit1) / Data.dailyLimit1) * 100)}`}/>
                <Metric label="Zobowiązania planowane" value={`${Fmt.zl(Data.futureExpense)} zł`}/>
              </div>

              <hr className="divider"/>

              <h3 style={{ marginBottom: 10 }}>Analiza krok po kroku</h3>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                <li>Aktualne dostępne środki: <strong className="num">{Fmt.zl(Data.availableFunds)} zł</strong></li>
                <li>Po wydatku zostanie: <strong className="num">{Fmt.zl(after)} zł</strong></li>
                <li>Po odjęciu planowanych zobowiązań: <strong className="num">{Fmt.zl(after - Data.futureExpense)} zł</strong></li>
                <li>Podzielone na {Data.daysLeft1} dni: <strong className="num">{Fmt.zl(newLimit)} zł/dzień</strong></li>
                <li>Historyczna mediana wydatków dziennych: <strong className="num">{Fmt.zl(Data.envelopeMedian)} zł</strong> — limit {newLimit < Data.envelopeMedian ? "PONIŻEJ" : "POWYŻEJ"} mediany</li>
              </ol>
            </>
          ) : (
            <EmptyState title="Brak wyników" hint="Wprowadź dane i kliknij Przeanalizuj"/>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ ANALYTICS ============
function AnalyticsSection() {
  const [period, setPeriod] = useState("30");
  const [customFrom, setCustomFrom] = useState((() => { const d = new Date(Data.today); d.setDate(d.getDate()-14); return d.toISOString().slice(0,10); })());
  const [customTo, setCustomTo] = useState(Data.todayStr);

  const isCustom = period === "custom";
  let cutoff, periodEnd, days;
  if (isCustom) {
    cutoff = customFrom;
    periodEnd = customTo;
    days = Math.max(1, Math.round((new Date(customTo) - new Date(customFrom)) / 86400000) + 1);
  } else if (period === "all") {
    cutoff = "2000-01-01";
    periodEnd = Data.todayStr;
    days = 90;
  } else {
    days = parseInt(period);
    const d = new Date(Data.today); d.setDate(d.getDate() - days);
    cutoff = d.toISOString().slice(0,10);
    periodEnd = Data.todayStr;
  }
  // previous analogous period
  const prevEnd = (() => { const d = new Date(cutoff); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
  const prevStart = (() => { const d = new Date(cutoff); d.setDate(d.getDate()-days); return d.toISOString().slice(0,10); })();

  const inPeriod = (e) => e.type === "normal" && e.date >= cutoff && e.date <= periodEnd;
  const inPrev = (e) => e.type === "normal" && e.date >= prevStart && e.date <= prevEnd;

  const periodExpenses = Data.expenses.filter(inPeriod);
  const periodIncomes = Data.incomes.filter(inPeriod);
  const prevExpenses = Data.expenses.filter(inPrev);
  const prevIncomes = Data.incomes.filter(inPrev);

  const totalExpense = periodExpenses.reduce((s,e)=>s+e.amount, 0);
  const totalIncome = periodIncomes.reduce((s,i)=>s+i.amount, 0);
  const prevExpense = prevExpenses.reduce((s,e)=>s+e.amount, 0);
  const prevIncome = prevIncomes.reduce((s,i)=>s+i.amount, 0);

  const expDelta = prevExpense ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;
  const incDelta = prevIncome ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
  const expCountDelta = prevExpenses.length ? ((periodExpenses.length - prevExpenses.length) / prevExpenses.length) * 100 : 0;
  const incCountDelta = prevIncomes.length ? ((periodIncomes.length - prevIncomes.length) / prevIncomes.length) * 100 : 0;

  const catTotals = Data.categories.map(c => {
    const total = periodExpenses.filter(e => e.category === c.id).reduce((s,e)=>s+e.amount, 0);
    return { label: c.name, value: total, color: c.color, icon: c.icon };
  }).filter(c => c.value > 0).sort((a,b)=>b.value-a.value);

  const userTotals = Data.users.map(u => {
    const total = periodExpenses.filter(e => e.userId === u.id).reduce((s,e)=>s+e.amount, 0);
    return { ...u, total, count: periodExpenses.filter(e=>e.userId===u.id).length };
  });

  return (
    <div className="col" style={{ gap: 20 }}>
      <div className="row between" style={{ gap: 12, flexWrap: "wrap" }}>
        <p className="lead" style={{ marginBottom: 0 }}>Analiza wydatków i przychodów w wybranym okresie. Porównanie z analogicznym poprzednim okresem.</p>
        <div className="seg">
          {[["7","7d"],["14","14d"],["30","30d"],["90","90d"],["all","Wszystko"],["custom","Własny"]].map(([v,l]) => (
            <button key={v} aria-pressed={period === v} onClick={()=>setPeriod(v)}>{l}</button>
          ))}
        </div>
      </div>

      {isCustom && (
        <div className="card">
          <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
            <div className="field" style={{ minWidth: 160 }}>
              <label>Data od</label>
              <input className="input" type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/>
            </div>
            <div className="field" style={{ minWidth: 160 }}>
              <label>Data do</label>
              <input className="input" type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}/>
            </div>
            <div className="text-mute text-sm" style={{ paddingBottom: 10 }}>Zakres: <strong className="num">{days}</strong> dni · porównanie z poprzedzającymi {days} dniami</div>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <Stat label="Wydatki w okresie" value={Fmt.zl(totalExpense)} delta={Fmt.pct(expDelta)} deltaTone={expDelta > 0 ? "up bad" : "down good"}/>
        <Stat label="Przychody w okresie" value={Fmt.zl(totalIncome)} delta={Fmt.pct(incDelta)} deltaTone={incDelta > 0 ? "up good" : "down bad"}/>
        <Stat label="Bilans" value={Fmt.zl(totalIncome - totalExpense)} unit="zł" sub={(totalIncome - totalExpense) > 0 ? "Saldo dodatnie" : "Saldo ujemne"}/>
        <Stat label="Liczba transakcji" value={Fmt.int(periodExpenses.length + periodIncomes.length)} unit="" sub={`${periodExpenses.length} wydatków · ${periodIncomes.length} przychodów`}/>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Porównanie z poprzednim okresem</h3>
          <span className="sub">{Fmt.dateLong(prevStart)} – {Fmt.dateLong(prevEnd)} · {days} dni</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <ComparisonCell label="Suma wydatków" curr={totalExpense} prev={prevExpense} unit="zł" lowerIsBetter/>
          <ComparisonCell label="Suma przychodów" curr={totalIncome} prev={prevIncome} unit="zł"/>
          <ComparisonCell label="Liczba wydatków" curr={periodExpenses.length} prev={prevExpenses.length} unit="" lowerIsBetter int/>
          <ComparisonCell label="Liczba przychodów" curr={periodIncomes.length} prev={prevIncomes.length} unit="" int/>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        <div className="card">
          <div className="card-hd">
            <h3>Udział kategorii</h3>
            <span className="sub">Top {Math.min(catTotals.length, 8)}</span>
          </div>
          <BarChart items={catTotals.slice(0, 8)} total={totalExpense}/>
        </div>

        <div className="card">
          <div className="card-hd">
            <h3>Wydatki użytkowników</h3>
          </div>
          <div className="col">
            {userTotals.map(u => {
              const pct = (u.total / Math.max(totalExpense, 1)) * 100;
              return (
                <div key={u.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div className="avatar" style={{ background: u.color }}>{u.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                      <div className="text-mute" style={{ fontSize: 11 }}>{u.count} transakcji</div>
                    </div>
                    <div className="num" style={{ fontWeight: 500 }}>{Fmt.zl(u.total)} zł</div>
                  </div>
                  <div className="progress"><div style={{ width: pct + "%", background: u.color }}></div></div>
                  <div className="text-mute" style={{ fontSize: 11, marginTop: 4, textAlign: "right" }}>{pct.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>

          <hr className="divider"/>

          <h3 style={{ marginBottom: 12 }}>Top 3 kategorii</h3>
          <div className="col" style={{ gap: 8 }}>
            {catTotals.slice(0, 3).map((c, i) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)", width: 16 }}>#{i+1}</div>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `color-mix(in srgb, ${c.color} 14%, transparent)`, color: c.color, display: "grid", placeItems: "center" }}>{c.icon}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.label}</div>
                <div className="num">{Fmt.zl(c.value)} zł</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Trend dzienny</h3>
          <span className="sub">Wydatki w ostatnich 30 dniach</span>
        </div>
        <DailyChart height={200}/>
      </div>
    </div>
  );
}

function ComparisonCell({ label, curr, prev, unit, lowerIsBetter, int }) {
  const delta = prev ? ((curr - prev) / prev) * 100 : 0;
  const isUp = delta > 0;
  const isGood = lowerIsBetter ? !isUp : isUp;
  const fmt = (v) => int ? Fmt.int(v) : Fmt.zl(v);
  return (
    <div style={{ padding: 14, background: "var(--surface-2)", borderRadius: 10 }}>
      <div className="text-mute text-sm" style={{ fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div className="num" style={{ fontSize: 20, fontWeight: 500 }}>{fmt(curr)}{unit && <span className="text-mute" style={{ fontSize: 12, marginLeft: 2 }}>{unit}</span>}</div>
        <div className={`delta ${isUp ? "up" : "down"} ${isGood ? "good" : "bad"}`} style={{ fontSize: 11 }}>
          {isUp ? <Icons.TrendUp size={11}/> : <Icons.TrendDown size={11}/>}
          {Fmt.pct(delta)}
        </div>
      </div>
      <div className="text-mute" style={{ fontSize: 11, marginTop: 4 }}>
        Poprzednio: <span className="num">{fmt(prev)}{unit && " " + unit}</span>
      </div>
    </div>
  );
}

// ============ SAVINGS ============
const SAVINGS_GOALS = [
  { id: "g1", name: "Poduszka bezpieczeństwa", icon: "🛟", target: 12000, current: 8400, deadline: "2026-12-31", color: "oklch(0.55 0.12 155)" },
  { id: "g2", name: "Wakacje w Grecji", icon: "🏖️", target: 5000, current: 3200, deadline: "2026-07-01", color: "oklch(0.65 0.14 230)" },
  { id: "g3", name: "Nowy laptop", icon: "💻", target: 6500, current: 1200, deadline: "2026-09-15", color: "oklch(0.6 0.15 280)" },
];

function SavingsSection() {
  const [goals, setGoals] = useState(SAVINGS_GOALS);
  const [selected, setSelected] = useState(SAVINGS_GOALS[0].id);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [depositing, setDepositing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const active = goals.find(g => g.id === selected) || goals[0];
  const totalSaved = goals.reduce((s,g)=>s+g.current, 0);
  const totalTarget = goals.reduce((s,g)=>s+g.target, 0);

  return (
    <div className="col" style={{ gap: 20 }}>
      <div className="row between">
        <p className="lead" style={{ marginBottom: 0 }}>Wiele celów oszczędnościowych. Łączna kwota odłożonych środków zostaje wyłączona z dostępnego budżetu.</p>
        <button className="btn accent" onClick={()=>setShowAdd(true)}><Icons.Plus size={14}/>Nowy cel</button>
      </div>

      <div className="stat-grid">
        <Stat label="Łącznie odłożone" value={Fmt.zl(totalSaved)} sub={`z ${Fmt.zl(totalTarget)} zł`}/>
        <Stat label="Cele aktywne" value={goals.length} unit="" sub={`${goals.filter(g=>g.current>=g.target).length} osiągniętych`}/>
        <Stat label="Postęp ogólny" value={Math.round((totalSaved/totalTarget)*100)} unit="%" delta={Fmt.pct(((totalSaved/totalTarget)-0.5)*100)} deltaTone="up good"/>
        <Stat label="Wpłaty w tym mies." value={Fmt.zl(1200)}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Goals list */}
        <div className="card flush">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
            <h3 style={{ flex: 1 }}>Twoje cele</h3>
            <span className="tag">{goals.length}</span>
          </div>
          <div>
            {goals.map(g => {
              const pct = (g.current / g.target) * 100;
              return (
                <button key={g.id} onClick={()=>setSelected(g.id)} style={{
                  width: "100%", textAlign: "left", border: "none", background: g.id === selected ? "var(--surface-2)" : "transparent",
                  padding: "12px 18px", borderBottom: "1px solid var(--line)",
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer", font: "inherit",
                  borderLeft: g.id === selected ? `3px solid ${g.color}` : "3px solid transparent",
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${g.color} 14%, transparent)`, color: g.color, display: "grid", placeItems: "center", fontSize: 18 }}>{g.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                    <div className="text-mute" style={{ fontSize: 11 }}>{Fmt.relativeDate(g.deadline)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 12, fontWeight: 500 }}>{Math.round(pct)}%</div>
                    <div className="progress" style={{ width: 60, marginTop: 4 }}><div style={{ width: pct + "%", background: g.color }}></div></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active goal detail */}
        {active && (
          <div className="card">
            <div className="row" style={{ alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: `color-mix(in srgb, ${active.color} 14%, transparent)`, color: active.color, display: "grid", placeItems: "center", fontSize: 28 }}>{active.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{active.name}</div>
                <div className="text-mute text-sm" style={{ marginTop: 2 }}>Termin: <strong>{Fmt.dateLong(active.deadline)}</strong> · {Fmt.relativeDate(active.deadline)}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={()=>setEditing(active)}><Icons.Edit size={13}/>Edytuj</button>
                <button className="btn sm danger" onClick={()=>setDeleting(active)}><Icons.Trash size={13}/></button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
              <RingGauge value={active.current} max={active.target} label="Postęp" sublabel={`${Math.round((active.current/active.target)*100)}% celu`} size={180}/>
              <div className="col" style={{ gap: 10 }}>
                <Metric label="Odłożone" value={`${Fmt.zl(active.current)} zł`} tone="success"/>
                <Metric label="Cel" value={`${Fmt.zl(active.target)} zł`}/>
                <Metric label="Pozostało" value={`${Fmt.zl(active.target - active.current)} zł`}/>
                <button className="btn accent" onClick={()=>setDepositing(active)} style={{ marginTop: 6 }}>
                  <Icons.Plus size={14}/>Wpłać na ten cel
                </button>
              </div>
            </div>

            <hr className="divider"/>

            <h3 style={{ marginBottom: 12 }}>Historia wpłat</h3>
            <table className="table">
              <thead><tr><th>Data</th><th>Użytkownik</th><th>Notatka</th><th className="amount">Kwota</th></tr></thead>
              <tbody>
                <tr><td>5 maja 2026</td><td><UserChip user={Data.users[0]}/></td><td>Wpłata miesięczna</td><td className="amount" style={{ color: "var(--success)" }}>+{Fmt.zl(400)}</td></tr>
                <tr><td>15 kwi 2026</td><td><UserChip user={Data.users[1]}/></td><td>Zwrot z urzędu</td><td className="amount" style={{ color: "var(--success)" }}>+{Fmt.zl(800)}</td></tr>
                <tr><td>1 kwi 2026</td><td><UserChip user={Data.users[0]}/></td><td>Wpłata miesięczna</td><td className="amount" style={{ color: "var(--success)" }}>+{Fmt.zl(400)}</td></tr>
              </tbody>
            </table>

            <hr className="divider"/>

            <h3 style={{ marginBottom: 12 }}>Sugestie</h3>
            <div className="col" style={{ gap: 10 }}>
              <SuggestRow icon="🎯" text={`Przy obecnym tempie cel osiągniesz za ${Math.round((active.target - active.current) / 400)} mies.`}/>
              <SuggestRow icon="💡" text={`Aby zdążyć przed ${Fmt.dateLong(active.deadline)}, wpłacaj ${Fmt.zl((active.target - active.current) / Math.max(1, Math.round((new Date(active.deadline) - Data.today)/(86400000*30))))} zł/mies.`}/>
            </div>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Nowy cel oszczędnościowy"
        footer={<><button className="btn" onClick={()=>setShowAdd(false)}>Anuluj</button><button className="btn accent" onClick={()=>setShowAdd(false)}>Utwórz cel</button></>}>
        <GoalForm/>
      </Modal>

      <Modal open={!!editing} onClose={()=>setEditing(null)} title={`Edytuj: ${editing?.name || ""}`}
        footer={<><button className="btn" onClick={()=>setEditing(null)}>Anuluj</button><button className="btn accent" onClick={()=>setEditing(null)}>Zapisz</button></>}>
        {editing && <GoalForm goal={editing}/>}
      </Modal>

      <Modal open={!!depositing} onClose={()=>setDepositing(null)} title={`Wpłata: ${depositing?.name || ""}`}
        footer={<><button className="btn" onClick={()=>setDepositing(null)}>Anuluj</button><button className="btn accent" onClick={()=>setDepositing(null)}>Wpłać</button></>}>
        {depositing && (
          <div className="form-grid">
            <div className="field full">
              <label>Kwota wpłaty (zł)</label>
              <input className="input mono lg" placeholder="0,00"/>
              <div className="hint">Kwota zostanie odjęta od dostępnych środków i dopisana do celu</div>
            </div>
            <div className="field">
              <label>Data</label>
              <input className="input" type="date" defaultValue={Data.todayStr}/>
            </div>
            <div className="field">
              <label>Użytkownik</label>
              <select className="select">{Data.users.map(u=><option key={u.id}>{u.name}</option>)}</select>
            </div>
            <div className="field full">
              <label>Notatka (opcjonalnie)</label>
              <input className="input" placeholder="np. Wpłata miesięczna"/>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleting} onClose={()=>setDeleting(null)} title="Usuń cel"
        footer={<><button className="btn" onClick={()=>setDeleting(null)}>Anuluj</button><button className="btn" style={{ background: "var(--danger)", color: "white", borderColor: "var(--danger)" }} onClick={()=>setDeleting(null)}>Usuń</button></>}>
        {deleting && (
          <div>
            <p style={{ margin: "0 0 12px" }}>Czy na pewno chcesz usunąć cel <strong>{deleting.icon} {deleting.name}</strong>?</p>
            <div style={{ padding: 12, background: "var(--danger-soft)", borderRadius: 8, fontSize: 13, color: "var(--danger)" }}>
              <strong>{Fmt.zl(deleting.current)} zł</strong> wróci do dostępnych środków. Historia wpłat zostanie zachowana w logach.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function GoalForm({ goal }) {
  return (
    <div className="form-grid">
      <div className="field full">
        <label>Nazwa celu</label>
        <input className="input" defaultValue={goal?.name || ""} placeholder="np. Wakacje w Grecji"/>
      </div>
      <div className="field">
        <label>Ikona (emoji)</label>
        <input className="input" defaultValue={goal?.icon || ""} placeholder="🏖️" maxLength={2}/>
      </div>
      <div className="field">
        <label>Termin</label>
        <input className="input" type="date" defaultValue={goal?.deadline || ""}/>
      </div>
      <div className="field">
        <label>Kwota celu (zł)</label>
        <input className="input mono" defaultValue={goal?.target || ""} placeholder="5000,00"/>
      </div>
      <div className="field">
        <label>Już odłożone (zł)</label>
        <input className="input mono" defaultValue={goal?.current || "0,00"}/>
      </div>
    </div>
  );
}

function SuggestRow({ icon, text }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: 12, background: "var(--surface-2)", borderRadius: 10 }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{text}</div>
    </div>
  );
}

// ============ SETTINGS ============
function SettingsSection() {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="col" style={{ gap: 20 }}>
      <p className="lead">Profil, ustawienia budżetu, eksport danych i logi.</p>

      <div className="card">
        <div className="card-hd">
          <h3>Profil i bezpieczeństwo</h3>
          <span className="sub">Zarządzaj swoim kontem</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Wyświetlana nazwa</label>
            <input className="input" defaultValue="Sławek Sprawski"/>
            <div className="hint">Widoczna dla innych użytkowników budżetu</div>
          </div>
          <div className="field">
            <label>Adres email</label>
            <input className="input" defaultValue="slawek@example.pl" disabled/>
            <div className="hint">Email nie może zostać zmieniony</div>
          </div>
          <div className="field full">
            <label>Hasło</label>
            <div className="row">
              <input className="input" type="password" value="••••••••" disabled style={{ flex: 1 }}/>
              <button className="btn" onClick={()=>setShowPassword(true)}><Icons.Lock size={13}/>Zmień hasło</button>
            </div>
          </div>
        </div>
        <button className="btn accent" style={{ marginTop: 16 }}>Zapisz profil</button>
      </div>

      <Modal open={showPassword} onClose={()=>setShowPassword(false)} title="Zmień hasło"
        footer={<><button className="btn" onClick={()=>setShowPassword(false)}>Anuluj</button><button className="btn accent" onClick={()=>setShowPassword(false)}>Zmień hasło</button></>}>
        <div className="col">
          <div className="field">
            <label>Obecne hasło</label>
            <input className="input" type="password" placeholder="••••••••"/>
          </div>
          <div className="field">
            <label>Nowe hasło</label>
            <input className="input" type="password" placeholder="••••••••"/>
            <div className="hint">Min. 6 znaków. Dobre hasło = przyszłość bez stresu.</div>
          </div>
          <div className="field">
            <label>Powtórz nowe hasło</label>
            <input className="input" type="password" placeholder="••••••••"/>
          </div>
        </div>
      </Modal>

      <div className="card">
        <div className="card-hd">
          <h3>Ustawienia budżetu</h3>
          <span className="sub">Wpływają na obliczenia limitów</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Okres dla Koperty Dnia</label>
            <select className="select"><option>Najkrótszy okres (domyślnie)</option><option>Do końca miesiąca</option><option>Do następnej wypłaty</option></select>
            <div className="hint">Algorytm dostosuje kopertę do wybranego horyzontu</div>
          </div>
          <div className="field">
            <label>Okres dla Dynamiki Wydatków</label>
            <select className="select"><option>30 dni</option><option>14 dni</option><option>7 dni</option></select>
          </div>
          <div className="field">
            <label>Strefa czasowa</label>
            <select className="select"><option>Europa/Warszawa (UTC+1)</option></select>
          </div>
          <div className="field">
            <label>Format waluty</label>
            <select className="select"><option>PLN — 1 234,56 zł</option><option>PLN — 1,234.56 zł</option></select>
          </div>
        </div>
        <button className="btn accent" style={{ marginTop: 16 }}>Zapisz ustawienia</button>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Współdzielony budżet</h3>
          <span className="sub">Zarządzaj dostępem rodziny</span>
        </div>
        <div className="col">
          {Data.users.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <div className="avatar" style={{ background: u.color }}>{u.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{u.name}</div>
                <div className="text-mute text-sm">{u.isOwner ? "Właściciel · pełen dostęp" : "Członek · edycja transakcji"}</div>
              </div>
              {u.isOwner ? <span className="tag accent">Ty</span> : <button className="btn sm">Zarządzaj</button>}
            </div>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 12 }}><Icons.Plus size={14}/>Zaproś użytkownika</button>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Eksport danych</h3>
          <span className="sub">Format kompatybilny z LLM</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 12px" }}>
          Pobierz kompletne dane budżetowe (przychody, wydatki, kategorie, limity) w formacie gotowym do analizy przez ChatGPT lub Claude.
        </p>
        <div className="btn-row">
          <button className="btn"><Icons.Download size={14}/>JSON (technical)</button>
          <button className="btn"><Icons.Download size={14}/>TXT (czytelny dla LLM)</button>
          <button className="btn"><Icons.Download size={14}/>CSV (Excel)</button>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Logi systemu</h3>
          <span className="sub">Ostatnie 50 wpisów</span>
        </div>
        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <Metric label="Rozmiar" value="12.4 KB"/>
          <Metric label="Wpisy" value="47"/>
        </div>
        <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: 12, fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7, color: "var(--ink-2)", maxHeight: 200, overflowY: "auto" }}>
          <div><span className="text-mute">15:32:14</span> · <span style={{color:"var(--success)"}}>EXPENSE</span> · Dodano wydatek 87,30 zł (Spożywcze) — Sławek</div>
          <div><span className="text-mute">14:18:02</span> · <span style={{color:"var(--info)"}}>SAVINGS</span> · Aktualizacja celu oszczędności: 5000 zł</div>
          <div><span className="text-mute">12:04:55</span> · <span style={{color:"var(--success)"}}>EXPENSE</span> · Dodano wydatek 24,50 zł (Restauracje) — Magda</div>
          <div><span className="text-mute">11:30:21</span> · <span style={{color:"var(--accent)"}}>AUTO</span> · Auto-realizacja planowanego: Spotify 23,99 zł</div>
          <div><span className="text-mute">09:15:00</span> · <span style={{color:"var(--info)"}}>LOGIN</span> · Logowanie ze Slawek@example.pl</div>
          <div><span className="text-mute">08:00:00</span> · <span style={{color:"var(--ink-3)"}}>SYSTEM</span> · Reset koperty dnia, mediana zaktualizowana 156,40 zł</div>
        </div>
        <button className="btn danger sm" style={{ marginTop: 12 }}><Icons.Trash size={13}/>Wyczyść logi</button>
      </div>
    </div>
  );
}

// ============ AUTH ============
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login");
  return (
    <div className="auth-shell">
      <div className="auth-side">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 28, background: "var(--accent)", color: "var(--ink-1)" }}>K</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Krezus</div>
              <div className="text-sm" style={{ opacity: 0.7 }}>Inteligentny budżet domowy</div>
            </div>
          </div>
          <h2 className="auth-tagline">Pieniądze, nad którymi panujesz.</h2>
          <p style={{ maxWidth: 36 + "ch", opacity: 0.75, fontSize: 14, lineHeight: 1.6 }}>
            Krezus liczy za ciebie ile możesz dziś wydać, ostrzega przed problemami i prowadzi do celu — bez tabelek w Excelu.
          </p>
        </div>

        <div className="auth-features">
          <Feature icon={<Icons.Envelope size={14}/>} title="Koperta dnia" text="Adaptacyjny dzienny limit"/>
          <Feature icon={<Icons.Target size={14}/>} title="Cele" text="Oszczędności z prognozą"/>
          <Feature icon={<Icons.Crystal size={14}/>} title="Symulacja" text="„Czy stać mnie na…?”"/>
          <Feature icon={<Icons.Users size={14}/>} title="Wspólny budżet" text="Synchronizacja na żywo"/>
          <Feature icon={<Icons.Chart size={14}/>} title="Analityka" text="Trendy, porównania okresów"/>
          <Feature icon={<Icons.Shield size={14}/>} title="Bezpieczeństwo" text="Szyfrowane dane Firebase"/>
        </div>

        <div style={{ fontSize: 12, opacity: 0.5 }}>
          © 2026 · Stworzone przez Sławomira Sprawskiego
        </div>
      </div>

      <div className="auth-form-wrap">
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 26 }}>
            {tab === "login" ? "Witaj ponownie" : tab === "register" ? "Załóż konto" : "Reset hasła"}
          </h2>
          <p className="text-mute" style={{ marginTop: 4 }}>
            {tab === "login" ? "Zaloguj się do swojego budżetu"
              : tab === "register" ? "Zacznij planować w 30 sekund"
              : "Wyślemy ci link do ustawienia nowego hasła"}
          </p>
        </div>

        {tab !== "forgot" && (
          <div className="seg" style={{ marginBottom: 20, alignSelf: "flex-start" }}>
            <button aria-pressed={tab==="login"} onClick={()=>setTab("login")}>Logowanie</button>
            <button aria-pressed={tab==="register"} onClick={()=>setTab("register")}>Rejestracja</button>
          </div>
        )}

        {tab === "forgot" ? (
          <form onSubmit={(e)=>{ e.preventDefault(); setTab("forgot-sent"); }} className="col" style={{ gap: 14 }}>
            <div className="field">
              <label>Adres email</label>
              <input className="input lg" type="email" placeholder="twoj@email.pl" autoFocus/>
              <div className="hint">Na ten adres wyślemy link do resetu hasła</div>
            </div>
            <button className="btn accent" type="submit" style={{ padding: 12, fontSize: 14 }}>
              Wyślij link resetujący →
            </button>
            <button type="button" className="btn ghost" onClick={()=>setTab("login")} style={{ padding: 10 }}>
              ← Wróć do logowania
            </button>
          </form>
        ) : tab === "forgot-sent" ? (
          <div className="col" style={{ gap: 16, padding: 24, background: "var(--success-soft)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--success)", color: "white", display: "grid", placeItems: "center", margin: "0 auto" }}>
              <Icons.Check size={28}/>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--success)" }}>Link wysłany</div>
              <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "8px 0 0" }}>
                Sprawdź swoją skrzynkę. Link jest ważny przez 1 godzinę.
              </p>
            </div>
            <button className="btn" onClick={()=>setTab("login")}>Wróć do logowania</button>
          </div>
        ) : (
          <form onSubmit={(e)=>{ e.preventDefault(); onLogin(); }} className="col" style={{ gap: 14 }}>
            {tab === "register" && (
              <div className="field">
                <label>Imię i nazwisko</label>
                <input className="input lg" placeholder="Jan Kowalski"/>
              </div>
            )}
            <div className="field">
              <label>Adres email</label>
              <input className="input lg" type="email" placeholder="twoj@email.pl"/>
            </div>
            <div className="field">
              <label>Hasło</label>
              <input className="input lg" type="password" placeholder="••••••••"/>
              {tab === "register" && <div className="hint">Min. 6 znaków, dobre hasło = przyszłość bez stresu</div>}
            </div>
            {tab === "login" && (
              <div className="row between">
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <input type="checkbox" defaultChecked/> Pamiętaj mnie
                </label>
                <a href="#" onClick={e=>{e.preventDefault(); setTab("forgot");}} style={{ fontSize: 12, color: "var(--accent)" }}>Zapomniałem hasła</a>
              </div>
            )}
            <button className="btn accent" type="submit" style={{ padding: 12, fontSize: 14 }}>
              {tab === "login" ? "Zaloguj się" : "Załóż konto"} →
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>
          Rejestrując się akceptujesz <a href="#" style={{ color: "var(--ink-2)" }}>politykę prywatności</a>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="ft">
      {icon}
      <div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{title}</div>
        <div style={{ opacity: 0.65, fontSize: 12 }}>{text}</div>
      </div>
    </div>
  );
}

Object.assign(window, { CategoriesSection, SimulationSection, AnalyticsSection, SavingsSection, SettingsSection, AuthScreen });
