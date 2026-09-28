import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimit } from '@/lib/rate-limit';
import { POST } from './route';

const { searchRemotePlaces } = vi.hoisted(() => ({ searchRemotePlaces: vi.fn() }));
vi.mock('@/lib/places/remote', () => ({ searchRemotePlaces }));

beforeEach(() => {
  resetRateLimit();
  searchRemotePlaces.mockReset();
  searchRemotePlaces.mockResolvedValue([]);
});

async function search(query: string, country: string | null = null) {
  const response = await POST(
    new Request('http://localhost/api/places', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, country }),
    })
  );
  return { status: response.status, body: await response.json() };
}

describe('POST /api/places — the bundled list', () => {
  it.each([
    ['Seoul', 'Seoul'],
    ['서울', '서울 · Seoul'],
    ['ソウル', 'ソウル · Seoul'],
    ['세부', '세부 · Cebu City'],
    ['台中', '台中 · Taichung'],
    ['Đà Nẵng', 'Da Nang'],
    ['lapu lapu', 'Lapu-Lapu City'],
  ])('finds "%s" first as %s', async (query, name) => {
    const { body } = await search(query);

    expect(body.places[0].name).toBe(name);
    expect(searchRemotePlaces).not.toHaveBeenCalled();
  });

  it('carries the longitude and time zone the chart needs', async () => {
    const { body } = await search('Cebu City');

    expect(body.places[0]).toMatchObject({ country: 'PH', longitude: 123.89, timezone: 'Asia/Manila' });
  });

  it('finds a Cebu barangay, and offers look-alikes only once', async () => {
    const { body } = await search('Banilad', 'PH');
    const labels = body.places.map((p: { name: string; region: string }) => `${p.name}, ${p.region}`);

    expect(labels[0]).toBe('Banilad, Central Visayas');
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('finds a Korean district by its Korean name', async () => {
    const { body } = await search('분당');

    expect(body.places[0]).toMatchObject({ name: '분당구 · Bundang-gu', country: 'KR' });
  });

  it('narrows to the chosen country', async () => {
    const { body } = await search('Talisay', 'PH');

    expect(body.places.length).toBeGreaterThan(1);
    expect(body.places.every((place: { country: string }) => place.country === 'PH')).toBe(true);
  });
});

describe('POST /api/places — fallback', () => {
  it('asks the live geocoder only when the list has nothing', async () => {
    searchRemotePlaces.mockResolvedValue([{ id: 'om:1', name: 'Tiny Village' }]);
    const { body } = await search('Zzyzxville');

    expect(searchRemotePlaces).toHaveBeenCalledWith('Zzyzxville', null);
    expect(body).toMatchObject({ source: 'remote', places: [{ name: 'Tiny Village' }] });
  });

  it('does not go to the network for a two-letter miss', async () => {
    await search('Qx');

    expect(searchRemotePlaces).not.toHaveBeenCalled();
  });
});

describe('POST /api/places — validation', () => {
  it.each([
    ['an empty query', { query: '  ', country: null }],
    ['a lower-case country code', { query: 'Seoul', country: 'kr' }],
    ['a very long query', { query: 'x'.repeat(61), country: null }],
  ])('rejects %s', async (_label, payload) => {
    const response = await POST(
      new Request('http://localhost/api/places', { method: 'POST', body: JSON.stringify(payload) })
    );

    expect(response.status).toBe(400);
  });
});
