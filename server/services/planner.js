import { daysUntil } from '../../shared/timeline.js';
import { toISODate } from '../../shared/validation.js';
import { CREATIVE_SCHEMA, PLAN_PART_SCHEMAS } from '../ai/schemas.js';
import { CREATIVE_SYSTEM, PLAN_SYSTEM, buildCreativePrompt, buildPlanPrompt } from '../ai/prompts.js';
import { cacheKey, createCache } from '../lib/cache.js';
import { buildFallbackCreative, buildFallbackPlan } from './fallback.js';
import { sanitizeCreative, sanitizeOverview, sanitizeSchedule } from './sanitize.js';

/** Rejects structurally valid but empty model output so the fallback is used instead. */
function requireContent(value, isComplete) {
  if (!isComplete(value)) throw new Error('Model returned an incomplete result');
  return value;
}

/** "gemini" if every part came from Gemini, "template" if none did, otherwise "partial". */
function combinedSource(results) {
  const fromGemini = results.filter((r) => r.source === 'gemini').length;
  if (fromGemini === results.length) return 'gemini';
  return fromGemini === 0 ? 'template' : 'partial';
}

/**
 * Orchestrates plan and idea generation: cache → Gemini → sanitise,
 * falling back to a deterministic template if Gemini is not available.
 * Every result says where it came from (`source`), so the UI can be honest about it.
 *
 * @param {{ ai: { generateJSON: Function } | null, cache?: ReturnType<typeof createCache>, logger?: Console, clock?: () => Date }} deps
 */
export function createPlanner({ ai, cache = createCache(), logger = console, clock = () => new Date() }) {
  async function run({ key, system, prompt, schema, temperature, sanitize, fallback, fresh = false }) {
    const cached = fresh ? undefined : cache.get(key);
    if (cached) return { ...cached, cached: true };

    if (ai) {
      try {
        const { data, model } = await ai.generateJSON({ system, prompt, schema, temperature });
        const result = { data: sanitize(data), source: 'gemini', model };
        cache.set(key, result);
        return { ...result, cached: false };
      } catch (err) {
        logger.warn?.(`[planner] Gemini unavailable, using fallback: ${err.cause?.message ?? err.message}`);
      }
    }
    // Fallbacks are not cached, so the next request retries Gemini.
    return { data: fallback(), source: 'template', model: null, cached: false };
  }

  return {
    async createPlan(event, refinement = '') {
      const today = toISODate(clock());
      const maxWeeks = Math.max(0, Math.floor(daysUntil(event.date, today) / 7));
      let template;
      const fallbackPlan = () => (template ??= buildFallbackPlan(event, { maxWeeks }));

      // Both halves run in parallel; each falls back to its template half independently.
      const [overview, schedule] = await Promise.all([
        run({
          key: cacheKey('plan-overview', event, refinement, today),
          system: PLAN_SYSTEM,
          prompt: buildPlanPrompt(event, { part: 'overview', refinement, today }),
          schema: PLAN_PART_SCHEMAS.overview,
          temperature: 0.7,
          sanitize: (raw) => requireContent(sanitizeOverview(raw, event), (p) => p.summary),
          fallback: () => {
            const { summary, theme, budget, watchouts } = fallbackPlan();
            return { summary, theme, budget, watchouts };
          },
        }),
        run({
          key: cacheKey('plan-schedule', event, refinement, today),
          system: PLAN_SYSTEM,
          prompt: buildPlanPrompt(event, { part: 'schedule', refinement, today }),
          schema: PLAN_PART_SCHEMAS.schedule,
          temperature: 0.6,
          sanitize: (raw) => requireContent(sanitizeSchedule(raw, maxWeeks), (p) => p.milestones.length),
          fallback: () => {
            const { milestones, runOfShow, vendors } = fallbackPlan();
            return { milestones, runOfShow, vendors };
          },
        }),
      ]);

      return {
        plan: { ...overview.data, ...schedule.data },
        source: combinedSource([overview, schedule]),
        model: overview.model ?? schedule.model,
        cached: overview.cached && schedule.cached,
      };
    },

    async createIdeas(event, input, { fresh = false } = {}) {
      const today = toISODate(clock());
      const result = await run({
        key: cacheKey('creative', event, input),
        system: CREATIVE_SYSTEM,
        prompt: buildCreativePrompt(event, input, { today }),
        schema: CREATIVE_SCHEMA,
        temperature: 0.95,
        sanitize: (raw) => requireContent(sanitizeCreative(raw), (r) => r.items.length),
        fallback: () => buildFallbackCreative(event, input),
        fresh,
      });
      return { ideas: result.data, source: result.source, model: result.model, cached: result.cached };
    },
  };
}
