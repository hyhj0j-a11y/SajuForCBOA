import { buildModelInput, generateReading } from '../lib/ai/reading';
import type { Role } from '../lib/ai/schema';
import { readingSections } from '../lib/reading-sections';
import { calculateSaju, type SajuInput } from '../lib/saju/calculate';

const SEOUL = { longitude: 126.98, timezone: 'Asia/Seoul' };

const SAMPLES: Array<{ name: string; birth: SajuInput; role: Role }> = [
  {
    name: 'Student, born in Seoul, time known',
    birth: { year: 1995, month: 12, day: 13, time: '16:40', place: SEOUL },
    role: 'student',
  },
  {
    name: 'Same chart, normal mode',
    birth: { year: 1995, month: 12, day: 13, time: '16:40', place: SEOUL },
    role: 'normal',
  },
  {
    name: 'Student, birth time unknown',
    birth: { year: 2001, month: 8, day: 9, time: null },
    role: 'student',
  },
  {
    name: 'Normal, time known',
    birth: { year: 1978, month: 2, day: 20, time: '07:40' },
    role: 'normal',
  },
];

function chart(saju: ReturnType<typeof calculateSaju>): string {
  const { year, month, day, hour } = saju.pillars;
  const cell = (p: typeof year | null) => (p ? `${p.stem.hanja}${p.branch.hanja}` : '—');
  return [cell(year), cell(month), cell(day), cell(hour)].join(' ');
}

async function main() {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  console.log(`Model: ${model}\n`);

  for (const sample of SAMPLES) {
    const saju = calculateSaju(sample.birth);
    const input = buildModelInput(saju, sample.role);

    console.log('='.repeat(72));
    console.log(`${sample.name}  —  role: ${sample.role}`);
    console.log(`Chart: ${chart(saju)}   time_known: ${saju.timeKnown}   correction: ${saju.timeCorrection?.minutes ?? '—'} min`);
    console.log(`Strength %: ${JSON.stringify(input.element_strength_percent)}   day master: ${input.day_master_strength.level}`);
    console.log(`Star groups sent to the model: ${JSON.stringify(input.ten_god_group_strength_percent)}`);
    console.log('-'.repeat(72));

    const started = Date.now();
    try {
      const reading = await generateReading(saju, sample.role);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);

      console.log(`[snapshot] ${reading.saju_snapshot}`);
      for (const section of readingSections(reading)) {
        console.log(`\n${section.heading.emoji} ${section.heading.label}${section.title ? ` — ${section.title}` : ''}`);
        console.log(`   ${section.body}`);
        if (section.action) console.log(`   👉 ${section.action}`);
      }
      console.log(`\n(${seconds}s)\n`);
    } catch (error) {
      console.log(`FAILED: ${error instanceof Error ? error.message : error}\n`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
