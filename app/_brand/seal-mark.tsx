/**
 * The 四 seal from the page header, drawn as strokes so `next/og` can render it without a CJK font.
 * Shared by the favicon, the Apple touch icon and the link-preview image.
 */
export const PAPER = '#ffffff';
export const INK = '#222222';
export const MUTED = '#6a6a6a';
export const SEAL = '#c4452f';
export const ELEMENT_COLORS = ['#2f7d5b', '#c4452f', '#b9822b', '#6f7c8a', '#26364f'];

export function SealMark({ size, radius }: { size: number; radius: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: SEAL,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none">
        <g stroke={PAPER} strokeWidth={2.4} strokeLinecap="square" strokeLinejoin="miter">
          <rect x="3" y="4" width="18" height="16" />
          <path d="M9.5 4 V10.5 Q9.5 13.5 6.5 15" />
          <path d="M14.5 4 V12.5 Q14.5 14 16.5 14 H21" />
        </g>
      </svg>
    </div>
  );
}
