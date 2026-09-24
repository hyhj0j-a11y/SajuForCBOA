import type { Reading, Role } from './ai/schema';

export interface SectionHeading {
  emoji: string;
  label: string;
}

export const SNAPSHOT_HEADING: SectionHeading = { emoji: '🔎', label: 'You, in Saju' };

/**
 * Section headings, shared by the result page and the share card so the two never drift apart.
 * The emojis live here, not in the prompt: fixed per section, they cost the model no words and
 * never vary between readings.
 */
export function sectionHeadings(role: Role) {
  const staff = role === 'staff';
  return {
    identity: { emoji: '🪞', label: 'Who you are' },
    hidden_side: { emoji: '🌙', label: 'Your hidden side' },
    english_style: staff
      ? { emoji: '💼', label: 'Your work style' }
      : { emoji: '🗣️', label: 'Your English style' },
    cebu_mode: { emoji: '🏝️', label: 'You in Cebu' },
    challenge: { emoji: '🧗', label: 'Your challenge here' },
    academy_reading: { emoji: '📝', label: 'Your academy reading' },
    experiment: { emoji: '🧪', label: 'Your experiment' },
    question: { emoji: '💭', label: 'One question to ask yourself' },
  } satisfies Record<string, SectionHeading>;
}

export const NUDGES = {
  tryThis: { emoji: '👉', label: 'Try this' },
  smallStep: { emoji: '👣', label: 'Small step' },
} satisfies Record<string, SectionHeading>;

export interface AcademyRow extends SectionHeading {
  key: keyof Reading['academy_reading'];
}

/** `english` holds a line about work for staff — the model is told so in the prompt. */
export function academyRows(role: Role): AcademyRow[] {
  return [
    { key: 'people', emoji: '🤝', label: 'People' },
    role === 'staff'
      ? { key: 'english', emoji: '💼', label: 'Work' }
      : { key: 'english', emoji: '💬', label: 'English' },
    { key: 'challenge', emoji: '🧩', label: 'Challenge' },
    { key: 'opportunity', emoji: '✨', label: 'Opportunity' },
  ];
}
