'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { ALL_COUNTRIES, COMMON_COUNTRIES, countryFlag, countryName } from '@/lib/places/countries';
import type { Place } from '@/lib/places/types';

const FIELD =
  'h-14 w-full rounded-lg border border-line bg-surface px-3.5 text-base text-ink ' +
  'outline-none focus-visible:border-2 focus-visible:border-ink focus-visible:px-[13px]';

const DEBOUNCE_MS = 250;

type Search =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; places: Place[] }
  | { status: 'failed' };

/**
 * Country, then city. The country only narrows the search; the city carries what the chart
 * needs — longitude and time zone. A neighbourhood that is not listed is fine to replace with the
 * nearest city: 100 km moves the birth time by about 4 minutes.
 */
export function BirthplaceField({
  value,
  onChange,
}: {
  value: Place | null;
  onChange: (place: Place | null) => void;
}) {
  const ids = useId();
  const [country, setCountry] = useState<string>(value?.country ?? '');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<Search>({ status: 'idle' });

  const countries = useMemo(() => {
    const common = COMMON_COUNTRIES.map((code) => ({ code, name: countryName(code) }));
    const rest = ALL_COUNTRIES.filter((code) => !COMMON_COUNTRIES.includes(code))
      .map((code) => ({ code, name: countryName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { common, rest };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearch({ status: 'searching' });
      try {
        const response = await fetch('/api/places', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: trimmed, country: country || null }),
          signal: controller.signal,
        });
        const payload = await response.json();
        setSearch(response.ok ? { status: 'done', places: payload.places ?? [] } : { status: 'failed' });
      } catch {
        if (!controller.signal.aborted) setSearch({ status: 'failed' });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, country]);

  function pick(place: Place) {
    onChange(place);
    setQuery('');
    setSearch({ status: 'idle' });
  }

  const results = query.trim() ? search : { status: 'idle' as const };
  const listId = `${ids}-places`;

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`${ids}-country`} className="text-sm font-medium text-muted">
        Where were you born? <span className="font-normal">(optional)</span>
      </label>

      <select
        id={`${ids}-country`}
        value={country}
        onChange={(event) => {
          setCountry(event.target.value);
          if (value && value.country !== event.target.value) onChange(null);
        }}
        className={FIELD}
      >
        <option value="">Any country</option>
        <optgroup label="Common here">
          {countries.common.map(({ code, name }) => (
            <option key={code} value={code}>
              {countryFlag(code)} {name}
            </option>
          ))}
        </optgroup>
        <optgroup label="All countries">
          {countries.rest.map(({ code, name }) => (
            <option key={code} value={code}>
              {countryFlag(code)} {name}
            </option>
          ))}
        </optgroup>
      </select>

      {value ? (
        <div className="flex min-h-14 items-center gap-3 rounded-lg border-2 border-ink bg-surface px-3.5 py-2">
          <span aria-hidden="true" className="text-[20px]">
            📍
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-medium text-ink">{value.name}</span>
            <span className="truncate text-[13px] text-muted">
              {[value.region, countryName(value.country)].filter(Boolean).join(', ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="h-10 shrink-0 rounded-full px-3 text-[14px] font-medium text-muted underline"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            id={`${ids}-city`}
            type="text"
            role="combobox"
            aria-label="City or town"
            aria-expanded={results.status === 'done'}
            aria-controls={listId}
            autoComplete="off"
            placeholder="City or town — any language"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Enter picks the top match instead of submitting the whole form.
              if (event.key === 'Enter' && results.status === 'done' && results.places[0]) {
                event.preventDefault();
                pick(results.places[0]);
              }
            }}
            className={FIELD}
          />
          {results.status === 'done' && results.places.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-float"
            >
              {results.places.map((place) => (
                <li key={place.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => pick(place)}
                    className="flex w-full flex-col items-start px-3.5 py-2.5 text-left active:bg-soft"
                  >
                    <span className="text-base text-ink">
                      {countryFlag(place.country)} {place.name}
                    </span>
                    <span className="text-[13px] text-muted">
                      {[place.region, countryName(place.country)].filter(Boolean).join(', ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <p aria-live="polite" className="text-[13px] text-muted">
        {results.status === 'searching'
          ? 'Searching…'
          : results.status === 'failed'
            ? 'Search is not working right now. You can skip this.'
            : results.status === 'done' && results.places.length === 0
              ? 'No match. Try the nearest bigger city — that is close enough.'
              : 'It fine-tunes your birth hour to the sun where you were born. A neighbourhood not listed? The nearest city works.'}
      </p>
    </div>
  );
}
