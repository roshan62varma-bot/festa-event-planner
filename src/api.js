/** Default client-side limit; the server gives up on Gemini after about 55 s. */
const REQUEST_TIMEOUT_MS = 75_000;

/** Error carrying a user-facing message and, for validation failures, per-field messages. */
export class ApiError extends Error {
  /**
   * @param {string} message Safe to show to the user.
   * @param {{ status?: number, fields?: Record<string, string> }} [details]
   */
  constructor(message, { status = 0, fields = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

/**
 * @typedef {object} RequestOptions
 * @property {AbortSignal} [signal] Cancels the request (e.g. when a newer one starts).
 * @property {number} [timeoutMs]
 */

/**
 * POSTs JSON and returns the parsed response, turning every failure into an ApiError
 * with a message written for the user. Caller aborts are re-thrown unchanged.
 * @param {string} path
 * @param {unknown} body
 * @param {RequestOptions} [options]
 */
async function post(path, body, { signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const timeout = AbortSignal.timeout(timeoutMs);
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    const name = /** @type {{ name?: string } | null} */ (err)?.name;
    if (name === 'AbortError' && signal?.aborted) throw err;
    if (name === 'TimeoutError') throw new ApiError('This is taking longer than usual. Try again in a moment.');
    throw new ApiError('Could not reach Festa. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);
  if (data === null) {
    // A non-JSON reply means a proxy or host answered instead of the Festa API.
    throw new ApiError('Could not reach the Festa server. Make sure it is running, then try again.', {
      status: response.status,
    });
  }
  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong. Try again.', {
      status: response.status,
      fields: data.fields,
    });
  }
  return data;
}

/**
 * @param {import('../shared/types.js').EventBrief} event
 * @param {string} refinement Free-text change request, or empty.
 * @param {RequestOptions} [options]
 * @returns {Promise<{ plan: import('../shared/types.js').Plan, source: import('../shared/types.js').ContentSource }>}
 */
export const createPlan = (event, refinement, options) => post('/api/plan', { event, refinement }, options);

/**
 * @param {import('../shared/types.js').EventBrief} event
 * @param {Partial<import('../shared/types.js').CreativeRequest>} request
 * @param {boolean} regenerate Skip the server cache for fresh ideas.
 * @param {RequestOptions} [options]
 * @returns {Promise<{ ideas: import('../shared/types.js').Ideas, source: import('../shared/types.js').ContentSource }>}
 */
export const createIdeas = (event, request, regenerate, options) =>
  post('/api/ideas', { event, request, regenerate }, options);
