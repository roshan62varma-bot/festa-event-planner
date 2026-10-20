import { BUDGET_CATEGORIES, DEFAULT_SHARES, EVENT_TYPES } from '../../shared/constants.js';
import { allocate } from '../../shared/budget.js';

/**
 * Deterministic plans used when no Gemini key is configured or every model
 * is unavailable. The app stays fully usable and the UI labels the result
 * as a starter template, so hosts are never shown a blank screen.
 */

/** @typedef {import('../../shared/types.js').Milestone} Milestone */

/** @type {Omit<Milestone, 'id'>[]} */
const MILESTONES = [
  {
    title: 'Lock the date, budget and guest estimate',
    detail: 'Agree the non-negotiables with everyone who is paying or hosting.',
    weeksBefore: 16,
    priority: 'high',
    category: 'logistics',
  },
  {
    title: 'Book the venue',
    detail: 'Visit two or three options and confirm capacity, accessibility and what is included.',
    weeksBefore: 14,
    priority: 'high',
    category: 'venue',
  },
  {
    title: 'Shortlist and book the caterer',
    detail: 'Ask for a tasting and a per-head quote that includes service and taxes.',
    weeksBefore: 12,
    priority: 'high',
    category: 'catering',
  },
  {
    title: 'Book photography and entertainment',
    detail: 'Popular dates go first, so secure them once the venue is confirmed.',
    weeksBefore: 10,
    priority: 'medium',
    category: 'entertainment',
  },
  {
    title: 'Send save-the-dates or invitations',
    detail: 'Ask for RSVPs and dietary needs in the same message.',
    weeksBefore: 8,
    priority: 'high',
    category: 'guests',
  },
  {
    title: 'Finalise decor and theme details',
    detail: 'Order anything custom now to avoid rush fees.',
    weeksBefore: 6,
    priority: 'medium',
    category: 'decor',
  },
  {
    title: 'Confirm audio, lighting and power needs',
    detail: 'Share the run of show with the AV team and test the microphones.',
    weeksBefore: 4,
    priority: 'medium',
    category: 'av',
  },
  {
    title: 'Chase missing RSVPs and confirm final numbers',
    detail: 'Give the caterer the final headcount and dietary split.',
    weeksBefore: 2,
    priority: 'high',
    category: 'guests',
  },
  {
    title: 'Plan seating and print signage',
    detail: 'Keep groups together and seat guests with mobility needs near exits.',
    weeksBefore: 1,
    priority: 'medium',
    category: 'stationery',
  },
  {
    title: 'Pack the day-of kit',
    detail: 'Tape, scissors, chargers, first-aid kit, vendor contacts and cash for tips.',
    weeksBefore: 0,
    priority: 'low',
    category: 'logistics',
  },
];

const RUN_OF_SHOW = [
  { time: '15:00', activity: 'Vendors arrive and setup begins', owner: 'Host' },
  { time: '16:30', activity: 'Sound check and lighting test', owner: 'AV team' },
  { time: '17:30', activity: 'Final walkthrough and photos of the setup', owner: 'Photographer' },
  { time: '18:00', activity: 'Guests arrive, welcome drinks', owner: 'Caterer' },
  { time: '18:45', activity: 'Welcome speech and icebreaker', owner: 'MC' },
  { time: '19:30', activity: 'Dinner service', owner: 'Caterer' },
  { time: '20:30', activity: 'Main moment: toasts, cake or keynote', owner: 'Host' },
  { time: '21:00', activity: 'Music and open floor', owner: 'DJ' },
  { time: '22:30', activity: 'Farewell and favours', owner: 'Host' },
  { time: '23:00', activity: 'Teardown and vendor sign-off', owner: 'Host' },
];

const VENDORS = [
  {
    type: 'Venue',
    why: 'Capacity, step-free access and what is included decide most other costs.',
    questions: [
      'What is included in the hire fee?',
      'Are there curfews or noise limits?',
      'What is the cancellation policy?',
    ],
    bookWeeksBefore: 14,
  },
  {
    type: 'Caterer',
    why: 'Food is usually the biggest line item and the thing guests remember.',
    questions: [
      'Is service and tax included per head?',
      'How do you handle allergies?',
      'What is the minimum guarantee?',
    ],
    bookWeeksBefore: 12,
  },
  {
    type: 'Photographer',
    why: 'Look for a portfolio of events in similar light and venues.',
    questions: ['How many edited photos, and by when?', 'Are travel costs extra?'],
    bookWeeksBefore: 10,
  },
  {
    type: 'DJ or band',
    why: 'Pick someone who reads a room and supplies their own equipment.',
    questions: ['Do you bring a microphone for speeches?', 'Can we share a do-not-play list?'],
    bookWeeksBefore: 10,
  },
  {
    type: 'Decorator',
    why: 'A clear brief and a reuse plan keep decor costs in check.',
    questions: ['Which pieces are rentals versus purchases?', 'Is setup and teardown included?'],
    bookWeeksBefore: 6,
  },
];

const RATIONALE = {
  venue: 'Hire fee plus deposits for the space.',
  catering: 'Per-head food and drinks, including service.',
  decor: 'Flowers, linens, lighting and signage.',
  av: 'Sound, microphones and any screens.',
  entertainment: 'Music, performers or activities.',
  photography: 'Capturing the day.',
  stationery: 'Invitations, place cards and favours.',
  contingency: 'Held back for surprises and last-minute fixes.',
};

/**
 * A complete plan from proven defaults, scaled to the brief's budget and time available.
 * @param {import('../../shared/types.js').EventBrief} event
 * @param {{ maxWeeks: number }} options Weeks between today and the event.
 * @returns {import('../../shared/types.js').Plan}
 */
export function buildFallbackPlan(event, { maxWeeks }) {
  const type = EVENT_TYPES.find((t) => t.id === event.type);
  const amounts = allocate(event.budget, DEFAULT_SHARES[event.type] ?? DEFAULT_SHARES.birthday);
  return {
    summary: `A starter plan for ${event.name}, ${type?.phrase ?? 'your event'} for ${event.guests} guests. It follows a proven timeline and a typical budget split you can adjust.`,
    theme: {
      name: event.vibe ? event.vibe.slice(0, 60) : 'Simple and joyful',
      description: 'A clean, welcoming look that lets the people and the food take centre stage.',
      palette: ['Ivory #FFFDF7', 'Sage #A3B18A', 'Blush #E8B4B8', 'Gold #C9A227'],
    },
    budget: {
      currency: event.currency,
      total: event.budget,
      categories: BUDGET_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        amount: amounts[c.id],
        rationale: RATIONALE[c.id],
      })),
      savingsTips: [
        'Choose a weekday or daytime slot, where venues often charge less.',
        'Serve a buffet or family-style meal instead of plated service.',
        'Reuse ceremony flowers and decor at the reception.',
        'Send digital invitations and print only for guests who prefer paper.',
      ],
    },
    milestones: MILESTONES.map((m, i) => ({ ...m, id: `m${i + 1}`, weeksBefore: Math.min(m.weeksBefore, maxWeeks) })),
    runOfShow: RUN_OF_SHOW,
    vendors: VENDORS.map((v) => ({ ...v, bookWeeksBefore: Math.min(v.bookWeeksBefore, maxWeeks) })),
    watchouts: [
      'Have a backup plan if any part of the event is outdoors.',
      'Check whether the venue needs permits for music or decorations.',
      'Make sure there is step-free access and seating for older guests.',
    ],
  };
}

const CREATIVE = {
  decor: [
    {
      heading: 'Garden glow',
      body: 'Fairy lights, potted herbs as centrepieces and linen runners. Herbs double as favours.',
      tags: ['Sage', 'Ivory', 'Warm white'],
    },
    {
      heading: 'Modern brights',
      body: 'Solid colour blocks, paper fans and bold balloon garlands. Paper decor is cheap and easy to make yourself.',
      tags: ['Coral', 'Teal', 'Sunflower'],
    },
    {
      heading: 'Candlelit classic',
      body: 'Clustered pillar candles, mirrors and white blooms for an elegant evening feel.',
      tags: ['Gold', 'Cream', 'Black'],
    },
  ],
  playlist: [
    { heading: 'Here Comes the Sun, The Beatles', body: 'Gentle and bright for arrivals.', tags: ['Arrival'] },
    { heading: 'September, Earth, Wind & Fire', body: 'Gets every generation moving.', tags: ['Dance floor'] },
    { heading: 'Dancing Queen, ABBA', body: 'A guaranteed sing-along.', tags: ['Peak'] },
    {
      heading: 'Somewhere Over the Rainbow, Israel Kamakawiwo’ole',
      body: 'Soft close to the night.',
      tags: ['Farewell'],
    },
  ],
  icebreakers: [
    {
      heading: 'Two truths and a wish',
      body: 'Each guest shares two true facts and one wish for the host. Others guess which is the wish.',
      tags: ['10 min', 'Tables'],
    },
    {
      heading: 'Find someone who',
      body: 'Hand out bingo cards with prompts like "has visited three continents". The first full row wins.',
      tags: ['15 min', 'Everyone'],
    },
  ],
  activities: [
    {
      heading: 'Memory wall',
      body: 'Guests pin a photo or note for the host. It becomes a keepsake.',
      tags: ['All ages'],
    },
    {
      heading: 'Labelled food stations',
      body: 'Group dishes by dietary need with clear labels so every guest eats confidently.',
      tags: ['Dinner'],
    },
  ],
  invite: [
    {
      heading: 'Classic',
      body: 'You are warmly invited to celebrate {name} on {date}{place}. Please RSVP and let us know about any dietary needs. We can’t wait to celebrate with you!',
      tags: ['Email', 'Printed card'],
    },
  ],
  'vendor-email': [
    {
      heading: 'Quote request for {name} on {date}',
      body: 'Hello,\n\nWe are planning {name} on {date}{place} for about {guests} guests. Could you share your availability, a detailed quote including taxes and service, what is included, and your cancellation policy?\n\nThank you,\n[Your name]',
      tags: ['Availability', 'Quote'],
    },
  ],
};

/**
 * Starter ideas for one creative kind, with the event details filled in.
 * @param {import('../../shared/types.js').EventBrief} event
 * @param {{ kind: string }} input
 * @returns {import('../../shared/types.js').Ideas}
 */
export function buildFallbackCreative(event, input) {
  const fill = (s) =>
    s
      .replaceAll('{name}', event.name)
      .replaceAll('{date}', event.date)
      .replaceAll('{guests}', String(event.guests))
      .replaceAll('{place}', event.location ? ` in ${event.location}` : '');
  return {
    title: 'Starter ideas',
    intro: 'Ready-made ideas to get you going. Connect Gemini for ideas tailored to your event.',
    items: CREATIVE[input.kind].map((item) => ({ ...item, heading: fill(item.heading), body: fill(item.body) })),
  };
}
