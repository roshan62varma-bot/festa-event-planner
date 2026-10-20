import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.js';
import { createPlanner } from '../../server/services/planner.js';
import { TODAY, fakeAI, silentLogger, validEvent } from '../fixtures.js';

const clock = () => new Date(`${TODAY}T10:00:00`);

/** Starts the real HTTP stack on a random port with a fake Gemini. */
async function start(options = {}) {
  const app = createApp({
    planner: createPlanner({ ai: fakeAI(), clock, logger: silentLogger }),
    aiEnabled: true,
    clock,
    ...options,
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) =>
    fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { server, base, post };
}

describe('API', () => {
  let ctx;
  beforeAll(async () => { ctx = await start(); });
  afterAll(() => ctx.server.close());

  it('reports health and AI availability', async () => {
    const res = await fetch(`${ctx.base}/api/health`);
    expect(await res.json()).toEqual({ status: 'ok', ai: true });
  });

  it('sets security headers and hides the framework', async () => {
    const res = await fetch(`${ctx.base}/api/health`);
    expect(res.headers.get('content-security-policy')).toMatch(/default-src 'self'/);
    expect(res.headers.get('content-security-policy')).toMatch(/frame-ancestors 'none'/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('creates a plan for a valid brief', async () => {
    const res = await ctx.post('/api/plan', { event: validEvent });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('gemini');
    expect(body.plan.budget.total).toBe(validEvent.budget);
  });

  it('returns field errors for an invalid brief', async () => {
    const res = await ctx.post('/api/plan', { event: { ...validEvent, guests: -1, date: '2001-01-01' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Object.keys(body.fields).sort()).toEqual(['date', 'guests']);
  });

  it('generates ideas and validates the idea kind', async () => {
    const ok = await ctx.post('/api/ideas', { event: validEvent, request: { kind: 'icebreakers' } });
    expect(ok.status).toBe(200);
    const bad = await ctx.post('/api/ideas', { event: validEvent, request: { kind: 'exploit' } });
    expect(bad.status).toBe(400);
  });

  it('rejects malformed JSON without leaking internals', async () => {
    const res = await ctx.post('/api/plan', '{"event":');
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).not.toMatch(/at .*\.js|SyntaxError/);
  });

  it('rejects oversized bodies', async () => {
    const res = await ctx.post('/api/plan', { event: { ...validEvent, notes: 'x'.repeat(40_000) } });
    expect(res.status).toBe(413);
  });

  it('returns JSON 404s for unknown API routes', async () => {
    const res = await fetch(`${ctx.base}/api/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found.' });
  });
});

describe('rate limiting', () => {
  it('limits generation requests per client', async () => {
    const ctx = await start({ rateLimitPerMinute: 2 });
    try {
      const statuses = [];
      for (let i = 0; i < 3; i += 1) statuses.push((await ctx.post('/api/plan', { event: validEvent })).status);
      expect(statuses).toEqual([200, 200, 429]);
    } finally {
      ctx.server.close();
    }
  });
});
