const CLIENT_MESSAGES = {
  404: 'Not found.',
  413: 'That request is too large.',
};

/**
 * Last-resort error handler. Client errors (bad JSON, oversized bodies, missing
 * static files) keep their 4xx status with a fixed message; anything else is
 * logged server-side and returned as a generic 500. Stack traces and internal
 * messages never reach the response.
 * @param {{ error: (...args: unknown[]) => void }} logger
 * @returns {import('express').ErrorRequestHandler}
 */
export function errorHandler(logger = console) {
  // Express recognises error handlers by their four parameters, so `next` must stay.
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) logger.error('[server]', err);
    const message =
      status === 500
        ? 'Something went wrong on our side. Try again.'
        : (CLIENT_MESSAGES[status] ?? 'The request could not be read.');
    res.status(status).json({ error: message });
  };
}
