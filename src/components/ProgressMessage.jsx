import { useEffect, useState } from 'react';

export const PROGRESS_STEPS = Object.freeze([
  'Reading your brief',
  'Splitting the budget across venue, food and decor',
  'Counting back the weeks to build your timeline',
  'Drafting the day-of schedule',
  'Listing vendors and the questions to ask them',
  'Final checks on the numbers',
]);

/** Matches the typical pace of a full plan, so the last step lands near the end. */
export const STEP_INTERVAL_MS = 6000;

/**
 * Walks through the stages Gemini is working on, so a long wait still feels like
 * progress. Mount it only while busy; it restarts from the first step each time.
 */
export function ProgressMessage() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)), STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return <>{`${PROGRESS_STEPS[step]}…`}</>;
}
