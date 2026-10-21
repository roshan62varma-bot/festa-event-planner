/**
 * Domain constants shared by the browser and the API server.
 * Keeping them in one module guarantees the client form and the server
 * validator always agree on what is allowed.
 */

export const EVENT_TYPES = Object.freeze([
  { id: 'wedding', label: 'Wedding', phrase: 'a wedding' },
  { id: 'birthday', label: 'Birthday', phrase: 'a birthday' },
  { id: 'conference', label: 'Tech meetup', phrase: 'a tech meetup' },
  { id: 'cultural', label: 'Cultural festival', phrase: 'a festival' },
  { id: 'community', label: 'Community event', phrase: 'a community event' },
  { id: 'milestone', label: 'Anniversary', phrase: 'an anniversary' },
]);

export const BUDGET_CATEGORIES = Object.freeze([
  { id: 'venue', label: 'Venue' },
  { id: 'catering', label: 'Food & drinks' },
  { id: 'decor', label: 'Decor & flowers' },
  { id: 'av', label: 'Audio & visuals' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'photography', label: 'Photo & video' },
  { id: 'stationery', label: 'Invites & favours' },
  { id: 'contingency', label: 'Buffer' },
]);

/** Typical budget shares (each row sums to 1) used when Gemini is unavailable. */
export const DEFAULT_SHARES = Object.freeze({
  wedding: {
    venue: 0.25,
    catering: 0.3,
    decor: 0.12,
    av: 0.05,
    entertainment: 0.08,
    photography: 0.1,
    stationery: 0.03,
    contingency: 0.07,
  },
  birthday: {
    venue: 0.2,
    catering: 0.35,
    decor: 0.15,
    av: 0.05,
    entertainment: 0.12,
    photography: 0.03,
    stationery: 0.03,
    contingency: 0.07,
  },
  conference: {
    venue: 0.3,
    catering: 0.25,
    decor: 0.04,
    av: 0.2,
    entertainment: 0.04,
    photography: 0.05,
    stationery: 0.05,
    contingency: 0.07,
  },
  cultural: {
    venue: 0.2,
    catering: 0.25,
    decor: 0.18,
    av: 0.12,
    entertainment: 0.12,
    photography: 0.04,
    stationery: 0.02,
    contingency: 0.07,
  },
  community: {
    venue: 0.15,
    catering: 0.35,
    decor: 0.1,
    av: 0.12,
    entertainment: 0.1,
    photography: 0.03,
    stationery: 0.05,
    contingency: 0.1,
  },
  milestone: {
    venue: 0.22,
    catering: 0.33,
    decor: 0.14,
    av: 0.05,
    entertainment: 0.08,
    photography: 0.08,
    stationery: 0.03,
    contingency: 0.07,
  },
});

export const CURRENCIES = Object.freeze(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD']);

export const PRIORITIES = Object.freeze(['high', 'medium', 'low']);

export const RSVP_STATUSES = Object.freeze([
  { id: 'pending', label: 'Awaiting reply' },
  { id: 'attending', label: 'Attending' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'declined', label: 'Declined' },
]);

export const DIETARY_OPTIONS = Object.freeze([
  { id: 'none', label: 'No restrictions' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'jain', label: 'Jain' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'nut-allergy', label: 'Nut allergy' },
]);

export const CREATIVE_KINDS = Object.freeze([
  { id: 'decor', label: 'Decor concepts', hint: 'Three themed looks with palettes and key pieces.' },
  { id: 'playlist', label: 'Playlist', hint: 'Songs mapped to each moment of the event.' },
  { id: 'icebreakers', label: 'Icebreakers', hint: 'Quick games that get guests talking.' },
  { id: 'activities', label: 'Guest activities', hint: 'Ideas tailored to your RSVP list and dietary mix.' },
  { id: 'invite', label: 'Invitation wording', hint: 'Ready-to-send invite text in your chosen tone.' },
  { id: 'vendor-email', label: 'Vendor enquiry', hint: 'An email that gets you a clear quote, fast.' },
]);

export const INVITE_TONES = Object.freeze(['warm', 'formal', 'playful', 'minimal']);

export const VENDOR_TYPES = Object.freeze([
  'Venue',
  'Caterer',
  'Decorator',
  'Photographer',
  'DJ or band',
  'AV rental',
  'Baker',
  'Florist',
]);

export const LIMITS = Object.freeze({
  nameMax: 80,
  locationMax: 80,
  vibeMax: 160,
  notesMax: 500,
  extraMax: 300,
  guestNameMax: 60,
  guestsMin: 1,
  guestsMax: 5000,
  budgetMin: 100,
  budgetMax: 1_000_000_000,
  guestListMax: 500,
  tableSizeMin: 2,
  tableSizeMax: 20,
});

/**
 * The ids of a list of `{ id }` objects or plain strings.
 * @param {readonly (string | { id: string })[]} list
 * @returns {string[]}
 */
export const idsOf = (list) => list.map((item) => (typeof item === 'string' ? item : item.id));
