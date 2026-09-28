import type { Reading, Role } from './ai/schema';
import { UI, type Lang } from './i18n';

export interface SectionHeading {
  emoji: string;
  label: string;
}

export function snapshotHeading(lang: Lang = 'en'): SectionHeading {
  return { emoji: '🔎', label: UI[lang].snapshot };
}

/**
 * Section headings, shared by the result page and the share card so the two never drift apart.
 * The emojis live here, not in the prompt: fixed per section, they cost the model no words and
 * never vary between readings.
 */
export function sectionHeadings(role: Role, lang: Lang = 'en') {
  const t = UI[lang];
  const staff = role === 'staff';
  return {
    identity: { emoji: '🪞', label: t.identity },
    hidden_side: { emoji: '🌙', label: t.hiddenSide },
    english_style: staff
      ? { emoji: '💼', label: t.workStyle }
      : { emoji: '🗣️', label: t.englishStyle },
    cebu_mode: { emoji: '🏝️', label: t.cebuMode },
    challenge: { emoji: '🧗', label: t.challenge },
    academy_reading: { emoji: '📝', label: t.academyReading },
    experiment: { emoji: '🧪', label: t.experiment },
    question: { emoji: '💭', label: t.question },
  } satisfies Record<string, SectionHeading>;
}

export function nudges(lang: Lang = 'en') {
  return {
    tryThis: { emoji: '👉', label: UI[lang].tryThis },
    smallStep: { emoji: '👣', label: UI[lang].smallStep },
  } satisfies Record<string, SectionHeading>;
}

export interface AcademyRow extends SectionHeading {
  key: keyof Reading['academy_reading'];
}

/** `english` holds a line about work for staff — the model is told so in the prompt. */
export function academyRows(role: Role, lang: Lang = 'en'): AcademyRow[] {
  const t = UI[lang];
  return [
    { key: 'people', emoji: '🤝', label: t.rowPeople },
    role === 'staff'
      ? { key: 'english', emoji: '💼', label: t.rowWork }
      : { key: 'english', emoji: '💬', label: t.rowEnglish },
    { key: 'challenge', emoji: '🧩', label: t.rowChallenge },
    { key: 'opportunity', emoji: '✨', label: t.rowOpportunity },
  ];
}
