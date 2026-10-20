import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { validateCreativeInput, validateEventInput, sanitizeText, toISODate } from '../shared/validation.js';
import { LIMITS } from '../shared/constants.js';

/**
 * Builds the Express app. Dependencies are injected so tests can supply a
 * fake planner and run the whole HTTP stack without network access.
 *
 * @param {{ planner: ReturnType<import('./services/planner.js').createPlanner>, aiEnabled: boolean, staticDir?: string, clock?: () => Date, rateLimitPerMinute?: number }} deps
 */
export function createApp({ planner, aiEnabled, staticDir, clock = () => new Date(), rateLimitPerMinute = 15 }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Behind one proxy on Render, so req.ip is the real client.

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());

  const api = express.Router();
  api.use(express.json({ limit: '16kb' }));
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Generation endpoints call a paid API, so they get a tighter per-IP budget.
  const generationLimiter = rateLimit({
    windowMs: 60_000,
    limit: rateLimitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'You are generating very quickly. Wait a minute and try again.' },
  });

  const today = () => toISODate(clock());

  api.get('/health', (req, res) => {
    res.json({ status: 'ok', ai: aiEnabled });
  });

  api.post('/plan', generationLimiter, async (req, res, next) => {
    try {
      const { ok, value, errors } = validateEventInput(req.body?.event, { today: today() });
      if (!ok) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
      const refinement = sanitizeText(req.body?.refinement, LIMITS.extraMax);
      res.json(await planner.createPlan(value, refinement));
    } catch (err) {
      next(err);
    }
  });

  api.post('/ideas', generationLimiter, async (req, res, next) => {
    try {
      // Ideas can be requested for an event that has already started, so dates in the past are allowed here.
      const event = validateEventInput(req.body?.event, { today: '0000-01-01' });
      const request = validateCreativeInput(req.body?.request);
      if (!event.ok || !request.ok) {
        return res.status(400).json({ error: 'Check the event details and try again.', fields: { ...event.errors, ...request.errors } });
      }
      res.json(await planner.createIdeas(event.value, request.value, { fresh: req.body?.regenerate === true }));
    } catch (err) {
      next(err);
    }
  });

  api.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use('/api', api);

  if (staticDir && existsSync(staticDir)) {
    app.use(
      '/assets',
      express.static(path.join(staticDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
    );
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || !req.accepts('html')) return next();
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  // Never leak stack traces. Body-parser errors carry a 4xx status and a safe message.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error('[server]', err);
    const message = status === 413 ? 'That request is too large.' : status < 500 ? 'The request could not be read.' : 'Something went wrong on our side. Try again.';
    res.status(status).json({ error: message });
  });

  return app;
}
