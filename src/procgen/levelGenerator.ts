/**
 * Level Generator Pipeline
 *
 * Combines Markov generation with solvability validation to produce
 * playable Lode Runner levels.
 */

import { Level, TileChar, TILES, LEVEL_WIDTH, LEVEL_HEIGHT, Position, GeneratorConfig, ValidationResult } from './types';
import { createEmptyLevel, cloneLevel, getTile, setTile, findTiles, getSpawnPosition, getGoldPositions } from './levelParser';
import { MarkovLevelGenerator } from './markovGenerator';
import { validateLevel, validateLevelFull, isSolvable, isFullySolvable, getReachablePositions } from './solvabilityChecker';

export interface GenerationResult {
  level: Level;
  validation: ValidationResult;
  attempts: number;
  generationTimeMs: number;
  fullySolvable?: boolean; // True if level can be completed (all gold + escape)
}

/**
 * Main level generator class
 */
export class LodeRunnerLevelGenerator {
  private markovGenerator: MarkovLevelGenerator;
  private trained: boolean = false;

  constructor(markovOrder: number = 1) {
    this.markovGenerator = new MarkovLevelGenerator(markovOrder);
  }

  /**
   * Train the generator on existing levels
   */
  train(levels: Level[]): void {
    this.markovGenerator.train(levels);
    this.trained = true;
  }

  /**
   * Check if generator has been trained
   */
  isTrained(): boolean {
    return this.trained;
  }

  /**
   * Place entities (gold, enemies, spawn) on a structure
   */
  private placeEntities(
    structure: Level,
    goldCount: number,
    enemyCount: number,
    rng: () => number = Math.random
  ): Level {
    const level = cloneLevel(structure);
    const height = level.length;
    const width = level[0]?.length || 0;

    // Find valid spawn positions (on ground, not blocked)
    const validSpawnPositions: Position[] = [];
    const validGoldPositions: Position[] = [];

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width; x++) {
        const tile = level[y][x];
        const below = getTile(level, x, y + 1);

        // Can spawn/place gold on empty space with ground below, or on ladder
        const hasGround = below === TILES.BRICK || below === TILES.SOLID || below === TILES.LADDER;
        const isPassable = tile === TILES.EMPTY || tile === TILES.LADDER || tile === TILES.ROPE;

        if (isPassable && (hasGround || tile === TILES.LADDER)) {
          validSpawnPositions.push({ x, y });
          validGoldPositions.push({ x, y });
        }
      }
    }

    if (validSpawnPositions.length === 0) {
      // Fallback: place spawn in bottom-left area
      for (let x = 1; x < Math.min(10, width); x++) {
        if (level[height - 2][x] === TILES.EMPTY) {
          validSpawnPositions.push({ x, y: height - 2 });
          break;
        }
      }
    }

    // Place spawn point
    if (validSpawnPositions.length > 0) {
      // Prefer lower positions for spawn
      validSpawnPositions.sort((a, b) => b.y - a.y);
      const spawnIdx = Math.floor(rng() * Math.min(5, validSpawnPositions.length));
      const spawn = validSpawnPositions[spawnIdx];
      level[spawn.y][spawn.x] = TILES.SPAWN;

      // Remove spawn position from gold candidates
      const spawnKey = `${spawn.x},${spawn.y}`;
      const filteredGoldPositions = validGoldPositions.filter(
        p => `${p.x},${p.y}` !== spawnKey
      );

      // Get reachable positions from spawn
      const reachable = getReachablePositions(level, spawn.x, spawn.y);

      // Filter gold positions to only reachable ones
      const reachableGoldPositions = filteredGoldPositions.filter(
        p => reachable.has(`${p.x},${p.y}`)
      );

      // Place gold (only in reachable positions)
      const goldToPlace = Math.min(goldCount, reachableGoldPositions.length);
      const shuffledGold = [...reachableGoldPositions].sort(() => rng() - 0.5);

      for (let i = 0; i < goldToPlace; i++) {
        const pos = shuffledGold[i];
        if (level[pos.y][pos.x] === TILES.EMPTY) {
          level[pos.y][pos.x] = TILES.GOLD;
        }
      }

      // Place enemies (in reachable positions, not on gold or spawn)
      const usedPositions = new Set<string>();
      usedPositions.add(spawnKey);
      for (let i = 0; i < goldToPlace; i++) {
        usedPositions.add(`${shuffledGold[i].x},${shuffledGold[i].y}`);
      }

      const enemyPositions = reachableGoldPositions.filter(
        p => !usedPositions.has(`${p.x},${p.y}`)
      );
      const shuffledEnemies = [...enemyPositions].sort(() => rng() - 0.5);
      const enemiesToPlace = Math.min(enemyCount, shuffledEnemies.length);

      for (let i = 0; i < enemiesToPlace; i++) {
        const pos = shuffledEnemies[i];
        if (level[pos.y][pos.x] === TILES.EMPTY) {
          level[pos.y][pos.x] = TILES.ENEMY;
        }
      }
    }

    return level;
  }

  /**
   * Generate a single level (may not be solvable)
   */
  generateRaw(config: GeneratorConfig = {}, rng: () => number = Math.random): Level {
    const {
      width = LEVEL_WIDTH,
      height = LEVEL_HEIGHT,
      goldCount = 5,
      enemyCount = 2,
    } = config;

    // Generate structure
    let structure = this.markovGenerator.generateStructure(width, height, rng);

    // Post-process structure
    structure = this.markovGenerator.postProcessStructure(structure);

    // Place entities
    const level = this.placeEntities(structure, goldCount, enemyCount, rng);

    return level;
  }

  /**
   * Generate a guaranteed solvable level
   * Will retry up to maxAttempts times
   *
   * @param config - Generation config (size, gold/enemy count)
   * @param maxAttempts - Max generation attempts
   * @param rng - Random number generator
   * @param requireFullSolve - If true, require that level can be fully completed (all gold + escape)
   */
  generate(
    config: GeneratorConfig = {},
    maxAttempts: number = 50,
    rng: () => number = Math.random,
    requireFullSolve: boolean = false
  ): GenerationResult {
    const startTime = performance.now();
    let attempts = 0;
    let bestLevel: Level | null = null;
    let bestValidation: ValidationResult | null = null;
    let bestScore = -Infinity;
    let bestFullySolvable = false;

    while (attempts < maxAttempts) {
      attempts++;
      const level = this.generateRaw(config, rng);
      const validation = validateLevel(level);

      // Score: prefer more reachable gold, penalize issues
      let score = validation.reachableGold.length - validation.unreachableGold.length * 10 - validation.issues.length;

      // Check full solvability if requested or if basic validation passed
      let fullySolvable = false;
      if (validation.valid) {
        fullySolvable = isFullySolvable(level);
        if (fullySolvable) {
          score += 50; // Big bonus for fully solvable levels
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestLevel = level;
        bestValidation = validation;
        bestFullySolvable = fullySolvable;
      }

      // Success conditions
      if (requireFullSolve) {
        if (validation.valid && fullySolvable) {
          return {
            level,
            validation,
            attempts,
            generationTimeMs: performance.now() - startTime,
            fullySolvable: true,
          };
        }
      } else {
        if (validation.valid) {
          return {
            level,
            validation,
            attempts,
            generationTimeMs: performance.now() - startTime,
            fullySolvable,
          };
        }
      }
    }

    // Return best attempt even if not fully valid
    return {
      level: bestLevel!,
      validation: bestValidation!,
      attempts,
      generationTimeMs: performance.now() - startTime,
      fullySolvable: bestFullySolvable,
    };
  }

  /**
   * Generate multiple levels
   */
  generateBatch(
    count: number,
    config: GeneratorConfig = {},
    maxAttemptsPerLevel: number = 50
  ): GenerationResult[] {
    const results: GenerationResult[] = [];
    let seed = Date.now();

    for (let i = 0; i < count; i++) {
      // Simple seeded RNG for reproducibility
      const rng = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      results.push(this.generate(config, maxAttemptsPerLevel, rng));
    }

    return results;
  }
}

/**
 * Simple constructive generator (alternative to Markov)
 * Builds levels from scratch using rules
 */
export class ConstructiveLevelGenerator {
  /**
   * Generate a level using constructive rules
   */
  generate(config: GeneratorConfig = {}, rng: () => number = Math.random): Level {
    const {
      width = LEVEL_WIDTH,
      height = LEVEL_HEIGHT,
      goldCount = 5,
      enemyCount = 2,
    } = config;

    const level = createEmptyLevel(width, height);

    // 1. Create solid floor
    for (let x = 0; x < width; x++) {
      level[height - 1][x] = TILES.SOLID;
    }

    // 2. Add some platforms at various heights
    const platformCount = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < platformCount; i++) {
      const y = 2 + Math.floor(rng() * (height - 6));
      const startX = Math.floor(rng() * (width - 10));
      const platformWidth = 5 + Math.floor(rng() * 15);

      for (let x = startX; x < Math.min(startX + platformWidth, width); x++) {
        level[y][x] = rng() < 0.8 ? TILES.BRICK : TILES.SOLID;
      }
    }

    // 3. Add ladders connecting platforms
    const ladderCount = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < ladderCount; i++) {
      const x = 2 + Math.floor(rng() * (width - 4));
      const startY = 1 + Math.floor(rng() * (height - 8));
      const ladderHeight = 4 + Math.floor(rng() * 8);

      for (let y = startY; y < Math.min(startY + ladderHeight, height - 1); y++) {
        if (level[y][x] === TILES.EMPTY) {
          level[y][x] = TILES.LADDER;
        }
      }
    }

    // 4. Add some ropes
    const ropeCount = Math.floor(rng() * 3);
    for (let i = 0; i < ropeCount; i++) {
      const y = 1 + Math.floor(rng() * (height / 2));
      const startX = Math.floor(rng() * (width - 8));
      const ropeWidth = 4 + Math.floor(rng() * 10);

      for (let x = startX; x < Math.min(startX + ropeWidth, width); x++) {
        if (level[y][x] === TILES.EMPTY) {
          level[y][x] = TILES.ROPE;
        }
      }
    }

    // 5. Place spawn point (bottom area)
    let spawnPlaced = false;
    for (let x = 1; x < width - 1 && !spawnPlaced; x++) {
      if (level[height - 2][x] === TILES.EMPTY || level[height - 2][x] === TILES.LADDER) {
        level[height - 2][x] = TILES.SPAWN;
        spawnPlaced = true;
      }
    }

    // 6. Get reachable positions and place gold there
    const spawn = getSpawnPosition(level);
    if (spawn) {
      const reachable = getReachablePositions(level, spawn.x, spawn.y);
      const reachableList = Array.from(reachable).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      }).filter(p =>
        level[p.y][p.x] === TILES.EMPTY &&
        p.y < height - 1 &&
        `${p.x},${p.y}` !== `${spawn.x},${spawn.y}`
      );

      // Shuffle and place gold
      const shuffled = reachableList.sort(() => rng() - 0.5);
      const goldToPlace = Math.min(goldCount, shuffled.length);

      for (let i = 0; i < goldToPlace; i++) {
        level[shuffled[i].y][shuffled[i].x] = TILES.GOLD;
      }

      // Place enemies in remaining positions
      const remaining = shuffled.slice(goldToPlace);
      const enemiesToPlace = Math.min(enemyCount, remaining.length);

      for (let i = 0; i < enemiesToPlace; i++) {
        level[remaining[i].y][remaining[i].x] = TILES.ENEMY;
      }
    }

    return level;
  }
}

/**
 * Factory function to create a pre-trained generator
 */
export async function createTrainedGenerator(
  fetchLevels: () => Promise<Level[]>
): Promise<LodeRunnerLevelGenerator> {
  const generator = new LodeRunnerLevelGenerator();
  const levels = await fetchLevels();
  generator.train(levels);
  return generator;
}
