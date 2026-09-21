import { z } from 'zod';

export type Role = 'student' | 'teacher';

const LEARNER_LABELS = {
  student: ['Input learner', 'Output learner', 'Balanced learner'],
  teacher: ['Explainer', 'Listener', 'Balanced teacher'],
} as const;

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

export function readingSchema(role: Role) {
  return z.object({
    element_line: z.object({
      title: words(6, 'A vivid metaphor for the day master element, as a short phrase.'),
      body: words(40, 'Explain the metaphor and tie it to the day master element.'),
    }),
    learner_type: z.object({
      label: z.enum(LEARNER_LABELS[role]),
      body: words(
        60,
        'Compare the Resource star count with the Output star count, and name both numbers.'
      ),
      tip: words(25, 'One practical study or teaching habit that fits this balance.'),
    }),
    classroom: z.object({
      label: words(5, 'A short name for how this person works in a classroom.'),
      body: words(
        60,
        'Compare the Peer star count with the Authority star count, and name both numbers. Say whether group classes or one-on-one classes fit better.'
      ),
    }),
    challenge: z.object({
      element: words(4, 'The weakest or missing element this challenge comes from.'),
      body: words(50, 'What this element being weak or missing makes harder at the academy.'),
      action: words(25, 'One small, concrete thing to do at the academy this week.'),
    }),
    question: words(20, 'One reflective question to ask yourself this month. Not a prediction.'),
  });
}

export type Reading = z.infer<ReturnType<typeof readingSchema>>;

export function readingJsonSchema(role: Role): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(readingSchema(role)) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}
