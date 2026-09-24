import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clientKey, isRateLimited, resetRateLimit } from './rate-limit';

beforeEach(() => {
  resetRateLimit();
  vi.stubEnv('RATE_LIMIT_PER_WINDOW', '3');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('clientKey', () => {
  it('takes the first hop of x-forwarded-for', () => {
    const request = new Request('http://localhost/api/reading', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    });

    expect(clientKey(request)).toBe('203.0.113.7');
  });

  it('falls back to a single local bucket when the header is missing', () => {
    expect(clientKey(new Request('http://localhost/api/reading'))).toBe('local');
  });
});

describe('isRateLimited', () => {
  it('allows requests up to the limit', () => {
    expect([1, 2, 3].map(() => isRateLimited('a'))).toEqual([false, false, false]);
  });

  it('blocks the request after the limit', () => {
    [1, 2, 3].forEach(() => isRateLimited('a'));

    expect(isRateLimited('a')).toBe(true);
  });

  it('counts each client separately', () => {
    [1, 2, 3, 4].forEach(() => isRateLimited('a'));

    expect(isRateLimited('b')).toBe(false);
  });

  it('lets a blocked client through once the window rolls over', () => {
    vi.useFakeTimers();
    [1, 2, 3, 4].forEach(() => isRateLimited('a'));
    expect(isRateLimited('a')).toBe(true);

    vi.advanceTimersByTime(10_001);

    expect(isRateLimited('a')).toBe(false);
  });

  it('defaults high enough that a room of phones behind one IP is never blocked', () => {
    vi.stubEnv('RATE_LIMIT_PER_WINDOW', '');
    resetRateLimit();

    const blocked = Array.from({ length: 100 }, () => isRateLimited('shared-wifi')).filter(Boolean);

    expect(blocked).toHaveLength(0);
  });
});
