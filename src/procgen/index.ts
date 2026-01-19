/**
 * Lode Runner Procedural Level Generation
 *
 * This module provides tools for procedurally generating Lode Runner-style levels
 * using Markov chains trained on existing levels, with A* pathfinding validation
 * to ensure all generated levels are solvable.
 *
 * Usage:
 * ```typescript
 * import {
 *   LodeRunnerLevelGenerator,
 *   getSampleLevels,
 *   levelToString,
 *   validateLevel
 * } from './procgen';
 *
 * // Create and train generator
 * const generator = new LodeRunnerLevelGenerator();
 * generator.train(getSampleLevels());
 *
 * // Generate a level
 * const result = generator.generate({ goldCount: 8, enemyCount: 3 });
 * console.log(levelToString(result.level));
 * console.log(`Valid: ${result.validation.valid}, Attempts: ${result.attempts}`);
 * ```
 */

// Types
export * from './types';

// Level parsing utilities
export {
  parseLevel,
  levelToString,
  findTiles,
  getSpawnPosition,
  getGoldPositions,
  getEnemyPositions,
  getTile,
  setTile,
  createEmptyLevel,
  cloneLevel,
  normalizeLevel,
  fetchVGLCLevels,
  getSampleLevels,
  SAMPLE_LEVELS,
} from './levelParser';

// Solvability checking
export {
  validateLevel,
  validateLevelFull,
  isSolvable,
  isFullySolvable,
  canSolveLevel,
  getReachablePositions,
} from './solvabilityChecker';

// Generators
export {
  MarkovLevelGenerator,
  PatternMarkovGenerator,
} from './markovGenerator';

export {
  LodeRunnerLevelGenerator,
  ConstructiveLevelGenerator,
  createTrainedGenerator,
  type GenerationResult,
} from './levelGenerator';
