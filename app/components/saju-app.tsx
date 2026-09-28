'use client';

import { useRef, useState } from 'react';
import type { Reading } from '@/lib/ai/schema';
import type { BirthRequest } from '@/lib/birth-input';
import { UI, type Lang, type TranslatedLang } from '@/lib/i18n';
import type { SajuChart } from '@/lib/saju/display';
import { drawShareCard } from '@/lib/share-card';
import { BirthForm } from './birth-form';
import { LanguageSwitch } from './language-switch';
import { PillarsTable } from './pillars-table';
import { SajuSnapshot } from './saju-snapshot';
import { ReadingCards, ReadingSkeleton } from './reading-cards';

const RETRY_DELAYS_MS = [1500, 3000, 6000];

const LOADING_NOTE = 'Reading your chart… this takes a few seconds.';
const BUSY_NOTE = 'Lots of people are reading their Saju right now. Please wait a moment…';

type ReadingState =
  | { status: 'loading' }
  | { status: 'busy' }
  | { status: 'done'; reading: Reading }
  | { status: 'failed' };

const EMPTY: BirthRequest = { birthDate: '', birthTime: '', role: 'student' };

function post(path: string, body: unknown, signal: AbortSignal) {
  return fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

export function SajuApp() {
  const [values, setValues] = useState<BirthRequest>(EMPTY);
  const [onResult, setOnResult] = useState(false);
  const [chart, setChart] = useState<SajuChart | null>(null);
  const [reading, setReading] = useState<ReadingState>({ status: 'loading' });
  const [formError, setFormError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [translations, setTranslations] = useState<Partial<Record<TranslatedLang, Reading>>>({});
  const [translating, setTranslating] = useState<TranslatedLang | null>(null);
  const [translateError, setTranslateError] = useState<TranslatedLang | null>(null);
  const abort = useRef<AbortController | null>(null);

  /** The reading as the reader sees it: English, or the translation they picked. */
  const shown: Reading | null =
    reading.status !== 'done'
      ? null
      : lang === 'en'
        ? reading.reading
        : (translations[lang] ?? reading.reading);

  function backToForm(message: string | null) {
    abort.current?.abort();
    setOnResult(false);
    setFormError(message);
  }

  async function loadChart(body: BirthRequest, signal: AbortSignal) {
    try {
      const response = await post('/api/pillars', body, signal);
      const payload = await response.json();
      if (signal.aborted) return;
      if (!response.ok) {
        backToForm(payload?.error ?? 'Check your birth details.');
        return;
      }
      setChart(payload.pillars);
    } catch {
      if (!signal.aborted) backToForm('We could not reach the server. Check your connection.');
    }
  }

  /** Retries a busy server a few times. A failed reading stays empty — never a made-up one. */
  async function loadReading(body: BirthRequest, signal: AbortSignal) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await post('/api/reading', body, signal);
        if (signal.aborted) return;
        if (response.ok) {
          const payload = await response.json();
          setReading({ status: 'done', reading: payload.reading });
          return;
        }
        if (response.status === 400) {
          backToForm('Check your birth details.');
          return;
        }
      } catch {
        if (signal.aborted) return;
      }

      if (attempt >= RETRY_DELAYS_MS.length) {
        setReading({ status: 'failed' });
        return;
      }

      setReading({ status: 'busy' });
      try {
        await sleep(RETRY_DELAYS_MS[attempt], signal);
      } catch {
        return;
      }
    }
  }

  function start(next: BirthRequest) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setValues(next);
    setFormError(null);
    setShareError(null);
    setOnResult(true);
    setChart(null);
    setReading({ status: 'loading' });
    resetTranslations();

    void loadChart(next, controller.signal);
    void loadReading(next, controller.signal);
  }

  function retryReading() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setReading({ status: 'loading' });
    resetTranslations();
    void loadReading(values, controller.signal);
  }

  function resetTranslations() {
    setLang('en');
    setTranslations({});
    setTranslating(null);
    setTranslateError(null);
  }

  /**
   * Translations are made only when someone taps a language, and kept for the page's life —
   * switching back and forth never asks the model twice.
   */
  async function selectLang(next: Lang) {
    setTranslateError(null);
    if (next === 'en' || translations[next]) {
      setLang(next);
      return;
    }
    if (!chart || reading.status !== 'done') return;

    const signal = abort.current?.signal ?? new AbortController().signal;
    const body = { reading: reading.reading, lang: next, dayStem: chart.dayMaster.hanja };
    setTranslating(next);

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const response = await post('/api/translate', body, signal);
        if (signal.aborted) return;
        if (response.ok) {
          const payload = await response.json();
          setTranslations((current) => ({ ...current, [next]: payload.reading }));
          setLang(next);
          setTranslating(null);
          return;
        }
        // Only a busy server is worth waiting for; anything else will fail the same way again.
        if (response.status !== 429 && response.status !== 503) break;
      } catch {
        if (signal.aborted) return;
      }

      if (attempt < RETRY_DELAYS_MS.length) {
        try {
          await sleep(RETRY_DELAYS_MS[attempt], signal);
        } catch {
          return;
        }
      }
    }

    setTranslating(null);
    setTranslateError(next);
  }

  async function saveImage() {
    if (!chart || reading.status !== 'done') return;

    setSharing(true);
    setShareError(null);
    try {
      const canvas = drawShareCard(chart, shown ?? reading.reading, values.role, lang);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('The image could not be created.');

      const file = new File([blob], 'my-saju.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Saju' });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'my-saju.png';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // Closing the share sheet aborts the promise — that is not a failure worth showing.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setShareError('The image could not be saved. Try a screenshot instead.');
      }
    } finally {
      setSharing(false);
    }
  }

  if (!onResult) {
    return (
      <div className="flex flex-col gap-10">
        <Wordmark />
        <div className="-mt-2 flex flex-col gap-2">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.3px] text-ink">
            Who decides your future? <span aria-hidden="true">🪞</span>
          </h1>
          <p className="text-[16px] leading-normal text-body">
            Your Four Pillars, worked out from your birthday and read back in plain English — as a
            mirror for how you learn.
          </p>
        </div>
        <BirthForm initial={values} error={formError} onSubmit={start} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Wordmark compact />

      <div className="flex flex-col gap-1.5">
        <LanguageSwitch
          value={lang}
          pending={translating}
          disabled={!chart || reading.status !== 'done'}
          onChange={selectLang}
        />
        {translating || translateError || lang !== 'en' ? (
          <p
            lang={translating ?? translateError ?? lang}
            aria-live="polite"
            className={`pl-7 text-[13px] ${translateError ? 'text-error' : 'text-muted'}`}
          >
            {translating
              ? UI[translating].translating
              : translateError
                ? UI[translateError].translateFailed
                : UI[lang].translatedNote}
          </p>
        ) : null}
      </div>

      {chart ? <PillarsTable chart={chart} /> : <ChartSkeleton />}

      {/* `lang` lets the phone pick Traditional, Simplified or Japanese glyphs for the same characters. */}
      <div lang={lang} className="contents">
        {chart ? (
          <SajuSnapshot
            chart={chart}
            text={shown ? shown.saju_snapshot : null}
            pending={reading.status === 'loading' || reading.status === 'busy'}
            lang={lang}
          />
        ) : null}

        {shown ? (
          <ReadingCards reading={shown} role={values.role} lang={lang} />
        ) : reading.status === 'failed' ? (
          <section role="alert" className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
            <h2 className="text-[18px] font-semibold text-ink">
              <span aria-hidden="true">😵‍💫</span> The reading did not come through.
            </h2>
            <p className="text-[15px] leading-relaxed text-muted">
              Your chart above is real and calculated. The written reading is still missing, and we
              will not invent one.
            </p>
            <button
              type="button"
              onClick={retryReading}
              className="h-12 rounded-lg border border-ink bg-surface text-[16px] font-medium text-ink"
            >
              Retry now
            </button>
          </section>
        ) : (
          <ReadingSkeleton note={reading.status === 'busy' ? BUSY_NOTE : LOADING_NOTE} />
        )}

        <footer className="mt-4 flex flex-col items-center gap-1 border-t border-line pt-6 text-center">
          <p className="text-[15px] font-medium text-ink">
            <span aria-hidden="true">🪞</span> {UI[lang].motto}
          </p>
          <p className="text-[14px] text-muted">{UI[lang].mottoSub}</p>
        </footer>
      </div>

      {shareError ? (
        <p role="alert" className="text-center text-[14px] text-error">
          {shareError}
        </p>
      ) : null}

      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={saveImage}
          disabled={!chart || reading.status !== 'done' || sharing}
          className="h-12 rounded-lg bg-seal text-base font-medium text-white active:bg-seal-active disabled:opacity-40"
        >
          {sharing ? 'Preparing…' : <><span aria-hidden="true">📸</span> Save as image</>}
        </button>
        <button
          type="button"
          onClick={() => backToForm(null)}
          className="h-12 rounded-lg border border-ink bg-surface text-base font-medium text-ink"
        >
          <span aria-hidden="true">🔄</span> Try again
        </button>
      </div>
    </div>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <header className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-seal font-hanja text-[19px] text-white">
        四
      </span>
      <div className="flex flex-col">
        <span className="text-[17px] font-semibold leading-tight text-ink">Academy Saju</span>
        {!compact ? (
          <span className="text-[13px] leading-tight text-muted">
            Use Saju as a mirror, not as a map.
          </span>
        ) : null}
      </div>
    </header>
  );
}

function ChartSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
      <span className="block h-3 w-32 rounded-full bg-strong" />
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((column) => (
          <div key={column} className="h-[132px] rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </section>
  );
}
