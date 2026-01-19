/**
 * Train Markov model from all TotalRecall level packs
 *
 * Extracts levels from:
 * - classicData (150 levels)
 * - proData (150 levels)
 * - fanBookData (~90 levels)
 * - revengeData (~30 levels)
 * - championData (~50 levels)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEVEL_WIDTH = 28;
const LEVEL_HEIGHT = 16;

// Tile mappings from TotalRecall to our Markov format
const TILE_MAP = {
    ' ': '.',   // Empty
    '#': 'b',   // Brick (diggable)
    '@': 'B',   // Solid brick (not diggable)
    'H': '#',   // Ladder
    '-': '-',   // Rope/bar
    'X': 'b',   // Trap (treat as brick for structure)
    'S': '#',   // Hidden ladder (treat as ladder for structure)
    '$': '.',   // Gold (empty for structure)
    '0': '.',   // Guard (empty for structure)
    '&': '.',   // Player (empty for structure)
};

/**
 * Parse a TotalRecall level string into 2D array
 */
function parseLevel(levelStr) {
    const level = [];
    for (let y = 0; y < LEVEL_HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < LEVEL_WIDTH; x++) {
            const idx = y * LEVEL_WIDTH + x;
            const char = levelStr[idx] || ' ';
            row.push(TILE_MAP[char] || '.');
        }
        level.push(row);
    }
    return level;
}

/**
 * Extract level data array from JS file content
 */
function extractLevels(jsContent, varName) {
    // Find the array declaration
    const regex = new RegExp(`var ${varName} = \\[([\\s\\S]*?)\\];`, 'm');
    const match = jsContent.match(regex);

    if (!match) {
        console.error(`Could not find ${varName} in file`);
        return [];
    }

    const arrayContent = match[1];

    // Extract all string literals (level data)
    const levels = [];
    const stringRegex = /"([^"]+)"/g;
    let stringMatch;
    let currentLevel = '';

    while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
        currentLevel += stringMatch[1];

        // Check if we have a complete level (28*16 = 448 chars)
        if (currentLevel.length >= LEVEL_WIDTH * LEVEL_HEIGHT) {
            levels.push(currentLevel.substring(0, LEVEL_WIDTH * LEVEL_HEIGHT));
            currentLevel = '';
        }
    }

    return levels;
}

/**
 * Get context key for Markov model
 */
function getContextKey(above, left, aboveLeft) {
    return `${above || 'X'}|${left || 'X'}|${aboveLeft || 'X'}`;
}

/**
 * Train Markov model on levels
 */
function trainMarkov(levels) {
    const transitions = {};

    for (const levelStr of levels) {
        const level = parseLevel(levelStr);

        for (let y = 0; y < LEVEL_HEIGHT; y++) {
            for (let x = 0; x < LEVEL_WIDTH; x++) {
                const tile = level[y][x];
                const above = y > 0 ? level[y - 1][x] : null;
                const left = x > 0 ? level[y][x - 1] : null;
                const aboveLeft = (y > 0 && x > 0) ? level[y - 1][x - 1] : null;

                const contextKey = getContextKey(above, left, aboveLeft);

                if (!transitions[contextKey]) {
                    transitions[contextKey] = {};
                }

                transitions[contextKey][tile] = (transitions[contextKey][tile] || 0) + 1;
            }
        }
    }

    // Normalize to probabilities
    for (const contextKey in transitions) {
        const tileCounts = transitions[contextKey];
        let total = 0;
        for (const tile in tileCounts) {
            total += tileCounts[tile];
        }
        for (const tile in tileCounts) {
            tileCounts[tile] = tileCounts[tile] / total;
        }
    }

    return transitions;
}

async function main() {
    const totalRecallDir = path.join(__dirname, '../totalrecall');

    const levelFiles = [
        { file: 'lodeRunner.v.classic.js', varName: 'classicData' },
        { file: 'lodeRunner.v.professional.js', varName: 'proData' },
        { file: 'lodeRunner.v.fanBookMod.js', varName: 'fanBookData' },
        { file: 'lodeRunner.v.revenge.js', varName: 'revengeData' },
        { file: 'lodeRunner.v.championship.js', varName: 'championData' },
    ];

    let allLevels = [];

    for (const { file, varName } of levelFiles) {
        const filePath = path.join(totalRecallDir, file);
        console.log(`Reading ${file}...`);

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const levels = extractLevels(content, varName);
            console.log(`  Found ${levels.length} levels in ${varName}`);
            allLevels = allLevels.concat(levels);
        } catch (err) {
            console.error(`  Error reading ${file}: ${err.message}`);
        }
    }

    console.log(`\nTotal levels: ${allLevels.length}`);

    // Train the model
    console.log('\nTraining Markov model...');
    const model = trainMarkov(allLevels);

    const patternCount = Object.keys(model).length;
    console.log(`Trained model with ${patternCount} context patterns`);

    // Save the model
    const outputPath = path.join(__dirname, '../src/procgen/trained/markov-model.json');
    fs.writeFileSync(outputPath, JSON.stringify(model, null, 2));
    console.log(`\nSaved model to: ${outputPath}`);

    // Also save a minified version
    const minOutputPath = path.join(__dirname, '../src/procgen/trained/markov-model.min.json');
    fs.writeFileSync(minOutputPath, JSON.stringify(model));
    console.log(`Saved minified model to: ${minOutputPath}`);

    // Copy to totalrecall for web access
    const webOutputPath = path.join(totalRecallDir, 'markov-model.json');
    fs.writeFileSync(webOutputPath, JSON.stringify(model));
    console.log(`Copied model to: ${webOutputPath}`);

    // Print some stats
    console.log('\n=== Model Statistics ===');
    console.log(`Total context patterns: ${patternCount}`);

    // Show most common patterns
    const patterns = Object.entries(model)
        .map(([context, tiles]) => {
            const tileList = Object.entries(tiles)
                .sort((a, b) => b[1] - a[1])
                .map(([t, p]) => `${t}:${(p * 100).toFixed(1)}%`)
                .join(', ');
            return { context, tiles: tileList };
        })
        .slice(0, 10);

    console.log('\nSample patterns:');
    for (const p of patterns) {
        console.log(`  ${p.context} -> ${p.tiles}`);
    }
}

main().catch(console.error);
