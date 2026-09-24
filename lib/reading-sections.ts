import type { Role } from './ai/schema';

/** Section headings, shared by the result page and the share card so the two never drift apart. */
export function sectionLabels(role: Role) {
  return {
    identity: 'Who you are',
    hidden_side: 'Your hidden side',
    english_style: role === 'teacher' ? 'How you teach' : 'Your English style',
    cebu_mode: 'You in Cebu',
    challenge: 'Your challenge here',
    academy_reading: 'Your academy reading',
    experiment: 'Your experiment',
    question: 'One question to ask yourself',
  } as const;
}

export const ACADEMY_ROWS = [
  ['people', 'People'],
  ['english', 'English'],
  ['challenge', 'Challenge'],
  ['opportunity', 'Opportunity'],
] as const;
