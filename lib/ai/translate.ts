import { DAY_MASTER_IMAGE } from '../saju/display';
import { DAY_MASTER_IMAGE_NAME, LANG_FOR_MODEL, type TranslatedLang } from '../i18n';
import {
  askModel,
  DEFAULT_BUDGET_MS,
  formatIssues,
  geminiClient,
  REQUEST_TIMEOUT_MS,
  SDK_RETRY_OPTIONS,
} from './reading';
import { translatedReadingJsonSchema, translatedReadingSchema, type Reading } from './schema';

const MAX_ATTEMPTS = 2;

/** Korean readers know Saju by its native words; Chinese and Japanese use the characters. */
const SAJU_TERMS: Record<TranslatedLang, string> = {
  ko: 'e.g. Saju = 사주, day master = 일간, Wood/Fire/Earth/Metal/Water = 나무/불/흙/쇠/물',
  'zh-TW': 'e.g. day master = 日主, Wood/Fire/Earth/Metal/Water = 木/火/土/金/水',
  'zh-CN': 'e.g. day master = 日主, Wood/Fire/Earth/Metal/Water = 木/火/土/金/水',
  ja: 'e.g. day master = 日主, Wood/Fire/Earth/Metal/Water = 木/火/土/金/水',
};

export function translationPrompt(lang: TranslatedLang, dayStem: string): string {
  const english = DAY_MASTER_IMAGE[dayStem].name;
  const local = DAY_MASTER_IMAGE_NAME[lang][dayStem];

  return `You translate a short, personal Saju (Korean Four Pillars) reading from English into ${LANG_FOR_MODEL[lang]}.
The readers are students and staff at an English language academy in Cebu, Philippines, who read ${LANG_FOR_MODEL[lang]} more easily than English.

RULES
- Translate every field. Keep the JSON keys and structure exactly as given.
- Keep the meaning, the warmth and the light, playful tone. Write the way a friend talks, not like a textbook.
- Translate meaning, not word by word. Short, natural sentences.
- Titles are invented names ("The Quiet Mountain"): make them sound like a natural, catchy name in the target language.
- The day master image "${english}" must be written as "${local}".
- Saju terms: use the usual term in the target language (${SAJU_TERMS[lang]}). Keep the short plain explanation that follows them, but never write the same word twice, like "火（火）".
- Place names: Cebu and local words like "jeepney" in their common local form, or kept in English if there is none.
- Do not add anything: no predictions, no advice, no emojis, no notes about the translation.

Return JSON only, matching the schema.`;
}

/** The English reading is the source of truth; this only rewrites it, it never re-reads the chart. */
export async function translateReading(
  reading: Reading,
  lang: TranslatedLang,
  dayStem: string,
  deadline: number = Date.now() + DEFAULT_BUDGET_MS
): Promise<Reading> {
  const { ai, model } = geminiClient();
  const payload = JSON.stringify(reading);
  const systemInstruction = translationPrompt(lang, dayStem);

  let lastProblem = 'unknown';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1 && Date.now() + REQUEST_TIMEOUT_MS > deadline) break;

    const contents =
      attempt === 1
        ? payload
        : `${payload}\n\nYour previous answer was rejected: ${lastProblem}\nTranslate again and fix this.`;

    const text = await askModel(
      () =>
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: translatedReadingJsonSchema,
            temperature: 0.3,
            httpOptions: { timeout: REQUEST_TIMEOUT_MS, retryOptions: SDK_RETRY_OPTIONS },
          },
        }),
      deadline
    );

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

    const validated = translatedReadingSchema.safeParse(parsed);
    if (validated.success) return validated.data;
    lastProblem = formatIssues(validated.error);
  }

  throw new Error(`Gemini did not return a valid translation after ${MAX_ATTEMPTS} attempts: ${lastProblem}`);
}
