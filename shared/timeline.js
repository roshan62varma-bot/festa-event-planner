import { isValidISODate, toISODate } from './validation.js';

const DAY_MS = 86_400_000;
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from `today` until `eventDate` (negative once the date has passed). */
export function daysUntil(eventDate, today = toISODate(new Date())) {
  if (!isValidISODate(eventDate) || !isValidISODate(today)) return NaN;
  return Math.round((parseISO(eventDate) - parseISO(today)) / DAY_MS);
}

/** The date a task is due, `weeksBefore` weeks ahead of the event. */
export function dueDate(eventDate, weeksBefore) {
  const date = parseISO(eventDate);
  date.setDate(date.getDate() - Math.round(Math.max(0, weeksBefore) * 7));
  return toISODate(date);
}

/**
 * Status of one milestone relative to today.
 * Tasks due before today count as "overdue", and tasks due within 7 days count as "due-soon".
 */
export function taskStatus(due, { done = false, today = toISODate(new Date()) } = {}) {
  if (done) return 'done';
  const days = daysUntil(due, today);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due-soon';
  return 'upcoming';
}

/**
 * Attaches due dates and statuses, then orders milestones by due date and priority.
 * Tasks whose ideal date has already passed are given a due date of today (compressed timeline).
 */
export function scheduleMilestones(milestones, eventDate, { done = {}, today = toISODate(new Date()) } = {}) {
  return milestones
    .map((m) => {
      const ideal = dueDate(eventDate, m.weeksBefore);
      const compressed = ideal < today && !done[m.id];
      const due = compressed ? today : ideal;
      return { ...m, due, compressed, status: taskStatus(due, { done: Boolean(done[m.id]), today }) };
    })
    .sort((a, b) => a.due.localeCompare(b.due) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/** High-priority tasks that need attention now, for the alert banner. */
export function priorityAlerts(scheduled) {
  return scheduled.filter((m) => m.priority === 'high' && (m.status === 'overdue' || m.status === 'due-soon'));
}

export function progress(milestones, done = {}) {
  const total = milestones.length;
  const complete = milestones.filter((m) => done[m.id]).length;
  return { total, complete, percent: total ? Math.round((complete / total) * 100) : 0 };
}
