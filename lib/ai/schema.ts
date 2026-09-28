import { z } from 'zod';

/**
 * `student`: a reading about life at the English academy in Cebu.
 * `normal`: a general Saju reading about the person — no English, no academy.
 */
export type Role = 'student' | 'normal';
export const ROLES = ['student', 'normal'] as const;

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

const TITLE_HINT =
  'A short, playful 2-5 word name for this part of the person, grounded in the data. Easy English, not mystical, not a job title.';

type Field = (max: number, hint: string) => z.ZodType<string>;

const titled = (field: Field, body: string, max = 45) =>
  z.object({ title: field(5, TITLE_HINT), body: field(max, body) });

/**
 * The sections both roles share, then the two that differ. Fields are declared in the order
 * they are shown — Gemini writes them in schema order.
 */
function sections(field: Field) {
  return {
    saju_snapshot: field(
      40,
      'How Saju sees this person, in plain words. Start from day_master.image. Explain any Saju term in a few words.'
    ),
    identity: titled(field, 'Who this person is: one recognisable, specific observation. Not a list of adjectives.', 40),
    hidden_side: titled(field, 'What people do not notice at first. A contrast: "You may look X, but Y."'),
  };
}

function studentShape(field: Field) {
  return {
    ...sections(field),
    english_style: titled(field, 'One specific, recognisable scene of how they speak or learn English at the academy.'),
    cebu_mode: titled(field, 'How they live abroad in Cebu, outside class: new people, new places, their own rhythm.'),
    blind_spot: z.object({
      title: field(5, TITLE_HINT),
      body: field(40, 'Their most interesting academy-life habit that can get in their way, as a scene.'),
      action: field(20, 'ONE small, fun experiment they can try this week at the academy.'),
    }),
    question: field(20, 'One memorable question to ask yourself. Not a prediction.'),
  };
}

function normalShape(field: Field) {
  return {
    ...sections(field),
    life_pattern: titled(field, 'How they approach life: stability and change, risk, choices, their own pace.'),
    people_style: titled(field, 'How they are with people: trust, closeness, friends, groups. No romance.'),
    blind_spot: z.object({
      title: field(5, TITLE_HINT),
      body: field(40, 'One realistic pattern that can get in their way, as a scene.'),
      action: field(20, 'ONE small, fun real-life experiment they can try this week.'),
    }),
    question: field(20, 'One memorable question to ask yourself. Not a prediction.'),
  };
}

/**
 * Written first and never shown. Planning one DIFFERENT trait per section before writing is what
 * keeps the reading from saying "you observe before you speak" five times in five ways.
 */
const plan = z
  .array(z.string().trim().min(1).max(160))
  .min(5)
  .max(5)
  .meta({
    description:
      'Private plan, never shown. Exactly 5 short notes, one each for identity, hidden_side, the two scene sections, and blind_spot. Each names a DIFFERENT trait and the data behind it.',
  });

export const studentModelSchema = z.object({ plan, ...studentShape(words) });
export const normalModelSchema = z.object({ plan, ...normalShape(words) });

export const studentReadingSchema = z.object(studentShape(words));
export const normalReadingSchema = z.object(normalShape(words));

export type StudentReading = z.infer<typeof studentReadingSchema>;
export type NormalReading = z.infer<typeof normalReadingSchema>;
export type Reading = StudentReading | NormalReading;

/** Any finished English reading, of either role — what the client may send back for translation. */
export const readingSchema = z.union([studentReadingSchema, normalReadingSchema]);

export function isStudentReading(reading: Reading): reading is StudentReading {
  return 'english_style' in reading;
}

/**
 * Chinese, Japanese and Korean do not count words the English way, so a translated field is
 * capped in characters instead: generous for a faithful translation, tight enough to stop a
 * runaway answer.
 */
const characters: Field = (max, hint) =>
  z
    .string()
    .trim()
    .min(1, 'must not be empty')
    .max(max * 6, `must be ${max * 6} characters or fewer`)
    .meta({ description: `Translation of the English field: ${hint}` });

export const translatedStudentSchema = z.object(studentShape(characters));
export const translatedNormalSchema = z.object(normalShape(characters));

function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

export const modelJsonSchema: Record<Role, Record<string, unknown>> = {
  student: toJsonSchema(studentModelSchema),
  normal: toJsonSchema(normalModelSchema),
};

export const translatedJsonSchema: Record<Role, Record<string, unknown>> = {
  student: toJsonSchema(translatedStudentSchema),
  normal: toJsonSchema(translatedNormalSchema),
};
