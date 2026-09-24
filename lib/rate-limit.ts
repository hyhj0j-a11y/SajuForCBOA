const WINDOW_MS = 10_000;

/**
 * Deliberately loose. At the academy every phone shares one Wi-Fi, so ~100 readers arrive from a
 * single public IP — a limit tight enough to shape traffic would lock the whole room out. This
 * only exists to stop a runaway script, which sends thousands, not dozens. Real double-tap
 * protection is the disabled button plus the in-flight de-duplication in the reading cache.
 */
const DEFAULT_MAX_PER_WINDOW = 120;

const hits = new Map<string, { count: number; resetAt: number }>();

function limit(): number {
  const configured = Number(process.env.RATE_LIMIT_PER_WINDOW);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_MAX_PER_WINDOW;
}

/** Kept only as a rate-limit bucket key, never logged and never stored with the birth data. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'local';
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();

  for (const [existing, window] of hits) {
    if (window.resetAt <= now) hits.delete(existing);
  }

  const window = hits.get(key);
  if (!window || window.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  window.count += 1;
  return window.count > limit();
}

/** Test seam — the buckets are process-wide. */
export function resetRateLimit() {
  hits.clear();
}
