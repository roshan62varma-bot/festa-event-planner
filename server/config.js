import { DEFAULT_MODELS } from './ai/gemini.js';

const THINKING_LEVELS = new Set(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH']);

export const DEFAULTS = Object.freeze({
  port: 8787,
  thinkingLevel: 'LOW',
  /** Render, like most hosts, puts one proxy in front of the app. */
  trustProxy: 1,
  rateLimitPerMinute: 15,
});

/**
 * @typedef {object} ServerConfig
 * @property {number} port
 * @property {string | null} apiKey Gemini API key, or null to run on templates only.
 * @property {string[]} models Gemini models in fallback order.
 * @property {string} thinkingLevel
 * @property {number} trustProxy Number of reverse proxies in front of the app.
 * @property {number} rateLimitPerMinute Generation requests allowed per client per minute.
 */

/**
 * A whole number of at least `min`, or `fallback` if the value is missing or invalid.
 * @param {string | undefined} value
 * @param {number} fallback
 * @param {number} [min]
 */
const intAtLeast = (value, fallback, min = 0) => {
  const n = Number(value);
  return value?.trim() && Number.isInteger(n) && n >= min ? n : fallback;
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
    port: intAtLeast(env.PORT, DEFAULTS.port),
    apiKey: env.GEMINI_API_KEY?.trim() || null,
    models: models.length ? models : DEFAULT_MODELS,
    thinkingLevel: THINKING_LEVELS.has(thinkingLevel) ? thinkingLevel : DEFAULTS.thinkingLevel,
    trustProxy: intAtLeast(env.TRUST_PROXY, DEFAULTS.trustProxy),
    // Zero would block every generation request, so the limit must be at least one.
    rateLimitPerMinute: intAtLeast(env.RATE_LIMIT_PER_MINUTE, DEFAULTS.rateLimitPerMinute, 1),
  };
}
