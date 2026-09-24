import { buildModelInput, generateReading } from '../lib/ai/reading';
import type { Role } from '../lib/ai/schema';
import { calculateSaju, type SajuInput } from '../lib/saju/calculate';

const SAMPLES: Array<{ name: string; birth: SajuInput; role: Role }> = [
  {
    name: 'Student, birth time known',
    birth: { year: 1995, month: 12, day: 13, time: '16:40' },
    role: 'student',
  },
  {
    name: 'Student, birth time unknown',
    birth: { year: 2001, month: 8, day: 9, time: null },
    role: 'student',
  },
  {
    name: 'Teacher, birth time known',
    birth: { year: 1978, month: 2, day: 20, time: '07:40' },
    role: 'teacher',
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
    console.log(`Chart: ${chart(saju)}   time_known: ${saju.timeKnown}`);
    console.log(
      `Elements: ${JSON.stringify(input.element_counts)}   weakest: ${input.weakest_element}`
    );
    console.log(`Star groups sent to the model: ${JSON.stringify(input.ten_god_group_counts)}`);
    console.log('-'.repeat(72));

    const started = Date.now();
    const reading = await generateReading(saju, sample.role);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    const titled = ['identity', 'hidden_side', 'english_style', 'cebu_mode', 'challenge'] as const;
    titled.forEach((key, index) => {
      const section = reading[key];
      console.log(`${index + 1}. [${key}] ${section.title}`);
      console.log(`   ${section.body}`);
      if ('action' in section) console.log(`   Action: ${section.action}`);
    });
    console.log('6. [academy_reading]');
    for (const [key, line] of Object.entries(reading.academy_reading)) console.log(`   ${key}: ${line}`);
    console.log(`7. [experiment] ${reading.experiment}`);
    console.log(`8. [question] ${reading.question}`);

    console.log(`\n(${seconds}s)\n`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
