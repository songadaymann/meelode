/**
 * Solvability Checker - A* pathfinding to verify level is completable
 *
 * Lode Runner movement rules:
 * - Can walk left/right on solid ground (brick, solid block) or while on ladder/rope
 * - Can climb up/down ladders
 * - Can move along ropes (hanging)
 * - Falls when in empty space (not on ladder/rope/ground)
 * - Can dig bricks (not solid blocks) to create temporary holes
 *
 * Full solvability means:
 * 1. All gold is reachable from spawn
 * 2. After collecting all gold, the escape point (top of level) is reachable
 *
 * This uses a state-space A* where state = (position, collected gold set)
 */

import { Level, TileChar, TILES, TILE_PROPERTIES, Position, ValidationResult, LEVEL_WIDTH } from './types';
import { getTile, getSpawnPosition, getGoldPositions, cloneLevel } from './levelParser';

interface Node {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // total cost
  parent: Node | null;
  // Track if we dug to get here (simplified - full would track all dug positions)
  dugPositions: Set<string>;
}

/**
 * Check if a position has ground support (can stand there)
 */
function hasGroundSupport(level: Level, x: number, y: number): boolean {
  const below = getTile(level, x, y + 1);
  const current = getTile(level, x, y);

  // On a ladder or rope - can stay there
  if (current === TILES.LADDER || current === TILES.ROPE) {
    return true;
  }

  // Standing on solid ground
  if (below && TILE_PROPERTIES[below]?.ground) {
    return true;
  }

  // Standing on a ladder (can stand on top of ladder)
  if (below === TILES.LADDER) {
    return true;
  }

  return false;
}

/**
 * Check if position is passable (can move through)
 */
function isPassable(level: Level, x: number, y: number, dugPositions: Set<string>): boolean {
  const tile = getTile(level, x, y);
  if (tile === null) return false;

  // Check if this brick was dug
  if (dugPositions.has(`${x},${y}`)) {
    return true;
  }

  return TILE_PROPERTIES[tile]?.passable ?? false;
}

/**
 * Check if we can dig at a position
 */
function canDig(level: Level, x: number, y: number): boolean {
  const tile = getTile(level, x, y);
  return tile === TILES.BRICK;
}

/**
 * Get valid moves from a position
 * Returns array of {x, y, dig?: {x, y}} where dig is optional position to dig
 */
function getValidMoves(
  level: Level,
  x: number,
  y: number,
  dugPositions: Set<string>
): Array<{ x: number; y: number; dig?: Position }> {
  const moves: Array<{ x: number; y: number; dig?: Position }> = [];
  const current = getTile(level, x, y);
  const height = level.length;
  const width = level[0]?.length || 0;

  // Check if we're on ladder/rope (can move freely)
  const onClimbable = current === TILES.LADDER || current === TILES.ROPE;
  const hasSupport = hasGroundSupport(level, x, y);

  // If we're falling (no support and not on climbable), we must fall
  if (!hasSupport && !onClimbable) {
    // Find where we land
    let landY = y + 1;
    while (landY < height) {
      const below = getTile(level, x, landY);
      if (!isPassable(level, x, landY, dugPositions)) {
        // Land on top of this
        moves.push({ x, y: landY - 1 });
        break;
      }
      if (below === TILES.LADDER || below === TILES.ROPE) {
        // Grab the ladder/rope
        moves.push({ x, y: landY });
        break;
      }
      landY++;
    }
    return moves; // Can only fall, no other moves
  }

  // Move left
  if (x > 0 && isPassable(level, x - 1, y, dugPositions)) {
    // Check if we can actually move there (need support or will fall to valid spot)
    moves.push({ x: x - 1, y });
  }

  // Move right
  if (x < width - 1 && isPassable(level, x + 1, y, dugPositions)) {
    moves.push({ x: x + 1, y });
  }

  // Climb up (only on ladder)
  if (current === TILES.LADDER && y > 0 && isPassable(level, x, y - 1, dugPositions)) {
    moves.push({ x, y: y - 1 });
  }

  // Climb down (on ladder, or drop down through rope)
  if (y < height - 1) {
    const below = getTile(level, x, y + 1);
    if (below === TILES.LADDER || dugPositions.has(`${x},${y + 1}`)) {
      moves.push({ x, y: y + 1 });
    } else if (current === TILES.LADDER && isPassable(level, x, y + 1, dugPositions)) {
      moves.push({ x, y: y + 1 });
    }
  }

  // Dig left (if on ground and brick to the lower-left)
  if (hasSupport && x > 0) {
    const digX = x - 1;
    const digY = y + 1;
    if (digY < height && canDig(level, digX, digY) && !dugPositions.has(`${digX},${digY}`)) {
      // Can dig and then potentially move into that space or use it
      moves.push({ x: x - 1, y, dig: { x: digX, y: digY } });
    }
  }

  // Dig right
  if (hasSupport && x < width - 1) {
    const digX = x + 1;
    const digY = y + 1;
    if (digY < height && canDig(level, digX, digY) && !dugPositions.has(`${digX},${digY}`)) {
      moves.push({ x: x + 1, y, dig: { x: digX, y: digY } });
    }
  }

  return moves;
}

/**
 * Manhattan distance heuristic
 */
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * A* pathfinding to check if a position is reachable from start
 */
function canReach(
  level: Level,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  maxIterations: number = 10000
): boolean {
  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, goalX, goalY),
    f: heuristic(startX, startY, goalX, goalY),
    parent: null,
    dugPositions: new Set(),
  };

  openSet.push(startNode);
  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    // Check if reached goal
    if (current.x === goalX && current.y === goalY) {
      return true;
    }

    // Create state key (position + relevant dug positions)
    const stateKey = `${current.x},${current.y}`;
    if (closedSet.has(stateKey)) continue;
    closedSet.add(stateKey);

    // Get valid moves
    const moves = getValidMoves(level, current.x, current.y, current.dugPositions);

    for (const move of moves) {
      const moveKey = `${move.x},${move.y}`;
      if (closedSet.has(moveKey)) continue;

      // Copy dug positions and add new dig if applicable
      const newDugPositions = new Set(current.dugPositions);
      if (move.dig) {
        newDugPositions.add(`${move.dig.x},${move.dig.y}`);
      }

      const g = current.g + 1;
      const h = heuristic(move.x, move.y, goalX, goalY);

      const newNode: Node = {
        x: move.x,
        y: move.y,
        g,
        h,
        f: g + h,
        parent: current,
        dugPositions: newDugPositions,
      };

      openSet.push(newNode);
    }
  }

  return false;
}

/**
 * Find all reachable positions from a starting point using BFS
 * This is useful for checking overall level connectivity
 */
export function getReachablePositions(
  level: Level,
  startX: number,
  startY: number,
  maxIterations: number = 50000
): Set<string> {
  const reachable = new Set<string>();
  const queue: Array<{ x: number; y: number; dugPositions: Set<string> }> = [];
  const visited = new Set<string>();

  queue.push({ x: startX, y: startY, dugPositions: new Set() });
  let iterations = 0;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;

    if (visited.has(key)) continue;
    visited.add(key);
    reachable.add(key);

    const moves = getValidMoves(level, current.x, current.y, current.dugPositions);

    for (const move of moves) {
      const moveKey = `${move.x},${move.y}`;
      if (!visited.has(moveKey)) {
        const newDugPositions = new Set(current.dugPositions);
        if (move.dig) {
          newDugPositions.add(`${move.dig.x},${move.dig.y}`);
        }
        queue.push({ x: move.x, y: move.y, dugPositions: newDugPositions });
      }
    }
  }

  return reachable;
}

/**
 * Validate a level - check if all gold is reachable from spawn
 */
export function validateLevel(level: Level): ValidationResult {
  const issues: string[] = [];
  const spawn = getSpawnPosition(level);
  const goldPositions = getGoldPositions(level);

  if (!spawn) {
    return {
      valid: false,
      reachableGold: [],
      unreachableGold: goldPositions,
      spawnPosition: null,
      issues: ['No spawn position (M) found in level'],
    };
  }

  // Check if spawn has valid support
  if (!hasGroundSupport(level, spawn.x, spawn.y)) {
    const onClimbable = getTile(level, spawn.x, spawn.y) === TILES.LADDER ||
                        getTile(level, spawn.x, spawn.y) === TILES.ROPE;
    if (!onClimbable) {
      issues.push(`Spawn position (${spawn.x}, ${spawn.y}) has no ground support`);
    }
  }

  if (goldPositions.length === 0) {
    issues.push('No gold (G) found in level');
  }

  // Get all reachable positions from spawn
  const reachable = getReachablePositions(level, spawn.x, spawn.y);

  const reachableGold: Position[] = [];
  const unreachableGold: Position[] = [];

  for (const gold of goldPositions) {
    if (reachable.has(`${gold.x},${gold.y}`)) {
      reachableGold.push(gold);
    } else {
      unreachableGold.push(gold);
      issues.push(`Gold at (${gold.x}, ${gold.y}) is unreachable`);
    }
  }

  return {
    valid: unreachableGold.length === 0 && issues.length === 0,
    reachableGold,
    unreachableGold,
    spawnPosition: spawn,
    issues,
  };
}

/**
 * Quick solvability check - just returns true/false
 */
export function isSolvable(level: Level): boolean {
  return validateLevel(level).valid;
}

// ============================================================================
// FULL SOLVABILITY CHECKER (Collect all gold AND escape)
// ============================================================================

/**
 * State for the full solver - includes position and which gold has been collected
 */
interface FullState {
  x: number;
  y: number;
  collectedGold: number; // Bitmask of collected gold indices
  dugPositions: Set<string>;
}

interface FullNode extends FullState {
  g: number;
  h: number;
  f: number;
  parent: FullNode | null;
}

/**
 * Create a unique key for a state (for visited set)
 * We include position and collected gold bitmask
 */
function stateKey(state: FullState): string {
  return `${state.x},${state.y},${state.collectedGold}`;
}

/**
 * Heuristic for full solver:
 * - Distance to nearest uncollected gold (if any remain)
 * - Plus estimated distance from there to escape
 *
 * For escape, we use distance to top row (y=0)
 */
function fullHeuristic(
  x: number,
  y: number,
  collectedGold: number,
  goldPositions: Position[],
  escapePositions: Position[]
): number {
  // If all gold collected, heuristic is distance to nearest escape
  if (collectedGold === (1 << goldPositions.length) - 1) {
    let minDist = Infinity;
    for (const escape of escapePositions) {
      const dist = Math.abs(x - escape.x) + Math.abs(y - escape.y);
      minDist = Math.min(minDist, dist);
    }
    return minDist === Infinity ? 0 : minDist;
  }

  // Find nearest uncollected gold
  let minGoldDist = Infinity;
  let nearestGold: Position | null = null;

  for (let i = 0; i < goldPositions.length; i++) {
    if (!(collectedGold & (1 << i))) {
      const dist = Math.abs(x - goldPositions[i].x) + Math.abs(y - goldPositions[i].y);
      if (dist < minGoldDist) {
        minGoldDist = dist;
        nearestGold = goldPositions[i];
      }
    }
  }

  if (!nearestGold) return 0;

  // Add minimum distance from any uncollected gold to escape
  // This is an admissible heuristic (never overestimates)
  let minEscapeDist = Infinity;
  for (const escape of escapePositions) {
    for (let i = 0; i < goldPositions.length; i++) {
      if (!(collectedGold & (1 << i))) {
        const dist = Math.abs(goldPositions[i].x - escape.x) + Math.abs(goldPositions[i].y - escape.y);
        minEscapeDist = Math.min(minEscapeDist, dist);
      }
    }
  }

  return minGoldDist + (minEscapeDist === Infinity ? 0 : minEscapeDist);
}

/**
 * Find escape positions - ladders that reach the top row
 * In classic Lode Runner, escape ladder appears after all gold collected,
 * but for validation we check if there ARE ladders at the top
 */
function findEscapePositions(level: Level): Position[] {
  const escapes: Position[] = [];
  const width = level[0]?.length || 0;

  // Look for ladders in the top few rows that could serve as escape
  for (let x = 0; x < width; x++) {
    // Check if there's a ladder at top row or accessible from top
    if (getTile(level, x, 0) === TILES.LADDER) {
      escapes.push({ x, y: 0 });
    }
    // Also accept empty spaces at top if there's a ladder below
    // (player can climb ladder and exit at top)
    else if (getTile(level, x, 0) === TILES.EMPTY && getTile(level, x, 1) === TILES.LADDER) {
      escapes.push({ x, y: 0 });
    }
  }

  // If no ladders at top, accept any position at top row that's reachable
  // (for levels that don't have traditional escape ladders)
  if (escapes.length === 0) {
    for (let x = 0; x < width; x++) {
      const tile = getTile(level, x, 0);
      if (tile === TILES.EMPTY || tile === TILES.ROPE || tile === TILES.LADDER) {
        escapes.push({ x, y: 0 });
      }
    }
  }

  return escapes;
}

/**
 * Full A* solver that finds a path to collect all gold and escape
 *
 * State space: (x, y, collected_gold_bitmask)
 * This can be large but is bounded by: positions * 2^gold_count
 *
 * For 28x16 level with 6 gold: 448 * 64 = 28,672 max states
 */
export function canSolveLevel(
  level: Level,
  maxIterations: number = 100000
): { solvable: boolean; reason?: string } {
  const spawn = getSpawnPosition(level);
  if (!spawn) {
    return { solvable: false, reason: 'No spawn position' };
  }

  const goldPositions = getGoldPositions(level);
  if (goldPositions.length === 0) {
    return { solvable: false, reason: 'No gold in level' };
  }

  // Limit gold count to prevent combinatorial explosion
  if (goldPositions.length > 16) {
    // Fall back to basic reachability check
    const result = validateLevel(level);
    return { solvable: result.valid, reason: result.valid ? undefined : 'Too many gold pieces for full solve check' };
  }

  const escapePositions = findEscapePositions(level);
  if (escapePositions.length === 0) {
    return { solvable: false, reason: 'No escape positions at top of level' };
  }

  const allGoldMask = (1 << goldPositions.length) - 1;

  // Create gold position lookup for quick collection check
  const goldAtPosition = new Map<string, number>();
  goldPositions.forEach((pos, idx) => {
    goldAtPosition.set(`${pos.x},${pos.y}`, idx);
  });

  // Escape position lookup
  const escapeSet = new Set<string>();
  escapePositions.forEach(pos => escapeSet.add(`${pos.x},${pos.y}`));

  // A* open and closed sets
  const openSet: FullNode[] = [];
  const visited = new Set<string>();

  const startH = fullHeuristic(spawn.x, spawn.y, 0, goldPositions, escapePositions);
  const startNode: FullNode = {
    x: spawn.x,
    y: spawn.y,
    collectedGold: 0,
    dugPositions: new Set(),
    g: 0,
    h: startH,
    f: startH,
    parent: null,
  };

  // Check if spawn is on gold
  const spawnGoldIdx = goldAtPosition.get(`${spawn.x},${spawn.y}`);
  if (spawnGoldIdx !== undefined) {
    startNode.collectedGold = 1 << spawnGoldIdx;
  }

  openSet.push(startNode);

  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Get node with lowest f score (simple sort - could use heap for efficiency)
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    // Check win condition: all gold collected AND at escape position
    if (current.collectedGold === allGoldMask && escapeSet.has(`${current.x},${current.y}`)) {
      return { solvable: true };
    }

    const key = stateKey(current);
    if (visited.has(key)) continue;
    visited.add(key);

    // Get valid moves
    const moves = getValidMoves(level, current.x, current.y, current.dugPositions);

    for (const move of moves) {
      // Calculate new gold collection state
      let newCollected = current.collectedGold;
      const goldIdx = goldAtPosition.get(`${move.x},${move.y}`);
      if (goldIdx !== undefined) {
        newCollected |= (1 << goldIdx);
      }

      // Copy dug positions
      const newDugPositions = new Set(current.dugPositions);
      if (move.dig) {
        newDugPositions.add(`${move.dig.x},${move.dig.y}`);
      }

      const newState: FullState = {
        x: move.x,
        y: move.y,
        collectedGold: newCollected,
        dugPositions: newDugPositions,
      };

      const newKey = stateKey(newState);
      if (visited.has(newKey)) continue;

      const g = current.g + 1;
      const h = fullHeuristic(move.x, move.y, newCollected, goldPositions, escapePositions);

      const newNode: FullNode = {
        ...newState,
        g,
        h,
        f: g + h,
        parent: current,
      };

      openSet.push(newNode);
    }
  }

  if (iterations >= maxIterations) {
    return { solvable: false, reason: `Search exceeded ${maxIterations} iterations` };
  }

  return { solvable: false, reason: 'No path found to collect all gold and escape' };
}

/**
 * Enhanced validation that checks full solvability
 */
export function validateLevelFull(level: Level): ValidationResult & { canEscape: boolean; escapePositions: Position[] } {
  // First do basic validation
  const basicResult = validateLevel(level);

  // Find escape positions
  const escapePositions = findEscapePositions(level);

  // If basic validation fails, don't bother with full solve
  if (!basicResult.valid) {
    return {
      ...basicResult,
      canEscape: false,
      escapePositions,
    };
  }

  // Try full solve
  const solveResult = canSolveLevel(level);

  if (!solveResult.solvable) {
    return {
      ...basicResult,
      valid: false,
      canEscape: false,
      escapePositions,
      issues: [...basicResult.issues, solveResult.reason || 'Cannot complete level'],
    };
  }

  return {
    ...basicResult,
    valid: true,
    canEscape: true,
    escapePositions,
  };
}

/**
 * Quick full solvability check
 */
export function isFullySolvable(level: Level): boolean {
  return canSolveLevel(level).solvable;
}
