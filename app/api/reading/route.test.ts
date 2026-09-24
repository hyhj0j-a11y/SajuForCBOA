import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetModelQueue } from '@/lib/ai/queue';
import { resetReadingCache } from '@/lib/ai/reading-cache';
import { resetRateLimit } from '@/lib/rate-limit';
import { POST } from './route';
import { SAMPLE_READING } from '@/lib/ai/reading.fixture';

const { generateReading } = vi.hoisted(() => ({ generateReading: vi.fn() }));
vi.mock('@/lib/ai/reading', () => ({ generateReading }));

// The cache, the queue and the rate limiter all live for the life of the process.
beforeEach(() => {
  resetReadingCache();
  resetModelQueue();
  resetRateLimit();
});

const READING = SAMPLE_READING;

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/reading', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

const GOOD = { birthDate: '1995-12-13', birthTime: '16:40', role: 'student' };

describe('POST /api/reading — validation', () => {
  it.each([
    ['a body that is not JSON', 'not json at all'],
    ['a missing role', { birthDate: '1995-12-13', birthTime: null }],
    ['an unknown role', { ...GOOD, role: 'principal' }],
    ['the retired teacher role', { ...GOOD, role: 'teacher' }],
    ['a birth date in the wrong format', { ...GOOD, birthDate: '13/12/1995' }],
    ['a birth date before 1940', { ...GOOD, birthDate: '1939-12-31' }],
    ['a birth date after 2015', { ...GOOD, birthDate: '2016-01-01' }],
    ['a date that does not exist', { ...GOOD, birthDate: '2001-02-29' }],
    ['a birth time in the wrong format', { ...GOOD, birthTime: '4:40 PM' }],
    ['an out-of-range birth time', { ...GOOD, birthTime: '24:00' }],
    ['a missing birth time key', { birthDate: '1995-12-13', role: 'student' }],
  ])('rejects %s with 400', async (_label, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(generateReading).not.toHaveBeenCalled();
  });

  it.each([
    ['the first supported year', '1940-01-01'],
    ['the last supported year', '2015-12-31'],
  ])('accepts %s', async (_label, birthDate) => {
    generateReading.mockResolvedValue(READING);

    expect((await post({ ...GOOD, birthDate })).status).toBe(200);
  });

  it('accepts a null birth time', async () => {
    generateReading.mockResolvedValue(READING);

    expect((await post({ ...GOOD, birthTime: null })).status).toBe(200);
  });

  it('names the bad field without echoing what was submitted', async () => {
    const response = await post({ ...GOOD, birthDate: '1902-07-04' });
    const body = await response.json();

    expect(body.fields[0].field).toBe('birthDate');
    expect(JSON.stringify(body)).not.toContain('1902-07-04');
  });
});

describe('POST /api/reading — success', () => {
  beforeEach(() => {
    generateReading.mockReset();
    generateReading.mockResolvedValue(READING);
  });

  it('returns the calculated pillars next to the reading', async () => {
    const response = await post(GOOD);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reading).toEqual(READING);
    expect(body.pillars.dayMaster.hanja).toBe('戊');
    expect(body.pillars.pillars.day.stem.hanja).toBe('戊');
    expect(body.pillars.timeKnown).toBe(true);
  });

  it('does not echo the birth data back in the pillars', async () => {
    const body = await (await post(GOOD)).json();

    expect(body.pillars).not.toHaveProperty('input');
  });

  it('passes the role through to the reader', async () => {
    await post({ ...GOOD, role: 'staff' });

    expect(generateReading).toHaveBeenCalledWith(expect.anything(), 'staff', expect.any(Number));
  });

  it('serves a repeat of the same birth details from cache, without a second model call', async () => {
    await post(GOOD);
    const second = await post(GOOD);

    expect(second.status).toBe(200);
    expect(await second.json()).toHaveProperty('reading', READING);
    expect(generateReading).toHaveBeenCalledTimes(1);
  });

  it('starts one generation for simultaneous requests with the same birth details', async () => {
    const [first, second] = await Promise.all([post(GOOD), post(GOOD)]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(generateReading).toHaveBeenCalledTimes(1);
  });

  it('treats a different role as a different reading', async () => {
    await post(GOOD);
    await post({ ...GOOD, role: 'staff' });

    expect(generateReading).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/reading — model failure', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    generateReading.mockReset();
    consoleError.mockClear();
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns 502 and keeps birth data out of the log', async () => {
    generateReading.mockRejectedValue(new Error('Gemini did not return a valid reading'));

    const response = await post(GOOD);

    expect(response.status).toBe(502);
    expect(consoleError).toHaveBeenCalled();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('1995');
  });
});
