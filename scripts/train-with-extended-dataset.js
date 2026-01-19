/**
 * Train Markov generator with Arduboy levels only
 *
 * Uses:
 * 1. Our 146 parsed levels from Arduboy images (28x16)
 * 2. Augmented versions (horizontal flip)
 *
 * This version trains only on Arduboy levels for a more
 * consistent style (all same format, same source).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tile characters
const TILES = {
  EMPTY: '.',
  BRICK: 'b',
  SOLID: 'B',
  LADDER: '#',
  ROPE: '-',
  GOLD: 'G',
  ENEMY: 'E',
  PLAYER: 'M',
};

/**
 * Parse a level string into 2D array
 */
function parseLevel(levelStr) {
  return levelStr.trim().split('\n').map(row => row.split(''));
}

/**
 * Convert level back to string
 */
function levelToString(level) {
  return level.map(row => row.join('')).join('\n');
}

/**
 * Normalize level - remove entities (G, E, M) to get structure only
 */
function normalizeLevel(level) {
  return level.map(row =>
    row.map(tile => {
      if (tile === TILES.GOLD || tile === TILES.ENEMY || tile === TILES.PLAYER) {
        return TILES.EMPTY;
      }
      return tile;
    })
  );
}

/**
 * Horizontally flip a level (mirror)
 */
function flipLevelHorizontal(level) {
  return level.map(row => [...row].reverse());
}

/**
 * Load all local parsed levels
 */
function loadLocalLevels() {
  const parsedDir = path.join(__dirname, '../original-level-txt-download-images/parsed');
  const levels = [];

  if (!fs.existsSync(parsedDir)) {
    console.log('No local parsed levels found');
    return levels;
  }

  const files = fs.readdirSync(parsedDir)
    .filter(f => f.match(/^level_\d+\.txt$/))
    .sort();

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(parsedDir, file), 'utf-8');
      const level = parseLevel(content);
      levels.push({ source: 'local', file, level });
    } catch (e) {
      console.warn(`Failed to load ${file}: ${e.message}`);
    }
  }

  console.log(`Loaded ${levels.length} local levels (28x16)`);
  return levels;
}

/**
 * Fetch VGLC levels from GitHub
 */
async function fetchVGLCLevels(maxCount = 150) {
  const levels = [];
  const baseUrl = 'https://raw.githubusercontent.com/TheVGLC/TheVGLC/master/Lode%20Runner/Processed/';

  console.log(`Fetching up to ${maxCount} VGLC levels from GitHub...`);

  for (let i = 1; i <= maxCount; i++) {
    try {
      const url = `${baseUrl}Level%20${i}.txt`;
      const response = await fetch(url);

      if (!response.ok) {
        if (i > 10) break; // Stop after 10 consecutive failures
        continue;
      }

      const content = await response.text();
      const level = parseLevel(content);
      levels.push({ source: 'vglc', file: `Level ${i}`, level });

      if (levels.length % 25 === 0) {
        console.log(`  Fetched ${levels.length} levels...`);
      }
    } catch (e) {
      // Network error, continue trying
      continue;
    }
  }

  console.log(`Fetched ${levels.length} VGLC levels (32x22)`);
  return levels;
}

/**
 * Augment dataset with horizontal flips
 */
function augmentLevels(levels) {
  const augmented = [];

  for (const { source, file, level } of levels) {
    // Original
    augmented.push({ source, file, level, augmentation: 'original' });

    // Horizontal flip
    const flipped = flipLevelHorizontal(level);
    augmented.push({ source, file: `${file}_flip`, level: flipped, augmentation: 'h-flip' });
  }

  console.log(`Augmented to ${augmented.length} total levels (2x with horizontal flip)`);
  return augmented;
}

/**
 * Markov context and training
 */
class MarkovTrainer {
  constructor() {
    this.transitions = new Map();
  }

  getContextKey(above, left, aboveLeft) {
    return `${above ?? 'X'}|${left ?? 'X'}|${aboveLeft ?? 'X'}`;
  }

  train(levels) {
    console.log(`Training on ${levels.length} levels...`);

    let totalTiles = 0;

    for (const { level } of levels) {
      const normalized = normalizeLevel(level);
      const height = normalized.length;

      for (let y = 0; y < height; y++) {
        const width = normalized[y].length;
        for (let x = 0; x < width; x++) {
          const tile = normalized[y][x];

          const above = y > 0 ? normalized[y-1][x] : null;
          const left = x > 0 ? normalized[y][x-1] : null;
          const aboveLeft = (y > 0 && x > 0) ? normalized[y-1][x-1] : null;

          const contextKey = this.getContextKey(above, left, aboveLeft);

          if (!this.transitions.has(contextKey)) {
            this.transitions.set(contextKey, new Map());
          }

          const tileMap = this.transitions.get(contextKey);
          tileMap.set(tile, (tileMap.get(tile) || 0) + 1);
          totalTiles++;
        }
      }
    }

    // Normalize to probabilities
    for (const tileMap of this.transitions.values()) {
      let total = 0;
      for (const count of tileMap.values()) {
        total += count;
      }
      for (const [tile, count] of tileMap) {
        tileMap.set(tile, count / total);
      }
    }

    console.log(`Trained on ${totalTiles} tiles`);
    console.log(`Learned ${this.transitions.size} unique context patterns`);
  }

  getStats() {
    const patterns = [];

    for (const [context, tileMap] of this.transitions) {
      const tileStrs = [];
      for (const [tile, prob] of tileMap) {
        if (prob >= 0.05) { // Only show significant probabilities
          tileStrs.push(`${tile}:${(prob * 100).toFixed(1)}%`);
        }
      }
      patterns.push({ context, tiles: tileStrs.join(' ') });
    }

    return patterns;
  }

  /**
   * Export as JSON for embedding in the app
   */
  toJSON() {
    const data = {};
    for (const [context, tileMap] of this.transitions) {
      data[context] = {};
      for (const [tile, prob] of tileMap) {
        data[context][tile] = prob;
      }
    }
    return data;
  }
}

/**
 * Main training script
 */
async function main() {
  console.log('=== Arduboy-Only Training ===\n');

  // Load only local Arduboy levels
  const localLevels = loadLocalLevels();

  // Skip VGLC levels for this training run
  // const vglcLevels = await fetchVGLCLevels(150);

  // Use only Arduboy levels
  const allLevels = [...localLevels];
  console.log(`\nTotal levels before augmentation: ${allLevels.length}`);

  // Augment
  const augmentedLevels = augmentLevels(allLevels);

  // Train
  console.log('');
  const trainer = new MarkovTrainer();
  trainer.train(augmentedLevels);

  // Stats
  console.log('\n=== Training Statistics ===');
  console.log(`Context patterns learned: ${trainer.transitions.size}`);

  // Show some interesting patterns
  const stats = trainer.getStats();
  console.log('\nSample learned patterns:');

  // Show patterns for common situations
  const interestingContexts = [
    'X|X|X',     // Top-left corner
    '.|.|.',     // Empty surrounded by empty
    'b|b|b',     // Brick surrounded by brick
    '.|b|.',     // Above brick
    'b|.|b',     // Between bricks
    '#|#|.',     // Ladder continuing
    '-|-|.',     // Rope continuing
  ];

  for (const ctx of interestingContexts) {
    const pattern = stats.find(p => p.context === ctx);
    if (pattern) {
      console.log(`  ${ctx} → ${pattern.tiles}`);
    }
  }

  // Save the trained model
  const outputDir = path.join(__dirname, '../src/procgen/trained');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const modelData = trainer.toJSON();
  const outputPath = path.join(outputDir, 'markov-model.json');
  fs.writeFileSync(outputPath, JSON.stringify(modelData, null, 2));
  console.log(`\nSaved trained model to: ${outputPath}`);

  // Also create a compact version (no pretty printing)
  const compactPath = path.join(outputDir, 'markov-model.min.json');
  fs.writeFileSync(compactPath, JSON.stringify(modelData));
  console.log(`Saved compact model to: ${compactPath}`);

  // Report file sizes
  const stats1 = fs.statSync(outputPath);
  const stats2 = fs.statSync(compactPath);
  console.log(`\nModel sizes:`);
  console.log(`  Pretty: ${(stats1.size / 1024).toFixed(1)} KB`);
  console.log(`  Minified: ${(stats2.size / 1024).toFixed(1)} KB`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Arduboy levels: ${localLevels.length}`);
  console.log(`After augmentation: ${augmentedLevels.length}`);
  console.log(`Unique patterns: ${trainer.transitions.size}`);
}

main().catch(console.error);
