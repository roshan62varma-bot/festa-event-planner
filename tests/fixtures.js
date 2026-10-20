/** Shared test data. TODAY is fixed so date-based logic is deterministic. */
export const TODAY = '2026-10-20';

export const validEvent = Object.freeze({
  type: 'birthday',
  name: 'Asha turns 30',
  date: '2027-01-15',
  guests: 60,
  budget: 250000,
  currency: 'INR',
  location: 'Bengaluru',
  vibe: 'Retro disco',
  notes: 'Two vegan guests',
});

/** A realistic Gemini plan response, deliberately imperfect (bad sums, unknown ids). */
export function geminiPlan() {
  return {
    summary: 'A retro disco night with a mirror-ball centrepiece.',
    theme: { name: 'Disco Fever', description: 'Glitter and neon.', palette: ['Silver #C0C0C0', 'Hot pink #FF3EA5', 'Midnight'] },
    budget: {
      categories: [
        { id: 'venue', amount: 50000, rationale: 'Rooftop hire.' },
        { id: 'catering', amount: 90000, rationale: 'Buffet for 60.' },
        { id: 'decor', amount: 30000, rationale: 'Mirror balls.' },
        { id: 'not-a-category', amount: 99999, rationale: 'Should be dropped.' },
        { id: 'contingency', amount: 10000, rationale: 'Buffer.' },
      ],
      savingsTips: ['Rent mirror balls instead of buying.'],
    },
    milestones: [
      { title: 'Book the rooftop', detail: 'Confirm capacity.', weeksBefore: 10, priority: 'high', category: 'venue' },
      { title: 'Send invites', detail: 'Ask for dietary needs.', weeksBefore: 6, priority: 'urgent', category: 'guests' },
      { title: '', detail: 'Empty title is dropped.', weeksBefore: 2, priority: 'low', category: 'decor' },
    ],
    runOfShow: [{ time: '19:00', activity: 'Doors open', owner: 'Host' }, { time: 'late', activity: 'Dance', owner: 'DJ' }],
    vendors: [{ type: 'DJ', why: 'Needs a disco catalogue.', questions: ['Do you bring lights?'], bookWeeksBefore: 8 }],
    watchouts: ['Rooftop wind.'],
  };
}

export function fakeAI(response = geminiPlan()) {
  const calls = [];
  return {
    calls,
    async generateJSON(args) {
      calls.push(args);
      if (response instanceof Error) throw response;
      return { data: typeof response === 'function' ? response(args) : response, model: 'fake-model' };
    },
  };
}

export const silentLogger = { warn() {}, error() {}, log() {} };
