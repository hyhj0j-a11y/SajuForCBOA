/**
 * Sends N distinct readings at the server, spread over a window, and reports what came back.
 *
 *   npm run load-test            # 100 requests over 30s
 *   npm run load-test -- 20      # 20 requests over 30s
 *   npm run load-test -- 20 10   # 20 requests over 10s
 *
 * Every request is a real Gemini call unless the server serves it from cache, so the free tier
 * will rate-limit a run of 100. That is the point: the output shows how the queue, the backoff
 * and the 503 path behave when the model pushes back.
 */
const COUNT = Number(process.argv[2]) || 100;
const WINDOW_MS = (Number(process.argv[3]) || 30) * 1000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = 90_000;

const pad = (value: number) => String(value).padStart(2, '0');

/** Distinct birth details, so nothing is answered from the reading cache. */
function sample(index: number) {
  return {
    birthDate: `${1960 + (index % 50)}-${pad(1 + (index % 12))}-${pad(1 + (index % 28))}`,
    birthTime: index % 5 === 0 ? null : `${pad(index % 24)}:${pad((index * 7) % 60)}`,
    role: index % 3 === 0 ? 'teacher' : 'student',
  };
}

interface Outcome {
  ok: boolean;
  ms: number;
  reason?: string;
}

async function fire(index: number): Promise<Outcome> {
  const started = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/reading`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sample(index)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const ms = Date.now() - started;

    if (response.ok) return { ok: true, ms };

    const body = await response.json().catch(() => null);
    return { ok: false, ms, reason: `${response.status} ${body?.error ?? response.statusText}` };
  } catch (error) {
    const ms = Date.now() - started;
    const name = error instanceof Error ? error.name : 'Error';
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, ms, reason: name === 'TimeoutError' ? 'client timeout' : message };
  }
}

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function percentile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

async function main() {
  const keys = new Set(Array.from({ length: COUNT }, (_, i) => JSON.stringify(sample(i))));
  const gap = COUNT > 1 ? WINDOW_MS / COUNT : 0;

  console.log(`Target:   ${BASE_URL}/api/reading`);
  console.log(`Sending:  ${COUNT} requests over ${seconds(WINDOW_MS)} (one every ${Math.round(gap)}ms)`);
  console.log(`Distinct: ${keys.size} of ${COUNT} inputs\n`);

  const started = Date.now();
  const outcomes = await Promise.all(
    Array.from({ length: COUNT }, async (_, index) => {
      await new Promise((resolve) => setTimeout(resolve, Math.round(index * gap)));
      return fire(index);
    })
  );
  const wall = Date.now() - started;

  const succeeded = outcomes.filter((outcome) => outcome.ok);
  const times = outcomes.map((outcome) => outcome.ms).sort((a, b) => a - b);
  const successTimes = succeeded.map((outcome) => outcome.ms).sort((a, b) => a - b);
  const average = times.reduce((sum, ms) => sum + ms, 0) / (times.length || 1);

  console.log(`Wall clock:   ${seconds(wall)}`);
  console.log(
    `Success:      ${succeeded.length}/${COUNT}  (${((succeeded.length / COUNT) * 100).toFixed(1)}%)`
  );
  console.log(`Response:     avg ${seconds(average)}   p50 ${seconds(percentile(times, 0.5))}   p95 ${seconds(percentile(times, 0.95))}   max ${seconds(times.at(-1) ?? 0)}`);
  if (succeeded.length > 0) {
    console.log(
      `Successes:    avg ${seconds(successTimes.reduce((sum, ms) => sum + ms, 0) / successTimes.length)}   max ${seconds(successTimes.at(-1) ?? 0)}`
    );
  }

  const failures = new Map<string, number>();
  for (const outcome of outcomes) {
    if (outcome.ok) continue;
    const reason = outcome.reason ?? 'unknown';
    failures.set(reason, (failures.get(reason) ?? 0) + 1);
  }

  if (failures.size === 0) {
    console.log('\nNo failures.');
    return;
  }

  console.log('\nFailures');
  for (const [reason, count] of [...failures].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)} × ${reason}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
