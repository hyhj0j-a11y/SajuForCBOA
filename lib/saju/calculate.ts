import { Solar } from 'lunar-javascript';

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type Polarity = 'yang' | 'yin';

export type TenGod =
  | 'bigyeon'
  | 'geopjae'
  | 'siksin'
  | 'sanggwan'
  | 'pyeonjae'
  | 'jeongjae'
  | 'pyeongwan'
  | 'jeonggwan'
  | 'pyeonin'
  | 'jeongin';

export type TenGodGroup = 'output' | 'resource' | 'peer' | 'authority' | 'wealth';

export type PillarName = 'year' | 'month' | 'day' | 'hour';

export interface Sign {
  hanja: string;
  roman: string;
  element: Element;
  polarity: Polarity;
}

export interface Pillar {
  stem: Sign;
  branch: Sign;
  /** Ten God of the branch's main hidden stem, seen from the day master. */
  branchTenGod: TenGod;
  /** Ten God of the stem, seen from the day master. `null` for the day pillar (it is the day master). */
  stemTenGod: TenGod | null;
}

export interface SajuInput {
  /** Gregorian (solar) date, as written on the birth certificate. */
  year: number;
  month: number;
  day: number;
  /**
   * Clock time at the place of birth, "HH:mm", 24-hour.
   * Used exactly as given — no time zone or longitude correction.
   * `null` means the birth time is unknown.
   */
  time: string | null;
}

export interface SajuResult {
  input: SajuInput;
  timeKnown: boolean;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;
  };
  dayMaster: Sign;
  elementCounts: Record<Element, number>;
  tenGodCounts: Record<TenGod, number>;
  tenGodGroups: Record<TenGodGroup, number>;
  strongestElement: Element;
  weakestElement: Element;
  missingElements: Element[];
}

/*
 * DAY BOUNDARY RULE (23:00–01:00, the Ja hour / 자시)
 *
 * This project uses the classical rule: THE SAJU DAY STARTS AT 23:00.
 * A birth at 23:00–23:59 gets the day pillar of the NEXT calendar date;
 * 00:00–22:59 keeps the day pillar of its own calendar date.
 *
 * Why this rule and not the "late Ja / early Ja" (야자시/조자시) split:
 * the hour stem is derived from the day stem, so moving the hour into the
 * next day while leaving the day pillar on the previous date produces a
 * chart whose hour stem does not follow from its own day stem. The result
 * table is shown to users as proof that the chart is computed, not random,
 * so every pillar has to stay internally consistent.
 *
 * In lunar-javascript this is `sect = 1`. The library's default is `sect = 2`,
 * so `setSect(1)` below is deliberate — do not remove it.
 */
const LUNAR_SECT_DAY_STARTS_AT_23 = 1;

/** Reference hour used when the birth time is unknown. See `UNKNOWN_TIME` note in README. */
const UNKNOWN_TIME_REFERENCE_HOUR = 12;

const STEMS: Record<string, Sign> = {
  甲: { hanja: '甲', roman: 'Gap', element: 'wood', polarity: 'yang' },
  乙: { hanja: '乙', roman: 'Eul', element: 'wood', polarity: 'yin' },
  丙: { hanja: '丙', roman: 'Byeong', element: 'fire', polarity: 'yang' },
  丁: { hanja: '丁', roman: 'Jeong', element: 'fire', polarity: 'yin' },
  戊: { hanja: '戊', roman: 'Mu', element: 'earth', polarity: 'yang' },
  己: { hanja: '己', roman: 'Gi', element: 'earth', polarity: 'yin' },
  庚: { hanja: '庚', roman: 'Gyeong', element: 'metal', polarity: 'yang' },
  辛: { hanja: '辛', roman: 'Sin', element: 'metal', polarity: 'yin' },
  壬: { hanja: '壬', roman: 'Im', element: 'water', polarity: 'yang' },
  癸: { hanja: '癸', roman: 'Gye', element: 'water', polarity: 'yin' },
};

const BRANCHES: Record<string, Sign> = {
  子: { hanja: '子', roman: 'Ja', element: 'water', polarity: 'yang' },
  丑: { hanja: '丑', roman: 'Chuk', element: 'earth', polarity: 'yin' },
  寅: { hanja: '寅', roman: 'In', element: 'wood', polarity: 'yang' },
  卯: { hanja: '卯', roman: 'Myo', element: 'wood', polarity: 'yin' },
  辰: { hanja: '辰', roman: 'Jin', element: 'earth', polarity: 'yang' },
  巳: { hanja: '巳', roman: 'Sa', element: 'fire', polarity: 'yin' },
  午: { hanja: '午', roman: 'O', element: 'fire', polarity: 'yang' },
  未: { hanja: '未', roman: 'Mi', element: 'earth', polarity: 'yin' },
  申: { hanja: '申', roman: 'Sin', element: 'metal', polarity: 'yang' },
  酉: { hanja: '酉', roman: 'Yu', element: 'metal', polarity: 'yin' },
  戌: { hanja: '戌', roman: 'Sul', element: 'earth', polarity: 'yang' },
  亥: { hanja: '亥', roman: 'Hae', element: 'water', polarity: 'yin' },
};

/** Main hidden stem (본기) of each branch — the only hidden stem used for Ten God counts. */
const BRANCH_MAIN_STEM: Record<string, string> = {
  子: '癸',
  丑: '己',
  寅: '甲',
  卯: '乙',
  辰: '戊',
  巳: '丙',
  午: '丁',
  未: '己',
  申: '庚',
  酉: '辛',
  戌: '戊',
  亥: '壬',
};

const PRODUCES: Record<Element, Element> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

const CONTROLS: Record<Element, Element> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

/** Fixed order used for every count and for breaking ties deterministically. */
export const ELEMENT_ORDER: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export const TEN_GOD_GROUP: Record<TenGod, TenGodGroup> = {
  siksin: 'output',
  sanggwan: 'output',
  jeongin: 'resource',
  pyeonin: 'resource',
  bigyeon: 'peer',
  geopjae: 'peer',
  jeonggwan: 'authority',
  pyeongwan: 'authority',
  jeongjae: 'wealth',
  pyeonjae: 'wealth',
};

export const TEN_GOD_KOREAN: Record<TenGod, string> = {
  bigyeon: '비견',
  geopjae: '겁재',
  siksin: '식신',
  sanggwan: '상관',
  pyeonjae: '편재',
  jeongjae: '정재',
  pyeongwan: '편관',
  jeonggwan: '정관',
  pyeonin: '편인',
  jeongin: '정인',
};

export function tenGodOf(dayMaster: Sign, other: Sign): TenGod {
  const same = dayMaster.polarity === other.polarity;
  if (other.element === dayMaster.element) return same ? 'bigyeon' : 'geopjae';
  if (PRODUCES[dayMaster.element] === other.element) return same ? 'siksin' : 'sanggwan';
  if (CONTROLS[dayMaster.element] === other.element) return same ? 'pyeonjae' : 'jeongjae';
  if (CONTROLS[other.element] === dayMaster.element) return same ? 'pyeongwan' : 'jeonggwan';
  return same ? 'pyeonin' : 'jeongin';
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTime(time: string): { hour: number; minute: number } {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    throw new Error(`Invalid birth time "${time}". Expected 24-hour "HH:mm", for example "09:05".`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function assertValidDate(year: number, month: number, day: number): void {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error('Birth date must be whole numbers.');
  }
  if (year < 1900 || year > 2100) {
    throw new Error(`Birth year ${year} is outside the supported range 1900–2100.`);
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Invalid birth date ${year}-${month}-${day}.`);
  }
}

function signOfStem(hanja: string): Sign {
  const sign = STEMS[hanja];
  if (!sign) throw new Error(`Unknown heavenly stem "${hanja}".`);
  return sign;
}

function signOfBranch(hanja: string): Sign {
  const sign = BRANCHES[hanja];
  if (!sign) throw new Error(`Unknown earthly branch "${hanja}".`);
  return sign;
}

function buildPillar(dayMaster: Sign, stem: Sign, branch: Sign, isDayPillar: boolean): Pillar {
  return {
    stem,
    branch,
    stemTenGod: isDayPillar ? null : tenGodOf(dayMaster, stem),
    branchTenGod: tenGodOf(dayMaster, signOfStem(BRANCH_MAIN_STEM[branch.hanja])),
  };
}

export function calculateSaju(input: SajuInput): SajuResult {
  assertValidDate(input.year, input.month, input.day);
  const timeKnown = input.time !== null;
  const { hour, minute } = timeKnown
    ? parseTime(input.time as string)
    : { hour: UNKNOWN_TIME_REFERENCE_HOUR, minute: 0 };

  const eightChar = Solar.fromYmdHms(input.year, input.month, input.day, hour, minute, 0)
    .getLunar()
    .getEightChar();
  eightChar.setSect(LUNAR_SECT_DAY_STARTS_AT_23);

  const dayMaster = signOfStem(eightChar.getDayGan());

  const pillars = {
    year: buildPillar(
      dayMaster,
      signOfStem(eightChar.getYearGan()),
      signOfBranch(eightChar.getYearZhi()),
      false
    ),
    month: buildPillar(
      dayMaster,
      signOfStem(eightChar.getMonthGan()),
      signOfBranch(eightChar.getMonthZhi()),
      false
    ),
    day: buildPillar(dayMaster, dayMaster, signOfBranch(eightChar.getDayZhi()), true),
    hour: timeKnown
      ? buildPillar(
          dayMaster,
          signOfStem(eightChar.getTimeGan()),
          signOfBranch(eightChar.getTimeZhi()),
          false
        )
      : null,
  };

  const present: Pillar[] = [pillars.year, pillars.month, pillars.day];
  if (pillars.hour) present.push(pillars.hour);

  const elementCounts = Object.fromEntries(ELEMENT_ORDER.map((e) => [e, 0])) as Record<
    Element,
    number
  >;
  const tenGodCounts = Object.fromEntries(
    (Object.keys(TEN_GOD_GROUP) as TenGod[]).map((g) => [g, 0])
  ) as Record<TenGod, number>;
  const tenGodGroups: Record<TenGodGroup, number> = {
    output: 0,
    resource: 0,
    peer: 0,
    authority: 0,
    wealth: 0,
  };

  for (const pillar of present) {
    elementCounts[pillar.stem.element] += 1;
    elementCounts[pillar.branch.element] += 1;

    const gods: TenGod[] = [pillar.branchTenGod];
    if (pillar.stemTenGod) gods.push(pillar.stemTenGod);
    for (const god of gods) {
      tenGodCounts[god] += 1;
      tenGodGroups[TEN_GOD_GROUP[god]] += 1;
    }
  }

  const strongestElement = ELEMENT_ORDER.reduce((best, e) =>
    elementCounts[e] > elementCounts[best] ? e : best
  );
  const weakestElement = ELEMENT_ORDER.reduce((worst, e) =>
    elementCounts[e] < elementCounts[worst] ? e : worst
  );

  return {
    input,
    timeKnown,
    pillars,
    dayMaster,
    elementCounts,
    tenGodCounts,
    tenGodGroups,
    strongestElement,
    weakestElement,
    missingElements: ELEMENT_ORDER.filter((e) => elementCounts[e] === 0),
  };
}
