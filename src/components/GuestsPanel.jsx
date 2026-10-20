import { useMemo, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { DIETARY_OPTIONS, LIMITS, RSVP_STATUSES } from '../../shared/constants.js';
import { planSeating, rsvpStats, validateGuest } from '../../shared/guests.js';
import { Button, EmptyState, Field, SectionHeading } from './ui.jsx';

const DIETARY_LABEL = Object.fromEntries(DIETARY_OPTIONS.map((d) => [d.id, d.label]));
const EMPTY = { name: '', group: '', rsvp: 'pending', dietary: 'none', plusOnes: '0' };

let nextId = 0;
const newId = () => `g${Date.now().toString(36)}${(nextId++).toString(36)}`;

export function GuestsPanel({ guests, tableSize, expected, dispatch, onWriteInvite }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const stats = useMemo(() => rsvpStats(guests), [guests]);
  const tables = useMemo(() => planSeating(guests, tableSize), [guests, tableSize]);
  const groups = useMemo(() => [...new Set(guests.map((g) => g.group))], [guests]);
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function addGuest(e) {
    e.preventDefault();
    const result = validateGuest(form);
    setErrors(result.errors);
    if (!result.ok) return;
    dispatch({ type: 'guest/added', id: newId(), guest: result.value });
    setAnnouncement(`${result.value.name} added.`);
    setForm({ ...EMPTY, group: form.group }); // Keep the group: guests are often added family by family.
    e.currentTarget.querySelector('input')?.focus();
  }

  return (
    <div className="stack-lg">
      <SectionHeading
        title="Guests and RSVPs"
        description={`Track replies and dietary needs. You planned for ${expected} guests.`}
        action={<Button variant="secondary" size="sm" onClick={onWriteInvite}>Write the invitation</Button>}
      />

      <div className="budget-totals">
        <div className="stat"><span className="stat__label">Attending</span><span className="stat__value">{stats.attending}</span></div>
        <div className="stat"><span className="stat__label">Awaiting or maybe</span><span className="stat__value">{stats.pending + stats.maybe}</span></div>
        <div className="stat"><span className="stat__label">Declined</span><span className="stat__value">{stats.declined}</span></div>
      </div>
      {Object.keys(stats.dietary).length > 0 && (
        <p className="muted">
          Tell your caterer: {Object.entries(stats.dietary).map(([id, n]) => `${n} ${DIETARY_LABEL[id]?.toLowerCase() ?? id}`).join(', ')}.
        </p>
      )}

      <form className="guest-form" onSubmit={addGuest} noValidate aria-label="Add a guest">
        <Field label="Name" error={errors.name}>
          {(props) => <input {...props} value={form.name} onChange={update('name')} maxLength={LIMITS.guestNameMax} autoComplete="off" />}
        </Field>
        <Field label="Group" hint="Family, team or friend circle.">
          {(props) => (
            <>
              <input {...props} value={form.group} onChange={update('group')} maxLength={40} list="guest-groups" placeholder="Friends" />
              <datalist id="guest-groups">{groups.map((g) => <option key={g} value={g}>{g}</option>)}</datalist>
            </>
          )}
        </Field>
        <Field label="RSVP">
          {(props) => (
            <select {...props} value={form.rsvp} onChange={update('rsvp')}>
              {RSVP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Dietary need">
          {(props) => (
            <select {...props} value={form.dietary} onChange={update('dietary')}>
              {DIETARY_OPTIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Plus-ones" error={errors.plusOnes}>
          {(props) => <input {...props} type="number" min="0" max="10" inputMode="numeric" value={form.plusOnes} onChange={update('plusOnes')} />}
        </Field>
        <Button type="submit" disabled={guests.length >= LIMITS.guestListMax}>
          <UserPlus aria-hidden="true" size={18} /> Add guest
        </Button>
      </form>
      <p className="visually-hidden" role="status">{announcement}</p>

      {guests.length === 0 ? (
        <EmptyState title="No guests yet">Add your first guest above. Seating suggestions appear once you have a few names.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="guest-table">
            <caption className="visually-hidden">Guest list</caption>
            <thead>
              <tr><th scope="col">Guest</th><th scope="col">RSVP</th><th scope="col">Dietary need</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id}>
                  <th scope="row">
                    {g.name}{g.plusOnes > 0 && <span className="muted"> +{g.plusOnes}</span>}
                    <span className="guest-table__group">{g.group}</span>
                  </th>
                  <td>
                    <select aria-label={`RSVP for ${g.name}`} value={g.rsvp} onChange={(e) => dispatch({ type: 'guest/updated', id: g.id, patch: { rsvp: e.target.value } })}>
                      {RSVP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Dietary need for ${g.name}`} value={g.dietary} onChange={(e) => dispatch({ type: 'guest/updated', id: g.id, patch: { dietary: e.target.value } })}>
                      {DIETARY_OPTIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${g.name}`}
                      onClick={() => { dispatch({ type: 'guest/removed', id: g.id }); setAnnouncement(`${g.name} removed.`); }}
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tables.length > 0 && (
        <section aria-labelledby="seating-heading" className="stack">
          <div className="section-heading">
            <div>
              <h3 id="seating-heading" className="h3">Suggested seating</h3>
              <p className="section-heading__text">Groups stay together. Declined guests are left out.</p>
            </div>
            <label className="inline-label">
              Seats per table
              <input type="number" min={LIMITS.tableSizeMin} max={LIMITS.tableSizeMax} value={tableSize} onChange={(e) => dispatch({ type: 'seating/size', size: e.target.value })} />
            </label>
          </div>
          <ul className="tables">
            {tables.map((t) => (
              <li key={t.number} className="table-card">
                <p className="table-card__title">Table {t.number}</p>
                <p className="muted table-card__count">{t.seats.length} of {tableSize} seats</p>
                <ul className="plain-list">
                  {t.seats.map((s) => (
                    <li key={s.name}>{s.name}{s.dietary !== 'none' && <span className="muted">, {DIETARY_LABEL[s.dietary]}</span>}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
