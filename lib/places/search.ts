import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Place } from './types';

/*
 * Birthplace search over the bundled GeoNames list (every city of 15,000+ people, ~34k).
 *
 * People type their birthplace in many ways — "Seoul", "서울", "ソウル", "Cebu", "Sugbo" — and
 * sometimes a neighbourhood that is not a city at all. The list carries each city's names in
 * the scripts our readers use, so most of those match. For the rest, the nearest city is just as
 * good: only the longitude matters, and 1° of longitude (~100 km) moves the time by 4 minutes.
 */

type Row = [name: string, region: string, country: string, lat: number, lon: number, tz: number, population: number, aliases: string];

interface Entry {
  row: Row;
  /** Normalised search keys, each paired with the name as written. */
  keys: Array<[key: string, written: string]>;
}

let index: { timezones: string[]; entries: Entry[] } | null = null;

/** Case, accents, spaces and punctuation do not matter: "Lapu-Lapu" = "lapulapu", "Đà Nẵng" = "danang". */
export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[\s'’().,·\-]/g, '');
}

function load() {
  if (index) return index;

  const file = join(process.cwd(), 'data', 'cities.json');
  const data = JSON.parse(readFileSync(file, 'utf8')) as { timezones: string[]; rows: Row[] };

  const entries = data.rows.map((row): Entry => {
    const seen = new Set<string>();
    const keys: Entry['keys'] = [];
    for (const written of [row[0], ...(row[7] ? row[7].split('|') : [])]) {
      const key = normalize(written);
      if (key && !seen.has(key)) {
        seen.add(key);
        keys.push([key, written]);
      }
    }
    return { row, keys };
  });

  index = { timezones: data.timezones, entries };
  return index;
}

const NON_LATIN = /[^\p{Script=Latin}\p{Script=Common}]/u;

function toPlace(entry: Entry, written: string, timezones: string[], id: number): Place {
  const [name, region, country, latitude, longitude, tz] = entry.row;
  return {
    id: `gn:${id}`,
    // Show the name the reader typed when it is in their own script: "서울 · Seoul".
    name: NON_LATIN.test(written) && written !== name ? `${written} · ${name}` : name,
    region,
    country,
    latitude,
    longitude,
    timezone: timezones[tz],
  };
}

/**
 * Exact name first, then names that start with the query, then (3+ characters) names that
 * contain it — each group biggest city first, since the list is stored by population.
 */
export function searchPlaces(query: string, country: string | null, limit = 8): Place[] {
  const wanted = normalize(query);
  // One Latin letter matches thousands of cities; one CJK character is already a word.
  if (!wanted || (wanted.length < 2 && !NON_LATIN.test(wanted))) return [];

  const { timezones, entries } = load();
  const ranked: Array<Array<{ entry: Entry; written: string; id: number }>> = [[], [], []];

  entries.forEach((entry, id) => {
    if (country && entry.row[2] !== country) return;

    let best = 3;
    let written = entry.row[0];
    for (const [key, name] of entry.keys) {
      const score =
        key === wanted ? 0 : key.startsWith(wanted) ? 1 : wanted.length >= 3 && key.includes(wanted) ? 2 : 3;
      if (score < best) {
        best = score;
        written = name;
        if (score === 0) break;
      }
    }
    if (best < 3) ranked[best].push({ entry, written, id });
  });

  // Two "Banilad, Central Visayas" a kilometre apart look identical and give the same chart
  // (0.01° is 2.4 seconds of time), so only the first is offered.
  const places: Place[] = [];
  const shown = new Set<string>();
  for (const { entry, written, id } of ranked.flat()) {
    const place = toPlace(entry, written, timezones, id);
    const label = `${place.name}|${place.region}|${place.country}`;
    if (shown.has(label)) continue;
    shown.add(label);
    places.push(place);
    if (places.length === limit) break;
  }
  return places;
}
