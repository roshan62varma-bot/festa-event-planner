import { describe, expect, it } from 'vitest';
import { hasPlan, initialState, plannerReducer, restoreState } from '../../src/state/plannerReducer.js';
import { actions } from '../../src/state/actions.js';
import { sanitizePlan } from '../../server/services/sanitize.js';
import { sumAmounts } from '../../shared/budget.js';
import { geminiPlan, validEvent } from '../fixtures.js';

const plan = sanitizePlan(geminiPlan(), validEvent, 12);
const loaded = plannerReducer(initialState, { type: 'plan/loaded', event: validEvent, plan, source: 'gemini' });

describe('hasPlan', () => {
  it('is true only once both the event and the plan are present', () => {
    expect(hasPlan(initialState)).toBe(false);
    expect(hasPlan({ ...initialState, plan })).toBe(false);
    expect(hasPlan(loaded)).toBe(true);
  });
});

describe('plannerReducer', () => {
  it('loads a plan and copies the budget categories', () => {
    expect(loaded.plan).toBe(plan);
    expect(loaded.categories).toHaveLength(8);
  });

  it('toggles tasks and vendors', () => {
    let s = plannerReducer(loaded, { type: 'task/toggled', id: 'm1' });
    expect(s.done.m1).toBe(true);
    s = plannerReducer(s, { type: 'task/toggled', id: 'm1' });
    expect(s.done.m1).toBe(false);
    expect(plannerReducer(loaded, { type: 'vendor/toggled', id: 'v0' }).booked.v0).toBe(true);
  });

  it('records planned and spent amounts as non-negative integers', () => {
    let s = plannerReducer(loaded, { type: 'budget/planned', id: 'venue', amount: '1234.6' });
    expect(s.categories.find((c) => c.id === 'venue').amount).toBe(1235);
    s = plannerReducer(s, { type: 'budget/spent', id: 'venue', amount: -50 });
    expect(s.spent.venue).toBe(0);
  });

  it('rebalances to a new total and ignores totals below the minimum', () => {
    const s = plannerReducer(loaded, { type: 'budget/rescaled', total: 100000 });
    expect(s.event.budget).toBe(100000);
    expect(sumAmounts(s.categories)).toBe(100000);
    expect(plannerReducer(loaded, { type: 'budget/rescaled', total: 5 })).toBe(loaded);
  });

  it('adds, updates and removes guests', () => {
    let s = plannerReducer(loaded, {
      type: 'guest/added',
      id: 'g1',
      guest: { name: 'Asha', group: 'Family', rsvp: 'pending', dietary: 'none', plusOnes: 0 },
    });
    s = plannerReducer(s, { type: 'guest/updated', id: 'g1', patch: { rsvp: 'attending' } });
    expect(s.guests[0]).toMatchObject({ id: 'g1', rsvp: 'attending' });
    s = plannerReducer(s, { type: 'guest/removed', id: 'g1' });
    expect(s.guests).toEqual([]);
  });

  it('keeps guests and spending when the same event is refined', () => {
    let s = plannerReducer(loaded, { type: 'guest/added', id: 'g1', guest: { name: 'Asha' } });
    s = plannerReducer(s, { type: 'budget/spent', id: 'venue', amount: 10 });
    s = plannerReducer(s, { type: 'task/toggled', id: 'm1' });
    const refined = plannerReducer(s, { type: 'plan/loaded', event: validEvent, plan, source: 'gemini' });
    expect(refined.guests).toHaveLength(1);
    expect(refined.spent.venue).toBe(10);
    expect(refined.done).toEqual({}); // Task ids belong to the old plan.
  });

  it('clamps table size, stores ideas and resets', () => {
    expect(plannerReducer(loaded, { type: 'seating/size', size: 99 }).tableSize).toBe(20);
    const s = plannerReducer(loaded, {
      type: 'ideas/loaded',
      kind: 'decor',
      ideas: { title: 't', items: [] },
      source: 'gemini',
    });
    expect(s.ideas.decor.source).toBe('gemini');
    expect(plannerReducer(s, { type: 'reset' })).toBe(initialState);
    expect(plannerReducer(s, { type: 'unknown' })).toBe(s);
  });
});

describe('restoreState', () => {
  it('restores saved state and rejects corrupt or foreign data', () => {
    expect(restoreState(JSON.stringify(loaded)).event.name).toBe(validEvent.name);
    expect(restoreState('{not json')).toBe(initialState);
    expect(restoreState(JSON.stringify({ hello: 'world' }))).toBe(initialState);
    expect(restoreState(null)).toBe(initialState);
  });

  it('drops unknown keys from tampered storage', () => {
    const restored = restoreState(JSON.stringify({ ...loaded, isAdmin: true, __proto__: { polluted: true } }));
    expect(restored).not.toHaveProperty('isAdmin');
    expect(Object.keys(restored).toSorted()).toEqual(Object.keys(initialState).toSorted());
    expect({}.polluted).toBeUndefined();
  });

  it('ignores a rebalance before any plan exists', () => {
    expect(plannerReducer(initialState, actions.budgetRescaled(5000))).toBe(initialState);
  });
});
