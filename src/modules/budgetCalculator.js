// src/modules/budgetCalculator.js
import { parseDateStr, getWarsawDateString, getCurrentTimeString, isRealised } from '../utils/dateHelpers.js';
import { getIncomes, getExpenses, getEndDates, getSavingGoal, getDailyEnvelope, saveDailyEnvelope } from './dataManager.js';

export function calculateRealisedTotals(dateStr = null) {
    const today = dateStr || getWarsawDateString();
    console.log('📊 Obliczanie zrealizowanych sum (WŁĄCZNIE z dzisiejszymi)');
    console.log('📅 Dzisiejsza data:', today);
    
    const incomes = getIncomes();
    const expenses = getExpenses();
    
    console.log('📥 Liczba przychodów:', incomes.length);
    console.log('📤 Liczba wydatków:', expenses.length);

    let sumIncome = 0;
    let sumExpense = 0;

    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date <= today) {
            sumIncome += inc.amount || 0;
        }
    });

    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date <= today) {
            sumExpense += exp.amount || 0;
        }
    });

    console.log('📊 SUMA przychodów (zrealizowane, do dziś włącznie):', sumIncome);
    console.log('📊 SUMA wydatków (zrealizowane, do dziś włącznie):', sumExpense);

    return { sumIncome, sumExpense };
}

export function getTodayExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    return expenses
        .filter(e => e.type === 'normal' && e.date === today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
}

export function getWeekExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    const todayDate = new Date(today);
    const dayOfWeek = todayDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() + diff);
    const weekStartStr = getWarsawDateString(weekStart);
    
    return expenses
        .filter(e => e.type === 'normal' && e.date >= weekStartStr && e.date <= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
}

export function getMonthExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    const todayDate = new Date(today);
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const monthStartStr = getWarsawDateString(monthStart);
    
    return expenses
        .filter(e => e.type === 'normal' && e.date >= monthStartStr && e.date <= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
}

/**
 * Pobiera następne daty planowanych przychodów (automatyczne wyznaczanie okresów budżetowych)
 * Zwraca maksymalnie 2 najbliższe daty planowanych wpływów
 */
function getNextPlannedIncomeDates() {
    const incomes = getIncomes();
    const today = getWarsawDateString();

    // Filtruj planowane przychody od dzisiaj w przyszłość
    const plannedIncomes = incomes
        .filter(inc => inc.type === 'planned' && inc.date >= today)
        .map(inc => inc.date)
        .sort(); // Sortuj chronologicznie

    // Usuń duplikaty
    const uniqueDates = [...new Set(plannedIncomes)];

    console.log('📅 Znalezione daty planowanych przychodów:', uniqueDates);

    return {
        date1: uniqueDates[0] || '',
        date2: uniqueDates[1] || ''
    };
}

export function calculateSpendingPeriods() {
    // ZMIANA: Używamy automatycznych dat z planowanych przychodów zamiast manualnych z ustawień
    const { date1, date2 } = getNextPlannedIncomeDates();
    const today = getWarsawDateString();

    let daysLeft1 = 0;
    let daysLeft2 = 0;

    if (date1 && date1.trim() !== '') {
        const d1 = parseDateStr(date1);
        const td = parseDateStr(today);
        if (d1 && td && !isNaN(d1.getTime()) && !isNaN(td.getTime())) {
            daysLeft1 = Math.max(0, Math.floor((d1 - td) / (1000*60*60*24)));
        }
    }

    if (date2 && date2.trim() !== '') {
        const d2 = parseDateStr(date2);
        const td = parseDateStr(today);
        if (d2 && td && !isNaN(d2.getTime()) && !isNaN(td.getTime())) {
            daysLeft2 = Math.max(0, Math.floor((d2 - td) / (1000*60*60*24)));
        }
    }

    console.log('📊 Okresy budżetowe (automatyczne):', {
        date1,
        date2,
        daysLeft1,
        daysLeft2
    });

    return { date1, date2, daysLeft1, daysLeft2 };
}

export function calculateAvailableFunds() {
    const { sumIncome, sumExpense } = calculateRealisedTotals();
    const available = sumIncome - sumExpense;
    const savingGoal = getSavingGoal();
    
    return {
        available,
        savingGoal
    };
}

export function calculateCurrentLimits() {
    const { available, savingGoal } = calculateAvailableFunds();
    const toSpend = available - savingGoal;
    const { date1, date2, daysLeft1, daysLeft2 } = calculateSpendingPeriods();
    
    const currentLimit1 = daysLeft1 > 0 ? toSpend / daysLeft1 : 0;
    const currentLimit2 = daysLeft2 > 0 ? toSpend / daysLeft2 : 0;
    
    return {
        currentLimit1,
        currentLimit2,
        daysLeft1,
        daysLeft2,
        date1,
        date2
    };
}

export function calculatePlannedTransactionsTotals() {
    const incomes = getIncomes();
    const expenses = getExpenses();
    const today = getWarsawDateString();
    const { date1, date2 } = calculateSpendingPeriods();
    
    console.log('📊 === DEBUG PLANOWANYCH TRANSAKCJI ===');
    console.log('📅 Dzisiejsza data:', today);
    console.log('📅 Data końcowa 1:', date1);
    console.log('📅 Data końcowa 2:', date2);
    console.log('📥 Wszystkie przychody:', incomes.length);
    console.log('📤 Wszystkie wydatki:', expenses.length);
    
    const plannedIncomes = incomes.filter(inc => inc.type === 'planned');
    console.log('💰 Planowane przychody (wszystkie):', plannedIncomes);
    
    let futureIncome1 = 0;
    let futureExpense1 = 0;
    let futureIncome2 = 0;
    let futureExpense2 = 0;
    
    if (date1 && date1.trim() !== '') {
        console.log('🔍 Filtrowanie dla okresu 1 (od', today, 'do', date1, ')');
        
        incomes.forEach(inc => {
            if (inc.type === 'planned' && inc.date >= today && inc.date <= date1) {
                console.log('  ✅ Dodaję przychód:', inc.amount, 'zł, data:', inc.date, 'źródło:', inc.source);
                futureIncome1 += inc.amount || 0;
            } else if (inc.type === 'planned') {
                console.log('  ❌ Pomijam przychód:', inc.amount, 'zł, data:', inc.date, 'powód: date >= today:', inc.date >= today, 'date <= date1:', inc.date <= date1);
            }
        });
        
        expenses.forEach(exp => {
            if (exp.type === 'planned' && exp.date >= today && exp.date <= date1) {
                console.log('  ✅ Dodaję wydatek:', exp.amount, 'zł, data:', exp.date);
                futureExpense1 += exp.amount || 0;
            }
        });
    }
    
    if (date2 && date2.trim() !== '') {
        console.log('🔍 Filtrowanie dla okresu 2 (od', today, 'do', date2, ')');
        
        incomes.forEach(inc => {
            if (inc.type === 'planned' && inc.date >= today && inc.date <= date2) {
                console.log('  ✅ Dodaję przychód:', inc.amount, 'zł, data:', inc.date);
                futureIncome2 += inc.amount || 0;
            }
        });
        
        expenses.forEach(exp => {
            if (exp.type === 'planned' && exp.date >= today && exp.date <= date2) {
                console.log('  ✅ Dodaję wydatek:', exp.amount, 'zł, data:', exp.date);
                futureExpense2 += exp.amount || 0;
            }
        });
    }
    
    console.log('💰 WYNIKI:');
    console.log('  Okres 1 - Przychody:', futureIncome1, 'zł');
    console.log('  Okres 1 - Wydatki:', futureExpense1, 'zł');
    console.log('  Okres 2 - Przychody:', futureIncome2, 'zł');
    console.log('  Okres 2 - Wydatki:', futureExpense2, 'zł');
    console.log('📊 === KONIEC DEBUG ===');
    
    return {
        futureIncome1,
        futureExpense1,
        futureIncome2,
        futureExpense2
    };
}

export function computeSourcesRemaining() {
    const incomes = getIncomes();
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const sourcesMap = new Map();
    
    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date <= today) {
            const src = inc.source || 'Brak źródła';
            sourcesMap.set(src, (sourcesMap.get(src) || 0) + (inc.amount || 0));
        }
    });
    
    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date <= today) {
            const src = exp.source || 'Brak źródła';
            sourcesMap.set(src, (sourcesMap.get(src) || 0) - (exp.amount || 0));
        }
    });
    
    return Array.from(sourcesMap.entries()).map(([name, amount]) => ({
        name,
        amount
    }));
}

export function checkAnomalies() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const last30 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date <= today
    );
    
    if (last30.length === 0) return [];
    
    const amounts = last30.map(e => e.amount || 0);
    const avg = amounts.reduce((a,b) => a+b, 0) / amounts.length;
    const sortedAmounts = [...amounts].sort((a,b) => a-b);
    const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
    
    const threshold = Math.max(avg * 2, median * 3);
    
    return expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        (e.amount || 0) > threshold
    );
}

export function getGlobalMedian30d() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const last30 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date <= today
    );
    
    if (last30.length === 0) return 0;
    
    const amounts = last30.map(e => e.amount || 0).sort((a,b) => a-b);
    return amounts[Math.floor(amounts.length / 2)];
}

export async function updateDailyEnvelope(forDate = null) {
    const targetDate = forDate || getWarsawDateString();
    console.log('📅 Aktualizowanie inteligentnej koperty dla daty:', targetDate);
    
    const incomes = getIncomes();
    const expenses = getExpenses();
    
    let sumIncomeBeforeToday = 0;
    let sumExpenseBeforeToday = 0;
    
    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date < targetDate) {
            sumIncomeBeforeToday += inc.amount || 0;
        }
    });
    
    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date < targetDate) {
            sumExpenseBeforeToday += exp.amount || 0;
        }
    });
    
    const availableBeforeToday = sumIncomeBeforeToday - sumExpenseBeforeToday;
    const savingGoal = getSavingGoal();
    const toSpendBeforeToday = availableBeforeToday - savingGoal;
    
    const { daysLeft1, daysLeft2, date1, date2 } = calculateSpendingPeriods();
    
    const todayIncomes = incomes.filter(inc => 
        inc.date === targetDate && inc.type === 'normal'
    );
    const todayIncomesSum = todayIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    
    const todayExpenses = expenses.filter(exp => 
        exp.date === targetDate && exp.type === 'normal'
    );
    const todayExpensesSum = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    console.log('🧠 === INTELIGENTNA KOPERTA DNIA V4 ===');
    console.log('💰 Dostępne środki PRZED dzisiejszym dniem:', availableBeforeToday.toFixed(2), 'PLN');
    console.log('🛡️ Rezerwa (cel oszczędności):', savingGoal.toFixed(2), 'PLN');
    console.log('💵 Do wydania PRZED dzisiejszym dniem:', toSpendBeforeToday.toFixed(2), 'PLN');
    console.log('📅 Dni do końca okresu 1 (włącznie z dzisiaj):', daysLeft1);
    console.log('📅 Dni do końca okresu 2 (włącznie z dzisiaj):', daysLeft2);
    console.log('📅 Data końcowa okresu 1:', date1);
    console.log('📅 Data końcowa okresu 2:', date2);
    console.log('💵 Dzisiejsze wpływy:', todayIncomesSum.toFixed(2), 'PLN');
    console.log('💸 Dzisiejsze wydatki:', todayExpensesSum.toFixed(2), 'PLN');
    
    let smartLimit = 0;
    
    if ((!date1 || date1.trim() === '' || daysLeft1 <= 0) && (!date2 || date2.trim() === '' || daysLeft2 <= 0)) {
        console.log('⚠️ Brak dni do końca okresu - ustaw datę końcową!');
        smartLimit = 0;
    } else {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        const date30str = getWarsawDateString(d30);
        
        const historicalExpenses = expenses.filter(e => 
            e.type === 'normal' && 
            e.date >= date30str && 
            e.date < targetDate
        );
        
        const totalAvailableToday = toSpendBeforeToday + todayIncomesSum;
        
        console.log('💰 Całkowite środki do wydania dziś:', totalAvailableToday.toFixed(2), 'PLN');
        
        let lowestDailyLimit = Infinity;
        
        if (date1 && date1.trim() !== '' && daysLeft1 > 0) {
            const limit1 = totalAvailableToday / daysLeft1;
            console.log('📊 Limit dzienny dla okresu 1:', limit1.toFixed(2), 'zł');
            lowestDailyLimit = Math.min(lowestDailyLimit, limit1);
        }
        
        if (date2 && date2.trim() !== '' && daysLeft2 > 0) {
            const limit2 = totalAvailableToday / daysLeft2;
            console.log('📊 Limit dzienny dla okresu 2:', limit2.toFixed(2), 'zł');
            lowestDailyLimit = Math.min(lowestDailyLimit, limit2);
        }
        
        console.log('🎯 Najniższy limit dzienny:', lowestDailyLimit.toFixed(2), 'zł');
        
        if (lowestDailyLimit === Infinity || lowestDailyLimit <= 0) {
            console.log('⚠️ Brak środków do wydania - koperta = 0');
            smartLimit = 0;
        } else if (historicalExpenses.length >= 5) {
            const amounts = historicalExpenses.map(e => e.amount || 0).sort((a,b) => a-b);
            const median = amounts[Math.floor(amounts.length / 2)];
            
            let calculatedLimit;
            if (median > lowestDailyLimit * 1.5) {
                calculatedLimit = lowestDailyLimit * 0.9;
                console.log('📊 Mediana zbyt wysoka - używam 90% najniższego limitu');
            } else if (median < lowestDailyLimit * 0.3) {
                calculatedLimit = lowestDailyLimit * 0.7;
                console.log('📊 Mediana zbyt niska - używam 70% najniższego limitu');
            } else {
                calculatedLimit = (median * 0.4 + lowestDailyLimit * 0.6);
                console.log('📊 Używam ważonej średniej: 40% mediana + 60% najniższy limit');
            }
            
            smartLimit = Math.max(0, Math.min(calculatedLimit, lowestDailyLimit, totalAvailableToday));
            
            console.log('📊 Mediana wydatków (30 dni):', median.toFixed(2), 'zł');
            console.log('📊 Obliczony limit:', calculatedLimit.toFixed(2), 'zł');
            console.log('💰 Inteligentna kwota koperty (ograniczona do najniższego limitu):', smartLimit.toFixed(2), 'zł');
        } else {
            smartLimit = Math.max(0, Math.min(lowestDailyLimit * 0.8, totalAvailableToday));
            
            console.log('⚠️ Niewystarczająca historia wydatków (< 5 transakcji)');
            console.log('📊 Najniższy limit dzienny:', lowestDailyLimit.toFixed(2), 'zł');
            console.log('📊 Używam 80% najniższego limitu (zachowawczo)');
            console.log('💰 Kwota koperty:', smartLimit.toFixed(2), 'zł');
        }
    }
    
    const existing = getDailyEnvelope();
    
    if (existing && existing.date === targetDate) {
        console.log('ℹ️ Koperta już istnieje dla tego dnia - aktualizacja');
        
        const updatedEnvelope = {
            ...existing,
            baseAmount: smartLimit,
            additionalFunds: 0,
            totalAmount: smartLimit,
            spent: todayExpensesSum
        };
        
        console.log('🔄 Aktualizacja koperty:', {
            bazowa: smartLimit.toFixed(2),
            wydano: todayExpensesSum.toFixed(2)
        });
        
        await saveDailyEnvelope(targetDate, updatedEnvelope);
        return updatedEnvelope;
    }
    
    console.log('✅ KOŃCOWA KOPERTA DNIA:', smartLimit.toFixed(2), 'zł');
    
    const envelope = {
        date: targetDate,
        baseAmount: smartLimit,
        additionalFunds: 0,
        totalAmount: smartLimit,
        spent: todayExpensesSum
    };
    
    console.log('✅ Zapisywanie inteligentnej koperty:', envelope);
    await saveDailyEnvelope(targetDate, envelope);
    
    return envelope;
}

export function getEnvelopeCalculationInfo() {
    const envelope = getDailyEnvelope();
    const { date1, date2, daysLeft1, daysLeft2 } = calculateSpendingPeriods();
    
    if (!envelope) {
        if ((!date1 || date1.trim() === '') && (!date2 || date2.trim() === '')) {
            return {
                description: 'Brak ustawionej daty końcowej okresu',
                formula: 'Ustaw datę końcową w ustawieniach'
            };
        }
        return null;
    }
    
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const incomes = getIncomes();
    let sumIncomeBeforeToday = 0;
    let sumExpenseBeforeToday = 0;
    
    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date < today) {
            sumIncomeBeforeToday += inc.amount || 0;
        }
    });
    
    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date < today) {
            sumExpenseBeforeToday += exp.amount || 0;
        }
    });
    
    const availableBeforeToday = sumIncomeBeforeToday - sumExpenseBeforeToday;
    const savingGoal = getSavingGoal();
    const toSpendBeforeToday = availableBeforeToday - savingGoal;
    
    const todayIncomes = incomes.filter(inc => 
        inc.date === today && inc.type === 'normal'
    );
    const todayIncomesSum = todayIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const historicalExpenses = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date < today
    );
    
    let description = '';
    let formula = '';
    
    if ((!date1 || date1.trim() === '' || daysLeft1 <= 0) && (!date2 || date2.trim() === '' || daysLeft2 <= 0)) {
        description = 'Brak ustawionej daty końcowej okresu';
        formula = 'Ustaw datę końcową w ustawieniach';
    } else {
        const totalAvailableToday = toSpendBeforeToday + todayIncomesSum;
        
        let lowestDailyLimit = Infinity;
        let limitSource = '';
        
        if (date1 && date1.trim() !== '' && daysLeft1 > 0) {
            const limit1 = totalAvailableToday / daysLeft1;
            if (limit1 < lowestDailyLimit) {
                lowestDailyLimit = limit1;
                limitSource = `okres 1 (${daysLeft1} dni)`;
            }
        }
        
        if (date2 && date2.trim() !== '' && daysLeft2 > 0) {
            const limit2 = totalAvailableToday / daysLeft2;
            if (limit2 < lowestDailyLimit) {
                lowestDailyLimit = limit2;
                limitSource = `okres 2 (${daysLeft2} dni)`;
            }
        }
        
        if (lowestDailyLimit === Infinity || lowestDailyLimit <= 0) {
            description = 'Brak środków do wydania';
            formula = 'Dostępne środki: 0 zł';
        } else if (historicalExpenses.length >= 5) {
            const amounts = historicalExpenses.map(e => e.amount || 0).sort((a,b) => a-b);
            const median = amounts[Math.floor(amounts.length / 2)];
            
            if (median > lowestDailyLimit * 1.5) {
                description = `Algorytm inteligentny - mediana zbyt wysoka (${historicalExpenses.length} transakcji)`;
                formula = `90% najniższego limitu (${limitSource}): ${lowestDailyLimit.toFixed(2)} zł × 0.9 = ${(lowestDailyLimit * 0.9).toFixed(2)} zł`;
            } else if (median < lowestDailyLimit * 0.3) {
                description = `Algorytm inteligentny - mediana zbyt niska (${historicalExpenses.length} transakcji)`;
                formula = `70% najniższego limitu (${limitSource}): ${lowestDailyLimit.toFixed(2)} zł × 0.7 = ${(lowestDailyLimit * 0.7).toFixed(2)} zł`;
            } else {
                description = `Algorytm inteligentny (${historicalExpenses.length} transakcji z 30 dni)`;
                formula = `40% mediany ${median.toFixed(2)} zł + 60% najniższego limitu (${limitSource}) ${lowestDailyLimit.toFixed(2)} zł, max ${lowestDailyLimit.toFixed(2)} zł`;
            }
        } else {
            description = `Algorytm zachowawczy (za mało historii: ${historicalExpenses.length}/5 transakcji)`;
            formula = `80% najniższego limitu (${limitSource}): ${lowestDailyLimit.toFixed(2)} zł × 0.8 = ${(lowestDailyLimit * 0.8).toFixed(2)} zł`;
        }
    }
    
    return {
        description,
        formula
    };
}

export function calculateSpendingGauge() {
    const envelope = getDailyEnvelope();
    
    if (!envelope) {
        return {
            spent: 0,
            total: 0,
            percentage: 0,
            remaining: 0
        };
    }
    
    const spent = envelope.spent || 0;
    const total = envelope.totalAmount || 0;
    const percentage = total > 0 ? (spent / total) * 100 : 0;
    const remaining = Math.max(0, total - spent);
    
    return {
        spent,
        total,
        percentage: Math.min(100, percentage),
        remaining
    };
}

export function getTopCategories(limit = 5) {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const last30 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date <= today
    );
    
    const catMap = new Map();
    
    last30.forEach(exp => {
        const cat = exp.category || 'Bez kategorii';
        catMap.set(cat, (catMap.get(cat) || 0) + (exp.amount || 0));
    });
    
    return Array.from(catMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
}

export function getTopDescriptionsForCategory(categoryName, limit = 3) {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const catExpenses = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date <= today &&
        e.category === categoryName
    );
    
    const descMap = new Map();
    
    catExpenses.forEach(exp => {
        const desc = exp.description || 'Brak opisu';
        descMap.set(desc, (descMap.get(desc) || 0) + (exp.amount || 0));
    });
    
    return Array.from(descMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
}

export function getTopSources(limit = 5) {
  const incomes = getIncomes();
  const today = getWarsawDateString();
  
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const date30str = getWarsawDateString(d30);
  
  const last30 = incomes.filter(i => 
    i.type === 'normal' && 
    i.date >= date30str && 
    i.date <= today
  );
  
  const srcMap = new Map();
  
  last30.forEach(inc => {
    const src = inc.source || 'Bez źródła';
    srcMap.set(src, (srcMap.get(src) || 0) + (inc.amount || 0));
  });
  
  return Array.from(srcMap.entries())
    .map(([name, amount]) => name)
    .sort((a, b) => {
      const aAmount = srcMap.get(a);
      const bAmount = srcMap.get(b);
      return bAmount - aAmount;
    })
    .slice(0, limit);
}

export function computeComparisons() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const date7str = getWarsawDateString(d7);
    
    const d14 = new Date();
    d14.setDate(d14.getDate() - 14);
    const date14str = getWarsawDateString(d14);
    
    const last7 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date7str && 
        e.date <= today
    );
    
    const prev7 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date14str && 
        e.date < date7str
    );
    
    const sum7 = last7.reduce((sum, e) => sum + (e.amount || 0), 0);
    const sum14 = prev7.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const avg7 = last7.length > 0 ? sum7 / last7.length : 0;
    const avg14 = prev7.length > 0 ? sum14 / prev7.length : 0;
    
    return {
        last7Days: sum7,
        prev7Days: sum14,
        avgLast7: avg7,
        avgPrev7: avg14,
        change: sum14 > 0 ? ((sum7 - sum14) / sum14) * 100 : 0
    };
}

export function calculateSpendingDynamics() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    const { daysLeft1, daysLeft2, date1, date2 } = calculateSpendingPeriods();
    const { available, savingGoal } = calculateAvailableFunds();
    const toSpend = available - savingGoal;
    
    if ((!date1 || date1.trim() === '' || daysLeft1 <= 0) && (!date2 || date2.trim() === '' || daysLeft2 <= 0)) {
        return {
            status: 'no-date',
            title: '⚠️ Brak ustawionej daty końcowej',
            summary: 'Aby zobaczyć analizę dynamiki wydatków, ustaw datę końcową okresu w ustawieniach.',
            details: [],
            recommendation: 'Przejdź do ustawień i ustaw datę końcową okresu głównego.'
        };
    }
    
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const date7str = getWarsawDateString(d7);
    
    const last7 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date7str && 
        e.date <= today
    );
    
    if (last7.length === 0) {
        let targetDaily = 0;
        if (daysLeft1 > 0) {
            targetDaily = toSpend / daysLeft1;
        } else if (daysLeft2 > 0) {
            targetDaily = toSpend / daysLeft2;
        }
        
        return {
            status: 'excellent',
            title: '🎉 Doskonała sytuacja!',
            summary: 'W ostatnich 7 dniach nie było żadnych wydatków. Twój budżet jest w świetnym stanie.',
            details: [
                `Dostępne środki: ${toSpend.toFixed(2)} zł`,
                `Dni do końca okresu: ${daysLeft1 > 0 ? daysLeft1 : daysLeft2}`,
                `Teoretyczny dzienny limit: ${targetDaily.toFixed(2)} zł`
            ],
            recommendation: 'Kontynuuj tak dalej! Możesz pozwolić sobie na większe wydatki, jeśli zajdzie taka potrzeba.'
        };
    }
    
    const sum7 = last7.reduce((sum, e) => sum + (e.amount || 0), 0);
    const dailyAvg7 = sum7 / 7;
    
    let targetDaily = 0;
    let activeDays = 0;
    
    if (daysLeft1 > 0) {
        targetDaily = toSpend / daysLeft1;
        activeDays = daysLeft1;
    } else if (daysLeft2 > 0) {
        targetDaily = toSpend / daysLeft2;
        activeDays = daysLeft2;
    }
    
    if (targetDaily <= 0) {
        return {
            status: 'critical',
            title: '🚨 Sytuacja krytyczna!',
            summary: 'Przekroczyłeś dostępny budżet. Środki do wydania są ujemne.',
            details: [
                `Dostępne środki: ${toSpend.toFixed(2)} zł`,
                `Średnie dzienne wydatki (7 dni): ${dailyAvg7.toFixed(2)} zł`,
                `Dni do końca okresu: ${activeDays}`
            ],
            recommendation: 'Natychmiast ogranicz wydatki lub rozważ zwiększenie przychodów. Skonsultuj swój budżet i priorytetyzuj tylko niezbędne wydatki.'
        };
    }
    
    const ratio = dailyAvg7 / targetDaily;
    const percentageOfLimit = (ratio * 100).toFixed(0);
    
    let status, title, summary, recommendation;
    
    if (ratio <= 0.5) {
        status = 'excellent';
        title = '🌟 Doskonała kontrola wydatków!';
        summary = `Twoje średnie dzienne wydatki (${dailyAvg7.toFixed(2)} zł) stanowią zaledwie ${percentageOfLimit}% dziennego limitu. Budżet jest w bardzo dobrej kondycji.`;
        recommendation = 'Świetna robota! Masz dużo przestrzeni w budżecie. Możesz kontynuować obecny styl życia lub rozważyć zwiększenie oszczędności.';
    } else if (ratio <= 0.8) {
        status = 'good';
        title = '✅ Dobra sytuacja budżetowa';
        summary = `Wydajesz średnio ${dailyAvg7.toFixed(2)} zł dziennie, co stanowi ${percentageOfLimit}% dziennego limitu (${targetDaily.toFixed(2)} zł). Trzymasz się budżetu.`;
        recommendation = 'Dobrze Ci idzie! Kontynuuj obecne tempo wydatków, ale uważaj na większe zakupy.';
    } else if (ratio <= 1.0) {
        status = 'moderate';
        title = '⚡ Wydatki zbliżone do limitu';
        summary = `Średnie dzienne wydatki (${dailyAvg7.toFixed(2)} zł) zbliżają się do limitu (${targetDaily.toFixed(2)} zł). Stanowią ${percentageOfLimit}% dostępnego budżetu dziennego.`;
        recommendation = 'Sytuacja jest pod kontrolą, ale nie masz dużego marginesu błędu. Uważaj na spontaniczne zakupy i monitoruj wydatki częściej.';
    } else if (ratio <= 1.3) {
        status = 'warning';
        title = '⚠️ Przekraczasz dzienny limit!';
        summary = `Uwaga! Wydajesz średnio ${dailyAvg7.toFixed(2)} zł dziennie, czyli ${percentageOfLimit}% dziennego limitu (${targetDaily.toFixed(2)} zł). To ${(dailyAvg7 - targetDaily).toFixed(2)} zł ponad limit!`;
        recommendation = 'Czas na większą ostrożność! Ogranicz niepotrzebne wydatki i skup się na priorytetach. Jeśli tak dalej pójdzie, możesz nie zmieścić się w budżecie do końca okresu.';
    } else {
        status = 'critical';
        title = '🚨 Znaczne przekroczenie limitu!';
        summary = `Alarm! Średnie wydatki dzienne (${dailyAvg7.toFixed(2)} zł) przekraczają limit (${targetDaily.toFixed(2)} zł) o ${((ratio - 1) * 100).toFixed(0)}%! To ${(dailyAvg7 - targetDaily).toFixed(2)} zł dziennie ponad budżet.`;
        recommendation = 'Sytuacja wymaga natychmiastowej reakcji! Wstrzymaj wszystkie niepotrzebne wydatki. Przeanalizuj ostatnie zakupy i zidentyfikuj, co można było ograniczyć. Rozważ przesunięcie planowanych wydatków na później.';
    }
    
    const details = [
        `Dostępne środki do wydania: ${toSpend.toFixed(2)} zł`,
        `Dni do końca okresu: ${activeDays}`,
        `Dzienny limit budżetowy: ${targetDaily.toFixed(2)} zł`,
        `Średnie wydatki dzienne (7 dni): ${dailyAvg7.toFixed(2)} zł`,
        `Liczba transakcji (7 dni): ${last7.length}`,
        `Prognozowane wydatki do końca okresu: ${(dailyAvg7 * activeDays).toFixed(2)} zł`
    ];
    
    return {
        status,
        title,
        summary,
        details,
        recommendation
    };
}

export function getWeekDateRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);
    
    return {
        start: weekStart.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }),
        end: today.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
    };
}

export function getMonthName() {
    const today = new Date();
    return today.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}