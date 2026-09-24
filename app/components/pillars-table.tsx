import type { Pillar, PillarName } from '@/lib/saju/calculate';
import {
  ELEMENT_EMOJI,
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
          isDay ? 'border-ink ring-1 ring-ink' : 'border-line'
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
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
      <header className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-seal-soft text-[20px]">
          <span aria-hidden="true">🏛️</span>
        </span>
        <h2 className="text-[14px] font-medium text-muted">Your Four Pillars</h2>
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
        <p className="rounded-lg bg-soft px-3 py-2 text-[13px] text-muted">
          <span aria-hidden="true">🕰️</span> Time unknown — this reading uses three pillars.
        </p>
      ) : null}

      <ul className="grid grid-cols-5 gap-1.5">
        {ELEMENTS.map((element) => {
          const count = chart.elementCounts[element];
          return (
            <li
              key={element}
              className={`flex flex-col items-center gap-0.5 rounded-[14px] px-1 py-2 text-[11px] font-medium ${
                count === 0 ? 'opacity-45' : ''
              }`}
              style={{ backgroundColor: ELEMENT_TINT[element], color: ELEMENT_INK[element] }}
            >
              <span aria-hidden="true" className="text-[18px] leading-none">
                {ELEMENT_EMOJI[element]}
              </span>
              <span>
                {ELEMENT_LABEL[element]} <span className="tabular-nums">{count}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
