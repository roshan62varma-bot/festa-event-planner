import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { DEFAULT_MODELS, createGeminiClient } from './ai/gemini.js';
import { createPlanner } from './services/planner.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apiKey = process.env.GEMINI_API_KEY?.trim();
const models = process.env.GEMINI_MODELS?.split(',').map((m) => m.trim()).filter(Boolean) ?? DEFAULT_MODELS;

const thinkingLevel = process.env.GEMINI_THINKING_LEVEL?.trim() || 'LOW';
const ai = apiKey ? createGeminiClient({ apiKey, models, thinkingLevel }) : null;
if (!ai) console.warn('[server] GEMINI_API_KEY is not set. Plans will use the built-in starter templates.');

const app = createApp({
  planner: createPlanner({ ai }),
  aiEnabled: Boolean(ai),
  staticDir: path.join(root, 'dist'),
});

const port = Number(process.env.PORT) || 8787;
const server = app.listen(port, () => {
  console.log(`[server] Festa running on http://localhost:${port} (models: ${ai ? models.join(', ') : 'templates only'})`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
