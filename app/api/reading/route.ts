import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateReading } from '@/lib/ai/reading';
import { calculateSaju } from '@/lib/saju/calculate';

export const runtime = 'nodejs';

const MIN_YEAR = 1940;
const MAX_YEAR = 2015;

const requestSchema = z.object({
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must look like "1995-12-13"')
    .refine((value) => {
      const year = Number(value.slice(0, 4));
      return year >= MIN_YEAR && year <= MAX_YEAR;
    }, `year must be between ${MIN_YEAR} and ${MAX_YEAR}`)
    .refine((value) => {
      const [year, month, day] = value.split('-').map(Number);
      const probe = new Date(Date.UTC(year, month - 1, day));
      return (
        probe.getUTCFullYear() === year &&
        probe.getUTCMonth() === month - 1 &&
        probe.getUTCDate() === day
      );
    }, 'is not a real date'),
  birthTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must look like "16:40", or be null if unknown')
    .nullable(),
  role: z.enum(['student', 'teacher']),
});

/** Field name and message only — never the submitted values, which carry birth data. */
function fieldErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Check your birth details.', fields: fieldErrors(parsed.error) },
      { status: 400 }
    );
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

  try {
    const reading = await generateReading(saju, role);
    // `saju.input` is the birth data the client already holds — it is not echoed back.
    const pillars = { ...saju, input: undefined };
    return NextResponse.json({ pillars, reading });
  } catch (error) {
    // Safe to log: these messages describe the model call, not the reader.
    console.error('reading generation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'The reading could not be created. Try again.' }, { status: 502 });
  }
}
