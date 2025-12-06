/**
 * Script to generate PWA icons from base SVG
 * Run: node scripts/generate-icons.js
 *
 * Requires: sharp (npm install -D sharp)
 *
 * Or use an online tool like:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 *
 * Upload public/icons/icon.svg to generate all required sizes
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Run: pnpm add -D sharp');
  console.log('\nAlternatively, use one of these tools:');
  console.log('- https://realfavicongenerator.net/');
  console.log('- https://www.pwabuilder.com/imageGenerator');
  console.log('\nUpload public/icons/icon.svg to generate all sizes');
  process.exit(0);
}

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_SVG = path.join(__dirname, '../public/icons/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read the SVG file
  const svgBuffer = fs.readFileSync(INPUT_SVG);

  console.log('Generating PWA icons...');

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Create apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png');

  // Create favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon.png'));
  console.log('  Created: favicon.png');

  console.log('\nDone! Icons generated successfully.');
}

generateIcons().catch(console.error);
