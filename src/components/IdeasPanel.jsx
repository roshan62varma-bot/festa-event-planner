import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { CREATIVE_KINDS, INVITE_TONES, LIMITS, VENDOR_TYPES } from '../../shared/constants.js';
import { IdeaResults } from './ideas/IdeaResults.jsx';
import { Button, EmptyState, Field, SectionHeading } from './ui.jsx';

/** @typedef {import('../../shared/types.js').CreativeRequest} CreativeRequest */

const capitalise = (/** @type {string} */ s) => s[0].toUpperCase() + s.slice(1);

/**
 * The creative studio. The kind and vendor are controlled by the workspace so
 * other tabs can deep-link here (e.g. "Draft enquiry email" on a vendor).
 * @param {object} props
 * @param {string} props.kind One of CREATIVE_KINDS ids.
 * @param {(kind: string) => void} props.onKindChange
 * @param {string} props.vendorType
 * @param {(vendorType: string) => void} props.onVendorTypeChange
 * @param {Record<string, import('../../shared/types.js').Ideas>} props.ideas Latest result per kind.
 * @param {boolean} props.busy
 * @param {string} props.error
 * @param {(request: Omit<CreativeRequest, 'guestSummary'>, regenerate: boolean) => void} props.onGenerate
 */
export function IdeasPanel({ kind, onKindChange, vendorType, onVendorTypeChange, ideas, busy, error, onGenerate }) {
  const [tone, setTone] = useState('warm');
  const [extra, setExtra] = useState('');
  const current = CREATIVE_KINDS.find((k) => k.id === kind);
  const result = ideas[kind];

  return (
    <div className="stack-lg">
      <SectionHeading
        title="Ideas studio"
        description="Ask Gemini for decor, music, games, invitations and vendor emails written for this event."
      />

      <fieldset className="kind-picker">
        <legend className="field__label">What do you need?</legend>
        <div className="chips">
          {CREATIVE_KINDS.map((k) => (
            <label key={k.id} className="chip chip--radio">
              <input
                type="radio"
                name="idea-kind"
                value={k.id}
                checked={kind === k.id}
                onChange={() => onKindChange(k.id)}
              />
              {k.label}
            </label>
          ))}
        </div>
        <p className="field__hint">{current?.hint}</p>
      </fieldset>

      <form
        className="idea-form"
        onSubmit={(e) => {
          e.preventDefault();
          // Asking again for a kind that already has results bypasses the cache for fresh ideas.
          onGenerate({ kind, tone, vendorType, extra }, Boolean(result));
        }}
      >
        {kind === 'invite' && (
          <Field label="Tone">
            {(props) => (
              <select {...props} value={tone} onChange={(e) => setTone(e.target.value)}>
                {INVITE_TONES.map((t) => (
                  <option key={t} value={t}>
                    {capitalise(t)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        {kind === 'vendor-email' && (
          <Field label="Vendor">
            {(props) => (
              <select {...props} value={vendorType} onChange={(e) => onVendorTypeChange(e.target.value)}>
                {VENDOR_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Anything to steer it?" optional className="idea-form__extra">
          {(props) => (
            <input
              {...props}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              maxLength={LIMITS.extraMax}
              placeholder="Bollywood and 90s pop, nothing too slow"
            />
          )}
        </Field>
        <Button type="submit" busy={busy}>
          {result ? <RefreshCw aria-hidden="true" size={18} /> : <Sparkles aria-hidden="true" size={18} />}
          {result ? 'Generate new ideas' : `Generate ${current?.label.toLowerCase()}`}
        </Button>
      </form>

      <div aria-live="polite" aria-busy={busy}>
        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
        {result && <IdeaResults result={result} />}
        {!result && !busy && (
          <EmptyState title="Nothing generated yet">
            Pick an idea type and press generate. Results stay here while you explore other tabs.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
