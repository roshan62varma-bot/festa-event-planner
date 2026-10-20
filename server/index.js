import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGeminiClient } from './ai/gemini.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPlanner } from './services/planner.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const config = loadConfig();

const ai = config.apiKey
  ? createGeminiClient({ apiKey: config.apiKey, models: config.models, thinkingLevel: config.thinkingLevel })
  : null;
if (!ai) console.warn('[server] GEMINI_API_KEY is not set. Plans will use the built-in starter templates.');

const app = createApp({
  planner: createPlanner({ ai }),
  aiEnabled: Boolean(ai),
  staticDir: path.join(root, 'dist'),
  rateLimitPerMinute: config.rateLimitPerMinute,
  trustProxy: config.trustProxy,
});

const server = app.listen(config.port, () => {
  const models = ai ? config.models.join(', ') : 'templates only';
  console.log(`[server] Festa running on http://localhost:${config.port} (models: ${models})`);
});

// Bound slow clients: whole requests must arrive within 30 s, headers within 10 s.
// Generation can take up to a minute, so responses are not time-limited here.
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 65_000;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
