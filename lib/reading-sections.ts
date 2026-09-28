import { isStudentReading, type Reading } from './ai/schema';
import { UI, type Lang } from './i18n';

export interface SectionHeading {
  emoji: string;
  label: string;
}

export function snapshotHeading(lang: Lang = 'en'): SectionHeading {
  return { emoji: '🔎', label: UI[lang].snapshot };
}

export function tryThis(lang: Lang = 'en'): SectionHeading {
  return { emoji: '👉', label: UI[lang].tryThis };
}

export interface ReadingSection {
  key: string;
  heading: SectionHeading;
  title?: string;
  body: string;
  /** The one small experiment, shown as a "Try this" nudge. */
  action?: string;
  /** The closing question is shown larger, with no title. */
  isQuestion?: boolean;
}

/**
 * The reading in the order it is shown, shared by the result page and the share card so the two
 * never drift apart. The emojis live here, not in the prompt: fixed per section, they cost the
 * model no words and never vary between readings. The role is read off the reading's own shape.
 */
export function readingSections(reading: Reading, lang: Lang = 'en'): ReadingSection[] {
  const t = UI[lang];

  const middle: ReadingSection[] = isStudentReading(reading)
    ? [
        { key: 'english_style', heading: { emoji: '🗣️', label: t.englishStyle }, ...reading.english_style },
        { key: 'cebu_mode', heading: { emoji: '🏝️', label: t.cebuMode }, ...reading.cebu_mode },
      ]
    : [
        { key: 'life_pattern', heading: { emoji: '🧭', label: t.lifePattern }, ...reading.life_pattern },
        { key: 'people_style', heading: { emoji: '🤝', label: t.peopleStyle }, ...reading.people_style },
      ];

  return [
    { key: 'identity', heading: { emoji: '🪞', label: t.identity }, ...reading.identity },
    { key: 'hidden_side', heading: { emoji: '🌙', label: t.hiddenSide }, ...reading.hidden_side },
    ...middle,
    { key: 'blind_spot', heading: { emoji: '🙈', label: t.blindSpot }, ...reading.blind_spot },
    { key: 'question', heading: { emoji: '💭', label: t.question }, body: reading.question, isQuestion: true },
  ];
}
