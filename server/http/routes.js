import express from 'express';
import { LIMITS } from '../../shared/constants.js';
import { sanitizeText, toISODate, validateCreativeInput, validateEventInput } from '../../shared/validation.js';
import { apiLimiter, generationLimiter, requireJson } from './security.js';

/** Ideas can be requested for an event that is already under way, so any date is accepted. */
const ANY_DATE = '0000-01-01';
/** A brief is well under 4 KB, so anything near this is not a real request. */
const BODY_LIMIT = '16kb';

/**
 * Wraps an async route so rejected promises reach the error handler.
 * @param {(req: import('express').Request, res: import('express').Response) => Promise<unknown>} handler
 * @returns {import('express').RequestHandler}
 */
const route = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (err) {
    next(err);
  }
};

/**
 * The JSON API: /health, /plan and /ideas.
 * @param {{ planner: import('../services/planner.js').Planner, aiEnabled: boolean, clock: () => Date, rateLimitPerMinute: number }} deps
 */
export function createApiRouter({ planner, aiEnabled, clock, rateLimitPerMinute }) {
  const api = express.Router();
  const generate = generationLimiter(rateLimitPerMinute);

  api.use(apiLimiter());
  api.use(requireJson);
  api.use(express.json({ limit: BODY_LIMIT }));
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  api.get('/health', (req, res) => {
    res.json({ status: 'ok', ai: aiEnabled });
  });

  api.post(
    '/plan',
    generate,
    route(async (req, res) => {
      const event = validateEventInput(req.body?.event, { today: toISODate(clock()) });
      if (!event.ok) {
        res.status(400).json({ error: 'Check the highlighted fields.', fields: event.errors });
        return;
      }
      const refinement = sanitizeText(req.body?.refinement, LIMITS.extraMax);
      res.json(await planner.createPlan(event.value, refinement));
    }),
  );

  api.post(
    '/ideas',
    generate,
    route(async (req, res) => {
      const event = validateEventInput(req.body?.event, { today: ANY_DATE });
      const request = validateCreativeInput(req.body?.request);
      if (!event.ok || !request.ok) {
        res.status(400).json({
          error: 'Check the event details and try again.',
          fields: { ...event.errors, ...request.errors },
        });
        return;
      }
      res.json(await planner.createIdeas(event.value, request.value, { fresh: req.body?.regenerate === true }));
    }),
  );

  api.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  return api;
}
