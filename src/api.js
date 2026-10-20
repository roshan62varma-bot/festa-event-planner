/** Error carrying a user-facing message and, for validation failures, per-field messages. */
export class ApiError extends Error {
  constructor(message, { status = 0, fields = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

async function post(path, body, { signal, timeoutMs = 75_000 } = {}) {
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
    if (err.name === 'AbortError' && signal?.aborted) throw err;
    if (err.name === 'TimeoutError') throw new ApiError('This is taking longer than usual. Try again in a moment.');
    throw new ApiError('Could not reach Festa. Check your connection and try again.');
  }
  const data = await response.json().catch(() => null);
  if (data === null) {
    // A non-JSON reply means a proxy or host answered instead of the Festa API.
    throw new ApiError('Could not reach the Festa server. Make sure it is running, then try again.', { status: response.status });
  }
  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong. Try again.', { status: response.status, fields: data.fields });
  }
  return data;
}

export const createPlan = (event, refinement, options) => post('/api/plan', { event, refinement }, options);

export const createIdeas = (event, request, regenerate, options) =>
  post('/api/ideas', { event, request, regenerate }, options);
