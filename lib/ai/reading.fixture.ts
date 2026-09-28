/** A student reading that passes the schema, shared by the tests. */
export const SAMPLE_READING = {
  saju_snapshot: 'In Saju, you are The Mountain: steady and calm. Deep winter Water runs through your chart.',
  identity: { title: 'The Quiet Mountain', body: 'You watch the room for a while before you pick your seat.' },
  hidden_side: { title: 'The Secret Talker', body: 'You may look quiet, but with two friends you never stop talking.' },
  english_style: {
    title: 'The Sentence Editor',
    body: 'You build the whole sentence in your head, then edit it three times before you speak.',
  },
  cebu_mode: { title: 'The Weekend Explorer', body: 'You say yes to every island trip, then plan it all.' },
  blind_spot: {
    title: 'The Waiting Hand',
    body: 'You know the answer, but by the time it feels perfect, someone else has said it.',
    action: 'Speak once in class before your sentence feels perfect.',
  },
  question: 'What would I say if nobody was grading it?',
};

/** A normal-mode reading that passes the schema. */
export const SAMPLE_NORMAL_READING = {
  saju_snapshot: SAMPLE_READING.saju_snapshot,
  identity: SAMPLE_READING.identity,
  hidden_side: SAMPLE_READING.hidden_side,
  life_pattern: { title: 'The Slow Builder', body: 'You may choose a steady step over a quick jump.' },
  people_style: { title: 'The Late Opener', body: 'You take time to trust, then stay loyal for years.' },
  blind_spot: {
    title: 'The Silent Maybe',
    body: 'You may say "maybe" when you already mean "no".',
    action: 'Say one clear no this week, kindly.',
  },
  question: 'Which choice am I waiting to feel perfect about?',
};

const PLAN = [
  'identity: watches first (strong resource)',
  'hidden_side: talkative with friends (peer)',
  'english_style: edits sentences (authority)',
  'cebu_mode: adventurous weekends (output)',
  'blind_spot: waits for perfect (weak day master)',
];

/** What Gemini returns: the reading plus the private plan, which the server strips. */
export const SAMPLE_MODEL_ANSWER = { plan: PLAN, ...SAMPLE_READING };
export const SAMPLE_NORMAL_MODEL_ANSWER = { plan: PLAN, ...SAMPLE_NORMAL_READING };
