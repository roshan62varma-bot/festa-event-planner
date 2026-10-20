import { GoogleGenAI } from '@google/genai';

export const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
const COOLDOWN_MS = 60_000;
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
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
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
 * Creates a small JSON-only wrapper around the Gemini API.
 * Models are tried in order: failures such as rate limits or overload move on to
 * the next model, auth failures stop immediately, and models the API reports as
 * missing are skipped for the rest of the process lifetime so later requests do
 * not pay for that round trip again. A model that just failed (overloaded, timed
 * out) is tried last for a minute, so one busy model does not slow every request.
 * `deadlineMs` caps the total time across models.
 *
 * @param {{ apiKey: string, models?: string[], timeoutMs?: number, deadlineMs?: number, thinkingLevel?: string, sdk?: { models: { generateContent: Function } }, now?: () => number }} options
 */
export function createGeminiClient({
  apiKey,
  models = DEFAULT_MODELS,
  timeoutMs = 20_000,
  deadlineMs = 55_000,
  thinkingLevel = 'LOW',
  sdk,
  now = Date.now,
} = {}) {
  const client = sdk ?? new GoogleGenAI({ apiKey });
  const unavailable = new Set();
  const coolingUntil = new Map();

  /** Healthy models first, in configured order, then recently failed ones. */
  const order = () => {
    const t = now();
    const usable = models.filter((m) => !unavailable.has(m));
    return [...usable.filter((m) => !(coolingUntil.get(m) > t)), ...usable.filter((m) => coolingUntil.get(m) > t)];
  };

  async function generateJSON({ system, prompt, schema, temperature = 0.8 }) {
    let lastError;
    const deadline = now() + deadlineMs;
    for (const model of order()) {
      const remaining = deadline - now();
      if (remaining <= 1000) break;
      try {
        const response = await client.models.generateContent({
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
