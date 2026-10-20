import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { DIETARY_OPTIONS, LIMITS, RSVP_STATUSES } from '../../../shared/constants.js';
import { validateGuest } from '../../../shared/guests.js';
import { Button, Field } from '../ui.jsx';

/** @typedef {import('../../../shared/types.js').Guest} Guest */

const EMPTY = { name: '', group: '', rsvp: 'pending', dietary: 'none', plusOnes: '0' };
const GROUP_MAX = 40;

/**
 * Adds one guest at a time. The group is kept after each add, because guests
 * are usually entered family by family, and focus returns to the name field.
 * @param {object} props
 * @param {(guest: Guest) => void} props.onAdd Receives a validated guest.
 * @param {string[]} props.groups Existing groups, offered as suggestions.
 * @param {boolean} props.full True once the guest list limit is reached.
 */
export function GuestForm({ onAdd, groups, full }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  /** @param {keyof typeof EMPTY} field */
  const update = (field) => (/** @type {{ target: { value: string } }} */ e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  /** @param {import('react').FormEvent<HTMLFormElement>} e */
  function submit(e) {
    e.preventDefault();
    const result = validateGuest(form);
    setErrors(result.errors);
    if (!result.ok) return;
    onAdd(result.value);
    setForm({ ...EMPTY, group: form.group });
    e.currentTarget.querySelector('input')?.focus();
  }

  return (
    <form className="guest-form" onSubmit={submit} noValidate aria-label="Add a guest">
      <Field label="Name" error={errors.name}>
        {(props) => (
          <input
            {...props}
            value={form.name}
            onChange={update('name')}
            maxLength={LIMITS.guestNameMax}
            autoComplete="off"
          />
        )}
      </Field>
      <Field label="Group" hint="Family, team or friend circle.">
        {(props) => (
          <>
            <input
              {...props}
              value={form.group}
              onChange={update('group')}
              maxLength={GROUP_MAX}
              list="guest-groups"
              placeholder="Friends"
            />
            <datalist id="guest-groups">
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field label="RSVP">
        {(props) => (
          <select {...props} value={form.rsvp} onChange={update('rsvp')}>
            {RSVP_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Dietary need">
        {(props) => (
          <select {...props} value={form.dietary} onChange={update('dietary')}>
            {DIETARY_OPTIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Plus-ones" error={errors.plusOnes}>
        {(props) => (
          <input
            {...props}
            type="number"
            min="0"
            max="10"
            inputMode="numeric"
            value={form.plusOnes}
            onChange={update('plusOnes')}
          />
        )}
      </Field>
      <Button type="submit" disabled={full}>
        <UserPlus aria-hidden="true" size={18} /> Add guest
      </Button>
    </form>
  );
}
