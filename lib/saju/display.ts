import type { Element, SajuResult } from './calculate';

/** What the API returns: the calculated chart with the birth data stripped out. */
export type SajuChart = Omit<SajuResult, 'input'>;

export const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export const ELEMENT_LABEL: Record<Element, string> = {
  wood: 'Wood',
  fire: 'Fire',
  earth: 'Earth',
  metal: 'Metal',
  water: 'Water',
};

/** The classical five-element colours, pulled down to something that reads well on paper. */
export const ELEMENT_INK: Record<Element, string> = {
  wood: '#2f7d5b',
  fire: '#c4452f',
  earth: '#b9822b',
  metal: '#6f7c8a',
  water: '#26364f',
};

/** Shown next to the element name, never instead of it. */
export const ELEMENT_EMOJI: Record<Element, string> = {
  wood: '🌳',
  fire: '🔥',
  earth: '⛰️',
  metal: '⚙️',
  water: '💧',
};

export const ELEMENT_TINT: Record<Element, string> = {
  wood: '#e7f2ec',
  fire: '#fbeae6',
  earth: '#f8eedb',
  metal: '#edf0f3',
  water: '#e8ebf1',
};

export const PILLAR_LABEL = {
  year: 'Year',
  month: 'Month',
  day: 'Day',
  hour: 'Hour',
} as const;

/**
 * The classical image for each day stem. Fixed in code so the same chart always gets the same
 * picture; the model is handed this image and explains it, it never invents one.
 */
export const DAY_MASTER_IMAGE: Record<string, { name: string; emoji: string }> = {
  甲: { name: 'The Tall Tree', emoji: '🌲' },
  乙: { name: 'The Flower Vine', emoji: '🌸' },
  丙: { name: 'The Sun', emoji: '☀️' },
  丁: { name: 'The Candle', emoji: '🕯️' },
  戊: { name: 'The Mountain', emoji: '⛰️' },
  己: { name: 'The Garden Soil', emoji: '🌾' },
  庚: { name: 'The Iron Rock', emoji: '🪨' },
  辛: { name: 'The Jewel', emoji: '💎' },
  壬: { name: 'The Ocean', emoji: '🌊' },
  癸: { name: 'The Rain', emoji: '🌧️' },
};

export function polarityLabel(chart: SajuChart): string {
  const { polarity, element } = chart.dayMaster;
  return `${polarity === 'yang' ? 'Yang' : 'Yin'} ${ELEMENT_LABEL[element]}`;
}
