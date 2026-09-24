import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildModelInput, generateReading } from './reading';
import { calculateSaju } from '../saju/calculate';
import { SAMPLE_READING } from './reading.fixture';

const { generateContent, MockApiError } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  MockApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  ApiError: MockApiError,
}));

const VALID_READING = SAMPLE_READING;

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

  it('sends the classical image for the day master, fixed in code', () => {
    // 1995-12-13 is a 戊 (Mu, yang earth) day.
    expect(buildModelInput(WITH_TIME, 'student').day_master.image).toBe('The Mountain');
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
      identity: { ...VALID_READING.identity, title: 'The Very Quiet Old Green Mountain' },
    };
    generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(tooLong) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_READING) });

    await expect(generateReading(WITH_TIME, 'student')).resolves.toEqual(VALID_READING);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[1][0].contents).toMatch(/5 words or fewer/);
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

  it('sends the system prompt and the JSON schema', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(VALID_READING) });

    await generateReading(WITH_TIME, 'staff');
    const config = generateContent.mock.calls[0][0].config;

    expect(config.systemInstruction).toMatch(/HARD SAFETY RULES/);
    expect(config.responseMimeType).toBe('application/json');
    expect(Object.keys(config.responseJsonSchema.properties)).toContain('academy_reading');
  });

  it('defaults to a Flash model and honours GEMINI_MODEL when set', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(VALID_READING) });

    await generateReading(WITH_TIME, 'student');
    expect(generateContent.mock.calls[0][0].model).toBe('gemini-3.5-flash-lite');

    vi.stubEnv('GEMINI_MODEL', 'gemini-3.1-flash-lite');
    await generateReading(WITH_TIME, 'student');
    expect(generateContent.mock.calls[1][0].model).toBe('gemini-3.1-flash-lite');
  });

  it('bounds every attempt with a request timeout and leaves the backoff to us', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(VALID_READING) });

    await generateReading(WITH_TIME, 'student');
    const { httpOptions } = generateContent.mock.calls[0][0].config;

    expect(httpOptions.timeout).toBeGreaterThan(0);
    // This module retries 429/5xx itself; the SDK retrying underneath would multiply the two
    // budgets together and leave one request running for minutes.
    expect(httpOptions.retryOptions.attempts).toBe(1);
  });

  it('retries a 503 with backoff and gives up after three attempts', async () => {
    generateContent.mockRejectedValue(new MockApiError(503, 'overloaded'));

    await expect(generateReading(WITH_TIME, 'student')).rejects.toThrow(/overloaded/i);
    // Three API attempts, not six: an overloaded model does not also spend the schema retry,
    // which only exists for answers that came back and did not validate.
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when the deadline leaves no room for another attempt', async () => {
    generateContent.mockRejectedValue(new MockApiError(503, 'overloaded'));

    await expect(generateReading(WITH_TIME, 'student', Date.now() + 50)).rejects.toThrow(
      /overloaded/i
    );
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 400, which resending will not fix', async () => {
    generateContent.mockRejectedValue(new MockApiError(400, 'bad request'));

    await expect(generateReading(WITH_TIME, 'student')).rejects.toThrow(/HTTP 400/);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('succeeds on a retry after a transient 429', async () => {
    generateContent
      .mockRejectedValueOnce(new MockApiError(429, 'quota exceeded'))
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_READING) });

    await expect(generateReading(WITH_TIME, 'student')).resolves.toEqual(VALID_READING);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('reports a 429 as a rate limit, not a generic failure', async () => {
    generateContent.mockRejectedValue(new MockApiError(429, 'quota exceeded'));

    await expect(generateReading(WITH_TIME, 'student')).rejects.toThrow(/rate limit/i);
  });

  it('reports an aborted request as a timeout', async () => {
    const abortError = new Error('This operation was aborted');
    abortError.name = 'AbortError';
    generateContent.mockRejectedValue(abortError);

    await expect(generateReading(WITH_TIME, 'student')).rejects.toThrow(/did not respond within/i);
  });
});
