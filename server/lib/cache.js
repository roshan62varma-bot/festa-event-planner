import { createHash } from 'node:crypto';

/**
 * Tiny in-memory LRU cache with a time-to-live. Identical briefs are common
 * (refreshes, double-clicks, demo replays), and a cache hit saves both a few
 * seconds of latency and an API call.
 */
export function createCache({ maxEntries = 200, ttlMs = 30 * 60_000, now = Date.now } = {}) {
  const store = new Map();

  return {
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
    set(key, value) {
      store.delete(key);
      store.set(key, { value, expires: now() + ttlMs });
      if (store.size > maxEntries) store.delete(store.keys().next().value);
    },
    get size() {
      return store.size;
    },
  };
}

/** Stable hash of any JSON-serialisable value. */
export function cacheKey(...parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
