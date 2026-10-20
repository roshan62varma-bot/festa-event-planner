import { useState } from 'react';
import { Printer } from 'lucide-react';
import { LIMITS } from '../../../shared/constants.js';
import { Button } from '../ui.jsx';

/**
 * Plain-language refinement of the whole plan, plus printing.
 * @param {object} props
 * @param {(refinement: string) => void} props.onRefine
 * @param {boolean} props.refining
 * @param {string} [props.error]
 */
export function PlanTools({ onRefine, refining, error }) {
  const [refinement, setRefinement] = useState('');
  const trimmed = refinement.trim();

  return (
    <section className="workspace__tools no-print" aria-label="Plan tools">
      <form
        className="refine"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onRefine(trimmed);
        }}
      >
        <label htmlFor="refine" className="field__label">
          Change something about the plan
        </label>
        <textarea
          id="refine"
          rows={3}
          value={refinement}
          maxLength={LIMITS.extraMax}
          onChange={(e) => setRefinement(e.target.value)}
          placeholder="Make it eco-friendly and cut 15% from decor"
          aria-describedby={error ? 'refine-error' : undefined}
        />
        {error && (
          <p id="refine-error" className="field__error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="secondary" busy={refining} disabled={!trimmed}>
          {refining ? 'Updating the plan' : 'Update the plan'}
        </Button>
      </form>

      <Button variant="ghost" size="sm" onClick={() => window.print()}>
        <Printer aria-hidden="true" size={16} /> Print or save as PDF
      </Button>
    </section>
  );
}
