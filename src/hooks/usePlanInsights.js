import { useMemo } from 'react';
import { summarizeBudget } from '../../shared/budget.js';
import { daysUntil, priorityAlerts, progress, scheduleMilestones } from '../../shared/timeline.js';

/**
 * Everything the workspace derives from saved state: the budget summary,
 * the scheduled checklist, urgent alerts, progress and the countdown.
 * Memoised so typing elsewhere never recomputes them.
 * @param {import('../state/plannerReducer.js').PlannerState} state Must contain a loaded plan.
 */
export function usePlanInsights({ event, plan, categories, spent, done }) {
  const budget = useMemo(() => summarizeBudget(categories, spent, event.budget), [categories, spent, event.budget]);
  const scheduled = useMemo(
    () => scheduleMilestones(plan.milestones, event.date, { done }),
    [plan.milestones, event.date, done],
  );
  const alerts = useMemo(() => priorityAlerts(scheduled), [scheduled]);
  const checklist = useMemo(() => progress(plan.milestones, done), [plan.milestones, done]);
  const days = daysUntil(event.date);
  return { budget, scheduled, alerts, checklist, days };
}
