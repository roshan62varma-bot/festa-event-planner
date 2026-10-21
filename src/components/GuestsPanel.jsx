import { useMemo, useState } from 'react';
import { DIETARY_OPTIONS, LIMITS } from '../../shared/constants.js';
import { planSeating, rsvpStats } from '../../shared/guests.js';
import { actions } from '../state/actions.js';
import { GuestForm } from './guests/GuestForm.jsx';
import { GuestTable } from './guests/GuestTable.jsx';
import { SeatingPlan } from './guests/SeatingPlan.jsx';
import { Button, EmptyState, SectionHeading, Stat } from './ui.jsx';

/** @typedef {import('../../shared/types.js').Guest} Guest */
/** @typedef {import('../../shared/types.js').SavedGuest} SavedGuest */

const DIETARY_LABEL = Object.fromEntries(DIETARY_OPTIONS.map((d) => [d.id, d.label]));

/**
 * "2 vegan, 3 jain": the dietary split the caterer needs.
 * @param {Record<string, number>} dietary
 */
export const caterNote = (dietary) =>
  Object.entries(dietary)
    .map(([id, n]) => `${n} ${DIETARY_LABEL[id]?.toLowerCase() ?? id}`)
    .join(', ');

/**
 * RSVP tracking, dietary totals and suggested seating.
 * @param {object} props
 * @param {SavedGuest[]} props.guests
 * @param {number} props.tableSize
 * @param {number} props.expected Guest count from the brief.
 * @param {import('../state/actions.js').Dispatch} props.dispatch
 * @param {() => void} props.onWriteInvite Opens the invitation writer.
 */
export function GuestsPanel({ guests, tableSize, expected, dispatch, onWriteInvite }) {
  const [announcement, setAnnouncement] = useState('');
  const stats = useMemo(() => rsvpStats(guests), [guests]);
  const tables = useMemo(() => planSeating(guests, tableSize), [guests, tableSize]);
  const groups = useMemo(() => [...new Set(guests.map((g) => g.group))], [guests]);
  const hasDietaryNeeds = Object.keys(stats.dietary).length > 0;

  /** @param {Guest} guest */
  function add(guest) {
    dispatch(actions.guestAdded(crypto.randomUUID(), guest));
    setAnnouncement(`${guest.name} added.`);
  }

  /** @param {SavedGuest} guest */
  function remove(guest) {
    dispatch(actions.guestRemoved(guest.id));
    setAnnouncement(`${guest.name} removed.`);
  }

  return (
    <div className="stack-lg">
      <SectionHeading
        title="Guests and RSVPs"
        description={`Track replies and dietary needs. You planned for ${expected} guests.`}
        action={
          <Button variant="secondary" size="sm" onClick={onWriteInvite}>
            Write the invitation
          </Button>
        }
      />

      <div className="budget-totals">
        <Stat label="Attending" value={stats.attending} />
        <Stat label="Awaiting or maybe" value={stats.pending + stats.maybe} />
        <Stat label="Declined" value={stats.declined} />
      </div>
      {hasDietaryNeeds && <p className="muted">Tell your caterer: {caterNote(stats.dietary)}.</p>}

      <GuestForm onAdd={add} groups={groups} full={guests.length >= LIMITS.guestListMax} />
      <p className="visually-hidden" role="status">
        {announcement}
      </p>

      {guests.length === 0 ? (
        <EmptyState title="No guests yet">
          Add your first guest above. Seating suggestions appear once you have a few names.
        </EmptyState>
      ) : (
        <GuestTable
          guests={guests}
          onUpdate={(id, patch) => dispatch(actions.guestUpdated(id, patch))}
          onRemove={remove}
        />
      )}

      {tables.length > 0 && (
        <SeatingPlan
          tables={tables}
          tableSize={tableSize}
          onTableSizeChange={(size) => dispatch(actions.seatingSize(size))}
        />
      )}
    </div>
  );
}
