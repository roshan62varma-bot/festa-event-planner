import { BUDGET_CATEGORIES, DEFAULT_SHARES, EVENT_TYPES } from '../../shared/constants.js';
import { allocate } from '../../shared/budget.js';
import {
  CREATIVE,
  DEFAULT_THEME,
  MILESTONES,
  RATIONALE,
  RUN_OF_SHOW,
  SAVINGS_TIPS,
  VENDORS,
  WATCHOUTS,
} from './fallback-content.js';

/**
 * Deterministic plans used when no Gemini key is configured or every model
 * is unavailable. The app stays fully usable and the UI labels the result
 * as a starter template, so hosts are never shown a blank screen.
 */

/** Matches the longest theme name the sanitiser accepts from Gemini. */
const THEME_NAME_MAX = 60;

/**
 * A complete plan from proven defaults, scaled to the brief's budget and time available.
 * @param {import('../../shared/types.js').EventBrief} event
 * @param {{ maxWeeks: number }} options Weeks between today and the event.
 * @returns {import('../../shared/types.js').Plan}
 */
export function buildFallbackPlan(event, { maxWeeks }) {
  const type = EVENT_TYPES.find((t) => t.id === event.type);
  const shares = /** @type {Record<string, Record<string, number>>} */ (DEFAULT_SHARES);
  const amounts = allocate(event.budget, shares[event.type] ?? shares.birthday);
  return {
    summary: `A starter plan for ${event.name}, ${type?.phrase ?? 'your event'} for ${event.guests} guests. It follows a proven timeline and a typical budget split you can adjust.`,
    theme: {
      ...DEFAULT_THEME,
      name: event.vibe ? event.vibe.slice(0, THEME_NAME_MAX) : DEFAULT_THEME.name,
      palette: [...DEFAULT_THEME.palette],
    },
    budget: {
      currency: event.currency,
      total: event.budget,
      categories: BUDGET_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        amount: amounts[c.id],
        rationale: RATIONALE[c.id],
      })),
      savingsTips: [...SAVINGS_TIPS],
    },
    milestones: MILESTONES.map((m, i) => ({ ...m, id: `m${i + 1}`, weeksBefore: Math.min(m.weeksBefore, maxWeeks) })),
    runOfShow: RUN_OF_SHOW.map((item) => ({ ...item })),
    vendors: VENDORS.map((v) => ({ ...v, bookWeeksBefore: Math.min(v.bookWeeksBefore, maxWeeks) })),
    watchouts: [...WATCHOUTS],
  };
}

/**
 * Starter ideas for one creative kind, with the event details filled in.
 * @param {import('../../shared/types.js').EventBrief} event
 * @param {{ kind: string }} input
 * @returns {import('../../shared/types.js').Ideas}
 */
export function buildFallbackCreative(event, input) {
  /** @param {string} s */
  const fill = (s) =>
    s
      .replaceAll('{name}', event.name)
      .replaceAll('{date}', event.date)
      .replaceAll('{guests}', String(event.guests))
      .replaceAll('{place}', event.location ? ` in ${event.location}` : '');
  return {
    title: 'Starter ideas',
    intro: 'Ready-made ideas to get you going. Connect Gemini for ideas tailored to your event.',
    items: CREATIVE[input.kind].map((item) => ({ ...item, heading: fill(item.heading), body: fill(item.body) })),
  };
}
