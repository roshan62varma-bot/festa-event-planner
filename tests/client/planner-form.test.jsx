// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App.jsx';
import { exampleBrief } from '../../src/components/PlannerForm.jsx';
import { validateEventInput } from '../../shared/validation.js';
import { expectNoAxeViolations, fillAndSubmit, mockFetch } from './helpers.jsx';

beforeEach(() => window.localStorage.clear());
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

  it('focuses the first invalid text field once the type is chosen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: /birthday/i }));
    await user.click(screen.getByRole('button', { name: 'Create my plan' }));
    expect(screen.getByLabelText('Event name')).toHaveFocus();
  });

  it('clears a field error as soon as the field is edited', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create my plan' }));
    await user.type(screen.getByLabelText('Event name'), 'A');
    expect(screen.getByLabelText('Event name')).not.toHaveAttribute('aria-invalid');
  });

  it('updates the headline as the event type changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: /tech meetup/i }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Plan a tech meetup that feels like yours.');
  });

  it('fills an example brief that always passes validation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /example wedding/i }));
    expect(screen.getByLabelText('Event name')).toHaveValue('Priya & Arjun’s wedding');
    expect(validateEventInput(exampleBrief()).ok).toBe(true);
  });

  it('applies a vibe suggestion', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Retro disco' }));
    expect(screen.getByLabelText(/Theme or vibe/)).toHaveValue('Retro disco');
    expect(screen.getByRole('button', { name: 'Retro disco' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows progress while the plan is being built', async () => {
    mockFetch(() => new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    render(<App />);
    await fillAndSubmit(user);
    expect(screen.getByRole('button', { name: /building your plan/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Reading your brief');
  });

  it('shows the server error message when generation fails', async () => {
    mockFetch(() => ({ status: 429, body: { error: 'You are generating very quickly.' } }));
    const user = userEvent.setup();
    render(<App />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('You are generating very quickly.');
  });

  it('shows field errors returned by the server', async () => {
    mockFetch(() => ({
      status: 400,
      body: { error: 'Check the highlighted fields.', fields: { date: 'Server says no.' } },
    }));
    const user = userEvent.setup();
    render(<App />);
    await fillAndSubmit(user);
    expect(await screen.findByText('Server says no.')).toBeInTheDocument();
  });
});
