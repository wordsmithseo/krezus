// Reusable UI components for Krezus redesign
const { useState, useMemo, useEffect, useRef } = React;

// ============ Sidebar ============
function Sidebar({ section, onSection, mobileOpen = false, onMobileClose }) {
  // Lock body scroll + Esc-to-close while drawer is open
  useEffect(() => {
    document.body.dataset.drawerOpen = mobileOpen ? "true" : "";
    if (!mobileOpen) return;
    const h = (e) => { if (e.key === "Escape") onMobileClose && onMobileClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [mobileOpen, onMobileClose]);

  // Wrap selection so picking an item auto-closes the drawer
  const pick = (id) => {
    onSection(id);
    onMobileClose && onMobileClose();
  };

  const main = [
    { id: "summary", label: "Podsumowanie", icon: Icons.Dashboard },
    { id: "envelope", label: "Koperta dnia", icon: Icons.Envelope, badge: Fmt.zl(Data.envelopeAmount - Data.envelopeSpent) },
    { id: "expenses", label: "Wydatki", icon: Icons.ArrowDown, badge: Data.expenses.filter(e=>e.type==="normal").length },
    { id: "incomes", label: "Przychody", icon: Icons.ArrowUp, badge: Data.incomes.filter(i=>i.type==="normal").length },
  ];
  const tools = [
    { id: "categories", label: "Kategorie", icon: Icons.Tag, badge: Data.categories.length },
    { id: "simulation", label: "Symulacja", icon: Icons.Crystal },
    { id: "analytics", label: "Analityka", icon: Icons.Chart },
    { id: "savings", label: "Oszczędności", icon: Icons.Target },
  ];
  return (
    <>
      <div
        className="sidebar-backdrop"
        data-open={mobileOpen ? "true" : "false"}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <aside className="sidebar" data-open={mobileOpen ? "true" : "false"}>
        <div className="brand">
          <div className="brand-mark">K</div>
          <div>
            <div className="brand-name">Krezus</div>
          </div>
          <span className="brand-version">v2.0</span>
        </div>

        <div className="nav-section-label">Budżet</div>
        {main.map(item => (
          <NavItem key={item.id} item={item} active={section === item.id} onClick={() => pick(item.id)} />
        ))}

        <div className="nav-section-label">Narzędzia</div>
        {tools.map(item => (
          <NavItem key={item.id} item={item} active={section === item.id} onClick={() => pick(item.id)} />
        ))}

        <div className="nav-section-label">System</div>
        <NavItem item={{ id: "settings", label: "Ustawienia", icon: Icons.Settings }} active={section === "settings"} onClick={() => pick("settings")} />

        <div className="sidebar-footer">
          <div className="avatar">SŁ</div>
          <div className="user-meta">
            <div className="user-name">Sławek Sprawski</div>
            <div className="user-email">slawek@example.pl</div>
          </div>
          <button className="btn ghost icon-only" title="Wyloguj">
            <Icons.Logout size={14}/>
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button className="nav-item" aria-current={active ? "page" : undefined} onClick={onClick}>
      <Icon size={16}/>
      <span>{item.label}</span>
      {item.badge != null && <span className="badge">{item.badge}</span>}
    </button>
  );
}

// ============ TopBar ============
function TopBar({ title, crumb, actions, onMobileMenu }) {
  return (
    <div className="topbar">
      <button
        className="btn ghost icon-only mobile-menu-btn"
        onClick={onMobileMenu}
        aria-label="Otwórz menu"
        title="Menu"
      >
        <Icons.Menu size={18}/>
      </button>
      <h1>
        {crumb && <><span className="crumb">{crumb}</span> <span className="crumb">/</span> </>}
        {title}
      </h1>
      <div className="topbar-actions">
        <div className="presence" title="Sesja aktywna od 2 minut">
          <span className="pulse"></span>
          <span>Magda online</span>
          <div className="avatar sm" style={{ background: "oklch(0.6 0.15 320)" }}>MA</div>
        </div>
        {actions}
      </div>
    </div>
  );
}

// ============ Stat card ============
function Stat({ label, value, unit = "zł", delta, deltaTone, icon, sub }) {
  const Icon = icon;
  return (
    <div className="stat">
      <div className="label">
        {Icon && <Icon size={12}/>}
        {label}
      </div>
      <div className="value">
        <span>{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta && (
        <div className={`delta ${deltaTone || ""}`}>
          {delta.startsWith("-") ? <Icons.TrendDown size={11}/> : <Icons.TrendUp size={11}/>}
          {delta}
        </div>
      )}
      {sub && <div className="delta">{sub}</div>}
    </div>
  );
}

// ============ Ring Gauge ============
function RingGauge({ value, max, size = 200, label, sublabel, tone }) {
  const stroke = 14;
  const r = size / 2 - stroke / 2 - 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = c * pct;
  const remaining = max - value;
  let color = "var(--accent)";
  if (pct > 0.85) color = "var(--danger)";
  else if (pct > 0.6) color = "oklch(0.65 0.15 50)";
  return (
    <div className="gauge-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="track" cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke}/>
        <circle
          className="fill"
          cx={size/2} cy={size/2} r={r}
          fill="none" strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          style={{ stroke: color }}
        />
      </svg>
      <div className="center">
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {Fmt.zl(remaining)}
            <span style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 2 }}>zł</span>
          </div>
          {sublabel && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

// ============ Sparkline ============
function Sparkline({ data, height = 40, color = "var(--accent)" }) {
  const w = 240;
  const h = height;
  const max = Math.max(...data.map(d => d.value), 1);
  const min = 0;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((d, i) => {
    const x = i * step;
    const y = h - ((d.value - min) / (max - min || 1)) * (h - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <path d={area} className="area" style={{ fill: color, opacity: 0.1 }}/>
      <path d={path} style={{ fill: "none", stroke: color, strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }}/>
    </svg>
  );
}

// ============ Bar chart (categories) ============
function BarChart({ items, total }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(it => {
        const pct = (it.value / total) * 100;
        return (
          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: `color-mix(in srgb, ${it.color} 14%, transparent)`, color: it.color, display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0 }}>{it.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{it.label}</span>
                <span className="num text-sm text-mute">{Fmt.zl(it.value)} zł · {pct.toFixed(1)}%</span>
              </div>
              <div className="progress"><div style={{ width: pct + "%", background: it.color }}></div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ Combined chart (multi-series bars by day) ============
function DailyChart({ height = 160 }) {
  const series = Data.spendSeries;
  const max = Math.max(...series.map(d => d.value), 1);
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height, padding: "0 0 24px" }}>
        {series.map((d, i) => {
          const h = (d.value / max) * (height - 28);
          const isWeekend = [0,6].includes(new Date(d.date).getDay());
          return (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end" }}>
              <div
                title={`${Fmt.date(d.date)}: ${Fmt.zl(d.value)} zł`}
                style={{
                  width: "100%",
                  height: Math.max(h, 2),
                  background: isWeekend ? "var(--accent-soft)" : "color-mix(in srgb, var(--accent) 25%, transparent)",
                  borderRadius: 3,
                  borderTop: `2px solid var(--accent)`,
                  transition: "height 300ms",
                }}
              />
              {i % 5 === 0 && (
                <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)", position: "absolute", bottom: 0, transform: "translateX(-50%)", left: `calc(${(i / (series.length-1)) * 100}% + ${i === 0 ? 8 : i === series.length-1 ? -8 : 0}px)` }}>{Fmt.date(d.date)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ Empty state ============
function EmptyState({ title, hint, action }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)", marginBottom: 4 }}>{title}</div>
      {hint && <div style={{ fontSize: 12, marginBottom: 16 }}>{hint}</div>}
      {action}
    </div>
  );
}

// ============ Modal ============
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "color-mix(in srgb, var(--ink-1) 50%, transparent)",
      backdropFilter: "blur(4px)", zIndex: 100, display: "grid", placeItems: "center", padding: 20,
    }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 480, width: "100%", boxShadow: "var(--shadow-lg)", padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
          <h3 style={{ flex: 1 }}>{title}</h3>
          <button className="btn ghost icon-only" onClick={onClose}><Icons.X size={14}/></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ============ Category badge ============
function CatBadge({ cat, sm }) {
  if (!cat) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: sm ? "1px 6px" : "2px 8px",
      borderRadius: 999, fontSize: sm ? 11 : 12, fontWeight: 500,
      background: `color-mix(in srgb, ${cat.color} 10%, transparent)`,
      color: cat.color,
    }}>
      <span style={{ fontSize: sm ? 11 : 12 }}>{cat.icon}</span>
      <span>{cat.name}</span>
    </span>
  );
}

// ============ User chip ============
function UserChip({ user }) {
  if (!user) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span className="avatar sm" style={{ background: user.color }}>{user.initials}</span>
      <span style={{ fontSize: 12 }}>{user.name}</span>
    </span>
  );
}

Object.assign(window, { Sidebar, TopBar, Stat, RingGauge, Sparkline, BarChart, DailyChart, EmptyState, Modal, CatBadge, UserChip });

// ============ Category autocomplete (search + create-in-place) ============
function CategoryAutocomplete({ value, onChange, placeholder = "Wpisz lub wybierz kategorię…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = q
    ? Data.categories.filter(c => c.name.toLowerCase().includes(q))
    : Data.categories;
  const exact = Data.categories.find(c => c.name.toLowerCase() === q);
  const showCreate = q && !exact;

  const pick = (c) => { setQuery(c.name); setOpen(false); onChange && onChange(c); };
  const create = () => {
    const newCat = { id: "new-" + Date.now(), name: query.trim(), icon: "🏷️", color: "oklch(0.6 0.1 280)" };
    setQuery(newCat.name);
    setOpen(false);
    onChange && onChange(newCat, true);
  };

  // top "frequent" categories (top 4 by name, just as a stub)
  const top = Data.categories.slice(0, 4);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}>
          <Icons.Search size={14}/>
        </span>
        <input
          className="input"
          style={{ paddingLeft: 32, paddingRight: query ? 32 : 12 }}
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            className="btn ghost icon-only sm"
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}
            onClick={() => { setQuery(""); onChange && onChange(null); }}
            type="button"
          >
            <Icons.X size={12}/>
          </button>
        )}
      </div>

      {/* Quick-pick chips (always visible below input when input is empty/unfocused) */}
      {!open && !query && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {top.map(c => (
            <button key={c.id} type="button" onClick={() => pick(c)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 999,
                background: `color-mix(in srgb, ${c.color} 10%, transparent)`,
                color: c.color, border: "none", font: "inherit", fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="card" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          padding: 4, maxHeight: 280, overflowY: "auto",
          boxShadow: "var(--shadow-lg)", zIndex: 50,
        }}>
          {showCreate && (
            <button type="button" onClick={create} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 6, border: "none",
              background: "transparent", textAlign: "left", cursor: "pointer", font: "inherit",
            }} onMouseEnter={e=>e.currentTarget.style.background="var(--accent-soft)"}
               onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "var(--accent-ink)", display: "grid", placeItems: "center" }}>
                <Icons.Plus size={14}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Stwórz: „{query}"</div>
                <div className="text-mute" style={{ fontSize: 11 }}>Dodaj jako nową kategorię</div>
              </div>
              <span className="tag accent dot" style={{ fontSize: 10 }}>Nowa</span>
            </button>
          )}
          {matches.length === 0 && !showCreate && (
            <div style={{ padding: 16, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
              Brak wyników
            </div>
          )}
          {matches.map(c => (
            <button key={c.id} type="button" onClick={() => pick(c)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "7px 10px", borderRadius: 6, border: "none",
              background: "transparent", textAlign: "left", cursor: "pointer", font: "inherit",
            }} onMouseEnter={e=>e.currentTarget.style.background="var(--surface-sunken)"}
               onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `color-mix(in srgb, ${c.color} 14%, transparent)`, color: c.color, display: "grid", placeItems: "center" }}>
                {c.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
              </div>
              <span className="text-mute" style={{ fontSize: 11 }}>{Data.expenses.filter(e=>e.category===c.id && e.type==="normal").length} transakcji</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Quick-add expense modal (reusable) ============
function ExpenseQuickAddModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Nowy wydatek"
      footer={<>
        <button className="btn" onClick={onClose}>Anuluj</button>
        <button className="btn accent" onClick={onClose}><Icons.Check size={13}/>Zapisz wydatek</button>
      </>}>
      <div className="form-grid">
        <div className="field">
          <label>Kwota (zł)</label>
          <input className="input mono lg" placeholder="0,00" autoFocus/>
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
          <label>Godzina (opcjonalnie)</label>
          <input className="input" type="time"/>
        </div>
        <div className="field full">
          <label>Kategoria</label>
          <CategoryAutocomplete/>
        </div>
        <div className="field full">
          <label>Opis</label>
          <input className="input" placeholder="np. Biedronka, zakupy tygodniowe"/>
        </div>
        <div className="field full">
          <label>Użytkownik</label>
          <div style={{ display: "flex", gap: 6 }}>
            {Data.users.map((u, i) => (
              <button type="button" key={u.id} className="btn sm" style={{ flex: 1, ...(i === 0 ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent)" } : {}) }}>
                <span className="avatar sm" style={{ background: u.color, width: 18, height: 18, fontSize: 9 }}>{u.initials}</span>
                {u.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { CategoryAutocomplete, ExpenseQuickAddModal });
