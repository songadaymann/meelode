# Lode Runner Integration Plan

**New Approach:** Fork TotalRecall as the game engine, swap in our sprites, integrate our Markov generator.

TotalRecall is cloned to `totalrecall/` folder.

---

## Phase 1: Sprite Replacement ⬅️ CURRENT

Replace TotalRecall's sprites with Meelode's custom sprites.

### 1.1 Create Sprite Sheets (TexturePacker)

**Runner sprite sheet** (`runner.png` - 360x132, 9 cols x 3 rows, 40x44 per frame):
```
Row 0 (frames 0-8):
  [0-2] runRight (3 frames)
  [3-5] runLeft (3 frames)
  [6-7] climb up/down (2 frames)
  [8]   fallRight

Row 1 (frames 9-17):
  [9-17] unused/transparent

Row 2 (frames 18-26):
  [18-20] barRight/rope (3 frames)
  [21-23] barLeft/rope (3 frames)
  [24]    digRight
  [25]    digLeft
  [26]    fallLeft
```

**Guard sprite sheet** (`guard.png` - 440x132, 11 cols x 3 rows, 40x44 per frame):
```
Row 0 (frames 0-10):
  [0-2]   runRight (3 frames)
  [3-5]   runLeft (3 frames)
  [6-7]   climb up/down (2 frames)
  [8]     fallRight
  [9-10]  shakeRight extras (2 frames)

Row 1 (frames 11-21):
  [11-21] unused/transparent

Row 2 (frames 22-32):
  [22-24] barRight/rope (3 frames)
  [25-27] barLeft/rope (3 frames)
  [28-29] reborn (2 frames)
  [30]    fallLeft
  [31-32] shakeLeft extras (2 frames)
```

**Redhat sprite sheet** (`redhat.png` - same layout as guard):
- Same as guard but with visual indicator that guard is carrying gold
- Could be tinted, have a hat, or carry a bag

**Tile sprites** (individual 40x44 PNGs):
- [ ] `brick.png` - diggable brick
- [ ] `block.png` - solid/indestructible block
- [ ] `ladder.png` - ladder
- [ ] `rope.png` - rope/bar
- [ ] `gold.png` - gold/treasure
- [ ] `trap.png` - trap brick (looks like brick)
- [ ] `hladder.png` - hidden ladder (same as ladder, fades in)
- [ ] `empty.png` - empty/background tile
- [ ] `ground.png` - ground below play area (40x20)
- [ ] `guard1.png` - static guard icon (for editor)
- [ ] `runner1.png` - static runner icon (for editor)

**Hole animation** (`hole.png` - sprite sheet for digging animation)

### 1.2 Replace Sprite Files
- [ ] Scale Meelode sprites to 40x44 per frame
- [ ] Export from TexturePacker in grid layout
- [ ] Replace files in `totalrecall/image/Theme/APPLE2/`
- [ ] Test that animations play correctly

### 1.3 Adjust Animation Definitions (if needed)
- [ ] Meelode has 8 run frames, TotalRecall uses 3
- [ ] Option A: Use every 2-3rd frame from Meelode sprites
- [ ] Option B: Modify `lodeRunner.preload.js` animation definitions to use more frames
- [ ] Test animation smoothness

---

## Phase 2: Add Markov Generated Level Mode

Integrate Meelode's Markov level generator into TotalRecall.

### 2.1 Port Markov Generator
- [ ] Copy `src/procgen/markovGenerator.ts` logic to JavaScript
- [ ] Copy `src/procgen/solvabilityChecker.ts` logic to JavaScript
- [ ] Copy pre-trained model data (`markov-model.json`)
- [ ] Create `lodeRunner.markov.js` with generation functions

### 2.2 Add PLAY_GENERATED Mode
- [ ] Add `PLAY_GENERATED = 8` constant to `lodeRunner.def.js`
- [ ] Add menu option for "Generated Levels" in `lodeRunner.menu.js`
- [ ] Hook into `startGame()` in `lodeRunner.main.js`:
  ```javascript
  case PLAY_GENERATED:
    levelMap = generateMarkovLevel();
    break;
  ```

### 2.3 Level Generation Settings
- [ ] Add UI controls for generation parameters:
  - Gold count (default: 6)
  - Enemy count (default: 3)
  - Difficulty style (Classic, Championship, etc.)
- [ ] "New Level" button to regenerate

### 2.4 Character Encoding Conversion
TotalRecall uses different characters than our Markov model output:

| Markov Output | TotalRecall | Meaning |
|---------------|-------------|---------|
| `.` | ` ` (space) | Empty |
| `b` | `#` | Brick |
| `B` | `@` | Solid block |
| `#` | `H` | Ladder |
| `-` | `-` | Rope |
| `G` | `$` | Gold |
| `E` | `0` | Enemy |
| `M` | `&` | Player |

- [ ] Add conversion function in `lodeRunner.markov.js`

---

## Phase 3: Retrain Markov Model on TotalRecall Levels

Use the 399 levels we already converted for better training data.

### 3.1 Update Training Pipeline
- [ ] Modify `scripts/train-with-extended-dataset.js` to read from converted levels
- [ ] Training data sources:
  - Classic: 150 levels
  - Championship: 51 levels
  - Professional: 150 levels
  - Revenge: 24 levels
  - Fan Book: 24 levels
  - Total: 399 levels (+ horizontal flips = 798)

### 3.2 Train Variant-Specific Models (Optional)
- [ ] Train separate model on Championship levels (harder patterns)
- [ ] Train separate model on Classic levels (standard difficulty)
- [ ] Allow selecting generation style in UI

### 3.3 Regenerate and Test
- [ ] Run training script
- [ ] Export to JSON format compatible with TotalRecall
- [ ] Test generated levels for quality and solvability

---

## Phase 4: Cleanup & Polish

### 4.1 Remove Unused TotalRecall Features
- [ ] Demo data files (`lodeRunner.demoData1.js`, `lodeRunner.demoData2.js`)
- [ ] World high score system (`lodeRunner.wData.js`)
- [ ] Share functionality (`lodeRunner.share.js`)
- [ ] Or keep them - up to you!

### 4.2 Rebrand
- [ ] Update title from "Lode Runner" to "Meelode"
- [ ] Update `lodeRunner.html` title and favicon
- [ ] Update cover image (`image/cover.png`)

### 4.3 Testing
- [ ] Test all 399 original levels load correctly
- [ ] Test generated levels work
- [ ] Test all game mechanics:
  - [ ] Player movement (walk, climb, rope, fall)
  - [ ] Digging and hole regeneration
  - [ ] Guard AI and pathfinding
  - [ ] Gold collection and carrying
  - [ ] Trap bricks
  - [ ] Hidden ladders
  - [ ] Win/lose conditions
- [ ] Test on different screen sizes (scaling)

---

## File Reference

### TotalRecall Files (in `totalrecall/`)

**Core Game Logic:**
- `lodeRunner.main.js` - Game loop, level building, state management
- `lodeRunner.runner.js` - Player movement and physics
- `lodeRunner.guard.js` - Guard AI, pathfinding, gold carrying
- `lodeRunner.def.js` - Constants, tile types, game states
- `lodeRunner.key.js` - Keyboard input handling

**Assets & Loading:**
- `lodeRunner.preload.js` - Asset loading, sprite sheet definitions
- `image/Theme/APPLE2/` - Sprite files to replace

**UI & Menus:**
- `lodeRunner.menu.js` - Menu system
- `lodeRunner.edit.js` - Level editor
- `lodeRunner.info.js` - Info display

**Level Data:**
- `lodeRunner.v.classic.js` - 150 Classic levels
- `lodeRunner.v.championship.js` - 51 Championship levels
- `lodeRunner.v.professional.js` - 150 Professional levels
- `lodeRunner.v.revenge.js` - 24 Revenge levels
- `lodeRunner.v.fanBookMod.js` - 24 Fan Book levels

### Meelode Files to Port

**Markov Generator:**
- `src/procgen/markovGenerator.ts` → `lodeRunner.markov.js`
- `src/procgen/solvabilityChecker.ts` → include in markov.js
- `src/procgen/trained/markov-model.json` → embed or load

**Sprites:**
- `assets/sprites/entities/player/` → `runner.png`
- `assets/sprites/entities/enemy/` → `guard.png`, `redhat.png`
- `assets/sprites/tiles/` → individual tile PNGs

---

## Technical Notes

### Sprite Sheet Layout
TotalRecall uses **grid layout** sprite sheets, not horizontal strips:
- Runner: 360x132 (9 cols × 3 rows × 40x44 per frame)
- Guard: 440x132 (11 cols × 3 rows × 40x44 per frame)
- Frame index = row * cols + col

### Tile-Based Collision
TotalRecall does NOT use hitboxes. It uses tile-entry collision:
- Each entity has `pos: { x, y, xOffset, yOffset }`
- `x, y` = tile coordinates (integer)
- `xOffset, yOffset` = sub-tile position (-half to +half)
- Collision checked when crossing tile boundaries
- `map[x][y].act` tracks what's in each tile

### CreateJS Library
TotalRecall uses CreateJS (EaselJS, TweenJS, SoundJS, PreloadJS):
- Already included in `lib/` folder
- No need to change - it works well

### Level Format
All levels are 448-character strings (28×16 tiles):
```javascript
levelMap = "   ...   " + // row 0
           "###H###  " + // row 1
           // ... 16 rows total
```

---

## Progress Tracking

### Completed
- [x] Clone TotalRecall repo
- [x] Analyze TotalRecall architecture
- [x] Understand sprite sheet format
- [x] Understand level loading system
- [x] Convert 399 levels to Meelode format (for training)

### In Progress
- [ ] Create sprite sheets with TexturePacker

### Next Up
- [ ] Replace sprites in TotalRecall
- [ ] Port Markov generator to JavaScript
- [ ] Add PLAY_GENERATED mode
- [ ] Retrain Markov model on 399 levels
