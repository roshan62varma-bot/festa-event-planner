import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Lightbulb, ListChecks, Store, Users, Wallet } from 'lucide-react';
import { guestSummaryForAI } from '../../shared/guests.js';
import { createIdeas } from '../api.js';
import { useLatestRequest } from '../hooks/useLatestRequest.js';
import { usePlanInsights } from '../hooks/usePlanInsights.js';
import { matchVendorType } from '../lib/format.js';
import { actions } from '../state/actions.js';
import { BudgetPanel } from './BudgetPanel.jsx';
import { GuestsPanel } from './GuestsPanel.jsx';
import { IdeasPanel } from './IdeasPanel.jsx';
import { OverviewPanel } from './OverviewPanel.jsx';
import { Tabs } from './Tabs.jsx';
import { TimelinePanel } from './TimelinePanel.jsx';
import { VendorsPanel } from './VendorsPanel.jsx';
import { EventSummary } from './workspace/EventSummary.jsx';
import { PlanTools } from './workspace/PlanTools.jsx';

const ICON_SIZE = 18;

/**
 * The plan workspace: event summary and tools on the left, six tabs on the right.
 * @param {object} props
 * @param {import('../state/plannerReducer.js').LoadedPlannerState} props.state
 * @param {import('../state/actions.js').Dispatch} props.dispatch
 * @param {(refinement: string) => void} props.onRefine
 * @param {boolean} props.refining
 * @param {string} [props.refineError]
 */
export function Workspace({ state, dispatch, onRefine, refining, refineError }) {
  const { event, plan, done, booked, guests, tableSize, ideas, source } = state;
  const [tab, setTab] = useState('overview');
  const [ideaKind, setIdeaKind] = useState('decor');
  const [vendorType, setVendorType] = useState('Venue');
  const ideasRequest = useLatestRequest();
  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const { budget, scheduled, alerts, checklist, days } = usePlanInsights(state);

  // Move focus to the plan heading whenever a new plan arrives, so screen readers announce it.
  // oxlint-disable-next-line react/exhaustive-deps -- re-run intentionally whenever the plan object changes
  useEffect(() => headingRef.current?.focus(), [plan]);

  /**
   * @param {Omit<import('../../shared/types.js').CreativeRequest, 'guestSummary'>} request
   * @param {boolean} regenerate
   */
  async function generateIdeas(request, regenerate) {
    // Activity ideas are tailored to the guest mix, using anonymous counts only.
    const payload =
      request.kind === 'activities' && guests.length
        ? { ...request, guestSummary: guestSummaryForAI(guests) }
        : request;
    const res = await ideasRequest.run((signal) => createIdeas(event, payload, regenerate, { signal }));
    if (res) dispatch(actions.ideasLoaded(request.kind, res.ideas, res.source));
  }

  /** @param {string} kind @param {string} [vendor] */
  function openIdeas(kind, vendor) {
    setIdeaKind(kind);
    if (vendor) setVendorType(matchVendorType(vendor));
    setTab('ideas');
  }

  /** @type {import('./Tabs.jsx').TabDefinition[]} */
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard aria-hidden="true" size={ICON_SIZE} />,
      content: <OverviewPanel plan={plan} event={event} alerts={alerts} budget={budget} onOpen={setTab} />,
    },
    {
      id: 'budget',
      label: 'Budget',
      icon: <Wallet aria-hidden="true" size={ICON_SIZE} />,
      count: budget.overCategories.length,
      content: (
        <BudgetPanel budget={budget} currency={event.currency} tips={plan.budget.savingsTips} dispatch={dispatch} />
      ),
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: <ListChecks aria-hidden="true" size={ICON_SIZE} />,
      count: alerts.length,
      content: (
        <TimelinePanel
          scheduled={scheduled}
          progress={checklist}
          runOfShow={plan.runOfShow}
          done={done}
          dispatch={dispatch}
        />
      ),
    },
    {
      id: 'vendors',
      label: 'Vendors',
      icon: <Store aria-hidden="true" size={ICON_SIZE} />,
      content: (
        <VendorsPanel
          vendors={plan.vendors}
          eventDate={event.date}
          booked={booked}
          dispatch={dispatch}
          onDraftEmail={(type) => openIdeas('vendor-email', type)}
        />
      ),
    },
    {
      id: 'guests',
      label: 'Guests',
      icon: <Users aria-hidden="true" size={ICON_SIZE} />,
      content: (
        <GuestsPanel
          guests={guests}
          tableSize={tableSize}
          expected={event.guests}
          dispatch={dispatch}
          onWriteInvite={() => openIdeas('invite')}
        />
      ),
    },
    {
      id: 'ideas',
      label: 'Ideas',
      icon: <Lightbulb aria-hidden="true" size={ICON_SIZE} />,
      content: (
        <IdeasPanel
          kind={ideaKind}
          onKindChange={setIdeaKind}
          vendorType={vendorType}
          onVendorTypeChange={setVendorType}
          ideas={ideas}
          busy={ideasRequest.busy}
          error={ideasRequest.error}
          onGenerate={generateIdeas}
        />
      ),
    },
  ];

  return (
    <div className="workspace">
      <EventSummary ref={headingRef} event={event} source={source} days={days} percentDone={checklist.percent} />
      <PlanTools onRefine={onRefine} refining={refining} error={refineError} />
      <div className="workspace__main">
        <Tabs label="Plan sections" tabs={tabs} active={tab} onChange={setTab} />
      </div>
    </div>
  );
}
