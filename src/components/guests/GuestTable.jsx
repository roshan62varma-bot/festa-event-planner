import { Trash2 } from 'lucide-react';
import { DIETARY_OPTIONS, RSVP_STATUSES } from '../../../shared/constants.js';

/** @typedef {import('../../../shared/types.js').Guest} Guest */
/** @typedef {import('../../../shared/types.js').SavedGuest} SavedGuest */

/**
 * @param {{ label: string, value: string, options: readonly { id: string, label: string }[], onChange: (value: string) => void }} props
 */
function InlineSelect({ label, value, options, onChange }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Editable guest list: RSVP and dietary need can be changed in place.
 * @param {object} props
 * @param {SavedGuest[]} props.guests
 * @param {(id: string, patch: Partial<Guest>) => void} props.onUpdate
 * @param {(guest: SavedGuest) => void} props.onRemove
 */
export function GuestTable({ guests, onUpdate, onRemove }) {
  return (
    <div className="table-wrap">
      <table className="guest-table">
        <caption className="visually-hidden">Guest list</caption>
        <thead>
          <tr>
            <th scope="col">Guest</th>
            <th scope="col">RSVP</th>
            <th scope="col">Dietary need</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => (
            <tr key={g.id}>
              <th scope="row">
                {g.name}
                {g.plusOnes > 0 && <span className="muted"> +{g.plusOnes}</span>}
                <span className="guest-table__group">{g.group}</span>
              </th>
              <td>
                <InlineSelect
                  label={`RSVP for ${g.name}`}
                  value={g.rsvp}
                  options={RSVP_STATUSES}
                  onChange={(rsvp) => onUpdate(g.id, { rsvp: /** @type {Guest['rsvp']} */ (rsvp) })}
                />
              </td>
              <td>
                <InlineSelect
                  label={`Dietary need for ${g.name}`}
                  value={g.dietary}
                  options={DIETARY_OPTIONS}
                  onChange={(dietary) => onUpdate(g.id, { dietary })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${g.name}`}
                  onClick={() => onRemove(g)}
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
