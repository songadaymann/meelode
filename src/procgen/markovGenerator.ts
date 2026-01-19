/**
 * Markov Chain Level Generator
 *
 * Learns tile patterns from existing levels and generates new ones.
 * Uses a 2D Markov model that considers tiles above and to the left.
 *
 * Can be trained on the fly or load pre-trained model from JSON.
 */

import { Level, TileChar, TILES, LEVEL_WIDTH, LEVEL_HEIGHT, Position } from './types';
import { createEmptyLevel, cloneLevel, normalizeLevel, getTile } from './levelParser';

// Pre-trained model data (exported from training script)
// This is loaded dynamically to avoid bundling issues
let preTrainedModel: Record<string, Record<string, number>> | null = null;

// Context for 2D Markov model: considers tiles in a window around current position
interface MarkovContext {
  above: TileChar | null;
  left: TileChar | null;
  aboveLeft: TileChar | null;
  // Optionally consider 2 tiles above / left for higher order
  above2?: TileChar | null;
  left2?: TileChar | null;
}

type ContextKey = string;
type TransitionMap = Map<ContextKey, Map<TileChar, number>>;

/**
 * Markov Chain Model for level generation
 */
export class MarkovLevelGenerator {
  private transitions: TransitionMap = new Map();
  private structureTiles: TileChar[] = [TILES.EMPTY, TILES.BRICK, TILES.SOLID, TILES.LADDER, TILES.ROPE];
  private order: number;

  constructor(order: number = 1) {
    this.order = order;
  }

  /**
   * Load a pre-trained model from JSON data
   */
  loadPreTrainedModel(modelData: Record<string, Record<string, number>>): void {
    this.transitions.clear();

    for (const [contextKey, tileProbabilities] of Object.entries(modelData)) {
      const tileMap = new Map<TileChar, number>();
      for (const [tile, prob] of Object.entries(tileProbabilities)) {
        tileMap.set(tile as TileChar, prob);
      }
      this.transitions.set(contextKey, tileMap);
    }

    console.log(`Loaded pre-trained model with ${this.transitions.size} patterns`);
  }

  /**
   * Check if the model has been trained
   */
  isTrained(): boolean {
    return this.transitions.size > 0;
  }

  /**
   * Create context key from surrounding tiles
   */
  private getContextKey(context: MarkovContext): ContextKey {
    return `${context.above ?? 'X'}|${context.left ?? 'X'}|${context.aboveLeft ?? 'X'}`;
  }

  /**
   * Get context from level at position
   */
  private getContext(level: Level, x: number, y: number): MarkovContext {
    return {
      above: getTile(level, x, y - 1),
      left: getTile(level, x - 1, y),
      aboveLeft: getTile(level, x - 1, y - 1),
    };
  }

  /**
   * Train the model on a set of levels
   */
  train(levels: Level[]): void {
    this.transitions.clear();

    for (const level of levels) {
      // Normalize to structure only (remove G, E, M)
      const normalized = normalizeLevel(level);

      for (let y = 0; y < normalized.length; y++) {
        for (let x = 0; x < normalized[y].length; x++) {
          const tile = normalized[y][x];
          const context = this.getContext(normalized, x, y);
          const contextKey = this.getContextKey(context);

          if (!this.transitions.has(contextKey)) {
            this.transitions.set(contextKey, new Map());
          }

          const tileMap = this.transitions.get(contextKey)!;
          tileMap.set(tile, (tileMap.get(tile) || 0) + 1);
        }
      }
    }

    // Normalize probabilities
    for (const [_, tileMap] of this.transitions) {
      let total = 0;
      for (const count of tileMap.values()) {
        total += count;
      }
      for (const [tile, count] of tileMap) {
        tileMap.set(tile, count / total);
      }
    }
  }

  /**
   * Sample a tile given context
   */
  private sampleTile(context: MarkovContext, rng: () => number = Math.random): TileChar {
    const contextKey = this.getContextKey(context);
    const tileMap = this.transitions.get(contextKey);

    if (!tileMap || tileMap.size === 0) {
      // Fallback: random structure tile with bias toward empty
      const r = rng();
      if (r < 0.6) return TILES.EMPTY;
      if (r < 0.8) return TILES.BRICK;
      if (r < 0.9) return TILES.LADDER;
      if (r < 0.95) return TILES.SOLID;
      return TILES.ROPE;
    }

    // Weighted random selection
    const r = rng();
    let cumulative = 0;

    for (const [tile, prob] of tileMap) {
      cumulative += prob;
      if (r <= cumulative) {
        return tile;
      }
    }

    // Fallback to first tile
    return tileMap.keys().next().value || TILES.EMPTY;
  }

  /**
   * Generate a new level structure (without entities)
   */
  generateStructure(
    width: number = LEVEL_WIDTH,
    height: number = LEVEL_HEIGHT,
    rng: () => number = Math.random
  ): Level {
    const level = createEmptyLevel(width, height);

    // Always have solid floor at bottom
    for (let x = 0; x < width; x++) {
      level[height - 1][x] = TILES.SOLID;
    }

    // Generate from top-left to bottom-right (left to right, top to bottom)
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width; x++) {
        const context = this.getContext(level, x, y);
        level[y][x] = this.sampleTile(context, rng);
      }
    }

    return level;
  }

  /**
   * Post-process to ensure structural validity
   */
  postProcessStructure(level: Level): Level {
    const processed = cloneLevel(level);
    const height = level.length;
    const width = level[0]?.length || 0;

    // Ensure ladders connect properly (don't float in mid-air unless at top)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = processed[y][x];

        if (tile === TILES.LADDER) {
          // Ladder should connect to something below (ground or another ladder)
          // unless it's near the bottom
          if (y < height - 2) {
            const below = processed[y + 1][x];
            if (below === TILES.EMPTY) {
              // Either extend ladder down or remove it
              if (Math.random() < 0.7) {
                processed[y + 1][x] = TILES.LADDER;
              } else {
                processed[y][x] = TILES.EMPTY;
              }
            }
          }
        }

        // Ropes should be at the top of open spaces (have empty below usually)
        if (tile === TILES.ROPE) {
          const below = processed[y + 1]?.[x];
          // Rope over solid ground is weird - convert to empty or ladder
          if (below === TILES.BRICK || below === TILES.SOLID) {
            processed[y][x] = Math.random() < 0.5 ? TILES.EMPTY : TILES.LADDER;
          }
        }
      }
    }

    return processed;
  }

  /**
   * Get model statistics
   */
  getStats(): { contextCount: number; mostCommonPatterns: Array<{ context: string; tiles: string }> } {
    const patterns: Array<{ context: string; count: number; tiles: string }> = [];

    for (const [context, tileMap] of this.transitions) {
      let total = 0;
      const tileStrs: string[] = [];
      for (const [tile, prob] of tileMap) {
        total += prob;
        tileStrs.push(`${tile}:${(prob * 100).toFixed(1)}%`);
      }
      patterns.push({ context, count: total, tiles: tileStrs.join(', ') });
    }

    patterns.sort((a, b) => b.count - a.count);

    return {
      contextCount: this.transitions.size,
      mostCommonPatterns: patterns.slice(0, 10).map(p => ({ context: p.context, tiles: p.tiles })),
    };
  }
}

/**
 * Higher-order 2D Markov model using overlapping patterns
 * Similar to WFC's overlapping model but simpler
 */
export class PatternMarkovGenerator {
  private patterns: Map<string, number> = new Map();
  private patternSize: number;

  constructor(patternSize: number = 3) {
    this.patternSize = patternSize;
  }

  /**
   * Extract all NxN patterns from a level
   */
  private extractPatterns(level: Level): string[] {
    const patterns: string[] = [];
    const normalized = normalizeLevel(level);

    for (let y = 0; y <= normalized.length - this.patternSize; y++) {
      for (let x = 0; x <= (normalized[y]?.length || 0) - this.patternSize; x++) {
        let pattern = '';
        for (let dy = 0; dy < this.patternSize; dy++) {
          for (let dx = 0; dx < this.patternSize; dx++) {
            pattern += normalized[y + dy]?.[x + dx] || '.';
          }
        }
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Train on levels
   */
  train(levels: Level[]): void {
    this.patterns.clear();

    for (const level of levels) {
      const levelPatterns = this.extractPatterns(level);
      for (const pattern of levelPatterns) {
        this.patterns.set(pattern, (this.patterns.get(pattern) || 0) + 1);
      }
    }
  }

  /**
   * Get unique pattern count
   */
  getPatternCount(): number {
    return this.patterns.size;
  }
}
