import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { formatMoney } from '../../shared/budget.js';
import { LIMITS } from '../../shared/constants.js';
import { actions } from '../state/actions.js';
import { MoneyInput } from './MoneyInput.jsx';
import { Badge, Button, SectionHeading, Stat } from './ui.jsx';

/** @typedef {ReturnType<typeof import('../../shared/budget.js').summarizeBudget>} BudgetSummary */

/**
 * Explains a mismatch between the category lines and the total, if there is one.
 * @param {{ unallocated: number, money: (n: number) => string }} props
 */
function AllocationNotice({ unallocated, money }) {
  if (unallocated === 0) return null;
  const over = unallocated < 0;
  return (
    <p className={`alert ${over ? 'alert--error' : 'alert--info'}`} role="status">
      {over
        ? `Your lines add up to ${money(-unallocated)} more than the total budget.`
        : `${money(unallocated)} is not assigned to any line yet.`}
    </p>
  );
}

/**
 * Scales every line to a new total while keeping the proportions.
 * @param {{ total: number, onRescale: (total: number) => void }} props
 */
function RescaleForm({ total, onRescale }) {
  const [value, setValue] = useState(String(total));
  const valid = Number(value) >= LIMITS.budgetMin;
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onRescale(Number(value));
      }}
    >
      <label htmlFor="rescale" className="field__label">
        Change the total and keep the proportions
      </label>
      <div className="inline-form__row">
        <input
          id="rescale"
          type="number"
          inputMode="numeric"
          min={LIMITS.budgetMin}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!valid}>
          Rebalance budget
        </Button>
      </div>
    </form>
  );
}

/**
 * Planned versus actual spend per category, with alerts and savings tips.
 * All maths runs locally; no AI call is needed to edit or rebalance.
 * @param {object} props
 * @param {BudgetSummary} props.budget
 * @param {string} props.currency
 * @param {string[]} props.tips Gemini's savings suggestions.
 * @param {import('../state/actions.js').Dispatch} props.dispatch
 */
export function BudgetPanel({ budget, currency, tips, dispatch }) {
  /** @param {number} n */
  const money = (n) => formatMoney(n, currency);

  return (
    <div className="stack-lg">
      <SectionHeading
        title="Budget"
        description="Planned amounts come from Gemini. Change any line, then log what you actually spend."
      />

      <div className="budget-totals">
        <Stat label="Total budget" value={money(budget.total)} />
        <Stat label="Spent" value={money(budget.spent)} />
        <Stat
          label="Left to spend"
          value={money(budget.remaining)}
          tone={budget.remaining < 0 ? 'danger' : undefined}
        />
      </div>

      <p className="visually-hidden" aria-live="polite">
        {budget.overCategories.length ? `Over budget in ${budget.overCategories.join(', ')}.` : ''}
      </p>
      <AllocationNotice unallocated={budget.unallocated} money={money} />

      <div className="table-wrap">
        <table className="budget-table">
          <caption className="visually-hidden">Budget by category: planned, spent and status</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Planned</th>
              <th scope="col">Spent</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {budget.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  <span className="budget-table__label">{row.label}</span>
                  {row.rationale && <span className="budget-table__why">{row.rationale}</span>}
                  <span className="meter" aria-hidden="true">
                    <span
                      className={`meter__fill meter__fill--${row.status}`}
                      style={{ width: `${Math.min(100, row.ratio * 100)}%` }}
                    />
                  </span>
                </th>
                <td>
                  <MoneyInput
                    label={`Planned for ${row.label}`}
                    value={row.amount}
                    onCommit={(amount) => dispatch(actions.budgetPlanned(row.id, amount))}
                  />
                </td>
                <td>
                  <MoneyInput
                    label={`Spent on ${row.label}`}
                    value={row.actual}
                    onCommit={(amount) => dispatch(actions.budgetSpent(row.id, amount))}
                  />
                </td>
                <td>
                  <Badge tone={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RescaleForm total={budget.total} onRescale={(total) => dispatch(actions.budgetRescaled(total))} />

      {tips.length > 0 && (
        <section aria-labelledby="tips-heading" className="tips">
          <h3 id="tips-heading" className="h3">
            <Lightbulb aria-hidden="true" size={18} /> Where to save
          </h3>
          <ul className="bullet-list">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
