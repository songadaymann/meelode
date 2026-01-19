# Meelode

A Lode Runner remix featuring procedurally generated levels using Markov chains.

## Features

- **Classic Mode**: Play the original 150 levels of Lode Runner
- **Generated Mode**: Play infinitely generated levels using Markov chain algorithms trained on classic level patterns
- **Level Editor**: Create and test your own levels
- **Global Leaderboard**: Compete with players worldwide via mann.cool
- **Mobile Support**: Virtual controller integration for mann.cool's mobile arcade

## Play

The game is deployed at: [Coming Soon]

Or run locally:
```bash
cd totalrecall
python3 -m http.server 9999
# Open http://localhost:9999
```

## Controls

### Keyboard
- **Arrow Keys / WASD**: Move
- **Z / Q**: Dig left
- **X / E**: Dig right
- **ESC**: Pause

### Mobile (via mann.cool)
- **D-pad**: Move
- **A button**: Dig left
- **B button**: Dig right

## Project Structure

```
meelode/
├── totalrecall/          # Main game (HTML5 Lode Runner)
│   ├── lodeRunner.html   # Entry point
│   ├── lodeRunner.markov.js    # Markov level generator
│   ├── lodeRunner.leaderboard.js # mann.cool integration
│   └── ...
├── src/procgen/          # TypeScript Markov generator (source)
├── scripts/              # Training and analysis scripts
└── assets/               # Game assets
```

## Development

### Level Generation

The Markov chain generator analyzes patterns from classic Lode Runner levels to create new playable levels. It considers:
- Tile adjacency patterns (what tiles typically appear next to each other)
- Structural validity (ladders reach floors, ropes are accessible)
- Playability verification using A* pathfinding

### mann.cool Integration

The game integrates with mann.cool for:
- Virtual controller support on mobile
- Global leaderboard API
- Play tracking

## Credits

- Original Lode Runner by Douglas E. Smith (1983)
- HTML5 remake base: [LodeRunner_TotalRecall](https://github.com/SimonHung/LodeRunner_TotalRecall) by Simon Hung
- Markov generation and mann.cool integration by Jonathan Mann

## License

Game code modifications are open source. Original Lode Runner is a trademark of Tozai Games.
