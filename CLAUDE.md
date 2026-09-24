# Project: Academy Saju

## What this is
An English-language Saju (Korean Four Pillars) website for international students and teachers at an English language academy in Cebu, Philippines.
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
- Role toggle: "I'm a student" / "I'm a teacher" (changes one prompt variable only).
- Many users don't know their birth time → support "I don't know my birth time" (three-pillar reading).
- English level of all output text: CEFR B1. Short sentences. Any Saju term gets a plain explanation in parentheses.

## Result sections (fixed order)
The calculated Four Pillars table always comes first (proof it's not random).
Then the reading, in these 8 sections (JSON keys, schema in `lib/ai/schema.ts`):
1. `identity` — who you are: invented title + body
2. `hidden_side` — a side people don't see at first: title + body
3. `english_style` — how you use English, a classroom/speaking scene: title + body + action
4. `cebu_mode` — your life at the academy in Cebu: title + body
5. `challenge` — one challenge, as a scene: title + body + a small, doable action
6. `academy_reading` — four one-liners: people, english, challenge, opportunity
7. `experiment` — a fun, dare-like micro-challenge (not homework)
8. `question` — a reflective question, not a prediction

Titles are invented 2–5 word names ("The Quiet Mountain"), never fixed category labels.

## Ten Gods → academy mapping
- Output (식신/상관): speaking, writing, self-expression
- Resource (정인/편인): listening, reading, absorbing, studying
- Peer (비견/겁재): classmates, group classes, friendly competition
- Authority (정관/편관): teachers, one-on-one classes, schedules, discipline
- Wealth (정재/편재): using English in real life outside class

## Workflow rules for Claude Code
- Work in small steps. After each step, run the code/tests and report what works.
- Ask before adding new dependencies beyond the stack above.

@AGENTS.md
