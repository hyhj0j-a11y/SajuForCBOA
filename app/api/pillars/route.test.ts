import { describe, expect, it } from 'vitest';
import { POST } from './route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/pillars', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

const GOOD = { birthDate: '1995-12-13', birthTime: '16:40', role: 'student' };

describe('POST /api/pillars', () => {
  it.each([
    ['a body that is not JSON', 'not json at all'],
    ['a birth date in the wrong format', { ...GOOD, birthDate: '13/12/1995' }],
    ['a birth date outside the supported years', { ...GOOD, birthDate: '2016-01-01' }],
    ['a date that does not exist', { ...GOOD, birthDate: '2001-02-29' }],
    ['a birth time in the wrong format', { ...GOOD, birthTime: '4:40 PM' }],
  ])('rejects %s with 400', async (_label, body) => {
    expect((await post(body)).status).toBe(400);
  });

  it('returns the calculated chart', async () => {
    const body = await (await post(GOOD)).json();

    expect(body.pillars.pillars.day.stem.hanja).toBe('戊');
    expect(body.pillars.pillars.hour.stem.hanja).toBe('庚');
    expect(body.pillars.timeKnown).toBe(true);
  });

  it('drops the hour pillar when the birth time is unknown', async () => {
    const body = await (await post({ ...GOOD, birthTime: null })).json();

    expect(body.pillars.timeKnown).toBe(false);
    expect(body.pillars.pillars.hour).toBeNull();
  });

  it('does not echo the birth data back', async () => {
    const body = await (await post(GOOD)).json();

    expect(body.pillars).not.toHaveProperty('input');
    expect(JSON.stringify(body)).not.toContain('1995-12-13');
  });

  it('never reaches the model', async () => {
    // The route imports no model code at all; this asserts the response shape stays reading-free.
    const body = await (await post(GOOD)).json();

    expect(body).not.toHaveProperty('reading');
  });
});
