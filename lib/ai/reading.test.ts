import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildModelInput, generateReading } from './reading';
import { calculateSaju } from '../saju/calculate';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const VALID_READING = {
  element_line: { title: 'A lamp in a room', body: 'Your day master is Earth.' },
  learner_type: { label: 'Input learner', body: 'You have two Resource stars.', tip: 'Read daily.' },
  classroom: { label: 'Quiet but steady', body: 'You have one Peer star.' },
  challenge: { element: 'fire', body: 'You have no Fire.', action: 'Ask one question in class.' },
  question: 'What do I avoid saying out loud?',
};

const WITH_TIME = calculateSaju({ year: 1995, month: 12, day: 13, time: '16:40' });
const WITHOUT_TIME = calculateSaju({ year: 2001, month: 8, day: 9, time: null });

describe('buildModelInput', () => {
  it('never sends the birth date or time to the model', () => {
    const payload = JSON.stringify(buildModelInput(WITH_TIME, 'student'));

    expect(payload).not.toContain('1995');
    expect(payload).not.toContain('16:40');
    expect(payload).not.toContain('input');
  });

  it('removes the day master from the peer count', () => {
    // The chart itself carries two Peer stars; one of them is the day stem, which is the reader.
    expect(WITH_TIME.tenGodGroups.peer).toBe(2);
    expect(buildModelInput(WITH_TIME, 'student').ten_god_group_counts.peer).toBe(1);
  });

  it('never sends a negative peer count, even when the day master is the only Peer star', () => {
    expect(WITHOUT_TIME.tenGodGroups.peer).toBe(1);
    expect(buildModelInput(WITHOUT_TIME, 'student').ten_god_group_counts.peer).toBe(0);
  });

  it('leaves the other star groups untouched', () => {
    const counts = buildModelInput(WITH_TIME, 'student').ten_god_group_counts;

    expect(counts).toEqual({ output: 2, resource: 0, peer: 1, authority: 2, wealth: 2 });
  });

  it('sends star groups in English, never Korean', () => {
    const payload = JSON.stringify(buildModelInput(WITH_TIME, 'student'));

    expect(payload).not.toMatch(/[가-힣]/);
    expect(payload).toContain('"star_group":"authority"');
  });

  it('sends a null hour pillar and time_known false when the birth time is unknown', () => {
    const payload = buildModelInput(WITHOUT_TIME, 'student');

    expect(payload.time_known).toBe(false);
    expect(payload.four_pillars.hour).toBeNull();
  });
});

describe('generateReading', () => {
  beforeEach(() => {
    generateContent.mockReset();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses to call the model without an API key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');

    await expect(generateReading(WITH_TIME, 'student')).rejects.toThrow(/GEMINI_API_KEY is not set/);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('returns the reading when the first answer validates', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(VALID_READING) });

    await expect(generateReading(WITH_TIME, 'student')).resolves.toEqual(VALID_READING);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('retries once when the answer breaks a word limit, and tells the model what broke', async () => {
    const tooLong = {
      ...VALID_READING,
      element_line: { ...VALID_READING.element_line, title: 'A lamp burning in a very dark room' },
    };
    generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(tooLong) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_READING) });

    await expect(generateReading(WITH_TIME, 'student')).resolves.toEqual(VALID_READING);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[1][0].contents).toMatch(/6 words or fewer/);
  });

  it('retries once when the answer is not JSON', async () => {
    generateContent
      .mockResolvedValueOnce({ text: 'Sorry, I cannot do that.' })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_READING) });

    await expect(generateReading(WITH_TIME, 'student')).resolves.toEqual(VALID_READING);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('gives up after the second failure instead of retrying forever', async () => {
    generateContent.mockResolvedValue({ text: '{}' });

    await expect(generateReading(WITH_TIME, 'student')).rejects.toThrow(/after 2 attempts/);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('sends the role-matched label enum and the system prompt', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        ...VALID_READING,
        learner_type: { ...VALID_READING.learner_type, label: 'Explainer' },
      }),
    });

    await generateReading(WITH_TIME, 'teacher');
    const config = generateContent.mock.calls[0][0].config;

    expect(config.systemInstruction).toMatch(/Saju is a mirror, not a map/);
    expect(config.responseMimeType).toBe('application/json');
    expect(config.responseJsonSchema.properties.learner_type.properties.label.enum).toContain(
      'Explainer'
    );
  });

  it('defaults to a Flash model and honours GEMINI_MODEL when set', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(VALID_READING) });

    await generateReading(WITH_TIME, 'student');
    expect(generateContent.mock.calls[0][0].model).toBe('gemini-2.5-flash');

    vi.stubEnv('GEMINI_MODEL', 'gemini-3-flash-preview');
    await generateReading(WITH_TIME, 'student');
    expect(generateContent.mock.calls[1][0].model).toBe('gemini-3-flash-preview');
  });
});
