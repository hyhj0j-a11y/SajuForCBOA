import { describe, expect, it } from 'vitest';
import { countWords, readingJsonSchema, readingSchema } from './schema';

const VALID = {
  element_line: { title: 'A lamp in a room', body: 'Your day master is Earth.' },
  learner_type: { label: 'Input learner', body: 'You have two Resource stars.', tip: 'Read daily.' },
  classroom: { label: 'Quiet but steady', body: 'You have one Peer star.' },
  challenge: { element: 'fire', body: 'You have no Fire.', action: 'Ask one question in class.' },
  question: 'What do I avoid saying out loud?',
};

describe('readingSchema', () => {
  it('accepts a well-formed reading', () => {
    expect(readingSchema('student').safeParse(VALID).success).toBe(true);
  });

  it('rejects a title over its word limit', () => {
    const tooLong = {
      ...VALID,
      element_line: { ...VALID.element_line, title: 'A lamp burning in a very dark room' },
    };
    const result = readingSchema('student').safeParse(tooLong);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/6 words or fewer/);
  });

  it('rejects an empty field', () => {
    const empty = { ...VALID, question: '   ' };

    expect(readingSchema('student').safeParse(empty).success).toBe(false);
  });

  it('accepts student labels only for students, and teacher labels only for teachers', () => {
    const asTeacher = { ...VALID, learner_type: { ...VALID.learner_type, label: 'Explainer' } };

    expect(readingSchema('student').safeParse(VALID).success).toBe(true);
    expect(readingSchema('student').safeParse(asTeacher).success).toBe(false);
    expect(readingSchema('teacher').safeParse(asTeacher).success).toBe(true);
    expect(readingSchema('teacher').safeParse(VALID).success).toBe(false);
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
    expect(readingJsonSchema('student')).not.toHaveProperty('$schema');
  });

  it('carries the word limits into the descriptions the model sees', () => {
    const schema = readingJsonSchema('student') as {
      properties: { element_line: { properties: { title: { description: string } } } };
    };

    expect(schema.properties.element_line.properties.title.description).toMatch(/Maximum 6 words/);
  });

  it('swaps the learner label enum for the role', () => {
    const labelEnum = (role: 'student' | 'teacher') =>
      (
        readingJsonSchema(role) as {
          properties: { learner_type: { properties: { label: { enum: string[] } } } };
        }
      ).properties.learner_type.properties.label.enum;

    expect(labelEnum('student')).toEqual(['Input learner', 'Output learner', 'Balanced learner']);
    expect(labelEnum('teacher')).toEqual(['Explainer', 'Listener', 'Balanced teacher']);
  });
});
