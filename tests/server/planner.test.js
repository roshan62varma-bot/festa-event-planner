import { describe, expect, it } from 'vitest';
import { createCache, cacheKey } from '../../server/lib/cache.js';
import { createPlanner } from '../../server/services/planner.js';
import { sanitizeCreative, sanitizePlan } from '../../server/services/sanitize.js';
import { buildFallbackCreative, buildFallbackPlan } from '../../server/services/fallback.js';
import { sumAmounts } from '../../shared/budget.js';
import { CREATIVE_KINDS } from '../../shared/constants.js';
import { TODAY, fakeAI, geminiPlan, silentLogger, validEvent } from '../fixtures.js';

const clock = () => new Date(`${TODAY}T10:00:00`);

describe('sanitizePlan', () => {
  const plan = sanitizePlan(geminiPlan(), validEvent, 12);

  it('makes the budget sum exactly to the host total', () => {
    expect(sumAmounts(plan.budget.categories)).toBe(validEvent.budget);
    expect(plan.budget.categories).toHaveLength(8);
    expect(plan.budget).toMatchObject({ currency: 'INR', total: 250000 });
  });

  it('drops empty items, fixes enums and assigns stable ids', () => {
    expect(plan.milestones.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(plan.milestones[1].priority).toBe('medium');
    expect(plan.runOfShow[1].time).toBe('');
  });

  it('clamps weeks to the time available', () => {
    expect(sanitizePlan(geminiPlan(), validEvent, 3).milestones[0].weeksBefore).toBe(3);
  });

  it('survives a completely wrong response', () => {
    const empty = sanitizePlan('lol', validEvent, 5);
    expect(empty.milestones).toEqual([]);
    expect(sumAmounts(empty.budget.categories)).toBe(validEvent.budget);
  });

  it('bounds creative output', () => {
    const result = sanitizeCreative({
      title: 'x',
      intro: 'y',
      items: Array.from({ length: 40 }, (_, i) => ({ heading: `h${i}`, body: 'b', tags: [1, 'a'] })),
    });
    expect(result.items).toHaveLength(12);
    expect(result.items[0].tags).toEqual(['a']);
  });
});

describe('fallback content', () => {
  it('plans within the time available and the budget', () => {
    const plan = buildFallbackPlan(validEvent, { maxWeeks: 4 });
    expect(Math.max(...plan.milestones.map((m) => m.weeksBefore))).toBe(4);
    expect(sumAmounts(plan.budget.categories)).toBe(validEvent.budget);
  });

  it('has starter ideas for every creative kind', () => {
    for (const { id } of CREATIVE_KINDS) {
      const ideas = buildFallbackCreative(validEvent, { kind: id });
      expect(ideas.items.length).toBeGreaterThan(0);
      expect(JSON.stringify(ideas)).not.toMatch(/\{name\}|\{date\}/);
    }
  });
});

describe('cache', () => {
  it('expires entries and evicts the least recently used', () => {
    let now = 0;
    const cache = createCache({ maxEntries: 2, ttlMs: 100, now: () => now });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    now = 500;
    expect(cache.get('a')).toBeUndefined();
  });

  it('builds stable keys', () => {
    expect(cacheKey('plan', { a: 1 })).toBe(cacheKey('plan', { a: 1 }));
    expect(cacheKey('plan', { a: 1 })).not.toBe(cacheKey('plan', { a: 2 }));
  });
});

describe('createPlanner', () => {
  it('generates both plan halves in parallel, merges them and caches them', async () => {
    const ai = fakeAI();
    const planner = createPlanner({ ai, clock, logger: silentLogger });
    const first = await planner.createPlan(validEvent);
    const second = await planner.createPlan(validEvent);
    expect(first).toMatchObject({ source: 'gemini', model: 'fake-model', cached: false });
    expect(Object.keys(first.plan).toSorted()).toEqual([
      'budget',
      'milestones',
      'runOfShow',
      'summary',
      'theme',
      'vendors',
      'watchouts',
    ]);
    expect(second.cached).toBe(true);
    expect(ai.calls).toHaveLength(2);
    expect(ai.calls.map((c) => Object.keys(c.schema.properties).length)).toEqual([4, 3]);
    expect(ai.calls[0].prompt).toContain('Asha turns 30');
  });

  it('marks the plan as partial when only one half comes from Gemini', async () => {
    const ai = fakeAI(({ schema }) => (schema.properties.summary ? geminiPlan() : {}));
    const result = await createPlanner({ ai, clock, logger: silentLogger }).createPlan(validEvent);
    expect(result.source).toBe('partial');
    expect(result.plan.summary).toBe(geminiPlan().summary);
    expect(result.plan.milestones.length).toBeGreaterThan(0); // From the template.
  });

  it('uses the template when Gemini fails, and does not cache the failure', async () => {
    const ai = fakeAI(new Error('down'));
    const planner = createPlanner({ ai, clock, logger: silentLogger });
    const result = await planner.createPlan(validEvent);
    expect(result.source).toBe('template');
    await planner.createPlan(validEvent);
    expect(ai.calls).toHaveLength(4);
  });

  it('uses the template when Gemini returns an empty plan', async () => {
    const planner = createPlanner({ ai: fakeAI({}), clock, logger: silentLogger });
    expect((await planner.createPlan(validEvent)).source).toBe('template');
  });

  it('works with no AI configured at all', async () => {
    const planner = createPlanner({ ai: null, clock, logger: silentLogger });
    expect((await planner.createIdeas(validEvent, { kind: 'playlist' })).source).toBe('template');
  });

  it('bypasses the cache when fresh ideas are requested', async () => {
    const ai = fakeAI({ title: 't', intro: 'i', items: [{ heading: 'h', body: 'b', tags: [] }] });
    const planner = createPlanner({ ai, clock, logger: silentLogger });
    const input = { kind: 'decor', tone: 'warm', vendorType: 'Venue', extra: '', guestSummary: null };
    await planner.createIdeas(validEvent, input);
    await planner.createIdeas(validEvent, input);
    await planner.createIdeas(validEvent, input, { fresh: true });
    expect(ai.calls).toHaveLength(2);
  });
});
