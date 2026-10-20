// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import App from '../../src/App.jsx';
import { Tabs } from '../../src/components/Tabs.jsx';
import { parseSwatch } from '../../src/components/OverviewPanel.jsx';
import { matchVendorType } from '../../src/components/IdeasPanel.jsx';
import { sanitizePlan } from '../../server/services/sanitize.js';
import { geminiPlan, validEvent } from '../fixtures.js';

const plan = sanitizePlan(geminiPlan(), validEvent, 12);

function mockFetch(handler) {
  const fetchMock = vi.fn(async (url, init) => {
    const { status = 200, body } = await handler(url, JSON.parse(init.body));
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function expectNoAxeViolations(container) {
  // Colour contrast needs real layout, which jsdom does not provide; it is checked manually.
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
}

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fillAndSubmit(user) {
  await user.click(screen.getByRole('radio', { name: /birthday/i }));
  await user.type(screen.getByLabelText('Event name'), 'Asha turns 30');
  await user.type(screen.getByLabelText('Date'), futureDate(90));
  await user.type(screen.getByLabelText('Guests'), '60');
  await user.type(screen.getByLabelText('Total budget'), '250000');
  await user.click(screen.getByRole('button', { name: 'Create my plan' }));
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('planner form', () => {
  it('has no detectable accessibility violations', async () => {
    const { container } = render(<App />);
    await expectNoAxeViolations(container);
  });

  it('shows inline errors and focuses the first problem instead of calling the API', async () => {
    const fetchMock = mockFetch(() => ({ body: {} }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create my plan' }));
    expect(screen.getByText('Choose what you are celebrating.')).toBeInTheDocument();
    expect(screen.getByLabelText('Event name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: /wedding/i })).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('updates the headline as the event type changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: /tech meetup/i }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Plan a tech meetup that feels like yours.');
  });

  it('fills an example brief', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /example wedding/i }));
    expect(screen.getByLabelText('Event name')).toHaveValue('Priya & Arjun’s wedding');
  });

  it('shows the server error message when generation fails', async () => {
    mockFetch(() => ({ status: 429, body: { error: 'You are generating very quickly.' } }));
    const user = userEvent.setup();
    render(<App />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('You are generating very quickly.');
  });
});

describe('workspace', () => {
  async function openWorkspace() {
    const fetchMock = mockFetch((url, body) => {
      if (url === '/api/plan') return { body: { plan, source: 'gemini' } };
      return { body: { ideas: { title: 'Icebreakers', intro: 'Fun', items: [{ heading: 'Two truths', body: 'Share facts.', tags: ['10 min'] }] }, source: 'gemini', echo: body } };
    });
    const user = userEvent.setup();
    const view = render(<App />);
    await fillAndSubmit(user);
    await screen.findByRole('tablist', { name: 'Plan sections' });
    return { user, fetchMock, ...view };
  }

  it('renders the generated plan, saves it and passes an accessibility audit', async () => {
    const { container, fetchMock } = await openWorkspace();
    expect(fetchMock).toHaveBeenCalledWith('/api/plan', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).event).toMatchObject({ type: 'birthday', guests: 60, budget: 250000 });
    expect(screen.getByRole('heading', { level: 1, name: 'Asha turns 30' })).toHaveFocus();
    expect(screen.getByText('Plan written by Google Gemini')).toBeInTheDocument();
    expect(screen.getByText(plan.summary)).toBeInTheDocument();
    await expectNoAxeViolations(container);
    await waitFor(() => expect(window.localStorage.getItem('festa:v1')).toContain('Asha turns 30'));
  });

  it('ticks tasks off the timeline', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /timeline/i }));
    const panel = screen.getByRole('tabpanel', { name: /timeline/i });
    await user.click(within(panel).getByRole('checkbox', { name: 'Book the rooftop' }));
    expect(within(panel).getByText('1 of 2 done')).toBeInTheDocument();
  });

  it('logs spending and flags overspend', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /budget/i }));
    const spent = screen.getByLabelText('Spent on Venue');
    await user.clear(spent);
    await user.type(spent, '999999{Enter}');
    expect(screen.getByRole('tab', { name: /budget/i })).toHaveTextContent('1');
    expect(screen.getAllByText('Over budget').length).toBeGreaterThan(0);
  });

  it('adds guests and suggests seating', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /guests/i }));
    const form = screen.getByRole('form', { name: 'Add a guest' });
    await user.type(within(form).getByLabelText('Name'), 'Meera');
    await user.selectOptions(within(form).getByLabelText('RSVP'), 'attending');
    await user.selectOptions(within(form).getByLabelText('Dietary need'), 'vegan');
    await user.click(within(form).getByRole('button', { name: /add guest/i }));
    expect(screen.getByRole('rowheader', { name: /Meera/ })).toBeInTheDocument();
    expect(screen.getByText('Table 1')).toBeInTheDocument();
    expect(screen.getByText(/Tell your caterer: 1 vegan/)).toBeInTheDocument();
  });

  it('generates ideas through the API', async () => {
    const { user, fetchMock } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /ideas/i }));
    await user.click(screen.getByRole('radio', { name: 'Icebreakers' }));
    await user.click(screen.getByRole('button', { name: /generate icebreakers/i }));
    expect(await screen.findByRole('heading', { name: 'Two truths' })).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body).request.kind).toBe('icebreakers');
  });

  it('jumps from a vendor to a drafted enquiry', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /vendors/i }));
    await user.click(screen.getByRole('button', { name: /draft enquiry email/i }));
    expect(screen.getByRole('tab', { name: /ideas/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Vendor')).toHaveValue('DJ or band');
  });
});

describe('Tabs', () => {
  it('supports arrow, Home and End keys', async () => {
    const user = userEvent.setup();
    const tabs = ['a', 'b', 'c'].map((id) => ({ id, label: id.toUpperCase(), content: id }));
    function Harness() {
      const [active, setActive] = useState('a');
      return <Tabs label="Test" tabs={tabs} active={active} onChange={setActive} />;
    }
    render(<Harness />);
    screen.getByRole('tab', { name: 'A' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'B' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'C' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'A' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}{Home}');
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('tabindex', '0');
  });
});

describe('helpers', () => {
  it('parses palette swatches safely', () => {
    expect(parseSwatch('Marigold #F2A900')).toEqual({ name: 'Marigold', hex: '#F2A900' });
    expect(parseSwatch('Midnight')).toEqual({ name: 'Midnight', hex: null });
    expect(parseSwatch('red; background:url(x)')).toEqual({ name: 'red; background:url(x)', hex: null });
  });

  it('maps free-text vendor names to known vendor types', () => {
    expect(matchVendorType('Catering company')).toBe('Caterer');
    expect(matchVendorType('Wedding photographer')).toBe('Photographer');
    expect(matchVendorType('Something odd')).toBe('Venue');
  });
});

