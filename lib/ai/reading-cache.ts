import { createHash } from 'node:crypto';
import type { Lang } from '../i18n';
import type { Reading } from './schema';

const TTL_MS = 30 * 60_000;
const MAX_ENTRIES = 500;

/**
 * A small TTL cache that also de-duplicates in-flight work: one generation per key at a time.
 * A double tap, a refresh, or two readers with the same birthday all wait on the same call
 * instead of each starting one.
 */
function createCache<T>() {
  const cache = new Map<string, { value: T; expiresAt: number }>();
  const inFlight = new Map<string, Promise<T>>();

  function get(key: string): T | null {
    const hit = cache.get(key);
    if (!hit) return null;

    if (hit.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }

    return hit.value;
  }

  function store(key: string, value: T) {
    // Map keeps insertion order, so the first key is the oldest one written.
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
    cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  }

  async function through(key: string, generate: () => Promise<T>): Promise<T> {
    const cached = get(key);
    if (cached) return cached;

    const running = inFlight.get(key);
    if (running) return running;

    const pending = generate()
      .then((value) => {
        store(key, value);
        return value;
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, pending);
    return pending;
  }

  function reset() {
    cache.clear();
    inFlight.clear();
  }

  return { get, through, reset };
}

const readings = createCache<Reading>();
const translations = createCache<Reading>();

/**
 * Keyed by exactly what the model is sent — the calculated chart and the role — so the birth
 * data never reaches memory, not even as a digest. Everyone with the same chart in the same
 * role shares a key, which is the point: one model call serves them all.
 */
export function readingKey(modelInput: object): string {
  return createHash('sha256').update(JSON.stringify(modelInput)).digest('hex');
}

/** Keyed by the English text itself, so the same reading is translated once per language. */
export function translationKey(reading: Reading, lang: Lang): string {
  return createHash('sha256').update(`${lang}|${JSON.stringify(reading)}`).digest('hex');
}

export const getCachedReading = readings.get;
export const withReadingCache = readings.through;
export const withTranslationCache = translations.through;

/** Test seam — the caches are process-wide and would otherwise leak between test files. */
export function resetReadingCache() {
  readings.reset();
  translations.reset();
}
