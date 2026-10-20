import { BUDGET_CATEGORIES } from './constants.js';

const CATEGORY_IDS = BUDGET_CATEGORIES.map((c) => c.id);
const LABELS = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.id, c.label]));

/**
 * Splits `total` into whole-number amounts proportional to `weights`
 * using the largest-remainder method, so the parts always sum to `total`.
 * @param {number} total
 * @param {Record<string, number>} weights
 * @returns {Record<string, number>}
 */
export function allocate(total, weights) {
  /** @type {[string, number][]} */
  const entries = Object.entries(weights).map(([id, w]) => [id, Math.max(0, Number(w) || 0)]);
  const weightSum = entries.reduce((sum, [, w]) => sum + w, 0);
  const safeTotal = Math.max(0, Math.round(total));
  if (entries.length === 0) return {};
  if (weightSum === 0) {
    return allocate(safeTotal, Object.fromEntries(entries.map(([id]) => [id, 1])));
  }

  const raw = entries.map(([id, w]) => {
    const exact = (safeTotal * w) / weightSum;
    return { id, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let leftover = safeTotal - raw.reduce((sum, r) => sum + r.floor, 0);
  const byRemainder = raw.toSorted((a, b) => b.remainder - a.remainder);
  for (let i = 0; leftover > 0; i = (i + 1) % byRemainder.length, leftover -= 1) {
    byRemainder[i].floor += 1;
  }
  return Object.fromEntries(raw.map((r) => [r.id, r.floor]));
}

/**
 * Turns whatever category list the model returned into a clean list that
 * covers every known category exactly once and sums exactly to `total`.
 * Model arithmetic is not trusted; only its relative weights are used.
 * @param {unknown} categories Raw categories from the model.
 * @param {number} total
 * @returns {import('./types.js').BudgetCategory[]}
 */
export function normalizeCategories(categories, total) {
  const byId = new Map();
  for (const cat of Array.isArray(categories) ? categories : []) {
    if (cat && CATEGORY_IDS.includes(cat.id) && !byId.has(cat.id)) byId.set(cat.id, cat);
  }
  const weights = Object.fromEntries(CATEGORY_IDS.map((id) => [id, Number(byId.get(id)?.amount) || 0]));
  const amounts = allocate(total, weights);
  return CATEGORY_IDS.map((id) => ({
    id,
    label: LABELS[id],
    amount: amounts[id],
    rationale: typeof byId.get(id)?.rationale === 'string' ? byId.get(id).rationale : '',
  }));
}

/** Scales every category to a new total while keeping their proportions. */
export function rescaleCategories(categories, newTotal) {
  const amounts = allocate(newTotal, Object.fromEntries(categories.map((c) => [c.id, c.amount])));
  return categories.map((c) => ({ ...c, amount: amounts[c.id] }));
}

/**
 * Compares planned amounts with what has actually been spent.
 * A line is "near" its limit from 90% and "over" beyond 100%.
 * @param {import('./types.js').BudgetCategory[]} categories
 * @param {Record<string, number>} [spent] Actual spend by category id.
 * @param {number} [total] The host's total budget; defaults to the sum of the lines.
 */
export function summarizeBudget(categories, spent = {}, total = sumAmounts(categories)) {
  const rows = categories.map((c) => {
    const actual = Math.max(0, Number(spent[c.id]) || 0);
    const ratio = c.amount > 0 ? actual / c.amount : actual > 0 ? Infinity : 0;
    let status = 'on-track';
    if (ratio > 1) status = 'over';
    else if (ratio >= 0.9) status = 'near';
    return { ...c, actual, remaining: c.amount - actual, ratio, status };
  });
  const totalSpent = rows.reduce((sum, r) => sum + r.actual, 0);
  const planned = sumAmounts(categories);
  return {
    rows,
    total,
    planned,
    spent: totalSpent,
    remaining: total - totalSpent,
    unallocated: total - planned,
    overCategories: rows.filter((r) => r.status === 'over').map((r) => r.label),
    status: totalSpent > total ? 'over' : totalSpent >= total * 0.9 ? 'near' : 'on-track',
  };
}

export function sumAmounts(categories) {
  return categories.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
}

const formatters = new Map();

/** Formats money with a cached Intl.NumberFormat per currency. */
export function formatMoney(amount, currency) {
  if (!formatters.has(currency)) {
    formatters.set(currency, new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }));
  }
  return formatters.get(currency).format(Math.round(amount));
}
