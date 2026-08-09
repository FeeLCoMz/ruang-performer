/**
 * Generate PWA icons (PNG) from favicon.svg for Play Store / TWA requirements.
 * Run: node scripts/generate-icons.cjs
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_SRC = path.resolve(__dirname, '../public/favicon.svg');
const OUT_DIR = path.resolve(__dirname, '../public');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  const svgBuffer = fs.readFileSync(SVG_SRC);

  for (const size of SIZES) {
    const outFile = path.join(OUT_DIR, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outFile);
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Maskable icon — add extra padding (safe zone ~80% of canvas)
  for (const size of [192, 512]) {
    const padding = Math.round(size * 0.1);
    const inner = size - padding * 2;
    const outFile = path.join(OUT_DIR, `icon-${size}x${size}-maskable.png`);
    await sharp(svgBuffer)
      .resize(inner, inner)
      .extend({ top: padding, bottom: padding, left: padding, right: padding, background: '#667eea' })
      .png()
      .toFile(outFile);
    console.log(`Generated: icon-${size}x${size}-maskable.png`);
  }

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
