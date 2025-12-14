# Antigravity Tetris

A premium web-based Tetris implementation with sound effects, particle explosions, and smooth controls.

## Features

- **Classic Gameplay**: 20x10 grid, 7-bag randomizer, super rotation system (basic).
- **Web Audio Sound**: Procedural sound effects for drops, clears, and explosions (no external assets).
- **Visual Effects**: Particle system explosions on Game Over, screen shake, and smooth animations.
- **Controls**:
    - Arrow Keys / WASD: Move and Rotate
    - ESC: Pause
    - Q: Quit to Menu
- **Scoring**:
    - Lines: 10 points per line (multiplied by level logic implicitly in speed)
    - Soft Drop: 1 point per row

## Setup

Simply open `web/index.html` in a modern web browser. No build step required.

## Documentation

Design documents are located in the `docs/` directory:
- `implementation_plan.md`: Initial plan and specs.
- `task.md`: Development task tracking.

## License

MIT
