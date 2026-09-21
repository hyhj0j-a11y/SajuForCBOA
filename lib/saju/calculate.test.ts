import { describe, expect, it } from 'vitest';
import { Solar } from 'lunar-javascript';
import {
  calculateSaju,
  tenGodOf,
  TEN_GOD_GROUP,
  TEN_GOD_KOREAN,
  type SajuInput,
  type SajuResult,
} from '@/lib/saju/calculate';

function chart(result: SajuResult): string {
  const { year, month, day, hour } = result.pillars;
  const text = (p: { stem: { hanja: string }; branch: { hanja: string } } | null) =>
    p ? `${p.stem.hanja}${p.branch.hanja}` : '—';
  return [text(year), text(month), text(day), text(hour)].join(' ');
}

/** Hour stem implied by the day stem (五鼠遁): Gap/Gi days start the Ja hour at Gapja, and so on. */
function expectedHourStem(dayStem: string, hourBranch: string): string {
  const stems = '甲乙丙丁戊己庚辛壬癸';
  const branches = '子丑寅卯辰巳午未申酉戌亥';
  const start = (stems.indexOf(dayStem) % 5) * 2;
  return stems[(start + branches.indexOf(hourBranch)) % 10];
}

describe('calculateSaju — birth time known', () => {
  const cases: Array<{ name: string; input: SajuInput; chart: string; dayMaster: string }> = [
    {
      name: '1990-05-15 14:30',
      input: { year: 1990, month: 5, day: 15, time: '14:30' },
      chart: '庚午 辛巳 庚辰 癸未',
      dayMaster: '庚',
    },
    {
      name: '2005-11-03 09:15',
      input: { year: 2005, month: 11, day: 3, time: '09:15' },
      chart: '乙酉 丙戌 辛卯 癸巳',
      dayMaster: '辛',
    },
    {
      name: '1978-02-20 07:40',
      input: { year: 1978, month: 2, day: 20, time: '07:40' },
      chart: '戊午 甲寅 癸丑 丙辰',
      dayMaster: '癸',
    },
  ];

  for (const testCase of cases) {
    it(`builds four pillars for ${testCase.name}`, () => {
      const result = calculateSaju(testCase.input);

      expect(result.timeKnown).toBe(true);
      expect(result.pillars.hour).not.toBeNull();
      expect(chart(result)).toBe(testCase.chart);
      expect(result.dayMaster.hanja).toBe(testCase.dayMaster);
      expect(result.pillars.day.stem.hanja).toBe(testCase.dayMaster);
      expect(result.pillars.day.stemTenGod).toBeNull();
    });

    it(`counts eight characters for ${testCase.name}`, () => {
      const result = calculateSaju(testCase.input);
      const elements = Object.values(result.elementCounts).reduce((a, b) => a + b, 0);
      const tenGods = Object.values(result.tenGodCounts).reduce((a, b) => a + b, 0);
      const groups = Object.values(result.tenGodGroups).reduce((a, b) => a + b, 0);

      expect(elements).toBe(8);
      // Seven Ten Gods: four branches plus three stems — the day stem is the day master itself.
      expect(tenGods).toBe(7);
      expect(groups).toBe(7);
    });
  }

  it('reports the strongest, weakest and missing elements', () => {
    const result = calculateSaju({ year: 1990, month: 5, day: 15, time: '14:30' });

    expect(result.elementCounts).toEqual({ wood: 0, fire: 2, earth: 2, metal: 3, water: 1 });
    expect(result.strongestElement).toBe('metal');
    expect(result.weakestElement).toBe('wood');
    expect(result.missingElements).toEqual(['wood']);
  });
});

describe('calculateSaju — birth time unknown', () => {
  const input: SajuInput = { year: 2001, month: 8, day: 9, time: null };

  it('returns a three-pillar reading', () => {
    const result = calculateSaju(input);

    expect(result.timeKnown).toBe(false);
    expect(result.pillars.hour).toBeNull();
    expect(chart(result)).toBe('辛巳 丙申 甲辰 —');
    expect(result.dayMaster.hanja).toBe('甲');
  });

  it('counts six characters and five Ten Gods', () => {
    const result = calculateSaju(input);
    const elements = Object.values(result.elementCounts).reduce((a, b) => a + b, 0);
    const tenGods = Object.values(result.tenGodCounts).reduce((a, b) => a + b, 0);

    expect(elements).toBe(6);
    expect(tenGods).toBe(5);
  });

  it('matches the same date read at the 12:00 reference hour', () => {
    const unknown = calculateSaju(input);
    const noon = calculateSaju({ ...input, time: '12:00' });

    expect(chart(unknown).replace(' —', '')).toBe(chart(noon).split(' ').slice(0, 3).join(' '));
  });
});

describe('calculateSaju — Ja hour (자시) day boundary at 23:00', () => {
  it('moves a 23:30 birth onto the next day pillar', () => {
    const lateZi = calculateSaju({ year: 2000, month: 1, day: 10, time: '23:30' });
    const nextDay = calculateSaju({ year: 2000, month: 1, day: 11, time: '12:00' });

    expect(chart(lateZi)).toBe('己卯 丁丑 戊辰 壬子');
    expect(lateZi.pillars.hour?.branch.hanja).toBe('子');
    expect(lateZi.pillars.day.stem.hanja).toBe(nextDay.pillars.day.stem.hanja);
    expect(lateZi.pillars.day.branch.hanja).toBe(nextDay.pillars.day.branch.hanja);
  });

  it('keeps a 22:30 birth on its own day pillar', () => {
    const beforeZi = calculateSaju({ year: 2000, month: 1, day: 10, time: '22:30' });
    const sameDay = calculateSaju({ year: 2000, month: 1, day: 10, time: '12:00' });

    expect(beforeZi.pillars.day.stem.hanja).toBe(sameDay.pillars.day.stem.hanja);
    expect(beforeZi.pillars.day.branch.hanja).toBe(sameDay.pillars.day.branch.hanja);
    expect(beforeZi.pillars.hour?.branch.hanja).toBe('亥');
  });

  it('keeps the hour stem consistent with its own day stem across the boundary', () => {
    for (const time of ['22:30', '23:30', '00:30', '01:30']) {
      const result = calculateSaju({ year: 2000, month: 1, day: 10, time });
      const { day, hour } = result.pillars;
      expect(hour).not.toBeNull();
      expect(hour!.stem.hanja).toBe(expectedHourStem(day.stem.hanja, hour!.branch.hanja));
    }
  });
});

describe('calculateSaju — Ipchun (입춘) year boundary', () => {
  // Ipchun 2024 falls on 2024-02-04 at 16:27:07 local clock time.
  it('keeps the previous year pillar just before Ipchun', () => {
    const result = calculateSaju({ year: 2024, month: 2, day: 4, time: '16:00' });

    expect(chart(result)).toBe('癸卯 乙丑 戊戌 庚申');
  });

  it('moves to the new year pillar just after Ipchun', () => {
    const result = calculateSaju({ year: 2024, month: 2, day: 4, time: '17:00' });

    expect(chart(result)).toBe('甲辰 丙寅 戊戌 辛酉');
  });

  it('changes only the year and month pillars, not the day pillar', () => {
    const before = calculateSaju({ year: 2024, month: 2, day: 4, time: '16:00' });
    const after = calculateSaju({ year: 2024, month: 2, day: 4, time: '17:00' });

    expect(before.pillars.day.stem.hanja).toBe(after.pillars.day.stem.hanja);
    expect(before.pillars.day.branch.hanja).toBe(after.pillars.day.branch.hanja);
    expect(before.pillars.year.stem.hanja).not.toBe(after.pillars.year.stem.hanja);
    expect(before.pillars.month.branch.hanja).not.toBe(after.pillars.month.branch.hanja);
  });
});

describe('Ten God tables', () => {
  // Guards our own stem tables against lunar-javascript's independent 十神 output.
  const KOREAN_FROM_CHINESE: Record<string, string> = {
    比肩: '비견',
    劫财: '겁재',
    食神: '식신',
    伤官: '상관',
    偏财: '편재',
    正财: '정재',
    七杀: '편관',
    正官: '정관',
    偏印: '편인',
    正印: '정인',
  };

  it('agrees with lunar-javascript for every pillar of a sample chart', () => {
    const result = calculateSaju({ year: 1990, month: 5, day: 15, time: '14:30' });
    const eightChar = Solar.fromYmdHms(1990, 5, 15, 14, 30, 0).getLunar().getEightChar();
    eightChar.setSect(1);

    expect(TEN_GOD_KOREAN[result.pillars.year.stemTenGod!]).toBe(
      KOREAN_FROM_CHINESE[eightChar.getYearShiShenGan()]
    );
    expect(TEN_GOD_KOREAN[result.pillars.month.stemTenGod!]).toBe(
      KOREAN_FROM_CHINESE[eightChar.getMonthShiShenGan()]
    );
    expect(TEN_GOD_KOREAN[result.pillars.hour!.stemTenGod!]).toBe(
      KOREAN_FROM_CHINESE[eightChar.getTimeShiShenGan()]
    );
    expect(TEN_GOD_KOREAN[result.pillars.year.branchTenGod]).toBe(
      KOREAN_FROM_CHINESE[eightChar.getYearShiShenZhi()[0]]
    );
    expect(TEN_GOD_KOREAN[result.pillars.month.branchTenGod]).toBe(
      KOREAN_FROM_CHINESE[eightChar.getMonthShiShenZhi()[0]]
    );
    expect(TEN_GOD_KOREAN[result.pillars.day.branchTenGod]).toBe(
      KOREAN_FROM_CHINESE[eightChar.getDayShiShenZhi()[0]]
    );
    expect(TEN_GOD_KOREAN[result.pillars.hour!.branchTenGod]).toBe(
      KOREAN_FROM_CHINESE[eightChar.getTimeShiShenZhi()[0]]
    );
  });

  it('reads a same-element same-polarity stem as Bigyeon and a same-element opposite as Geopjae', () => {
    const gapWoodYang = { hanja: '甲', roman: 'Gap', element: 'wood', polarity: 'yang' } as const;
    const eulWoodYin = { hanja: '乙', roman: 'Eul', element: 'wood', polarity: 'yin' } as const;

    expect(tenGodOf(gapWoodYang, gapWoodYang)).toBe('bigyeon');
    expect(tenGodOf(gapWoodYang, eulWoodYin)).toBe('geopjae');
  });

  it('sums group counts from the ten individual counts', () => {
    const result = calculateSaju({ year: 2005, month: 11, day: 3, time: '09:15' });
    const fromCounts = { output: 0, resource: 0, peer: 0, authority: 0, wealth: 0 };
    for (const [god, count] of Object.entries(result.tenGodCounts)) {
      fromCounts[TEN_GOD_GROUP[god as keyof typeof TEN_GOD_GROUP]] += count;
    }

    expect(result.tenGodGroups).toEqual(fromCounts);
  });
});

describe('calculateSaju — input validation', () => {
  it('rejects a malformed birth time', () => {
    expect(() => calculateSaju({ year: 2000, month: 1, day: 1, time: '9:15' })).toThrow(
      /Invalid birth time/
    );
    expect(() => calculateSaju({ year: 2000, month: 1, day: 1, time: '24:00' })).toThrow(
      /Invalid birth time/
    );
  });

  it('rejects a date that does not exist', () => {
    expect(() => calculateSaju({ year: 2001, month: 2, day: 29, time: null })).toThrow(
      /Invalid birth date/
    );
  });

  it('rejects a year outside the supported range', () => {
    expect(() => calculateSaju({ year: 1800, month: 1, day: 1, time: null })).toThrow(
      /outside the supported range/
    );
  });
});
