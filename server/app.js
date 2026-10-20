import compression from 'compression';
import express from 'express';
import { clientRouter } from './http/client.js';
import { errorHandler } from './http/errors.js';
import { createApiRouter } from './http/routes.js';
import { securityHeaders } from './http/security.js';

/**
 * @typedef {object} AppDeps
 * @property {import('./services/planner.js').Planner} planner
 * @property {boolean} aiEnabled Reported by /api/health.
 * @property {string} [staticDir] Built client to serve, if any.
 * @property {() => Date} [clock] Injectable for date-dependent validation in tests.
 * @property {number} [rateLimitPerMinute] Generation requests per client per minute.
 * @property {number} [trustProxy] Reverse proxies in front of the app (1 on Render).
 * @property {{ error: (...args: unknown[]) => void }} [logger]
 */

/**
 * Builds the Express app. Dependencies are injected so tests can run the whole
 * HTTP stack with a fake planner and no network access.
 * @param {AppDeps} deps
 */
export function createApp({
  planner,
  aiEnabled,
  staticDir,
  clock = () => new Date(),
  rateLimitPerMinute = 15,
  trustProxy = 1,
  logger = console,
}) {
  const app = express();
  app.disable('x-powered-by');
  // Lets rate limiting see the real client IP behind the hosting proxy.
  app.set('trust proxy', trustProxy);

  app.use(securityHeaders());
  app.use(compression());
  app.use('/api', createApiRouter({ planner, aiEnabled, clock, rateLimitPerMinute }));
  app.use(clientRouter(staticDir));
  app.use(errorHandler(logger));

  return app;
}
