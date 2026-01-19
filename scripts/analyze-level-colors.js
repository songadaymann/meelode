/**
 * Analyze colors in Lode Runner level images to determine tile mappings
 */

import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function analyzeImage(imagePath) {
  console.log(`\nAnalyzing: ${path.basename(imagePath)}`);

  const image = await Jimp.read(imagePath);
  const width = image.width;
  const height = image.height;

  console.log(`Dimensions: ${width}x${height}`);

  // Collect all unique colors
  const colorCounts = new Map();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = image.getPixelColor(x, y);
      // Jimp stores pixels as 32-bit RGBA integers
      const r = (pixel >> 24) & 0xFF;
      const g = (pixel >> 16) & 0xFF;
      const b = (pixel >> 8) & 0xFF;
      const colorKey = `${r},${g},${b}`;

      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
    }
  }

  // Sort by frequency
  const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\nUnique colors: ${sorted.length}`);
  console.log('\nTop colors (R,G,B -> count):');

  for (const [color, count] of sorted.slice(0, 20)) {
    const [r, g, b] = color.split(',').map(Number);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    const percent = ((count / (width * height)) * 100).toFixed(2);
    console.log(`  ${hex} (${color}) -> ${count} pixels (${percent}%)`);
  }

  // Calculate likely tile size
  const possibleTileWidths = [8, 10, 12, 14, 16];
  const possibleTileHeights = [8, 10, 11, 12, 14, 16];

  console.log('\nPossible tile dimensions:');
  for (const tw of possibleTileWidths) {
    for (const th of possibleTileHeights) {
      if (width % tw === 0 && height % th === 0) {
        const tilesX = width / tw;
        const tilesY = height / th;
        console.log(`  ${tw}x${th} pixels -> ${tilesX}x${tilesY} tiles`);
      }
    }
  }

  return { width, height, colorCounts: sorted };
}

async function main() {
  const levelsDir = path.join(__dirname, '../original-level-txt-download-images/levels');

  // Analyze first few levels to understand the format
  const testFiles = ['level_001.gif', 'level_002.gif', 'level_050.gif', 'level_100.gif'];

  for (const file of testFiles) {
    try {
      await analyzeImage(path.join(levelsDir, file));
    } catch (e) {
      console.log(`Could not analyze ${file}: ${e.message}`);
    }
  }
}

main().catch(console.error);
