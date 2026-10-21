import { Cake, Gem, Heart, Laptop, Sparkles, Users } from 'lucide-react';
import { EVENT_TYPES } from '../../shared/constants.js';

/** @type {Record<string, import('lucide-react').LucideIcon>} */
const ICONS = {
  wedding: Gem,
  birthday: Cake,
  conference: Laptop,
  cultural: Sparkles,
  community: Users,
  milestone: Heart,
};

/**
 * Large radio tiles for the event type. Native radios keep arrow-key
 * navigation and screen reader semantics; the tiles are only styling.
 * @param {object} props
 * @param {string} props.value Selected type id, or empty.
 * @param {(event: import('react').ChangeEvent<HTMLInputElement>) => void} props.onChange
 * @param {string} [props.error]
 */
export function EventTypePicker({ value, onChange, error }) {
  return (
    <fieldset
      className="type-picker"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? 'type-error' : undefined}
    >
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
                checked={value === type.id}
                onChange={onChange}
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
      {error && (
        <p id="type-error" className="field__error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
