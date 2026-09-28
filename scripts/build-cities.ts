/**
 * Builds `data/cities.json` from the GeoNames dumps — every city with 15,000+ people worldwide,
 * plus districts and neighbourhoods for the countries most readers come from — with the names
 * people actually type: English, local script (서울, 東京, 臺中), and common spellings.
 *
 *   curl -O https://download.geonames.org/export/dump/cities15000.zip && unzip cities15000.zip
 *   curl -O https://download.geonames.org/export/dump/admin1CodesASCII.txt
 *   for c in KR JP TW CN PH VN TH MN; do curl -O .../dump/$c.zip && unzip $c.zip $c.txt; done
 *   npx tsx scripts/build-cities.ts <folder with those files>
 *
 * GeoNames data is CC BY 4.0 (https://www.geonames.org). The output is committed, so the app
 * never needs the network to find a birthplace.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = process.argv[2];
if (!source) {
  console.error('Usage: tsx scripts/build-cities.ts <folder with cities15000.txt and admin1CodesASCII.txt>');
  process.exit(1);
}

/** Scripts worth keeping as typed names: Latin, CJK, Hangul, Kana, Thai, Cyrillic, Arabic. */
const KEEP = /^[\p{Script=Latin}\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Cyrillic}\p{Script=Arabic}\s'’().,-]+$/u;

const admin1 = new Map<string, string>();
for (const line of readFileSync(join(source, 'admin1CodesASCII.txt'), 'utf8').split('\n')) {
  const [code, name] = line.split('\t');
  if (code && name) admin1.set(code, name);
}

const timezones: string[] = [];
const tzIndex = new Map<string, number>();

type Row = [name: string, region: string, country: string, lat: number, lon: number, tz: number, population: number, aliases: string];
const rows: Row[] = [];

for (const line of readFileSync(join(source, 'cities15000.txt'), 'utf8').split('\n')) {
  const f = line.split('\t');
  if (f.length < 18) continue;

  const [, name, ascii, alternates, lat, lon, , , country, , a1, , , , population, , , tz] = f;

  if (!tzIndex.has(tz)) {
    tzIndex.set(tz, timezones.length);
    timezones.push(tz);
  }

  const aliases = new Set<string>();
  for (const alias of [ascii, ...alternates.split(',')]) {
    const trimmed = alias.trim();
    if (trimmed && trimmed !== name && trimmed.length <= 40 && KEEP.test(trimmed)) aliases.add(trimmed);
  }

  rows.push([
    name,
    admin1.get(`${country}.${a1}`) ?? '',
    country,
    // 0.01° is about 1 km — far finer than the 1° = 4 minutes that matters for the hour.
    Math.round(Number(lat) * 100) / 100,
    Math.round(Number(lon) * 100) / 100,
    tzIndex.get(tz)!,
    Number(population) || 0,
    [...aliases].join('|'),
  ]);
}

/*
 * Districts and neighbourhoods, for the countries most readers come from. People type "Gangnam",
 * "분당" or "Banilad" as often as a city, and those are not cities in GeoNames. Each country's own
 * dump (e.g. KR.txt from KR.zip) is used when it sits next to the city file.
 */
const DISTRICT_COUNTRIES = ['KR', 'JP', 'TW', 'CN', 'PH', 'VN', 'TH', 'MN'];
const DISTRICT_CODES = new Set(['ADM2', 'PPLX', 'PPLA2', 'PPLA3']);
/**
 * One level finer where people name it: 구/군 (KR), 区/町 (JP), 區 (TW), 县 (CN), municipality
 * (PH). In VN and TH that level is the commune/tambon — tens of thousands, and finer than a
 * 4-minutes-per-degree correction can tell apart.
 */
const ADM3_COUNTRIES = new Set(['KR', 'JP', 'TW', 'CN', 'PH']);

/** Neighbourhood level: Korean 동, and barangays of Central Visayas, where the academy is. */
function isNeighbourhood(cc: string, a1: string): boolean {
  return cc === 'KR' || (cc === 'PH' && a1 === '07');
}

/** "Suwon-si" and "Suwon", 2 km apart, are one place — keep the city, drop the district twin. */
function twinKey(name: string, lat: number, lon: number): string {
  const base = name
    .toLowerCase()
    .replace(/[-\s]?(si|gu|gun|dong|eup|myeon|shi|ku|ken|city|district|municipality)$/u, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
  return `${base}|${Math.round(lat * 20)}|${Math.round(lon * 20)}`;
}

const cityCount = rows.length;
const seen = new Set(rows.map((r) => twinKey(r[0], r[3], r[4])));
let districts = 0;

for (const country of DISTRICT_COUNTRIES) {
  let text: string;
  try {
    text = readFileSync(join(source, `${country}.txt`), 'utf8');
  } catch {
    console.log(`(no ${country}.txt — skipping its districts)`);
    continue;
  }

  for (const line of text.split('\n')) {
    const f = line.split('\t');
    if (f.length < 18) continue;
    const [, name, ascii, alternates, lat, lon, , code, cc, , a1, , , , population, , , tz] = f;
    const pop = Number(population) || 0;

    const wanted =
      DISTRICT_CODES.has(code) ||
      (code === 'ADM3' && ADM3_COUNTRIES.has(cc)) ||
      (code === 'ADM4' && isNeighbourhood(cc, a1)) ||
      (code === 'PPL' && pop >= 5000);
    if (!wanted || !tz) continue;

    const latitude = Math.round(Number(lat) * 100) / 100;
    const longitude = Math.round(Number(lon) * 100) / 100;
    const key = twinKey(name, latitude, longitude);
    if (seen.has(key)) continue;
    seen.add(key);

    if (!tzIndex.has(tz)) {
      tzIndex.set(tz, timezones.length);
      timezones.push(tz);
    }

    const aliases = new Set<string>();
    for (const alias of [ascii, ...alternates.split(',')]) {
      const trimmed = alias.trim();
      if (trimmed && trimmed !== name && trimmed.length <= 40 && KEEP.test(trimmed)) aliases.add(trimmed);
    }

    rows.push([name, admin1.get(`${cc}.${a1}`) ?? '', cc, latitude, longitude, tzIndex.get(tz)!, pop, [...aliases].join('|')]);
    districts += 1;
  }
}
console.log(`+ ${districts} districts and neighbourhoods`);

// Biggest first, so a plain scan already returns the likeliest place for a common name. A
// district or province counts a tenth of its population, so "Cebu" finds Cebu City before the
// Province of Cebu; neighbourhoods without a population sort last.
const weight = (row: Row, index: number) => (index < cityCount ? row[6] : row[6] / 10);
const order = rows.map((row, index) => ({ row, weight: weight(row, index) }));
order.sort((a, b) => b.weight - a.weight);
rows.splice(0, rows.length, ...order.map(({ row }) => row));

const out = join(process.cwd(), 'data', 'cities.json');
writeFileSync(out, JSON.stringify({ source: 'GeoNames (cities15000 + country districts), CC BY 4.0', timezones, rows }));
console.log(`${rows.length} cities, ${timezones.length} time zones → ${out}`);
