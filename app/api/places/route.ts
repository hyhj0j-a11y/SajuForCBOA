import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchRemotePlaces } from '@/lib/places/remote';
import { searchPlaces } from '@/lib/places/search';
import { clientKey, isRateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * Typing sends a search every few keystrokes, and ~100 phones share the academy's one IP, so
 * this bucket is its own and far looser than the reading one — it must never lock readings out.
 */
const PLACES_PER_WINDOW = 1_500;

const searchSchema = z.object({
  query: z.string().trim().min(1).max(60),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
});

/**
 * POST, not GET: a birthplace in a URL would land in request logs. Nothing here is logged or
 * stored — the query is matched and forgotten.
 */
export async function POST(request: Request) {
  if (isRateLimited(`${clientKey(request)}|places`, PLACES_PER_WINDOW)) {
    return NextResponse.json({ places: [] }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type a city name.' }, { status: 400 });
  }

  const { query, country } = parsed.data;
  const local = searchPlaces(query, country);
  if (local.length > 0 || query.length < 3) {
    return NextResponse.json({ places: local, source: 'list' });
  }

  return NextResponse.json({ places: await searchRemotePlaces(query, country), source: 'remote' });
}
