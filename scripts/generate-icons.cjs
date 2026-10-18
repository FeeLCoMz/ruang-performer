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

  // Feature graphic 1024x500 for Play Store listing
  const featureGraphic = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#grad1)"/>
    <text x="70" y="250" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="88" font-weight="800" fill="white">Ruang Performer</text>
    <text x="70" y="330" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="40" font-weight="400" fill="rgba(255,255,255,0.85)">Manajemen Band, Setlist &amp; Konser</text>
    <g transform="translate(760, 110) scale(1.55)">
      <rect width="180" height="180" rx="40" fill="rgba(255,255,255,0.15)"/>
      <g transform="translate(45, 30)">
        <rect x="50" y="10" width="3" height="70" fill="white"/>
        <ellipse cx="48" cy="85" rx="12" ry="10" fill="white" transform="rotate(-20 48 85)"/>
        <ellipse cx="30" cy="60" rx="12" ry="10" fill="white" transform="rotate(-20 30 60)"/>
      </g>
    </g>
  </svg>`;
  await sharp(Buffer.from(featureGraphic))
    .png()
    .toFile(path.join(OUT_DIR, 'feature-graphic.png'));
  console.log('Generated: feature-graphic.png (1024x500)');

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
