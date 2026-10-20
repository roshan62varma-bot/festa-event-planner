import { rescaleCategories } from '../../shared/budget.js';
import { LIMITS } from '../../shared/constants.js';

/**
 * All workspace state lives in this one pure reducer, which keeps every
 * user interaction easy to unit test and simple to persist.
 */

export const STORAGE_KEY = 'festa:v1';

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

const nonNegative = (n) => Math.max(0, Math.round(Number(n) || 0));
const toggle = (map, id) => ({ ...map, [id]: !map[id] });

export function plannerReducer(state, action) {
  switch (action.type) {
    case 'plan/loaded': {
      const { event, plan, source } = action;
      const sameEvent = state.event?.name === event.name && state.event?.date === event.date;
      return {
        ...state,
        event,
        plan,
        source,
        categories: plan.budget.categories,
        // Spending is tied to category ids, which never change, so it survives a refinement.
        spent: sameEvent ? state.spent : {},
        done: {},
        booked: {},
        guests: sameEvent ? state.guests : [],
        ideas: {},
      };
    }
    case 'task/toggled':
      return { ...state, done: toggle(state.done, action.id) };
    case 'vendor/toggled':
      return { ...state, booked: toggle(state.booked, action.id) };
    case 'budget/planned':
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.id ? { ...c, amount: nonNegative(action.amount) } : c)),
      };
    case 'budget/spent':
      return { ...state, spent: { ...state.spent, [action.id]: nonNegative(action.amount) } };
    case 'budget/rescaled': {
      const total = nonNegative(action.total);
      if (total < LIMITS.budgetMin) return state;
      return {
        ...state,
        event: { ...state.event, budget: total },
        categories: rescaleCategories(state.categories, total),
      };
    }
    case 'guest/added':
      if (state.guests.length >= LIMITS.guestListMax) return state;
      return { ...state, guests: [...state.guests, { ...action.guest, id: action.id }] };
    case 'guest/updated':
      return { ...state, guests: state.guests.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };
    case 'guest/removed':
      return { ...state, guests: state.guests.filter((g) => g.id !== action.id) };
    case 'seating/size':
      return {
        ...state,
        tableSize: Math.min(LIMITS.tableSizeMax, Math.max(LIMITS.tableSizeMin, nonNegative(action.size))),
      };
    case 'ideas/loaded':
      return { ...state, ideas: { ...state.ideas, [action.kind]: { ...action.ideas, source: action.source } } };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

/** Restores saved state, discarding anything that does not look like ours. */
export function restoreState(raw) {
  try {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || !saved.plan?.budget || !saved.event) return initialState;
    return { ...initialState, ...saved };
  } catch {
    return initialState;
  }
}
