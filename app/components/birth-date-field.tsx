'use client';

import { useId, useState } from 'react';
import { MAX_YEAR, MIN_YEAR } from '@/lib/birth-range';

const FIELD =
  'h-14 w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-base text-ink ' +
  'outline-none focus-visible:border-2 focus-visible:border-ink focus-visible:px-[11px]';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Newest first: most readers are young, so their year is near the top of the list. */
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => MAX_YEAR - index);

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year || 2000, month || 1, 0)).getUTCDate();
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Year, month and day as three dropdowns instead of `<input type="date">`. Android's date picker
 * opens on today's month, so reaching 1990 meant paging back one month at a time; a dropdown
 * opens a scrolling list on every phone. `onChange` gets "YYYY-MM-DD", or "" until all three are set.
 */
export function BirthDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ids = useId();
  const [initialYear, initialMonth, initialDay] = value ? value.split('-').map(Number) : [0, 0, 0];
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);

  function update(nextYear: number, nextMonth: number, nextDay: number) {
    // 31 March → February keeps the day only if it still exists.
    const fixedDay = nextDay > daysIn(nextYear, nextMonth) ? 0 : nextDay;
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(fixedDay);
    onChange(
      nextYear && nextMonth && fixedDay ? `${nextYear}-${pad(nextMonth)}-${pad(fixedDay)}` : ''
    );
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium text-muted">When were you born?</legend>
      <div className="grid grid-cols-[4fr_4fr_3fr] gap-2">
        <select
          id={`${ids}-year`}
          aria-label="Year"
          required
          value={year || ''}
          onChange={(event) => update(Number(event.target.value), month, day)}
          className={FIELD}
        >
          <option value="" disabled>
            Year
          </option>
          {YEARS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          aria-label="Month"
          required
          value={month || ''}
          onChange={(event) => update(year, Number(event.target.value), day)}
          className={FIELD}
        >
          <option value="" disabled>
            Month
          </option>
          {MONTHS.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Day"
          required
          value={day || ''}
          onChange={(event) => update(year, month, Number(event.target.value))}
          className={FIELD}
        >
          <option value="" disabled>
            Day
          </option>
          {Array.from({ length: daysIn(year, month) }, (_, index) => index + 1).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[13px] text-muted">
        Use your solar (normal calendar) birthday, between {MIN_YEAR} and {MAX_YEAR}.
      </p>
    </fieldset>
  );
}
