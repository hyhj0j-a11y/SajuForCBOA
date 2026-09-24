import type { Role } from './ai/schema';

export interface SectionHeading {
  emoji: string;
  label: string;
}

/**
 * Section headings, shared by the result page and the share card so the two never drift apart.
 * The emojis live here, not in the prompt: fixed per section, they cost the model no words and
 * never vary between readings.
 */
export function sectionHeadings(role: Role) {
  return {
    identity: { emoji: '🪞', label: 'Who you are' },
    hidden_side: { emoji: '🌙', label: 'Your hidden side' },
    english_style:
      role === 'teacher'
        ? { emoji: '🧑‍🏫', label: 'How you teach' }
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

export const ACADEMY_ROWS = [
  { key: 'people', emoji: '🤝', label: 'People' },
  { key: 'english', emoji: '💬', label: 'English' },
  { key: 'challenge', emoji: '🧩', label: 'Challenge' },
  { key: 'opportunity', emoji: '✨', label: 'Opportunity' },
] as const;
