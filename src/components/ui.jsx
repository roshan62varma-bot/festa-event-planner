import { useId } from 'react';

/**
 * Props a Field passes to its control, linking the label, hint and error for assistive tech.
 * @typedef {{ id: string, 'aria-describedby'?: string, 'aria-invalid'?: boolean }} ControlProps
 */

/**
 * Labelled form field. The child is a render function that receives the
 * control's id and ARIA wiring, so any input, select or textarea can be used.
 * @param {object} props
 * @param {string} props.label
 * @param {(control: ControlProps) => import('react').ReactNode} props.children
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {boolean} [props.optional]
 * @param {string} [props.className]
 */
export function Field({ label, hint, error, children, optional = false, className = '' }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Button with consistent variants. `busy` shows a spinner and disables it,
 * and is announced through aria-busy.
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {'primary' | 'secondary' | 'ghost'} [props.variant]
 * @param {'sm' | 'lg'} [props.size]
 * @param {boolean} [props.busy]
 * @param {boolean} [props.disabled]
 * @param {'button' | 'submit'} [props.type]
 * @param {string} [props.className]
 * @param {() => void} [props.onClick]
 */
export function Button({
  variant = 'primary',
  size,
  busy = false,
  disabled,
  type = 'button',
  className = '',
  children,
  onClick,
}) {
  return (
    <button
      // eslint-disable-next-line react/button-has-type -- type is always 'button' or 'submit'
      type={type}
      className={`btn btn--${variant} ${size ? `btn--${size}` : ''} ${className}`}
      aria-busy={busy || undefined}
      disabled={busy || disabled}
      onClick={onClick}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** @type {Record<string, string>} */
const STATUS_LABELS = {
  done: 'Done',
  overdue: 'Overdue',
  'due-soon': 'Due this week',
  upcoming: 'Upcoming',
  high: 'High priority',
  medium: 'Medium',
  low: 'Low',
  over: 'Over budget',
  near: 'Almost used',
  'on-track': 'On track',
};

/**
 * Status pill. The tone sets the colour and, without children, the text too.
 * Colour is never the only signal: every tone has a text label.
 * @param {{ tone: string, children?: import('react').ReactNode }} props
 */
export function Badge({ tone, children }) {
  return <span className={`badge badge--${tone}`}>{children ?? STATUS_LABELS[tone] ?? tone}</span>;
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {import('react').ReactNode} [props.action] Optional control aligned to the right.
 * @param {2 | 3} [props.level] Heading level, to keep the document outline correct.
 */
export function SectionHeading({ title, description, action, level = 2 }) {
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
    <div className="section-heading">
      <div>
        <Heading className="section-heading__title">{title}</Heading>
        {description && <p className="section-heading__text">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * A labelled headline number, e.g. "Spent ₹5,10,000".
 * @param {{ label: string, value: import('react').ReactNode, tone?: 'danger' }} props
 */
export function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}

/** @param {{ title: string, children: import('react').ReactNode }} props */
export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      <div className="empty__text">{children}</div>
    </div>
  );
}
