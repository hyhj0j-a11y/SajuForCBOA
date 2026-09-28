import type { Element, PillarName, Sign, TenGodGroup } from './calculate';

/*
 * ELEMENT STRENGTH, THE WAY A MYEONGRI READER WEIGHS IT
 *
 * Counting the eight visible characters treats every character as equal. A reader does not:
 *
 * 1. Hidden stems (지장간, 월률분야). A branch holds up to three stems, each ruling a share of the
 *    month's 30 days. 寅 is 戊 7 days, 丙 7 days, 甲 16 days — so 寅 is mostly Wood, but also a
 *    little Earth and a little Fire. That is how a chart with no visible Fire still has some.
 * 2. Position (월령). The month branch sets the season, and the season decides which element is
 *    in charge. It weighs the most. The day branch is the day master's own seat and weighs next.
 * 3. Full combinations (삼합, 방합). Three branches that complete a combination pool their force
 *    into one element, which gets a bonus on top of what the branches already give.
 * 4. Day master strength (신강/신약). The share of the chart that supports the day master —
 *    its own element plus the element that produces it — backed by the three classic tests:
 *    득령 (the month supports it), 득지 (the day branch supports it), 득세 (most other characters do).
 *
 * Deliberately left out, because schools disagree on when they apply or they need data we do
 * not ask for: stem combinations that transform (천간합화), six harmonies (육합), clashes (충),
 * structure (격국), the useful god (용신), and true-solar-time correction by birthplace. Luck
 * cycles (대운) are out on principle — they are predictions.
 *
 * The position weights are one common convention, not the only one. They are stated here so the
 * numbers can be checked by hand.
 */

export const POSITION_WEIGHT = {
  stem: 10,
  branch: 10,
  monthBranch: 30,
  dayBranch: 15,
} as const;

/** Bonus added to the pooled element when all three branches of a combination are present. */
export const COMBINATION_BONUS = 10;

/** Support share (percent) below which the day master reads as weak, and above which strong. */
export const WEAK_BELOW = 42;
export const STRONG_ABOVE = 58;

const STEM_ELEMENT: Record<string, Element> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth',
  己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
};

/** 월률분야: each branch's hidden stems with the days (out of 30) each one rules. Main stem last. */
export const HIDDEN_STEMS: Record<string, ReadonlyArray<readonly [stem: string, days: number]>> = {
  子: [['壬', 10], ['癸', 20]],
  丑: [['癸', 9], ['辛', 3], ['己', 18]],
  寅: [['戊', 7], ['丙', 7], ['甲', 16]],
  卯: [['甲', 10], ['乙', 20]],
  辰: [['乙', 9], ['癸', 3], ['戊', 18]],
  巳: [['戊', 7], ['庚', 7], ['丙', 16]],
  午: [['丙', 10], ['己', 9], ['丁', 11]],
  未: [['丁', 9], ['乙', 3], ['己', 18]],
  申: [['戊', 7], ['壬', 7], ['庚', 16]],
  酉: [['庚', 10], ['辛', 20]],
  戌: [['辛', 9], ['丁', 3], ['戊', 18]],
  亥: [['戊', 7], ['甲', 7], ['壬', 16]],
};

/** 삼합 (three harmonies) and 방합 (directional combinations). */
const COMBINATIONS: ReadonlyArray<{ branches: string; element: Element; kind: 'samhap' | 'banghap' }> = [
  { branches: '申子辰', element: 'water', kind: 'samhap' },
  { branches: '亥卯未', element: 'wood', kind: 'samhap' },
  { branches: '寅午戌', element: 'fire', kind: 'samhap' },
  { branches: '巳酉丑', element: 'metal', kind: 'samhap' },
  { branches: '寅卯辰', element: 'wood', kind: 'banghap' },
  { branches: '巳午未', element: 'fire', kind: 'banghap' },
  { branches: '申酉戌', element: 'metal', kind: 'banghap' },
  { branches: '亥子丑', element: 'water', kind: 'banghap' },
];

const PRODUCED_BY: Record<Element, Element> = {
  wood: 'water',
  fire: 'wood',
  earth: 'fire',
  metal: 'earth',
  water: 'metal',
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

const ELEMENT_ORDER: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Climate = 'cold' | 'hot' | 'mild';
export type DayMasterStrength = 'weak' | 'balanced' | 'strong';

export interface Combination {
  branches: string;
  element: Element;
  kind: 'samhap' | 'banghap';
}

export interface StrengthResult {
  /** Percent of the whole chart, one decimal, summing to ~100. */
  elementScores: Record<Element, number>;
  /** Every element tied for the top score — usually one. */
  strongestElements: Element[];
  weakestElements: Element[];
  season: Season;
  /** 조후: a winter chart runs cold and wants warmth, a summer chart runs hot. */
  climate: Climate;
  combinations: Combination[];
  /**
   * The same weighted scores seen from the day master, as Ten God groups, in percent. The day
   * master's own stem is left out of `peer` — it is the reader, not a peer.
   */
  tenGodGroupScores: Record<TenGodGroup, number>;
  dayMaster: {
    strength: DayMasterStrength;
    /** Percent of the chart that is the day master's own element or the one that feeds it. */
    supportPercent: number;
    deukryeong: boolean;
    deukji: boolean;
    deukse: boolean;
  };
}

export interface StrengthPillar {
  name: PillarName;
  stem: Sign;
  branch: Sign;
}

const SEASON_OF: Record<string, Season> = {
  寅: 'spring', 卯: 'spring', 辰: 'spring',
  巳: 'summer', 午: 'summer', 未: 'summer',
  申: 'autumn', 酉: 'autumn', 戌: 'autumn',
  亥: 'winter', 子: 'winter', 丑: 'winter',
};

const CLIMATE_OF: Record<Season, Climate> = {
  spring: 'mild',
  summer: 'hot',
  autumn: 'mild',
  winter: 'cold',
};

function mainElement(branch: string): Element {
  const hidden = HIDDEN_STEMS[branch];
  return STEM_ELEMENT[hidden[hidden.length - 1][0]];
}

function branchWeight(name: PillarName): number {
  if (name === 'month') return POSITION_WEIGHT.monthBranch;
  if (name === 'day') return POSITION_WEIGHT.dayBranch;
  return POSITION_WEIGHT.branch;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function extremes(scores: Record<Element, number>, pick: 'max' | 'min'): Element[] {
  const values = ELEMENT_ORDER.map((e) => scores[e]);
  const target = pick === 'max' ? Math.max(...values) : Math.min(...values);
  return ELEMENT_ORDER.filter((e) => scores[e] === target);
}

export function measureStrength(pillars: StrengthPillar[], dayMaster: Sign): StrengthResult {
  const raw: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  for (const pillar of pillars) {
    raw[pillar.stem.element] += POSITION_WEIGHT.stem;

    const weight = branchWeight(pillar.name);
    for (const [stem, days] of HIDDEN_STEMS[pillar.branch.hanja]) {
      raw[STEM_ELEMENT[stem]] += (weight * days) / 30;
    }
  }

  const branches = new Set(pillars.map((p) => p.branch.hanja));
  const combinations = COMBINATIONS.filter((c) => Array.from(c.branches).every((b) => branches.has(b)));
  for (const combination of combinations) raw[combination.element] += COMBINATION_BONUS;

  const total = ELEMENT_ORDER.reduce((sum, e) => sum + raw[e], 0);
  const elementScores = Object.fromEntries(
    ELEMENT_ORDER.map((e) => [e, round1((raw[e] / total) * 100)])
  ) as Record<Element, number>;

  const self = dayMaster.element;
  const feeder = PRODUCED_BY[self];
  const supports = (element: Element) => element === self || element === feeder;

  const supportPercent = round1(((raw[self] + raw[feeder]) / total) * 100);

  const month = pillars.find((p) => p.name === 'month')!;
  const day = pillars.find((p) => p.name === 'day')!;

  // 득세: the other characters — every stem but the day master, every branch but month and day.
  const others: Element[] = [
    ...pillars.filter((p) => p.name !== 'day').map((p) => p.stem.element),
    ...pillars.filter((p) => p.name !== 'month' && p.name !== 'day').map((p) => mainElement(p.branch.hanja)),
  ];
  const deukse = others.filter(supports).length * 2 >= others.length;

  const season = SEASON_OF[month.branch.hanja];

  const relation: Record<TenGodGroup, Element> = {
    peer: self,
    resource: feeder,
    output: PRODUCES[self],
    wealth: CONTROLS[self],
    authority: ELEMENT_ORDER.find((e) => CONTROLS[e] === self)!,
  };
  const groupRaw = (group: TenGodGroup) =>
    raw[relation[group]] - (group === 'peer' ? POSITION_WEIGHT.stem : 0);
  const groupTotal = total - POSITION_WEIGHT.stem;
  const tenGodGroupScores = Object.fromEntries(
    (Object.keys(relation) as TenGodGroup[]).map((g) => [g, round1((groupRaw(g) / groupTotal) * 100)])
  ) as Record<TenGodGroup, number>;

  return {
    elementScores,
    strongestElements: extremes(elementScores, 'max'),
    weakestElements: extremes(elementScores, 'min'),
    season,
    climate: CLIMATE_OF[season],
    combinations: combinations.map((c) => ({ ...c })),
    tenGodGroupScores,
    dayMaster: {
      strength: supportPercent < WEAK_BELOW ? 'weak' : supportPercent > STRONG_ABOVE ? 'strong' : 'balanced',
      supportPercent,
      deukryeong: supports(mainElement(month.branch.hanja)),
      deukji: supports(mainElement(day.branch.hanja)),
      deukse,
    },
  };
}
