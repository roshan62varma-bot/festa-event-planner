/**
 * Shared JSDoc types for the domain model. This module has no runtime code;
 * other modules reference it with `import('./types.js').TypeName`, and
 * `npm run typecheck` verifies the whole codebase against these shapes.
 */

/**
 * A validated event brief.
 * @typedef {object} EventBrief
 * @property {string} type One of EVENT_TYPES ids.
 * @property {string} name
 * @property {string} date ISO date, YYYY-MM-DD.
 * @property {number} guests
 * @property {number} budget Whole currency units.
 * @property {string} currency ISO 4217 code from CURRENCIES.
 * @property {string} location
 * @property {string} vibe
 * @property {string} notes
 */

/**
 * @typedef {'high' | 'medium' | 'low'} Priority
 */

/**
 * @typedef {object} BudgetCategory
 * @property {string} id One of BUDGET_CATEGORIES ids.
 * @property {string} label
 * @property {number} amount
 * @property {string} [rationale]
 */

/**
 * @typedef {object} Milestone
 * @property {string} id Stable within one plan, e.g. "m3".
 * @property {string} title
 * @property {string} detail
 * @property {number} weeksBefore
 * @property {Priority} priority
 * @property {string} category
 */

/**
 * A milestone placed on the calendar relative to today.
 * @typedef {Milestone & { due: string, compressed: boolean, status: TaskStatus }} ScheduledMilestone
 */

/**
 * @typedef {'done' | 'overdue' | 'due-soon' | 'upcoming'} TaskStatus
 */

/**
 * @typedef {object} RunOfShowItem
 * @property {string} time HH:MM, or empty when the model gave no valid time.
 * @property {string} activity
 * @property {string} owner
 */

/**
 * @typedef {object} Vendor
 * @property {string} type
 * @property {string} why
 * @property {string[]} questions
 * @property {number} bookWeeksBefore
 */

/**
 * The complete master plan rendered by the workspace.
 * @typedef {object} Plan
 * @property {string} summary
 * @property {{ name: string, description: string, palette: string[] }} theme
 * @property {{ currency: string, total: number, categories: BudgetCategory[], savingsTips: string[] }} budget
 * @property {Milestone[]} milestones
 * @property {RunOfShowItem[]} runOfShow
 * @property {Vendor[]} vendors
 * @property {string[]} watchouts
 */

/**
 * Where generated content came from, shown honestly in the UI.
 * @typedef {'gemini' | 'partial' | 'template'} ContentSource
 */

/**
 * @typedef {object} Guest
 * @property {string} [id]
 * @property {string} name
 * @property {string} group
 * @property {'pending' | 'attending' | 'maybe' | 'declined'} rsvp
 * @property {string} dietary One of DIETARY_OPTIONS ids.
 * @property {number} plusOnes
 */

/**
 * A guest on the saved list, which always has a stable id.
 * @typedef {Guest & { id: string }} SavedGuest
 */

/**
 * Aggregate, name-free guest numbers: the only guest data ever sent to the AI.
 * @typedef {object} GuestSummary
 * @property {number} attending
 * @property {number} pending
 * @property {number} groups
 * @property {Record<string, number>} dietary
 */

/**
 * @typedef {object} CreativeRequest
 * @property {string} kind One of CREATIVE_KINDS ids.
 * @property {string} tone
 * @property {string} vendorType
 * @property {string} extra
 * @property {GuestSummary | null} guestSummary
 */

/**
 * @typedef {object} Ideas
 * @property {string} title
 * @property {string} intro
 * @property {{ heading: string, body: string, tags: string[] }[]} items
 */

/**
 * Result of a validator: the cleaned value plus field-level messages.
 * @template T
 * @typedef {object} Validation
 * @property {boolean} ok
 * @property {T} value
 * @property {Record<string, string>} errors
 */

export {};
