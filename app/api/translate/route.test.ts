import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetModelQueue } from '@/lib/ai/queue';
import { resetReadingCache } from '@/lib/ai/reading-cache';
import { SAMPLE_READING } from '@/lib/ai/reading.fixture';
import { resetRateLimit } from '@/lib/rate-limit';
import { POST } from './route';

const { translateReading } = vi.hoisted(() => ({ translateReading: vi.fn() }));
vi.mock('@/lib/ai/translate', () => ({ translateReading }));

beforeEach(() => {
  resetReadingCache();
  resetModelQueue();
  resetRateLimit();
  translateReading.mockReset();
  translateReading.mockResolvedValue({ ...SAMPLE_READING, experiment: '下次多問一個問題。' });
});

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

const GOOD = { reading: SAMPLE_READING, lang: 'zh-TW', dayStem: '戊' };

describe('POST /api/translate — validation', () => {
  it.each([
    ['a body that is not JSON', 'not json'],
    ['English as the target', { ...GOOD, lang: 'en' }],
    ['an unsupported language', { ...GOOD, lang: 'fr' }],
    ['an unknown day stem', { ...GOOD, dayStem: 'X' }],
    ['a reading with a field missing', { ...GOOD, reading: { ...SAMPLE_READING, question: undefined } }],
    [
      'a field longer than the reading allows',
      { ...GOOD, reading: { ...SAMPLE_READING, experiment: 'word '.repeat(200) } },
    ],
  ])('rejects %s with 400', async (_label, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(translateReading).not.toHaveBeenCalled();
  });
});

describe('POST /api/translate — success', () => {
  it('returns the translated reading', async () => {
    const response = await post(GOOD);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reading.experiment).toBe('下次多問一個問題。');
    expect(translateReading).toHaveBeenCalledWith(SAMPLE_READING, 'zh-TW', '戊', expect.any(Number));
  });

  it('accepts Korean', async () => {
    expect((await post({ ...GOOD, lang: 'ko' })).status).toBe(200);
  });

  it('translates the same reading into the same language only once', async () => {
    await post(GOOD);
    await Promise.all([post(GOOD), post(GOOD)]);

    expect(translateReading).toHaveBeenCalledTimes(1);
  });

  it('treats another language as another translation', async () => {
    await post(GOOD);
    await post({ ...GOOD, lang: 'ja' });

    expect(translateReading).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/translate — model failure', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleError.mockClear();
  });

  it('returns 502', async () => {
    translateReading.mockRejectedValue(new Error('Gemini did not return a valid translation'));

    expect((await post(GOOD)).status).toBe(502);
  });
});
