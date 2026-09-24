import type { Reading, Role } from '@/lib/ai/schema';
import { ACADEMY_ROWS, sectionLabels } from '@/lib/reading-sections';

function Card({
  number,
  eyebrow,
  children,
}: {
  number: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      <header className="flex items-baseline gap-2">
        <span className="text-[11px] font-semibold tabular-nums text-seal">{number}</span>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{eyebrow}</h2>
      </header>
      {children}
    </section>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[19px] font-semibold leading-snug text-ink">{children}</h3>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-ink/85">{children}</p>;
}

function Nudge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="mt-1 rounded-xl bg-paper px-3 py-2.5 text-[14px] leading-relaxed text-ink">
      <span className="mr-1.5 font-semibold uppercase tracking-wide text-seal">{label}</span>
      {children}
    </p>
  );
}

export function ReadingCards({ reading, role }: { reading: Reading; role: Role }) {
  const label = sectionLabels(role);

  return (
    <>
      <Card number="02" eyebrow={label.identity}>
        <Title>{reading.identity.title}</Title>
        <Body>{reading.identity.body}</Body>
      </Card>

      <Card number="03" eyebrow={label.hidden_side}>
        <Title>{reading.hidden_side.title}</Title>
        <Body>{reading.hidden_side.body}</Body>
      </Card>

      <Card number="04" eyebrow={label.english_style}>
        <Title>{reading.english_style.title}</Title>
        <Body>{reading.english_style.body}</Body>
        <Nudge label="Try this">{reading.english_style.action}</Nudge>
      </Card>

      <Card number="05" eyebrow={label.cebu_mode}>
        <Title>{reading.cebu_mode.title}</Title>
        <Body>{reading.cebu_mode.body}</Body>
      </Card>

      <Card number="06" eyebrow={label.challenge}>
        <Title>{reading.challenge.title}</Title>
        <Body>{reading.challenge.body}</Body>
        <Nudge label="Small step">{reading.challenge.action}</Nudge>
      </Card>

      <Card number="07" eyebrow={label.academy_reading}>
        <dl className="flex flex-col divide-y divide-line">
          {ACADEMY_ROWS.map(([key, rowLabel]) => (
            <div key={key} className="flex flex-col gap-0.5 py-2.5 first:pt-1 last:pb-0">
              <dt className="text-[12px] font-semibold uppercase tracking-wide text-seal">
                {rowLabel}
              </dt>
              <dd className="text-[15px] leading-relaxed text-ink/85">
                {reading.academy_reading[key]}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card number="08" eyebrow={label.experiment}>
        <p className="text-[17px] font-medium leading-snug text-ink">{reading.experiment}</p>
      </Card>

      <Card number="09" eyebrow={label.question}>
        <p className="text-[19px] font-medium leading-snug text-ink">{reading.question}</p>
      </Card>
    </>
  );
}

function Bar({ width }: { width: string }) {
  return <span className="block h-3 rounded-full bg-line" style={{ width }} />;
}

export function ReadingSkeleton({ note }: { note: string }) {
  return (
    <>
      <p aria-live="polite" className="px-1 text-[14px] text-muted">
        {note}
      </p>
      {['02', '03', '04'].map((number, index) => (
        <section
          key={number}
          className="flex animate-pulse flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
          style={{ animationDelay: `${index * 160}ms` }}
        >
          <Bar width="38%" />
          <Bar width="70%" />
          <div className="flex flex-col gap-2 pt-1">
            <Bar width="100%" />
            <Bar width="92%" />
            <Bar width="60%" />
          </div>
        </section>
      ))}
    </>
  );
}
