import type { Pillar, PillarName } from '@/lib/saju/calculate';
import {
  ELEMENT_INK,
  ELEMENT_LABEL,
  ELEMENT_TINT,
  ELEMENTS,
  PILLAR_LABEL,
  polarityLabel,
  type SajuChart,
} from '@/lib/saju/display';

const ORDER: PillarName[] = ['year', 'month', 'day', 'hour'];

function Sign({ hanja, roman, element }: { hanja: string; roman: string; element: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2">
      <span
        className="font-hanja text-[28px] leading-none"
        style={{ color: ELEMENT_INK[element as keyof typeof ELEMENT_INK] }}
      >
        {hanja}
      </span>
      <span className="text-[11px] leading-tight text-muted">{roman}</span>
    </div>
  );
}

function Column({ name, pillar, isDay }: { name: PillarName; pillar: Pillar | null; isDay: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`text-[11px] font-medium uppercase tracking-wider ${
          isDay ? 'text-ink' : 'text-muted'
        }`}
      >
        {PILLAR_LABEL[name]}
      </span>
      <div
        className={`w-full rounded-xl border bg-surface ${
          isDay ? 'border-ink' : 'border-line'
        }`}
      >
        {pillar ? (
          <>
            <Sign {...pillar.stem} />
            <div className="mx-3 border-t border-line" />
            <Sign {...pillar.branch} />
          </>
        ) : (
          <div className="flex h-[108px] items-center justify-center text-xl text-muted/50">—</div>
        )}
      </div>
    </div>
  );
}

export function PillarsTable({ chart }: { chart: SajuChart }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-4">
      <header className="flex items-baseline gap-2">
        <span className="text-[11px] font-semibold tabular-nums text-seal">01</span>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
          Your Four Pillars
        </h2>
      </header>

      <div className="grid grid-cols-4 gap-2">
        {ORDER.map((name) => (
          <Column key={name} name={name} pillar={chart.pillars[name]} isDay={name === 'day'} />
        ))}
      </div>

      <p className="text-[13px] text-ink">
        <span className="text-muted">Day master </span>
        <span className="font-hanja" style={{ color: ELEMENT_INK[chart.dayMaster.element] }}>
          {chart.dayMaster.hanja}
        </span>{' '}
        {chart.dayMaster.roman} · {polarityLabel(chart)}
        <span className="text-muted"> — this is the you the reading talks to.</span>
      </p>

      {!chart.timeKnown ? (
        <p className="rounded-lg bg-surface px-3 py-2 text-[13px] text-muted">
          Time unknown — this reading uses three pillars.
        </p>
      ) : null}

      <ul className="grid grid-cols-5 gap-1">
        {ELEMENTS.map((element) => {
          const count = chart.elementCounts[element];
          return (
            <li
              key={element}
              className="flex items-center justify-center gap-1 rounded-full px-1 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: ELEMENT_TINT[element],
                color: count === 0 ? '#9aa0ad' : ELEMENT_INK[element],
              }}
            >
              {ELEMENT_LABEL[element]}
              <span className="tabular-nums opacity-70">{count}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
