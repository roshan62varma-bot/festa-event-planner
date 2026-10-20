import { useRef, useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { createPlan } from './api.js';
import { PlannerForm } from './components/PlannerForm.jsx';
import { Workspace } from './components/Workspace.jsx';
import { usePlanner } from './hooks/usePlanner.js';

export default function App() {
  const [state, dispatch] = usePlanner();
  const [request, setRequest] = useState({ busy: false, error: '', fields: {}, refining: false });
  const abortRef = useRef(null);

  async function requestPlan(event, refinement = '') {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRequest({ busy: true, error: '', fields: {}, refining: Boolean(refinement) });
    try {
      const { plan, source } = await createPlan(event, refinement, { signal: controller.signal });
      dispatch({ type: 'plan/loaded', event, plan, source });
      setRequest({ busy: false, error: '', fields: {}, refining: false });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setRequest({ busy: false, error: err.message, fields: err.fields ?? {}, refining: false });
    }
  }

  function startOver() {
    if (window.confirm('Start a new event? Your current plan, budget and guest list will be cleared.')) {
      abortRef.current?.abort();
      dispatch({ type: 'reset' });
      setRequest({ busy: false, error: '', fields: {}, refining: false });
    }
  }

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="site-header__inner">
          <a href="/" className="brand" aria-label="Festa home">
            <PartyPopper aria-hidden="true" size={22} strokeWidth={1.8} />
            <span>Festa</span>
          </a>
          {state.plan && (
            <button type="button" className="btn btn--ghost btn--sm no-print" onClick={startOver}>New event</button>
          )}
        </div>
      </header>

      <main id="main" className="main">
        {state.plan ? (
          <Workspace
            state={state}
            dispatch={dispatch}
            onRefine={(text) => requestPlan(state.event, text)}
            refining={request.busy && request.refining}
            refineError={request.error}
          />
        ) : (
          <PlannerForm onSubmit={(event) => requestPlan(event)} busy={request.busy} serverErrors={request.fields} error={request.error} />
        )}
      </main>

      <footer className="site-footer no-print">
        <p>Festa uses Google Gemini to draft plans. Check prices and bookings with your vendors before paying.</p>
      </footer>
    </>
  );
}
