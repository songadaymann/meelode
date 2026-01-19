/**
 * Level Parser - Load and parse VGLC Lode Runner levels
 */

import { Level, TileChar, TILES, LEVEL_WIDTH, LEVEL_HEIGHT, Position } from './types';

/**
 * Parse a level string (newline-separated rows) into a 2D array
 */
export function parseLevel(levelString: string): Level {
  const lines = levelString.trim().split('\n');
  return lines.map(line => [...line] as TileChar[]);
}

/**
 * Convert a level back to string format
 */
export function levelToString(level: Level): string {
  return level.map(row => row.join('')).join('\n');
}

/**
 * Find all positions of a specific tile type
 */
export function findTiles(level: Level, tile: TileChar): Position[] {
  const positions: Position[] = [];
  for (let y = 0; y < level.length; y++) {
    for (let x = 0; x < level[y].length; x++) {
      if (level[y][x] === tile) {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}

/**
 * Get the spawn position (M tile)
 */
export function getSpawnPosition(level: Level): Position | null {
  const spawns = findTiles(level, TILES.SPAWN);
  return spawns.length > 0 ? spawns[0] : null;
}

/**
 * Get all gold positions
 */
export function getGoldPositions(level: Level): Position[] {
  return findTiles(level, TILES.GOLD);
}

/**
 * Get all enemy positions
 */
export function getEnemyPositions(level: Level): Position[] {
  return findTiles(level, TILES.ENEMY);
}

/**
 * Get tile at position (with bounds checking)
 */
export function getTile(level: Level, x: number, y: number): TileChar | null {
  if (y < 0 || y >= level.length || x < 0 || x >= level[y].length) {
    return null;
  }
  return level[y][x];
}

/**
 * Set tile at position (returns new level, immutable)
 */
export function setTile(level: Level, x: number, y: number, tile: TileChar): Level {
  const newLevel = level.map(row => [...row]);
  if (y >= 0 && y < newLevel.length && x >= 0 && x < newLevel[y].length) {
    newLevel[y][x] = tile;
  }
  return newLevel;
}

/**
 * Create an empty level filled with a specific tile
 */
export function createEmptyLevel(
  width: number = LEVEL_WIDTH,
  height: number = LEVEL_HEIGHT,
  fillTile: TileChar = TILES.EMPTY
): Level {
  return Array(height).fill(null).map(() => Array(width).fill(fillTile));
}

/**
 * Clone a level (deep copy)
 */
export function cloneLevel(level: Level): Level {
  return level.map(row => [...row]);
}

/**
 * Get level dimensions
 */
export function getLevelDimensions(level: Level): { width: number; height: number } {
  return {
    width: level[0]?.length || 0,
    height: level.length,
  };
}

/**
 * Normalize level - strip entities (G, E, M) to get base structure
 * Useful for training on structure only
 */
export function normalizeLevel(level: Level): Level {
  return level.map(row =>
    row.map(tile => {
      if (tile === TILES.GOLD || tile === TILES.ENEMY || tile === TILES.SPAWN) {
        return TILES.EMPTY;
      }
      return tile;
    })
  );
}

/**
 * Fetch all VGLC levels from GitHub
 */
export async function fetchVGLCLevels(count: number = 150): Promise<Level[]> {
  const levels: Level[] = [];
  const baseUrl = 'https://raw.githubusercontent.com/TheVGLC/TheVGLC/master/Lode%20Runner/Processed/';

  for (let i = 1; i <= count; i++) {
    try {
      const response = await fetch(`${baseUrl}Level%20${i}.txt`);
      if (response.ok) {
        const text = await response.text();
        levels.push(parseLevel(text));
      }
    } catch (e) {
      console.warn(`Failed to fetch level ${i}:`, e);
    }
  }

  return levels;
}

/**
 * Embedded sample levels for offline use / testing
 * (First 5 VGLC levels)
 */
export const SAMPLE_LEVELS: string[] = [
  `................................
..E.G...........................
bBBbBBbBBBb#bbbbbbB.............
...........#-----------.........
...........#....bb#.............
...........#..E.bb#......G......
...........#....bb#...bbbbb#bbbb
...........#....bb#........#....
...........#....bb#........#....
...........#....bb#.......G#....
bbb#bbbbbbbb....bbbbbbbb#bbbbbbb
...#....................#.......
...#....................#.......
...#....................#.......
bbbbbbbbbbbbbb#bbbbbbbbb#.......
..............#.........#.......
..............#.........#.......
..........E.G.#---------#..G.E..
......#bbbbbbbbb........bbbbbbb#
......#........................#
......#..........M..G..........#
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`,

  `...G...........................#
#BBbBB#........................#
#.....#...............G........#
#.....#......#bbbbbbbbbbb#.....#
#.G.E.#......#...........#.G...#
#bBbBb#......#...........#bbbbb#
#.....#---...#...........#......
#.....#......#...........#......
#.....#------#-------...E#......
#.....#......#......#bbbbBBBBBB#
#.....#......#......#..........#
#.....#......#..G...#..........#
#...E.#.G....#bbbbbb#..........#
BBbbbBbBBbbBB#.................#
BbbbBB.......#..........#bbbb#bb
B...BB.......#..........#....#..
BG..BB.......#...-------#....#.G
bbbbbbbbb#bbbbBBBB......#...bbbb
.........#..............#.......
.........#..............#.......
.........#......M.......#.......
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`,

  `................................
.......G...G....................
bbbbbbbbbbbbbbbbbbbbbbb#bbbbbbbb
......................E#........
......................b#........
......................b#........
.......G..............b#..G.....
#bbbbbbbbbbbbbbbbbbbbbbb........
#...........................E...
#...............................
#bbbbb#..........E......#bbbbbb#
.....b#.................#b......
.....b#.................#b......
.....b#.......G.........#b......
#bbbbbbbbbbbbbbbbbbbbbbbbbbbbb..
#...............................
#.......E.......................
#...........G...................
bbbbbbb#bbbbbbbbbbbbbbbbbbbbbbbb
.......#........................
....M..#........................
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`,
];

/**
 * Get sample levels as parsed Level objects
 */
export function getSampleLevels(): Level[] {
  return SAMPLE_LEVELS.map(parseLevel);
}
