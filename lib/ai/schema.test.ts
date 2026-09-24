import { describe, expect, it } from 'vitest';
import { SAMPLE_READING as VALID } from './reading.fixture';
import { countWords, readingJsonSchema, readingSchema } from './schema';

describe('readingSchema', () => {
  it('accepts a well-formed reading', () => {
    expect(readingSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects a title over its word limit', () => {
    const tooLong = { ...VALID, identity: { ...VALID.identity, title: 'The Very Quiet Old Green Mountain' } };
    const result = readingSchema.safeParse(tooLong);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/5 words or fewer/);
  });

  it('rejects an academy_reading line over 18 words', () => {
    const line = Array.from({ length: 19 }, () => 'word').join(' ');
    const tooLong = { ...VALID, academy_reading: { ...VALID.academy_reading, people: line } };

    expect(readingSchema.safeParse(tooLong).success).toBe(false);
  });

  it('rejects an empty field', () => {
    expect(readingSchema.safeParse({ ...VALID, question: '   ' }).success).toBe(false);
  });

  it('rejects a reading with a section missing', () => {
    const missing: Partial<typeof VALID> = { ...VALID };
    delete missing.experiment;

    expect(readingSchema.safeParse(missing).success).toBe(false);
  });
});

describe('countWords', () => {
  it('ignores extra whitespace', () => {
    expect(countWords('  one   two \n three ')).toBe(3);
    expect(countWords('')).toBe(0);
  });
});

describe('readingJsonSchema', () => {
  it('drops $schema, which Gemini does not accept', () => {
    expect(readingJsonSchema).not.toHaveProperty('$schema');
  });

  it('carries the word limits into the descriptions the model sees', () => {
    const schema = readingJsonSchema as {
      properties: { identity: { properties: { title: { description: string } } } };
    };

    expect(schema.properties.identity.properties.title.description).toMatch(/Maximum 5 words/);
  });

  it('lists the sections in display order, which is the order Gemini writes them', () => {
    expect(Object.keys((readingJsonSchema as { properties: object }).properties)).toEqual([
      'saju_snapshot',
      'identity',
      'hidden_side',
      'english_style',
      'cebu_mode',
      'challenge',
      'academy_reading',
      'experiment',
      'question',
    ]);
  });
});
