'use client';

import { useId, useState } from 'react';
import type { BirthRequest } from '@/lib/birth-input';
import { MAX_BIRTH_DATE, MAX_YEAR, MIN_BIRTH_DATE, MIN_YEAR } from '@/lib/birth-range';

const ROLES = [
  { value: 'student', emoji: '🎒', label: "I'm a student" },
  { value: 'staff', emoji: '🏫', label: 'I work here' },
] as const;

const FIELD =
  'h-14 w-full rounded-lg border border-line bg-surface px-3.5 text-base text-ink ' +
  'outline-none focus-visible:border-2 focus-visible:border-ink focus-visible:px-[13px] ' +
  'disabled:bg-soft disabled:text-muted';

interface Props {
  initial: BirthRequest;
  error: string | null;
  onSubmit: (values: BirthRequest) => void;
}

export function BirthForm({ initial, error, onSubmit }: Props) {
  const ids = useId();
  const [role, setRole] = useState(initial.role);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [birthTime, setBirthTime] = useState(initial.birthTime ?? '');
  const [timeUnknown, setTimeUnknown] = useState(initial.birthTime === null);
  // Guards the double tap: the form unmounts on submit, but not before a second tap can land.
  const [sent, setSent] = useState(false);

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (sent) return;
        setSent(true);
        onSubmit({ birthDate, birthTime: timeUnknown ? null : birthTime, role });
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium text-muted">Who is reading?</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1 shadow-float">
          {ROLES.map(({ value, emoji, label }) => (
            <label key={value} className="contents">
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="peer sr-only"
              />
              <span
                className="flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3
                  text-center text-[15px] font-medium text-muted transition-colors
                  peer-checked:bg-seal peer-checked:text-white
                  peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
              >
                <span aria-hidden="true">{emoji}</span>
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <label htmlFor={`${ids}-date`} className="text-sm font-medium text-muted">
          When were you born?
        </label>
        <input
          id={`${ids}-date`}
          type="date"
          required
          value={birthDate}
          min={MIN_BIRTH_DATE}
          max={MAX_BIRTH_DATE}
          onChange={(event) => setBirthDate(event.target.value)}
          className={FIELD}
        />
        <p className="text-[13px] text-muted">
          Use your solar (normal calendar) birthday, between {MIN_YEAR} and {MAX_YEAR}.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor={`${ids}-time`} className="text-sm font-medium text-muted">
          What time were you born?
        </label>
        <input
          id={`${ids}-time`}
          type="time"
          required={!timeUnknown}
          disabled={timeUnknown}
          value={birthTime}
          onChange={(event) => setBirthTime(event.target.value)}
          className={FIELD}
        />
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px] text-ink">
          <input
            type="checkbox"
            checked={timeUnknown}
            onChange={(event) => setTimeUnknown(event.target.checked)}
            className="size-5 rounded accent-seal"
          />
          I don&apos;t know my birth time
        </label>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-error/10 px-4 py-3 text-[15px] text-error">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={sent}
          className="h-12 w-full rounded-lg bg-seal text-base font-medium text-white
            active:bg-seal-active disabled:opacity-50
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {sent ? 'Reading…' : <>Read my Saju <span aria-hidden="true">✨</span></>}
        </button>
        <p className="text-center text-[13px] text-muted">
          <span aria-hidden="true">🔒</span> We don&apos;t save your birthday.
        </p>
      </div>
    </form>
  );
}
