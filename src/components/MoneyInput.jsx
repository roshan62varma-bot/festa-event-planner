import { useState } from 'react';

/**
 * Number input that keeps a local draft and only reports the value when the
 * user finishes editing (blur or Enter). This avoids recomputing the whole
 * budget summary on every keystroke.
 * @param {object} props
 * @param {string} props.label Accessible name, e.g. "Spent on Venue".
 * @param {number} props.value
 * @param {(value: number) => void} props.onCommit
 */
export function MoneyInput({ label, value, onCommit }) {
  const [draft, setDraft] = useState(/** @type {string | null} */ (null));
  const commit = () => {
    if (draft !== null) onCommit(Number(draft));
    setDraft(null);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      min="0"
      className="money-input"
      aria-label={label}
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
}
