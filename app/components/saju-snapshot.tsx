import {
  DAY_MASTER_IMAGE,
  ELEMENT_EMOJI,
  ELEMENT_LABEL,
  polarityLabel,
  type SajuChart,
} from '@/lib/saju/display';
import { SNAPSHOT_HEADING } from '@/lib/reading-sections';

/**
 * "You, in Saju": the calculated picture first, then the model's plain-English explanation.
 * The top half comes from code and shows as soon as the chart arrives; `text` fills in when the
 * reading does. While `pending`, a skeleton line holds its place; after a failure, nothing does.
 */
export function SajuSnapshot({
  chart,
  text,
  pending,
}: {
  chart: SajuChart;
  text: string | null;
  pending: boolean;
}) {
  const image = DAY_MASTER_IMAGE[chart.dayMaster.hanja];
  const missing = chart.missingElements;
  const strongest = chart.strongestElement;

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
      <header className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-seal-soft text-[20px]">
          <span aria-hidden="true">{SNAPSHOT_HEADING.emoji}</span>
        </span>
        <h2 className="text-[14px] font-medium text-muted">{SNAPSHOT_HEADING.label}</h2>
      </header>

      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="text-[44px] leading-none">
          {image.emoji}
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-[22px] font-semibold leading-tight tracking-[-0.3px] text-ink">
            {image.name}
          </p>
          <p className="text-[14px] text-muted">
            Day master <span className="font-hanja">{chart.dayMaster.hanja}</span>{' '}
            {chart.dayMaster.roman} · {polarityLabel(chart)}
          </p>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2 text-[13px] font-medium text-ink">
        <li className="rounded-full bg-soft px-3 py-1.5">
          Strongest: <span aria-hidden="true">{ELEMENT_EMOJI[strongest]}</span>{' '}
          {ELEMENT_LABEL[strongest]} {chart.elementCounts[strongest]}
        </li>
        {missing.length > 0 ? (
          <li className="rounded-full bg-soft px-3 py-1.5">
            Missing:{' '}
            {missing.map((element) => (
              <span key={element} className="mr-1 last:mr-0">
                <span aria-hidden="true">{ELEMENT_EMOJI[element]}</span> {ELEMENT_LABEL[element]}
              </span>
            ))}
          </li>
        ) : (
          <li className="rounded-full bg-soft px-3 py-1.5">
            Weakest: <span aria-hidden="true">{ELEMENT_EMOJI[chart.weakestElement]}</span>{' '}
            {ELEMENT_LABEL[chart.weakestElement]} {chart.elementCounts[chart.weakestElement]}
          </li>
        )}
      </ul>

      {text ? (
        <p className="text-[16px] leading-normal text-body">{text}</p>
      ) : pending ? (
        <div aria-hidden="true" className="flex animate-pulse flex-col gap-2">
          <span className="block h-3 w-full rounded-full bg-strong" />
          <span className="block h-3 w-4/5 rounded-full bg-strong" />
        </div>
      ) : null}
    </section>
  );
}
