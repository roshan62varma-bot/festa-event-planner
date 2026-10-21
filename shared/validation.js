import { CREATIVE_KINDS, CURRENCIES, EVENT_TYPES, INVITE_TONES, LIMITS, VENDOR_TYPES, idsOf } from './constants.js';

// Control characters (except tab and newline) are stripped from every text field.
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalises untrusted text: strips control chars, collapses spaces, trims, caps length.
 * @param {unknown} value Returns '' for anything that is not a string.
 * @param {number} maxLength
 */
export function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHARS, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

/** Local calendar date as YYYY-MM-DD. @param {Date} date */
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True for a real calendar date in YYYY-MM-DD form (rejects 2025-02-30). @param {unknown} value */
export function isValidISODate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Parses a whole number, accepting "1,500" and " 12 ". Returns NaN for blanks and booleans.
 * @param {unknown} value
 */
export function toInteger(value) {
  const n = typeof value === 'string' ? Number(value.replace(/[, ]/g, '')) : Number(value);
  return typeof value !== 'boolean' && value !== '' && value !== null && Number.isFinite(n) ? Math.round(n) : NaN;
}

/**
 * Validates the event brief. Used by the form (instant feedback) and by the API
 * (authoritative check), so both layers apply exactly the same rules.
 * @param {unknown} raw Untrusted input.
 * @param {{ today?: string }} [options] Dates before `today` are rejected.
 * @returns {import('./types.js').Validation<import('./types.js').EventBrief>}
 */
export function validateEventInput(raw, { today = toISODate(new Date()) } = {}) {
  /** @type {Record<string, any>} */
  const input = raw && typeof raw === 'object' ? raw : {};
  /** @type {Record<string, string>} */
  const errors = {};

  const type = idsOf(EVENT_TYPES).includes(input.type) ? input.type : '';
  if (!type) errors.type = 'Choose what you are celebrating.';

  const name = sanitizeText(input.name, LIMITS.nameMax);
  if (!name) errors.name = 'Give your event a name, like "Asha turns 30".';

  const date = typeof input.date === 'string' ? input.date : '';
  if (!isValidISODate(date)) errors.date = 'Pick the event date.';
  else if (date < today) errors.date = 'That date has passed. Pick today or a later date.';

  const guests = toInteger(input.guests);
  if (!(guests >= LIMITS.guestsMin && guests <= LIMITS.guestsMax)) {
    errors.guests = `Enter a guest count from ${LIMITS.guestsMin} to ${LIMITS.guestsMax}.`;
  }

  const budget = toInteger(input.budget);
  if (!(budget >= LIMITS.budgetMin && budget <= LIMITS.budgetMax)) {
    errors.budget = `Enter a budget of at least ${LIMITS.budgetMin}.`;
  }

  const currency = CURRENCIES.includes(input.currency) ? input.currency : '';
  if (!currency) errors.currency = 'Choose a currency.';

  const value = {
    type,
    name,
    date,
    guests,
    budget,
    currency,
    location: sanitizeText(input.location, LIMITS.locationMax),
    vibe: sanitizeText(input.vibe, LIMITS.vibeMax),
    notes: sanitizeText(input.notes, LIMITS.notesMax),
  };

  return { ok: Object.keys(errors).length === 0, value, errors };
}

/**
 * Validates a creative studio request. Invalid optional fields fall back to safe defaults.
 * @param {unknown} raw Untrusted input.
 * @returns {import('./types.js').Validation<import('./types.js').CreativeRequest>}
 */
export function validateCreativeInput(raw) {
  /** @type {Record<string, any>} */
  const input = raw && typeof raw === 'object' ? raw : {};
  /** @type {Record<string, string>} */
  const errors = {};

  const kind = idsOf(CREATIVE_KINDS).includes(input.kind) ? input.kind : '';
  if (!kind) errors.kind = 'Choose what to create.';

  const value = {
    kind,
    tone: INVITE_TONES.includes(input.tone) ? input.tone : 'warm',
    vendorType: VENDOR_TYPES.includes(input.vendorType) ? input.vendorType : VENDOR_TYPES[0],
    extra: sanitizeText(input.extra, LIMITS.extraMax),
    guestSummary:
      input.guestSummary && typeof input.guestSummary === 'object' ? sanitizeGuestSummary(input.guestSummary) : null,
  };

  return { ok: !errors.kind, value, errors };
}

/** Bounds for the aggregate guest summary. */
const SUMMARY_LIMITS = Object.freeze({ dietaryKinds: 12, dietaryLabelMax: 24, groupsMax: 100 });

/** A non-negative whole count, capped at the largest guest list we accept. @param {unknown} n */
const count = (n) => Math.max(0, Math.min(LIMITS.guestsMax, toInteger(n) || 0));

/**
 * Only aggregate, non-identifying numbers about guests ever reach the AI.
 * Any other field (such as names) is dropped.
 * @param {Record<string, any>} summary Untrusted input.
 * @returns {import('./types.js').GuestSummary}
 */
export function sanitizeGuestSummary(summary) {
  /** @type {Record<string, number>} */
  const dietary = {};
  if (summary.dietary && typeof summary.dietary === 'object') {
    for (const [key, n] of Object.entries(summary.dietary).slice(0, SUMMARY_LIMITS.dietaryKinds)) {
      const label = sanitizeText(key, SUMMARY_LIMITS.dietaryLabelMax);
      if (label) dietary[label] = count(n);
    }
  }
  return {
    attending: count(summary.attending),
    pending: count(summary.pending),
    groups: Math.min(SUMMARY_LIMITS.groupsMax, count(summary.groups)),
    dietary,
  };
}
