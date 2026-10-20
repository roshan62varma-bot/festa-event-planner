import { GoogleGenAI } from '@google/genai';

export const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
/** How long a model that just failed is moved to the back of the queue. */
const COOLDOWN_MS = 60_000;
/** Not worth starting another model attempt with less time than this left. */
const MIN_ATTEMPT_MS = 1_000;
const MISSING_MODEL = /\b404\b|NOT_FOUND|is not found|no longer available/i;
// A bad or unauthorised key fails the same way on every model, so stop early.
const AUTH_FAILURE = /\b(401|403)\b|API key|PERMISSION_DENIED|UNAUTHENTICATED/i;

export class AIUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'AIUnavailableError';
    this.cause = cause;
  }
}

/** Parses model output as JSON, tolerating stray markdown fences. Returns null if it cannot. */
export function parseModelJSON(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * @typedef {object} GeminiClientOptions
 * @property {string} [apiKey] Required unless `sdk` is supplied.
 * @property {string[]} [models] Fallback order.
 * @property {number} [timeoutMs] Per-model attempt limit.
 * @property {number} [deadlineMs] Total limit across all attempts.
 * @property {string} [thinkingLevel] MINIMAL, LOW, MEDIUM or HIGH.
 * @property {{ models: { generateContent: (request: object) => Promise<{ text?: string }> } }} [sdk] Injected in tests.
 * @property {() => number} [now] Clock in milliseconds, injected in tests.
 */

/**
 * @typedef {object} GenerateRequest
 * @property {string} system System instruction with the rules.
 * @property {string} prompt Task plus the user data block.
 * @property {object} schema JSON Schema the response must match.
 * @property {number} [temperature]
 */

/**
 * The only interface the rest of the server depends on, so tests can swap in a fake.
 * @typedef {{ generateJSON: (request: GenerateRequest) => Promise<{ data: unknown, model: string }> }} AIClient
 */

/**
 * Creates a small JSON-only wrapper around the Gemini API.
 * Models are tried in order: failures such as rate limits or overload move on to
 * the next model, auth failures stop immediately, and models the API reports as
 * missing are skipped for the rest of the process lifetime so later requests do
 * not pay for that round trip again. A model that just failed (overloaded, timed
 * out) is tried last for a minute, so one busy model does not slow every request.
 * `deadlineMs` caps the total time across models.
 *
 * @param {GeminiClientOptions} options
 * @returns {AIClient}
 */
export function createGeminiClient({
  apiKey,
  models = DEFAULT_MODELS,
  timeoutMs = 20_000,
  deadlineMs = 55_000,
  thinkingLevel = 'LOW',
  sdk,
  now = Date.now,
}) {
  const client = sdk ?? new GoogleGenAI({ apiKey });
  /** Models the API reported as missing or retired. */
  const unavailable = new Set();
  /** @type {Map<string, number>} model -> time (ms) its cooldown ends */
  const coolingUntil = new Map();

  /** Healthy models first, in configured order, then recently failed ones. */
  const order = () => {
    const t = now();
    const usable = models.filter((m) => !unavailable.has(m));
    return [...usable.filter((m) => !(coolingUntil.get(m) > t)), ...usable.filter((m) => coolingUntil.get(m) > t)];
  };

  /** @type {AIClient['generateJSON']} */
  async function generateJSON({ system, prompt, schema, temperature = 0.8 }) {
    let lastError;
    const deadline = now() + deadlineMs;
    for (const model of order()) {
      const remaining = deadline - now();
      if (remaining <= MIN_ATTEMPT_MS) break;
      try {
        const response = await /** @type {{ generateContent: (r: object) => Promise<{ text?: string }> }} */ (
          client.models
        ).generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            temperature,
            // Low thinking keeps a full plan to seconds rather than most of a minute.
            ...(thinkingLevel && { thinkingConfig: { thinkingLevel } }),
            abortSignal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
          },
        });
        const data = parseModelJSON(response.text);
        if (data) {
          coolingUntil.delete(model);
          return { data, model };
        }
        lastError = new Error(`Model ${model} returned unparseable JSON`);
      } catch (err) {
        lastError = err;
        const message = String(err?.message ?? err);
        if (AUTH_FAILURE.test(message)) break;
        if (MISSING_MODEL.test(message)) unavailable.add(model);
        else coolingUntil.set(model, now() + COOLDOWN_MS);
      }
    }
    throw new AIUnavailableError('Gemini could not complete the request', lastError);
  }

  return { generateJSON };
}
