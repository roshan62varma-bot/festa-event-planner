import { describe, expect, it } from 'vitest';
import { daysUntil, dueDate, priorityAlerts, progress, scheduleMilestones, taskStatus } from '../../shared/timeline.js';
import { guestSummaryForAI, planSeating, rsvpStats, validateGuest } from '../../shared/guests.js';
import { TODAY } from '../fixtures.js';

describe('timeline', () => {
  it('counts days and weeks back from the event', () => {
    expect(daysUntil('2026-10-27', TODAY)).toBe(7);
    expect(daysUntil('bad', TODAY)).toBeNaN();
    expect(dueDate('2026-12-31', 2)).toBe('2026-12-17');
    expect(dueDate('2026-03-01', 0)).toBe('2026-03-01');
  });

  it('classifies task status', () => {
    expect(taskStatus('2026-10-19', { today: TODAY })).toBe('overdue');
    expect(taskStatus('2026-10-25', { today: TODAY })).toBe('due-soon');
    expect(taskStatus('2026-12-01', { today: TODAY })).toBe('upcoming');
    expect(taskStatus('2026-10-01', { today: TODAY, done: true })).toBe('done');
  });

  const milestones = [
    { id: 'a', title: 'Late task', weeksBefore: 12, priority: 'high' },
    { id: 'b', title: 'Soon', weeksBefore: 4, priority: 'low' },
    { id: 'c', title: 'Same day high', weeksBefore: 4, priority: 'high' },
  ];

  it('compresses tasks whose ideal date has passed and sorts by date then priority', () => {
    const scheduled = scheduleMilestones(milestones, '2026-11-22', { today: TODAY });
    expect(scheduled.map((m) => m.id)).toEqual(['a', 'c', 'b']);
    expect(scheduled[0]).toMatchObject({ due: TODAY, compressed: true, status: 'due-soon' });
    expect(priorityAlerts(scheduled).map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('does not alert on finished tasks', () => {
    const scheduled = scheduleMilestones(milestones, '2026-11-22', { today: TODAY, done: { a: true, c: true } });
    expect(priorityAlerts(scheduled)).toEqual([]);
    expect(progress(milestones, { a: true })).toEqual({ total: 3, complete: 1, percent: 33 });
    expect(progress([], {})).toEqual({ total: 0, complete: 0, percent: 0 });
  });
});

describe('guests', () => {
  const guests = [
    { id: '1', name: 'Asha', group: 'Family', rsvp: 'attending', dietary: 'vegan', plusOnes: 1 },
    { id: '2', name: 'Ben', group: 'Family', rsvp: 'maybe', dietary: 'none', plusOnes: 0 },
    { id: '3', name: 'Chen', group: 'Work', rsvp: 'declined', dietary: 'halal', plusOnes: 0 },
    { id: '4', name: 'Dev', group: 'Work', rsvp: 'pending', dietary: 'jain', plusOnes: 0 },
  ];

  it('validates and normalises a guest', () => {
    expect(validateGuest({ name: '  ' }).ok).toBe(false);
    expect(validateGuest({ name: 'Zoe', plusOnes: 20 }).errors.plusOnes).toBeDefined();
    expect(validateGuest({ name: 'Zoe', rsvp: 'hacker', dietary: 'x' }).value).toEqual({
      name: 'Zoe',
      group: 'Friends',
      rsvp: 'pending',
      dietary: 'none',
      plusOnes: 0,
    });
  });

  it('counts parties including plus-ones', () => {
    const stats = rsvpStats(guests);
    expect(stats).toMatchObject({ invited: 5, attending: 2, maybe: 1, declined: 1, pending: 1, headcount: 2 });
    expect(stats.dietary).toEqual({ vegan: 2 });
  });

  it('builds an AI summary without any names', () => {
    const summary = guestSummaryForAI(guests);
    expect(JSON.stringify(summary)).not.toMatch(/Asha|Ben|Chen|Dev/);
    expect(summary).toEqual({ attending: 2, pending: 2, groups: 2, dietary: { vegan: 2 } });
  });

  it('seats groups together, skips declined guests and splits big groups', () => {
    const tables = planSeating(guests, 2);
    const seated = tables.flatMap((t) => t.seats.map((s) => s.name));
    expect(seated).not.toContain('Chen');
    expect(seated).toHaveLength(4);
    expect(tables.every((t) => t.seats.length <= 2)).toBe(true);
    // Asha and her plus-one share a table.
    expect(tables.find((t) => t.seats.some((s) => s.name === 'Asha')).seats.map((s) => s.name)).toContain('Asha +1');
  });

  it('packs small groups into shared tables and clamps table size', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      name: `G${i}`,
      group: `g${i % 3}`,
      rsvp: 'attending',
      dietary: 'none',
      plusOnes: 0,
    }));
    expect(planSeating(many, 6)).toHaveLength(1);
    expect(planSeating(many, 1).every((t) => t.seats.length <= 2)).toBe(true);
  });
});
