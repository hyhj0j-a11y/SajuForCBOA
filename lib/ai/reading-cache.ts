import { createHash } from 'node:crypto';
import type { Reading, Role } from './schema';

const TTL_MS = 30 * 60_000;
const MAX_ENTRIES = 500;

const cache = new Map<string, { reading: Reading; expiresAt: number }>();
const inFlight = new Map<string, Promise<Reading>>();

/**
 * The birth data never reaches memory — only this digest of it. Two people born at the same
 * minute in the same role share a key, which is the point: one model call serves both.
 */
export function readingKey(birthDate: string, birthTime: string | null, role: Role): string {
  return createHash('sha256').update(`${birthDate}|${birthTime ?? 'unknown'}|${role}`).digest('hex');
}

export function getCachedReading(key: string): Reading | null {
  const hit = cache.get(key);
  if (!hit) return null;

  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return hit.reading;
}

function store(key: string, reading: Reading) {
  // Map keeps insertion order, so the first key is the oldest one written.
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, { reading, expiresAt: Date.now() + TTL_MS });
}

/**
 * One generation per key at a time. A double tap, a refresh, or two readers with the same
 * birthday all wait on the same call instead of each starting one.
 */
export async function withReadingCache(
  key: string,
  generate: () => Promise<Reading>
): Promise<Reading> {
  const cached = getCachedReading(key);
  if (cached) return cached;

  const running = inFlight.get(key);
  if (running) return running;

  const pending = generate()
    .then((reading) => {
      store(key, reading);
      return reading;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, pending);
  return pending;
}

/** Test seam — the cache is process-wide and would otherwise leak between test files. */
export function resetReadingCache() {
  cache.clear();
  inFlight.clear();
}
