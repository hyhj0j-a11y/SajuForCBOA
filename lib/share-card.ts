import type { Reading, Role } from './ai/schema';
import type { PillarName } from './saju/calculate';
import {
  ELEMENT_EMOJI,
  ELEMENT_INK,
  ELEMENT_LABEL,
  ELEMENTS,
  PILLAR_LABEL,
  polarityLabel,
  type SajuChart,
} from './saju/display';
import { ACADEMY_ROWS, NUDGES, sectionHeadings, type SectionHeading } from './reading-sections';

const WIDTH = 1080;
const PAD = 64;
const CONTENT = WIDTH - PAD * 2;

const PAPER = '#ffffff';
const SURFACE = '#f7f7f7';
const INK = '#222222';
const MUTED = '#6a6a6a';
const LINE = '#dddddd';
const SEAL = '#c4452f';

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const HANJA = '"Noto Serif KR", "Songti SC", "SimSun", "Malgun Gothic", serif';

const ORDER: PillarName[] = ['year', 'month', 'day', 'hour'];

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';

  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  return lines;
}

interface Section {
  eyebrow: string;
  title?: string;
  body?: string;
  rows?: ReadonlyArray<{ label: string; text: string }>;
  nudge?: { label: string; text: string };
}

/** Emoji first, then the label — canvas draws colour emoji in their own colours. */
const tag = ({ emoji, label }: SectionHeading) => `${emoji}  ${label}`;

function sectionsOf(reading: Reading, role: Role): Section[] {
  const heading = sectionHeadings(role);

  return [
    { eyebrow: tag(heading.identity), title: reading.identity.title, body: reading.identity.body },
    { eyebrow: tag(heading.hidden_side), title: reading.hidden_side.title, body: reading.hidden_side.body },
    {
      eyebrow: tag(heading.english_style),
      title: reading.english_style.title,
      body: reading.english_style.body,
      nudge: { label: tag(NUDGES.tryThis), text: reading.english_style.action },
    },
    { eyebrow: tag(heading.cebu_mode), title: reading.cebu_mode.title, body: reading.cebu_mode.body },
    {
      eyebrow: tag(heading.challenge),
      title: reading.challenge.title,
      body: reading.challenge.body,
      nudge: { label: tag(NUDGES.smallStep), text: reading.challenge.action },
    },
    {
      eyebrow: tag(heading.academy_reading),
      rows: ACADEMY_ROWS.map((row) => ({ label: tag(row), text: reading.academy_reading[row.key] })),
    },
    { eyebrow: tag(heading.experiment), body: reading.experiment },
    { eyebrow: tag(heading.question), title: reading.question },
  ];
}

/**
 * Draws the whole reading at a fixed 1080px width. Runs twice: once with `draw` off to add the
 * heights up, then again on a canvas tall enough to hold them.
 */
function render(
  ctx: CanvasRenderingContext2D,
  chart: SajuChart,
  reading: Reading,
  role: Role,
  draw: boolean
): number {
  let y = 0;

  const text = (value: string, x: number, font: string, color: string, align: CanvasTextAlign = 'left') => {
    if (!draw) return;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  };

  const box = (x: number, top: number, w: number, h: number, fill: string, stroke?: string) => {
    if (!draw) return;
    ctx.beginPath();
    ctx.roundRect(x, top, w, h, 24);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = stroke === INK ? 3 : 2;
      ctx.stroke();
    }
  };

  const paragraph = (value: string, x: number, maxWidth: number, font: string, color: string, lineHeight: number) => {
    ctx.font = font;
    const lines = wrap(ctx, value, maxWidth);
    for (const line of lines) {
      y += lineHeight;
      text(line, x, font, color);
    }
  };

  // ── Header ────────────────────────────────────────────────────────────────
  y = 96;
  box(PAD, y - 52, 64, 64, SEAL);
  if (draw) {
    ctx.font = `600 34px ${HANJA}`;
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.fillText('四', PAD + 32, y - 8);
  }
  text('Academy Saju', PAD + 88, `600 36px ${SANS}`, INK);
  y += 44;
  text('Four Pillars, in plain English.', PAD + 88, `400 26px ${SANS}`, MUTED);

  // ── Chart ─────────────────────────────────────────────────────────────────
  y += 56;
  const chartTop = y;
  const chartHeight = 400;
  box(PAD, chartTop, CONTENT, chartHeight, SURFACE, LINE);

  const columnWidth = (CONTENT - 96) / 4;
  ORDER.forEach((name, index) => {
    const pillar = chart.pillars[name];
    const left = PAD + 48 + columnWidth * index;
    const centre = left + columnWidth / 2;
    const isDay = name === 'day';

    y = chartTop + 62;
    text(PILLAR_LABEL[name].toUpperCase(), centre, `600 22px ${SANS}`, isDay ? INK : MUTED, 'center');

    const cellTop = chartTop + 86;
    const cellHeight = 264;
    box(left + 8, cellTop, columnWidth - 16, cellHeight, isDay ? PAPER : SURFACE, isDay ? INK : LINE);

    if (!pillar) {
      y = cellTop + cellHeight / 2 + 14;
      text('—', centre, `400 46px ${SANS}`, '#c3c7d0', 'center');
      return;
    }

    const signs = [pillar.stem, pillar.branch] as const;
    signs.forEach((sign, row) => {
      const base = cellTop + 78 + row * 132;
      y = base;
      text(sign.hanja, centre, `500 64px ${HANJA}`, ELEMENT_INK[sign.element], 'center');
      y = base + 32;
      text(sign.roman, centre, `400 22px ${SANS}`, MUTED, 'center');
    });

    if (draw) {
      ctx.beginPath();
      ctx.moveTo(left + 32, cellTop + cellHeight / 2);
      ctx.lineTo(left + columnWidth - 32, cellTop + cellHeight / 2);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  y = chartTop + chartHeight + 52;
  const dayMaster = `Day master ${chart.dayMaster.hanja} ${chart.dayMaster.roman} · ${polarityLabel(chart)}`;
  text(dayMaster, PAD, `500 26px ${SANS}`, INK);

  y += 40;
  const counts = ELEMENTS.map((element) => `${ELEMENT_EMOJI[element]} ${ELEMENT_LABEL[element]} ${chart.elementCounts[element]}`).join("   ");
  text(counts, PAD, `400 24px ${SANS}`, MUTED);

  if (!chart.timeKnown) {
    y += 38;
    text('Time unknown — this reading uses three pillars.', PAD, `400 24px ${SANS}`, MUTED);
  }

  // ── Sections ──────────────────────────────────────────────────────────────
  for (const section of sectionsOf(reading, role)) {
    y += 72;
    text(section.eyebrow, PAD, `500 26px ${SANS}`, MUTED);

    if (section.title) {
      y += 12;
      paragraph(section.title, PAD, CONTENT, `600 38px ${SANS}`, INK, 50);
    }

    if (section.body) {
      y += 12;
      paragraph(section.body, PAD, CONTENT, `400 30px ${SANS}`, '#3f3f3f', 44);
    }

    for (const row of section.rows ?? []) {
      y += 44;
      text(row.label, PAD, `600 24px ${SANS}`, INK);
      y -= 4;
      paragraph(row.text, PAD, CONTENT, `400 30px ${SANS}`, '#3f3f3f', 44);
    }

    if (section.nudge) {
      y += 26;
      const nudgeTop = y;
      ctx.font = `400 28px ${SANS}`;
      const lines = wrap(ctx, section.nudge.text, CONTENT - 64);
      const height = 50 + lines.length * 42 + 26;
      box(PAD, nudgeTop, CONTENT, height, SURFACE, LINE);

      y = nudgeTop + 44;
      text(section.nudge.label, PAD + 32, `600 24px ${SANS}`, INK);
      for (const line of lines) {
        y += 42;
        text(line, PAD + 32, `400 28px ${SANS}`, '#3f3f3f');
      }
      y = nudgeTop + height;
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 76;
  if (draw) {
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(WIDTH - PAD, y);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  y += 60;
  text('Use Saju as a mirror, not as a map.', WIDTH / 2, `500 28px ${SANS}`, INK, 'center');
  y += 44;
  text('Our future is still ours to choose.', WIDTH / 2, `400 26px ${SANS}`, MUTED, 'center');

  return y + 72;
}

export function drawShareCard(chart: SajuChart, reading: Reading, role: Role): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = 10;

  const measure = canvas.getContext('2d');
  if (!measure) throw new Error('Canvas is not available in this browser.');
  const height = render(measure, chart, reading, role, false);

  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, canvas.height);
  render(ctx, chart, reading, role, true);

  return canvas;
}
