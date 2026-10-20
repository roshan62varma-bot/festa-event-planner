import { Mail } from 'lucide-react';
import { dueDate } from '../../shared/timeline.js';
import { formatDate } from './TimelinePanel.jsx';
import { Badge, Button, SectionHeading } from './ui.jsx';

export function VendorsPanel({ vendors, eventDate, booked, dispatch, onDraftEmail }) {
  const bookedCount = vendors.filter((_, i) => booked[`v${i}`]).length;
  return (
    <div className="stack-lg">
      <SectionHeading
        title="Vendor checklist"
        description={`${bookedCount} of ${vendors.length} booked. Ask these questions before you pay a deposit.`}
      />
      <ul className="vendor-list">
        {vendors.map((vendor, i) => {
          const id = `v${i}`;
          return (
            <li key={id} className={`vendor ${booked[id] ? 'is-done' : ''}`}>
              <div className="vendor__head">
                <h3 className="h3">{vendor.type}</h3>
                <Badge tone={booked[id] ? 'done' : 'upcoming'}>{booked[id] ? 'Booked' : `Book by ${formatDate(dueDate(eventDate, vendor.bookWeeksBefore))}`}</Badge>
              </div>
              <p>{vendor.why}</p>
              {vendor.questions.length > 0 && (
                <ul className="bullet-list">{vendor.questions.map((q) => <li key={q}>{q}</li>)}</ul>
              )}
              <div className="vendor__actions">
                <label className="check">
                  <input type="checkbox" checked={Boolean(booked[id])} onChange={() => dispatch({ type: 'vendor/toggled', id })} />
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
