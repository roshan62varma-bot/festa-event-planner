import { VENDOR_TYPES } from '../../shared/constants.js';

const dateFormat = new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/**
 * "Wed, Feb 17, 2027" for an ISO date, read as a local date.
 * @param {string} iso YYYY-MM-DD
 */
export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return dateFormat.format(new Date(y, m - 1, d));
}

/**
 * Human countdown for the event summary.
 * @param {number} days Days until the event.
 */
export function countdownText(days) {
  if (days > 1) return `${days} days to go`;
  if (days === 1) return 'Tomorrow';
  if (days === 0) return 'Today';
  return 'Event has passed';
}

const HEX = /#[0-9a-f]{6}\b/i;

/**
 * Splits "Marigold #F2A900" into a display name and a hex colour. The colour is
 * only returned when it is a strict #rrggbb value, so model output can never
 * inject arbitrary CSS into a style attribute.
 * @param {string} entry
 * @returns {{ name: string, hex: string | null }}
 */
export function parseSwatch(entry) {
  const hex = entry.match(HEX)?.[0] ?? null;
  const name = entry.replace(HEX, '').trim() || hex || entry;
  return { name, hex };
}

/**
 * Maps a free-text vendor name from the plan ("Catering company") to a known vendor type.
 * Matches on the first few letters of each type's first word; defaults to the first type.
 * @param {string} [type]
 */
export function matchVendorType(type = '') {
  const lower = type.toLowerCase();
  return VENDOR_TYPES.find((v) => lower.includes(v.toLowerCase().split(' ')[0].slice(0, 5))) ?? VENDOR_TYPES[0];
}
