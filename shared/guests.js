import { DIETARY_OPTIONS, LIMITS, RSVP_STATUSES, idsOf } from './constants.js';
import { sanitizeText, toInteger } from './validation.js';

/** @typedef {import('./types.js').Guest} Guest */
/** @typedef {{ name: string, group: string, dietary: string }} Seat */

const RSVP_IDS = idsOf(RSVP_STATUSES);
const DIETARY_IDS = idsOf(DIETARY_OPTIONS);
/** Most extra people one invitation can bring. */
const PLUS_ONES_MAX = 10;
const GROUP_NAME_MAX = 40;

/**
 * Validates one guest entry from the guest form.
 * @param {unknown} raw Untrusted input.
 * @returns {import('./types.js').Validation<Guest>}
 */
export function validateGuest(raw) {
  /** @type {Record<string, any>} */
  const input = raw && typeof raw === 'object' ? raw : {};
  /** @type {Record<string, string>} */
  const errors = {};
  const name = sanitizeText(input.name, LIMITS.guestNameMax);
  if (!name) errors.name = 'Enter the guest’s name.';
  const plusOnes = toInteger(input.plusOnes ?? 0);
  if (!(plusOnes >= 0 && plusOnes <= PLUS_ONES_MAX)) {
    errors.plusOnes = `Plus-ones must be between 0 and ${PLUS_ONES_MAX}.`;
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      name,
      group: sanitizeText(input.group, GROUP_NAME_MAX) || 'Friends',
      rsvp: RSVP_IDS.includes(input.rsvp) ? input.rsvp : 'pending',
      dietary: DIETARY_IDS.includes(input.dietary) ? input.dietary : 'none',
      plusOnes: Number.isNaN(plusOnes) ? 0 : plusOnes,
    },
  };
}

/**
 * Headcount and dietary totals. Plus-ones inherit the guest's dietary need.
 * @param {Guest[]} guests
 */
export function rsvpStats(guests) {
  const stats = {
    invited: 0,
    attending: 0,
    pending: 0,
    maybe: 0,
    declined: 0,
    headcount: 0,
    /** @type {Record<string, number>} */
    dietary: {},
  };
  for (const g of guests) {
    const party = 1 + (g.plusOnes || 0);
    stats.invited += party;
    stats[g.rsvp] += party;
    if (g.rsvp === 'attending') stats.headcount += party;
    // Caterers need to plan for "maybe" guests too.
    const mayEat = g.rsvp === 'attending' || g.rsvp === 'maybe';
    if (mayEat && g.dietary && g.dietary !== 'none') {
      stats.dietary[g.dietary] = (stats.dietary[g.dietary] || 0) + party;
    }
  }
  return stats;
}

/**
 * Aggregate, name-free summary that is safe to send to the AI.
 * @param {Guest[]} guests
 * @returns {import('./types.js').GuestSummary}
 */
export function guestSummaryForAI(guests) {
  const stats = rsvpStats(guests);
  return {
    attending: stats.attending,
    pending: stats.pending + stats.maybe,
    groups: new Set(guests.map((g) => g.group)).size,
    dietary: stats.dietary,
  };
}

/**
 * Seats everyone who has not declined at tables of `tableSize`, keeping
 * groups together where possible (first-fit decreasing bin packing).
 * Groups larger than a table are split across consecutive tables.
 * @param {Guest[]} guests
 * @param {number} tableSize Seats per table, clamped to the allowed range.
 * @returns {{ number: number, seats: Seat[] }[]}
 */
export function planSeating(guests, tableSize) {
  const size = Math.min(LIMITS.tableSizeMax, Math.max(LIMITS.tableSizeMin, Math.round(tableSize) || 8));
  /** @type {Map<string, Seat[]>} */
  const groups = new Map();
  for (const g of guests) {
    if (g.rsvp === 'declined') continue;
    const seats = groups.get(g.group) || [];
    seats.push({ name: g.name, group: g.group, dietary: g.dietary });
    for (let i = 1; i <= (g.plusOnes || 0); i += 1) {
      seats.push({ name: `${g.name} +${i}`, group: g.group, dietary: g.dietary });
    }
    groups.set(g.group, seats);
  }

  const chunks = [];
  for (const seats of groups.values()) {
    for (let i = 0; i < seats.length; i += size) chunks.push(seats.slice(i, i + size));
  }
  chunks.sort((a, b) => b.length - a.length);

  /** @type {{ number: number, seats: Seat[] }[]} */
  const tables = [];
  for (const chunk of chunks) {
    const table = tables.find((t) => t.seats.length + chunk.length <= size);
    if (table) table.seats.push(...chunk);
    else tables.push({ number: tables.length + 1, seats: [...chunk] });
  }
  return tables;
}
