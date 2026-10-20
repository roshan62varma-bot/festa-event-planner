/**
 * Action creators for the planner reducer. Components dispatch these instead of
 * hand-written objects, so every action type lives in one place.
 */

/** @typedef {import('../../shared/types.js').Guest} Guest */

export const ActionType = Object.freeze({
  PLAN_LOADED: 'plan/loaded',
  TASK_TOGGLED: 'task/toggled',
  VENDOR_TOGGLED: 'vendor/toggled',
  BUDGET_PLANNED: 'budget/planned',
  BUDGET_SPENT: 'budget/spent',
  BUDGET_RESCALED: 'budget/rescaled',
  GUEST_ADDED: 'guest/added',
  GUEST_UPDATED: 'guest/updated',
  GUEST_REMOVED: 'guest/removed',
  SEATING_SIZE: 'seating/size',
  IDEAS_LOADED: 'ideas/loaded',
  RESET: 'reset',
});

export const actions = {
  /**
   * @param {import('../../shared/types.js').EventBrief} event
   * @param {import('../../shared/types.js').Plan} plan
   * @param {import('../../shared/types.js').ContentSource} source
   */
  planLoaded: (event, plan, source) => ({ type: ActionType.PLAN_LOADED, event, plan, source }),
  /** @param {string} id */
  taskToggled: (id) => ({ type: ActionType.TASK_TOGGLED, id }),
  /** @param {string} id */
  vendorToggled: (id) => ({ type: ActionType.VENDOR_TOGGLED, id }),
  /** @param {string} id @param {number} amount */
  budgetPlanned: (id, amount) => ({ type: ActionType.BUDGET_PLANNED, id, amount }),
  /** @param {string} id @param {number} amount */
  budgetSpent: (id, amount) => ({ type: ActionType.BUDGET_SPENT, id, amount }),
  /** @param {number} total */
  budgetRescaled: (total) => ({ type: ActionType.BUDGET_RESCALED, total }),
  /** @param {string} id @param {Guest} guest */
  guestAdded: (id, guest) => ({ type: ActionType.GUEST_ADDED, id, guest }),
  /** @param {string} id @param {Partial<Guest>} patch */
  guestUpdated: (id, patch) => ({ type: ActionType.GUEST_UPDATED, id, patch }),
  /** @param {string} id */
  guestRemoved: (id) => ({ type: ActionType.GUEST_REMOVED, id }),
  /** @param {number | string} size */
  seatingSize: (size) => ({ type: ActionType.SEATING_SIZE, size }),
  /**
   * @param {string} kind
   * @param {import('../../shared/types.js').Ideas} ideas
   * @param {import('../../shared/types.js').ContentSource} source
   */
  ideasLoaded: (kind, ideas, source) => ({ type: ActionType.IDEAS_LOADED, kind, ideas, source }),
  reset: () => ({ type: ActionType.RESET }),
};

/** @typedef {ReturnType<(typeof actions)[keyof typeof actions]>} PlannerAction */
/** @typedef {(action: PlannerAction) => void} Dispatch */
