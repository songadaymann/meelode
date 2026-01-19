/**
 * Parse Lode Runner level images from Arduboy forum into tile format
 *
 * Image format: 280x176 pixels = 28x16 tiles at 10x11 pixels per tile
 *
 * Colors detected:
 * - #000000 (Black) = Empty/background
 * - #0000ff (Blue) = Brick (diggable) - these appear to all be diggable in original
 * - #ffffff (White) = Ladder (and possibly rope - need to check pattern)
 * - #ff8000 (Orange) = Gold
 * - #ff0000 (Red) = Enemy or Player
 *
 * Output tile format (VGLC):
 * . = Empty
 * b = Brick (diggable)
 * B = Solid block (not diggable) - may not exist in these levels
 * # = Ladder
 * - = Rope
 * G = Gold
 * E = Enemy
 * M = Player spawn
 */

import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Image dimensions
const TILE_WIDTH = 10;
const TILE_HEIGHT = 11;
const LEVEL_WIDTH = 28;
const LEVEL_HEIGHT = 16;

// Color thresholds (allowing some tolerance)
function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

function classifyColor(r, g, b) {
  // Black (empty)
  if (colorDistance(r, g, b, 0, 0, 0) < 30) return 'black';
  // Blue (brick)
  if (colorDistance(r, g, b, 0, 0, 255) < 50) return 'blue';
  // White (ladder/rope)
  if (colorDistance(r, g, b, 255, 255, 255) < 50) return 'white';
  // Orange (gold)
  if (colorDistance(r, g, b, 255, 128, 0) < 50) return 'orange';
  // Red (enemy/player)
  if (colorDistance(r, g, b, 255, 0, 0) < 50) return 'red';
  // Cyan/light blue could be escape ladder
  if (b > 200 && g > 200 && r < 100) return 'cyan';

  return 'unknown';
}

async function parseLevelImage(imagePath) {
  const image = await Jimp.read(imagePath);
  const width = image.width;
  const height = image.height;

  if (width !== 280 || height !== 176) {
    console.warn(`Unexpected dimensions ${width}x${height} for ${path.basename(imagePath)}`);
  }

  const level = [];
  const entities = { player: null, enemies: [], gold: [] };

  for (let tileY = 0; tileY < LEVEL_HEIGHT; tileY++) {
    const row = [];
    for (let tileX = 0; tileX < LEVEL_WIDTH; tileX++) {
      // Sample colors within this tile
      const colorCounts = { black: 0, blue: 0, white: 0, orange: 0, red: 0, cyan: 0, unknown: 0 };

      for (let py = 0; py < TILE_HEIGHT; py++) {
        for (let px = 0; px < TILE_WIDTH; px++) {
          const x = tileX * TILE_WIDTH + px;
          const y = tileY * TILE_HEIGHT + py;

          if (x < width && y < height) {
            const pixel = image.getPixelColor(x, y);
            const r = (pixel >> 24) & 0xFF;
            const g = (pixel >> 16) & 0xFF;
            const b = (pixel >> 8) & 0xFF;

            const colorClass = classifyColor(r, g, b);
            colorCounts[colorClass]++;
          }
        }
      }

      // Determine tile type based on dominant colors and patterns
      const totalPixels = TILE_WIDTH * TILE_HEIGHT;
      let tile = '.'; // Default to empty

      // Analyze white pixel pattern for ladder vs rope detection
      let whiteInRow1 = 0; // Check specific row for rope (row 1, near top)
      let whiteVerticalLeft = 0; // Check left column for ladder
      let whiteVerticalRight = 0; // Check right column for ladder
      let totalWhite = colorCounts.white;

      // Scan for pattern details
      for (let py = 0; py < TILE_HEIGHT; py++) {
        for (let px = 0; px < TILE_WIDTH; px++) {
          const x = tileX * TILE_WIDTH + px;
          const y = tileY * TILE_HEIGHT + py;
          if (x < width && y < height) {
            const pixel = image.getPixelColor(x, y);
            const r = (pixel >> 24) & 0xFF;
            const g = (pixel >> 16) & 0xFF;
            const b = (pixel >> 8) & 0xFF;
            if (r === 255 && g === 255 && b === 255) {
              if (py === 1) whiteInRow1++;
              if (px <= 2) whiteVerticalLeft++;
              if (px >= 7) whiteVerticalRight++;
            }
          }
        }
      }

      // LADDER pattern: ~52 white pixels with "H" shape (vertical rails + rungs)
      // Has white pixels on both left and right sides
      const isLadderPattern = totalWhite >= 35 && whiteVerticalLeft >= 10 && whiteVerticalRight >= 10;

      // ROPE pattern: ~10 white pixels in a single horizontal line
      // Specifically row 1 should have almost all the white
      const isRopePattern = totalWhite >= 8 && totalWhite <= 15 && whiteInRow1 >= 8;

      // Check for entities first (smaller objects on top of background)
      if (colorCounts.orange > 5) {
        // Gold
        tile = 'G';
        entities.gold.push({ x: tileX, y: tileY });
      } else if (colorCounts.red > 5) {
        // Enemy or player - we'll mark first red as player, rest as enemies
        if (!entities.player) {
          tile = 'M';
          entities.player = { x: tileX, y: tileY };
        } else {
          tile = 'E';
          entities.enemies.push({ x: tileX, y: tileY });
        }
      } else if (isLadderPattern) {
        // Clear ladder pattern
        tile = '#';
      } else if (isRopePattern) {
        // Clear rope pattern
        tile = '-';
      } else if (colorCounts.white > 20 && !isLadderPattern && !isRopePattern) {
        // Some white but doesn't match ladder/rope - could be player sprite, treat as empty
        // Player sprites have white but in a scattered "stick figure" pattern
        tile = '.';
      } else if (colorCounts.cyan > totalPixels * 0.1) {
        // Escape ladder (cyan/light blue) - treat as regular ladder
        tile = '#';
      } else if (colorCounts.blue > totalPixels * 0.2) {
        // Brick - in original Lode Runner all bricks are diggable
        tile = 'b';
      }

      row.push(tile);
    }
    level.push(row);
  }

  // The bottommost player position is likely the actual player spawn
  // Other red pixels above might be enemies that were marked as player
  // Let's re-analyze: find the lowest red entity and make that the player
  if (entities.player && entities.enemies.length > 0) {
    const allRed = [entities.player, ...entities.enemies].sort((a, b) => b.y - a.y);
    const actualPlayer = allRed[0]; // Lowest position is likely player

    // Reset and reassign
    level[entities.player.y][entities.player.x] = 'E';
    for (const e of entities.enemies) {
      level[e.y][e.x] = 'E';
    }
    level[actualPlayer.y][actualPlayer.x] = 'M';
  }

  return level;
}

function levelToString(level) {
  return level.map(row => row.join('')).join('\n');
}

async function parseAllLevels(inputDir, outputDir) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.gif'))
    .sort();

  console.log(`Found ${files.length} level images to parse`);

  const allLevels = [];

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const levelNum = file.match(/level_(\d+)/)?.[1] || '000';
    const outputPath = path.join(outputDir, `level_${levelNum}.txt`);

    try {
      console.log(`Parsing ${file}...`);
      const level = await parseLevelImage(inputPath);
      const levelStr = levelToString(level);

      // Save individual level file
      fs.writeFileSync(outputPath, levelStr);

      // Collect for combined output
      allLevels.push({ num: parseInt(levelNum), level: levelStr });

      // Show first few for verification
      if (parseInt(levelNum) <= 3) {
        console.log(`\n=== Level ${levelNum} ===`);
        console.log(levelStr);
      }
    } catch (e) {
      console.error(`Error parsing ${file}: ${e.message}`);
    }
  }

  // Save combined file with all levels
  const combinedPath = path.join(outputDir, 'all_levels.txt');
  const combined = allLevels
    .sort((a, b) => a.num - b.num)
    .map(l => `; Level ${l.num}\n${l.level}`)
    .join('\n\n');
  fs.writeFileSync(combinedPath, combined);

  console.log(`\nParsed ${allLevels.length} levels`);
  console.log(`Individual files saved to: ${outputDir}`);
  console.log(`Combined file saved to: ${combinedPath}`);

  // Statistics
  let totalGold = 0, totalEnemies = 0, totalLadders = 0, totalRopes = 0, totalBricks = 0;
  for (const { level } of allLevels) {
    totalGold += (level.match(/G/g) || []).length;
    totalEnemies += (level.match(/E/g) || []).length;
    totalLadders += (level.match(/#/g) || []).length;
    totalRopes += (level.match(/-/g) || []).length;
    totalBricks += (level.match(/b/g) || []).length;
  }

  console.log(`\nStatistics across all levels:`);
  console.log(`  Total gold: ${totalGold} (avg: ${(totalGold / allLevels.length).toFixed(1)} per level)`);
  console.log(`  Total enemies: ${totalEnemies} (avg: ${(totalEnemies / allLevels.length).toFixed(1)} per level)`);
  console.log(`  Total ladders: ${totalLadders} (avg: ${(totalLadders / allLevels.length).toFixed(1)} per level)`);
  console.log(`  Total ropes: ${totalRopes} (avg: ${(totalRopes / allLevels.length).toFixed(1)} per level)`);
  console.log(`  Total bricks: ${totalBricks} (avg: ${(totalBricks / allLevels.length).toFixed(1)} per level)`);
}

async function main() {
  const inputDir = path.join(__dirname, '../original-level-txt-download-images/levels');
  const outputDir = path.join(__dirname, '../original-level-txt-download-images/parsed');

  await parseAllLevels(inputDir, outputDir);
}

main().catch(console.error);
