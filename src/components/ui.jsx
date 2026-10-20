import { useId } from 'react';

/** Labelled form field. Wires the hint and error to the control for screen readers. */
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
      {hint && <p id={hintId} className="field__hint">{hint}</p>}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && <p id={errorId} className="field__error">{error}</p>}
    </div>
  );
}

export function Button({ variant = 'primary', size, busy = false, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${size ? `btn--${size}` : ''} ${className}`}
      aria-busy={busy || undefined}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

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

export function Badge({ tone, children }) {
  return <span className={`badge badge--${tone}`}>{children ?? STATUS_LABELS[tone] ?? tone}</span>;
}

export function SectionHeading({ title, description, action, level = 2 }) {
  const Heading = `h${level}`;
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

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      <div className="empty__text">{children}</div>
    </div>
  );
}
