import type { Place } from './types';

/*
 * Fallback for towns under 15,000 people, which the bundled list does not carry. Open-Meteo's
 * geocoder is free, needs no key, and returns the time zone with each place. Only the typed
 * place name leaves our server — never a date or a time.
 *
 * It is a fallback on purpose: it misses most names typed in Korean, Chinese or Japanese script,
 * ranks villages above cities, and 100 phones on one Wi-Fi would share its per-IP rate limit.
 */

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = 3_000;
const MAX_CACHED = 500;

/** Populated places and administrative areas — not airports, parks or mountains. */
const PLACE_FEATURE = /^(PPL|ADM)/;

const cache = new Map<string, Place[]>();

interface Result {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  feature_code?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

export async function searchRemotePlaces(query: string, country: string | null, limit = 8): Promise<Place[]> {
  const key = `${country ?? '*'}|${query.trim().toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    name: query.trim(),
    count: String(limit * 2),
    language: 'en',
    format: 'json',
    ...(country ? { countryCode: country } : {}),
  }).toString();

  let results: Result[];
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return [];
    results = ((await response.json()) as { results?: Result[] }).results ?? [];
  } catch {
    // Slow or down: the reader can still pick the nearest city, or skip the birthplace.
    return [];
  }

  const places = results
    .filter((r) => r.timezone && r.country_code && PLACE_FEATURE.test(r.feature_code ?? ''))
    .slice(0, limit)
    .map(
      (r): Place => ({
        id: `om:${r.id}`,
        name: r.name,
        region: r.admin1 ?? '',
        country: r.country_code!,
        latitude: Math.round(r.latitude * 100) / 100,
        longitude: Math.round(r.longitude * 100) / 100,
        timezone: r.timezone!,
      })
    );

  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
  cache.set(key, places);
  return places;
}
