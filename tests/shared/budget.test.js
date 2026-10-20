import { describe, expect, it } from 'vitest';
import { allocate, formatMoney, normalizeCategories, rescaleCategories, summarizeBudget, sumAmounts } from '../../shared/budget.js';
import { BUDGET_CATEGORIES, DEFAULT_SHARES } from '../../shared/constants.js';

describe('allocate', () => {
  it('always sums exactly to the total', () => {
    for (const total of [100, 999, 12345, 1_000_001]) {
      const parts = allocate(total, { a: 1, b: 1, c: 1 });
      expect(Object.values(parts).reduce((s, n) => s + n, 0)).toBe(total);
    }
  });

  it('is proportional to the weights', () => {
    expect(allocate(1000, { a: 3, b: 1 })).toEqual({ a: 750, b: 250 });
  });

  it('splits evenly when all weights are zero and ignores negatives', () => {
    expect(allocate(90, { a: 0, b: 0, c: 0 })).toEqual({ a: 30, b: 30, c: 30 });
    expect(allocate(100, { a: -5, b: 1 })).toEqual({ a: 0, b: 100 });
  });

  it('every default share table sums to 1', () => {
    for (const shares of Object.values(DEFAULT_SHARES)) {
      expect(Object.values(shares).reduce((s, n) => s + n, 0)).toBeCloseTo(1, 5);
    }
  });
});

describe('normalizeCategories', () => {
  it('covers every category once, drops unknown ids and fixes model arithmetic', () => {
    const result = normalizeCategories(
      [{ id: 'venue', amount: 300, rationale: 'r' }, { id: 'venue', amount: 999 }, { id: 'bogus', amount: 5000 }, { id: 'catering', amount: 100 }],
      2000,
    );
    expect(result.map((c) => c.id)).toEqual(BUDGET_CATEGORIES.map((c) => c.id));
    expect(sumAmounts(result)).toBe(2000);
    expect(result.find((c) => c.id === 'venue').amount).toBe(1500);
    expect(result.find((c) => c.id === 'decor').amount).toBe(0);
  });

  it('survives garbage input', () => {
    expect(sumAmounts(normalizeCategories('nope', 800))).toBe(800);
  });
});

describe('rescaleCategories', () => {
  it('keeps proportions at a new total', () => {
    const scaled = rescaleCategories([{ id: 'a', amount: 200 }, { id: 'b', amount: 800 }], 500);
    expect(scaled.map((c) => c.amount)).toEqual([100, 400]);
  });
});

describe('summarizeBudget', () => {
  const categories = [{ id: 'venue', label: 'Venue', amount: 1000 }, { id: 'decor', label: 'Decor', amount: 500 }];

  it('flags categories that are over or nearly used up', () => {
    const summary = summarizeBudget(categories, { venue: 1200, decor: 460 }, 1500);
    expect(summary.rows.map((r) => r.status)).toEqual(['over', 'near']);
    expect(summary.overCategories).toEqual(['Venue']);
    expect(summary.spent).toBe(1660);
    expect(summary.remaining).toBe(-160);
    expect(summary.status).toBe('over');
  });

  it('reports unallocated money when lines do not add up to the total', () => {
    expect(summarizeBudget(categories, {}, 2000).unallocated).toBe(500);
  });

  it('treats spend on a zero line as over budget', () => {
    expect(summarizeBudget([{ id: 'x', label: 'X', amount: 0 }], { x: 10 }).rows[0].status).toBe('over');
  });
});

describe('formatMoney', () => {
  it('formats with the currency symbol and no decimals', () => {
    expect(formatMoney(1234.6, 'USD')).toBe('$1,235');
    expect(formatMoney(250000, 'INR')).toMatch(/₹/);
  });
});
