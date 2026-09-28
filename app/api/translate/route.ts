import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withModelSlot, ServerBusyError } from '@/lib/ai/queue';
import { translationKey, withTranslationCache } from '@/lib/ai/reading-cache';
import { readingSchema } from '@/lib/ai/schema';
import { translateReading } from '@/lib/ai/translate';
import { TRANSLATED_LANGS } from '@/lib/i18n';
import { clientKey, isRateLimited } from '@/lib/rate-limit';
import { DAY_MASTER_IMAGE } from '@/lib/saju/display';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SERVER_BUDGET_MS = 50_000;

const BUSY = 'Lots of people are reading their Saju right now. Please try again in a moment.';

/**
 * The client sends back the English reading it was given. The reading schema's word limits cap
 * what can come in, so this route cannot be used to translate arbitrary long text. No birth data
 * is involved here at all.
 */
const translateRequestSchema = z.object({
  reading: readingSchema,
  lang: z.enum(TRANSLATED_LANGS),
  dayStem: z.enum(Object.keys(DAY_MASTER_IMAGE) as [string, ...string[]]),
});

export async function POST(request: Request) {
  const deadline = Date.now() + SERVER_BUDGET_MS;

  if (isRateLimited(clientKey(request))) {
    return NextResponse.json({ error: BUSY }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const parsed = translateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'This reading cannot be translated.' }, { status: 400 });
  }

  const { reading, lang, dayStem } = parsed.data;

  try {
    const translated = await withTranslationCache(translationKey(reading, lang), () =>
      withModelSlot(() => translateReading(reading, lang, dayStem, deadline), deadline)
    );
    return NextResponse.json({ reading: translated });
  } catch (error) {
    if (error instanceof ServerBusyError) {
      return NextResponse.json({ error: BUSY }, { status: 503 });
    }
    console.error('translation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'The translation could not be created. Try again.' }, { status: 502 });
  }
}
