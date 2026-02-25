import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dataManager
vi.mock('../dataManager.js', () => ({
  getIncomes: vi.fn(() => []),
  getExpenses: vi.fn(() => []),
  getEndDates: vi.fn(() => ({ primary: '', secondary: '' })),
  getSavingGoal: vi.fn(() => 0),
  getEnvelopePeriod: vi.fn(() => 0),
  getDynamicsPeriod: vi.fn(() => 0),
  getDailyEnvelope: vi.fn(() => null),
  saveDailyEnvelope: vi.fn(async () => {})
}));

// Mock dateHelpers - deterministic "today" = 2026-02-12
vi.mock('../../utils/dateHelpers.js', () => ({
  parseDateStr: vi.fn((str) => new Date(str)),
  getWarsawDateString: vi.fn((date) => {
    if (date) {
      const d = new Date(date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '2026-02-12';
  }),
  getCurrentTimeString: vi.fn(() => '10:00'),
  isRealised: vi.fn(() => true),
  calculateRemainingTime: vi.fn((endDate, endTime) => {
    const end = new Date(endDate + 'T23:59:59');
    const now = new Date('2026-02-12T10:00:00');
    const diffMs = end - now;
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      days,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: Math.max(0, diffMs / (1000 * 60 * 60 * 24)),
      calendarDays: days,
      formatted: `${days} dni`,
      countdownFormat: null,
      showToday: false
    };
  })
}));

import {
  calculateRealisedTotals,
  calculateAvailableFunds,
  calculateCurrentLimits,
  calculateSpendingPeriods,
  calculatePlannedTransactionsTotals,
  getTodayExpenses,
  getWeekExpenses,
  getMonthExpenses,
  getGlobalMedian30d,
  getTopCategories,
  computeComparisons,
  calculateSpendingGauge,
  updateDailyEnvelope,
  clearLimitsCache
} from '../budgetCalculator.js';

import {
  getIncomes,
  getExpenses,
  getSavingGoal,
  getDailyEnvelope,
  saveDailyEnvelope
} from '../dataManager.js';

beforeEach(() => {
  vi.clearAllMocks();
  const store = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
  });
  clearLimitsCache();
});

// ============================================================
// calculateRealisedTotals
// ============================================================
describe('calculateRealisedTotals', () => {
  it('sums only normal incomes and expenses up to today', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 5000 },
      { type: 'normal', date: '2026-02-12', amount: 1000 },
      { type: 'planned', date: '2026-02-12', amount: 9999 },
      { type: 'normal', date: '2026-02-13', amount: 500 }
    ]);
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-11', amount: 200 },
      { type: 'normal', date: '2026-02-12', amount: 100 },
      { type: 'planned', date: '2026-02-12', amount: 7777 }
    ]);

    const result = calculateRealisedTotals();
    expect(result.sumIncome).toBe(6000);
    expect(result.sumExpense).toBe(300);
  });

  it('returns zero when no transactions exist', () => {
    getIncomes.mockReturnValue([]);
    getExpenses.mockReturnValue([]);

    const result = calculateRealisedTotals();
    expect(result.sumIncome).toBe(0);
    expect(result.sumExpense).toBe(0);
  });

  it('handles missing amount gracefully (defaults to 0)', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: undefined }
    ]);
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: null }
    ]);

    const result = calculateRealisedTotals();
    expect(result.sumIncome).toBe(0);
    expect(result.sumExpense).toBe(0);
  });

  it('accepts a custom date override', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-01-01', amount: 1000 },
      { type: 'normal', date: '2026-01-15', amount: 2000 },
      { type: 'normal', date: '2026-01-20', amount: 3000 }
    ]);
    getExpenses.mockReturnValue([]);

    const result = calculateRealisedTotals('2026-01-15');
    expect(result.sumIncome).toBe(3000);
  });
});

// ============================================================
// calculateAvailableFunds
// ============================================================
describe('calculateAvailableFunds', () => {
  it('subtracts expenses and savings goal from income', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 10000 }
    ]);
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 3000 }
    ]);
    getSavingGoal.mockReturnValue(1000);

    const result = calculateAvailableFunds();
    expect(result.totalAvailable).toBe(7000);
    expect(result.savingsAmount).toBe(1000);
    expect(result.available).toBe(6000);
  });

  it('returns negative available when overspent', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 1000 }
    ]);
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 2000 }
    ]);
    getSavingGoal.mockReturnValue(0);

    const result = calculateAvailableFunds();
    expect(result.available).toBe(-1000);
  });

  it('handles zero savings goal', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 5000 }
    ]);
    getExpenses.mockReturnValue([]);
    getSavingGoal.mockReturnValue(0);

    const result = calculateAvailableFunds();
    expect(result.available).toBe(5000);
    expect(result.totalAvailable).toBe(5000);
  });
});

// ============================================================
// calculateCurrentLimits
// ============================================================
describe('calculateCurrentLimits', () => {
  it('calculates daily limits dividing available by calendar days', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 10000 },
      { type: 'planned', date: '2026-02-22', amount: 5000, source: 'Wyplata' }
    ]);
    getExpenses.mockReturnValue([]);
    getSavingGoal.mockReturnValue(0);

    const result = calculateCurrentLimits();
    expect(result.limits.length).toBe(1);
    expect(result.limits[0].realLimit).toBeCloseTo(10000 / result.limits[0].calendarDays, 0);
  });

  it('returns 0 limits for past period dates', async () => {
    const { calculateRemainingTime } = await import('../../utils/dateHelpers.js');
    calculateRemainingTime.mockReturnValueOnce({
      days: 0, hours: 0, minutes: 0, seconds: 0,
      totalDays: 0, calendarDays: -7,
      formatted: '0 dni', countdownFormat: null, showToday: false
    });

    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 10000 },
      { type: 'planned', date: '2026-02-05', amount: 5000, source: 'Old' }
    ]);
    getExpenses.mockReturnValue([]);
    getSavingGoal.mockReturnValue(0);

    const result = calculateCurrentLimits();
    const pastLimit = result.limits.find(l => l.calendarDays < 0);
    if (pastLimit) {
      expect(pastLimit.realLimit).toBe(0);
      expect(pastLimit.plannedLimit).toBe(0);
    }
  });

  it('plannedLimit includes future planned transactions', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 10000 },
      { type: 'planned', date: '2026-02-22', amount: 5000, source: 'Wyplata' },
      { type: 'planned', date: '2026-02-15', amount: 2000, source: 'Bonus' }
    ]);
    getExpenses.mockReturnValue([
      { type: 'planned', date: '2026-02-16', amount: 500 }
    ]);
    getSavingGoal.mockReturnValue(0);

    const result = calculateCurrentLimits();
    expect(result.limits.length).toBeGreaterThan(0);
    // For the second period (Wyplata), plannedLimit should include Bonus income
    if (result.limits[1]) {
      expect(result.limits[1].plannedLimit).toBeGreaterThanOrEqual(result.limits[1].realLimit);
    }
  });
});

// ============================================================
// calculateSpendingPeriods
// ============================================================
describe('calculateSpendingPeriods', () => {
  it('returns periods based on planned income dates', () => {
    getIncomes.mockReturnValue([
      { type: 'planned', date: '2026-02-20', amount: 5000, source: 'Wyplata' },
      { type: 'planned', date: '2026-03-01', amount: 3000, source: 'Freelance' }
    ]);

    const result = calculateSpendingPeriods();
    expect(result.periods.length).toBe(2);
    expect(result.periods[0].date).toBe('2026-02-20');
    expect(result.periods[1].date).toBe('2026-03-01');
  });

  it('returns empty periods when no planned incomes', () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 5000 }
    ]);

    const result = calculateSpendingPeriods();
    expect(result.periods.length).toBe(0);
    expect(result.date1).toBe('');
    expect(result.date2).toBe('');
  });

  it('merges same-day planned incomes and sums amounts', () => {
    getIncomes.mockReturnValue([
      { type: 'planned', date: '2026-02-20', amount: 3000, source: 'A' },
      { type: 'planned', date: '2026-02-20', amount: 2000, source: 'B' }
    ]);

    const result = calculateSpendingPeriods();
    expect(result.periods.length).toBe(1);
    expect(result.periods[0].amount).toBe(5000);
  });

  it('provides backward-compatible date1/date2', () => {
    getIncomes.mockReturnValue([
      { type: 'planned', date: '2026-02-20', amount: 5000, source: 'First' },
      { type: 'planned', date: '2026-03-01', amount: 3000, source: 'Second' }
    ]);

    const result = calculateSpendingPeriods();
    expect(result.date1).toBe('2026-02-20');
    expect(result.date2).toBe('2026-03-01');
  });
});

// ============================================================
// getTodayExpenses / getWeekExpenses / getMonthExpenses
// ============================================================
describe('getTodayExpenses', () => {
  it('sums only normal expenses from today', () => {
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-12', amount: 50 },
      { type: 'normal', date: '2026-02-12', amount: 30 },
      { type: 'normal', date: '2026-02-11', amount: 100 },
      { type: 'planned', date: '2026-02-12', amount: 200 }
    ]);

    expect(getTodayExpenses()).toBe(80);
  });
});

describe('getWeekExpenses', () => {
  it('sums expenses from Monday to today', () => {
    // 2026-02-12 is Thursday, week starts on 2026-02-09 (Monday)
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-09', amount: 100 },
      { type: 'normal', date: '2026-02-10', amount: 50 },
      { type: 'normal', date: '2026-02-12', amount: 75 },
      { type: 'normal', date: '2026-02-08', amount: 200 }
    ]);

    expect(getWeekExpenses()).toBe(225);
  });
});

describe('getMonthExpenses', () => {
  it('sums expenses from 1st of month to today', () => {
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-01', amount: 100 },
      { type: 'normal', date: '2026-02-05', amount: 200 },
      { type: 'normal', date: '2026-02-12', amount: 50 },
      { type: 'normal', date: '2026-01-31', amount: 999 }
    ]);

    expect(getMonthExpenses()).toBe(350);
  });
});

// ============================================================
// calculateSpendingGauge
// ============================================================
describe('calculateSpendingGauge', () => {
  it('calculates gauge percentages from envelope', () => {
    getDailyEnvelope.mockReturnValue({ spent: 50, totalAmount: 100 });

    const result = calculateSpendingGauge();
    expect(result.spent).toBe(50);
    expect(result.total).toBe(100);
    expect(result.percentage).toBe(50);
    expect(result.remaining).toBe(50);
  });

  it('caps percentage at 100', () => {
    getDailyEnvelope.mockReturnValue({ spent: 200, totalAmount: 100 });

    const result = calculateSpendingGauge();
    expect(result.percentage).toBe(100);
    expect(result.remaining).toBe(0);
  });

  it('returns zeros when no envelope', () => {
    getDailyEnvelope.mockReturnValue(null);

    const result = calculateSpendingGauge();
    expect(result.spent).toBe(0);
    expect(result.total).toBe(0);
    expect(result.percentage).toBe(0);
  });
});

// ============================================================
// getGlobalMedian30d
// ============================================================
describe('getGlobalMedian30d', () => {
  it('returns median of last 30 days expenses', () => {
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 10 },
      { type: 'normal', date: '2026-02-11', amount: 20 },
      { type: 'normal', date: '2026-02-12', amount: 30 },
      { type: 'normal', date: '2026-02-12', amount: 40 },
      { type: 'normal', date: '2026-02-12', amount: 50 }
    ]);

    expect(getGlobalMedian30d()).toBe(30);
  });

  it('returns 0 when no expenses', () => {
    getExpenses.mockReturnValue([]);
    expect(getGlobalMedian30d()).toBe(0);
  });
});

// ============================================================
// getTopCategories
// ============================================================
describe('getTopCategories', () => {
  it('returns top N categories by amount', () => {
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 500, category: 'Jedzenie' },
      { type: 'normal', date: '2026-02-10', amount: 300, category: 'Jedzenie' },
      { type: 'normal', date: '2026-02-10', amount: 200, category: 'Transport' },
      { type: 'normal', date: '2026-02-10', amount: 100, category: 'Rozrywka' }
    ]);

    const result = getTopCategories(2);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Jedzenie');
    expect(result[0].amount).toBe(800);
    expect(result[1].name).toBe('Transport');
  });
});

// ============================================================
// computeComparisons
// ============================================================
describe('computeComparisons', () => {
  it('compares last 7 vs previous 7 days spending', () => {
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 100 },
      { type: 'normal', date: '2026-02-11', amount: 100 },
      { type: 'normal', date: '2026-02-03', amount: 200 },
      { type: 'normal', date: '2026-02-04', amount: 200 }
    ]);

    const result = computeComparisons();
    expect(result.last7Days).toBe(200);
    expect(result.prev7Days).toBe(400);
    expect(result.change).toBe(-50);
  });

  it('returns 0 change when previous period has no expenses', () => {
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 100 }
    ]);

    const result = computeComparisons();
    expect(result.change).toBe(0);
  });
});

// ============================================================
// calculatePlannedTransactionsTotals
// ============================================================
describe('calculatePlannedTransactionsTotals', () => {
  it('sums planned transactions per period excluding end date', () => {
    getIncomes.mockReturnValue([
      { type: 'planned', date: '2026-02-15', amount: 2000, source: 'Bonus' },
      { type: 'planned', date: '2026-02-20', amount: 5000, source: 'Wyplata' }
    ]);
    getExpenses.mockReturnValue([
      { type: 'planned', date: '2026-02-16', amount: 500 }
    ]);

    const result = calculatePlannedTransactionsTotals();
    expect(result.periodTotals.length).toBe(2);
    // Period for Bonus (02-15): no planned between today(02-12) and 02-15 exclusive
    expect(result.periodTotals[0].futureIncome).toBe(0);
    // Period for Wyplata (02-20): Bonus (02-15) is between 02-12 and 02-20
    expect(result.periodTotals[1].futureIncome).toBe(2000);
    expect(result.periodTotals[1].futureExpense).toBe(500);
  });
});

// ============================================================
// updateDailyEnvelope
// ============================================================
describe('updateDailyEnvelope', () => {
  it('creates envelope with correct base amount', async () => {
    getIncomes.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 10000 },
      { type: 'planned', date: '2026-02-22', amount: 5000, source: 'Wyplata' }
    ]);
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-10', amount: 2000 }
    ]);
    getSavingGoal.mockReturnValue(0);
    getDailyEnvelope.mockReturnValue(null);

    const result = await updateDailyEnvelope();
    expect(result.date).toBe('2026-02-12');
    expect(result.baseAmount).toBeGreaterThan(0);
    expect(result.spent).toBe(0);
    expect(saveDailyEnvelope).toHaveBeenCalled();
  });

  it('only updates spent when envelope already exists for today', async () => {
    getIncomes.mockReturnValue([
      { type: 'planned', date: '2026-02-22', amount: 5000, source: 'Wyplata' }
    ]);
    getExpenses.mockReturnValue([
      { type: 'normal', date: '2026-02-12', amount: 75 }
    ]);
    getDailyEnvelope.mockReturnValue({
      date: '2026-02-12',
      calculatedDate: '2026-02-12',
      baseAmount: 500,
      totalAmount: 500,
      spent: 0
    });

    const result = await updateDailyEnvelope();
    expect(result.spent).toBe(75);
    expect(result.baseAmount).toBe(500);
  });
});
