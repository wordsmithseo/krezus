// src/utils/llmExport.js
// Eksport kompletnych danych budżetowych do analizy przez LLM

import {
    getCategories,
    getExpenses,
    getIncomes,
    getEndDates,
    getDailyEnvelope
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
    getTopSources
} from '../modules/budgetCalculator.js';

import { getWarsawDateString } from './dateHelpers.js';

/**
 * Zbiera wszystkie dane budżetowe z pełnymi szczegółami
 */
function collectCompleteBudgetData() {
    const today = getWarsawDateString();
    const now = new Date().toISOString();

    // 1. DANE PODSTAWOWE
    const categories = getCategories();
    const expenses = getExpenses();
    const incomes = getIncomes();
    const endDates = getEndDates();
    const envelope = getDailyEnvelope();
    // 2. OBLICZENIA FINANSOWE
    const availableFunds = calculateAvailableFunds();
    const spendingPeriods = calculateSpendingPeriods();
    const limits = calculateCurrentLimits();
    const plannedTotals = calculatePlannedTransactionsTotals();
    const spendingDynamics = calculateSpendingDynamics();

    // 3. STATYSTYKI CZASOWE
    const todayExpenses = getTodayExpenses();
    const weekExpenses = getWeekExpenses();
    const monthExpenses = getMonthExpenses();
    const median30d = getGlobalMedian30d();

    // 4. TOP KATEGORIE I ŹRÓDŁA
    const topCategories = getTopCategories(10);
    const topSources = getTopSources(10);

    // 5. SZCZEGÓŁOWA HISTORIA TRANSAKCJI
    const expensesHistory = expenses.map(exp => ({
        id: exp.id,
        date: exp.date,
        amount: exp.amount,
        category: exp.category,
        categoryName: categories.find(c => c.id === exp.category)?.name || 'Nieznana',
        categoryIcon: categories.find(c => c.id === exp.category)?.icon || '❓',
        description: exp.description || '',
        type: exp.type,
        source: exp.source || '',
        isRecurring: exp.type === 'recurring',
        isPlan: exp.type === 'plan',
        isNormal: exp.type === 'normal',
        realizedDate: exp.realizedDate || null,
        wasAutoRealized: exp.realizedDate ? true : false
    }));

    const incomesHistory = incomes.map(inc => ({
        id: inc.id,
        date: inc.date,
        amount: inc.amount,
        source: inc.source,
        description: inc.description || '',
        type: inc.type,
        isRecurring: inc.type === 'recurring',
        isPlan: inc.type === 'plan',
        isNormal: inc.type === 'normal',
        realizedDate: inc.realizedDate || null,
        wasAutoRealized: inc.realizedDate ? true : false
    }));

    // 6. ANALIZA KATEGORII - wydatki per kategoria
    const categoryAnalysis = categories.map(cat => {
        const catExpenses = expenses.filter(e =>
            e.category === cat.id && e.type === 'normal'
        );
        const total = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const count = catExpenses.length;
        const avg = count > 0 ? total / count : 0;

        // Wydatki z ostatnich 30 dni
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const date30 = getWarsawDateString(thirtyDaysAgo);

        const last30Days = catExpenses.filter(e => e.date >= date30);
        const total30d = last30Days.reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
            id: cat.id,
            name: cat.name,
            icon: cat.icon,
            totalSpent: total,
            transactionCount: count,
            averageTransaction: avg,
            last30DaysTotal: total30d,
            last30DaysCount: last30Days.length,
            percentageOfTotal: expenses.length > 0 ? (count / expenses.length * 100) : 0
        };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    // 7. ANALIZA ŹRÓDEŁ PRZYCHODÓW
    const sourceAnalysis = {};
    incomes.forEach(inc => {
        const source = inc.source || 'Nieznane źródło';
        if (!sourceAnalysis[source]) {
            sourceAnalysis[source] = {
                source: source,
                totalIncome: 0,
                count: 0,
                transactions: []
            };
        }
        sourceAnalysis[source].totalIncome += inc.amount || 0;
        sourceAnalysis[source].count += 1;
        sourceAnalysis[source].transactions.push({
            date: inc.date,
            amount: inc.amount,
            description: inc.description,
            type: inc.type
        });
    });

    // 8. ANALIZA CZASOWA - wydatki per dzień/tydzień/miesiąc
    const dailyExpenses = {};
    expenses.filter(e => e.type === 'normal').forEach(exp => {
        if (!dailyExpenses[exp.date]) {
            dailyExpenses[exp.date] = {
                date: exp.date,
                total: 0,
                count: 0,
                transactions: []
            };
        }
        dailyExpenses[exp.date].total += exp.amount || 0;
        dailyExpenses[exp.date].count += 1;
        dailyExpenses[exp.date].transactions.push({
            amount: exp.amount,
            category: categories.find(c => c.id === exp.category)?.name,
            description: exp.description
        });
    });

    // 9. TRENDY I PROGNOZY
    const last7DaysExpenses = Object.entries(dailyExpenses)
        .filter(([date]) => {
            const d = new Date(date);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return d >= sevenDaysAgo;
        })
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const last30DaysExpenses = Object.entries(dailyExpenses)
        .filter(([date]) => {
            const d = new Date(date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return d >= thirtyDaysAgo;
        })
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // 10. KOMPLETNA STRUKTURA DANYCH
    return {
        metadata: {
            exportDate: now,
            exportDateReadable: new Date(now).toLocaleString('pl-PL'),
            currentDate: today,
            dataVersion: '1.0',
            description: 'Kompletny eksport danych budżetowych aplikacji Krezus dla analizy przez LLM'
        },

        summary: {
            availableFunds: availableFunds.available,
            savings: availableFunds.savingsAmount,
            toSpend: availableFunds.available,
            totalExpenses: expenses.filter(e => e.type === 'normal').reduce((s, e) => s + (e.amount || 0), 0),
            totalIncomes: incomes.filter(i => i.type === 'normal').reduce((s, i) => s + (i.amount || 0), 0),
            expensesCount: expenses.filter(e => e.type === 'normal').length,
            incomesCount: incomes.filter(i => i.type === 'normal').length,
            categoriesCount: categories.length,
            activePeriods: spendingPeriods.periods.length
        },

        currentState: {
            todayExpenses: todayExpenses,
            weekExpenses: weekExpenses,
            monthExpenses: monthExpenses,
            median30Days: median30d,
            dailyEnvelope: envelope ? {
                date: envelope.date,
                baseAmount: envelope.baseAmount,
                totalAmount: envelope.totalAmount,
                spent: envelope.spent,
                remaining: envelope.totalAmount - envelope.spent,
                period: envelope.period,
                calculatedAt: envelope.calculatedAt
            } : null
        },

        periods: {
            activePeriods: spendingPeriods.periods.map((p, idx) => ({
                index: idx,
                name: p.name,
                endDate: p.date,
                daysLeft: p.daysLeft,
                isActivePeriod: idx === 0
            })),
            endDates: endDates
        },

        limits: {
            currentLimits: limits,
            plannedTotals: plannedTotals
        },

        dynamics: {
            status: spendingDynamics.status,
            title: spendingDynamics.title,
            summary: spendingDynamics.summary,
            details: spendingDynamics.details,
            recommendation: spendingDynamics.recommendation
        },

        categories: {
            list: categories,
            analysis: categoryAnalysis,
            topCategories: topCategories
        },

        expenses: {
            all: expensesHistory,
            byType: {
                normal: expenses.filter(e => e.type === 'normal'),
                recurring: expenses.filter(e => e.type === 'recurring'),
                planned: expenses.filter(e => e.type === 'plan')
            },
            daily: dailyExpenses,
            last7Days: last7DaysExpenses,
            last30Days: last30DaysExpenses
        },

        incomes: {
            all: incomesHistory,
            byType: {
                normal: incomes.filter(i => i.type === 'normal'),
                recurring: incomes.filter(i => i.type === 'recurring'),
                planned: incomes.filter(i => i.type === 'plan')
            },
            bySources: sourceAnalysis,
            topSources: topSources
        },

        statistics: {
            expensesByCategory: categoryAnalysis,
            dailyAverages: {
                last7Days: last7DaysExpenses.length > 0
                    ? last7DaysExpenses.reduce((s, d) => s + d.total, 0) / last7DaysExpenses.length
                    : 0,
                last30Days: last30DaysExpenses.length > 0
                    ? last30DaysExpenses.reduce((s, d) => s + d.total, 0) / last30DaysExpenses.length
                    : 0
            },
            medians: {
                global30Days: median30d,
                byCategory: categoryAnalysis.map(cat => ({
                    category: cat.name,
                    median: cat.averageTransaction
                }))
            }
        },

        timelineAnalysis: {
            firstTransaction: {
                expense: expenses.length > 0 ? expenses.sort((a, b) => a.date.localeCompare(b.date))[0] : null,
                income: incomes.length > 0 ? incomes.sort((a, b) => a.date.localeCompare(b.date))[0] : null
            },
            lastTransaction: {
                expense: expenses.length > 0 ? expenses.sort((a, b) => b.date.localeCompare(a.date))[0] : null,
                income: incomes.length > 0 ? incomes.sort((a, b) => b.date.localeCompare(a.date))[0] : null
            },
            dateRange: {
                from: expenses.length > 0 || incomes.length > 0
                    ? Math.min(
                        ...[...expenses, ...incomes].map(t => new Date(t.date).getTime())
                    )
                    : null,
                to: today
            }
        }
    };
}

/**
 * Formatuje dane do TXT w sposób czytelny dla LLM
 */
function formatDataForLLM(data) {
    let text = '';

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   EKSPORT DANYCH BUDŻETOWYCH DLA ANALIZY LLM\n';
    text += '   Aplikacja: Krezus - Inteligentny Budżet Osobisty\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    text += `Data eksportu: ${data.metadata.exportDateReadable}\n`;
    text += `Obecna data: ${data.metadata.currentDate}\n\n`;

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   1. PODSUMOWANIE FINANSOWE\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    text += `Dostępne środki: ${data.summary.availableFunds.toFixed(2)} zł\n`;
    text += `Oszczędności (deklarowane): ${data.summary.savings.toFixed(2)} zł\n`;
    text += `Do wydania: ${data.summary.toSpend.toFixed(2)} zł\n`;
    text += `Suma wszystkich wydatków: ${data.summary.totalExpenses.toFixed(2)} zł\n`;
    text += `Suma wszystkich przychodów: ${data.summary.totalIncomes.toFixed(2)} zł\n`;
    text += `Bilans: ${(data.summary.totalIncomes - data.summary.totalExpenses).toFixed(2)} zł\n`;
    text += `Liczba wydatków: ${data.summary.expensesCount}\n`;
    text += `Liczba przychodów: ${data.summary.incomesCount}\n`;
    text += `Liczba kategorii: ${data.summary.categoriesCount}\n`;
    text += `Aktywne okresy budżetowe: ${data.summary.activePeriods}\n\n`;

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   2. STAN BIEŻĄCY\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    text += `Wydatki dzisiaj: ${data.currentState.todayExpenses.toFixed(2)} zł\n`;
    text += `Wydatki w tym tygodniu: ${data.currentState.weekExpenses.toFixed(2)} zł\n`;
    text += `Wydatki w tym miesiącu: ${data.currentState.monthExpenses.toFixed(2)} zł\n`;
    text += `Mediana wydatków (30 dni): ${data.currentState.median30Days.toFixed(2)} zł\n\n`;

    if (data.currentState.dailyEnvelope) {
        const env = data.currentState.dailyEnvelope;
        text += `KOPERTA DNIA (${env.date}):\n`;
        text += `  - Kwota bazowa: ${env.baseAmount.toFixed(2)} zł\n`;
        text += `  - Wydano: ${env.spent.toFixed(2)} zł\n`;
        text += `  - Pozostało: ${env.remaining.toFixed(2)} zł\n`;
        if (env.period) {
            text += `  - Okres: ${env.period.name} (${env.period.daysLeft} dni)\n`;
        }
        text += `  - Wyliczono: ${new Date(env.calculatedAt).toLocaleString('pl-PL')}\n\n`;
    }

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   3. OKRESY BUDŻETOWE\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    data.periods.activePeriods.forEach(period => {
        text += `${period.name} (${period.endDate}):\n`;
        text += `  - Dni pozostałe: ${period.daysLeft}\n`;
        text += `  - Wybrany dla koperty: ${period.isSelectedForEnvelope ? 'TAK' : 'NIE'}\n`;
        text += `  - Wybrany dla dynamiki: ${period.isSelectedForDynamics ? 'TAK' : 'NIE'}\n\n`;
    });

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   4. DYNAMIKA WYDATKÓW\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    text += `Status: ${data.dynamics.status}\n`;
    text += `${data.dynamics.title}\n\n`;
    text += `${data.dynamics.summary}\n\n`;
    text += `Szczegóły:\n`;
    data.dynamics.details.forEach(detail => {
        text += `  - ${detail}\n`;
    });
    text += `\nRekomendacja: ${data.dynamics.recommendation}\n\n`;

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   5. KATEGORIE I ANALIZA WYDATKÓW\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    data.categories.analysis.forEach((cat, idx) => {
        text += `${idx + 1}. ${cat.icon} ${cat.name}:\n`;
        text += `   - Całkowita suma: ${cat.totalSpent.toFixed(2)} zł\n`;
        text += `   - Liczba transakcji: ${cat.transactionCount}\n`;
        text += `   - Średnia transakcja: ${cat.averageTransaction.toFixed(2)} zł\n`;
        text += `   - Ostatnie 30 dni: ${cat.last30DaysTotal.toFixed(2)} zł (${cat.last30DaysCount} transakcji)\n`;
        text += `   - Procent wszystkich transakcji: ${cat.percentageOfTotal.toFixed(1)}%\n\n`;
    });

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   6. ŹRÓDŁA PRZYCHODÓW\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    Object.values(data.incomes.bySources).forEach(source => {
        text += `${source.source}:\n`;
        text += `  - Całkowity przychód: ${source.totalIncome.toFixed(2)} zł\n`;
        text += `  - Liczba wpłat: ${source.count}\n`;
        text += `  - Średnia wpłata: ${(source.totalIncome / source.count).toFixed(2)} zł\n\n`;
    });

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   7. HISTORIA WYDATKÓW (PEŁNA)\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    const sortedExpenses = [...data.expenses.all].sort((a, b) => b.date.localeCompare(a.date));
    sortedExpenses.forEach(exp => {
        text += `[${exp.date}] ${exp.amount.toFixed(2)} zł - ${exp.categoryIcon} ${exp.categoryName}\n`;
        if (exp.description) {
            text += `  Opis: ${exp.description}\n`;
        }
        if (exp.source) {
            text += `  Źródło: ${exp.source}\n`;
        }
        text += `  Typ: ${exp.type}`;
        if (exp.realizedDate) {
            text += ` (zrealizowano: ${exp.realizedDate})`;
        }
        text += '\n\n';
    });

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   8. HISTORIA PRZYCHODÓW (PEŁNA)\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    const sortedIncomes = [...data.incomes.all].sort((a, b) => b.date.localeCompare(a.date));
    sortedIncomes.forEach(inc => {
        text += `[${inc.date}] ${inc.amount.toFixed(2)} zł - ${inc.source}\n`;
        if (inc.description) {
            text += `  Opis: ${inc.description}\n`;
        }
        text += `  Typ: ${inc.type}`;
        if (inc.realizedDate) {
            text += ` (zrealizowano: ${inc.realizedDate})`;
        }
        text += '\n\n';
    });

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   9. ANALIZA OSTATNICH 7 DNI\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    if (data.expenses.last7Days.length > 0) {
        data.expenses.last7Days.forEach(day => {
            text += `${day.date}: ${day.total.toFixed(2)} zł (${day.count} transakcji)\n`;
        });
        const avg7 = data.statistics.dailyAverages.last7Days;
        text += `\nŚrednia dzienna (7 dni): ${avg7.toFixed(2)} zł\n\n`;
    } else {
        text += 'Brak wydatków w ostatnich 7 dniach.\n\n';
    }

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   10. ANALIZA OSTATNICH 30 DNI\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';

    if (data.expenses.last30Days.length > 0) {
        const avg30 = data.statistics.dailyAverages.last30Days;
        const total30 = data.expenses.last30Days.reduce((s, d) => s + d.total, 0);
        text += `Suma wydatków (30 dni): ${total30.toFixed(2)} zł\n`;
        text += `Średnia dzienna (30 dni): ${avg30.toFixed(2)} zł\n`;
        text += `Liczba dni z wydatkami: ${data.expenses.last30Days.length}\n\n`;
    } else {
        text += 'Brak wydatków w ostatnich 30 dniach.\n\n';
    }

    text += '═══════════════════════════════════════════════════════════════\n';
    text += '   KONIEC EKSPORTU\n';
    text += '═══════════════════════════════════════════════════════════════\n';

    return text;
}

function escapeCSV(val) {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function formatDataAsCSV(data) {
    const expRows = [
        ['Data', 'Kwota', 'Kategoria', 'Opis', 'Typ'].join(','),
        ...data.expenses.all.map(e => [
            escapeCSV(e.date),
            escapeCSV(e.amount),
            escapeCSV(e.category),
            escapeCSV(e.description),
            escapeCSV(e.type),
        ].join(','))
    ].join('\n');

    const incRows = [
        ['Data', 'Kwota', 'Źródło', 'Opis', 'Typ'].join(','),
        ...data.incomes.all.map(i => [
            escapeCSV(i.date),
            escapeCSV(i.amount),
            escapeCSV(i.source),
            escapeCSV(i.description),
            escapeCSV(i.type),
        ].join(','))
    ].join('\n');

    return `WYDATKI\n${expRows}\n\nPRZYCHODY\n${incRows}`;
}

/**
 * Eksportuje dane do pliku
 */
export function exportBudgetDataForLLM(format = 'json') {
    try {
        console.log('📊 Rozpoczynam eksport danych budżetowych dla LLM...');

        const data = collectCompleteBudgetData();
        let content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            filename = `krezus_budget_export_${data.metadata.currentDate}.json`;
            mimeType = 'application/json';
        } else if (format === 'csv') {
            content = formatDataAsCSV(data);
            filename = `krezus_budget_export_${data.metadata.currentDate}.csv`;
            mimeType = 'text/csv';
        } else {
            content = formatDataForLLM(data);
            filename = `krezus_budget_export_${data.metadata.currentDate}.txt`;
            mimeType = 'text/plain';
        }

        // Utwórz blob i pobierz
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`✅ Eksport zakończony pomyślnie: ${filename}`);
        console.log(`📦 Rozmiar danych: ${(blob.size / 1024).toFixed(2)} KB`);

        return true;
    } catch (error) {
        console.error('❌ Błąd eksportu danych:', error);
        alert('Wystąpił błąd podczas eksportu danych. Sprawdź konsolę.');
        return false;
    }
}
