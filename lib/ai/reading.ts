import { GoogleGenAI } from '@google/genai';
import type { Pillar, SajuResult } from '../saju/calculate';
import { TEN_GOD_GROUP } from '../saju/calculate';
import { SYSTEM_PROMPT } from './prompt';
import { readingJsonSchema, readingSchema, type Reading, type Role } from './schema';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_ATTEMPTS = 2;

/** Star groups go out in English only — Korean labels here leak into the B1 English reading. */
function describePillar(pillar: Pillar) {
  return {
    stem: {
      name: pillar.stem.roman,
      element: pillar.stem.element,
      polarity: pillar.stem.polarity,
      star_group: TEN_GOD_GROUP[pillar.stemTenGod],
    },
    branch: {
      name: pillar.branch.roman,
      element: pillar.branch.element,
      polarity: pillar.branch.polarity,
      star_group: TEN_GOD_GROUP[pillar.branchTenGod],
    },
  };
}

/**
 * The birth date and time are deliberately absent — the model only ever sees the calculated
 * chart, never the raw birth data.
 */
export function buildModelInput(saju: SajuResult, role: Role) {
  const groups = saju.tenGodGroups;
  return {
    role,
    time_known: saju.timeKnown,
    four_pillars: {
      year: describePillar(saju.pillars.year),
      month: describePillar(saju.pillars.month),
      day: describePillar(saju.pillars.day),
      hour: saju.pillars.hour ? describePillar(saju.pillars.hour) : null,
    },
    day_master: {
      name: saju.dayMaster.roman,
      element: saju.dayMaster.element,
      polarity: saju.dayMaster.polarity,
    },
    element_counts: saju.elementCounts,
    strongest_element: saju.strongestElement,
    weakest_element: saju.weakestElement,
    missing_elements: saju.missingElements,
    ten_god_group_counts: {
      ...groups,
      // The day stem is the reader, not a peer. Every chart carries that one Bigyeon, so
      // sending the raw count would read every single reader as group-class oriented.
      peer: groups.peer - 1,
    },
  };
}

function formatIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ');
}

export async function generateReading(saju: SajuResult, role: Role): Promise<Reading> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Copy .env.local.example to .env.local.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const schema = readingSchema(role);
  const jsonSchema = readingJsonSchema(role);
  const payload = JSON.stringify(buildModelInput(saju, role));

  let lastProblem = 'unknown';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const contents =
      attempt === 1
        ? payload
        : `${payload}\n\nYour previous answer was rejected: ${lastProblem}\nAnswer again and fix this. Count the words in every field and stay under the limits.`;

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema,
        temperature: 0.8,
      },
    });

    const text = response.text;
    if (!text) {
      lastProblem = 'the model returned an empty response';
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      lastProblem = 'the model returned text that is not valid JSON';
      continue;
    }

    const validated = schema.safeParse(parsed);
    if (validated.success) return validated.data;
    lastProblem = formatIssues(validated.error);
  }

  throw new Error(`Gemini did not return a valid reading after ${MAX_ATTEMPTS} attempts: ${lastProblem}`);
}
