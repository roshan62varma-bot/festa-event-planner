// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import App from '../../src/App.jsx';
import { STORAGE_KEY } from '../../src/state/plannerReducer.js';
import { formatMoney } from '../../shared/budget.js';
import { expectNoAxeViolations, openWorkspace, plan, sentBody } from './helpers.jsx';
import { validEvent } from '../fixtures.js';

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function addGuest(user, { name, rsvp = 'attending', dietary = 'none', group }) {
  const form = screen.getByRole('form', { name: 'Add a guest' });
  await user.type(within(form).getByLabelText('Name'), name);
  if (group) {
    await user.clear(within(form).getByLabelText('Group'));
    await user.type(within(form).getByLabelText('Group'), group);
  }
  await user.selectOptions(within(form).getByLabelText('RSVP'), rsvp);
  await user.selectOptions(within(form).getByLabelText('Dietary need'), dietary);
  await user.click(within(form).getByRole('button', { name: /add guest/i }));
}

describe('workspace', () => {
  it('renders the generated plan, saves it and passes an accessibility audit', async () => {
    const { container, fetchMock } = await openWorkspace();
    expect(sentBody(fetchMock, 0).event).toMatchObject({ type: 'birthday', guests: 60, budget: 250000 });
    expect(screen.getByRole('heading', { level: 1, name: 'Asha turns 30' })).toHaveFocus();
    expect(screen.getByText('Plan written by Google Gemini')).toBeInTheDocument();
    expect(screen.getByText(plan.summary)).toBeInTheDocument();
    await expectNoAxeViolations(container);
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toContain('Asha turns 30'));
  });

  it('restores a saved plan on reload', async () => {
    const saved = { event: validEvent, plan, source: 'template', categories: plan.budget.categories };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: validEvent.name })).toBeInTheDocument();
    expect(screen.getByText(/Starter template/)).toBeInTheDocument();
  });

  it('ticks tasks off the timeline and filters them', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /timeline/i }));
    const panel = screen.getByRole('tabpanel', { name: /timeline/i });
    await user.click(within(panel).getByRole('checkbox', { name: 'Book the rooftop' }));
    expect(within(panel).getByText('1 of 2 done')).toBeInTheDocument();
    expect(within(panel).queryByRole('checkbox', { name: 'Book the rooftop' })).not.toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Everything' }));
    expect(within(panel).getByRole('checkbox', { name: 'Book the rooftop' })).toBeChecked();
    await user.click(within(panel).getByRole('button', { name: 'High priority' }));
    expect(within(panel).queryByRole('checkbox', { name: 'Send invites' })).not.toBeInTheDocument();
  });

  it('logs spending, flags overspend and rebalances the total', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /budget/i }));
    const spent = screen.getByLabelText('Spent on Venue');
    await user.clear(spent);
    await user.type(spent, '999999{Enter}');
    expect(screen.getByRole('tab', { name: /budget/i })).toHaveTextContent('1');
    expect(screen.getAllByText('Over budget').length).toBeGreaterThan(0);

    const total = screen.getByLabelText('Change the total and keep the proportions');
    await user.clear(total);
    await user.type(total, '100000');
    await user.click(screen.getByRole('button', { name: 'Rebalance budget' }));
    const summary = screen.getByRole('complementary', { name: 'Event summary' });
    expect(within(summary).getByText(formatMoney(100000, 'INR'))).toBeInTheDocument();
  });

  it('marks vendors as booked', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /vendors/i }));
    await user.click(screen.getByRole('checkbox', { name: /mark dj as booked/i }));
    expect(screen.getByText('1 of 1 booked. Ask these questions before you pay a deposit.')).toBeInTheDocument();
  });

  it('adds, edits and removes guests and suggests seating', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /guests/i }));
    await addGuest(user, { name: 'Meera', dietary: 'vegan' });
    expect(screen.getByRole('rowheader', { name: /Meera/ })).toBeInTheDocument();
    expect(screen.getByText('Table 1')).toBeInTheDocument();
    expect(screen.getByText(/Tell your caterer: 1 vegan/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Meera added.');

    await user.selectOptions(screen.getByLabelText('RSVP for Meera'), 'declined');
    expect(screen.queryByText('Table 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Meera' }));
    expect(screen.getByText('No guests yet')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Meera removed.');
  });

  it('generates ideas through the API and asks for fresh ones on regenerate', async () => {
    const { user, fetchMock } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /ideas/i }));
    await user.click(screen.getByRole('radio', { name: 'Icebreakers' }));
    await user.click(screen.getByRole('button', { name: /generate icebreakers/i }));
    expect(await screen.findByRole('heading', { name: 'Two truths' })).toBeInTheDocument();
    expect(sentBody(fetchMock)).toMatchObject({ request: { kind: 'icebreakers' }, regenerate: false });

    await user.click(screen.getByRole('button', { name: /generate new ideas/i }));
    await waitFor(() => expect(sentBody(fetchMock).regenerate).toBe(true));
  });

  it('sends only anonymous guest counts for activity ideas', async () => {
    const { user, fetchMock } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /guests/i }));
    await addGuest(user, { name: 'Meera Secret', dietary: 'jain' });
    await user.click(screen.getByRole('tab', { name: /ideas/i }));
    await user.click(screen.getByRole('radio', { name: 'Guest activities' }));
    await user.click(screen.getByRole('button', { name: /generate guest activities/i }));
    await screen.findByRole('heading', { name: 'Two truths' });
    const body = sentBody(fetchMock);
    expect(body.request.guestSummary).toEqual({ attending: 1, pending: 0, groups: 1, dietary: { jain: 1 } });
    expect(JSON.stringify(body)).not.toContain('Meera');
  });

  it('copies an idea to the clipboard', async () => {
    const { user } = await openWorkspace();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await user.click(screen.getByRole('tab', { name: /ideas/i }));
    await user.click(screen.getByRole('button', { name: /generate decor concepts/i }));
    await user.click(await screen.findByRole('button', { name: 'Copy Two truths' }));
    expect(writeText).toHaveBeenCalledWith('Two truths\n\nShare facts.');
    expect(screen.getByRole('button', { name: 'Copied Two truths' })).toBeInTheDocument();
  });

  it('shows an error when idea generation fails', async () => {
    const { user, fetchMock } = await openWorkspace();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Gemini is busy.' }), { status: 500 }));
    await user.click(screen.getByRole('tab', { name: /ideas/i }));
    await user.click(screen.getByRole('button', { name: /generate decor concepts/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gemini is busy.');
  });

  it('jumps from a vendor to a drafted enquiry', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /vendors/i }));
    await user.click(screen.getByRole('button', { name: /draft enquiry email/i }));
    expect(screen.getByRole('tab', { name: /ideas/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Vendor')).toHaveValue('DJ or band');
  });

  it('opens the invitation writer from the guests tab', async () => {
    const { user } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /guests/i }));
    await user.click(screen.getByRole('button', { name: 'Write the invitation' }));
    expect(screen.getByRole('radio', { name: 'Invitation wording' })).toBeChecked();
    expect(screen.getByLabelText('Tone')).toBeInTheDocument();
  });

  it('refines the plan and keeps the guest list', async () => {
    const { user, fetchMock } = await openWorkspace();
    await user.click(screen.getByRole('tab', { name: /guests/i }));
    await addGuest(user, { name: 'Meera' });
    await user.type(screen.getByLabelText('Change something about the plan'), 'Make it eco-friendly');
    await user.click(screen.getByRole('button', { name: 'Update the plan' }));
    await waitFor(() => expect(sentBody(fetchMock).refinement).toBe('Make it eco-friendly'));
    await user.click(await screen.findByRole('tab', { name: /guests/i }));
    expect(screen.getByRole('rowheader', { name: /Meera/ })).toBeInTheDocument();
  });

  it('starts over only after confirmation', async () => {
    const { user } = await openWorkspace();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: 'New event' }));
    expect(screen.getByRole('tablist', { name: 'Plan sections' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New event' }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Create my plan' })).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull());
  });

  it('prints the plan', async () => {
    const { user } = await openWorkspace();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: /print or save as pdf/i }));
    expect(print).toHaveBeenCalled();
  });
});
