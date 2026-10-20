// @vitest-environment jsdom
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoneyInput } from '../../src/components/MoneyInput.jsx';
import { Tabs } from '../../src/components/Tabs.jsx';
import { CopyButton, COPIED_FEEDBACK_MS } from '../../src/components/ideas/CopyButton.jsx';
import { SeatingPlan } from '../../src/components/guests/SeatingPlan.jsx';
import { ProgressMessage, PROGRESS_STEPS, STEP_INTERVAL_MS } from '../../src/components/ProgressMessage.jsx';
import { EventSummary } from '../../src/components/workspace/EventSummary.jsx';
import { Badge, Button, Field } from '../../src/components/ui.jsx';
import { validEvent } from '../fixtures.js';

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
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'C' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('tabindex', '0');
  });

  it('ignores other keys and labels attention counts', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs label="T" active="a" onChange={onChange} tabs={[{ id: 'a', label: 'A', count: 2, content: 'x' }]} />);
    screen.getByRole('tab').focus();
    await user.keyboard('x');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('2 need attention')).toBeInTheDocument();
  });
});

describe('MoneyInput', () => {
  it('commits on blur and on Enter, not while typing', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<MoneyInput label="Spent" value={10} onCommit={onCommit} />);
    const input = screen.getByLabelText('Spent');
    await user.clear(input);
    await user.type(input, '250');
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(250);
    await user.type(input, '{Backspace}9{Enter}');
    expect(onCommit).toHaveBeenLastCalledWith(19);
  });

  it('does not commit when nothing changed', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<MoneyInput label="Spent" value={10} onCommit={onCommit} />);
    await user.click(screen.getByLabelText('Spent'));
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('CopyButton', () => {
  it('resets the confirmation after a moment', async () => {
    vi.useFakeTimers();
    try {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      });
      render(<CopyButton text="hello" label="greeting" />);
      await act(async () => screen.getByRole('button', { name: 'Copy greeting' }).click());
      expect(screen.getByRole('button', { name: 'Copied greeting' })).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(COPIED_FEEDBACK_MS));
      expect(screen.getByRole('button', { name: 'Copy greeting' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays usable when clipboard access is denied', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    render(<CopyButton text="hello" label="greeting" />);
    await act(async () => screen.getByRole('button', { name: 'Copy greeting' }).click());
    expect(screen.getByRole('button', { name: 'Copy greeting' })).toBeInTheDocument();
  });
});

describe('ProgressMessage', () => {
  it('advances through the stages and stops at the last one', () => {
    vi.useFakeTimers();
    try {
      render(<ProgressMessage />);
      expect(screen.getByText(`${PROGRESS_STEPS[0]}…`)).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(STEP_INTERVAL_MS));
      expect(screen.getByText(`${PROGRESS_STEPS[1]}…`)).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(STEP_INTERVAL_MS * 20));
      expect(screen.getByText(`${PROGRESS_STEPS.at(-1)}…`)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('SeatingPlan', () => {
  it('lists guests who share a name without key clashes', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seat = { name: 'Sam', group: 'A', dietary: 'vegan' };
    render(
      <SeatingPlan
        tables={[{ number: 1, seats: [seat, { ...seat, dietary: 'none' }] }]}
        tableSize={4}
        onTableSizeChange={() => {}}
      />,
    );
    expect(screen.getAllByText('Sam')).toHaveLength(2);
    expect(screen.getByText(', Vegan')).toBeInTheDocument();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('reports table size changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SeatingPlan tables={[]} tableSize={8} onTableSizeChange={onChange} />);
    await user.type(screen.getByLabelText('Seats per table'), '0');
    expect(onChange).toHaveBeenLastCalledWith('80');
  });
});

describe('EventSummary', () => {
  it.each([
    ['gemini', 'Plan written by Google Gemini'],
    ['partial', /Partly written by Gemini/],
    ['template', /Starter template/],
    ['unexpected', /Starter template/],
  ])('labels a %s plan honestly', (source, text) => {
    render(<EventSummary event={validEvent} source={source} days={3} percentDone={40} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByText('3 days to go')).toBeInTheDocument();
    expect(screen.getByText('40% done')).toBeInTheDocument();
  });
});

describe('ui primitives', () => {
  it('wires hints and errors to the control', () => {
    render(
      <Field label="Name" hint="Your full name" error="Required">
        {(props) => <input {...props} />}
      </Field>,
    );
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAccessibleDescription('Your full name Required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables busy buttons and announces it', () => {
    render(<Button busy>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
  });

  it('gives every badge tone a text label', () => {
    render(<Badge tone="due-soon" />);
    expect(screen.getByText('Due this week')).toBeInTheDocument();
  });
});
