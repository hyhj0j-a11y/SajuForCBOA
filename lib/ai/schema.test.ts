import { describe, expect, it } from 'vitest';
import {
  SAMPLE_MODEL_ANSWER,
  SAMPLE_NORMAL_READING,
  SAMPLE_READING as VALID,
} from './reading.fixture';
import {
  countWords,
  isStudentReading,
  modelJsonSchema,
  normalReadingSchema,
  readingSchema,
  studentModelSchema,
  studentReadingSchema,
} from './schema';

describe('reading schemas', () => {
  it('accepts a well-formed student and normal reading', () => {
    expect(studentReadingSchema.safeParse(VALID).success).toBe(true);
    expect(normalReadingSchema.safeParse(SAMPLE_NORMAL_READING).success).toBe(true);
  });

  it('does not accept one role\'s reading as the other\'s', () => {
    expect(normalReadingSchema.safeParse(VALID).success).toBe(false);
    expect(studentReadingSchema.safeParse(SAMPLE_NORMAL_READING).success).toBe(false);
  });

  it('tells the two roles apart by shape', () => {
    expect(isStudentReading(VALID)).toBe(true);
    expect(isStudentReading(SAMPLE_NORMAL_READING)).toBe(false);
    expect(readingSchema.safeParse(SAMPLE_NORMAL_READING).success).toBe(true);
  });

  it('rejects a title over its word limit', () => {
    const tooLong = { ...VALID, identity: { ...VALID.identity, title: 'The Very Quiet Old Green Mountain' } };
    const result = studentReadingSchema.safeParse(tooLong);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/5 words or fewer/);
  });

  it('rejects an empty field', () => {
    expect(studentReadingSchema.safeParse({ ...VALID, question: '   ' }).success).toBe(false);
  });

  it('rejects a reading with a section missing', () => {
    const missing: Partial<typeof VALID> = { ...VALID };
    delete missing.blind_spot;

    expect(studentReadingSchema.safeParse(missing).success).toBe(false);
  });
});

describe('the model answer', () => {
  it('needs exactly five plan notes', () => {
    expect(studentModelSchema.safeParse(SAMPLE_MODEL_ANSWER).success).toBe(true);
    const short = { ...SAMPLE_MODEL_ANSWER, plan: SAMPLE_MODEL_ANSWER.plan.slice(0, 4) };
    expect(studentModelSchema.safeParse(short).success).toBe(false);
  });
});

describe('countWords', () => {
  it('ignores extra whitespace', () => {
    expect(countWords('  one   two \n three ')).toBe(3);
    expect(countWords('')).toBe(0);
  });
});

describe('modelJsonSchema', () => {
  it('drops $schema, which Gemini does not accept', () => {
    expect(modelJsonSchema.student).not.toHaveProperty('$schema');
  });

  it('carries the word limits into the descriptions the model sees', () => {
    const schema = modelJsonSchema.student as {
      properties: { identity: { properties: { title: { description: string } } } };
    };

    expect(schema.properties.identity.properties.title.description).toMatch(/Maximum 5 words/);
  });

  it('puts the plan first, then the sections in display order — the order Gemini writes them', () => {
    const keys = (role: 'student' | 'normal') =>
      Object.keys((modelJsonSchema[role] as { properties: object }).properties);

    expect(keys('student')).toEqual([
      'plan', 'saju_snapshot', 'identity', 'hidden_side', 'english_style', 'cebu_mode', 'blind_spot', 'question',
    ]);
    expect(keys('normal')).toEqual([
      'plan', 'saju_snapshot', 'identity', 'hidden_side', 'life_pattern', 'people_style', 'blind_spot', 'question',
    ]);
  });
});
