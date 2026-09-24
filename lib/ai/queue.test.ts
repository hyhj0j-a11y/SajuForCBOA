import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { maxConcurrent, resetModelQueue, ServerBusyError, withModelSlot } from './queue';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

const far = () => Date.now() + 10_000;

beforeEach(() => {
  resetModelQueue();
  vi.stubEnv('MAX_CONCURRENT', '2');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('maxConcurrent', () => {
  it('reads MAX_CONCURRENT', () => {
    expect(maxConcurrent()).toBe(2);
  });

  it.each([['', 10], ['0', 10], ['-4', 10], ['not a number', 10]])(
    'falls back to 10 for %o',
    (value, expected) => {
      vi.stubEnv('MAX_CONCURRENT', value);
      expect(maxConcurrent()).toBe(expected);
    }
  );
});

describe('withModelSlot', () => {
  it('runs straight away while slots are free', async () => {
    await expect(withModelSlot(async () => 'done', far())).resolves.toBe('done');
  });

  it('holds work past the limit until a slot frees up', async () => {
    const first = deferred();
    const second = deferred();
    const started: string[] = [];

    const a = withModelSlot(async () => {
      started.push('a');
      await first.promise;
    }, far());
    const b = withModelSlot(async () => {
      started.push('b');
      await second.promise;
    }, far());
    const c = withModelSlot(async () => {
      started.push('c');
    }, far());

    await Promise.resolve();
    expect(started).toEqual(['a', 'b']);

    first.resolve();
    await a;
    await c;
    expect(started).toEqual(['a', 'b', 'c']);

    second.resolve();
    await b;
  });

  it('gives up with ServerBusyError when the deadline has already passed', async () => {
    const held = deferred();
    const a = withModelSlot(() => held.promise, far());
    const b = withModelSlot(() => held.promise, far());

    await expect(withModelSlot(async () => 'never', Date.now() - 1)).rejects.toBeInstanceOf(
      ServerBusyError
    );

    held.resolve();
    await Promise.all([a, b]);
  });

  it('frees the slot even when the work throws', async () => {
    await expect(
      withModelSlot(async () => {
        throw new Error('model exploded');
      }, far())
    ).rejects.toThrow('model exploded');

    await expect(withModelSlot(async () => 'free again', far())).resolves.toBe('free again');
  });
});
