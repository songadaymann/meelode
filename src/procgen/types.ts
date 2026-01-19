/**
 * Lode Runner Procedural Level Generation
 * Type definitions
 */

// Tile types matching VGLC format
export const TILES = {
  EMPTY: '.',
  BRICK: 'b',      // diggable
  SOLID: 'B',      // not diggable
  LADDER: '#',
  ROPE: '-',
  GOLD: 'G',
  ENEMY: 'E',
  SPAWN: 'M',
} as const;

export type TileChar = typeof TILES[keyof typeof TILES];

export interface TileProperties {
  solid: boolean;
  passable: boolean;
  climbable: boolean;
  diggable: boolean;
  ground: boolean;
}

export const TILE_PROPERTIES: Record<TileChar, TileProperties> = {
  '.': { solid: false, passable: true, climbable: false, diggable: false, ground: false },
  'b': { solid: true, passable: false, climbable: false, diggable: true, ground: true },
  'B': { solid: true, passable: false, climbable: false, diggable: false, ground: true },
  '#': { solid: false, passable: true, climbable: true, diggable: false, ground: false },
  '-': { solid: false, passable: true, climbable: true, diggable: false, ground: false },
  'G': { solid: false, passable: true, climbable: false, diggable: false, ground: false },
  'E': { solid: false, passable: true, climbable: false, diggable: false, ground: false },
  'M': { solid: false, passable: true, climbable: false, diggable: false, ground: false },
};

// Level dimensions - Apple II / Arduboy format (28x16)
// This matches the original Lode Runner and our training dataset
export const LEVEL_WIDTH = 28;
export const LEVEL_HEIGHT = 16;

export type Level = TileChar[][];

export interface Position {
  x: number;
  y: number;
}

export interface GeneratorConfig {
  width?: number;
  height?: number;
  goldCount?: number;
  enemyCount?: number;
  // Markov chain order (1 = bigram, 2 = trigram, etc.)
  markovOrder?: number;
}

export interface ValidationResult {
  valid: boolean;
  reachableGold: Position[];
  unreachableGold: Position[];
  spawnPosition: Position | null;
  issues: string[];
}
