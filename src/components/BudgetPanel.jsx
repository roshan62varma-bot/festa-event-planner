import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { formatMoney } from '../../shared/budget.js';
import { LIMITS } from '../../shared/constants.js';
import { Badge, Button, SectionHeading } from './ui.jsx';

export function BudgetPanel({ budget, currency, tips, dispatch }) {
  const [newTotal, setNewTotal] = useState(String(budget.total));
  const money = (n) => formatMoney(n, currency);
  const unallocated = budget.unallocated;

  return (
    <div className="stack-lg">
      <SectionHeading
        title="Budget"
        description="Planned amounts come from Gemini. Change any line, then log what you actually spend."
      />

      <div className="budget-totals">
        <Stat label="Total budget" value={money(budget.total)} />
        <Stat label="Spent" value={money(budget.spent)} />
        <Stat label="Left to spend" value={money(budget.remaining)} tone={budget.remaining < 0 ? 'danger' : undefined} />
      </div>

      <p className="visually-hidden" aria-live="polite">
        {budget.overCategories.length ? `Over budget in ${budget.overCategories.join(', ')}.` : ''}
      </p>
      {unallocated !== 0 && (
        <p className={`alert ${unallocated < 0 ? 'alert--error' : 'alert--info'}`} role="status">
          {unallocated < 0
            ? `Your lines add up to ${money(-unallocated)} more than the total budget.`
            : `${money(unallocated)} is not assigned to any line yet.`}
        </p>
      )}

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
                    <span className={`meter__fill meter__fill--${row.status}`} style={{ width: `${Math.min(100, row.ratio * 100)}%` }} />
                  </span>
                </th>
                <td>
                  <MoneyInput label={`Planned for ${row.label}`} value={row.amount} onCommit={(amount) => dispatch({ type: 'budget/planned', id: row.id, amount })} />
                </td>
                <td>
                  <MoneyInput label={`Spent on ${row.label}`} value={row.actual} onCommit={(amount) => dispatch({ type: 'budget/spent', id: row.id, amount })} />
                </td>
                <td><Badge tone={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'budget/rescaled', total: Number(newTotal) });
        }}
      >
        <label htmlFor="rescale" className="field__label">Change the total and keep the proportions</label>
        <div className="inline-form__row">
          <input id="rescale" type="number" inputMode="numeric" min={LIMITS.budgetMin} value={newTotal} onChange={(e) => setNewTotal(e.target.value)} />
          <Button type="submit" variant="secondary" disabled={Number(newTotal) < LIMITS.budgetMin}>Rebalance budget</Button>
        </div>
      </form>

      {tips.length > 0 && (
        <section aria-labelledby="tips-heading" className="tips">
          <h3 id="tips-heading" className="h3"><Lightbulb aria-hidden="true" size={18} /> Where to save</h3>
          <ul className="bullet-list">{tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}

/** Number input that only updates shared state when the user finishes editing. */
function MoneyInput({ label, value, onCommit }) {
  const [draft, setDraft] = useState(null);
  const commit = () => {
    if (draft !== null) onCommit(Number(draft));
    setDraft(null);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      min="0"
      className="money-input"
      aria-label={label}
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
    />
  );
}
