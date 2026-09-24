import { ImageResponse } from 'next/og';
import { SealMark } from './_brand/seal-mark';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS rounds the corners itself, so the seal fills the square. */
export default function AppleIcon() {
  return new ImageResponse(<SealMark size={180} radius={0} />, size);
}
