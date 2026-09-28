import { describe, expect, it } from 'vitest';
import { calculateSaju } from './calculate';
import { correctForBirthplace, isValidTimeZone, wallToUtc } from './solar-time';

const SEOUL = { longitude: 126.98, timezone: 'Asia/Seoul' };
const TOKYO = { longitude: 139.69, timezone: 'Asia/Tokyo' };
const CEBU = { longitude: 123.89, timezone: 'Asia/Manila' };

const at = (year: number, month: number, day: number, hour: number, minute = 0) => ({ year, month, day, hour, minute });

function chart(result: ReturnType<typeof calculateSaju>): string {
  const { year, month, day, hour } = result.pillars;
  const text = (p: { stem: { hanja: string }; branch: { hanja: string } } | null) =>
    p ? `${p.stem.hanja}${p.branch.hanja}` : '—';
  return [text(year), text(month), text(day), text(hour)].join(' ');
}

describe('correctForBirthplace — longitude', () => {
  // 4 minutes per degree away from the zone's meridian: 126.98 × 4 = 507.9 min vs UTC+9 = 540.
  it('puts Seoul 32 minutes behind its clock', () => {
    expect(correctForBirthplace(at(1995, 12, 13, 16, 40), SEOUL).correctionMinutes).toBe(-32);
  });

  it('puts Tokyo 19 minutes ahead and Cebu 16 minutes ahead', () => {
    expect(correctForBirthplace(at(2000, 3, 1, 12), TOKYO).correctionMinutes).toBe(19);
    expect(correctForBirthplace(at(2000, 3, 1, 12), CEBU).correctionMinutes).toBe(16);
  });

  it('reads the solar terms at the birth instant, in Beijing time', () => {
    // 16:40 in Seoul (UTC+9) is 15:40 in Beijing (UTC+8).
    expect(correctForBirthplace(at(1995, 12, 13, 16, 40), SEOUL).termWall).toEqual(at(1995, 12, 13, 15, 40));
  });
});

describe('correctForBirthplace — history of the time zone', () => {
  it('knows Korean summer time in 1988 (UTC+10)', () => {
    const result = correctForBirthplace(at(1988, 7, 1, 12), SEOUL);

    expect(result.utcOffsetMinutes).toBe(600);
    expect(result.correctionMinutes).toBe(-92);
  });

  it('knows Korea ran on UTC+8:30 in 1960', () => {
    expect(correctForBirthplace(at(1960, 1, 1, 12), SEOUL).utcOffsetMinutes).toBe(510);
  });

  it('reads a clock time skipped by summer time with the offset from before the jump', () => {
    // 1987-05-10 02:00 jumped to 03:00 in Seoul.
    expect(wallToUtc(at(1987, 5, 10, 2, 30), 'Asia/Seoul').offsetMinutes).toBe(540);
  });

  it('reads a clock time that happened twice as the first time', () => {
    // 1987-10-11 03:00 went back to 02:00 in Seoul.
    expect(wallToUtc(at(1987, 10, 11, 2, 30), 'Asia/Seoul').offsetMinutes).toBe(600);
  });
});

describe('calculateSaju — with a birthplace', () => {
  it('keeps a chart whose hour stays inside its branch', () => {
    // 16:40 → 16:08 solar: still the 申 hour.
    const plain = calculateSaju({ year: 1995, month: 12, day: 13, time: '16:40' });
    const seoul = calculateSaju({ year: 1995, month: 12, day: 13, time: '16:40', place: SEOUL });

    expect(chart(seoul)).toBe(chart(plain));
    expect(seoul.timeCorrection).toEqual({ minutes: -32, utcOffsetMinutes: 540 });
  });

  it('moves the hour when the correction crosses a branch boundary', () => {
    // 15:10 in Seoul is 14:38 by the sun: 未 hour, not 申.
    const seoul = calculateSaju({ year: 1995, month: 12, day: 13, time: '15:10', place: SEOUL });

    expect(seoul.pillars.hour?.branch.hanja).toBe('未');
  });

  it('keeps a 23:20 Seoul birth on its own day — by the sun it is still 22:48', () => {
    const plain = calculateSaju({ year: 1995, month: 12, day: 13, time: '23:20' });
    const seoul = calculateSaju({ year: 1995, month: 12, day: 13, time: '23:20', place: SEOUL });

    expect(plain.pillars.day.branch.hanja).not.toBe('寅');
    expect(seoul.pillars.day.stem.hanja + seoul.pillars.day.branch.hanja).toBe('戊寅');
    expect(seoul.pillars.hour?.branch.hanja).toBe('亥');
  });

  it('reports no correction when no birthplace is given', () => {
    expect(calculateSaju({ year: 1995, month: 12, day: 13, time: '16:40' }).timeCorrection).toBeNull();
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA names and rejects anything else', () => {
    expect(isValidTimeZone('Asia/Manila')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
