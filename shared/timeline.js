import { isValidISODate, toISODate } from './validation.js';

/** @typedef {import('./types.js').Milestone} Milestone */
/** @typedef {import('./types.js').ScheduledMilestone} ScheduledMilestone */
/** @typedef {import('./types.js').TaskStatus} TaskStatus */

const DAY_MS = 86_400_000;
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/** Tasks due within this many days are flagged as "due soon". */
export const DUE_SOON_DAYS = 7;

/**
 * Parses YYYY-MM-DD as a local date (never UTC), so day maths ignores time zones.
 * @param {string} iso
 */
function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Whole days from `today` until `eventDate` (negative once the date has passed).
 * @param {string} eventDate
 * @param {string} [today]
 * @returns {number} NaN if either date is invalid.
 */
export function daysUntil(eventDate, today = toISODate(new Date())) {
  if (!isValidISODate(eventDate) || !isValidISODate(today)) return NaN;
  return Math.round((parseISO(eventDate).getTime() - parseISO(today).getTime()) / DAY_MS);
}

/**
 * The date a task is due, `weeksBefore` weeks ahead of the event.
 * @param {string} eventDate
 * @param {number} weeksBefore
 * @returns {string} ISO date.
 */
export function dueDate(eventDate, weeksBefore) {
  const date = parseISO(eventDate);
  date.setDate(date.getDate() - Math.round(Math.max(0, weeksBefore) * 7));
  return toISODate(date);
}

/**
 * Status of one milestone relative to today.
 * @param {string} due ISO date.
 * @param {{ done?: boolean, today?: string }} [options]
 * @returns {TaskStatus}
 */
export function taskStatus(due, { done = false, today = toISODate(new Date()) } = {}) {
  if (done) return 'done';
  const days = daysUntil(due, today);
  if (days < 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'due-soon';
  return 'upcoming';
}

/**
 * Attaches due dates and statuses, then orders milestones by due date and priority.
 * Tasks whose ideal date has already passed are due today (a compressed timeline).
 * @param {Milestone[]} milestones
 * @param {string} eventDate
 * @param {{ done?: Record<string, boolean>, today?: string }} [options]
 * @returns {ScheduledMilestone[]}
 */
export function scheduleMilestones(milestones, eventDate, { done = {}, today = toISODate(new Date()) } = {}) {
  return milestones
    .map((m) => {
      const ideal = dueDate(eventDate, m.weeksBefore);
      const compressed = ideal < today && !done[m.id];
      const due = compressed ? today : ideal;
      return { ...m, due, compressed, status: taskStatus(due, { done: Boolean(done[m.id]), today }) };
    })
    .toSorted((a, b) => a.due.localeCompare(b.due) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/**
 * High-priority tasks that need attention now, for the alert banner and tab badge.
 * @param {ScheduledMilestone[]} scheduled
 */
export function priorityAlerts(scheduled) {
  return scheduled.filter((m) => m.priority === 'high' && (m.status === 'overdue' || m.status === 'due-soon'));
}

/**
 * @param {Milestone[]} milestones
 * @param {Record<string, boolean>} [done]
 * @returns {{ total: number, complete: number, percent: number }}
 */
export function progress(milestones, done = {}) {
  const total = milestones.length;
  const complete = milestones.filter((m) => done[m.id]).length;
  return { total, complete, percent: total ? Math.round((complete / total) * 100) : 0 };
}
