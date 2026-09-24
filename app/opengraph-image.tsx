import { ImageResponse } from 'next/og';
import { ELEMENT_COLORS, INK, MUTED, PAPER, SEAL, SealMark } from './_brand/seal-mark';

export const alt = 'Academy Saju — your Four Pillars in plain English. Use Saju as a mirror, not as a map.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The preview card shown when the link is shared in a chat app. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <SealMark size={96} radius={20} />
          <div style={{ fontSize: 52, fontWeight: 700, color: INK }}>Academy Saju</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: INK, lineHeight: 1.1 }}>
            Who decides your future?
          </div>
          <div style={{ fontSize: 36, color: MUTED, lineHeight: 1.35 }}>
            Your Four Pillars, read back in plain English — as a mirror for how you learn.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 32, fontWeight: 600, color: SEAL }}>
            Use Saju as a mirror, not as a map.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {ELEMENT_COLORS.map((color) => (
              <div key={color} style={{ width: 22, height: 64, borderRadius: 6, background: color }} />
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
