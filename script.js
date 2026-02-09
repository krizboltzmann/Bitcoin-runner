// ==========================================
// GAME STATES
// ==========================================

const GameState = {
    NOT_STARTED: 'NOT_STARTED',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

// ==========================================
// SOUND SYSTEM
// ==========================================

class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.isMuted = false;
        this.isInitialized = false;
    }
    
    init() {
        if (this.isInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
        } catch (e) {
            console.log('Audio not supported');
            this.isInitialized = false;
        }
    }
    
    playTone(frequency, duration, volume = 0.15, type = 'sine') {
        if (!this.isInitialized || this.isMuted || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    jump() {
        this.playTone(400, 0.1, 0.1, 'square');
    }
    
    coin() {
        this.playTone(800, 0.15, 0.12, 'sine');
        setTimeout(() => this.playTone(1000, 0.1, 0.08, 'sine'), 50);
    }
    
    hit() {
        this.playTone(150, 0.2, 0.15, 'sawtooth');
    }
    
    gameOver() {
        this.playTone(200, 0.3, 0.15, 'triangle');
        setTimeout(() => this.playTone(150, 0.4, 0.12, 'triangle'), 150);
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

const soundSystem = new SoundSystem();

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
    // Canvas
    canvasWidth: 1000,
    canvasHeight: 400,
    
    // Physics (Chrome Dino inspired)
    gravity: 0.5,
    jumpVelocity: -11,
    
    // Speed progression (STARTS EASY)
    initialSpeed: 3.5,
    maxSpeed: 11,
    speedIncrease: 0.08,
    speedIncreaseInterval: 2500,
    
    // Player
    playerX: 100,
    playerWidth: 20,
    playerHeight: 50,
    
    // Ground
    groundHeight: 80,
    
    // Obstacles (GENEROUS SPACING)
    obstacleWidth: 35,
    obstacleHeight: 40,
    initialObstacleGap: 2200,
    minObstacleGap: 900,
    obstacleGapDecrease: 60,
    
    // Coins (ALWAYS REACHABLE)
    coinSize: 24,
    coinMinGap: 700,
    coinMaxGap: 1600,
    maxCoinHeightPercent: 0.70,
    
    // Game rules
    startingLives: 3,
    invincibilityDuration: 1500,
    scorePerCoin: 1,
    scoreLossPerHit: 1,
    
    // Difficulty
    easyPhaseDuration: 35000,
};

// ==========================================
// GAME STATE MANAGEMENT
// ==========================================

let currentState = GameState.NOT_STARTED;

let gameData = {
    score: 0,
    lives: CONFIG.startingLives,
    distance: 0,
    speed: CONFIG.initialSpeed,
    currentObstacleGap: CONFIG.initialObstacleGap,
    lastSpeedIncrease: 0,
    gameStartTime: 0,
    isInvincible: false,
    invincibilityEnd: 0,
};

// ==========================================
// CANVAS SETUP
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 40, CONFIG.canvasWidth);
    const maxHeight = Math.min(window.innerHeight - 120, CONFIG.canvasHeight);
    
    canvas.width = maxWidth;
    canvas.height = maxHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ==========================================
// PLAYER CLASS
// ==========================================

class Player {
    constructor() {
        this.width = CONFIG.playerWidth;
        this.height = CONFIG.playerHeight;
        this.x = CONFIG.playerX;
        this.y = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.animationFrame = 0;
    }
    
    get groundY() {
        return canvas.height - CONFIG.groundHeight - this.height;
    }
    
    reset() {
        this.y = this.groundY;
        this.velocityY = 0;
        this.isJumping = false;
        this.animationFrame = 0;
    }
    
    jump() {
        if (!this.isJumping && currentState === GameState.RUNNING) {
            this.velocityY = CONFIG.jumpVelocity;
            this.isJumping = true;
            soundSystem.jump();
        }
    }
    
    update() {
        if (currentState !== GameState.RUNNING) return;
        
        this.velocityY += CONFIG.gravity;
        this.y += this.velocityY;
        
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.velocityY = 0;
            this.isJumping = false;
        }
        
        if (!this.isJumping) {
            this.animationFrame += 0.25;
        }
    }
    
    draw() {
        ctx.save();
        
        if (gameData.isInvincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
        
        const centerX = this.x + this.width / 2;
        
        ctx.strokeStyle = '#00ff88';
        ctx.fillStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Head
        ctx.beginPath();
        ctx.arc(centerX, this.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Body
        ctx.beginPath();
        ctx.moveTo(centerX, this.y + 18);
        ctx.lineTo(centerX, this.y + 35);
        ctx.stroke();
        
        // Arms
        const armSwing = this.isJumping ? 0 : Math.sin(this.animationFrame) * 6;
        
        ctx.beginPath();
        ctx.moveTo(centerX, this.y + 22);
        ctx.lineTo(centerX - 8, this.y + 28 + armSwing);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX, this.y + 22);
        ctx.lineTo(centerX + 8, this.y + 28 - armSwing);
        ctx.stroke();
        
        // Legs
        if (this.isJumping) {
            ctx.beginPath();
            ctx.moveTo(centerX, this.y + 35);
            ctx.lineTo(centerX - 5, this.y + 48);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX, this.y + 35);
            ctx.lineTo(centerX + 5, this.y + 48);
            ctx.stroke();
        } else {
            const legSwing = Math.sin(this.animationFrame * 2) * 8;
            
            ctx.beginPath();
            ctx.moveTo(centerX, this.y + 35);
            ctx.lineTo(centerX - 6 + legSwing, this.y + 50);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX, this.y + 35);
            ctx.lineTo(centerX + 6 - legSwing, this.y + 50);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    getBounds() {
        return {
            x: this.x + 3,
            y: this.y + 3,
            width: this.width - 6,
            height: this.height - 6
        };
    }
}

const player = new Player();

// ==========================================
// OBSTACLE CLASS
// ==========================================

class Obstacle {
    constructor() {
        this.width = CONFIG.obstacleWidth;
        this.height = CONFIG.obstacleHeight;
        this.x = canvas.width;
        this.y = canvas.height - CONFIG.groundHeight - this.height;
    }
    
    update() {
        if (currentState !== GameState.RUNNING) return;
        this.x -= gameData.speed;
    }
    
    draw() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX, this.y);
        ctx.lineTo(centerX + 6, this.y - 14);
        ctx.stroke();
        
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(centerX + 6, this.y - 14, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', centerX, centerY);
    }
    
    getBounds() {
        return {
            x: this.x + 4,
            y: this.y + 4,
            width: this.width - 8,
            height: this.height - 8
        };
    }
    
    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// ==========================================
// COIN CLASS
// ==========================================

class Coin {
    constructor() {
        this.size = CONFIG.coinSize;
        this.x = canvas.width;
        
        const maxJumpHeight = Math.abs(CONFIG.jumpVelocity * CONFIG.jumpVelocity) / (2 * CONFIG.gravity);
        const maxCoinHeight = maxJumpHeight * CONFIG.maxCoinHeightPercent;
        
        const onGround = Math.random() > 0.4;
        if (onGround) {
            this.y = canvas.height - CONFIG.groundHeight - this.size;
        } else {
            const heightAboveGround = Math.random() * maxCoinHeight;
            this.y = canvas.height - CONFIG.groundHeight - this.size - heightAboveGround;
        }
        
        this.rotation = 0;
        this.collected = false;
    }
    
    update() {
        if (currentState !== GameState.RUNNING) return;
        this.x -= gameData.speed;
        this.rotation += 0.1;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.rotation);
        
        ctx.fillStyle = '#f7931a';
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ff8c00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2 - 3, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₿', 0, 0);
        
        ctx.restore();
    }
    
    getBounds() {
        return {
            x: this.x + 2,
            y: this.y + 2,
            width: this.size - 4,
            height: this.size - 4
        };
    }
    
    isOffScreen() {
        return this.x + this.size < 0;
    }
}

// ==========================================
// PARTICLE CLASS
// ==========================================

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 2;
        this.life = 1;
        this.color = color;
        this.size = Math.random() * 5 + 2;
    }
    
    update() {
        if (currentState !== GameState.RUNNING) return;
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3;
        this.life -= 0.025;
    }
    
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    isDead() {
        return this.life <= 0;
    }
}

// ==========================================
// GAME ARRAYS
// ==========================================

let obstacles = [];
let coins = [];
let particles = [];

// ==========================================
// COLLISION DETECTION
// ==========================================

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function createParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// ==========================================
// SPAWNING
// ==========================================

function shouldSpawnObstacle() {
    if (obstacles.length === 0) return true;
    const lastObstacle = obstacles[obstacles.length - 1];
    const gap = canvas.width - lastObstacle.x;
    return gap >= gameData.currentObstacleGap;
}

function shouldSpawnCoin() {
    if (coins.length === 0) return Math.random() > 0.6;
    const lastCoin = coins[coins.length - 1];
    const gap = canvas.width - lastCoin.x;
    return gap >= CONFIG.coinMinGap && Math.random() > 0.5;
}

// ==========================================
// GAME UPDATE
// ==========================================

function updateGame(timestamp) {
    if (currentState !== GameState.RUNNING) return;
    
    const timeSinceStart = timestamp - gameData.gameStartTime;
    
    // Progressive difficulty
    if (timestamp - gameData.lastSpeedIncrease > CONFIG.speedIncreaseInterval) {
        if (gameData.speed < CONFIG.maxSpeed) {
            gameData.speed += CONFIG.speedIncrease;
        }
        
        if (timeSinceStart > CONFIG.easyPhaseDuration) {
            if (gameData.currentObstacleGap > CONFIG.minObstacleGap) {
                gameData.currentObstacleGap -= CONFIG.obstacleGapDecrease;
            }
        }
        
        gameData.lastSpeedIncrease = timestamp;
    }
    
    gameData.distance += gameData.speed * 0.05;
    
    player.update();
    
    if (shouldSpawnObstacle()) {
        obstacles.push(new Obstacle());
    }
    
    if (shouldSpawnCoin()) {
        coins.push(new Coin());
    }
    
    obstacles.forEach((obstacle, index) => {
        obstacle.update();
        
        if (!gameData.isInvincible && checkCollision(player.getBounds(), obstacle.getBounds())) {
            handleObstacleHit(obstacle);
        }
        
        if (obstacle.isOffScreen()) {
            obstacles.splice(index, 1);
        }
    });
    
    coins.forEach((coin, index) => {
        coin.update();
        
        if (!coin.collected && checkCollision(player.getBounds(), coin.getBounds())) {
            coin.collected = true;
            gameData.score += CONFIG.scorePerCoin;
            createParticles(coin.x + coin.size / 2, coin.y + coin.size / 2, '#f7931a', 15);
            soundSystem.coin();
            updateUI();
            coins.splice(index, 1);
        }
        
        if (coin.isOffScreen()) {
            coins.splice(index, 1);
        }
    });
    
    particles.forEach((particle, index) => {
        particle.update();
        if (particle.isDead()) {
            particles.splice(index, 1);
        }
    });
    
    if (gameData.isInvincible && timestamp > gameData.invincibilityEnd) {
        gameData.isInvincible = false;
    }
}

// ==========================================
// COLLISION HANDLING
// ==========================================

function handleObstacleHit(obstacle) {
    gameData.lives--;
    gameData.score = Math.max(0, gameData.score - CONFIG.scoreLossPerHit);
    
    createParticles(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, '#ff3366', 20);
    soundSystem.hit();
    
    gameData.isInvincible = true;
    gameData.invincibilityEnd = performance.now() + CONFIG.invincibilityDuration;
    
    updateUI();
    
    if (gameData.lives <= 0) {
        endGame();
    }
}

// ==========================================
// RENDERING
// ==========================================

function drawBackground() {
    ctx.strokeStyle = 'rgba(247, 147, 26, 0.06)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height - CONFIG.groundHeight);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height - CONFIG.groundHeight; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawGround() {
    const groundY = canvas.height - CONFIG.groundHeight;
    
    ctx.fillStyle = '#1a2540';
    ctx.fillRect(0, groundY, canvas.width, CONFIG.groundHeight);
    
    ctx.strokeStyle = '#f7931a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(247, 147, 26, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, groundY + 5);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
}

function render() {
    ctx.fillStyle = '#0f1624';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    drawGround();
    
    coins.forEach(coin => coin.draw());
    obstacles.forEach(obstacle => obstacle.draw());
    particles.forEach(particle => particle.draw());
    player.draw();
}

// ==========================================
// GAME LOOP
// ==========================================

function gameLoop(timestamp) {
    updateGame(timestamp);
    render();
    requestAnimationFrame(gameLoop);
}

// ==========================================
// UI UPDATES
// ==========================================

function updateUI() {
    document.getElementById('score').textContent = gameData.score;
    
    const hearts = '❤️'.repeat(Math.max(0, gameData.lives));
    const empty = '🖤'.repeat(Math.max(0, CONFIG.startingLives - gameData.lives));
    document.getElementById('lives').textContent = hearts + empty;
    
    document.getElementById('distance').textContent = Math.floor(gameData.distance) + 'm';
}

// ==========================================
// GAME CONTROL
// ==========================================

function startGame() {
    // Initialize sound on first interaction
    soundSystem.init();
    
    currentState = GameState.RUNNING;
    
    gameData = {
        score: 0,
        lives: CONFIG.startingLives,
        distance: 0,
        speed: CONFIG.initialSpeed,
        currentObstacleGap: CONFIG.initialObstacleGap,
        lastSpeedIncrease: performance.now(),
        gameStartTime: performance.now(),
        isInvincible: false,
        invincibilityEnd: 0,
    };
    
    obstacles = [];
    coins = [];
    particles = [];
    
    player.reset();
    updateUI();
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('pausedScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
}

function pauseGame() {
    if (currentState === GameState.RUNNING) {
        currentState = GameState.PAUSED;
        document.getElementById('pausedScreen').classList.remove('hidden');
    } else if (currentState === GameState.PAUSED) {
        currentState = GameState.RUNNING;
        document.getElementById('pausedScreen').classList.add('hidden');
        gameData.lastSpeedIncrease = performance.now();
    }
}

function endGame() {
    currentState = GameState.GAME_OVER;
    
    soundSystem.gameOver();
    
    document.getElementById('finalScore').textContent = gameData.score;
    document.getElementById('finalDistance').textContent = Math.floor(gameData.distance) + 'm';
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ==========================================
// INPUT HANDLING
// ==========================================

function handleSpacePress() {
    if (currentState === GameState.NOT_STARTED || currentState === GameState.GAME_OVER) {
        startGame();
    } else if (currentState === GameState.RUNNING) {
        player.jump();
    }
}

function handleEscapePress() {
    if (currentState === GameState.RUNNING || currentState === GameState.PAUSED) {
        pauseGame();
    }
}

// Keyboard
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleSpacePress();
    } else if (e.code === 'Escape') {
        e.preventDefault();
        handleEscapePress();
    }
});

// Touch/Click
canvas.addEventListener('click', () => {
    if (currentState === GameState.RUNNING) {
        player.jump();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (currentState === GameState.RUNNING) {
        player.jump();
    }
});

// Mute button
document.getElementById('muteBtn').addEventListener('click', () => {
    soundSystem.init(); // Ensure audio is initialized
    const isMuted = soundSystem.toggleMute();
    document.getElementById('muteIcon').textContent = isMuted ? '🔇' : '🔊';
    document.getElementById('muteBtn').classList.toggle('muted', isMuted);
});

// Prevent scrolling
document.body.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// ==========================================
// INITIALIZATION
// ==========================================

player.reset();
gameLoop(0);
