import { describe, expect, it } from 'vitest';
import { calculateSaju } from './calculate';
import { COMBINATION_BONUS, HIDDEN_STEMS } from './strength';

describe('measureStrength — hidden stems and season', () => {
  // 乙亥 戊子 戊寅 庚申, day master 戊. Worked by hand with stems 10, branches 10, month branch 30,
  // day branch 15, each branch split by its hidden stems' days out of 30:
  //   wood  乙10 + 亥甲 2.33 + 寅甲 8                    = 20.33
  //   fire  寅丙 3.5                                     =  3.5
  //   earth 戊10 + 戊10 + 亥戊 2.33 + 寅戊 3.5 + 申戊 2.33 = 28.17
  //   metal 庚10 + 申庚 5.33                             = 15.33
  //   water 亥壬 5.33 + 子 30 + 申壬 2.33                 = 37.67   (total 105)
  const result = calculateSaju({ year: 1995, month: 12, day: 13, time: '16:40' }).strength;

  it('weighs the chart into percentages', () => {
    expect(result.elementScores).toEqual({ wood: 19.4, fire: 3.3, earth: 26.8, metal: 14.6, water: 35.9 });
  });

  it('breaks the visible 2-2-2-2 tie with the winter month: Water is strongest', () => {
    expect(result.strongestElements).toEqual(['water']);
    expect(result.weakestElements).toEqual(['fire']);
  });

  it('finds the hidden Fire that the visible count misses', () => {
    expect(result.elementScores.fire).toBeGreaterThan(0);
  });

  it('reads the season and climate from the month branch', () => {
    expect(result.season).toBe('winter');
    expect(result.climate).toBe('cold');
  });

  it('reads the day master as weak, and says why', () => {
    // Earth + Fire = 31.67 of 105. 子 month is Water (실령), 寅 is Wood (실지), 1 of 5 others help.
    expect(result.dayMaster).toEqual({
      strength: 'weak',
      supportPercent: 30.2,
      deukryeong: false,
      deukji: false,
      deukse: false,
    });
  });
});

describe('measureStrength — combinations', () => {
  it('adds a bonus when all three branches of a directional combination are present', () => {
    // 庚午 辛巳 庚辰 癸未: 巳午未 completes the Fire 방합.
    const result = calculateSaju({ year: 1990, month: 5, day: 15, time: '14:30' }).strength;

    expect(result.combinations).toEqual([{ branches: '巳午未', element: 'fire', kind: 'banghap' }]);
    expect(COMBINATION_BONUS).toBeGreaterThan(0);
  });

  it('does not count a half combination', () => {
    // 申 and 子 are two thirds of the Water 삼합 — not enough.
    const result = calculateSaju({ year: 1995, month: 12, day: 13, time: '16:40' }).strength;

    expect(result.combinations).toEqual([]);
  });
});

describe('HIDDEN_STEMS', () => {
  it('splits every branch across exactly 30 days', () => {
    for (const [branch, stems] of Object.entries(HIDDEN_STEMS)) {
      expect(stems.reduce((sum, [, days]) => sum + days, 0), branch).toBe(30);
    }
  });
});

describe('measureStrength — any chart', () => {
  it('always sums to about 100 percent', () => {
    for (const time of ['00:30', '06:00', '12:00', '18:00', null]) {
      const { elementScores } = calculateSaju({ year: 2003, month: 7, day: 21, time }).strength;
      const total = Object.values(elementScores).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(100, 0);
    }
  });
});
