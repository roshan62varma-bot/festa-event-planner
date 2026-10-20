import { DEFAULT_MODELS } from './ai/gemini.js';

const THINKING_LEVELS = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'];

/**
 * @typedef {object} ServerConfig
 * @property {number} port
 * @property {string | null} apiKey Gemini API key, or null to run on templates only.
 * @property {string[]} models Gemini models in fallback order.
 * @property {string} thinkingLevel
 * @property {number} trustProxy Number of reverse proxies in front of the app.
 * @property {number} rateLimitPerMinute Generation requests allowed per client per minute.
 */

const positiveInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

/**
 * Reads configuration from environment variables, with safe defaults.
 * Kept free of side effects so it can be unit tested with a plain object.
 * @param {Record<string, string | undefined>} env
 * @returns {ServerConfig}
 */
export function loadConfig(env = process.env) {
  const models = (env.GEMINI_MODELS ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => /^[\w.-]+$/.test(m));
  const thinkingLevel = (env.GEMINI_THINKING_LEVEL ?? '').trim().toUpperCase();

  return {
    port: positiveInt(env.PORT, 8787),
    apiKey: env.GEMINI_API_KEY?.trim() || null,
    models: models.length ? models : DEFAULT_MODELS,
    thinkingLevel: THINKING_LEVELS.includes(thinkingLevel) ? thinkingLevel : 'LOW',
    trustProxy: positiveInt(env.TRUST_PROXY, 1),
    rateLimitPerMinute: positiveInt(env.RATE_LIMIT_PER_MINUTE, 15) || 15,
  };
}
