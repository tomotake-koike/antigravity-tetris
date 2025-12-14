// Sound Manager using Web Audio API
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3; // Low volume
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, startTime = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playDrop() {
        // Light "thud" or "click"
        this.playTone(800, 'sine', 0.1);
    }

    playExplosion() {
        // 1. Noise Burst (Flashy top end)
        const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 1.5);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start();

        // 2. Sub Bass Impact (Heavy low end)
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
        subOsc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 2.0); // Pitch drop

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2.0);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain);

        subOsc.start();
        subOsc.stop(this.ctx.currentTime + 2.5);
    }

    playClear(lines) {
        // Harmonious chords based on line count
        const base = 440; // A4
        const chords = [
            [base * 1.25], // Major 3rd (1 line)
            [base, base * 1.25, base * 1.5], // Major Triad (2 lines)
            [base, base * 1.25, base * 1.5, base * 2], // Major Triad + Octave (3 lines)
            [base, base * 1.25, base * 1.5, base * 2, base * 2.5] // Tetris!
        ];

        const notes = chords[Math.min(lines - 1, 3)];
        notes.forEach((freq, i) => {
            this.playTone(freq, 'triangle', 0.3, i * 0.05);
        });
    }
}

const sounds = new SoundManager();

function triggerExplosion() {
    sounds.playExplosion();
    const cells = document.querySelectorAll('.game-board .cell.filled');

    cells.forEach(cell => {
        // Random direction and rotation
        const angle = Math.random() * Math.PI * 2;
        const velocity = 200 + Math.random() * 600; // pixels
        const rotate = (Math.random() - 0.5) * 720; // degrees

        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        cell.classList.add('explode');
        cell.style.transform = `translate(${tx}px, ${ty}px) rotate(${rotate}deg)`;
    });
}

// Game Constants and State
const SHAPES = [
    [[1, 1, 1, 1]],  // I
    [[1, 1], [1, 1]],  // O
    [[0, 1, 0], [1, 1, 1]],  // T
    [[1, 0, 0], [1, 1, 1]],  // J
    [[0, 0, 1], [1, 1, 1]],  // L
    [[0, 1, 1], [1, 1, 0]],  // S
    [[1, 1, 0], [0, 1, 1]]   // Z
];

// Colors mapped to CSS classes .c-1 to .c-7
const COLORS = [1, 2, 3, 4, 5, 6, 7];

class Tetromino {
    constructor(x, y, shapeIdx) {
        this.x = x;
        this.y = y;
        this.shape = SHAPES[shapeIdx];
        this.color = shapeIdx + 1;
    }

    rotate() {
        // Rotate matrix 90 degrees clockwise
        const oldShape = this.shape;
        this.shape = oldShape[0].map((val, index) => oldShape.map(row => row[index]).reverse());
    }
}

class TetrisGame {
    constructor(startLevel = 1) {
        this.boardWidth = 10;
        this.boardHeight = 20;
        this.board = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(0));

        this.score = 0;
        this.level = startLevel;

        // Python logic: max(0.05, 1.0 - (level - 1) * 0.1) / 3.0
        this.initialSpeed = Math.max(0.05, 1.0 - (this.level - 1) * 0.1) / 3.0;
        this.baseSpeed = this.initialSpeed; // in seconds

        this.gameOver = false;
        this.paused = false;

        this.bag = [];
        this.currentPiece = this.newPiece();
        this.nextPiece = this.newPiece();

        this.lastFallTime = 0;
    }

    refillBag() {
        // Create a bag with one of each shape index (0-6)
        this.bag = [0, 1, 2, 3, 4, 5, 6];
        // Fisher-Yates Shuffle
        for (let i = this.bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
    }

    newPiece() {
        if (this.bag.length === 0) {
            this.refillBag();
        }

        const shapeIdx = this.bag.pop();
        const shape = SHAPES[shapeIdx];
        // Center: width/2 - shape_width/2
        const x = Math.floor(this.boardWidth / 2 - shape[0].length / 2);
        const piece = new Tetromino(x, 0, shapeIdx);

        // Random orientation
        const r = Math.floor(Math.random() * 4);
        for (let i = 0; i < r; i++) {
            piece.rotate();
        }

        return piece;
    }

    checkCollision(piece, adjX = 0, adjY = 0) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = piece.x + x + adjX;
                    const newY = piece.y + y + adjY;

                    if (newX < 0 || newX >= this.boardWidth || newY >= this.boardHeight) {
                        return true;
                    }
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    mergePiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    if (boardY >= 0 && boardY < this.boardHeight) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
        sounds.playDrop();
    }

    clearLines() {
        let linesCleared = 0;
        const newBoard = this.board.filter(row => row.some(cell => cell === 0));
        linesCleared = this.boardHeight - newBoard.length;

        if (linesCleared > 0) {
            for (let i = 0; i < linesCleared; i++) {
                newBoard.unshift(Array(this.boardWidth).fill(0));
            }
            this.board = newBoard;

            // Play sound
            sounds.playClear(linesCleared);

            // Score Logic: 10pts per line
            this.score += linesCleared * 10;

            // Speed Logic: speed * (1/3) every 30pts
            const speedStage = Math.floor(this.score / 30);
            this.baseSpeed = this.initialSpeed * Math.pow(1 / 3, speedStage);
        }
    }

    update(currentTime) {
        if (this.paused || this.gameOver) return;

        if (!this.lastFallTime) this.lastFallTime = currentTime;

        const deltaTime = (currentTime - this.lastFallTime) / 1000; // to seconds

        if (deltaTime > this.baseSpeed) {
            if (!this.checkCollision(this.currentPiece, 0, 1)) {
                this.currentPiece.y += 1;
            } else {
                this.mergePiece();
                this.clearLines();
                this.currentPiece = this.nextPiece;
                this.nextPiece = this.newPiece();

                if (this.checkCollision(this.currentPiece)) {
                    this.gameOver = true;
                }
            }
            this.lastFallTime = currentTime;
        }
    }

    move(dx, dy) {
        if (!this.checkCollision(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            return true;
        }
        return false;
    }

    rotate() {
        const originalShape = this.currentPiece.shape;
        this.currentPiece.rotate();
        if (this.checkCollision(this.currentPiece)) {
            this.currentPiece.shape = originalShape;
        }
    }
}

// UI & Input Handling
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameBoardEl = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const nextPieceEl = document.getElementById('next-piece');
const finalScoreEl = document.getElementById('final-score-val');

let game = null;
let animationId = null;
let startLevel = 1;

// Input State
const keys = {
    left: false,
    right: false,
    down: false,
    rotate: false
};

const DAS = 150; // Delayed Auto Shift (ms)
const ARR = 30;  // Auto Repeat Rate (ms)
const GRAVITY_ARR = 50; // Soft drop speed

let daTimer = 0;
let lastInputTime = 0;

function handleInput(time) {
    if (!game || game.paused || game.gameOver) return;

    // Soft Drop
    if (keys.down) {
        if (time - lastInputTime > GRAVITY_ARR) {
            if (game.move(0, 1)) {
                // reset fall timer if moved down manually
                game.lastFallTime = time;
                game.score += 1; // 1 point per row soft drop
                scoreEl.innerText = game.score; // Update UI immediately
                render();
            }
            lastInputTime = time; // shared timer for simplicity
        }
    }

    // Left Movement
    if (keys.left) {
        if (!keys.leftStartTime) {
            keys.leftStartTime = time;
            game.move(-1, 0);
            render();
        } else if (time - keys.leftStartTime > DAS) {
            if (time - (keys.lastLeftTime || 0) > ARR) {
                game.move(-1, 0);
                render();
                keys.lastLeftTime = time;
            }
        }
    } else {
        keys.leftStartTime = 0;
        keys.lastLeftTime = 0;
    }

    // Right Movement
    if (keys.right) {
        if (!keys.rightStartTime) {
            keys.rightStartTime = time;
            game.move(1, 0);
            render();
        } else if (time - keys.rightStartTime > DAS) {
            if (time - (keys.lastRightTime || 0) > ARR) {
                game.move(1, 0);
                render();
                keys.lastRightTime = time;
            }
        }
    } else {
        keys.rightStartTime = 0;
        keys.lastRightTime = 0;
    }
}

// Rendering
function render() {
    // Clear board (inefficient but simple for now, can optimize if needed)
    gameBoardEl.innerHTML = '';

    // Render Locked Blocks
    game.board.forEach((row, y) => {
        row.forEach((cell, x) => {
            const div = document.createElement('div');
            div.className = 'cell';
            if (cell) div.classList.add('filled', `c-${cell}`);
            // Grid position
            div.style.gridColumnStart = x + 1;
            div.style.gridRowStart = y + 1;
            gameBoardEl.appendChild(div);
        });
    });

    // Render Current Piece
    if (game.currentPiece && !game.gameOver) {
        game.currentPiece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    const div = document.createElement('div');
                    div.className = `cell filled c-${game.currentPiece.color}`;
                    div.style.gridColumnStart = game.currentPiece.x + x + 1;
                    div.style.gridRowStart = game.currentPiece.y + y + 1;
                    gameBoardEl.appendChild(div);
                }
            });
        });
    }

    // UI Updates
    scoreEl.innerText = game.score;
    levelEl.innerText = game.level;

    // Render Next Piece
    nextPieceEl.innerHTML = '';
    game.nextPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                const div = document.createElement('div');
                div.className = `mini-cell filled c-${game.nextPiece.color}`;
                div.style.gridColumnStart = x + 1;
                div.style.gridRowStart = y + 1;
                nextPieceEl.appendChild(div);
            }
        });
    });
}

function gameLoop(time) {
    if (game.paused) {
        animationId = requestAnimationFrame(gameLoop);
        return;
    }

    handleInput(time);
    game.update(time);
    render();

    if (game.gameOver) {
        showGameOver();
    } else {
        animationId = requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    sounds.resume(); // Ensure audio context is unlocking
    game = new TetrisGame(startLevel);
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    pauseScreen.classList.remove('active');

    // Reset FX: Hard Reset Canvas
    cancelAnimationFrame(fxAnimationId);
    particles = [];
    if (fxCtx && fxCanvas) {
        fxCanvas.width = fxCanvas.width; // This clears canvas and resets states
    }

    if (shakeIntervalId) {
        clearInterval(shakeIntervalId);
        shakeIntervalId = null;
    }
    const board = document.querySelector('.game-board-container');
    if (board) board.style.transform = 'none';

    // Reset keys
    Object.keys(keys).forEach(k => keys[k] = false);

    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (!game || game.gameOver) return;
    game.paused = !game.paused;
    if (game.paused) {
        pauseScreen.classList.add('active');
    } else {
        pauseScreen.classList.remove('active');
        game.lastFallTime = 0; // Reset delta timer
    }
}

// FX System
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');
let particles = [];
let fxAnimationId = null;
let shakeIntervalId = null;

class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'fire', 'smoke', 'spark'
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (type === 'spark' ? 10 : 5) + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.01 + 0.005;
        this.size = Math.random() * 20 + 10;
        if (type === 'spark') {
            this.size = Math.random() * 3 + 1;
            this.decay = 0.02;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;

        // Air resistance
        this.vx *= 0.95;
        this.vy *= 0.95;

        // Smoke rises
        if (this.type === 'smoke') {
            this.vy -= 0.05;
        }
    }

    draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        const alpha = Math.max(0, this.life);

        let color;
        if (this.type === 'fire') {
            // Yellow -> Orange -> Red
            if (this.life > 0.7) color = `rgba(255, 255, 100, ${alpha})`;
            else if (this.life > 0.4) color = `rgba(255, 100, 0, ${alpha})`;
            else color = `rgba(200, 50, 50, ${alpha})`;
        } else if (this.type === 'smoke') {
            ctx.globalCompositeOperation = 'source-over';
            color = `rgba(100, 100, 100, ${alpha * 0.5})`;
        } else {
            color = `rgba(255, 255, 255, ${alpha})`;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
}

function fxLoop() {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

    // Update and Draw (Iterate backwards to safe splice)
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(fxCtx);
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    if (particles.length > 0) {
        fxAnimationId = requestAnimationFrame(fxLoop);
    } else {
        fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    }
}

function triggerExplosion() {
    sounds.playExplosion();
    resizeCanvas(); // Ensure size is correct

    // Reset particles for new explosion
    particles = [];

    // Create explosion at center
    const centerX = fxCanvas.width / 2;
    const centerY = fxCanvas.height / 2;

    // Fire
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle(centerX, centerY, 'fire'));
    }
    // Smoke
    for (let i = 0; i < 30; i++) {
        particles.push(new Particle(centerX, centerY, 'smoke'));
    }
    // Sparks
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle(centerX, centerY, 'spark'));
    }

    cancelAnimationFrame(fxAnimationId);
    fxLoop();

    // Shake effect on board
    const board = document.querySelector('.game-board-container');
    board.style.transition = 'transform 0.05s';

    if (shakeIntervalId) clearInterval(shakeIntervalId);

    let shakeCount = 0;
    shakeIntervalId = setInterval(() => {
        const dx = (Math.random() - 0.5) * 20;
        const dy = (Math.random() - 0.5) * 20;
        board.style.transform = `translate(${dx}px, ${dy}px)`;
        shakeCount++;
        if (shakeCount > 20) {
            clearInterval(shakeIntervalId);
            shakeIntervalId = null;
            board.style.transform = 'none';
        }
    }, 50);
}

function showGameOver() {
    cancelAnimationFrame(animationId);
    triggerExplosion();

    // Delay showing the overlay so we can see the explosion
    setTimeout(() => {
        if (game) { // Check if game wasn't restarted in the meantime
            finalScoreEl.innerText = game.score;
            gameOverScreen.classList.add('active');
        }
    }, 2000);
}

function resizeCanvas() {
    const container = document.querySelector('.game-board-container');
    if (container && fxCanvas) {
        const rect = container.getBoundingClientRect();
        fxCanvas.width = rect.width;
        fxCanvas.height = rect.height;
    }
}

function quitGame() {
    cancelAnimationFrame(animationId);
    game = null;
    pauseScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    startScreen.classList.add('active');
}

// Input Event Listeners
document.addEventListener('keydown', (e) => {
    // Global keys
    if (e.key === 'q' || e.key === 'Q') {
        quitGame();
        return;
    }

    if (e.key === 'Escape') {
        togglePause();
        return;
    }

    if (!game || game.paused || game.gameOver) return;

    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = true;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = true;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (!keys.rotate) { // Prevent rapid fire rotation
                game.rotate();
                render();
                keys.rotate = true;
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = false;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = false;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.rotate = false;
            break;
    }
});

// Button Listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('quit-btn').addEventListener('click', quitGame);

document.getElementById('level-up').addEventListener('click', () => {
    if (startLevel < 10) {
        startLevel++;
        document.getElementById('level-display').innerText = startLevel;
    }
});

document.getElementById('level-down').addEventListener('click', () => {
    if (startLevel > 1) {
        startLevel--;
        document.getElementById('level-display').innerText = startLevel;
    }
});
