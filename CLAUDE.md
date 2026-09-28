# Project: Academy Saju

## What this is
An English-language Saju (Korean Four Pillars) website for international students, teachers and staff at an English language academy in Cebu, Philippines.
It is shown at the end of an English presentation titled "Who decides your future?" via a QR code. Up to 100 people will open it at the same moment.

## Core philosophy (must be reflected in every feature and text)
- "Use Saju as a mirror, not as a map."
- Results focus on SELF-UNDERSTANDING, not prediction.
- Never predict dates, lucky/unlucky periods, exam results, health, money, marriage, or relationships.
- Every weakness or challenge must end with a concrete, doable action.
- Tone: warm, honest, playful. Not flattering, not scary.
- Footer on the result page: "Use Saju as a mirror, not as a map."

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Saju calculation: `lunar-javascript` (deterministic code, NEVER calculated by the LLM)
- LLM: Google Gemini API via the official `@google/genai` SDK, server-side only
- Deploy: Vercel

## Architecture rules
- Saju math is done in code. The LLM only interprets structured results.
- The Gemini API key lives in `.env.local` as GEMINI_API_KEY and is used only in server code. Never expose it to the client.
- The Gemini model name is read from env GEMINI_MODEL (default: a current Flash model).
- Do NOT store birth data anywhere (no DB, no logs of birth info). An in-memory cache keyed by a hash of the input is OK.
- LLM output must be strict JSON matching a fixed schema, validated with zod.

## Users
- Mode toggle: "Student" / "Normal" (`student` / `normal`). Student = life at the English academy
  in Cebu. Normal = a general Saju reading (personality, hidden side, life pattern, people) with no
  English, academy or Cebu — for staff and anyone else.
- Many users don't know their birth time → support "I don't know my birth time" (three-pillar reading).
- Birthplace (optional): country + city search over a bundled GeoNames list (`data/cities.json`,
  built by `scripts/build-cities.ts`). Only longitude and time zone are used, to correct the clock
  time to local solar time (`lib/saju/solar-time.ts`). The place name never leaves the browser.
- English level of all output text: CEFR B1. Short sentences. Any Saju term gets a plain explanation in parentheses.

## Result sections (fixed order)
The calculated Four Pillars table always comes first (proof it's not random).
Then "You, in Saju": the day master's classical image (fixed in code, `DAY_MASTER_IMAGE`) and the
weighted strongest/weakest element and day master strength, followed by the model's plain
explanation (`saju_snapshot`) — the one place the reading names Saju terms on purpose.
Then the reading, 6 short sections (JSON keys, schemas in `lib/ai/schema.ts`):
1. `identity` — who you are: invented title + body
2. `hidden_side` — what people don't notice at first, as a contrast: title + body
3. student: `english_style` — one recognisable speaking/learning scene · normal: `life_pattern` —
   stability and change, risk, pace
4. student: `cebu_mode` — living abroad in Cebu · normal: `people_style` — trust, closeness, groups
5. `blind_spot` — one pattern that gets in the way, as a scene + ONE small fun experiment (`action`)
6. `question` — a reflective question, not a prediction

The model also writes a private `plan` first (5 notes, one DIFFERENT trait per section) — it
stops the reading repeating one trait five ways. The server strips it; readers never see it.

Titles are short, playful names made for the person ("The Quiet Mountain"), never fixed labels.

## Ten Gods → academy mapping
- Output (식신/상관): speaking, writing, self-expression
- Resource (정인/편인): listening, reading, absorbing, studying
- Peer (비견/겁재): classmates, group classes, friendly competition
- Authority (정관/편관): teachers, one-on-one classes, schedules, discipline
- Wealth (정재/편재): using English in real life outside class

Normal mode reads the same groups as everyday life: Output = expressing and making things,
Resource = taking in and thinking through, Peer = independence and friends, Authority = rules and
responsibility, Wealth = practical results (never money).

## Workflow rules for Claude Code
- Work in small steps. After each step, run the code/tests and report what works.
- Ask before adding new dependencies beyond the stack above.

@AGENTS.md
