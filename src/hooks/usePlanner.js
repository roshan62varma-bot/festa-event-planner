import { useEffect, useReducer } from 'react';
import { STORAGE_KEY, initialState, plannerReducer, restoreState } from '../state/plannerReducer.js';

/** Batches rapid edits (typing in budget fields) into one write. */
export const SAVE_DEBOUNCE_MS = 300;

/** @returns {import('../state/plannerReducer.js').PlannerState} */
function load() {
  try {
    return restoreState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return initialState; // Storage can be blocked (private mode, strict settings).
  }
}

/**
 * The planner reducer, saved to this browser so a refresh never loses work.
 * Nothing is sent to a server: the plan, budget and guest list stay on this device.
 * @returns {[import('../state/plannerReducer.js').PlannerState, import('../state/actions.js').Dispatch]}
 */
export function usePlanner() {
  const [state, dispatch] = useReducer(plannerReducer, undefined, load);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (state.plan) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Saving is a convenience (quota, privacy mode); the app works without it.
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [state]);

  return [state, dispatch];
}
