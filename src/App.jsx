import { PartyPopper } from 'lucide-react';
import { createPlan } from './api.js';
import { PlannerForm } from './components/PlannerForm.jsx';
import { Workspace } from './components/Workspace.jsx';
import { useLatestRequest } from './hooks/useLatestRequest.js';
import { usePlanner } from './hooks/usePlanner.js';
import { actions } from './state/actions.js';
import { hasPlan } from './state/plannerReducer.js';

const RESET_CONFIRMATION = 'Start a new event? Your current plan, budget and guest list will be cleared.';

/** App shell: the brief form until a plan exists, then the workspace. */
export default function App() {
  const [state, dispatch] = usePlanner();
  const planRequest = useLatestRequest();

  /**
   * Creates a plan, or refines the current one when `refinement` is given.
   * @param {import('../shared/types.js').EventBrief} event
   * @param {string} [refinement]
   */
  async function requestPlan(event, refinement = '') {
    const res = await planRequest.run((signal) => createPlan(event, refinement, { signal }));
    if (res) dispatch(actions.planLoaded(event, res.plan, res.source));
  }

  function startOver() {
    if (!window.confirm(RESET_CONFIRMATION)) return;
    planRequest.cancel();
    dispatch(actions.reset());
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <a href="/" className="brand" aria-label="Festa home">
            <PartyPopper aria-hidden="true" size={22} strokeWidth={1.8} />
            <span>Festa</span>
          </a>
          {hasPlan(state) && (
            <button type="button" className="btn btn--ghost btn--sm no-print" onClick={startOver}>
              New event
            </button>
          )}
        </div>
      </header>

      <main id="main" className="main">
        {hasPlan(state) ? (
          <Workspace
            state={state}
            dispatch={dispatch}
            onRefine={(text) => requestPlan(state.event, text)}
            refining={planRequest.busy}
            refineError={planRequest.error}
          />
        ) : (
          <PlannerForm
            onSubmit={(event) => requestPlan(event)}
            busy={planRequest.busy}
            serverErrors={planRequest.fields}
            error={planRequest.error}
          />
        )}
      </main>

      <footer className="site-footer no-print">
        <p>Festa uses Google Gemini to draft plans. Check prices and bookings with your vendors before paying.</p>
      </footer>
    </>
  );
}
