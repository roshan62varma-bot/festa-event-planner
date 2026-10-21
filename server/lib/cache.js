import { createHash } from 'node:crypto';

/**
 * Tiny in-memory LRU cache with a time-to-live. Identical briefs are common
 * (refreshes, double-clicks, demo replays), and a cache hit saves both a few
 * seconds of latency and an API call.
 * @param {{ maxEntries?: number, ttlMs?: number, now?: () => number }} [options]
 */
export function createCache({ maxEntries = 200, ttlMs = 30 * 60_000, now = Date.now } = {}) {
  /** @type {Map<string, { value: any, expires: number }>} */
  const store = new Map();

  return {
    /** @param {string} key @returns {any} The value, or undefined if missing or expired. */
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expires <= now()) {
        store.delete(key);
        return undefined;
      }
      store.delete(key); // Re-insert to mark as most recently used.
      store.set(key, entry);
      return entry.value;
    },
    /** @param {string} key @param {unknown} value */
    set(key, value) {
      store.delete(key);
      store.set(key, { value, expires: now() + ttlMs });
      // Maps iterate in insertion order, so the first key is the least recently used.
      const oldest = store.keys().next().value;
      if (store.size > maxEntries && oldest !== undefined) store.delete(oldest);
    },
    get size() {
      return store.size;
    },
  };
}

/** Stable hash of any JSON-serialisable values. @param {...unknown} parts */
export function cacheKey(...parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
