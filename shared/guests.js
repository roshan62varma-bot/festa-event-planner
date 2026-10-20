import { DIETARY_OPTIONS, LIMITS, RSVP_STATUSES, idsOf } from './constants.js';
import { sanitizeText, toInteger } from './validation.js';

const RSVP_IDS = idsOf(RSVP_STATUSES);
const DIETARY_IDS = idsOf(DIETARY_OPTIONS);

/** Validates one guest entry from the guest form. */
export function validateGuest(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const errors = {};
  const name = sanitizeText(input.name, LIMITS.guestNameMax);
  if (!name) errors.name = 'Enter the guest’s name.';
  const plusOnes = toInteger(input.plusOnes ?? 0);
  if (!(plusOnes >= 0 && plusOnes <= 10)) errors.plusOnes = 'Plus-ones must be between 0 and 10.';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      name,
      group: sanitizeText(input.group, 40) || 'Friends',
      rsvp: RSVP_IDS.includes(input.rsvp) ? input.rsvp : 'pending',
      dietary: DIETARY_IDS.includes(input.dietary) ? input.dietary : 'none',
      plusOnes: Number.isNaN(plusOnes) ? 0 : plusOnes,
    },
  };
}

/** Headcount and dietary totals. Plus-ones inherit the guest's dietary need. */
export function rsvpStats(guests) {
  const stats = { invited: 0, attending: 0, pending: 0, maybe: 0, declined: 0, headcount: 0, dietary: {} };
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

/** Aggregate, name-free summary that is safe to send to the AI. */
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
 * @returns {{ number: number, seats: { name: string, group: string, dietary: string }[] }[]}
 */
export function planSeating(guests, tableSize) {
  const size = Math.min(LIMITS.tableSizeMax, Math.max(LIMITS.tableSizeMin, Math.round(tableSize) || 8));
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

  const tables = [];
  for (const chunk of chunks) {
    const table = tables.find((t) => t.seats.length + chunk.length <= size);
    if (table) table.seats.push(...chunk);
    else tables.push({ number: tables.length + 1, seats: [...chunk] });
  }
  return tables;
}
