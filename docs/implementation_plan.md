# Implementation Plan - Web Tetris

This plan outlines the steps to port the terminal-based Tetris game to a modern web application.

## Goal Description
Create a premium, web-based Tetris game that replicates the mechanics of the Python version (WASD controls, speed scaling, pause) but utilizes modern web technologies for a superior visual experience.

## User Review Required
> [!NOTE]
> The game will be built in `.../Antigravity/web/` to avoid cluttering the root directory.

## Proposed Changes

### Structure
#### [NEW] Directory: `/Users/tomotake/Library/CloudStorage/GoogleDrive-tomotake.koike@gmail.com/マイドライブ/Antigravity/web/`

#### [NEW] [index.html](file:///Users/tomotake/Library/CloudStorage/GoogleDrive-tomotake.koike@gmail.com/マイドライブ/Antigravity/web/index.html)
- Main entry point.
- Contains the game canvas/grid container and UI overlays (Start Menu, Game Over, Pause).

#### [NEW] [style.css](file:///Users/tomotake/Library/CloudStorage/GoogleDrive-tomotake.koike@gmail.com/マイドライブ/Antigravity/web/style.css)
- **Aesthetics**: Dark theme, vibrant block colors, subtle glow effects, responsive layout.
- **Layout**: Centered game board with side panel for Score/Level/Next Piece.

#### [NEW] [script.js](file:///Users/tomotake/Library/CloudStorage/GoogleDrive-tomotake.koike@gmail.com/マイドライブ/Antigravity/web/script.js)
- **Logic Port**:
    - `Tetromino` definitions and rotation logic.
    - `TetrisGame` class managing board state.
    - `Game Loop` using `requestAnimationFrame`.
    - **Input Handling**: 'keydown' events for Arrows, WASD, Q, ESC.
    - **Speed Logic**: Level selection 1-10, 30pts threshold, speed /= 3.

## Verification Plan

### Manual Verification
- Open `index.html` in a browser.
- Verify "Start Level" selection works.
- Verify rendering (Solid blocks, grid).
- Test Controls: WASD/Arrows to move, Up to rotate, Down to soft drop.
- Test Mechanics: Line clearing, Scoring (10pts/line), Speed up (verify abrupt speed up at 30pts).
- Test Pause (ESC) and Quit/Reload behavior.
