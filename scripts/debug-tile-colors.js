/**
 * Debug script to examine all tiles with white pixels
 */

import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TILE_WIDTH = 10;
const TILE_HEIGHT = 11;

async function scanAllWhiteTiles(imagePath) {
  const image = await Jimp.read(imagePath);

  console.log('Scanning all tiles with white pixels...\n');

  const tilesWithWhite = [];

  for (let tileY = 0; tileY < 16; tileY++) {
    for (let tileX = 0; tileX < 28; tileX++) {
      let whiteCount = 0;
      let pattern = [];

      for (let py = 0; py < TILE_HEIGHT; py++) {
        let row = '';
        for (let px = 0; px < TILE_WIDTH; px++) {
          const x = tileX * TILE_WIDTH + px;
          const y = tileY * TILE_HEIGHT + py;

          const pixel = image.getPixelColor(x, y);
          const r = (pixel >> 24) & 0xFF;
          const g = (pixel >> 16) & 0xFF;
          const b = (pixel >> 8) & 0xFF;

          if (r === 255 && g === 255 && b === 255) {
            whiteCount++;
            row += 'W';
          } else {
            row += '.';
          }
        }
        pattern.push(row);
      }

      if (whiteCount > 0) {
        tilesWithWhite.push({ tileX, tileY, whiteCount, pattern });
      }
    }
  }

  console.log(`Found ${tilesWithWhite.length} tiles with white pixels:\n`);

  for (const { tileX, tileY, whiteCount, pattern } of tilesWithWhite) {
    console.log(`Tile (${tileX}, ${tileY}) - ${whiteCount} white pixels:`);
    for (const row of pattern) {
      console.log(`  ${row}`);
    }
    console.log('');
  }
}

async function main() {
  const imagePath = path.join(__dirname, '../original-level-txt-download-images/levels/level_001.gif');
  await scanAllWhiteTiles(imagePath);
}

main().catch(console.error);
