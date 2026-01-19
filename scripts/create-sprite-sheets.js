/**
 * Creates TotalRecall-compatible sprite sheets from individual sprite PNGs
 *
 * Runner sprite sheet (runner.png - 360x132, 9 cols x 3 rows, 40x44 per frame):
 * Row 0 (frames 0-8):
 *   [0-2] runRight (3 frames) - using PlayerRun0, PlayerRun2, PlayerRun4
 *   [3-5] runLeft (3 frames) - horizontal flip of runRight
 *   [6-7] climb up/down (2 frames) - PlayerClimb6, PlayerClimb7
 *   [8]   fallRight - PlayerClimb8 (falling pose)
 *
 * Row 1 (frames 9-17): unused/transparent
 *
 * Row 2 (frames 18-26):
 *   [18-20] barRight/rope (3 frames) - PlayerBar18, PlayerBar19, PlayerBar20
 *   [21-23] barLeft/rope (3 frames) - PlayerBar21, PlayerBar22, PlayerBar23
 *   [24]    digRight - PlayerDig24
 *   [25]    digLeft - PlayerDig25
 *   [26]    fallLeft - PlayerDig26 (or flip of fallRight)
 *
 * Guard sprite sheet (guard.png - 440x132, 11 cols x 3 rows, 40x44 per frame):
 * Row 0 (frames 0-10):
 *   [0-2]   runRight (3 frames) - GuardRun0, GuardRun1, GuardRunR2 (or select from 0-5)
 *   [3-5]   runLeft (3 frames) - GuardRunR3, GuardRunR4, GuardRunR5 (or flip)
 *   [6-7]   climb up/down (2 frames) - GuardClimbR6, GuardClimbR7
 *   [8]     fallRight - GuardFallR8
 *   [9-10]  shakeRight extras (2 frames) - GuardShake9, GuardShake10
 *
 * Row 1 (frames 11-21): unused/transparent
 *
 * Row 2 (frames 22-32):
 *   [22-24] barRight/rope (3 frames) - GuardBar22, GuardBar23, GuardBar24
 *   [25-27] barLeft/rope (3 frames) - GuardBar25, GuardBar26, GuardBar27
 *   [28-29] reborn (2 frames) - GuardReborn28, GuardReborn29
 *   [30]    fallLeft - GuardShake30 (or GuardFall32)
 *   [31-32] shakeLeft extras (2 frames) - GuardShake31, GuardFall32
 */

import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRAME_WIDTH = 40;
const FRAME_HEIGHT = 44;

const PLAYER_DIR = path.join(__dirname, '../assets/sprites/entities/player/Player');
const GUARD_DIR = path.join(__dirname, '../assets/sprites/entities/enemy/Guard');
const GUARD_GOLD_DIR = path.join(__dirname, '../assets/sprites/entities/enemy/GaurdGold');
const OUTPUT_DIR = path.join(__dirname, '../totalrecall/image/Theme/APPLE2');

async function createRunnerSheet() {
    // Runner: 9 cols x 3 rows = 360x132
    const cols = 9;
    const rows = 3;
    const width = cols * FRAME_WIDTH;
    const height = rows * FRAME_HEIGHT;

    // Create blank transparent image
    const sheet = new Jimp({ width, height, color: 0x00000000 });

    // Helper to place a frame
    async function placeFrame(imagePath, col, row, flipH = false) {
        try {
            let img = await Jimp.read(imagePath);
            if (flipH) {
                img.flip({ horizontal: true, vertical: false });
            }
            sheet.composite(img, col * FRAME_WIDTH, row * FRAME_HEIGHT);
            console.log(`  Placed ${path.basename(imagePath)} at [${col}, ${row}]${flipH ? ' (flipped)' : ''}`);
        } catch (err) {
            console.log(`  WARNING: Could not load ${imagePath}: ${err.message}`);
        }
    }

    console.log('Creating runner.png...');

    // Row 0: frames 0-8
    // [0-2] runRight - PlayerRun0, PlayerRun1, PlayerRun2 (right-facing)
    await placeFrame(path.join(PLAYER_DIR, 'PlayerRun0.png'), 0, 0);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerRun1.png'), 1, 0);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerRun2.png'), 2, 0);

    // [3-5] runLeft - PlayerRun3, PlayerRun4, PlayerRun5 (left-facing)
    await placeFrame(path.join(PLAYER_DIR, 'PlayerRun3.png'), 3, 0);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerRun4.png'), 4, 0);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerRun5.png'), 5, 0);

    // [6-7] climb - PlayerClimb6, PlayerClimb7
    await placeFrame(path.join(PLAYER_DIR, 'PlayerClimb6.png'), 6, 0);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerClimb7.png'), 7, 0);

    // [8] fallRight - PlayerClimb8
    await placeFrame(path.join(PLAYER_DIR, 'PlayerClimb8.png'), 8, 0);

    // Row 1: frames 9-17 (unused/transparent) - already transparent

    // Row 2: frames 18-26
    // [18-20] barRight - PlayerBar18, PlayerBar19, PlayerBar20
    await placeFrame(path.join(PLAYER_DIR, 'PlayerBar18.png'), 0, 2);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerBar19.png'), 1, 2);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerBar20.png'), 2, 2);

    // [21-23] barLeft - PlayerBar21, PlayerBar22, PlayerBar23
    await placeFrame(path.join(PLAYER_DIR, 'PlayerBar21.png'), 3, 2);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerBar22.png'), 4, 2);
    await placeFrame(path.join(PLAYER_DIR, 'PlayerBar23.png'), 5, 2);

    // [24] digRight - PlayerDig24
    await placeFrame(path.join(PLAYER_DIR, 'PlayerDig24.png'), 6, 2);

    // [25] digLeft - PlayerDig25
    await placeFrame(path.join(PLAYER_DIR, 'PlayerDig25.png'), 7, 2);

    // [26] fallLeft - PlayerDig26
    await placeFrame(path.join(PLAYER_DIR, 'PlayerDig26.png'), 8, 2);

    // Save
    const outputPath = path.join(OUTPUT_DIR, 'runner.png');
    await sheet.write(outputPath);
    console.log(`Saved: ${outputPath}`);

    return sheet;
}

async function createGuardSheet() {
    // Guard: 11 cols x 3 rows = 440x132
    const cols = 11;
    const rows = 3;
    const width = cols * FRAME_WIDTH;
    const height = rows * FRAME_HEIGHT;

    // Create blank transparent image
    const sheet = new Jimp({ width, height, color: 0x00000000 });

    // Helper to place a frame
    async function placeFrame(imagePath, col, row, flipH = false) {
        try {
            let img = await Jimp.read(imagePath);
            if (flipH) {
                img.flip({ horizontal: true, vertical: false });
            }
            sheet.composite(img, col * FRAME_WIDTH, row * FRAME_HEIGHT);
            console.log(`  Placed ${path.basename(imagePath)} at [${col}, ${row}]${flipH ? ' (flipped)' : ''}`);
        } catch (err) {
            console.log(`  WARNING: Could not load ${imagePath}: ${err.message}`);
        }
    }

    console.log('\nCreating guard.png...');

    // Row 0: frames 0-10
    // [0-2] runRight - GuardRun0, GuardRun1, GuardRunR2
    await placeFrame(path.join(GUARD_DIR, 'GuardRun0.png'), 0, 0);
    await placeFrame(path.join(GUARD_DIR, 'GuardRun1.png'), 1, 0);
    await placeFrame(path.join(GUARD_DIR, 'GuardRunR2.png'), 2, 0);

    // [3-5] runLeft - GuardRunR3, GuardRunR4, GuardRunR5
    await placeFrame(path.join(GUARD_DIR, 'GuardRunR3.png'), 3, 0);
    await placeFrame(path.join(GUARD_DIR, 'GuardRunR4.png'), 4, 0);
    await placeFrame(path.join(GUARD_DIR, 'GuardRunR5.png'), 5, 0);

    // [6-7] climb - GuardClimbR6, GuardClimbR7
    await placeFrame(path.join(GUARD_DIR, 'GuardClimbR6.png'), 6, 0);
    await placeFrame(path.join(GUARD_DIR, 'GuardClimbR7.png'), 7, 0);

    // [8] fallRight - GuardFallR8
    await placeFrame(path.join(GUARD_DIR, 'GuardFallR8.png'), 8, 0);

    // [9-10] shakeRight - GuardShake9, GuardShake10
    await placeFrame(path.join(GUARD_DIR, 'GuardShake9.png'), 9, 0);
    await placeFrame(path.join(GUARD_DIR, 'GuardShake10.png'), 10, 0);

    // Row 1: frames 11-21 (unused/transparent) - already transparent

    // Row 2: frames 22-32
    // [22-24] barRight - GuardBar22, GuardBar23, GuardBar24
    await placeFrame(path.join(GUARD_DIR, 'GuardBar22.png'), 0, 2);
    await placeFrame(path.join(GUARD_DIR, 'GuardBar23.png'), 1, 2);
    await placeFrame(path.join(GUARD_DIR, 'GuardBar24.png'), 2, 2);

    // [25-27] barLeft - GuardBar25, GuardBar26, GuardBar27
    await placeFrame(path.join(GUARD_DIR, 'GuardBar25.png'), 3, 2);
    await placeFrame(path.join(GUARD_DIR, 'GuardBar26.png'), 4, 2);
    await placeFrame(path.join(GUARD_DIR, 'GuardBar27.png'), 5, 2);

    // [28-29] reborn - GuardReborn28, GuardReborn29
    await placeFrame(path.join(GUARD_DIR, 'GuardReborn28.png'), 6, 2);
    await placeFrame(path.join(GUARD_DIR, 'GuardReborn29.png'), 7, 2);

    // [30] fallLeft - GuardShake30
    await placeFrame(path.join(GUARD_DIR, 'GuardShake30.png'), 8, 2);

    // [31-32] shakeLeft - GuardShake31, GuardFall32
    await placeFrame(path.join(GUARD_DIR, 'GuardShake31.png'), 9, 2);
    await placeFrame(path.join(GUARD_DIR, 'GuardFall32.png'), 10, 2);

    // Save
    const outputPath = path.join(OUTPUT_DIR, 'guard.png');
    await sheet.write(outputPath);
    console.log(`Saved: ${outputPath}`);

    return sheet;
}

async function createRedhatSheet() {
    // Redhat (guard carrying gold): 11 cols x 3 rows = 440x132
    // Same layout as guard, but with GOLD variants
    const cols = 11;
    const rows = 3;
    const width = cols * FRAME_WIDTH;
    const height = rows * FRAME_HEIGHT;

    // Create blank transparent image
    const sheet = new Jimp({ width, height, color: 0x00000000 });

    // Helper to place a frame
    async function placeFrame(imagePath, col, row, flipH = false) {
        try {
            let img = await Jimp.read(imagePath);
            if (flipH) {
                img.flip({ horizontal: true, vertical: false });
            }
            sheet.composite(img, col * FRAME_WIDTH, row * FRAME_HEIGHT);
            console.log(`  Placed ${path.basename(imagePath)} at [${col}, ${row}]${flipH ? ' (flipped)' : ''}`);
        } catch (err) {
            console.log(`  WARNING: Could not load ${imagePath}: ${err.message}`);
        }
    }

    console.log('\nCreating redhat.png (guard with gold)...');

    // Row 0: frames 0-10
    // [0-2] runRight
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardRun0GOLD.png'), 0, 0);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardRun1GOLD.png'), 1, 0);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardRunR2GOLD.png'), 2, 0);

    // [3-5] runLeft
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardRunR3GOLD.png'), 3, 0);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardRunR4GOLD.png'), 4, 0);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardRunR5GOLD.png'), 5, 0);

    // [6-7] climb
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardClimbR6GOLD.png'), 6, 0);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardClimbR7GOLD.png'), 7, 0);

    // [8] fallRight
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardFallR8GOLD.png'), 8, 0);

    // [9-10] shakeRight
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardShake9GOLD.png'), 9, 0);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardShake10GOLD.png'), 10, 0);

    // Row 1: frames 11-21 (unused/transparent) - already transparent

    // Row 2: frames 22-32
    // [22-24] barRight
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardBar22GOLD.png'), 0, 2);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardBar23GOLD.png'), 1, 2);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardBar24GOLD.png'), 2, 2);

    // [25-27] barLeft
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardBar25GOLD.png'), 3, 2);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardBar26GOLD.png'), 4, 2);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardBar27GOLD.png'), 5, 2);

    // [28-29] reborn
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardReborn28GOLD.png'), 6, 2);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardReborn29GOLD.png'), 7, 2);

    // [30] fallLeft
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardShake30GOLD.png'), 8, 2);

    // [31-32] shakeLeft
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardShake31GOLD.png'), 9, 2);
    await placeFrame(path.join(GUARD_GOLD_DIR, 'GuardFall32GOLD.png'), 10, 2);

    // Save
    const outputPath = path.join(OUTPUT_DIR, 'redhat.png');
    await sheet.write(outputPath);
    console.log(`Saved: ${outputPath}`);

    return sheet;
}

async function main() {
    console.log('=== Creating TotalRecall Sprite Sheets ===\n');
    console.log(`Frame size: ${FRAME_WIDTH}x${FRAME_HEIGHT}`);
    console.log(`Output directory: ${OUTPUT_DIR}\n`);

    try {
        await createRunnerSheet();
        await createGuardSheet();
        await createRedhatSheet();
        console.log('\n=== Done! ===');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
