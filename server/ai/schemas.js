import { BUDGET_CATEGORIES, PRIORITIES } from '../../shared/constants.js';

/**
 * JSON Schemas passed to Gemini as `responseJsonSchema`, so the model is
 * constrained to the exact shape the UI renders. Output is still re-validated
 * server-side in services/sanitize.js because schemas constrain shape, not truth.
 *
 * The plan schema deliberately has no maxItems: combined with its enums it
 * exceeds Gemini's schema complexity limit (400 INVALID_ARGUMENT). List sizes
 * are requested in the prompt and enforced by the sanitiser instead.
 */

const str = (description) => ({ type: 'string', description });
const strList = (description, maxItems) => ({ type: 'array', items: { type: 'string' }, ...(maxItems && { maxItems }), description });

export const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: str('Two or three sentences describing the plan and its guiding idea.'),
    theme: {
      type: 'object',
      properties: {
        name: str('Short evocative theme name.'),
        description: str('One sentence on the look and feel.'),
        palette: strList('Three to five colour names with hex codes, e.g. "Marigold #F2A900".'),
      },
      required: ['name', 'description', 'palette'],
    },
    budget: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', enum: BUDGET_CATEGORIES.map((c) => c.id) },
              amount: { type: 'number', description: 'Planned spend in the event currency.' },
              rationale: str('Why this amount, in one sentence, mentioning local price realities.'),
            },
            required: ['id', 'amount', 'rationale'],
          },
        },
        savingsTips: strList('Specific, actionable ways to cut cost without hurting the experience.'),
      },
      required: ['categories', 'savingsTips'],
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: str('Task in imperative form, e.g. "Book the venue".'),
          detail: str('One sentence on how to do it well.'),
          weeksBefore: { type: 'number', description: 'Ideal completion, in weeks before the event. 0 means the week of.' },
          priority: { type: 'string', enum: PRIORITIES },
          category: { type: 'string', enum: [...BUDGET_CATEGORIES.map((c) => c.id), 'guests', 'logistics'] },
        },
        required: ['title', 'detail', 'weeksBefore', 'priority', 'category'],
      },
    },
    runOfShow: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          time: str('24-hour time, HH:MM.'),
          activity: str('What happens.'),
          owner: str('Who is responsible, e.g. "MC", "Caterer", "Host".'),
        },
        required: ['time', 'activity', 'owner'],
      },
    },
    vendors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: str('Vendor type, e.g. "Caterer".'),
          why: str('What to look for in this vendor for this event.'),
          questions: strList('Questions to ask before booking.'),
          bookWeeksBefore: { type: 'number' },
        },
        required: ['type', 'why', 'questions', 'bookWeeksBefore'],
      },
    },
    watchouts: strList('Risks specific to this event, such as weather, permits or accessibility.'),
  },
  required: ['summary', 'theme', 'budget', 'milestones', 'runOfShow', 'vendors', 'watchouts'],
};

const pick = (keys) => ({
  type: 'object',
  properties: Object.fromEntries(keys.map((k) => [k, PLAN_SCHEMA.properties[k]])),
  required: keys,
});

/** The plan is generated in two halves in parallel; see buildPlanPrompt. */
export const PLAN_PART_SCHEMAS = {
  overview: pick(['summary', 'theme', 'budget', 'watchouts']),
  schedule: pick(['milestones', 'runOfShow', 'vendors']),
};

export const CREATIVE_SCHEMA = {
  type: 'object',
  properties: {
    title: str('Heading for this set of ideas.'),
    intro: str('One sentence framing the ideas.'),
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          heading: str('Name of the idea, song title and artist, or email subject line.'),
          body: str('The idea itself, the full wording, or the full email body.'),
          tags: strList('Short tags such as a moment, colour or duration.', 4),
        },
        required: ['heading', 'body', 'tags'],
      },
    },
  },
  required: ['title', 'intro', 'items'],
};
