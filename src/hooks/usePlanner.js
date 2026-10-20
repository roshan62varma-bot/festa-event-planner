import { useEffect, useReducer } from 'react';
import { STORAGE_KEY, initialState, plannerReducer, restoreState } from '../state/plannerReducer.js';

function load() {
  try {
    return restoreState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return initialState; // Storage can be blocked (private mode, strict settings).
  }
}

/** The planner reducer, saved to this browser so a refresh never loses work. */
export function usePlanner() {
  const [state, dispatch] = useReducer(plannerReducer, undefined, load);

  useEffect(() => {
    // Debounced so typing in budget fields does not serialise state on every keystroke.
    const id = setTimeout(() => {
      try {
        if (state.plan) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* Saving is a convenience; the app works without it. */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [state]);

  return [state, dispatch];
}
