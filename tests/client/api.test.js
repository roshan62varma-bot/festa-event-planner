import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createIdeas, createPlan } from '../../src/api.js';
import { validEvent } from '../fixtures.js';

afterEach(() => vi.unstubAllGlobals());

const respond = (body, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })),
  );

describe('api client', () => {
  it('posts JSON and returns the parsed response', async () => {
    respond({ plan: { summary: 'ok' }, source: 'gemini' });
    await expect(createPlan(validEvent, '')).resolves.toEqual({ plan: { summary: 'ok' }, source: 'gemini' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/plan');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(init.body)).toEqual({ event: validEvent, refinement: '' });
  });

  it('sends idea requests with the regenerate flag', async () => {
    respond({ ideas: {}, source: 'template' });
    await createIdeas(validEvent, { kind: 'decor' }, true);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ request: { kind: 'decor' }, regenerate: true });
  });

  it('turns API errors into ApiError with status and field messages', async () => {
    respond({ error: 'Check the highlighted fields.', fields: { date: 'Too early' } }, 400);
    const err = await createPlan(validEvent, '').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ message: 'Check the highlighted fields.', status: 400, fields: { date: 'Too early' } });
  });

  it('uses a generic message when the error body has none', async () => {
    respond({}, 500);
    await expect(createPlan(validEvent, '')).rejects.toThrow('Something went wrong. Try again.');
  });

  it('explains when something other than the API answered', async () => {
    respond('<html>Bad gateway</html>', 502);
    await expect(createPlan(validEvent, '')).rejects.toThrow(/Could not reach the Festa server/);
  });

  it('explains network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(createPlan(validEvent, '')).rejects.toThrow(/Check your connection/);
  });

  it('times out slow requests with a clear message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
      ),
    );
    await expect(createPlan(validEvent, '', { timeoutMs: 5 })).rejects.toThrow(/taking longer than usual/);
  });

  it('re-throws caller aborts unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (url, { signal }) =>
          new Promise((_, reject) =>
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
          ),
      ),
    );
    const controller = new AbortController();
    const pending = createPlan(validEvent, '', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
