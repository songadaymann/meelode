#!/usr/bin/env node

/**
 * Convert LodeRunner_TotalRecall levels to Meelode format
 *
 * Source: https://github.com/SimonHung/LodeRunner_TotalRecall
 *
 * Fetches 5 level variants (434 total levels):
 * - Classic: 150 levels
 * - Championship: 51 levels
 * - Professional: 150 levels
 * - Revenge: 17 levels
 * - Fan Book: 66 levels
 *
 * Converts character encoding from TotalRecall to VGLC/Meelode format.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URLs for level data files
const LEVEL_SOURCES = [
  {
    name: 'classic',
    displayName: 'Classic',
    url: 'https://raw.githubusercontent.com/SimonHung/LodeRunner_TotalRecall/master/lodeRunner.v.classic.js',
    varName: 'classicData',
    expectedCount: 150
  },
  {
    name: 'championship',
    displayName: 'Championship',
    url: 'https://raw.githubusercontent.com/SimonHung/LodeRunner_TotalRecall/master/lodeRunner.v.championship.js',
    varName: 'championData',  // Note: no 'ship' in the name
    expectedCount: 51
  },
  {
    name: 'professional',
    displayName: 'Professional',
    url: 'https://raw.githubusercontent.com/SimonHung/LodeRunner_TotalRecall/master/lodeRunner.v.professional.js',
    varName: 'proData',  // Note: abbreviated name
    expectedCount: 150
  },
  {
    name: 'revenge',
    displayName: 'Revenge',
    url: 'https://raw.githubusercontent.com/SimonHung/LodeRunner_TotalRecall/master/lodeRunner.v.revenge.js',
    varName: 'revengeData',
    expectedCount: 17
  },
  {
    name: 'fanbook',
    displayName: 'Fan Book',
    url: 'https://raw.githubusercontent.com/SimonHung/LodeRunner_TotalRecall/master/lodeRunner.v.fanBookMod.js',
    varName: 'fanBookData',
    expectedCount: 66
  }
];

// Character encoding conversion
// TotalRecall format -> Meelode/VGLC format
const CHAR_MAP = {
  ' ': '.',   // Empty
  '#': 'b',   // Brick (diggable) - TotalRecall uses # for brick
  '@': 'B',   // Solid block (indestructible)
  'H': '#',   // Ladder - TotalRecall uses H for ladder
  '-': '-',   // Rope (same)
  '$': 'G',   // Gold
  '0': 'E',   // Enemy (guard)
  '&': 'M',   // Player spawn (runner)
  'X': 'X',   // Trap brick (false floor) - NEW
  'S': 'S',   // Hidden ladder (appears after gold collected) - NEW
};

/**
 * Fetch a file from URL
 */
async function fetchFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

/**
 * Parse level strings from a TotalRecall JS file
 * The file format is: var varName = [ "level1", "level2", ... ];
 */
function parseLevelFile(content, varName) {
  const levels = [];

  // Find the array start
  const arrayStartMatch = content.match(new RegExp(`var\\s+${varName}\\s*=\\s*\\[`));
  if (!arrayStartMatch) {
    throw new Error(`Could not find array ${varName} in file`);
  }

  const startIndex = arrayStartMatch.index + arrayStartMatch[0].length;

  // Extract everything between [ and final ];
  let bracketDepth = 1;
  let endIndex = startIndex;
  for (let i = startIndex; i < content.length && bracketDepth > 0; i++) {
    if (content[i] === '[') bracketDepth++;
    if (content[i] === ']') bracketDepth--;
    endIndex = i;
  }

  const arrayContent = content.substring(startIndex, endIndex);

  // Split by level comments or string boundaries
  // Each level is a string like "row1" + "row2" + ... + "row16",
  // We need to find each complete level string

  // Strategy: Find all quoted strings and concatenate them between commas at depth 0
  let currentLevel = '';
  let inString = false;
  let stringChar = null;
  let escaped = false;
  let depth = 0;

  for (let i = 0; i < arrayContent.length; i++) {
    const char = arrayContent[i];

    if (escaped) {
      if (inString) currentLevel += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      if (inString) currentLevel += char;
      continue;
    }

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      continue;
    }

    if (inString && char === stringChar) {
      inString = false;
      stringChar = null;
      continue;
    }

    if (inString) {
      currentLevel += char;
      continue;
    }

    // Not in string
    if (char === '(') depth++;
    if (char === ')') depth--;

    // Comma at depth 0 = level separator
    if (char === ',' && depth === 0 && currentLevel.length > 0) {
      // Validate level is 28x16 = 448 chars
      if (currentLevel.length === 448) {
        levels.push(currentLevel);
      } else if (currentLevel.length > 100) {
        // Some levels might have minor issues, log and try to use
        console.warn(`  Warning: Level ${levels.length + 1} has ${currentLevel.length} chars (expected 448)`);
        if (currentLevel.length >= 448) {
          levels.push(currentLevel.substring(0, 448));
        }
      }
      currentLevel = '';
    }
  }

  // Don't forget the last level (no trailing comma)
  if (currentLevel.length === 448) {
    levels.push(currentLevel);
  } else if (currentLevel.length >= 448) {
    levels.push(currentLevel.substring(0, 448));
  }

  return levels;
}

/**
 * Convert a level string from TotalRecall format to Meelode format
 */
function convertLevel(levelStr) {
  let converted = '';
  for (const char of levelStr) {
    converted += CHAR_MAP[char] || char;
  }
  return converted;
}

/**
 * Format a level string as 28-char rows for readability
 */
function formatLevel(levelStr) {
  const rows = [];
  for (let i = 0; i < 16; i++) {
    rows.push(levelStr.substring(i * 28, (i + 1) * 28));
  }
  return rows.join('\n');
}

/**
 * Main conversion process
 */
async function main() {
  console.log('=== LodeRunner TotalRecall Level Converter ===\n');

  const allLevels = [];

  for (const source of LEVEL_SOURCES) {
    console.log(`Fetching ${source.displayName} levels from ${source.url}...`);

    try {
      const content = await fetchFile(source.url);
      const levels = parseLevelFile(content, source.varName);

      console.log(`  Found ${levels.length} levels (expected ${source.expectedCount})`);

      // Convert each level
      for (let i = 0; i < levels.length; i++) {
        const converted = convertLevel(levels[i]);
        allLevels.push({
          variant: source.name,
          variantDisplay: source.displayName,
          levelNum: i + 1,
          data: converted
        });
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log(`\nTotal levels converted: ${allLevels.length}`);

  // Generate output file
  const outputPath = path.join(__dirname, '..', 'public', 'original-levels.js');

  let output = `// Auto-generated from LodeRunner_TotalRecall
// https://github.com/SimonHung/LodeRunner_TotalRecall
// Generated: ${new Date().toISOString()}
// Total levels: ${allLevels.length}

const LEVEL_VARIANTS = {
  classic: { name: 'Classic', count: ${allLevels.filter(l => l.variant === 'classic').length} },
  championship: { name: 'Championship', count: ${allLevels.filter(l => l.variant === 'championship').length} },
  professional: { name: 'Professional', count: ${allLevels.filter(l => l.variant === 'professional').length} },
  revenge: { name: 'Revenge', count: ${allLevels.filter(l => l.variant === 'revenge').length} },
  fanbook: { name: 'Fan Book', count: ${allLevels.filter(l => l.variant === 'fanbook').length} },
};

const ORIGINAL_LEVELS = [
`;

  for (const level of allLevels) {
    output += `  { variant: '${level.variant}', num: ${level.levelNum}, data: \`${level.data}\` },\n`;
  }

  output += `];
`;

  fs.writeFileSync(outputPath, output);
  console.log(`\nWritten to: ${outputPath}`);

  // Also output a summary by variant
  console.log('\n=== Level Counts by Variant ===');
  const variants = {};
  for (const level of allLevels) {
    variants[level.variantDisplay] = (variants[level.variantDisplay] || 0) + 1;
  }
  for (const [name, count] of Object.entries(variants)) {
    console.log(`  ${name}: ${count} levels`);
  }

  // Validate a few levels
  console.log('\n=== Sample Level Validation ===');
  if (allLevels.length > 0) {
    const sample = allLevels[0];
    console.log(`\n${sample.variantDisplay} Level ${sample.levelNum}:`);
    console.log(formatLevel(sample.data));

    // Check for expected tiles
    const tiles = {};
    for (const char of sample.data) {
      tiles[char] = (tiles[char] || 0) + 1;
    }
    console.log('\nTile counts:', tiles);
  }
}

main().catch(console.error);
