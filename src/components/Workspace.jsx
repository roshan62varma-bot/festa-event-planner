import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck, LayoutDashboard, Lightbulb, ListChecks, Printer, Store, Users, Wallet } from 'lucide-react';
import { summarizeBudget, formatMoney } from '../../shared/budget.js';
import { EVENT_TYPES, LIMITS } from '../../shared/constants.js';
import { guestSummaryForAI } from '../../shared/guests.js';
import { daysUntil, priorityAlerts, progress, scheduleMilestones } from '../../shared/timeline.js';
import { createIdeas } from '../api.js';
import { BudgetPanel } from './BudgetPanel.jsx';
import { GuestsPanel } from './GuestsPanel.jsx';
import { IdeasPanel, matchVendorType } from './IdeasPanel.jsx';
import { OverviewPanel } from './OverviewPanel.jsx';
import { Tabs } from './Tabs.jsx';
import { TimelinePanel, formatDate } from './TimelinePanel.jsx';
import { VendorsPanel } from './VendorsPanel.jsx';
import { Button } from './ui.jsx';

const SOURCE_LABELS = {
  gemini: 'Plan written by Google Gemini',
  partial: 'Partly written by Gemini. Some sections use the starter template because Gemini was busy. Update the plan to retry.',
  template: 'Starter template. Gemini was unavailable, so this plan uses proven defaults.',
};

function countdownText(days) {
  if (days > 1) return `${days} days to go`;
  if (days === 1) return 'Tomorrow';
  if (days === 0) return 'Today';
  return 'Event has passed';
}

export function Workspace({ state, dispatch, onRefine, refining, refineError }) {
  const { event, plan, categories, spent, done, booked, guests, tableSize, ideas, source } = state;
  const [tab, setTab] = useState('overview');
  const [ideaKind, setIdeaKind] = useState('decor');
  const [vendorType, setVendorType] = useState('Venue');
  const [ideaState, setIdeaState] = useState({ busy: false, error: '' });
  const [refinement, setRefinement] = useState('');
  const headingRef = useRef(null);
  const ideasAbort = useRef(null);

  // Move focus to the plan heading when a new plan arrives, so screen readers announce it.
  // oxlint-disable-next-line react/exhaustive-deps -- re-run intentionally whenever the plan object changes
  useEffect(() => headingRef.current?.focus(), [plan]);
  useEffect(() => () => ideasAbort.current?.abort(), []);

  const budget = useMemo(() => summarizeBudget(categories, spent, event.budget), [categories, spent, event.budget]);
  const scheduled = useMemo(() => scheduleMilestones(plan.milestones, event.date, { done }), [plan.milestones, event.date, done]);
  const alerts = useMemo(() => priorityAlerts(scheduled), [scheduled]);
  const checklist = progress(plan.milestones, done);
  const days = daysUntil(event.date);
  const typeLabel = EVENT_TYPES.find((t) => t.id === event.type)?.label;

  async function generateIdeas(request, regenerate) {
    ideasAbort.current?.abort();
    const controller = new AbortController();
    ideasAbort.current = controller;
    setIdeaState({ busy: true, error: '' });
    try {
      const payload = request.kind === 'activities' && guests.length ? { ...request, guestSummary: guestSummaryForAI(guests) } : request;
      const res = await createIdeas(event, payload, regenerate, { signal: controller.signal });
      dispatch({ type: 'ideas/loaded', kind: request.kind, ideas: res.ideas, source: res.source });
      setIdeaState({ busy: false, error: '' });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setIdeaState({ busy: false, error: err.message });
    }
  }

  const openIdeas = (kind, vendor) => {
    setIdeaKind(kind);
    if (vendor) setVendorType(matchVendorType(vendor));
    setTab('ideas');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard aria-hidden="true" size={18} />, content: <OverviewPanel plan={plan} event={event} alerts={alerts} budget={budget} onOpen={setTab} /> },
    { id: 'budget', label: 'Budget', icon: <Wallet aria-hidden="true" size={18} />, count: budget.overCategories.length, content: <BudgetPanel budget={budget} currency={event.currency} tips={plan.budget.savingsTips} dispatch={dispatch} /> },
    { id: 'timeline', label: 'Timeline', icon: <ListChecks aria-hidden="true" size={18} />, count: alerts.length, content: <TimelinePanel scheduled={scheduled} progress={checklist} runOfShow={plan.runOfShow} done={done} dispatch={dispatch} /> },
    { id: 'vendors', label: 'Vendors', icon: <Store aria-hidden="true" size={18} />, content: <VendorsPanel vendors={plan.vendors} eventDate={event.date} booked={booked} dispatch={dispatch} onDraftEmail={(type) => openIdeas('vendor-email', type)} /> },
    { id: 'guests', label: 'Guests', icon: <Users aria-hidden="true" size={18} />, content: <GuestsPanel guests={guests} tableSize={tableSize} expected={event.guests} dispatch={dispatch} onWriteInvite={() => openIdeas('invite')} /> },
    {
      id: 'ideas',
      label: 'Ideas',
      icon: <Lightbulb aria-hidden="true" size={18} />,
      content: (
        <IdeasPanel
          kind={ideaKind}
          onKindChange={setIdeaKind}
          vendorType={vendorType}
          onVendorTypeChange={setVendorType}
          ideas={ideas}
          busy={ideaState.busy}
          error={ideaState.error}
          onGenerate={generateIdeas}
        />
      ),
    },
  ];

  return (
    <div className="workspace">
      <aside className="summary" aria-label="Event summary">
        <p className="summary__type">{typeLabel}</p>
        <h1 className="summary__title" ref={headingRef} tabIndex={-1}>{event.name}</h1>
        <p className="summary__countdown"><CalendarCheck aria-hidden="true" size={18} /> {countdownText(days)}</p>
        <dl className="kv kv--compact">
          <div><dt>Date</dt><dd><time dateTime={event.date}>{formatDate(event.date)}</time></dd></div>
          {event.location && <div><dt>Where</dt><dd>{event.location}</dd></div>}
          <div><dt>Guests</dt><dd>{event.guests}</dd></div>
          <div><dt>Budget</dt><dd>{formatMoney(event.budget, event.currency)}</dd></div>
          <div><dt>Checklist</dt><dd>{checklist.percent}% done</dd></div>
        </dl>
        <p className={`source source--${source}`}>
          {SOURCE_LABELS[source] ?? SOURCE_LABELS.template}
        </p>
      </aside>

      <section className="workspace__tools no-print" aria-label="Plan tools">
        <form
          className="refine"
          onSubmit={(e) => {
            e.preventDefault();
            if (refinement.trim()) onRefine(refinement.trim());
          }}
        >
          <label htmlFor="refine" className="field__label">Change something about the plan</label>
          <textarea
            id="refine"
            rows={3}
            value={refinement}
            maxLength={LIMITS.extraMax}
            onChange={(e) => setRefinement(e.target.value)}
            placeholder="Make it eco-friendly and cut 15% from decor"
            aria-describedby={refineError ? 'refine-error' : undefined}
          />
          {refineError && <p id="refine-error" className="field__error" role="alert">{refineError}</p>}
          <Button type="submit" variant="secondary" busy={refining} disabled={!refinement.trim()}>
            {refining ? 'Updating the plan' : 'Update the plan'}
          </Button>
        </form>

        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden="true" size={16} /> Print or save as PDF
        </Button>
      </section>

      <div className="workspace__main">
        <Tabs label="Plan sections" tabs={tabs} active={tab} onChange={setTab} />
      </div>
    </div>
  );
}
