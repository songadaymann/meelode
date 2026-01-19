# Meelode - Lode Runner Style Game

## Project Overview
A Lode Runner-style puzzle platformer with procedurally generated levels.

---

## Progress Log

### Playable Game (Complete)

The game is now fully playable with smooth movement, enemy AI, and core Lode Runner mechanics.

**File:** `public/preview.html`

**To play:**
```bash
cd meelode
npx serve . -p 3456
# Open http://localhost:3456/public/preview.html
```

**Controls:**
- Arrow keys - Move / Climb ladders / Traverse ropes
- Z - Dig left (brick below and to the left)
- X - Dig right (brick below and to the right)
- "New Level" button - Generate a new level

---

### Player Movement (Complete)

- Smooth pixel-based movement (not tile-snapping)
- Snappy physics: gravity 1800 px/s², player speed 220 px/s
- Ladder climbing with proper top-exit (can climb until feet leave ladder)
- Rope traversal with drop-down
- Proper collision detection with solid tiles

**Animations implemented:**
- Run left/right (8 frames)
- Climb ladder (2 frames)
- Hang on rope (2 frames)
- Idle/falling (first frame of run)

---

### Enemy AI (Complete)

Authentic Lode Runner-style guard AI based on original game analysis:

**Two-Goal Hierarchy:**
1. Direct chase if on same Y level with clear path
2. Otherwise, seek better vertical positioning

**Level Scoring (from original):**
- Same level as player = best
- Above player = good
- Below player = worst

**Authentic Quirks:**
- Guards ignore dug pits (walk right into them like original)
- Directional bias creates predictable patterns (left evaluated before right)
- Path scanning looks ahead to evaluate moves
- 8% random imperfection for less robotic feel
- Horizontal distance used as tiebreaker (guards move toward player, not just oscillate)
- Guards won't jump off ladders into freefall (except at endpoints)
- **Anti-oscillation**: Position history tracking prevents back-and-forth loops

**Other features:**
- Walk on/off ladders horizontally when chasing
- Slightly slower than player (160 px/s vs 220 px/s)
- "Think" every 0.3 seconds (staggered per enemy)
- **Guards can walk on top of trapped guards** (like original)

**Animations:** Same as player (run, climb, rope states)

---

### Brick Digging (Complete)

Classic Lode Runner digging mechanic:
- Press Z/X to dig brick diagonally below
- Only regular bricks (b) can be dug, not solid blocks (B)
- Dug bricks regenerate after 5 seconds
- Enemies fall into dug holes and get trapped
- **Trapped enemies act as solid ground** - player AND enemies can walk over them
- Trapped enemies can't catch the player
- When brick regenerates, enemy is released

---

### Collision & Win/Lose (Complete)

- **Gold collection:** Walk over gold to collect
- **Win condition:** Collect all gold
- **Lose condition:** Enemy touches player (unless trapped)
- Status display shows gold progress

---

### Responsive UI (Complete)

- Clean minimal interface (title, New Level button, controls hint)
- Auto-calculates optimal tile size for screen (16-64px)
- Scales on window resize
- Works on various screen sizes

---

### Procedural Level Generation System (Complete)

**Approach:** Markov Chain generation + physics-aware reachability validation

**Level Size:** 28x16 tiles (Apple II / Arduboy format - matches original Lode Runner)

**Training Data:** 592 levels (146 Arduboy images + 150 VGLC + horizontal flips)
- Pre-trained model embedded in game (136 unique patterns from 342K tiles)
- Training script: `scripts/train-with-extended-dataset.js`
- Level image parser: `scripts/parse-level-images.js`

**Tile Format (from VGLC):**
| Char | Meaning |
|------|---------|
| `.` | Empty (air) |
| `b` | Brick (diggable) |
| `B` | Solid block (not diggable) |
| `#` | Ladder |
| `-` | Rope |
| `G` | Gold |
| `E` | Enemy |
| `M` | Player spawn |

**Files:**
```
src/procgen/
├── types.ts              # Tile definitions, level types
├── levelParser.ts        # Parse/serialize levels, VGLC fetching, sample levels
├── solvabilityChecker.ts # A* pathfinding to validate all gold is reachable
├── markovGenerator.ts    # Markov chain pattern learning from training levels
├── levelGenerator.ts     # Main generation pipeline with entity placement
├── trained/markov-model.json  # Pre-trained model data
├── index.ts              # Public API exports
└── demo.ts               # Test/demo script

original-level-txt-download-images/
├── levels/               # 146 GIF images from Arduboy forum
└── parsed/               # Parsed level text files (28x16)
```

**Features:**
- MarkovLevelGenerator - Learns 2D tile patterns from existing levels
- **Pre-trained model** - No need to train at runtime, loads 136 patterns instantly
- ConstructiveLevelGenerator - Alternative rule-based generation
- **Physics-aware reachability checker** - Respects gravity, ladders, ropes, and digging
- Smart spawn selection - Tests reachability from spawn candidates, picks one with sufficient reach
- **Smart enemy placement heuristics:**
  - Safe radius around player spawn
  - Prevents trapping player on both sides on non-diggable ground
  - Spreads enemies across different vertical levels
  - **Mobility check** - enemies only spawn where they can actually move/chase
- Gold spread algorithm - Places gold far apart for better distribution
- Spawn position validation - Ensures entities don't spawn inside blocks

---

### Assets

**Tile sprites (1-bit white, tinted at render time):**
```
assets/sprites/tiles/
├── brick.png   # Diggable brick (b)
├── solid.png   # Solid block (B)
├── ladder.png  # Ladder (#)
└── rope.png    # Rope (-)
```

**Entity sprites (from assets folder):**
```
assets/sprites/entities/player/
├── playerRunRight/  # 8 frames
├── playerRunLeft/   # 8 frames
├── playerClimb/     # 2 frames
└── playerRope/      # 2 frames

assets/sprites/entities/enemy/
├── enemyRunRight/   # 8 frames
├── enemyRunLeft/    # 8 frames
├── enemyClimb/      # 2 frames
└── enemyRope/       # 2 frames
```

**Gold:** Rendered as solid gold (#ffd700) square

---

## Current Status

**Working:**
- Full gameplay loop (move, climb, dig, collect, win/lose)
- **Two game modes:** Original Levels (147 Arduboy levels) and Generated Levels
- Level navigation (Prev/Next) for original mode
- Procedural level generation with physics-aware solvability validation
- Authentic Lode Runner guard AI with quirks and predictable patterns
- Anti-oscillation system prevents guards from getting stuck in back-and-forth loops
- Trap mechanic (dig holes, trap enemies, walk over trapped enemies)
- **Enemy escape:** Trapped enemies climb out ~1 second before brick regenerates
- **Player death:** Player dies if trapped in hole when brick regenerates
- **Lives system:** 3 lives, respawn at spawn point on death
- Guards can walk on top of trapped guards (like original Lode Runner)
- Rope mechanics - fall through and grab with hands
- Responsive canvas sizing
- All animations
- 35% collision margin on top allows fitting through 1-tile gaps at ladder tops
- 10% collision margin on bottom prevents getting stuck near ladders
- **Diggable bottom floor** (like original - can dig through and get trapped)
- **Full solvability checker** - A* that verifies all gold can be collected AND player can escape

**Default settings:**
- Tile size: Auto (up to 64px based on screen)
- Gold: 6
- Enemies: 3

---

## TotalRecall Integration (Complete)

### Overview
Integrated the full TotalRecall Lode Runner engine with custom Meelode sprites, Markov-based procedural level generation, and a custom Apple II-style frame UI.

**To play:**
```bash
cd meelode/totalrecall
python3 -m http.server 9999
# Open http://localhost:9999/lodeRunner.html
```

### UI/UX Customizations (Phase 4 - Complete)

**Custom Frame & Responsive Layout:**
- Apple II computer frame overlay (`image/frame.png`) surrounds the game
- Fully responsive - scales to fit any viewport while maintaining aspect ratio
- Game canvas centered within the frame's "monitor screen" area
- Dark background outside the frame

**Custom Intro Screen:**
- Custom "LodeMeeRunnerBits" intro image (`image/introscreen.png`)
- Solid purple background (#6466f1)
- "CLICK TO PLAY" text with retro font and blinking animation
- Removed original TotalRecall/signet overlays

**Menu System:**
- MENU button in frame (bottom right corner)
- Click to open modal with options:
  - **Original Mode** - Classic Lode Runner starting at level 1
  - **Generated Mode** - Procedurally generated solvable levels
  - **See All Levels** - Level picker to jump to any level

**Removed Bloat:**
- Removed demo data files (demoData1.js, demoData2.js - ~105KB saved)
- Disabled auto-demo mode on idle
- Removed side icon panels (menu, sound, theme, etc.)
- Removed mode text overlay during gameplay
- Always starts on Classic Lode Runner level 1 (ignores saved state)

**Files Modified:**
- `lodeRunner.html` - New CSS for responsive frame, modal menu, hidden icons
- `lodeRunner.main.js` - Responsive canvas sizing, intro positioning, frame alignment
- `lodeRunner.preload.js` - Custom intro screen, removed overlays, "CLICK TO PLAY" text
- `lodeRunner.demo.js` - Disabled auto-demo functionality

**Assets Added:**
- `image/frame.png` - Apple II computer frame with MENU button
- `image/introscreen.png` - Custom intro/title screen

### Custom Sprites (40x44 pixels per frame)

Created custom sprite sheets for TotalRecall's Apple II theme:

**Player (runner.png - 360x132, 9 cols x 3 rows):**
- Row 0: runRight [0-2], runLeft [3-5], climb [6-7], fallRight [8]
- Row 1: empty (unused)
- Row 2: barRight [18-20], barLeft [21-23], digRight [24], digLeft [25], fallLeft [26]

**Guard (guard.png - 440x132, 11 cols x 3 rows):**
- Row 0: runRight [0-2], runLeft [3-5], climb [6-7], fallRight [8], shakeRight [9-10]
- Row 1: empty (unused)
- Row 2: barRight [22-24], barLeft [25-27], reborn [28-29], fallLeft [30], shakeLeft [31-32]

**Redhat/Guard with Gold (redhat.png - 440x132):**
- Same layout as guard, with gold nugget visible on sprite

**Sprite Sources:**
```
assets/sprites/entities/player/Player/    # PlayerRun0-5, PlayerClimb6-8, PlayerBar18-23, PlayerDig24-26
assets/sprites/entities/enemy/Guard/      # GuardRun0-5, GuardClimbR6-7, GuardBar22-27, etc.
assets/sprites/entities/enemy/GaurdGold/  # Gold-carrying variants (*GOLD.png)
```

**Sprite Sheet Generator:**
```bash
node scripts/create-sprite-sheets.js
```

### Markov Level Generation

Trained Markov model on **415 levels** from all TotalRecall level packs:
- Classic (150 levels)
- Professional (150 levels)
- Fan Book Mod (39 levels)
- Revenge (25 levels)
- Championship (51 levels)

**Training script:**
```bash
node scripts/train-markov-from-totalrecall.js
```

**Output:** `totalrecall/markov-model.json` (136 context patterns)

### A* Solvability Verification

Ported the TypeScript solvability checker to JavaScript for runtime validation:

- **BFS reachability analysis** from player spawn
- **Physics-aware pathfinding** respects gravity, ladders, ropes
- **Digging simulation** - considers that player can dig through bricks to reach areas
- **Retry loop** - generates up to 20 levels until finding a solvable one

**Console output:**
```
Generation attempt 1/20
Solvability check: 2 of 6 gold unreachable
Generation attempt 2/20
Solvability check: PASSED - all 6 gold reachable
Generated solvable level on attempt 2
```

### New Game Mode: Generated Mode

Added "Generated Mode" to TotalRecall menu:
- Select from main menu alongside Challenge/Training modes
- Each level is procedurally generated and verified solvable
- Death restarts with a fresh generated level
- Completing a level generates another new level

**Files modified:**
- `lodeRunner.def.js` - Added `PLAY_GENERATED = 8`
- `lodeRunner.menu.js` - Added menu option and `generatedPlay()` function
- `lodeRunner.main.js` - Added PLAY_GENERATED cases for level loading, death, and completion
- `lodeRunner.markov.js` - New file with Markov generator + A* solvability checker
- `lodeRunner.html` - Added script include for markov.js

---

## Known Issues / TODO

### Level Image Parser - Player Detection Bug

**Problem:** The parser currently assumes red pixels = enemies/player. But in the original Arduboy images:
- **Enemies are RED** (~19 red pixels per tile)
- **Player is WHITE** (stick figure sprite, similar to ladder/rope)

This means all red tiles are enemies (3 per level), and the player is being misidentified as a ladder or empty space.

**Current behavior:**
- Parser marks first red tile as player (M), rest as enemies (E)
- Then tries to correct by making lowest red tile the player
- But player sprite is actually white, not red!

**Fix needed:**
- All red-dominant tiles = Enemy (E)
- Player (M) = white-dominant tile that matches stick figure pattern (not ladder H-shape, not rope horizontal line)
- Need to detect player sprite pattern: scattered white pixels in humanoid shape, different from ladder's H-rungs or rope's single horizontal line

**Player vs Ladder vs Rope detection:**
| Entity | White Pixels | Pattern |
|--------|-------------|---------|
| Ladder | ~52 pixels | H-shape: vertical rails on left & right edges + horizontal rungs |
| Rope | ~10 pixels | Single horizontal line near top of tile |
| Player | ~20-40 pixels? | Scattered stick figure shape, no strong vertical rails |

**File to fix:** `scripts/parse-level-images.js`

---

## Next Steps (Potential)

- [ ] **Fix player detection in level parser** (white sprite, not red)
- [ ] Re-parse all 147 levels with fixed parser
- [ ] Regenerate original-levels.js
- [ ] Add brick-breaking animation for player
- [x] ~~Train on full 150 VGLC levels for better generation~~ (Done! 592 levels now)
- [x] ~~Integrate TotalRecall engine~~ (Done!)
- [x] ~~Custom Meelode sprites for TotalRecall~~ (Done! runner.png, guard.png, redhat.png)
- [x] ~~Markov generation in TotalRecall~~ (Done! Trained on 415 levels)
- [x] ~~A* solvability verification~~ (Done! Ported to JavaScript)
- [ ] Custom tile sprites (brick, ladder, rope, gold, solid)
- [ ] Add sound effects
- [ ] Mobile touch controls
- [ ] Score tracking for generated mode
- [ ] Difficulty scaling (more gold/enemies as you progress)
- [ ] Seed-based generation for shareable levels

---

## Technical Notes

### Color Palette (for 1-bit sprite tinting)
```javascript
const COLOR_MAP = {
  brick:  '#c87432',  // Orange-brown
  solid:  '#8b6914',  // Darker brown
  ladder: '#44dd44',  // Green
  rope:   '#ddaa44',  // Yellow-brown
  gold:   '#ffd700',  // Gold
  enemy:  '#ff4466',  // Red
  player: '#44aaff',  // Blue
};
```

### Physics Constants
```javascript
const PLAYER_SPEED = 220;      // pixels per second
const ENEMY_SPEED = 160;       // pixels per second
const GRAVITY = 1800;          // pixels per second squared
const MAX_FALL_SPEED = 600;    // pixels per second
const ANIMATION_FPS = 12;
const ENEMY_THINK_INTERVAL = 0.3;  // seconds
const LEVEL_WIDTH = 28;        // tiles (Apple II format)
const LEVEL_HEIGHT = 16;       // tiles
```

---

## Training Data Pipeline

### Level Image Parser
The game includes a parser to convert Lode Runner level screenshots into playable tile data.

**Source images:** 146 GIF files from Arduboy forum (280x176 pixels each)
- Each image is 28x16 tiles at 10x11 pixels per tile
- 5 colors: black (empty), blue (brick), white (ladder/rope), orange (gold), red (enemy/player)

**Parser features:**
- Pattern detection to distinguish ladders (H-shape, ~52 white pixels) from ropes (horizontal line, ~10 white pixels)
- Outputs VGLC-compatible text format

**Known issue:** Player detection is broken. Currently assumes red = player/enemy, but:
- Enemies are RED (3 per level)
- Player is WHITE (stick figure, needs to be distinguished from ladder/rope by pattern)

See "Known Issues / TODO" section above for fix details.

**To re-parse images:**
```bash
node scripts/parse-level-images.js
```

### Markov Model Training
The Markov generator learns which tiles tend to appear next to each other.

**Training process:**
1. Load 146 local levels (28x16) + 150 VGLC levels (32x22)
2. Augment with horizontal flips (2x data)
3. Learn 2D context patterns (above, left, above-left)
4. Export probabilities to JSON

**To re-train:**
```bash
node scripts/train-with-extended-dataset.js
```

**Model stats:**
- 592 training levels
- 342,016 tiles analyzed
- 136 unique context patterns
- ~14KB minified JSON

---

## References

- [Championship Lode Runner Guard AI Analysis](https://datadrivengamer.blogspot.com/2023/01/championship-lode-runner-guard.html) - Detailed breakdown of original guard behavior
- [VGLC (Video Game Level Corpus)](https://github.com/TheVGLC/TheVGLC) - Lode Runner level data
- [Arduboy Lode Runner Levels](https://community.arduboy.com/t/lode-runner-game-1-levels/5395) - Source for level images
