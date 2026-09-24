import { NextResponse } from 'next/server';
import { withModelSlot, ServerBusyError } from '@/lib/ai/queue';
import { readingKey, withReadingCache } from '@/lib/ai/reading-cache';
import { generateReading } from '@/lib/ai/reading';
import { readBirthRequest } from '@/lib/birth-input';
import { clientKey, isRateLimited } from '@/lib/rate-limit';
import { calculateSaju } from '@/lib/saju/calculate';

export const runtime = 'nodejs';

/** Vercel's ceiling on the Hobby plan. The budget below stays under it with room to respond. */
export const maxDuration = 60;

/** Queue wait and model calls together may use this much before we give up and say "busy". */
const SERVER_BUDGET_MS = 50_000;

const BUSY = 'Lots of people are reading their Saju right now. Please try again in a moment.';

export async function POST(request: Request) {
  const deadline = Date.now() + SERVER_BUDGET_MS;

  if (isRateLimited(clientKey(request))) {
    return NextResponse.json({ error: BUSY }, { status: 429 });
  }

  const parsed = await readBirthRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, fields: parsed.fields }, { status: 400 });
  }

  const { birthDate, birthTime, role } = parsed.data;
  const [year, month, day] = birthDate.split('-').map(Number);

  let saju;
  try {
    saju = calculateSaju({ year, month, day, time: birthTime });
  } catch {
    // The thrown message quotes the birth data, so it is neither logged nor returned.
    return NextResponse.json({ error: 'Check your birth details.' }, { status: 400 });
  }

  // `saju.input` is the birth data the client already holds — it is not echoed back.
  const pillars = { ...saju, input: undefined };

  try {
    const reading = await withReadingCache(readingKey(birthDate, birthTime, role), () =>
      withModelSlot(() => generateReading(saju, role, deadline), deadline)
    );
    return NextResponse.json({ pillars, reading });
  } catch (error) {
    if (error instanceof ServerBusyError) {
      return NextResponse.json({ error: BUSY }, { status: 503 });
    }
    // Safe to log: these messages describe the model call, not the reader.
    console.error('reading generation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'The reading could not be created. Try again.' }, { status: 502 });
  }
}
