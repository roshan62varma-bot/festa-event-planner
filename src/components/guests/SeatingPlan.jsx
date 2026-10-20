import { DIETARY_OPTIONS, LIMITS } from '../../../shared/constants.js';

const DIETARY_LABEL = Object.fromEntries(DIETARY_OPTIONS.map((d) => [d.id, d.label]));

/**
 * Table-by-table seating suggestion, with each guest's dietary need for the caterer.
 * @param {object} props
 * @param {ReturnType<typeof import('../../../shared/guests.js').planSeating>} props.tables
 * @param {number} props.tableSize
 * @param {(size: string) => void} props.onTableSizeChange
 */
export function SeatingPlan({ tables, tableSize, onTableSizeChange }) {
  return (
    <section aria-labelledby="seating-heading" className="stack">
      <div className="section-heading">
        <div>
          <h3 id="seating-heading" className="h3">
            Suggested seating
          </h3>
          <p className="section-heading__text">Groups stay together. Declined guests are left out.</p>
        </div>
        <label className="inline-label">
          Seats per table
          <input
            type="number"
            min={LIMITS.tableSizeMin}
            max={LIMITS.tableSizeMax}
            value={tableSize}
            onChange={(e) => onTableSizeChange(e.target.value)}
          />
        </label>
      </div>
      <ul className="tables">
        {tables.map((t) => (
          <li key={t.number} className="table-card">
            <p className="table-card__title">Table {t.number}</p>
            <p className="muted table-card__count">
              {t.seats.length} of {tableSize} seats
            </p>
            <ul className="plain-list">
              {t.seats.map((s, i) => (
                // Two guests can share a name, so the seat position keeps keys unique.
                <li key={`${s.name}-${i}`}>
                  {s.name}
                  {s.dietary !== 'none' && <span className="muted">, {DIETARY_LABEL[s.dietary]}</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
