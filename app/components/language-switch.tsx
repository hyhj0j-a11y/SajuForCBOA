import { LANG_NAME, LANGS, type Lang } from '@/lib/i18n';

/**
 * Pill strip that picks the reading's language. Each name is written in its own language, and
 * nothing here needs English to be understood — the globe is the only hint.
 */
export function LanguageSwitch({
  value,
  pending,
  disabled,
  onChange,
}: {
  value: Lang;
  pending: Lang | null;
  disabled: boolean;
  onChange: (lang: Lang) => void;
}) {
  return (
    <nav aria-label="Language">
      {/* The globe sits in the same wrapping row, so it stays next to the first pill on a phone. */}
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="text-[18px]">
          🌐
        </span>
        {LANGS.map((lang) => {
          const active = lang === value;
          return (
            <button
              key={lang}
              type="button"
              lang={lang}
              aria-pressed={active}
              disabled={disabled || pending !== null}
              onClick={() => onChange(lang)}
              className={`h-9 rounded-full border px-3.5 text-[14px] font-medium transition-colors disabled:opacity-40 ${
                active
                  ? 'border-ink bg-ink text-white disabled:opacity-100'
                  : 'border-line bg-surface text-ink'
              } ${pending === lang ? 'animate-pulse disabled:opacity-100' : ''}`}
            >
              {LANG_NAME[lang]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
