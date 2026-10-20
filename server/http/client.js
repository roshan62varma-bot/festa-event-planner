import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Serves the built React app. Hashed assets are cached for a year; the HTML
 * shell is revalidated on every visit so new deploys are picked up at once.
 * Any other GET that wants HTML gets the shell, so client-side URLs work.
 * @param {string | undefined} staticDir The Vite `dist` folder.
 * @returns {import('express').Router}
 */
export function clientRouter(staticDir) {
  const router = express.Router();
  if (!staticDir || !existsSync(staticDir)) return router;

  const indexFile = path.join(staticDir, 'index.html');
  router.use(
    '/assets',
    express.static(path.join(staticDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
  );
  router.use(express.static(staticDir, { index: false, maxAge: '1h' }));
  router.use((req, res, next) => {
    const isPageRequest = (req.method === 'GET' || req.method === 'HEAD') && req.accepts('html');
    if (!isPageRequest) {
      next();
      return;
    }
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  return router;
}
