# Academy Saju

An English-language Saju (Korean Four Pillars) site for students and teachers at an English
language academy in Cebu. See `CLAUDE.md` for the product philosophy and the result sections.

> Use Saju as a mirror, not as a map.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. Saju math is done in code with
`lunar-javascript`; the LLM only interprets the structured result.

## Run it locally

Needs Node.js 20 or newer.

```bash
npm install
cp .env.local.example .env.local   # then paste your Gemini key
npm run dev                        # http://localhost:3000
```

To try it on a phone, open `http://<your-PC-LAN-IP>:3000` on the same Wi-Fi.

## Environment variables

| Name | Required | Default | What it does |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | yes | — | Google AI Studio key. Read only in server code, never sent to the browser. |
| `GEMINI_MODEL` | no | `gemini-3.5-flash-lite` | Model for the reading. Check its free-tier **daily** quota before a live event. |
| `MAX_CONCURRENT` | no | `10` | Gemini calls in flight at once, per server instance. Extra requests queue for up to 12 s, then get a 503 "busy, try again". |
| `RATE_LIMIT_PER_WINDOW` | no | `120` | Requests per IP per 10 s. Loose on purpose: the whole room shares one Wi-Fi IP. |

`.env.local` is gitignored (`.env*` with only `.env.local.example` allowed back in). None of these
variables has a `NEXT_PUBLIC_` prefix, so none of them can reach the client bundle.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm test             # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run try-reading  # three sample readings in the terminal (needs a real key)
npm run load-test    # 100 readings over 30 s against BASE_URL (default http://localhost:3000)
npm run make-qr      # public/qr.png (2048 px) for https://sajuforcboa.vercel.app
```

## Privacy: birth data is never stored

Birth date and time exist only for the length of one request.

- **No database, no files, no analytics.** Nothing is written to disk.
- **No logs of birth data.** Validation errors quote the input, so the routes neither log nor
  return them. The only `console.error` is for a failed model call, and its message describes
  the call, not the reader.
- **The model never sees the birth data.** Gemini receives the calculated chart only.
- **The cache holds a hash, not the input.** Readings are cached in memory for 30 minutes under a
  SHA-256 of `date|time|role`, so two identical requests cost one model call. The cache is lost
  on every restart and is never shared between server instances.
- **The rate limiter keys on IP only**, in memory, for 10 seconds, never next to birth data.
- **The share card is drawn in the browser.** The PNG is never uploaded.

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
(본기); the secondary hidden stems are ignored.

**The day stem counts as Bigyeon (비견).** The day stem is the day master itself. Read through
the Ten God formula it is the same element at the same polarity, which is Bigyeon, and that is
what this engine reports and counts. Many almanacs instead leave the slot blank and label it
일간 / 일원 / 아신 — `lunar-javascript` returns `日主` there — so a chart printed elsewhere may
show one fewer Bigyeon than this one. A full chart has 8 Ten Gods (4 stems + 4 branches); a
three-pillar chart has 6.

> **Consequence for the reading.** Every chart carries this Bigyeon, so `peer` is inflated
> by exactly 1 for everyone. A plain `peer > authority` comparison would push every user toward
> "group class". The model input has to compare on `peer - 1` against `authority`, or use a threshold
> that subtracts the constant some other way. This is a known trap — do not compare the raw
> counts.

**Ties break in the fixed order** wood → fire → earth → metal → water. With three elements tied
at the top, `strongestElement` is whichever comes first in that order.

## Reading engine

`POST /api/reading` takes `{ birthDate: "YYYY-MM-DD", birthTime: "HH:mm" | null, role }` and
returns `{ pillars, reading }`. Birth years outside 1940–2015, impossible dates and malformed
times are rejected with 400 before anything is calculated.

- `lib/ai/prompt.ts` — the system prompt, verbatim.
- `lib/ai/schema.ts` — the zod output schema. The Gemini schema is derived from it with
  `z.toJSONSchema`, so the two cannot drift apart.
- `lib/ai/reading.ts` — builds the model payload, calls Gemini, validates, retries once.

### What the model is and is not given

The model never sees the birth date or birth time. It receives the calculated chart only. The
payload also differs from the engine output in one place: `ten_god_group_counts.peer` has the day
master's Bigyeon removed, because that star is the reader, not a peer. Sending the raw count
would read every single person as group-class oriented. See the Ten God rule above.

Star groups are sent in English (`authority`, `output`, …). Korean labels in the payload leak
into the B1 English reading.

### Word limits and the retry

JSON Schema cannot express "max 40 words", so the limits reach Gemini only as field descriptions
and are enforced by zod afterwards. When validation fails, the request is sent a second time with
the validation error appended, then gives up. Two attempts, never more.

## Deploy to Vercel

1. Push the repo to GitHub (check first that `git ls-files | grep env` shows only
   `.env.local.example`).
2. On [vercel.com](https://vercel.com) → **Add New… → Project** → import the GitHub repo.
   Vercel detects Next.js; keep the default build settings.
3. Before the first deploy, open **Environment Variables** and add `GEMINI_API_KEY` (and any
   optional variable from the table above) for **Production** and **Preview**.
4. **Deploy.** The production URL is `https://<project>.vercel.app`.
5. After changing an environment variable, redeploy (**Deployments → ⋯ → Redeploy**). A running
   deployment does not pick up new values.

Link previews and icons need no setup: `app/opengraph-image.tsx`, `app/icon.tsx` and
`app/apple-icon.tsx` are rendered at build time, and on Vercel the absolute `og:image` URL comes
from the production domain automatically.

### Before the presentation

```bash
BASE_URL=https://<project>.vercel.app npm run load-test   # 100 readings over 30 s
```

Each request is a real Gemini call (the inputs are all distinct), so a run spends about 100
requests of the daily quota. Run it once, not on the day of the talk.

The QR code for the slide is `public/qr.png` (2048 px, black on white), made by `npm run make-qr`.
Pass another URL to point it somewhere else: `npm run make-qr -- https://…`.

## Tests

`lib/saju/calculate.test.ts` covers three known-time births, one unknown-time birth, the 23:30 Ja
hour boundary, and the Ipchun boundary on both sides. It also cross-checks the Ten God tables in
this repo against `lunar-javascript`'s own independent Ten God output.

`lib/ai/*.test.ts` and `app/api/reading/route.test.ts` cover the output schema, the payload
(including the peer adjustment and the absence of birth data), the retry path with a mocked SDK,
and every 400 branch of the route. The Gemini call itself is mocked — the live model path is only
exercised by `npm run try-reading` with a real key.
