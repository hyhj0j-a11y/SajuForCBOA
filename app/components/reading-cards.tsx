import type { Reading, Role } from '@/lib/ai/schema';
import {
  academyRows,
  NUDGES,
  sectionHeadings,
  type SectionHeading,
} from '@/lib/reading-sections';

/** Emojis are decoration next to a text label, so screen readers skip them. */
function Emoji({ children }: { children: string }) {
  return <span aria-hidden="true">{children}</span>;
}

function Card({ heading, children }: { heading: SectionHeading; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
      <header className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-seal-soft text-[20px]">
          <Emoji>{heading.emoji}</Emoji>
        </span>
        <h2 className="text-[14px] font-medium text-muted">{heading.label}</h2>
      </header>
      {children}
    </section>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.18px] text-ink">
      {children}
    </h3>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-[16px] leading-normal text-body">{children}</p>;
}

function Nudge({ nudge, children }: { nudge: SectionHeading; children: React.ReactNode }) {
  return (
    <div className="mt-1 flex gap-3 rounded-lg bg-soft p-4">
      <span className="text-[18px] leading-6">
        <Emoji>{nudge.emoji}</Emoji>
      </span>
      <p className="text-[15px] leading-6 text-ink">
        <span className="font-semibold">{nudge.label}: </span>
        {children}
      </p>
    </div>
  );
}

export function ReadingCards({ reading, role }: { reading: Reading; role: Role }) {
  const heading = sectionHeadings(role);

  return (
    <>
      <Card heading={heading.identity}>
        <Title>{reading.identity.title}</Title>
        <Body>{reading.identity.body}</Body>
      </Card>

      <Card heading={heading.hidden_side}>
        <Title>{reading.hidden_side.title}</Title>
        <Body>{reading.hidden_side.body}</Body>
      </Card>

      <Card heading={heading.english_style}>
        <Title>{reading.english_style.title}</Title>
        <Body>{reading.english_style.body}</Body>
        <Nudge nudge={NUDGES.tryThis}>{reading.english_style.action}</Nudge>
      </Card>

      <Card heading={heading.cebu_mode}>
        <Title>{reading.cebu_mode.title}</Title>
        <Body>{reading.cebu_mode.body}</Body>
      </Card>

      <Card heading={heading.challenge}>
        <Title>{reading.challenge.title}</Title>
        <Body>{reading.challenge.body}</Body>
        <Nudge nudge={NUDGES.smallStep}>{reading.challenge.action}</Nudge>
      </Card>

      <Card heading={heading.academy_reading}>
        <dl className="flex flex-col divide-y divide-line-soft">
          {academyRows(role).map((row) => (
            <div key={row.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span className="text-[18px] leading-6">
                <Emoji>{row.emoji}</Emoji>
              </span>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[14px] font-semibold text-ink">{row.label}</dt>
                <dd className="text-[15px] leading-normal text-body">
                  {reading.academy_reading[row.key]}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>

      <Card heading={heading.experiment}>
        <p className="text-[18px] font-medium leading-snug text-ink">{reading.experiment}</p>
      </Card>

      <Card heading={heading.question}>
        <p className="text-[20px] font-semibold leading-snug tracking-[-0.18px] text-ink">
          {reading.question}
        </p>
      </Card>
    </>
  );
}

function Bar({ width }: { width: string }) {
  return <span className="block h-3 rounded-full bg-strong" style={{ width }} />;
}

export function ReadingSkeleton({ note }: { note: string }) {
  return (
    <>
      <p aria-live="polite" className="px-1 text-[14px] text-muted">
        <Emoji>✍️</Emoji> {note}
      </p>
      {[0, 1, 2].map((index) => (
        <section
          key={index}
          className="flex animate-pulse flex-col gap-3 rounded-[14px] border border-line bg-surface p-5"
          style={{ animationDelay: `${index * 160}ms` }}
        >
          <div className="flex items-center gap-3">
            <span className="size-10 rounded-full bg-strong" />
            <Bar width="38%" />
          </div>
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
