import { useState } from 'react';
import { Check, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { CREATIVE_KINDS, INVITE_TONES, LIMITS, VENDOR_TYPES } from '../../shared/constants.js';
import { Button, EmptyState, Field, SectionHeading } from './ui.jsx';

/** Maps a free-text vendor name from the plan ("Catering company") to a known vendor type. */
export function matchVendorType(type = '') {
  const lower = type.toLowerCase();
  return VENDOR_TYPES.find((v) => lower.includes(v.toLowerCase().split(' ')[0].slice(0, 5))) ?? VENDOR_TYPES[0];
}

export function IdeasPanel({ kind, onKindChange, vendorType, onVendorTypeChange, ideas, busy, error, onGenerate }) {
  const [tone, setTone] = useState('warm');
  const [extra, setExtra] = useState('');
  const current = CREATIVE_KINDS.find((k) => k.id === kind);
  const result = ideas[kind];

  const generate = (regenerate) => onGenerate({ kind, tone, vendorType, extra }, regenerate);

  return (
    <div className="stack-lg">
      <SectionHeading title="Ideas studio" description="Ask Gemini for decor, music, games, invitations and vendor emails written for this event." />

      <fieldset className="kind-picker">
        <legend className="field__label">What do you need?</legend>
        <div className="chips">
          {CREATIVE_KINDS.map((k) => (
            <label key={k.id} className="chip chip--radio">
              <input type="radio" name="idea-kind" value={k.id} checked={kind === k.id} onChange={() => onKindChange(k.id)} />
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
          generate(Boolean(result));
        }}
      >
        {kind === 'invite' && (
          <Field label="Tone">
            {(props) => (
              <select {...props} value={tone} onChange={(e) => setTone(e.target.value)}>
                {INVITE_TONES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select>
            )}
          </Field>
        )}
        {kind === 'vendor-email' && (
          <Field label="Vendor">
            {(props) => (
              <select {...props} value={vendorType} onChange={(e) => onVendorTypeChange(e.target.value)}>
                {VENDOR_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
          </Field>
        )}
        <Field label="Anything to steer it?" optional className="idea-form__extra">
          {(props) => <input {...props} value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={LIMITS.extraMax} placeholder="Bollywood and 90s pop, nothing too slow" />}
        </Field>
        <Button type="submit" busy={busy}>
          {result ? <RefreshCw aria-hidden="true" size={18} /> : <Sparkles aria-hidden="true" size={18} />}
          {result ? 'Generate new ideas' : `Generate ${current?.label.toLowerCase()}`}
        </Button>
      </form>

      <div aria-live="polite" aria-busy={busy}>
        {error && <p className="alert alert--error" role="alert">{error}</p>}
        {result ? (
          <IdeaResults result={result} />
        ) : (
          !busy && <EmptyState title="Nothing generated yet">Pick an idea type and press generate. Results stay here while you explore other tabs.</EmptyState>
        )}
      </div>
    </div>
  );
}

function IdeaResults({ result }) {
  return (
    <section className="stack" aria-label={result.title}>
      <div>
        <h3 className="h3">{result.title}</h3>
        <p className="muted">{result.intro}</p>
      </div>
      <ul className="idea-list">
        {result.items.map((item) => (
          <li key={item.heading} className="idea">
            <div className="idea__head">
              <h4 className="idea__title">{item.heading}</h4>
              <CopyButton text={`${item.heading}\n\n${item.body}`} label={item.heading} />
            </div>
            <p className="idea__body">{item.body}</p>
            {item.tags.length > 0 && (
              <ul className="tags" aria-label="Tags">{item.tags.map((t) => <li key={t}>{t}</li>)}</ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button type="button" className="icon-button" onClick={copy} aria-label={copied ? `Copied ${label}` : `Copy ${label}`}>
      {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
    </button>
  );
}
