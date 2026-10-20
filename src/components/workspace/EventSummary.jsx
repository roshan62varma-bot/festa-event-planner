import { forwardRef } from 'react';
import { CalendarCheck } from 'lucide-react';
import { formatMoney } from '../../../shared/budget.js';
import { EVENT_TYPES } from '../../../shared/constants.js';
import { countdownText, formatDate } from '../../lib/format.js';

/** Honest labels for where the plan came from. */
export const SOURCE_LABELS = Object.freeze({
  gemini: 'Plan written by Google Gemini',
  partial:
    'Partly written by Gemini. Some sections use the starter template because Gemini was busy. Update the plan to retry.',
  template: 'Starter template. Gemini was unavailable, so this plan uses proven defaults.',
});

/**
 * The event at a glance. The heading takes focus when a plan arrives, so
 * screen readers announce the new page.
 * @typedef {object} EventSummaryProps
 * @property {import('../../../shared/types.js').EventBrief} event
 * @property {string | null} source
 * @property {number} days Days until the event.
 * @property {number} percentDone Checklist progress.
 */
export const EventSummary = forwardRef(
  /**
   * @param {EventSummaryProps} props
   * @param {import('react').ForwardedRef<HTMLHeadingElement>} headingRef
   */
  function EventSummary({ event, source, days, percentDone }, headingRef) {
    const typeLabel = EVENT_TYPES.find((t) => t.id === event.type)?.label;
    const sourceKey = source && source in SOURCE_LABELS ? source : 'template';
    return (
      <aside className="summary" aria-label="Event summary">
        <p className="summary__type">{typeLabel}</p>
        <h1 className="summary__title" ref={headingRef} tabIndex={-1}>
          {event.name}
        </h1>
        <p className="summary__countdown">
          <CalendarCheck aria-hidden="true" size={18} /> {countdownText(days)}
        </p>
        <dl className="kv kv--compact">
          <div>
            <dt>Date</dt>
            <dd>
              <time dateTime={event.date}>{formatDate(event.date)}</time>
            </dd>
          </div>
          {event.location && (
            <div>
              <dt>Where</dt>
              <dd>{event.location}</dd>
            </div>
          )}
          <div>
            <dt>Guests</dt>
            <dd>{event.guests}</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>{formatMoney(event.budget, event.currency)}</dd>
          </div>
          <div>
            <dt>Checklist</dt>
            <dd>{percentDone}% done</dd>
          </div>
        </dl>
        <p className={`source source--${sourceKey}`}>{SOURCE_LABELS[sourceKey]}</p>
      </aside>
    );
  },
);
