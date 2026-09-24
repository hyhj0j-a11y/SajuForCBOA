import { ApiError, GoogleGenAI } from '@google/genai';
import type { Pillar, SajuResult } from '../saju/calculate';
import { TEN_GOD_GROUP } from '../saju/calculate';
import { SYSTEM_PROMPT } from './prompt';
import { DAY_MASTER_IMAGE } from '../saju/display';
import { readingJsonSchema, readingSchema, type Reading, type Role } from './schema';

// Chosen for free-tier headroom, not for being the newest. The event puts ~100 readings through
// in two minutes, and the preview Flash models cap the free tier at 20 requests per DAY
// (quotaId GenerateRequestsPerDayPerProjectPerModel-FreeTier) — one presentation would exhaust
// the day five times over. Flash Lite carries the largest free allowance. Re-check the quota,
// not just the model list, before switching.
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MAX_ATTEMPTS = 2;

const REQUEST_TIMEOUT_MS = 18_000;

// Retrying 429/5xx is ours to do, so the SDK must not add a second layer underneath: its own
// defaults (5 attempts, up to 60s apart) can leave one request running for minutes, which a
// reader staring at a phone will not wait through.
const SDK_RETRY_OPTIONS = { attempts: 1 };
const API_MAX_ATTEMPTS = 3;
const API_BACKOFF_MS = [400, 1200];

/** Used when no caller sets one — scripts and tests, not the route, which passes its own. */
const DEFAULT_BUDGET_MS = 50_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 429 and 5xx are the model being busy, not the request being wrong, so they are worth resending. */
function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429 || error.status >= 500;
  return error instanceof Error && error.name === 'AbortError';
}

function describeApiFailure(error: unknown): string {
  if (error instanceof ApiError) {
    // 429 = rate limit (RESOURCE_EXHAUSTED), 503 = "high demand" (UNAVAILABLE).
    if (error.status === 429) return 'Gemini rejected the request: rate limit exceeded (429).';
    if (error.status === 503) return 'Gemini is overloaded right now (503).';
    return `Gemini returned HTTP ${error.status}.`;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return `Gemini did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.`;
  }
  return error instanceof Error ? error.message : String(error);
}

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
      image: DAY_MASTER_IMAGE[saju.dayMaster.hanja].name,
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

/**
 * One answer from the model, resending on 429/5xx with exponential backoff. A retry only starts
 * when the deadline still leaves room for a whole attempt, so this can never overrun the route.
 */
async function askModel(
  ask: () => Promise<{ text?: string }>,
  deadline: number
): Promise<string | undefined> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= API_MAX_ATTEMPTS; attempt += 1) {
    try {
      return (await ask()).text;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === API_MAX_ATTEMPTS) break;

      const backoff = API_BACKOFF_MS[attempt - 1];
      if (Date.now() + backoff + REQUEST_TIMEOUT_MS > deadline) break;
      await sleep(backoff);
    }
  }

  throw new Error(describeApiFailure(lastError));
}

export async function generateReading(
  saju: SajuResult,
  role: Role,
  deadline: number = Date.now() + DEFAULT_BUDGET_MS
): Promise<Reading> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Copy .env.local.example to .env.local.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const payload = JSON.stringify(buildModelInput(saju, role));

  let lastProblem = 'unknown';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // A reworded retry is worth nothing if the route hangs up before the answer lands.
    if (attempt > 1 && Date.now() + REQUEST_TIMEOUT_MS > deadline) break;

    const contents =
      attempt === 1
        ? payload
        : `${payload}\n\nYour previous answer was rejected: ${lastProblem}\nAnswer again and fix this. Count the words in every field and stay under the limits.`;

    const text = await askModel(
      () =>
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseJsonSchema: readingJsonSchema,
            temperature: 0.8,
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

    const validated = readingSchema.safeParse(parsed);
    if (validated.success) return validated.data;
    lastProblem = formatIssues(validated.error);
  }

  throw new Error(`Gemini did not return a valid reading after ${MAX_ATTEMPTS} attempts: ${lastProblem}`);
}
