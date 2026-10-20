import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

/** Browser features the app never uses are switched off for every response. */
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'camera=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'payment=()',
  'usb=()',
  'interest-cohort=()',
].join(', ');

/**
 * Security headers: a strict Content Security Policy (scripts only from this
 * origin, no framing), HSTS, nosniff and friends from Helmet, plus a
 * Permissions-Policy that Helmet does not set.
 * @returns {import('express').RequestHandler[]}
 */
export function securityHeaders() {
  return [
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
    (req, res, next) => {
      res.set('Permissions-Policy', PERMISSIONS_POLICY);
      next();
    },
  ];
}

const limiter = (limit, error) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error },
  });

/** A generous per-client ceiling on every API route, against floods and scraping. */
export const apiLimiter = (limit = 120) => limiter(limit, 'Too many requests. Wait a minute and try again.');

/** Generation calls a paid API, so it gets a much tighter per-client budget. */
export const generationLimiter = (limit) =>
  limiter(limit, 'You are generating very quickly. Wait a minute and try again.');

/**
 * Rejects request bodies that are not JSON (415) instead of silently ignoring them,
 * which also blocks simple cross-site form posts that cannot set this header.
 * @type {import('express').RequestHandler}
 */
export function requireJson(req, res, next) {
  if (req.method === 'POST' && !req.is('application/json')) {
    res.status(415).json({ error: 'Send the request as JSON.' });
    return;
  }
  next();
}
