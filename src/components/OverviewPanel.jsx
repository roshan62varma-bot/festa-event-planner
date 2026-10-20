import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../../shared/budget.js';
import { Badge, SectionHeading } from './ui.jsx';

const HEX = /#[0-9a-f]{6}\b/i;

/** Splits "Marigold #F2A900" into a display name and a safe hex colour (or null). */
export function parseSwatch(entry) {
  const hex = entry.match(HEX)?.[0] ?? null;
  const name = entry.replace(HEX, '').trim() || hex || entry;
  return { name, hex };
}

export function OverviewPanel({ plan, event, alerts, budget, onOpen }) {
  return (
    <div className="stack-lg">
      <h2 className="visually-hidden">Plan overview</h2>
      <div className="overview-lead">
        <p className="overview-lead__summary">{plan.summary}</p>
      </div>

      {alerts.length > 0 ? (
        <div className="alert alert--warning" role="note">
          <AlertTriangle aria-hidden="true" size={20} />
          <div>
            <p className="alert__title">{alerts.length === 1 ? '1 high-priority task needs attention' : `${alerts.length} high-priority tasks need attention`}</p>
            <ul className="plain-list">
              {alerts.slice(0, 3).map((task) => <li key={task.id}>{task.title} <Badge tone={task.status} /></li>)}
            </ul>
            <button type="button" className="link-button" onClick={() => onOpen('timeline')}>Open the timeline</button>
          </div>
        </div>
      ) : (
        <div className="alert alert--success" role="note">
          <CheckCircle2 aria-hidden="true" size={20} />
          <p>No urgent tasks this week.</p>
        </div>
      )}

      <section aria-label="Theme" className="theme">
        <SectionHeading title={plan.theme.name} description={plan.theme.description} level={3} />
        <ul className="swatches" aria-label="Colour palette">
          {plan.theme.palette.map((entry) => {
            const { name, hex } = parseSwatch(entry);
            return (
              <li key={entry} className="swatch">
                <span className="swatch__chip" style={hex ? { backgroundColor: hex } : undefined} aria-hidden="true" />
                <span>{name}</span>
                {hex && <span className="swatch__hex">{hex}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="overview-grid">
        <section aria-labelledby="ov-budget">
          <h3 id="ov-budget" className="h3">Budget at a glance</h3>
          <dl className="kv">
            <div><dt>Total</dt><dd>{formatMoney(budget.total, event.currency)}</dd></div>
            <div><dt>Per guest</dt><dd>{formatMoney(budget.total / event.guests, event.currency)}</dd></div>
            <div><dt>Spent so far</dt><dd>{formatMoney(budget.spent, event.currency)}</dd></div>
            <div><dt>Biggest line</dt><dd>{[...budget.rows].sort((a, b) => b.amount - a.amount)[0]?.label}</dd></div>
          </dl>
          <button type="button" className="link-button" onClick={() => onOpen('budget')}>Adjust the budget</button>
        </section>

        <section aria-labelledby="ov-watch">
          <h3 id="ov-watch" className="h3">Watch out for</h3>
          <ul className="bullet-list">
            {plan.watchouts.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
