import { z } from 'zod';

/** Everyone who is not a student — teachers, managers, office and dorm staff — is 'staff'. */
export type Role = 'student' | 'staff';

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Word limits cannot be expressed in JSON Schema, so they reach the model only as the
 * description and are enforced here. A breach is what triggers the one retry.
 */
function words(max: number, hint: string) {
  return z
    .string()
    .trim()
    .min(1, 'must not be empty')
    .refine((value) => countWords(value) <= max, {
      message: `must be ${max} words or fewer`,
    })
    .meta({ description: `${hint} Maximum ${max} words.` });
}

const TITLE_HINT = 'An invented, memorable 2-5 word name grounded in the data, e.g. "The Quiet Mountain".';

/** Fields are declared in the order they are shown — Gemini writes them in schema order. */
export const readingSchema = z.object({
  saju_snapshot: words(
    40,
    'How Saju describes this person, in plain words. Start from day_master.image, then say what the strongest or missing element adds. Explain any Saju term in a few words.'
  ),
  identity: z.object({
    title: words(5, TITLE_HINT),
    body: words(40, 'Who this person is, as a situation they would recognise.'),
  }),
  hidden_side: z.object({
    title: words(5, TITLE_HINT),
    body: words(45, 'A side of them that other people at the academy may not see at first.'),
  }),
  english_style: z.object({
    title: words(5, TITLE_HINT),
    body: words(
      50,
      'Student: how they use English, in a classroom or speaking scene. Staff: how they work and communicate day to day.'
    ),
    action: words(20, 'One small thing to try.'),
  }),
  cebu_mode: z.object({
    title: words(5, TITLE_HINT),
    body: words(50, 'What everyday life in Cebu looks like for them, specifically.'),
  }),
  challenge: z.object({
    title: words(5, TITLE_HINT),
    body: words(45, 'One challenge at the academy, written as a scene, not a judgment.'),
    action: words(20, 'One small, concrete, doable action at the academy.'),
  }),
  academy_reading: z.object({
    people: words(18, 'One line on how they are with people at the academy.'),
    english: words(18, 'Student: one line on their English. Staff: one line on their work.'),
    challenge: words(18, 'One line on their challenge.'),
    opportunity: words(18, 'One line on the opportunity the academy gives them.'),
  }),
  experiment: words(25, 'A fun, dare-like micro-challenge. Not homework.'),
  question: words(20, 'A reflective question to ask yourself. Not a prediction.'),
});

export type Reading = z.infer<typeof readingSchema>;

export const readingJsonSchema: Record<string, unknown> = (() => {
  const jsonSchema = z.toJSONSchema(readingSchema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
})();
