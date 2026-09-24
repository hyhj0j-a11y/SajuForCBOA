import { ImageResponse } from 'next/og';
import { SealMark } from './_brand/seal-mark';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<SealMark size={32} radius={7} />, size);
}
