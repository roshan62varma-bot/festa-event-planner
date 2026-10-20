import { BUDGET_CATEGORIES, PRIORITIES } from '../../shared/constants.js';
import { normalizeCategories } from '../../shared/budget.js';
import { sanitizeText } from '../../shared/validation.js';

/**
 * Model output is untrusted input. These functions coerce it into the exact
 * shape the UI expects: bounded lengths, bounded list sizes, known enum values,
 * and a budget that sums to the host's total. React escapes everything it
 * renders, so no HTML is ever interpreted.
 */

const CATEGORY_IDS = new Set([...BUDGET_CATEGORIES.map((c) => c.id), 'guests', 'logistics']);
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

const text = (v, max = 400) => sanitizeText(typeof v === 'string' ? v : '', max);
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const textList = (v, max, len = 200) =>
  list(v, max)
    .map((s) => text(s, len))
    .filter(Boolean);
const clampNumber = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const asObject = (raw) => (raw && typeof raw === 'object' ? raw : {});

/** The overview half of a plan: summary, theme, budget and risks. */
export function sanitizeOverview(raw, event) {
  const plan = asObject(raw);
  return {
    summary: text(plan.summary, 600),
    theme: {
      name: text(plan.theme?.name, 60) || 'Your celebration',
      description: text(plan.theme?.description, 240),
      palette: textList(plan.theme?.palette, 5, 40),
    },
    budget: {
      currency: event.currency,
      total: event.budget,
      categories: normalizeCategories(plan.budget?.categories, event.budget),
      savingsTips: textList(plan.budget?.savingsTips, 5, 240),
    },
    watchouts: textList(plan.watchouts, 5, 240),
  };
}

/** The schedule half of a plan: milestones, run of show and vendors. */
export function sanitizeSchedule(raw, maxWeeks) {
  const plan = asObject(raw);
  return {
    milestones: list(plan.milestones, 16)
      .map((m, i) => ({
        id: `m${i + 1}`,
        title: text(m?.title, 90),
        detail: text(m?.detail, 240),
        weeksBefore: Math.round(clampNumber(m?.weeksBefore, 0, maxWeeks, 0) * 2) / 2,
        priority: PRIORITIES.includes(m?.priority) ? m.priority : 'medium',
        category: CATEGORY_IDS.has(m?.category) ? m.category : 'logistics',
      }))
      .filter((m) => m.title),
    runOfShow: list(plan.runOfShow, 14)
      .map((r) => ({
        time: TIME.test(r?.time) ? r.time.padStart(5, '0') : '',
        activity: text(r?.activity, 160),
        owner: text(r?.owner, 40),
      }))
      .filter((r) => r.activity),
    vendors: list(plan.vendors, 8)
      .map((v) => ({
        type: text(v?.type, 40),
        why: text(v?.why, 240),
        questions: textList(v?.questions, 4, 160),
        bookWeeksBefore: Math.round(clampNumber(v?.bookWeeksBefore, 0, maxWeeks, 0)),
      }))
      .filter((v) => v.type),
  };
}

export function sanitizePlan(raw, event, maxWeeks) {
  return { ...sanitizeOverview(raw, event), ...sanitizeSchedule(raw, maxWeeks) };
}

export function sanitizeCreative(raw) {
  const result = raw && typeof raw === 'object' ? raw : {};
  return {
    title: text(result.title, 80),
    intro: text(result.intro, 240),
    items: list(result.items, 12)
      .map((item) => ({
        heading: text(item?.heading, 120),
        body: text(item?.body, 1500),
        tags: textList(item?.tags, 4, 30),
      }))
      .filter((item) => item.heading && item.body),
  };
}
