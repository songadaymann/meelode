# Meelode - Lode Runner Remix

## Project Overview
A Lode Runner remix with procedurally generated levels using Markov chains, integrated with mann.cool for mobile play and global leaderboards.

**Live:** [Coming Soon - Vercel deployment]
**Repo:** https://github.com/songadaymann/meelode

---

## Current Status: Ready for Deployment

### What's Working
- Full classic Lode Runner gameplay (150 original levels)
- Procedurally generated levels using Markov chains
- Level editor with touch support
- Global leaderboard via mann.cool API
- Mobile virtual controller support
- Custom menu system
- Simple first-play tutorial

---

## Quick Start

```bash
cd totalrecall
python3 -m http.server 9999
# Open http://localhost:9999/lodeRunner.html
```

### Controls
- **Arrow Keys / WASD** - Move
- **Z** - Dig left
- **X** - Dig right
- **ESC** - Pause
- **MENU button** (bottom right) - Open game menu

---

## Features

### Game Modes

| Mode | Description |
|------|-------------|
| **Original Mode** | Classic Lode Runner - 150 levels |
| **Generated Mode** | Infinite procedurally generated levels |
| **Create Level** | Built-in level editor |

### Menu System
Custom modal menu accessible via MENU button in frame:
- Original Mode
- Generated Mode
- See All Levels (level picker)
- Create Level (editor)
- Global Scores (leaderboard)

### Markov Level Generation
Trained on 415 levels from TotalRecall:
- Classic (150 levels)
- Professional (150 levels)
- Fan Book Mod (39 levels)
- Revenge (25 levels)
- Championship (51 levels)

Features:
- 136 learned tile patterns
- A* pathfinding validates solvability
- Retries up to 20x until finding solvable level
- Places gold, enemies, and player spawn intelligently

### mann.cool Integration

**Virtual Controller:**
- D-pad for movement
- A button (Z) - Dig left
- B button (X) - Dig right
- Works in iframe via postMessage API

**Name Input (High Score Entry):**
When entering a high score name on mobile, use the D-pad:
- **UP/DOWN:** Cycle through A-Z characters
- **LEFT/RIGHT:** Move cursor position
- **OK button (Enter):** Submit name

**Global Leaderboard:**
- Scores submitted automatically after entering name
- Separate leaderboards for Classic and Generated modes
- View global scores from menu

### UI/UX

**Custom Frame:**
- Apple II computer aesthetic
- Responsive - scales to any viewport
- MENU button integrated into frame

**Welcome Modal:**
- Simple white/black controls tutorial on first play
- Shows movement, digging, pause controls
- Points to MENU for more options

---

## File Structure

```
meelode/
├── totalrecall/              # Main game
│   ├── lodeRunner.html       # Entry point
│   ├── lodeRunner.markov.js  # Markov generator + A* checker
│   ├── lodeRunner.leaderboard.js  # mann.cool API integration
│   ├── markov-model.json     # Pre-trained Markov model
│   ├── image/
│   │   ├── frame.png         # Apple II frame overlay
│   │   └── introscreen.png   # Custom title screen
│   └── ...
├── src/procgen/              # TypeScript Markov source
├── scripts/                  # Training scripts
├── vercel.json              # Deployment config
└── README.md
```

---

## Deployment (Vercel)

1. Import repo in Vercel dashboard
2. Set **Root Directory** to `totalrecall`
3. Framework: **Other** (static HTML)
4. Build Command: leave empty
5. Deploy

The `vercel.json` handles iframe headers for mann.cool embedding.

---

## mann.cool Game Config

Add to mann.cool's games array:

```javascript
{
  slug: "meelode",
  title: "Meelode",
  gameUrl: "https://meelode.vercel.app",
  platform: "desktop",
  aspectRatio: "4 / 3",
  controls: {
    dpad: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" },
    actions: [
      { key: "z", label: "DIG L" },
      { key: "x", label: "DIG R" },
      { key: "Enter", label: "OK" },  // For name input confirmation
    ],
  },
}
```

---

## Development History

### Phase 1: Prototype
- Built standalone HTML5 Lode Runner with Phaser-like physics
- Implemented player movement, enemy AI, digging mechanics
- Created Markov chain level generator in TypeScript

### Phase 2: TotalRecall Integration
- Forked LodeRunner_TotalRecall as game engine base
- Ported Markov generator to JavaScript
- Added PLAY_GENERATED mode

### Phase 3: Custom Assets
- Created custom sprite sheets (runner.png, guard.png, redhat.png)
- Custom Apple II frame overlay
- Custom intro screen

### Phase 4: UI/UX Polish
- Responsive frame layout
- Modal menu system
- Removed demo mode and side icons
- Simple welcome tutorial

### Phase 5: mann.cool Integration
- Virtual controller support via postMessage
- Global leaderboard API integration
- Touch support for level editor
- Iframe embedding headers

---

## Technical Details

### Markov Model
- **Training:** 415 levels, 136 context patterns
- **Context:** 3-neighbor (above, left, above-left)
- **File:** `totalrecall/markov-model.json` (~14KB)

### Solvability Checker
- BFS reachability from player spawn
- Simulates gravity, ladders, ropes
- Considers digging through bricks
- Validates all gold is reachable

### Leaderboard API
- **Submit:** POST to `mann.cool/api/leaderboard`
- **Fetch:** GET from `mann.cool/api/leaderboard?game=meelode&variant=classic`
- Variants: `classic`, `generated`

---

## Known Issues

- "See All Levels" requires game assets to be loaded first (shows alert if clicked too early)
- "Create Level" requires game assets to be loaded first
- Mobile virtual controller (PICO) - controls not yet working, debugging in progress

---

## Credits

- Original Lode Runner by Douglas E. Smith (1983)
- TotalRecall engine by Simon Hung
- Markov generation & mann.cool integration by Jonathan Mann + Claude

---

## References

- [Championship Lode Runner Guard AI Analysis](https://datadrivengamer.blogspot.com/2023/01/championship-lode-runner-guard.html)
- [LodeRunner_TotalRecall](https://github.com/SimonHung/LodeRunner_TotalRecall)
- [VGLC Lode Runner Levels](https://github.com/TheVGLC/TheVGLC)
