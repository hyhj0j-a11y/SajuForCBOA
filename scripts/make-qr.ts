/**
 * Writes public/qr.png for the presentation slide.
 *
 *   npm run make-qr                                  # the production URL
 *   npm run make-qr -- https://example.vercel.app    # any other URL
 *
 * Black on white with a wide quiet zone: projectors wash out colour and low contrast, and phone
 * cameras need the white border to find the code from the back of the room.
 */
import QRCode from 'qrcode';

const URL = process.argv[2] || 'https://sajuforcboa.vercel.app';
const OUT = 'public/qr.png';

async function main() {
  await QRCode.toFile(OUT, URL, {
    width: 2048,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  console.log(`${OUT} → ${URL}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
