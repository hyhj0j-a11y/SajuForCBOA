import { z } from 'zod';
import { MAX_YEAR, MIN_YEAR } from './birth-range';

export const birthRequestSchema = z.object({
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

export type BirthRequest = z.infer<typeof birthRequestSchema>;

export type BirthRequestResult =
  | { ok: true; data: BirthRequest }
  | { ok: false; error: string; fields?: Array<{ field: string; message: string }> };

/** Field name and message only — never the submitted values, which carry birth data. */
function fieldErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

export async function readBirthRequest(request: Request): Promise<BirthRequestResult> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: 'Body must be JSON.' };
  }

  const parsed = birthRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'Check your birth details.', fields: fieldErrors(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}
