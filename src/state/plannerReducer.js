import { rescaleCategories } from '../../shared/budget.js';
import { LIMITS } from '../../shared/constants.js';
import { ActionType } from './actions.js';

/**
 * All workspace state lives in this one pure reducer, which keeps every
 * user interaction easy to unit test and simple to persist.
 */

/** @typedef {import('../../shared/types.js').SavedGuest} SavedGuest */

/**
 * @typedef {object} PlannerState
 * @property {import('../../shared/types.js').EventBrief | null} event
 * @property {import('../../shared/types.js').Plan | null} plan
 * @property {import('../../shared/types.js').ContentSource | null} source
 * @property {import('../../shared/types.js').BudgetCategory[]} categories Editable copy of the plan's budget.
 * @property {Record<string, number>} spent Actual spend by category id.
 * @property {Record<string, boolean>} done Completed milestone ids.
 * @property {Record<string, boolean>} booked Booked vendor ids.
 * @property {SavedGuest[]} guests
 * @property {number} tableSize
 * @property {Record<string, import('../../shared/types.js').Ideas & { source: string }>} ideas Latest result per kind.
 */

/**
 * The state once a plan exists, which is all the workspace ever sees.
 * @typedef {PlannerState & { event: import('../../shared/types.js').EventBrief, plan: import('../../shared/types.js').Plan }} LoadedPlannerState
 */

/**
 * True once a plan has been generated or restored.
 * @param {PlannerState} state
 * @returns {state is LoadedPlannerState}
 */
export const hasPlan = (state) => Boolean(state.plan && state.event);

/** Bump the version when the saved shape changes, so old data is ignored. */
export const STORAGE_KEY = 'festa:v1';

/** @type {Readonly<PlannerState>} */
export const initialState = Object.freeze({
  event: null,
  plan: null,
  source: null,
  categories: [],
  spent: {},
  done: {},
  booked: {},
  guests: [],
  tableSize: 8,
  ideas: {},
});

/** @param {unknown} n */
const nonNegative = (n) => Math.max(0, Math.round(Number(n) || 0));
/** @param {Record<string, boolean>} map @param {string} id */
const toggle = (map, id) => ({ ...map, [id]: !map[id] });
/** @param {number} n @param {number} min @param {number} max */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/**
 * @param {PlannerState} state
 * @param {Record<string, any> & { type: string }} action Built with `actions` from ./actions.js.
 * @returns {PlannerState}
 */
export function plannerReducer(state, action) {
  switch (action.type) {
    case ActionType.PLAN_LOADED: {
      const { event, plan, source } = action;
      // A refinement keeps the same event; spending and guests carry over.
      // Milestone and vendor ids belong to the old plan, so their ticks reset.
      const sameEvent = state.event?.name === event.name && state.event?.date === event.date;
      return {
        ...state,
        event,
        plan,
        source,
        categories: plan.budget.categories,
        spent: sameEvent ? state.spent : {},
        done: {},
        booked: {},
        guests: sameEvent ? state.guests : [],
        ideas: {},
      };
    }
    case ActionType.TASK_TOGGLED:
      return { ...state, done: toggle(state.done, action.id) };
    case ActionType.VENDOR_TOGGLED:
      return { ...state, booked: toggle(state.booked, action.id) };
    case ActionType.BUDGET_PLANNED:
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, amount: nonNegative(action.amount) } : c,
        ),
      };
    case ActionType.BUDGET_SPENT:
      return { ...state, spent: { ...state.spent, [action.id]: nonNegative(action.amount) } };
    case ActionType.BUDGET_RESCALED: {
      const total = nonNegative(action.total);
      if (total < LIMITS.budgetMin || !state.event) return state;
      return {
        ...state,
        event: { ...state.event, budget: total },
        categories: rescaleCategories(state.categories, total),
      };
    }
    case ActionType.GUEST_ADDED:
      if (state.guests.length >= LIMITS.guestListMax) return state;
      return { ...state, guests: [...state.guests, { ...action.guest, id: action.id }] };
    case ActionType.GUEST_UPDATED:
      return { ...state, guests: state.guests.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };
    case ActionType.GUEST_REMOVED:
      return { ...state, guests: state.guests.filter((g) => g.id !== action.id) };
    case ActionType.SEATING_SIZE:
      return { ...state, tableSize: clamp(nonNegative(action.size), LIMITS.tableSizeMin, LIMITS.tableSizeMax) };
    case ActionType.IDEAS_LOADED:
      return { ...state, ideas: { ...state.ideas, [action.kind]: { ...action.ideas, source: action.source } } };
    case ActionType.RESET:
      return initialState;
    default:
      return state;
  }
}

/**
 * Restores state saved in this browser. Only known keys are kept, and anything
 * that does not look like a saved plan falls back to a fresh start, so edited
 * or corrupted storage can never inject unexpected state.
 * @param {string | null} raw
 * @returns {PlannerState}
 */
export function restoreState(raw) {
  try {
    const saved = JSON.parse(raw ?? '');
    if (!saved || typeof saved !== 'object' || !saved.plan?.budget || !saved.event) return initialState;
    const known = Object.keys(initialState).filter((key) => key in saved);
    return { ...initialState, ...Object.fromEntries(known.map((key) => [key, saved[key]])) };
  } catch {
    return initialState;
  }
}
