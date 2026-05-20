// Realistic Polish household budget mock data
const today = new Date(2026, 4, 15); // 15 May 2026
const fmt = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
const daysFromNow = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

const CATEGORIES = [
  { id: "c1", name: "Spożywcze", icon: "🛒", color: "oklch(0.7 0.13 60)" },
  { id: "c2", name: "Transport", icon: "🚗", color: "oklch(0.6 0.12 245)" },
  { id: "c3", name: "Rachunki", icon: "📄", color: "oklch(0.55 0.05 280)" },
  { id: "c4", name: "Restauracje", icon: "🍽️", color: "oklch(0.65 0.16 25)" },
  { id: "c5", name: "Rozrywka", icon: "🎬", color: "oklch(0.65 0.15 320)" },
  { id: "c6", name: "Zdrowie", icon: "💊", color: "oklch(0.6 0.13 155)" },
  { id: "c7", name: "Dom", icon: "🏠", color: "oklch(0.6 0.1 200)" },
  { id: "c8", name: "Edukacja", icon: "📚", color: "oklch(0.6 0.12 95)" },
  { id: "c9", name: "Subskrypcje", icon: "📺", color: "oklch(0.6 0.13 350)" },
  { id: "c10", name: "Ubrania", icon: "👕", color: "oklch(0.65 0.1 30)" },
];

const USERS = [
  { id: "u1", name: "Sławek", initials: "SŁ", isOwner: true, color: "oklch(0.66 0.13 60)" },
  { id: "u2", name: "Magda", initials: "MA", isOwner: false, color: "oklch(0.6 0.15 320)" },
];

// generate 90 days of expenses
function genExpenses() {
  const out = [];
  const descriptions = {
    c1: ["Biedronka", "Lidl", "Carrefour", "Żabka", "Auchan", "Piekarnia"],
    c2: ["Orlen", "BP", "Bilet PKP", "Uber", "Parking", "Karta miejska"],
    c3: ["Prąd Tauron", "Gaz PGNiG", "Internet UPC", "Telefon Play", "Czynsz", "Woda"],
    c4: ["Pizzeria Margherita", "Sushi Tomo", "Pyszne.pl", "McDonald's", "Kawiarnia Brisman", "KFC"],
    c5: ["Netflix", "Spotify", "Kino Helios", "Empik", "Steam", "Koncert"],
    c6: ["Apteka", "Wizyta lekarska", "Suplementy", "Stomatolog"],
    c7: ["IKEA", "Castorama", "Środki czystości", "Naprawa pralki"],
    c8: ["Kurs angielskiego", "Książki", "Udemy"],
    c9: ["Apple One", "ChatGPT Plus", "iCloud", "YouTube Premium"],
    c10: ["Zara", "H&M", "Reserved", "Sinsay", "CCC"],
  };
  let id = 100;
  for (let day = 0; day < 90; day++) {
    const count = Math.floor(Math.random() * 3) + (day % 7 === 0 ? 2 : 1);
    for (let i = 0; i < count; i++) {
      const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const descs = descriptions[cat.id];
      out.push({
        id: "e" + id++,
        date: fmt(daysAgo(day)),
        time: `${String(8 + Math.floor(Math.random() * 14)).padStart(2,"0")}:${String(Math.floor(Math.random()*60)).padStart(2,"0")}`,
        amount: Math.round((Math.random() * (cat.id === "c3" ? 400 : cat.id === "c1" ? 150 : 80) + 10) * 100) / 100,
        category: cat.id,
        description: descs[Math.floor(Math.random() * descs.length)],
        userId: Math.random() > 0.6 ? "u2" : "u1",
        type: "normal",
      });
    }
  }
  // planned future expenses
  const planned = [
    { id: "ep1", date: fmt(daysFromNow(2)), time: "10:00", amount: 280, category: "c3", description: "Prąd Tauron", userId: "u1", type: "planned" },
    { id: "ep2", date: fmt(daysFromNow(5)), time: "14:00", amount: 1850, category: "c3", description: "Czynsz", userId: "u1", type: "planned" },
    { id: "ep3", date: fmt(daysFromNow(8)), time: "12:00", amount: 79, category: "c9", description: "ChatGPT Plus", userId: "u2", type: "planned" },
    { id: "ep4", date: fmt(daysFromNow(12)), time: "09:00", amount: 169, category: "c3", description: "Internet UPC", userId: "u1", type: "planned" },
  ];
  return [...out, ...planned].sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
}

function genIncomes() {
  const out = [];
  // monthly salary x 3 months
  for (let m = 0; m < 3; m++) {
    out.push({
      id: "i" + m + "a",
      date: fmt(new Date(today.getFullYear(), today.getMonth() - m, 1)),
      time: "09:00",
      amount: 8400,
      source: "Wynagrodzenie",
      userId: "u1",
      type: "normal",
    });
    out.push({
      id: "i" + m + "b",
      date: fmt(new Date(today.getFullYear(), today.getMonth() - m, 5)),
      time: "10:30",
      amount: 6100,
      source: "Wynagrodzenie",
      userId: "u2",
      type: "normal",
    });
  }
  out.push({
    id: "ix1",
    date: fmt(daysAgo(8)),
    time: "16:20",
    amount: 320,
    source: "Sprzedaż OLX",
    userId: "u2",
    type: "normal",
  });
  out.push({
    id: "ip1",
    date: fmt(daysFromNow(15)),
    time: "09:00",
    amount: 8400,
    source: "Wynagrodzenie",
    userId: "u1",
    type: "planned",
  });
  out.push({
    id: "ip2",
    date: fmt(daysFromNow(21)),
    time: "10:30",
    amount: 6100,
    source: "Wynagrodzenie",
    userId: "u2",
    type: "planned",
  });
  out.push({
    id: "ip3",
    date: fmt(daysFromNow(7)),
    time: "12:00",
    amount: 1200,
    source: "Faktura zlecenie",
    userId: "u1",
    type: "planned",
  });
  return out.sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
}

const EXPENSES = genExpenses();
const INCOMES = genIncomes();

// computed values
const availableFunds = 14380.42;
const savingsGoal = 5000;
const savingsCurrent = 3200;

const todayStr = fmt(today);
const todayExpenses = EXPENSES.filter(e => e.date === todayStr && e.type === "normal").reduce((s,e)=>s+e.amount, 0);
const weekStr = fmt(daysAgo(7));
const weekExpenses = EXPENSES.filter(e => e.date >= weekStr && e.date <= todayStr && e.type === "normal").reduce((s,e)=>s+e.amount, 0);
const monthStart = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
const monthExpenses = EXPENSES.filter(e => e.date >= monthStart && e.date <= todayStr && e.type === "normal").reduce((s,e)=>s+e.amount, 0);

const dailyLimit1 = 142.50;
const daysLeft1 = 16;
const dailyLimit2 = null; // single period
const envelopeAmount = 178.20;
const envelopeSpent = 64.30;
const envelopeMedian = 156.40;

// Compute "limit realny" vs "limit planowany" per planned income.
// realLimit  — only current funds (minus savings) divided by days. Zero planning.
// plannedLimit — current funds + OTHER planned incomes between today and this
//                income's date − planned expenses in that window. The kafel's
//                own income amount is NOT included (the limit answers
//                "how much can I spend per day to last until this income arrives,
//                assuming everything else planned goes through").
function genPlannedLimits() {
  const plannedIncomes = INCOMES.filter(i => i.type === "planned" && i.date >= todayStr)
    .sort((a,b) => a.date.localeCompare(b.date));

  const baseAvailable = availableFunds - savingsCurrent;

  const out = [];
  for (const inc of plannedIncomes) {
    const incDate = new Date(inc.date);
    const daysLeft = Math.max(1, Math.round((incDate - today) / 86400000));

    // Other planned incomes between today and this income's date (excluding self)
    const otherIncomes = INCOMES
      .filter(i => i.type === "planned" && i.id !== inc.id && i.date >= todayStr && i.date <= inc.date)
      .reduce((s, i) => s + i.amount, 0);
    // Planned expenses between today and this income's date
    const plannedExpensesInWindow = EXPENSES
      .filter(e => e.type === "planned" && e.date >= todayStr && e.date <= inc.date)
      .reduce((s, e) => s + e.amount, 0);

    const realLimit = baseAvailable / daysLeft;
    const plannedLimit = (baseAvailable + otherIncomes - plannedExpensesInWindow) / daysLeft;

    out.push({
      ...inc,
      daysLeft,
      realLimit: Math.max(0, realLimit),
      plannedLimit: Math.max(0, plannedLimit),
      plannedExpensesInWindow,
      otherIncomesInWindow: otherIncomes,
    });
  }
  return out;
}

const PLANNED_LIMITS = genPlannedLimits();

const futureIncome = INCOMES.filter(i => i.type === "planned").reduce((s,i)=>s+i.amount, 0);
const futureExpense = EXPENSES.filter(e => e.type === "planned").reduce((s,e)=>s+e.amount, 0);

// 30-day spending series for sparkline
const SPEND_SERIES = [];
for (let d = 29; d >= 0; d--) {
  const dStr = fmt(daysAgo(d));
  const v = EXPENSES.filter(e => e.date === dStr && e.type === "normal").reduce((s,e)=>s+e.amount, 0);
  SPEND_SERIES.push({ date: dStr, value: v });
}

const Data = {
  today, todayStr,
  categories: CATEGORIES,
  users: USERS,
  expenses: EXPENSES,
  incomes: INCOMES,
  availableFunds,
  savingsGoal,
  savingsCurrent,
  todayExpenses,
  weekExpenses,
  monthExpenses,
  dailyLimit1,
  daysLeft1,
  dailyLimit2,
  envelopeAmount,
  envelopeSpent,
  envelopeMedian,
  futureIncome,
  futureExpense,
  plannedLimits: PLANNED_LIMITS,
  spendSeries: SPEND_SERIES,
  catById: (id) => CATEGORIES.find(c => c.id === id),
  userById: (id) => USERS.find(u => u.id === id),
};

// format helpers
const Fmt = {
  zl: (n) => new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n),
  int: (n) => new Intl.NumberFormat("pl-PL").format(n),
  pct: (n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`,
  date: (s) => {
    const d = new Date(s);
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
  },
  dateLong: (s) => {
    const d = new Date(s);
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  },
  relativeDate: (s) => {
    const d = new Date(s);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return "Dziś";
    if (diff === -1) return "Wczoraj";
    if (diff === 1) return "Jutro";
    if (diff > 0 && diff < 7) return `za ${diff} dni`;
    if (diff < 0 && diff > -7) return `${Math.abs(diff)} dni temu`;
    return Fmt.date(s);
  },
};

window.Data = Data;
window.Fmt = Fmt;
