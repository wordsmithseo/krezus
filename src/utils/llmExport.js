// src/utils/llmExport.js
// Eksport kompletnych danych budżetowych do analizy przez LLM

import {
    getCategories,
    getExpenses,
    getIncomes,
    getEndDates,
    getDailyEnvelope,
    getSavings,
    getGoals,
} from '../modules/dataManager.js';

import {
    calculateAvailableFunds,
    calculateSpendingPeriods,
    calculateCurrentLimits,
    calculatePlannedTransactionsTotals,
    calculateSpendingDynamics,
    getTodayExpenses,
    getWeekExpenses,
    getMonthExpenses,
    getGlobalMedian30d,
    getTopCategories,
    getTopSources,
} from '../modules/budgetCalculator.js';

import { getWarsawDateString } from './dateHelpers.js';

// Dependency injection — app.js przekazuje getter przez setLLMExportDeps
let _getBudgetUsersCache = () => [];

export function setLLMExportDeps({ getBudgetUsersCache }) {
    if (getBudgetUsersCache) _getBudgetUsersCache = getBudgetUsersCache;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function daysAgoStr(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return getWarsawDateString(d);
}

// ---------------------------------------------------------------------------
// Zbieranie danych
// ---------------------------------------------------------------------------

function collectCompleteBudgetData() {
    const today = getWarsawDateString();
    const now = new Date().toISOString();

    // 1. DANE SUROWE
    const categories = getCategories();
    const expenses   = getExpenses();
    const incomes    = getIncomes();
    const endDates   = getEndDates();
    const envelope   = getDailyEnvelope();
    const savings    = getSavings();
    const goals      = getGoals();
    const budgetUsers = _getBudgetUsersCache();

    // 2. OBLICZENIA
    const availableFunds   = calculateAvailableFunds();
    const spendingPeriods  = calculateSpendingPeriods();
    const limits           = calculateCurrentLimits();
    const plannedTotals    = calculatePlannedTransactionsTotals();
    const spendingDynamics = calculateSpendingDynamics();
    const todayExpenses    = getTodayExpenses();
    const weekExpenses     = getWeekExpenses();
    const monthExpenses    = getMonthExpenses();
    const median30d        = getGlobalMedian30d();
    const topCategories    = getTopCategories(10);
    const topSources       = getTopSources(10);

    // 3. FILTRY
    const realExpenses   = expenses.filter(e => e.type === 'normal');
    const realIncomes    = incomes.filter(i => i.type === 'normal');
    const totalExpValue  = realExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalIncValue  = realIncomes.reduce((s, i) => s + (i.amount || 0), 0);

    // 4. MAPOWANIA
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
    const userMap     = Object.fromEntries((budgetUsers || []).map(u => [u.id, u.name]));

    const date30 = daysAgoStr(30);
    const date7  = daysAgoStr(7);

    // 5. HISTORIA TRANSAKCJI (wzbogacona — jedno źródło prawdy)
    const expensesHistory = expenses.map(exp => ({
        id:           exp.id,
        date:         exp.date,
        time:         exp.time || null,
        amount:       exp.amount,
        categoryId:   exp.category,
        categoryName: categoryMap[exp.category]?.name || 'Nieznana',
        categoryIcon: categoryMap[exp.category]?.icon || '❓',
        description:  exp.description || '',
        type:         exp.type,
        wasPlanned:   exp.wasPlanned || false,
        userId:       exp.userId || null,
        userName:     userMap[exp.userId] || null,
    }));

    const incomesHistory = incomes.map(inc => ({
        id:          inc.id,
        date:        inc.date,
        time:        inc.time || null,
        amount:      inc.amount,
        source:      inc.source,
        description: inc.description || '',
        type:        inc.type,
        wasPlanned:  inc.wasPlanned || false,
        userId:      inc.userId || null,
        userName:    userMap[inc.userId] || null,
    }));

    // 6. ANALIZA KATEGORII — procenty wartościowe, prawdziwa mediana
    const categoryAnalysis = categories.map(cat => {
        const catExp  = realExpenses.filter(e => e.category === cat.id);
        const total   = catExp.reduce((s, e) => s + (e.amount || 0), 0);
        const count   = catExp.length;
        const amounts = catExp.map(e => e.amount || 0);
        const last30  = catExp.filter(e => e.date >= date30);

        return {
            id:                     cat.id,
            name:                   cat.name,
            icon:                   cat.icon,
            totalSpent:             total,
            percentageOfTotalValue: totalExpValue > 0 ? (total / totalExpValue * 100) : 0,
            transactionCount:       count,
            averageTransaction:     count > 0 ? total / count : 0,
            medianTransaction:      computeMedian(amounts),
            last30DaysTotal:        last30.reduce((s, e) => s + (e.amount || 0), 0),
            last30DaysCount:        last30.length,
        };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    // 7. ANALIZA ŹRÓDEŁ PRZYCHODÓW
    const sourceMap = {};
    realIncomes.forEach(inc => {
        const src = inc.source || 'Nieznane';
        if (!sourceMap[src]) sourceMap[src] = { source: src, totalIncome: 0, count: 0 };
        sourceMap[src].totalIncome += inc.amount || 0;
        sourceMap[src].count       += 1;
    });
    const sourceAnalysis = Object.values(sourceMap).sort((a, b) => b.totalIncome - a.totalIncome);

    // 8. ANALIZA DZIENNA
    const dailyMap = {};
    realExpenses.forEach(exp => {
        if (!dailyMap[exp.date]) {
            dailyMap[exp.date] = { date: exp.date, total: 0, count: 0, transactions: [] };
        }
        dailyMap[exp.date].total += exp.amount || 0;
        dailyMap[exp.date].count += 1;
        dailyMap[exp.date].transactions.push({
            amount:       exp.amount,
            categoryName: categoryMap[exp.category]?.name,
            description:  exp.description,
        });
    });
    const dailySorted  = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const last7Days    = dailySorted.filter(d => d.date >= date7);
    const last30Days   = dailySorted.filter(d => d.date >= date30);

    // 9. ANALIZA MIESIĘCZNA (najcenniejsza jednostka trendów)
    const monthlyMap = {};
    realExpenses.forEach(exp => {
        const ym = exp.date.slice(0, 7);
        if (!monthlyMap[ym]) monthlyMap[ym] = { month: ym, totalExpenses: 0, expenseCount: 0, totalIncomes: 0, incomeCount: 0 };
        monthlyMap[ym].totalExpenses += exp.amount || 0;
        monthlyMap[ym].expenseCount  += 1;
    });
    realIncomes.forEach(inc => {
        const ym = inc.date.slice(0, 7);
        if (!monthlyMap[ym]) monthlyMap[ym] = { month: ym, totalExpenses: 0, expenseCount: 0, totalIncomes: 0, incomeCount: 0 };
        monthlyMap[ym].totalIncomes += inc.amount || 0;
        monthlyMap[ym].incomeCount  += 1;
    });
    const monthlyBreakdown = Object.values(monthlyMap)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(m => ({ ...m, balance: m.totalIncomes - m.totalExpenses }));

    // 10. TIMELINE — spread żeby nie mutować cache
    const sortedExpByDate = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
    const sortedIncByDate = [...incomes].sort((a, b) => a.date.localeCompare(b.date));

    // ---------------------------------------------------------------------------
    // STRUKTURA WYJŚCIOWA
    // ---------------------------------------------------------------------------
    return {
        // --- Kontekst dla LLM (PIERWSZA sekcja) ---
        context: {
            description: 'Eksport danych budżetowych z aplikacji Krezus (polska aplikacja do zarządzania budżetem domowym).',
            currency: 'PLN (złoty polski)',
            timezone: 'Europe/Warsaw',
            transactionTypes: {
                normal:    'Transakcja zrealizowana (wykonana)',
                planned:   'Zaplanowana — zostanie auto-zrealizowana gdy minie data; po realizacji ma flagę wasPlanned: true',
                recurring: 'Cykliczna (powtarzająca się regularnie)',
            },
            budgetModel: {
                availableFunds: 'Suma przychodów(normal) − suma wydatków(normal) − zarezerwowane oszczędności. To główna miara "co zostało do wydania".',
                dailyEnvelope: 'Koperta dnia = dostępne środki ÷ liczba dni pozostałych do końca aktywnego okresu budżetowego. Pokazuje "ile mogę dziś wydać".',
                dynamics:      'Porównanie średniego dziennego wydatkowania do mediany z ostatnich 30 dni. Status: safe / warning / danger.',
                periods:       'Okresy budżetowe wyznaczane przez daty końcowe (np. koniec tygodnia, miesiąca, data wypłaty). Kilka może być aktywnych jednocześnie.',
                savings:       'Oszczędności podzielone na cele (goals). Każdy cel ma własny budżet i historię wpłat/wypłat.',
            },
        },

        metadata: {
            exportDate:         now,
            exportDateReadable: new Date(now).toLocaleString('pl-PL'),
            currentDate:        today,
            dataVersion:        '2.0',
        },

        summary: {
            availableFunds:         availableFunds.available,
            savingsTotal:           savings?.current || 0,
            totalExpenses:          totalExpValue,
            totalIncomes:           totalIncValue,
            balance:                totalIncValue - totalExpValue,
            expensesCount:          realExpenses.length,
            incomesCount:           realIncomes.length,
            plannedExpensesCount:   expenses.filter(e => e.type === 'planned').length,
            plannedIncomesCount:    incomes.filter(i => i.type === 'planned').length,
            recurringExpensesCount: expenses.filter(e => e.type === 'recurring').length,
            recurringIncomesCount:  incomes.filter(i => i.type === 'recurring').length,
            categoriesCount:        categories.length,
            activePeriods:          spendingPeriods.periods.length,
        },

        currentState: {
            todayExpenses,
            weekExpenses,
            monthExpenses,
            median30Days: median30d,
            dailyEnvelope: envelope ? {
                date:        envelope.date,
                baseAmount:  envelope.baseAmount,
                totalAmount: envelope.totalAmount,
                spent:       envelope.spent,
                remaining:   envelope.totalAmount - envelope.spent,
                period:      envelope.period || null,
            } : null,
        },

        savings: {
            current: savings?.current || 0,
            history: savings?.history || [],
            goals:   goals.map(g => ({
                id:       g.id,
                name:     g.name,
                icon:     g.icon,
                color:    g.color,
                target:   g.target || 0,
                current:  g.current || 0,
                deadline: g.deadline || null,
                progress: g.target > 0 ? Math.min(100, (g.current || 0) / g.target * 100) : null,
                history:  (g.history || []).slice(-20),
            })),
        },

        periods: {
            activePeriods: spendingPeriods.periods.map((p, idx) => ({
                index:    idx,
                name:     p.name,
                endDate:  p.date,
                daysLeft: p.daysLeft,
                isActive: idx === 0,
            })),
            endDates,
        },

        limits: {
            currentLimits: limits,
            plannedTotals,
        },

        dynamics: {
            status:         spendingDynamics.status,
            title:          spendingDynamics.title,
            summary:        spendingDynamics.summary,
            details:        spendingDynamics.details,
            recommendation: spendingDynamics.recommendation,
        },

        budgetUsers: (budgetUsers || []).map(u => ({
            id:      u.id,
            name:    u.name,
            isOwner: u.isOwner || false,
        })),

        categories: {
            list:       categories,
            analysis:   categoryAnalysis,
            topBySpend: topCategories,
        },

        expenses: {
            all:      expensesHistory,
            daily:    dailySorted,
            last7Days,
            last30Days,
        },

        incomes: {
            all:        incomesHistory,
            bySources:  sourceAnalysis,
            topSources,
        },

        monthlyBreakdown,

        statistics: {
            dailyAverages: {
                last7Days:  last7Days.length  > 0 ? last7Days.reduce((s, d)  => s + d.total, 0) / last7Days.length  : 0,
                last30Days: last30Days.length > 0 ? last30Days.reduce((s, d) => s + d.total, 0) / last30Days.length : 0,
            },
            categoryStats: categoryAnalysis.map(cat => ({
                category:  cat.name,
                average:   cat.averageTransaction,
                median:    cat.medianTransaction,
                pctValue:  cat.percentageOfTotalValue,
            })),
        },

        timelineAnalysis: {
            firstExpense:    sortedExpByDate[0]                          || null,
            lastExpense:     sortedExpByDate[sortedExpByDate.length - 1] || null,
            firstIncome:     sortedIncByDate[0]                          || null,
            lastIncome:      sortedIncByDate[sortedIncByDate.length - 1] || null,
            dataRangeMonths: monthlyBreakdown.length,
        },
    };
}

// ---------------------------------------------------------------------------
// Format TXT
// ---------------------------------------------------------------------------

function formatDataForLLM(data) {
    const s = data.summary;
    let text = '';

    const line = '═══════════════════════════════════════════════════════════════\n';

    text += line;
    text += '   EKSPORT DANYCH BUDŻETOWYCH — KREZUS\n';
    text += line + '\n';

    text += `Data eksportu: ${data.metadata.exportDateReadable}\n`;
    text += `Obecna data:   ${data.metadata.currentDate}\n`;
    text += `Waluta: PLN | Strefa czasowa: Europe/Warsaw\n\n`;

    text += '--- MODEL BUDŻETOWY (kontekst dla analizy) ---\n';
    text += `Dostępne środki = przychody(normal) − wydatki(normal) − zarezerwowane oszczędności\n`;
    text += `Koperta dnia = dostępne środki ÷ dni do końca aktywnego okresu budżetowego\n`;
    text += `Typy: normal=zrealizowana | planned=zaplanowana (auto-realizacja) | recurring=cykliczna\n`;
    text += `Dynamika = porównanie tempa wydatków do mediany dziennej z ostatnich 30 dni\n\n`;

    // 1. Podsumowanie
    text += line;
    text += '   1. PODSUMOWANIE FINANSOWE\n';
    text += line + '\n';
    text += `Dostępne środki (do wydania): ${s.availableFunds.toFixed(2)} zł\n`;
    text += `Oszczędności (zarezerwowane):  ${s.savingsTotal.toFixed(2)} zł\n`;
    text += `Suma zrealizowanych wydatków:  ${s.totalExpenses.toFixed(2)} zł\n`;
    text += `Suma zrealizowanych przychodów:${s.totalIncomes.toFixed(2)} zł\n`;
    text += `Bilans ogólny:                 ${s.balance.toFixed(2)} zł\n`;
    text += `Wydatki: ${s.expensesCount} zrealizowanych + ${s.plannedExpensesCount} zaplanowanych + ${s.recurringExpensesCount} cyklicznych\n`;
    text += `Przychody: ${s.incomesCount} zrealizowanych + ${s.plannedIncomesCount} zaplanowanych + ${s.recurringIncomesCount} cyklicznych\n`;
    text += `Kategorie: ${s.categoriesCount} | Aktywne okresy: ${s.activePeriods}\n\n`;

    // 2. Stan bieżący
    text += line;
    text += '   2. STAN BIEŻĄCY\n';
    text += line + '\n';
    const cs = data.currentState;
    text += `Wydatki dzisiaj:        ${cs.todayExpenses.toFixed(2)} zł\n`;
    text += `Wydatki ten tydzień:    ${cs.weekExpenses.toFixed(2)} zł\n`;
    text += `Wydatki ten miesiąc:    ${cs.monthExpenses.toFixed(2)} zł\n`;
    text += `Mediana dzienna 30 dni: ${cs.median30Days.toFixed(2)} zł\n\n`;

    if (cs.dailyEnvelope) {
        const env = cs.dailyEnvelope;
        text += `KOPERTA DNIA (${env.date}):\n`;
        text += `  Kwota bazowa: ${env.baseAmount.toFixed(2)} zł\n`;
        text += `  Wydano:       ${env.spent.toFixed(2)} zł\n`;
        text += `  Pozostało:    ${env.remaining.toFixed(2)} zł\n`;
        if (env.period) text += `  Okres: ${env.period.name} (${env.period.daysLeft} dni)\n`;
        text += '\n';
    }

    // 3. Oszczędności i cele
    text += line;
    text += '   3. OSZCZĘDNOŚCI I CELE\n';
    text += line + '\n';
    text += `Łączna kwota oszczędności: ${data.savings.current.toFixed(2)} zł\n\n`;

    if (data.savings.goals.length > 0) {
        data.savings.goals.forEach(g => {
            const prog = g.progress !== null ? ` — ${g.progress.toFixed(1)}% celu` : '';
            text += `${g.icon} ${g.name}: ${(g.current || 0).toFixed(2)} zł`;
            if (g.target > 0) text += ` / ${g.target.toFixed(2)} zł${prog}`;
            if (g.deadline) text += ` (termin: ${g.deadline})`;
            text += '\n';
        });
    } else {
        text += 'Brak zdefiniowanych celów.\n';
    }
    text += '\n';

    // 4. Okresy budżetowe
    text += line;
    text += '   4. OKRESY BUDŻETOWE\n';
    text += line + '\n';
    data.periods.activePeriods.forEach(p => {
        text += `${p.name} (koniec: ${p.endDate}):\n`;
        text += `  Dni pozostałe: ${p.daysLeft} | Aktywny (koperta): ${p.isActive ? 'TAK' : 'NIE'}\n\n`;
    });

    // 5. Dynamika
    text += line;
    text += '   5. DYNAMIKA WYDATKÓW\n';
    text += line + '\n';
    const dyn = data.dynamics;
    text += `Status: ${dyn.status}\n`;
    text += `${dyn.title}\n\n`;
    text += `${dyn.summary}\n\n`;
    if (dyn.details?.length > 0) {
        text += 'Szczegóły:\n';
        dyn.details.forEach(d => { text += `  - ${d}\n`; });
    }
    text += `\nRekomendacja: ${dyn.recommendation}\n\n`;

    // 6. Kategorie
    text += line;
    text += '   6. KATEGORIE WYDATKÓW\n';
    text += line + '\n';
    data.categories.analysis.forEach((cat, i) => {
        text += `${i + 1}. ${cat.icon} ${cat.name}:\n`;
        text += `   Suma: ${cat.totalSpent.toFixed(2)} zł (${cat.percentageOfTotalValue.toFixed(1)}% wartości wydatków)\n`;
        text += `   Transakcji: ${cat.transactionCount} | Średnia: ${cat.averageTransaction.toFixed(2)} zł | Mediana: ${cat.medianTransaction.toFixed(2)} zł\n`;
        text += `   Ostatnie 30 dni: ${cat.last30DaysTotal.toFixed(2)} zł (${cat.last30DaysCount} trans.)\n\n`;
    });

    // 7. Źródła przychodów
    text += line;
    text += '   7. ŹRÓDŁA PRZYCHODÓW\n';
    text += line + '\n';
    data.incomes.bySources.forEach(src => {
        const avg = src.count > 0 ? src.totalIncome / src.count : 0;
        text += `${src.source}: ${src.totalIncome.toFixed(2)} zł | ${src.count} wpłat | śr. ${avg.toFixed(2)} zł\n`;
    });
    text += '\n';

    // 8. Zestawienie miesięczne
    text += line;
    text += '   8. ZESTAWIENIE MIESIĘCZNE\n';
    text += line + '\n';
    if (data.monthlyBreakdown.length > 0) {
        data.monthlyBreakdown.forEach(m => {
            const sign = m.balance >= 0 ? '+' : '';
            text += `${m.month}: wydatki ${m.totalExpenses.toFixed(2)} zł (${m.expenseCount} trans.)`;
            text += ` | przychody ${m.totalIncomes.toFixed(2)} zł`;
            text += ` | bilans ${sign}${m.balance.toFixed(2)} zł\n`;
        });
    } else {
        text += 'Brak danych.\n';
    }
    text += '\n';

    // 9. Ostatnie 7 dni
    text += line;
    text += '   9. OSTATNIE 7 DNI\n';
    text += line + '\n';
    if (data.expenses.last7Days.length > 0) {
        data.expenses.last7Days.forEach(day => {
            text += `${day.date}: ${day.total.toFixed(2)} zł (${day.count} trans.)\n`;
        });
        text += `Średnia dzienna: ${data.statistics.dailyAverages.last7Days.toFixed(2)} zł\n\n`;
    } else {
        text += 'Brak wydatków w ostatnich 7 dniach.\n\n';
    }

    // 10. Użytkownicy (jeśli więcej niż 1)
    let sectionNum = 10;
    if (data.budgetUsers.length > 0) {
        text += line;
        text += `   ${sectionNum}. UŻYTKOWNICY BUDŻETU\n`;
        text += line + '\n';
        data.budgetUsers.forEach(u => {
            text += `${u.name}${u.isOwner ? ' (właściciel)' : ''}\n`;
        });
        text += '\n';
        sectionNum++;
    }

    // Historia wydatków
    text += line;
    text += `   ${sectionNum}. HISTORIA WYDATKÓW (PEŁNA, od najnowszych)\n`;
    text += line + '\n';
    sectionNum++;
    const sortedExp = [...data.expenses.all].sort((a, b) => b.date.localeCompare(a.date));
    sortedExp.forEach(exp => {
        const user = exp.userName ? ` [${exp.userName}]` : '';
        text += `[${exp.date}] ${exp.amount.toFixed(2)} zł — ${exp.categoryIcon} ${exp.categoryName}${user}\n`;
        if (exp.description) text += `  Opis: ${exp.description}\n`;
        text += `  Typ: ${exp.type}${exp.wasPlanned ? ' (była zaplanowana)' : ''}\n\n`;
    });

    // Historia przychodów
    text += line;
    text += `   ${sectionNum}. HISTORIA PRZYCHODÓW (PEŁNA, od najnowszych)\n`;
    text += line + '\n';
    const sortedInc = [...data.incomes.all].sort((a, b) => b.date.localeCompare(a.date));
    sortedInc.forEach(inc => {
        const user = inc.userName ? ` [${inc.userName}]` : '';
        text += `[${inc.date}] ${inc.amount.toFixed(2)} zł — ${inc.source}${user}\n`;
        if (inc.description) text += `  Opis: ${inc.description}\n`;
        text += `  Typ: ${inc.type}${inc.wasPlanned ? ' (była zaplanowana)' : ''}\n\n`;
    });

    text += line;
    text += '   KONIEC EKSPORTU\n';
    text += line;

    return text;
}

// ---------------------------------------------------------------------------
// Format CSV
// ---------------------------------------------------------------------------

function escapeCSV(val) {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
}

function formatDataAsCSV(data) {
    const expRows = [
        ['Data', 'Kwota', 'Kategoria', 'Opis', 'Typ', 'Była zaplanowana', 'Użytkownik'].join(','),
        ...data.expenses.all.map(e => [
            escapeCSV(e.date),
            escapeCSV(e.amount),
            escapeCSV(e.categoryName),   // nazwa, nie ID
            escapeCSV(e.description),
            escapeCSV(e.type),
            escapeCSV(e.wasPlanned ? 'TAK' : ''),
            escapeCSV(e.userName || ''),
        ].join(',')),
    ].join('\n');

    const incRows = [
        ['Data', 'Kwota', 'Źródło', 'Opis', 'Typ', 'Była zaplanowana', 'Użytkownik'].join(','),
        ...data.incomes.all.map(i => [
            escapeCSV(i.date),
            escapeCSV(i.amount),
            escapeCSV(i.source),
            escapeCSV(i.description),
            escapeCSV(i.type),
            escapeCSV(i.wasPlanned ? 'TAK' : ''),
            escapeCSV(i.userName || ''),
        ].join(',')),
    ].join('\n');

    return `WYDATKI\n${expRows}\n\nPRZYCHODY\n${incRows}`;
}

// ---------------------------------------------------------------------------
// Główna funkcja eksportu
// ---------------------------------------------------------------------------

export function exportBudgetDataForLLM(format = 'json') {
    try {
        console.log('📊 Rozpoczynam eksport danych budżetowych dla LLM...');

        const data = collectCompleteBudgetData();
        let content, filename, mimeType;

        if (format === 'json') {
            content  = JSON.stringify(data, null, 2);
            filename = `krezus_budget_export_${data.metadata.currentDate}.json`;
            mimeType = 'application/json';
        } else if (format === 'csv') {
            content  = formatDataAsCSV(data);
            filename = `krezus_budget_export_${data.metadata.currentDate}.csv`;
            mimeType = 'text/csv';
        } else {
            content  = formatDataForLLM(data);
            filename = `krezus_budget_export_${data.metadata.currentDate}.txt`;
            mimeType = 'text/plain';
        }

        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`✅ Eksport zakończony: ${filename} (${(blob.size / 1024).toFixed(2)} KB)`);
        return true;
    } catch (error) {
        console.error('❌ Błąd eksportu danych:', error);
        alert('Wystąpił błąd podczas eksportu danych. Sprawdź konsolę.');
        return false;
    }
}
