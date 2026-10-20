import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../../shared/budget.js';
import { parseSwatch } from '../lib/format.js';
import { Badge, SectionHeading } from './ui.jsx';

/** Alerts listed inline before pointing to the full timeline. */
const MAX_ALERTS_SHOWN = 3;

/**
 * @param {{ alerts: import('../../shared/types.js').ScheduledMilestone[], onOpen: (tab: string) => void }} props
 */
function AlertSummary({ alerts, onOpen }) {
  if (alerts.length === 0) {
    return (
      <div className="alert alert--success" role="note">
        <CheckCircle2 aria-hidden="true" size={20} />
        <p>No urgent tasks this week.</p>
      </div>
    );
  }
  return (
    <div className="alert alert--warning" role="note">
      <AlertTriangle aria-hidden="true" size={20} />
      <div>
        <p className="alert__title">
          {alerts.length === 1
            ? '1 high-priority task needs attention'
            : `${alerts.length} high-priority tasks need attention`}
        </p>
        <ul className="plain-list">
          {alerts.slice(0, MAX_ALERTS_SHOWN).map((task) => (
            <li key={task.id}>
              {task.title} <Badge tone={task.status} />
            </li>
          ))}
        </ul>
        <button type="button" className="link-button" onClick={() => onOpen('timeline')}>
          Open the timeline
        </button>
      </div>
    </div>
  );
}

/** @param {{ theme: import('../../shared/types.js').Plan['theme'] }} props */
function ThemeCard({ theme }) {
  return (
    <section aria-label="Theme" className="theme">
      <SectionHeading title={theme.name} description={theme.description} level={3} />
      <ul className="swatches" aria-label="Colour palette">
        {theme.palette.map((entry) => {
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
  );
}

/**
 * The first tab: summary, urgent tasks, theme, budget at a glance and risks.
 * @param {object} props
 * @param {import('../../shared/types.js').Plan} props.plan
 * @param {import('../../shared/types.js').EventBrief} props.event
 * @param {import('../../shared/types.js').ScheduledMilestone[]} props.alerts
 * @param {ReturnType<typeof import('../../shared/budget.js').summarizeBudget>} props.budget
 * @param {(tab: string) => void} props.onOpen Switches to another tab.
 */
export function OverviewPanel({ plan, event, alerts, budget, onOpen }) {
  const biggestLine = budget.rows.reduce((max, row) => (row.amount > max.amount ? row : max), budget.rows[0]);
  return (
    <div className="stack-lg">
      <h2 className="visually-hidden">Plan overview</h2>
      <div className="overview-lead">
        <p className="overview-lead__summary">{plan.summary}</p>
      </div>

      <AlertSummary alerts={alerts} onOpen={onOpen} />
      <ThemeCard theme={plan.theme} />

      <div className="overview-grid">
        <section aria-labelledby="ov-budget">
          <h3 id="ov-budget" className="h3">
            Budget at a glance
          </h3>
          <dl className="kv">
            <div>
              <dt>Total</dt>
              <dd>{formatMoney(budget.total, event.currency)}</dd>
            </div>
            <div>
              <dt>Per guest</dt>
              <dd>{formatMoney(budget.total / event.guests, event.currency)}</dd>
            </div>
            <div>
              <dt>Spent so far</dt>
              <dd>{formatMoney(budget.spent, event.currency)}</dd>
            </div>
            <div>
              <dt>Biggest line</dt>
              <dd>{biggestLine?.label}</dd>
            </div>
          </dl>
          <button type="button" className="link-button" onClick={() => onOpen('budget')}>
            Adjust the budget
          </button>
        </section>

        <section aria-labelledby="ov-watch">
          <h3 id="ov-watch" className="h3">
            Watch out for
          </h3>
          <ul className="bullet-list">
            {plan.watchouts.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
