// src/modules/budgetCalculator.js - Kalkulator budżetu z getEnvelopeCalculationInfo + dynamika + limity bieżące
import { parseDateStr, getWarsawDateString, isRealised } from '../utils/dateHelpers.js';
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
 * Oblicz okresy wydatkowe
 */
export function calculateSpendingPeriods() {
    const endDates = getEndDates();
    const date1 = endDates.primary || endDates.date1 || '';
    const date2 = endDates.secondary || endDates.date2 || '';
    const today = getWarsawDateString();
    
    let daysLeft1 = 0;
    let daysLeft2 = 0;
    
    if (date1) {
        const d1 = parseDateStr(date1);
        const td = parseDateStr(today);
        if (d1 && td) {
            daysLeft1 = Math.max(0, Math.floor((d1 - td) / (1000*60*60*24)));
        }
    }
    
    if (date2) {
        const d2 = parseDateStr(date2);
        const td = parseDateStr(today);
        if (d2 && td) {
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
    const toSpend = available - savingGoal;
    
    return {
        available,
        savingGoal,
        toSpend
    };
}

/**
 * Oblicz bieżące limity (bez planowanych transakcji)
 */
export function calculateCurrentLimits() {
    const { available, savingGoal, toSpend } = calculateAvailableFunds();
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
 * INTELIGENTNA KOPERTA DNIA - Główny algorytm
 */
export async function updateDailyEnvelope(forDate = null) {
    const targetDate = forDate || getWarsawDateString();
    console.log('📅 Aktualizowanie inteligentnej koperty dla daty:', targetDate);
    
    const { sumIncome, sumExpense } = calculateRealisedTotals(targetDate);
    const available = sumIncome - sumExpense;
    const savingGoal = getSavingGoal();
    const toSpend = available - savingGoal;
    
    const { daysLeft1 } = calculateSpendingPeriods();
    
    // Pobierz dzisiejsze wpływy (type === 'normal' na dziś)
    const incomes = getIncomes();
    const todayIncomes = incomes.filter(inc => 
        inc.date === targetDate && inc.type === 'normal'
    );
    const todayIncomesSum = todayIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    
    console.log('🧠 === INTELIGENTNA KOPERTA DNIA ===');
    console.log('💰 Dostępne środki:', available.toFixed(2), 'PLN');
    console.log('🛡️ Rezerwa (cel oszczędności):', savingGoal.toFixed(2), 'PLN');
    console.log('💵 Do wydania:', toSpend.toFixed(2), 'PLN');
    console.log('📅 Dni do końca okresu:', daysLeft1);
    
    let smartLimit = 0;
    
    if (daysLeft1 <= 0) {
        console.log(' ⚠️ Brak dni do końca okresu - ustaw datę końcową!');
        smartLimit = 0;
    } else {
        // INTELIGENTNY ALGORYTM
        const expenses = getExpenses();
        
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
            
            // Prosty limit (równy podział)
            const simpleLimit = toSpend / daysLeft1;
            
            // Średnia ważona: 60% mediany, 40% prostego limitu
            smartLimit = (median * 0.6) + (simpleLimit * 0.4);
            
            console.log('📊 Mediana wydatków (30 dni):', median.toFixed(2), 'zł');
            console.log('📊 Prosty limit:', simpleLimit.toFixed(2), 'zł');
            console.log('💰 Inteligentna bazowa kwota koperty:', smartLimit.toFixed(2), 'zł');
        } else {
            // BRAK HISTORII - Zachowawcze podejście
            // Używamy 70% dostępnych środków podzielonych na dni
            smartLimit = (toSpend * 0.7) / daysLeft1;
            
            console.log('⚠️ Niewystarczająca historia wydatków (< 5 transakcji)');
            console.log('💰 Inteligentna bazowa kwota koperty (zachowawcza):', smartLimit.toFixed(2), 'zł');
        }
    }
    
    // Dodaj dzisiejsze wpływy
    const totalEnvelope = smartLimit + todayIncomesSum;
    console.log('💵 Dodatkowe środki z dzisiejszych wpływów:', todayIncomesSum.toFixed(2), 'zł');
    console.log('✅ KOŃCOWA KOPERTA DNIA:', totalEnvelope.toFixed(2), 'zł');
    
    // Sprawdź czy koperta już istnieje dla tego dnia
    const existing = getDailyEnvelope();
    
    if (existing && existing.date === targetDate) {
        console.log('ℹ️ Koperta już istnieje dla tego dnia');
        
        // Aktualizuj tylko jeśli zmieniły się dodatkowe środki
        if (existing.additionalFunds !== todayIncomesSum) {
            console.log('🔄 Aktualizowanie dodatkowych środków:', todayIncomesSum);
            await saveDailyEnvelope(targetDate, {
                ...existing,
                additionalFunds: todayIncomesSum,
                totalAmount: existing.baseAmount + todayIncomesSum
            });
        }
        return existing;
    }
    
    // Zapisz nową kopertę
    const envelope = {
        date: targetDate,
        baseAmount: smartLimit,
        additionalFunds: todayIncomesSum,
        totalAmount: totalEnvelope,
        spent: 0
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
    if (!envelope) return null;
    
    const { sumIncome, sumExpense } = calculateRealisedTotals();
    const available = sumIncome - sumExpense;
    const savingGoal = getSavingGoal();
    const toSpend = available - savingGoal;
    const { daysLeft1 } = calculateSpendingPeriods();
    
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
    
    if (daysLeft1 <= 0) {
        description = 'Brak ustawionej daty końcowej okresu';
        formula = 'Ustaw datę końcową w ustawieniach';
    } else if (historicalExpenses.length >= 5) {
        const amounts = historicalExpenses.map(e => e.amount || 0).sort((a,b) => a-b);
        const median = amounts[Math.floor(amounts.length / 2)];
        const simpleLimit = toSpend / daysLeft1;
        
        description = `Algorytm inteligentny (historia ${historicalExpenses.length} transakcji z 30 dni)`;
        formula = `Mediana (${median.toFixed(2)} zł) × 60% + Limit prosty (${simpleLimit.toFixed(2)} zł) × 40% + Dzisiejsze wpływy (${envelope.additionalFunds.toFixed(2)} zł)`;
    } else {
        const conservativeBase = (toSpend * 0.7) / daysLeft1;
        
        description = `Algorytm zachowawczy (za mało historii: ${historicalExpenses.length}/5 transakcji)`;
        formula = `70% środków (${conservativeBase.toFixed(2)} zł) ÷ ${daysLeft1} dni + Dzisiejsze wpływy (${envelope.additionalFunds.toFixed(2)} zł)`;
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
 * Oblicz dynamikę wydatków (wskaźnik od 0 do 100)
 * 0 = bardzo stabilna sytuacja (zielony)
 * 50 = umiarkowana (niebieski)
 * 100 = niestabilna, szybkie wydawanie (czerwony)
 */
export function calculateSpendingDynamics() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    const { daysLeft1 } = calculateSpendingPeriods();
    
    if (daysLeft1 <= 0) {
        return {
            score: 50,
            status: 'neutral',
            message: 'Brak ustawionej daty końcowej okresu'
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
            score: 0,
            status: 'safe',
            message: 'Brak wydatków w ostatnich 7 dniach - świetnie!'
        };
    }
    
    const sum7 = last7.reduce((sum, e) => sum + (e.amount || 0), 0);
    const dailyAvg7 = sum7 / 7;
    
    // Oblicz jaki powinien być dzienny limit
    const { toSpend } = calculateAvailableFunds();
    const targetDaily = toSpend / daysLeft1;
    
    if (targetDaily <= 0) {
        return {
            score: 100,
            status: 'critical',
            message: 'Przekroczono dostępne środki!'
        };
    }
    
    // Oblicz wskaźnik jako stosunek rzeczywistych wydatków do targetu
    const ratio = dailyAvg7 / targetDaily;
    
    let score = 0;
    let status = 'safe';
    let message = '';
    
    if (ratio <= 0.5) {
        score = 0;
        status = 'safe';
        message = 'Bardzo dobra sytuacja - wydajesz poniżej 50% limitu';
    } else if (ratio <= 0.8) {
        score = 25;
        status = 'good';
        message = 'Dobra sytuacja - wydajesz poniżej 80% limitu';
    } else if (ratio <= 1.0) {
        score = 50;
        status = 'moderate';
        message = 'Umiarkowana sytuacja - wydatki zbliżone do limitu';
    } else if (ratio <= 1.3) {
        score = 75;
        status = 'warning';
        message = 'Uwaga - wydajesz powyżej limitu!';
    } else {
        score = 100;
        status = 'critical';
        message = 'Krytyczna sytuacja - znaczne przekroczenie limitu!';
    }
    
    return {
        score: Math.min(100, Math.max(0, score)),
        status,
        message,
        dailyAvg: dailyAvg7,
        targetDaily,
        ratio
    };
}
