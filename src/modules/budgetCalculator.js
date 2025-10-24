// src/modules/budgetCalculator.js - Kalkulator budżetu z poprawionym algorytmem koperty dnia
import { parseDateStr, getWarsawDateString, getCurrentTimeString, isRealised } from '../utils/dateHelpers.js';
import { getIncomes, getExpenses, getEndDates, getSavingGoal, getDailyEnvelope, saveDailyEnvelope } from './dataManager.js';

/**
 * Oblicz zrealizowane sumy (type === 'normal', WŁĄCZNIE z dzisiejszymi transakcjami)
 */
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

    // Przychody (type === 'normal', do dziś WŁĄCZNIE)
    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date <= today) {
            sumIncome += inc.amount || 0;
        }
    });

    // Wydatki (type === 'normal', do dziś WŁĄCZNIE)
    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date <= today) {
            sumExpense += exp.amount || 0;
        }
    });

    console.log('📊 SUMA przychodów (zrealizowane, do dziś włącznie):', sumIncome);
    console.log('📊 SUMA wydatków (zrealizowane, do dziś włącznie):', sumExpense);

    return { sumIncome, sumExpense };
}

/**
 * Oblicz wydatki dzisiaj
 */
export function getTodayExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    return expenses
        .filter(e => e.type === 'normal' && e.date === today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
}

/**
 * Oblicz wydatki w tym tygodniu
 */
export function getWeekExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    // Początek tygodnia (poniedziałek)
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

/**
 * Oblicz wydatki w tym miesiącu
 */
export function getMonthExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    // Początek miesiąca
    const todayDate = new Date(today);
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const monthStartStr = getWarsawDateString(monthStart);
    
    return expenses
        .filter(e => e.type === 'normal' && e.date >= monthStartStr && e.date <= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
}

/**
 * Oblicz okresy wydatkowe
 */
export function calculateSpendingPeriods() {
    const endDates = getEndDates();
    const date1 = endDates.primary || endDates.date1 || '';
    const date2 = endDates.secondary || endDates.date2 || '';
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
    
    return { date1, date2, daysLeft1, daysLeft2 };
}

/**
 * Oblicz dostępne środki (bez limitów dziennych)
 */
export function calculateAvailableFunds() {
    const { sumIncome, sumExpense } = calculateRealisedTotals();
    const available = sumIncome - sumExpense;
    const savingGoal = getSavingGoal();
    
    return {
        available,
        savingGoal
    };
}

/**
 * Oblicz bieżące limity (bez planowanych transakcji)
 */
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

/**
 * Oblicz prognozy limitów (z planowanymi transakcjami)
 */
export function calculateForecastLimits() {
    const { sumIncome, sumExpense } = calculateRealisedTotals();
    const incomes = getIncomes();
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    let futureIncome = 0;
    let futureExpense = 0;
    
    // Planowane przychody (type === 'planned' ORAZ dziś i w przyszłości)
    incomes.forEach(inc => {
        if (inc.type === 'planned' && inc.date >= today) {
            futureIncome += inc.amount || 0;
        }
    });
    
    // Planowane wydatki (type === 'planned' ORAZ dziś i w przyszłości)
    expenses.forEach(exp => {
        if (exp.type === 'planned' && exp.date >= today) {
            futureExpense += exp.amount || 0;
        }
    });
    
    const projectedAvailable = (sumIncome + futureIncome) - (sumExpense + futureExpense);
    const savingGoal = getSavingGoal();
    const projectedToSpend = projectedAvailable - savingGoal;
    
    const { daysLeft1, daysLeft2 } = calculateSpendingPeriods();
    
    const projectedLimit1 = daysLeft1 > 0 ? projectedToSpend / daysLeft1 : 0;
    const projectedLimit2 = daysLeft2 > 0 ? projectedToSpend / daysLeft2 : 0;
    
    return {
        projectedAvailable,
        projectedLimit1,
        projectedLimit2,
        futureIncome,
        futureExpense
    };
}

/**
 * Oblicz pozostałe środki z poszczególnych źródeł
 */
export function computeSourcesRemaining() {
    const incomes = getIncomes();
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const sourcesMap = new Map();
    
    // Sumuj przychody według źródeł (type === 'normal')
    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date <= today) {
            const src = inc.source || 'Brak źródła';
            sourcesMap.set(src, (sourcesMap.get(src) || 0) + (inc.amount || 0));
        }
    });
    
    // Odejmij wydatki według źródeł (type === 'normal')
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

/**
 * Wykryj anomalie w wydatkach
 */
export function checkAnomalies() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    // Ostatnie 30 dni
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

/**
 * Oblicz medianę wydatków z ostatnich 30 dni
 */
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

/**
 * INTELIGENTNA KOPERTA DNIA - Główny algorytm (POPRAWIONY)
 */
export async function updateDailyEnvelope(forDate = null) {
    const targetDate = forDate || getWarsawDateString();
    console.log('📅 Aktualizowanie inteligentnej koperty dla daty:', targetDate);
    
    const { sumIncome, sumExpense } = calculateRealisedTotals(targetDate);
    const available = sumIncome - sumExpense;
    const savingGoal = getSavingGoal();
    const toSpend = available - savingGoal;
    
    const { daysLeft1, date1 } = calculateSpendingPeriods();
    
    // Pobierz dzisiejsze wpływy (type === 'normal' na dziś)
    const incomes = getIncomes();
    const todayIncomes = incomes.filter(inc => 
        inc.date === targetDate && inc.type === 'normal'
    );
    const todayIncomesSum = todayIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    
    // Pobierz dzisiejsze wydatki
    const expenses = getExpenses();
    const todayExpenses = expenses.filter(exp => 
        exp.date === targetDate && exp.type === 'normal'
    );
    const todayExpensesSum = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    console.log('🧠 === INTELIGENTNA KOPERTA DNIA ===');
    console.log('💰 Dostępne środki:', available.toFixed(2), 'PLN');
    console.log('🛡️ Rezerwa (cel oszczędności):', savingGoal.toFixed(2), 'PLN');
    console.log('💵 Do wydania:', toSpend.toFixed(2), 'PLN');
    console.log('📅 Dni do końca okresu:', daysLeft1);
    console.log('📅 Data końcowa okresu:', date1);
    console.log('💸 Dzisiejsze wydatki:', todayExpensesSum.toFixed(2), 'PLN');
    
    let smartLimit = 0;
    
    if (!date1 || date1.trim() === '' || daysLeft1 <= 0) {
        console.log('⚠️ Brak dni do końca okresu - ustaw datę końcową!');
        smartLimit = 0;
    } else {
        // POPRAWIONY INTELIGENTNY ALGORYTM
        
        // Historia wydatków z ostatnich 30 dni (WŁĄCZNIE z dzisiejszymi)
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        const date30str = getWarsawDateString(d30);
        
        const historicalExpenses = expenses.filter(e => 
            e.type === 'normal' && 
            e.date >= date30str && 
            e.date <= targetDate
        );
        
        if (historicalExpenses.length >= 5) {
            // MAMY HISTORIĘ - Używamy mediany
            const amounts = historicalExpenses.map(e => e.amount || 0).sort((a,b) => a-b);
            const median = amounts[Math.floor(amounts.length / 2)];
            
            // Prosty limit (równy podział) - ALE NIE WIĘCEJ NIŻ DOSTĘPNE ŚRODKI
            const simpleLimit = Math.min(toSpend / daysLeft1, toSpend);
            
            // Średnia ważona: 60% mediany, 40% prostego limitu
            // ALE ZAWSZE OGRANICZONA DO DOSTĘPNYCH ŚRODKÓW
            const calculatedLimit = (median * 0.6) + (simpleLimit * 0.4);
            smartLimit = Math.min(calculatedLimit, toSpend);
            
            console.log('📊 Mediana wydatków (30 dni):', median.toFixed(2), 'zł');
            console.log('📊 Prosty limit:', simpleLimit.toFixed(2), 'zł');
            console.log('📊 Obliczony limit:', calculatedLimit.toFixed(2), 'zł');
            console.log('💰 Inteligentna bazowa kwota koperty (ograniczona do dostępnych):', smartLimit.toFixed(2), 'zł');
        } else {
            // BRAK HISTORII - Zachowawcze podejście
            // Używamy 70% dostępnych środków podzielonych na dni
            // ALE NIE WIĘCEJ NIŻ FAKTYCZNIE DOSTĘPNE
            const calculatedLimit = (toSpend * 0.7) / daysLeft1;
            smartLimit = Math.min(calculatedLimit, toSpend);
            
            console.log('⚠️ Niewystarczająca historia wydatków (< 5 transakcji)');
            console.log('📊 Obliczony limit:', calculatedLimit.toFixed(2), 'zł');
            console.log('💰 Inteligentna bazowa kwota koperty (zachowawcza, ograniczona):', smartLimit.toFixed(2), 'zł');
        }
        
        // DODATKOWE ZABEZPIECZENIE - jeśli zostało mniej niż 3 dni, bierz maksymalnie 1/3 dostępnych środków na dzień
        if (daysLeft1 > 0 && daysLeft1 <= 3) {
            const emergencyLimit = toSpend / 3;
            if (smartLimit > emergencyLimit) {
                console.log('🚨 Włączono tryb awaryjny (≤3 dni) - ograniczenie do 1/3 dostępnych środków');
                smartLimit = emergencyLimit;
            }
        }
    }
    
    // Sprawdź czy istnieje już koperta na ten dzień
    const existing = getDailyEnvelope();
    
    if (existing && existing.date === targetDate) {
        console.log('ℹ️ Koperta już istnieje dla tego dnia');
        
        // Aktualizuj bazową kwotę i wydatki
        const updatedEnvelope = {
            ...existing,
            baseAmount: smartLimit,
            additionalFunds: todayIncomesSum,
            totalAmount: smartLimit + todayIncomesSum,
            spent: todayExpensesSum
        };
        
        console.log('🔄 Aktualizacja koperty:', {
            bazowa: smartLimit.toFixed(2),
            dodatkowe: todayIncomesSum.toFixed(2),
            wydano: todayExpensesSum.toFixed(2),
            razem: updatedEnvelope.totalAmount.toFixed(2)
        });
        
        await saveDailyEnvelope(targetDate, updatedEnvelope);
        return updatedEnvelope;
    }
    
    // Utwórz nową kopertę
    const totalEnvelope = smartLimit + todayIncomesSum;
    console.log('💵 Dodatkowe środki z dzisiejszych wpływów:', todayIncomesSum.toFixed(2), 'zł');
    console.log('💸 Dzisiejsze wydatki:', todayExpensesSum.toFixed(2), 'zł');
    console.log('✅ KOŃCOWA KOPERTA DNIA:', totalEnvelope.toFixed(2), 'zł');
    
    const envelope = {
        date: targetDate,
        baseAmount: smartLimit,
        additionalFunds: todayIncomesSum,
        totalAmount: totalEnvelope,
        spent: todayExpensesSum
    };
    
    console.log('✅ Zapisywanie inteligentnej koperty:', envelope);
    await saveDailyEnvelope(targetDate, envelope);
    
    return envelope;
}

/**
 * Pobierz informacje o wyliczeniu koperty (dla UI)
 */
export function getEnvelopeCalculationInfo() {
    const envelope = getDailyEnvelope();
    const { date1, daysLeft1 } = calculateSpendingPeriods();
    
    if (!envelope) {
        if (!date1 || date1.trim() === '') {
            return {
                description: 'Brak ustawionej daty końcowej okresu',
                formula: 'Ustaw datę końcową w ustawieniach'
            };
        }
        return null;
    }
    
    const { sumIncome, sumExpense } = calculateRealisedTotals();
    const available = sumIncome - sumExpense;
    const savingGoal = getSavingGoal();
    const toSpend = available - savingGoal;
    
    const expenses = getExpenses();
    const today = getWarsawDateString();
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const historicalExpenses = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date <= today
    );
    
    let description = '';
    let formula = '';
    
    if (!date1 || date1.trim() === '' || daysLeft1 <= 0) {
        description = 'Brak ustawionej daty końcowej okresu';
        formula = 'Ustaw datę końcową w ustawieniach';
    } else if (historicalExpenses.length >= 5) {
        const amounts = historicalExpenses.map(e => e.amount || 0).sort((a,b) => a-b);
        const median = amounts[Math.floor(amounts.length / 2)];
        const simpleLimit = Math.min(toSpend / daysLeft1, toSpend);
        
        description = `Algorytm inteligentny (historia ${historicalExpenses.length} transakcji z 30 dni)`;
        formula = `Mediana (${median.toFixed(2)} zł) × 60% + Limit prosty (${simpleLimit.toFixed(2)} zł) × 40% + Dzisiejsze wpływy (${envelope.additionalFunds.toFixed(2)} zł) [Ograniczono do dostępnych: ${toSpend.toFixed(2)} zł]`;
    } else {
        const conservativeBase = Math.min((toSpend * 0.7) / daysLeft1, toSpend);
        
        description = `Algorytm zachowawczy (za mało historii: ${historicalExpenses.length}/5 transakcji)`;
        formula = `70% środków (${conservativeBase.toFixed(2)} zł) ÷ ${daysLeft1} dni + Dzisiejsze wpływy (${envelope.additionalFunds.toFixed(2)} zł) [Ograniczono do dostępnych: ${toSpend.toFixed(2)} zł]`;
    }
    
    return {
        description,
        formula
    };
}

/**
 * Oblicz wskaźnik wydatków (gauge)
 */
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

/**
 * Pobierz top kategorie
 */
export function getTopCategories(limit = 5) {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    // Ostatnie 30 dni
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

/**
 * Pobierz top opisy dla kategorii
 */
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

/**
 * Pobierz top źródła przychodów
 */
export function getTopSources(limit = 5) {
  const incomes = getIncomes();
  const today = getWarsawDateString();
  
  // Ostatnie 30 dni
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

/**
 * Oblicz porównania tygodniowe
 */
export function computeComparisons() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    // Ostatnie 7 dni
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const date7str = getWarsawDateString(d7);
    
    // Poprzednie 7 dni
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

/**
 * Oblicz dynamikę wydatków - OPISOWA WERSJA
 */
export function calculateSpendingDynamics() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    const { daysLeft1, date1 } = calculateSpendingPeriods();
    const { available, savingGoal } = calculateAvailableFunds();
    const toSpend = available - savingGoal;
    
    if (!date1 || date1.trim() === '' || daysLeft1 <= 0) {
        return {
            status: 'no-date',
            title: '⚠️ Brak ustawionej daty końcowej',
            summary: 'Aby zobaczyć analizę dynamiki wydatków, ustaw datę końcową okresu w ustawieniach.',
            details: [],
            recommendation: 'Przejdź do ustawień i ustaw datę końcową okresu głównego.'
        };
    }
    
    // Ostatnie 7 dni
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const date7str = getWarsawDateString(d7);
    
    const last7 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date7str && 
        e.date <= today
    );
    
    if (last7.length === 0) {
        return {
            status: 'excellent',
            title: '🎉 Doskonała sytuacja!',
            summary: 'W ostatnich 7 dniach nie było żadnych wydatków. Twój budżet jest w świetnym stanie.',
            details: [
                `Dostępne środki: ${toSpend.toFixed(2)} zł`,
                `Dni do końca okresu: ${daysLeft1}`,
                `Teoretyczny dzienny limit: ${(toSpend / daysLeft1).toFixed(2)} zł`
            ],
            recommendation: 'Kontynuuj tak dalej! Możesz pozwolić sobie na większe wydatki, jeśli zajdzie taka potrzeba.'
        };
    }
    
    const sum7 = last7.reduce((sum, e) => sum + (e.amount || 0), 0);
    const dailyAvg7 = sum7 / 7;
    const targetDaily = toSpend / daysLeft1;
    
    if (targetDaily <= 0) {
        return {
            status: 'critical',
            title: '🚨 Sytuacja krytyczna!',
            summary: 'Przekroczyłeś dostępny budżet. Środki do wydania są ujemne.',
            details: [
                `Dostępne środki: ${toSpend.toFixed(2)} zł`,
                `Średnie dzienne wydatki (7 dni): ${dailyAvg7.toFixed(2)} zł`,
                `Dni do końca okresu: ${daysLeft1}`
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
        `Dni do końca okresu: ${daysLeft1}`,
        `Dzienny limit budżetowy: ${targetDaily.toFixed(2)} zł`,
        `Średnie wydatki dzienne (7 dni): ${dailyAvg7.toFixed(2)} zł`,
        `Liczba transakcji (7 dni): ${last7.length}`,
        `Prognozowane wydatki do końca okresu: ${(dailyAvg7 * daysLeft1).toFixed(2)} zł`
    ];
    
    return {
        status,
        title,
        summary,
        details,
        recommendation
    };
}