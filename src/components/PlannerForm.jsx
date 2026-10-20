import { useEffect, useRef, useState } from 'react';
import { Cake, Gem, Heart, Laptop, Sparkles, Users } from 'lucide-react';
import { CURRENCIES, EVENT_TYPES, LIMITS } from '../../shared/constants.js';
import { toISODate, validateEventInput } from '../../shared/validation.js';
import { Button, Field } from './ui.jsx';

const ICONS = { wedding: Gem, birthday: Cake, conference: Laptop, cultural: Sparkles, community: Users, milestone: Heart };

const PROGRESS = [
  'Reading your brief',
  'Splitting the budget across venue, food and decor',
  'Counting back the weeks to build your timeline',
  'Drafting the day-of schedule',
  'Listing vendors and the questions to ask them',
  'Final checks on the numbers',
];

const VIBES = ['Boho garden', 'Black-tie elegant', 'Retro disco', 'Eco-friendly and minimal', 'Festive and colourful'];

function inDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

const EMPTY = { type: '', name: '', date: '', guests: '', budget: '', currency: 'INR', location: '', vibe: '', notes: '' };

const EXAMPLE = {
  type: 'wedding',
  name: 'Priya & Arjun’s wedding',
  date: inDays(120),
  guests: '180',
  budget: '1500000',
  currency: 'INR',
  location: 'Jaipur, India',
  vibe: 'Marigold and pastel, modern Rajasthani',
  notes: 'Many vegetarian and Jain guests. Grandparents use wheelchairs.',
};

export function PlannerForm({ onSubmit, busy, serverErrors = {}, error }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const [today] = useState(() => toISODate(new Date()));
  const [failedAttempts, setFailedAttempts] = useState(0);
  const shownErrors = { ...serverErrors, ...errors };
  const typePhrase = EVENT_TYPES.find((t) => t.id === form.type)?.phrase ?? 'a celebration';

  const update = (field) => (event) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    if (errors[field]) setErrors(({ [field]: _removed, ...rest }) => rest);
  };

  // After a failed submit renders, move focus to the first invalid control
  // so keyboard and screen reader users land directly on the problem.
  useEffect(() => {
    if (!failedAttempts) return;
    const first = formRef.current?.querySelector('[aria-invalid="true"]');
    (first?.tagName === 'FIELDSET' ? first.querySelector('input') : first)?.focus();
  }, [failedAttempts]);

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

  return (
    <div className="hero">
      <div className="hero__intro">
        <h1 className="hero__title">
          Plan {typePhrase} that feels like yours.
        </h1>
        <p className="hero__lede">
          Tell Festa what you are celebrating. In under a minute you get a budget split, a week-by-week
          timeline, a day-of schedule and a vendor checklist, all built around your guests and your money.
        </p>
        <Button variant="ghost" onClick={() => { setForm(EXAMPLE); setErrors({}); }} disabled={busy}>
          Fill in an example wedding
        </Button>
      </div>

      <form ref={formRef} className="planner-form" onSubmit={handleSubmit} noValidate aria-describedby={error ? 'form-error' : undefined}>
        <fieldset className="type-picker" aria-invalid={shownErrors.type ? true : undefined} aria-describedby={shownErrors.type ? 'type-error' : undefined}>
          <legend className="field__label">What are you celebrating?</legend>
          <div className="type-picker__grid">
            {EVENT_TYPES.map((type) => {
              const Icon = ICONS[type.id];
              return (
                <label key={type.id} className="type-tile">
                  <input
                    type="radio"
                    name="type"
                    value={type.id}
                    checked={form.type === type.id}
                    onChange={update('type')}
                    className="type-tile__input"
                  />
                  <span className="type-tile__body">
                    <Icon aria-hidden="true" size={22} strokeWidth={1.6} />
                    {type.label}
                  </span>
                </label>
              );
            })}
          </div>
          {shownErrors.type && <p id="type-error" className="field__error">{shownErrors.type}</p>}
        </fieldset>

        <div className="form-grid">
          <Field label="Event name" error={shownErrors.name} className="span-2">
            {(props) => <input {...props} value={form.name} onChange={update('name')} maxLength={LIMITS.nameMax} autoComplete="off" placeholder="Asha turns 30" />}
          </Field>
          <Field label="Date" error={shownErrors.date}>
            {(props) => <input {...props} type="date" value={form.date} min={today} onChange={update('date')} />}
          </Field>
          <Field label="Guests" error={shownErrors.guests}>
            {(props) => <input {...props} type="number" inputMode="numeric" min={LIMITS.guestsMin} max={LIMITS.guestsMax} value={form.guests} onChange={update('guests')} placeholder="60" />}
          </Field>
          <Field label="Total budget" error={shownErrors.budget}>
            {(props) => <input {...props} type="number" inputMode="numeric" min={LIMITS.budgetMin} step="100" value={form.budget} onChange={update('budget')} placeholder="250000" />}
          </Field>
          <Field label="Currency" error={shownErrors.currency}>
            {(props) => (
              <select {...props} value={form.currency} onChange={update('currency')}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </Field>
          <Field label="City or venue" optional hint="Helps Festa estimate local prices." className="span-2">
            {(props) => <input {...props} value={form.location} onChange={update('location')} maxLength={LIMITS.locationMax} autoComplete="address-level2" placeholder="Bengaluru" />}
          </Field>
          <Field label="Theme or vibe" optional className="span-2">
            {(props) => (
              <>
                <input {...props} value={form.vibe} onChange={update('vibe')} maxLength={LIMITS.vibeMax} placeholder="Relaxed rooftop sundowner" />
                <fieldset className="chips plain-fieldset">
                  <legend className="visually-hidden">Vibe suggestions</legend>
                  {VIBES.map((vibe) => (
                    <button key={vibe} type="button" className="chip" aria-pressed={form.vibe === vibe} onClick={() => setForm((f) => ({ ...f, vibe }))}>
                      {vibe}
                    </button>
                  ))}
                </fieldset>
              </>
            )}
          </Field>
          <Field label="Anything Festa should know?" optional hint="Dietary needs, accessibility, cultural rituals, must-haves." className="span-2">
            {(props) => <textarea {...props} rows={3} value={form.notes} onChange={update('notes')} maxLength={LIMITS.notesMax} />}
          </Field>
        </div>

        {error && <p id="form-error" className="alert alert--error" role="alert">{error}</p>}

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

/** Walks through the stages Gemini is working on, so a long wait still feels like progress. */
function ProgressMessage() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS.length - 1)), 6000);
    return () => clearInterval(id);
  }, []);
  return `${PROGRESS[step]}…`;
}
