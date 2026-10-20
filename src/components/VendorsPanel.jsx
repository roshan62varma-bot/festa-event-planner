import { Mail } from 'lucide-react';
import { dueDate } from '../../shared/timeline.js';
import { formatDate } from '../lib/format.js';
import { actions } from '../state/actions.js';
import { Badge, Button, SectionHeading } from './ui.jsx';

/** Vendors have no ids from the model, so their position in the plan is used. */
const vendorId = (/** @type {number} */ index) => `v${index}`;

/**
 * What to look for in each vendor, questions to ask, and when to book.
 * @param {object} props
 * @param {import('../../shared/types.js').Vendor[]} props.vendors
 * @param {string} props.eventDate
 * @param {Record<string, boolean>} props.booked
 * @param {import('../state/actions.js').Dispatch} props.dispatch
 * @param {(vendorType: string) => void} props.onDraftEmail Opens the ideas studio with an enquiry email.
 */
export function VendorsPanel({ vendors, eventDate, booked, dispatch, onDraftEmail }) {
  const bookedCount = vendors.filter((_, i) => booked[vendorId(i)]).length;
  return (
    <div className="stack-lg">
      <SectionHeading
        title="Vendor checklist"
        description={`${bookedCount} of ${vendors.length} booked. Ask these questions before you pay a deposit.`}
      />
      <ul className="vendor-list">
        {vendors.map((vendor, i) => {
          const id = vendorId(i);
          const isBooked = Boolean(booked[id]);
          return (
            <li key={id} className={`vendor ${isBooked ? 'is-done' : ''}`}>
              <div className="vendor__head">
                <h3 className="h3">{vendor.type}</h3>
                <Badge tone={isBooked ? 'done' : 'upcoming'}>
                  {isBooked ? 'Booked' : `Book by ${formatDate(dueDate(eventDate, vendor.bookWeeksBefore))}`}
                </Badge>
              </div>
              <p>{vendor.why}</p>
              {vendor.questions.length > 0 && (
                <ul className="bullet-list">
                  {vendor.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              )}
              <div className="vendor__actions">
                <label className="check">
                  <input type="checkbox" checked={isBooked} onChange={() => dispatch(actions.vendorToggled(id))} />
                  Mark {vendor.type.toLowerCase()} as booked
                </label>
                <Button variant="ghost" size="sm" onClick={() => onDraftEmail(vendor.type)}>
                  <Mail aria-hidden="true" size={16} /> Draft enquiry email
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
