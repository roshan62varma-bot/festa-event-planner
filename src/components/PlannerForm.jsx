import { useEffect, useRef, useState } from 'react';
import { CURRENCIES, EVENT_TYPES, LIMITS } from '../../shared/constants.js';
import { toISODate, validateEventInput } from '../../shared/validation.js';
import { EventTypePicker } from './EventTypePicker.jsx';
import { ProgressMessage } from './ProgressMessage.jsx';
import { Button, Field } from './ui.jsx';

/** @typedef {import('../../shared/types.js').EventBrief} EventBrief */
/** @typedef {Record<keyof EventBrief, string>} BriefForm Raw form values, always strings. */

const VIBES = ['Boho garden', 'Black-tie elegant', 'Retro disco', 'Eco-friendly and minimal', 'Festive and colourful'];

/** @type {BriefForm} */
const EMPTY = {
  type: '',
  name: '',
  date: '',
  guests: '',
  budget: '',
  currency: 'INR',
  location: '',
  vibe: '',
  notes: '',
};

/** Days ahead the example wedding is set, comfortably inside a normal planning window. */
const EXAMPLE_LEAD_DAYS = 120;

/** A realistic brief for demos, dated relative to today so it is always valid. @returns {BriefForm} */
export function exampleBrief() {
  const date = new Date();
  date.setDate(date.getDate() + EXAMPLE_LEAD_DAYS);
  return {
    type: 'wedding',
    name: 'Priya & Arjun’s wedding',
    date: toISODate(date),
    guests: '180',
    budget: '1500000',
    currency: 'INR',
    location: 'Jaipur, India',
    vibe: 'Marigold and pastel, modern Rajasthani',
    notes: 'Many vegetarian and Jain guests. Grandparents use wheelchairs.',
  };
}

/**
 * The event brief. Validates with the same rules as the server, shows errors
 * inline and moves focus to the first problem.
 * @param {object} props
 * @param {(event: EventBrief) => void} props.onSubmit Called with the validated brief.
 * @param {boolean} props.busy
 * @param {Record<string, string>} [props.serverErrors] Field errors returned by the API.
 * @param {string} [props.error] Form-level error message.
 */
export function PlannerForm({ onSubmit, busy, serverErrors = {}, error }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [today] = useState(() => toISODate(new Date()));
  const formRef = useRef(/** @type {HTMLFormElement | null} */ (null));
  const shownErrors = { ...serverErrors, ...errors };
  const typePhrase = EVENT_TYPES.find((t) => t.id === form.type)?.phrase ?? 'a celebration';

  /** @param {keyof BriefForm} field */
  const update = (field) => (/** @type {{ target: { value: string } }} */ event) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    if (errors[field]) setErrors(({ [field]: _removed, ...rest }) => rest);
  };

  // After a failed submit renders, move focus to the first invalid control
  // so keyboard and screen reader users land directly on the problem.
  useEffect(() => {
    if (!failedAttempts) return;
    const first = formRef.current?.querySelector('[aria-invalid="true"]');
    const target = first?.tagName === 'FIELDSET' ? first.querySelector('input') : first;
    if (target instanceof HTMLElement) target.focus();
  }, [failedAttempts]);

  /** @param {import('react').FormEvent} event */
  function handleSubmit(event) {
    event.preventDefault();
    const result = validateEventInput(form);
    setErrors(result.errors);
    if (!result.ok) {
      setFailedAttempts((n) => n + 1);
      return;
    }
    onSubmit(result.value);
  }

  function fillExample() {
    setForm(exampleBrief());
    setErrors({});
  }

  return (
    <div className="hero">
      <div className="hero__intro">
        <h1 className="hero__title">Plan {typePhrase} that feels like yours.</h1>
        <p className="hero__lede">
          Tell Festa what you are celebrating. In under a minute you get a budget split, a week-by-week timeline, a
          day-of schedule and a vendor checklist, all built around your guests and your money.
        </p>
        <Button variant="ghost" onClick={fillExample} disabled={busy}>
          Fill in an example wedding
        </Button>
      </div>

      <form
        ref={formRef}
        className="planner-form"
        onSubmit={handleSubmit}
        noValidate
        aria-describedby={error ? 'form-error' : undefined}
      >
        <EventTypePicker value={form.type} onChange={update('type')} error={shownErrors.type} />

        <div className="form-grid">
          <Field label="Event name" error={shownErrors.name} className="span-2">
            {(props) => (
              <input
                {...props}
                value={form.name}
                onChange={update('name')}
                maxLength={LIMITS.nameMax}
                autoComplete="off"
                placeholder="Asha turns 30"
              />
            )}
          </Field>
          <Field label="Date" error={shownErrors.date}>
            {(props) => <input {...props} type="date" value={form.date} min={today} onChange={update('date')} />}
          </Field>
          <Field label="Guests" error={shownErrors.guests}>
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                min={LIMITS.guestsMin}
                max={LIMITS.guestsMax}
                value={form.guests}
                onChange={update('guests')}
                placeholder="60"
              />
            )}
          </Field>
          <Field label="Total budget" error={shownErrors.budget}>
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                min={LIMITS.budgetMin}
                step="100"
                value={form.budget}
                onChange={update('budget')}
                placeholder="250000"
              />
            )}
          </Field>
          <Field label="Currency" error={shownErrors.currency}>
            {(props) => (
              <select {...props} value={form.currency} onChange={update('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="City or venue" optional hint="Helps Festa estimate local prices." className="span-2">
            {(props) => (
              <input
                {...props}
                value={form.location}
                onChange={update('location')}
                maxLength={LIMITS.locationMax}
                autoComplete="address-level2"
                placeholder="Bengaluru"
              />
            )}
          </Field>
          <Field label="Theme or vibe" optional className="span-2">
            {(props) => (
              <>
                <input
                  {...props}
                  value={form.vibe}
                  onChange={update('vibe')}
                  maxLength={LIMITS.vibeMax}
                  placeholder="Relaxed rooftop sundowner"
                />
                <fieldset className="chips plain-fieldset">
                  <legend className="visually-hidden">Vibe suggestions</legend>
                  {VIBES.map((vibe) => (
                    <button
                      key={vibe}
                      type="button"
                      className="chip"
                      aria-pressed={form.vibe === vibe}
                      onClick={() => setForm((f) => ({ ...f, vibe }))}
                    >
                      {vibe}
                    </button>
                  ))}
                </fieldset>
              </>
            )}
          </Field>
          <Field
            label="Anything Festa should know?"
            optional
            hint="Dietary needs, accessibility, cultural rituals, must-haves."
            className="span-2"
          >
            {(props) => (
              <textarea {...props} rows={3} value={form.notes} onChange={update('notes')} maxLength={LIMITS.notesMax} />
            )}
          </Field>
        </div>

        {error && (
          <p id="form-error" className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="planner-form__actions">
          <Button type="submit" size="lg" busy={busy}>
            {busy ? 'Building your plan' : 'Create my plan'}
          </Button>
          <p className="planner-form__status" role="status">
            {busy && <ProgressMessage />}
          </p>
        </div>
      </form>
    </div>
  );
}
