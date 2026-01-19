/**
 * Markov Chain Level Generator for TotalRecall/Meelode
 *
 * Generates new Lode Runner levels using patterns learned from classic levels.
 * Ported from TypeScript markovGenerator.ts
 */

// Tile mapping: Our Markov model uses these characters
// Model output -> TotalRecall format:
//   '.' (empty) -> ' ' (space)
//   'b' (brick) -> '#' (normal brick)
//   'B' (solid) -> '@' (solid brick)
//   '#' (ladder) -> 'H' (ladder)
//   '-' (rope) -> '-' (rope)
// We add after generation:
//   '$' (gold)
//   '0' (guard/enemy)
//   '&' (player)

var MARKOV_TILES = {
    EMPTY: '.',
    BRICK: 'b',
    SOLID: 'B',
    LADDER: '#',
    ROPE: '-'
};

var TOTALRECALL_TILES = {
    EMPTY: ' ',
    BRICK: '#',
    SOLID: '@',
    LADDER: 'H',
    ROPE: '-',
    TRAP: 'X',
    HLADDER: 'S',
    GOLD: '$',
    GUARD: '0',
    PLAYER: '&'
};

// Pre-trained Markov model data (loaded from JSON)
var markovModel = null;

/**
 * Load the pre-trained Markov model
 */
function loadMarkovModel(callback) {
    if (markovModel) {
        if (callback) callback();
        return;
    }

    // Load the model JSON (now in totalrecall folder)
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'markov-model.json', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                markovModel = JSON.parse(xhr.responseText);
                console.log('Markov model loaded with ' + Object.keys(markovModel).length + ' patterns');
                if (callback) callback();
            } else {
                console.error('Failed to load Markov model');
                // Use fallback empty model
                markovModel = {};
                if (callback) callback();
            }
        }
    };
    xhr.send();
}

/**
 * Get context key from surrounding tiles
 */
function getContextKey(above, left, aboveLeft) {
    return (above || 'X') + '|' + (left || 'X') + '|' + (aboveLeft || 'X');
}

/**
 * Sample a tile based on context from the Markov model
 */
function sampleTile(above, left, aboveLeft) {
    var contextKey = getContextKey(above, left, aboveLeft);
    var tileProbs = markovModel[contextKey];

    if (!tileProbs) {
        // Fallback: random with bias toward empty
        var r = Math.random();
        if (r < 0.6) return MARKOV_TILES.EMPTY;
        if (r < 0.8) return MARKOV_TILES.BRICK;
        if (r < 0.9) return MARKOV_TILES.LADDER;
        if (r < 0.95) return MARKOV_TILES.SOLID;
        return MARKOV_TILES.ROPE;
    }

    // Weighted random selection
    var r = Math.random();
    var cumulative = 0;

    for (var tile in tileProbs) {
        cumulative += tileProbs[tile];
        if (r <= cumulative) {
            return tile;
        }
    }

    // Fallback
    return MARKOV_TILES.EMPTY;
}

/**
 * Convert Markov tile to TotalRecall tile
 */
function convertTile(markovTile) {
    switch (markovTile) {
        case '.': return TOTALRECALL_TILES.EMPTY;
        case 'b': return TOTALRECALL_TILES.BRICK;
        case 'B': return TOTALRECALL_TILES.SOLID;
        case '#': return TOTALRECALL_TILES.LADDER;
        case '-': return TOTALRECALL_TILES.ROPE;
        default: return TOTALRECALL_TILES.EMPTY;
    }
}

/**
 * Generate level structure using Markov chain
 */
function generateMarkovStructure() {
    var width = NO_OF_TILES_X;  // 28
    var height = NO_OF_TILES_Y; // 16

    // Create 2D array for generation
    var level = [];
    for (var y = 0; y < height; y++) {
        level[y] = [];
        for (var x = 0; x < width; x++) {
            level[y][x] = MARKOV_TILES.EMPTY;
        }
    }

    // Bottom row is always solid
    for (var x = 0; x < width; x++) {
        level[height - 1][x] = MARKOV_TILES.SOLID;
    }

    // Generate from top-left to bottom-right
    for (var y = 0; y < height - 1; y++) {
        for (var x = 0; x < width; x++) {
            var above = y > 0 ? level[y - 1][x] : null;
            var left = x > 0 ? level[y][x - 1] : null;
            var aboveLeft = (y > 0 && x > 0) ? level[y - 1][x - 1] : null;

            level[y][x] = sampleTile(above, left, aboveLeft);
        }
    }

    return level;
}

/**
 * Post-process to fix structural issues
 */
function postProcessLevel(level) {
    var height = level.length;
    var width = level[0].length;

    // Fix floating ladders - extend them down or remove
    for (var y = 0; y < height - 1; y++) {
        for (var x = 0; x < width; x++) {
            if (level[y][x] === MARKOV_TILES.LADDER) {
                var below = level[y + 1][x];
                if (below === MARKOV_TILES.EMPTY && y < height - 2) {
                    // Extend ladder down
                    if (Math.random() < 0.7) {
                        level[y + 1][x] = MARKOV_TILES.LADDER;
                    } else {
                        level[y][x] = MARKOV_TILES.EMPTY;
                    }
                }
            }

            // Ropes over solid ground are weird
            if (level[y][x] === MARKOV_TILES.ROPE) {
                var below = level[y + 1] ? level[y + 1][x] : null;
                if (below === MARKOV_TILES.BRICK || below === MARKOV_TILES.SOLID) {
                    level[y][x] = Math.random() < 0.5 ? MARKOV_TILES.EMPTY : MARKOV_TILES.LADDER;
                }
            }
        }
    }

    return level;
}

/**
 * Find valid positions for entities (empty space with ground below)
 */
function findValidPositions(level) {
    var positions = [];
    var height = level.length;
    var width = level[0].length;

    for (var y = 0; y < height - 1; y++) {
        for (var x = 0; x < width; x++) {
            var tile = level[y][x];
            var below = level[y + 1][x];

            // Valid if current is empty/ladder and below is solid/brick/ladder
            if ((tile === MARKOV_TILES.EMPTY || tile === MARKOV_TILES.LADDER) &&
                (below === MARKOV_TILES.BRICK || below === MARKOV_TILES.SOLID ||
                 below === MARKOV_TILES.LADDER)) {
                positions.push({ x: x, y: y });
            }
        }
    }

    return positions;
}

/**
 * Place entities (player, guards, gold) on the level
 */
function placeEntities(level, numGold, numGuards) {
    numGold = numGold || 6;
    numGuards = numGuards || 3;

    var positions = findValidPositions(level);

    // Shuffle positions
    for (var i = positions.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = positions[i];
        positions[i] = positions[j];
        positions[j] = temp;
    }

    var placed = { player: false, gold: 0, guards: 0 };
    var usedPositions = [];

    // Place player first (bottom half of level preferred)
    for (var i = 0; i < positions.length; i++) {
        var pos = positions[i];
        if (pos.y > level.length / 2) {
            level[pos.y][pos.x] = '&'; // Player marker (will convert later)
            usedPositions.push(i);
            placed.player = true;
            break;
        }
    }

    // Fallback: place player anywhere
    if (!placed.player && positions.length > 0) {
        var pos = positions[0];
        level[pos.y][pos.x] = '&';
        usedPositions.push(0);
        placed.player = true;
    }

    // Place gold (spread across level)
    for (var i = 0; i < positions.length && placed.gold < numGold; i++) {
        if (usedPositions.indexOf(i) !== -1) continue;

        var pos = positions[i];
        level[pos.y][pos.x] = '$'; // Gold marker
        usedPositions.push(i);
        placed.gold++;
    }

    // Place guards (avoid player start area)
    for (var i = 0; i < positions.length && placed.guards < numGuards; i++) {
        if (usedPositions.indexOf(i) !== -1) continue;

        var pos = positions[i];
        level[pos.y][pos.x] = '0'; // Guard marker
        usedPositions.push(i);
        placed.guards++;
    }

    return level;
}

/**
 * Convert 2D level array to TotalRecall string format
 */
function levelToString(level) {
    var str = '';

    for (var y = 0; y < level.length; y++) {
        for (var x = 0; x < level[y].length; x++) {
            var tile = level[y][x];

            // Convert Markov tiles to TotalRecall format
            if (tile === '&' || tile === '$' || tile === '0') {
                // Entity markers pass through
                str += tile;
            } else {
                str += convertTile(tile);
            }
        }
    }

    return str;
}

/**
 * Generate a complete playable level
 */
function generateMarkovLevel(numGold, numGuards) {
    if (!markovModel) {
        console.error('Markov model not loaded!');
        return null;
    }

    numGold = numGold || 6;
    numGuards = numGuards || 3;

    // Generate structure
    var level = generateMarkovStructure();

    // Post-process for validity
    level = postProcessLevel(level);

    // Place entities
    level = placeEntities(level, numGold, numGuards);

    // Convert to string
    var levelStr = levelToString(level);

    console.log('Generated level with ' + numGold + ' gold and ' + numGuards + ' guards');

    return levelStr;
}

/**
 * Generate multiple levels
 */
function generateMarkovLevels(count, numGold, numGuards) {
    var levels = [];
    for (var i = 0; i < count; i++) {
        levels.push(generateMarkovLevel(numGold, numGuards));
    }
    return levels;
}

// ============================================================================
// A* SOLVABILITY CHECKER
// Ported from TypeScript solvabilityChecker.ts
// ============================================================================

/**
 * Check if position has ground support (can stand there)
 */
function hasGroundSupport(level, x, y) {
    var height = level.length;
    var current = level[y] ? level[y][x] : null;
    var below = (y + 1 < height) ? level[y + 1][x] : null;

    // On a ladder or rope - can stay there
    if (current === MARKOV_TILES.LADDER || current === MARKOV_TILES.ROPE ||
        current === '#' || current === '-') {
        return true;
    }

    // Standing on solid ground (brick, solid, ladder)
    if (below === MARKOV_TILES.BRICK || below === MARKOV_TILES.SOLID ||
        below === MARKOV_TILES.LADDER || below === 'b' || below === 'B' || below === '#') {
        return true;
    }

    return false;
}

/**
 * Check if position is passable
 */
function isPassable(level, x, y, dugPositions) {
    var height = level.length;
    var width = level[0] ? level[0].length : 0;

    if (x < 0 || x >= width || y < 0 || y >= height) return false;

    var tile = level[y][x];

    // Check if this brick was dug
    if (dugPositions && dugPositions[x + ',' + y]) {
        return true;
    }

    // Passable tiles: empty, ladder, rope, gold, player, guard positions
    return tile === MARKOV_TILES.EMPTY || tile === MARKOV_TILES.LADDER ||
           tile === MARKOV_TILES.ROPE || tile === '.' || tile === '#' || tile === '-' ||
           tile === '$' || tile === '&' || tile === '0';
}

/**
 * Check if we can dig at a position
 */
function canDigAt(level, x, y) {
    var height = level.length;
    var width = level[0] ? level[0].length : 0;

    if (x < 0 || x >= width || y < 0 || y >= height) return false;

    var tile = level[y][x];
    return tile === MARKOV_TILES.BRICK || tile === 'b';
}

/**
 * Get valid moves from a position for A* pathfinding
 */
function getValidMoves(level, x, y, dugPositions) {
    var moves = [];
    var height = level.length;
    var width = level[0] ? level[0].length : 0;
    var current = level[y] ? level[y][x] : null;

    var onClimbable = current === MARKOV_TILES.LADDER || current === MARKOV_TILES.ROPE ||
                      current === '#' || current === '-';
    var hasSupport = hasGroundSupport(level, x, y);

    // If falling (no support and not on climbable), must fall
    if (!hasSupport && !onClimbable) {
        var landY = y + 1;
        while (landY < height) {
            if (!isPassable(level, x, landY, dugPositions)) {
                moves.push({ x: x, y: landY - 1 });
                break;
            }
            var below = level[landY][x];
            if (below === MARKOV_TILES.LADDER || below === MARKOV_TILES.ROPE ||
                below === '#' || below === '-') {
                moves.push({ x: x, y: landY });
                break;
            }
            landY++;
        }
        return moves;
    }

    // Move left
    if (x > 0 && isPassable(level, x - 1, y, dugPositions)) {
        moves.push({ x: x - 1, y: y });
    }

    // Move right
    if (x < width - 1 && isPassable(level, x + 1, y, dugPositions)) {
        moves.push({ x: x + 1, y: y });
    }

    // Climb up (only on ladder)
    if ((current === MARKOV_TILES.LADDER || current === '#') &&
        y > 0 && isPassable(level, x, y - 1, dugPositions)) {
        moves.push({ x: x, y: y - 1 });
    }

    // Climb down
    if (y < height - 1) {
        var below = level[y + 1][x];
        if (below === MARKOV_TILES.LADDER || below === '#' || dugPositions[x + ',' + (y + 1)]) {
            moves.push({ x: x, y: y + 1 });
        } else if ((current === MARKOV_TILES.LADDER || current === '#') &&
                   isPassable(level, x, y + 1, dugPositions)) {
            moves.push({ x: x, y: y + 1 });
        }
    }

    // Dig left
    if (hasSupport && x > 0) {
        var digX = x - 1;
        var digY = y + 1;
        if (digY < height && canDigAt(level, digX, digY) && !dugPositions[digX + ',' + digY]) {
            moves.push({ x: x - 1, y: y, dig: { x: digX, y: digY } });
        }
    }

    // Dig right
    if (hasSupport && x < width - 1) {
        var digX = x + 1;
        var digY = y + 1;
        if (digY < height && canDigAt(level, digX, digY) && !dugPositions[digX + ',' + digY]) {
            moves.push({ x: x + 1, y: y, dig: { x: digX, y: digY } });
        }
    }

    return moves;
}

/**
 * Get all reachable positions from a starting point using BFS
 */
function getReachablePositions(level, startX, startY, maxIterations) {
    maxIterations = maxIterations || 50000;

    var reachable = {};
    var queue = [{ x: startX, y: startY, dugPositions: {} }];
    var visited = {};
    var iterations = 0;

    while (queue.length > 0 && iterations < maxIterations) {
        iterations++;
        var current = queue.shift();
        var key = current.x + ',' + current.y;

        if (visited[key]) continue;
        visited[key] = true;
        reachable[key] = true;

        var moves = getValidMoves(level, current.x, current.y, current.dugPositions);

        for (var i = 0; i < moves.length; i++) {
            var move = moves[i];
            var moveKey = move.x + ',' + move.y;
            if (!visited[moveKey]) {
                var newDugPositions = {};
                for (var k in current.dugPositions) {
                    newDugPositions[k] = true;
                }
                if (move.dig) {
                    newDugPositions[move.dig.x + ',' + move.dig.y] = true;
                }
                queue.push({ x: move.x, y: move.y, dugPositions: newDugPositions });
            }
        }
    }

    return reachable;
}

/**
 * Find player spawn position in level
 */
function findPlayerPosition(level) {
    for (var y = 0; y < level.length; y++) {
        for (var x = 0; x < level[y].length; x++) {
            if (level[y][x] === '&') {
                return { x: x, y: y };
            }
        }
    }
    return null;
}

/**
 * Find all gold positions in level
 */
function findGoldPositions(level) {
    var positions = [];
    for (var y = 0; y < level.length; y++) {
        for (var x = 0; x < level[y].length; x++) {
            if (level[y][x] === '$') {
                positions.push({ x: x, y: y });
            }
        }
    }
    return positions;
}

/**
 * Check if level is solvable (all gold reachable from player start)
 */
function isLevelSolvable(level) {
    var playerPos = findPlayerPosition(level);
    if (!playerPos) {
        console.log('Solvability check: No player position found');
        return false;
    }

    var goldPositions = findGoldPositions(level);
    if (goldPositions.length === 0) {
        console.log('Solvability check: No gold found');
        return false;
    }

    // Get all reachable positions from player start
    var reachable = getReachablePositions(level, playerPos.x, playerPos.y);

    // Check if all gold is reachable
    var unreachableGold = 0;
    for (var i = 0; i < goldPositions.length; i++) {
        var gold = goldPositions[i];
        if (!reachable[gold.x + ',' + gold.y]) {
            unreachableGold++;
        }
    }

    if (unreachableGold > 0) {
        console.log('Solvability check: ' + unreachableGold + ' of ' + goldPositions.length + ' gold unreachable');
        return false;
    }

    console.log('Solvability check: PASSED - all ' + goldPositions.length + ' gold reachable');
    return true;
}

/**
 * Generate a verified solvable level (retries until solvable)
 */
function generateSolvableLevel(numGold, numGuards, maxAttempts) {
    if (!markovModel) {
        console.error('Markov model not loaded!');
        return null;
    }

    numGold = numGold || 6;
    numGuards = numGuards || 3;
    maxAttempts = maxAttempts || 20;

    for (var attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log('Generation attempt ' + attempt + '/' + maxAttempts);

        // Generate structure
        var level = generateMarkovStructure();

        // Post-process for validity
        level = postProcessLevel(level);

        // Place entities
        level = placeEntities(level, numGold, numGuards);

        // Check solvability
        if (isLevelSolvable(level)) {
            console.log('Generated solvable level on attempt ' + attempt);
            return levelToString(level);
        }
    }

    console.warn('Could not generate solvable level after ' + maxAttempts + ' attempts, returning last attempt');

    // Return last generated level anyway
    var level = generateMarkovStructure();
    level = postProcessLevel(level);
    level = placeEntities(level, numGold, numGuards);
    return levelToString(level);
}
