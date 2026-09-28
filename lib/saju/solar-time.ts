/*
 * BIRTHPLACE CORRECTION
 *
 * A clock shows the time of its time zone, not the time of the sky above the birthplace. Seoul
 * runs on UTC+9 (the 135°E meridian) but sits at 127°E, so the sun is ~32 minutes behind the
 * clock there. Saju reads the hour and the day from the sun, so a Myeongri reader corrects the
 * clock time by the birthplace's longitude: 4 minutes per degree away from the zone's meridian.
 *
 * Two different clocks are needed:
 *
 * - Year and month pillars change at a solar term (절기) — one instant for the whole world.
 *   lunar-javascript dates its solar terms in Beijing time (UTC+8), so the birth instant is
 *   handed to it as a UTC+8 wall time.
 * - Day and hour pillars follow the local sun: local mean solar time = UTC + longitude × 4 min.
 *
 * The UTC offset comes from the IANA time zone database through Intl, so summer time and
 * historical changes are included (Korea's 1987–88 summer time, its UTC+8:30 years 1954–61,
 * China's 1986–91 summer time, and so on).
 *
 * Mean solar time, not "true" solar time: the equation of time (±16 min over a year) is left
 * out, as most Korean almanacs (만세력) do. Schools differ; this is stated, not hidden.
 */

const MINUTE = 60_000;
const BEIJING_OFFSET_MINUTES = 8 * 60;

export interface BirthPlace {
  /** Degrees, east positive. */
  longitude: number;
  /** IANA name, e.g. "Asia/Seoul". */
  timezone: string;
}

export interface Wall {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** The zone's offset from UTC, in minutes, at a given instant. */
export function utcOffsetMinutes(timezone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wallAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((wallAsUtc - Math.floor(utcMs / 1000) * 1000) / MINUTE);
}

function wallMs(wall: Wall): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
}

function toWall(ms: number): Wall {
  const date = new Date(ms);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

/**
 * The instant a local clock reading stands for. The offset depends on the instant (summer time),
 * so each offset in force around that day is tried, and the one that reproduces the clock
 * reading wins. A clock time that happened twice (summer time ending) picks the first; one that
 * never happened (summer time starting) is read with the offset from before the jump.
 */
export function wallToUtc(wall: Wall, timezone: string): { utcMs: number; offsetMinutes: number } {
  const local = wallMs(wall);
  const DAY = 24 * 60 * MINUTE;
  const before = utcOffsetMinutes(timezone, local - DAY);
  const after = utcOffsetMinutes(timezone, local + DAY);

  const valid = [...new Set([before, after])].filter(
    (offset) => utcOffsetMinutes(timezone, local - offset * MINUTE) === offset
  );
  // The larger offset is the earlier instant — the first time the clock showed this reading.
  const offsetMinutes = valid.length > 0 ? Math.max(...valid) : before;
  return { utcMs: local - offsetMinutes * MINUTE, offsetMinutes };
}

export interface CorrectedBirth {
  /** Wall time to read the year and month pillars from (Beijing time, as lunar-javascript expects). */
  termWall: Wall;
  /** Local mean solar time — what the day and hour pillars are read from. */
  solarWall: Wall;
  /** Solar time minus clock time. Negative: the sun was behind the clock. */
  correctionMinutes: number;
  utcOffsetMinutes: number;
}

export function correctForBirthplace(clock: Wall, place: BirthPlace): CorrectedBirth {
  const { utcMs, offsetMinutes } = wallToUtc(clock, place.timezone);
  const solarMs = utcMs + Math.round(place.longitude * 4 * MINUTE);

  return {
    termWall: toWall(utcMs + BEIJING_OFFSET_MINUTES * MINUTE),
    solarWall: toWall(solarMs),
    correctionMinutes: Math.round((solarMs - wallMs(clock)) / MINUTE),
    utcOffsetMinutes: offsetMinutes,
  };
}
