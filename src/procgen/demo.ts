/**
 * Demo script for level generation
 *
 * Run with: npx ts-node src/procgen/demo.ts
 * Or: npx tsx src/procgen/demo.ts
 */

import {
  LodeRunnerLevelGenerator,
  ConstructiveLevelGenerator,
  getSampleLevels,
  levelToString,
  validateLevel,
  TILES,
} from './index';

function printLevel(level: ReturnType<typeof getSampleLevels>[0], title: string) {
  console.log(`\n${'='.repeat(40)}`);
  console.log(title);
  console.log('='.repeat(40));
  console.log(levelToString(level));
}

function printStats(result: { validation: ReturnType<typeof validateLevel>; attempts: number; generationTimeMs: number }) {
  console.log(`\nStats:`);
  console.log(`  Valid: ${result.validation.valid}`);
  console.log(`  Gold reachable: ${result.validation.reachableGold.length}`);
  console.log(`  Gold unreachable: ${result.validation.unreachableGold.length}`);
  console.log(`  Attempts: ${result.attempts}`);
  console.log(`  Time: ${result.generationTimeMs.toFixed(2)}ms`);
  if (result.validation.issues.length > 0) {
    console.log(`  Issues: ${result.validation.issues.join(', ')}`);
  }
}

async function main() {
  console.log('Lode Runner Level Generator Demo');
  console.log('================================\n');

  // Get sample levels for training
  const sampleLevels = getSampleLevels();
  console.log(`Loaded ${sampleLevels.length} sample levels for training`);

  // Test: Validate a sample level
  console.log('\n--- Validating Sample Level 1 ---');
  const validation = validateLevel(sampleLevels[0]);
  console.log(`Valid: ${validation.valid}`);
  console.log(`Reachable gold: ${validation.reachableGold.length}`);
  console.log(`Spawn: (${validation.spawnPosition?.x}, ${validation.spawnPosition?.y})`);

  // Create and train Markov generator
  console.log('\n--- Training Markov Generator ---');
  const markovGenerator = new LodeRunnerLevelGenerator();
  markovGenerator.train(sampleLevels);
  console.log('Training complete!');

  // Generate levels with Markov
  console.log('\n--- Generating Levels (Markov) ---');
  for (let i = 0; i < 3; i++) {
    const result = markovGenerator.generate({
      goldCount: 5 + i * 2,
      enemyCount: 2,
    });
    printLevel(result.level, `Markov Generated Level ${i + 1}`);
    printStats(result);
  }

  // Test constructive generator
  console.log('\n\n--- Generating Levels (Constructive) ---');
  const constructiveGenerator = new ConstructiveLevelGenerator();

  for (let i = 0; i < 2; i++) {
    const level = constructiveGenerator.generate({
      goldCount: 6,
      enemyCount: 2,
    });
    const validation = validateLevel(level);
    printLevel(level, `Constructive Generated Level ${i + 1}`);
    console.log(`\nStats:`);
    console.log(`  Valid: ${validation.valid}`);
    console.log(`  Gold reachable: ${validation.reachableGold.length}`);
  }

  // Legend
  console.log('\n\n--- Tile Legend ---');
  console.log(`  ${TILES.EMPTY} = Empty (air)`);
  console.log(`  ${TILES.BRICK} = Brick (diggable)`);
  console.log(`  ${TILES.SOLID} = Solid block`);
  console.log(`  ${TILES.LADDER} = Ladder`);
  console.log(`  ${TILES.ROPE} = Rope`);
  console.log(`  ${TILES.GOLD} = Gold`);
  console.log(`  ${TILES.ENEMY} = Enemy`);
  console.log(`  ${TILES.SPAWN} = Player spawn`);
}

main().catch(console.error);
