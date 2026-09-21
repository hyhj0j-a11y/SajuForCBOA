# Academy Saju

An English-language Saju (Korean Four Pillars) site for students and teachers at an English
language academy in Cebu. See `CLAUDE.md` for the product philosophy and the result sections.

> Use Saju as a mirror, not as a map.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. Saju math is done in code with
`lunar-javascript`; the LLM only interprets the structured result.

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Saju engine

`lib/saju/calculate.ts` exports `calculateSaju(input)`.

**Input** — the Gregorian (solar) birth date, plus `time` as `"HH:mm"` or `null` when unknown.

**Output** — the four pillars (hanja, Korean romanization, element, yin/yang), the day master,
element counts, Ten God counts, the same counts folded into five groups
(`output` / `resource` / `peer` / `authority` / `wealth`), and the strongest, weakest and missing
elements.

### Rules this engine commits to

These are conventions, not facts — schools disagree. Each one is fixed here so that the same
birth data always produces the same chart.

**Birth time is used as-is.** The `HH:mm` given is treated as the clock time at the place of
birth. No time zone conversion, no longitude correction, no historical daylight-saving
adjustment. A birth in Cebu at 09:00 and a birth in Seoul at 09:00 both enter the engine as 09:00.

**The Saju day starts at 23:00** (the Ja hour, 자시). A birth at 23:00–23:59 takes the day pillar
of the *next* calendar date; 00:00–22:59 keeps the day pillar of its own date. So 2000-01-10
23:30 produces the same day pillar as 2000-01-11.

We use this classical rule rather than the late-Ja / early-Ja split (야자시/조자시), which keeps
the day pillar on the earlier date. The hour stem is derived from the day stem, so that split
produces a chart whose hour stem does not follow from its own day stem. The pillar table is shown
to users as proof the chart is computed rather than random, so every pillar has to stay
internally consistent. In `lunar-javascript` this is `sect = 1`; the library defaults to `sect = 2`,
so the explicit `setSect(1)` is deliberate.

**Year and month pillars follow the solar terms to the minute.** The year changes at Ipchun
(입춘), not on 1 January. Ipchun 2024 falls at 16:27:07, so a 16:00 birth that day is still a
Gyemyo (癸卯) year and a 17:00 birth is a Gapjin (甲辰) year.

**Unknown birth time reads at 12:00.** The hour pillar is `null` and `timeKnown` is `false`, and
the remaining three pillars are computed from 12:00 on the birth date. Noon avoids the 23:00 day
rollover. One edge stays unavoidable: if the birth falls on a solar-term boundary day, the month
pillar depends on a time we do not have.

**Ten Gods count the main hidden stem only.** Each branch contributes its principal hidden stem
(본기); the secondary hidden stems are ignored. The day stem is the day master itself, so it
contributes no Ten God. A full chart therefore has 7 Ten Gods (3 stems + 4 branches), and a
three-pillar chart has 5.

**Ties break in the fixed order** wood → fire → earth → metal → water. With three elements tied
at the top, `strongestElement` is whichever comes first in that order.

## Tests

`lib/saju/calculate.test.ts` covers three known-time births, one unknown-time birth, the 23:30 Ja
hour boundary, and the Ipchun boundary on both sides. It also cross-checks the Ten God tables in
this repo against `lunar-javascript`'s own independent Ten God output.
