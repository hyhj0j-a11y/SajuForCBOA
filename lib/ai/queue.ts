const DEFAULT_MAX_CONCURRENT = 10;

/** Longer than this and the reader is better off being told we are busy, so they can retry. */
const MAX_QUEUE_WAIT_MS = 12_000;

export class ServerBusyError extends Error {
  constructor(message = 'Too many readings are being written right now.') {
    super(message);
    this.name = 'ServerBusyError';
  }
}

interface Waiter {
  grant: () => void;
  cancel: () => void;
}

let active = 0;
const waiting: Waiter[] = [];

/** Read per call, not at import, so a deploy can change it without a rebuild. */
export function maxConcurrent(): number {
  const configured = Number(process.env.MAX_CONCURRENT);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_MAX_CONCURRENT;
}

function acquire(deadline: number): Promise<void> {
  if (active < maxConcurrent()) {
    active += 1;
    return Promise.resolve();
  }

  const wait = Math.min(MAX_QUEUE_WAIT_MS, deadline - Date.now());
  if (wait <= 0) return Promise.reject(new ServerBusyError());

  return new Promise<void>((resolve, reject) => {
    const waiter: Waiter = {
      grant: () => {
        clearTimeout(timer);
        resolve();
      },
      cancel: () => reject(new ServerBusyError()),
    };

    const timer = setTimeout(() => {
      const index = waiting.indexOf(waiter);
      if (index >= 0) waiting.splice(index, 1);
      waiter.cancel();
    }, wait);

    waiting.push(waiter);
  });
}

function release() {
  // Hand the slot straight to the next waiter — `active` stays as it is.
  const next = waiting.shift();
  if (next) {
    next.grant();
    return;
  }
  active -= 1;
}

/**
 * Caps how many model calls are in flight at once. ~100 readers arriving inside two minutes
 * would otherwise open ~100 Gemini calls in the same second and collect rate limits for it.
 */
export async function withModelSlot<T>(run: () => Promise<T>, deadline: number): Promise<T> {
  await acquire(deadline);
  try {
    return await run();
  } finally {
    release();
  }
}

/** Test seam — the counters are process-wide. */
export function resetModelQueue() {
  while (waiting.length > 0) waiting.pop();
  active = 0;
}
