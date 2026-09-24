import { NextResponse } from 'next/server';
import { readBirthRequest } from '@/lib/birth-input';
import { calculateSaju } from '@/lib/saju/calculate';

export const runtime = 'nodejs';

/**
 * Calculation only, no model call. The chart is ready in milliseconds while a reading takes
 * seconds, so the result page asks for the two separately and shows the chart first.
 */
export async function POST(request: Request) {
  const parsed = await readBirthRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, fields: parsed.fields }, { status: 400 });
  }

  const { birthDate, birthTime } = parsed.data;
  const [year, month, day] = birthDate.split('-').map(Number);

  try {
    const saju = calculateSaju({ year, month, day, time: birthTime });
    // `saju.input` is the birth data the client already holds — it is not echoed back.
    return NextResponse.json({ pillars: { ...saju, input: undefined } });
  } catch {
    // The thrown message quotes the birth data, so it is neither logged nor returned.
    return NextResponse.json({ error: 'Check your birth details.' }, { status: 400 });
  }
}
