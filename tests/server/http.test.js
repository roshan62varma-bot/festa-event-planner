import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server/app.js';
import { loadConfig } from '../../server/config.js';
import { DEFAULT_MODELS } from '../../server/ai/gemini.js';
import { createPlanner } from '../../server/services/planner.js';
import { TODAY, fakeAI, silentLogger, validEvent } from '../fixtures.js';

const clock = () => new Date(`${TODAY}T10:00:00`);

/** Starts the app on a random port. */
async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

const defaultApp = (overrides = {}) =>
  createApp({
    planner: createPlanner({ ai: fakeAI(), clock, logger: silentLogger }),
    aiEnabled: true,
    clock,
    ...overrides,
  });

describe('loadConfig', () => {
  it('uses safe defaults', () => {
    expect(loadConfig({})).toEqual({
      port: 8787,
      apiKey: null,
      models: DEFAULT_MODELS,
      thinkingLevel: 'LOW',
      trustProxy: 1,
      rateLimitPerMinute: 15,
    });
  });

  it('reads and normalises environment values', () => {
    const config = loadConfig({
      PORT: '3000',
      GEMINI_API_KEY: '  key  ',
      GEMINI_MODELS: 'gemini-a, gemini-b ,',
      GEMINI_THINKING_LEVEL: 'medium',
      TRUST_PROXY: '2',
      RATE_LIMIT_PER_MINUTE: '30',
    });
    expect(config).toEqual({
      port: 3000,
      apiKey: 'key',
      models: ['gemini-a', 'gemini-b'],
      thinkingLevel: 'MEDIUM',
      trustProxy: 2,
      rateLimitPerMinute: 30,
    });
  });

  it('rejects invalid values instead of passing them on', () => {
    const config = loadConfig({
      PORT: 'abc',
      GEMINI_MODELS: 'bad model; rm -rf',
      GEMINI_THINKING_LEVEL: 'EXTREME',
      TRUST_PROXY: '-1',
    });
    expect(config).toMatchObject({ port: 8787, models: DEFAULT_MODELS, thinkingLevel: 'LOW', trustProxy: 1 });
  });
});

describe('request hardening', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await listen(defaultApp());
  });
  afterAll(() => ctx.server.close());

  it('only accepts JSON request bodies', async () => {
    const res = await fetch(`${ctx.base}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'event=1',
    });
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ error: 'Send the request as JSON.' });
  });

  it('switches off browser features the app never uses', async () => {
    const res = await fetch(`${ctx.base}/api/health`);
    const policy = res.headers.get('permissions-policy');
    for (const feature of ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()'])
      expect(policy).toContain(feature);
    expect(res.headers.get('strict-transport-security')).toMatch(/max-age=\d+/);
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('applies a general per-client rate limit to every API route', async () => {
    const res = await fetch(`${ctx.base}/api/health`);
    expect(res.headers.get('ratelimit-policy')).toMatch(/q=120; w=60/);
  });
});

describe('error handling', () => {
  it('hides internal errors behind a generic 500 and logs them', async () => {
    const logger = { error: vi.fn() };
    const planner = {
      createPlan: vi.fn().mockRejectedValue(new Error('database password is hunter2')),
      createIdeas: vi.fn(),
    };
    const ctx = await listen(createApp({ planner, aiEnabled: true, clock, logger }));
    try {
      const res = await fetch(`${ctx.base}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: validEvent }),
      });
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).not.toContain('hunter2');
      expect(JSON.parse(text)).toEqual({ error: 'Something went wrong on our side. Try again.' });
      expect(logger.error).toHaveBeenCalled();
    } finally {
      ctx.server.close();
    }
  });
});

describe('client serving', () => {
  let dir;
  let ctx;
  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'festa-dist-'));
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Festa</title>');
    writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
    writeFileSync(path.join(dir, 'favicon.svg'), '<svg/>');
    ctx = await listen(defaultApp({ staticDir: dir }));
  });
  afterAll(() => {
    ctx.server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('caches hashed assets for a year', async () => {
    const res = await fetch(`${ctx.base}/assets/app-abc123.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toMatch(/max-age=31536000.*immutable/);
  });

  it('serves the app shell for page routes, revalidated on every visit', async () => {
    const res = await fetch(`${ctx.base}/some/client/route`, { headers: { Accept: 'text/html' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(await res.text()).toContain('<title>Festa</title>');
  });

  it('serves other static files', async () => {
    const res = await fetch(`${ctx.base}/favicon.svg`);
    expect(await res.text()).toBe('<svg/>');
  });

  it('returns a JSON 404 for missing assets and non-page requests', async () => {
    const asset = await fetch(`${ctx.base}/assets/missing.js`);
    expect(asset.status).toBe(404);
    expect(await asset.json()).toEqual({ error: 'Not found.' });
    const nonPage = await fetch(`${ctx.base}/data.json`, { headers: { Accept: 'application/json' } });
    expect(nonPage.status).toBe(404);
  });

  it('does not serve the shell for writes', async () => {
    const res = await fetch(`${ctx.base}/anything`, { method: 'DELETE', headers: { Accept: 'text/html' } });
    expect(res.status).toBe(404);
  });
});
