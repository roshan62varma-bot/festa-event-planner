import { expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import App from '../../src/App.jsx';
import { sanitizePlan } from '../../server/services/sanitize.js';
import { geminiPlan, validEvent } from '../fixtures.js';

/** A sanitised plan, exactly as the API would return it. */
export const plan = sanitizePlan(geminiPlan(), validEvent, 12);

export const sampleIdeas = {
  title: 'Icebreakers',
  intro: 'Fun',
  items: [{ heading: 'Two truths', body: 'Share facts.', tags: ['10 min'] }],
};

/**
 * Replaces fetch with a handler receiving (url, parsedBody) and returning { status?, body }.
 * @param {(url: string, body: any) => { status?: number, body: unknown } | Promise<{ status?: number, body: unknown }>} handler
 */
export function mockFetch(handler) {
  const fetchMock = vi.fn(async (url, init) => {
    const { status = 200, body } = await handler(url, JSON.parse(init.body));
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Parsed JSON body of the n-th fetch call (default: the last one). */
export const sentBody = (fetchMock, n = -1) => JSON.parse(fetchMock.mock.calls.at(n)[1].body);

/** Fails with the list of axe violations, if any. */
export async function expectNoAxeViolations(container) {
  // Colour contrast needs real layout, which jsdom does not provide; it is checked in the browser.
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
}

export function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function fillAndSubmit(user) {
  await user.click(screen.getByRole('radio', { name: /birthday/i }));
  await user.type(screen.getByLabelText('Event name'), 'Asha turns 30');
  await user.type(screen.getByLabelText('Date'), futureDate(90));
  await user.type(screen.getByLabelText('Guests'), '60');
  await user.type(screen.getByLabelText('Total budget'), '250000');
  await user.click(screen.getByRole('button', { name: 'Create my plan' }));
}

/** Renders the app, submits a brief against a mocked API and waits for the workspace. */
export async function openWorkspace({ ideas = sampleIdeas } = {}) {
  const fetchMock = mockFetch((url) =>
    url === '/api/plan' ? { body: { plan, source: 'gemini' } } : { body: { ideas, source: 'gemini' } },
  );
  const user = userEvent.setup();
  const view = render(<App />);
  await fillAndSubmit(user);
  await screen.findByRole('tablist', { name: 'Plan sections' });
  return { user, fetchMock, ...view };
}
