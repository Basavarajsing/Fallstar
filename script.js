// Fallstar - Optimized Catch Game
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('hi-score');
const gamecontainer = document.querySelector('.game-container');
const basket = document.getElementById('basket');
const action = document.getElementById('actions');
const levelElement = document.getElementById('level');
const comboElement = document.getElementById('combo');
const timerElement = document.getElementById('timer');
const guideModal = document.getElementById('guide-modal');
const gameOverModal = document.getElementById('game-over-modal');
const startGameBtn = document.getElementById('start-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const helpBtn = document.getElementById('help-btn');
const finalScoreEl = document.getElementById('final-score');
const gameStatsEl = document.getElementById('game-stats');
const newHighEl = document.getElementById('new-high');

const GAME_DURATION = 60; // 1 minute
let score = 0;
let gameMode = 'ready'; // ready | play | pause | ended
let combo = 0;
let level = 1;
let touchStartX = 0;
let basketX = 0;
let timeLeft = GAME_DURATION;
let timerInterval = null;
let highScore = parseInt(localStorage.getItem('high-score') || '0', 10);
let gameStarted = false;
let caughtCount = 0;
let missedCount = 0;

// Object pooling
const objectPool = [];
const FALL_SPEED_BASE = 2;
const LEVEL_THRESHOLDS = [0, 20, 50, 100, 150, 200, 300];

// Object types: normal (1pt), 2x (double), bomb (-1)
const OBJECT_TYPES = [
  { type: 'normal', isBomb: false, isDouble: false, color: '#ff6b6b' },
  { type: 'normal', isBomb: false, isDouble: false, color: '#4ecdc4' },
  { type: 'normal', isBomb: false, isDouble: false, color: '#ffe66d' },
  { type: 'double', isBomb: false, isDouble: true, color: '#ffd700' },
  { type: 'bomb', isBomb: true, isDouble: false, color: '#2d3436' }
];

function getPooledObject() {
  let obj = objectPool.pop();
  if (!obj) {
    obj = document.createElement('div');
    obj.className = 'falling-object';
  }
  obj.style.cssText = '';
  obj.className = 'falling-object';
  return obj;
}

function returnToPool(obj) {
  obj.style.display = 'none';
  obj.classList.remove('bomb', 'fruit', 'double', 'powerup');
  objectPool.push(obj);
}

// Guide modal - show on first visit
function showGuide() {
  guideModal.classList.remove('hidden');
}
function hideGuide() {
  guideModal.classList.add('hidden');
  localStorage.setItem('fallstar-guide-seen', '1');
}

// Game over
function showGameOver() {
  gameMode = 'ended';
  clearInterval(timerInterval);
  timerInterval = null;
  finalScoreEl.textContent = `Score: ${score}`;
  gameStatsEl.textContent = `Caught: ${caughtCount}  •  Missed: ${missedCount}`;
  newHighEl.classList.toggle('hidden', score <= highScore);
  gameOverModal.classList.remove('hidden');
}

function hideGameOver() {
  gameOverModal.classList.add('hidden');
}

// Reset and start new game
function startNewGame() {
  hideGuide();
  hideGameOver();
  gameMode = 'play';
  gameStarted = true;
  score = 0;
  combo = 0;
  level = 1;
  caughtCount = 0;
  missedCount = 0;
  timeLeft = GAME_DURATION;
  scoreElement.textContent = `Score: ${score}`;
  if (comboElement) comboElement.textContent = '';
  if (levelElement) levelElement.textContent = 'Level 1';
  timerElement.textContent = '1:00';
  timerElement.classList.remove('timer-low');
  action.textContent = 'Pause';

  // Clear falling objects
  document.querySelectorAll('.falling-object').forEach(el => el.remove());
  document.querySelectorAll('.particle').forEach(el => el.remove());
  fallingObjects.clear();
  objectPool.length = 0;

  // Start timer
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameMode !== 'play') return;
    timeLeft--;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    timerElement.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    if (timeLeft <= 10) timerElement.classList.add('timer-low');
    if (timeLeft <= 0) showGameOver();
  }, 1000);
}

startGameBtn.addEventListener('click', startNewGame);
playAgainBtn.addEventListener('click', startNewGame);
helpBtn.addEventListener('click', showGuide);

// Show guide on first load, else show Start button
if (!localStorage.getItem('fallstar-guide-seen')) {
  showGuide();
} else {
  guideModal.classList.add('hidden');
  action.textContent = 'Start';
}

highScoreElement.textContent = `High-Score: ${highScore}`;

function checkgamemode() {
  if (gameMode === 'ended') return;
  if (!gameStarted) {
    startNewGame();
    return;
  }
  gameMode = gameMode === 'play' ? 'pause' : 'play';
  action.textContent = gameMode === 'play' ? 'Pause' : 'Play';
}
action.addEventListener('click', checkgamemode);

// Mouse controls
let lastMove = 0;
document.addEventListener('mousemove', (e) => {
  if (gameMode !== 'play') return;
  const now = performance.now();
  if (now - lastMove < 16) return;
  lastMove = now;
  const rect = gamecontainer.getBoundingClientRect();
  basketX = Math.max(0, Math.min(
    e.clientX - rect.left - basket.offsetWidth / 2,
    gamecontainer.clientWidth - basket.offsetWidth
  ));
  basket.style.transform = `translateX(${basketX}px)`;
});

// Touch controls
if ('ontouchstart' in window) {
  document.addEventListener('touchstart', (e) => {
    if (gameMode !== 'play') return;
    touchStartX = e.changedTouches[0].clientX;
  });
  document.addEventListener('touchend', (e) => {
    if (gameMode !== 'play') return;
    const endX = e.changedTouches[0].clientX;
    const change = touchStartX - endX;
    basketX = Math.max(0, Math.min(
      basketX - change,
      gamecontainer.clientWidth - basket.offsetWidth
    ));
    basket.style.transform = `translateX(${basketX}px)`;
  });
}

function createParticles(x, y, color) {
  const particles = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dx = Math.cos(angle) * 35;
    const dy = Math.sin(angle) * 35;
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${x}px;top:${y}px;background:${color};--dx:${dx}px;--dy:${dy}px`;
    gamecontainer.appendChild(p);
    particles.push(p);
  }
  setTimeout(() => particles.forEach(p => p.remove()), 500);
}

// Falling objects
const fallingObjects = new Map();
let lastSpawn = 0;
let spawnInterval = 1000;

function getFallSpeed() {
  return FALL_SPEED_BASE + level * 0.8;
}

function updateLevel() {
  const newLevel = LEVEL_THRESHOLDS.filter(t => score >= t).length;
  if (newLevel > level) {
    level = newLevel;
    if (levelElement) levelElement.textContent = `Level ${level}`;
    spawnInterval = Math.max(400, 1000 - level * 80);
  }
}

function createFallingObject() {
  if (gameMode !== 'play') return;
  if (timeLeft <= 0) return;

  // Weight: normal 50%, double 25%, bomb 25%
  const r = Math.random();
  let idx;
  if (r < 0.5) idx = Math.floor(Math.random() * 3); // normal
  else if (r < 0.75) idx = 3; // 2x
  else idx = 4; // bomb

  const config = OBJECT_TYPES[idx];
  const obj = getPooledObject();
  obj.classList.add(config.isBomb ? 'bomb' : config.isDouble ? 'double' : 'fruit');
  obj.style.display = 'block';
  obj.style.left = Math.random() * (gamecontainer.clientWidth - 30) + 'px';
  obj.style.top = '0';
  obj.style.backgroundColor = config.color;
  obj.style.backgroundImage = config.isBomb ? 'none' : `url("./p${idx + 1}.png")`;
  obj.dataset.isBomb = config.isBomb ? '1' : '0';
  obj.dataset.isDouble = config.isDouble ? '1' : '0';
  gamecontainer.appendChild(obj);

  const data = {
    top: 0,
    left: parseFloat(obj.style.left),
    isBomb: config.isBomb,
    isDouble: config.isDouble,
    width: 30,
    height: 30
  };
  fallingObjects.set(obj, data);
}

function checkCollision(obj, data) {
  const objLeft = data.left;
  const objRight = objLeft + data.width;
  const basketRight = basketX + basket.offsetWidth;

  if (objLeft < basketRight && objRight > basketX) {
    caughtCount++;
    if (data.isBomb) {
      if (score > 0) score--;
      combo = 0;
    } else {
      const baseMult = Math.min(combo + 1, 5);
      points = data.isDouble ? baseMult * 2 : baseMult;
      score += points;
      combo++;
      createParticles(data.left + 15, data.top + 15, data.isDouble ? '#ffd700' : '#ffe66d');
    }
    scoreElement.textContent = `Score: ${score}`;
    if (comboElement) comboElement.textContent = combo > 1 ? `Combo x${combo}` : '';
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('high-score', String(highScore));
      highScoreElement.textContent = `High-Score: ${highScore}`;
    }
    fallingObjects.delete(obj);
    obj.remove();
    returnToPool(obj);
    updateLevel();
    return true;
  }
  return false;
}

function gameLoop(timestamp) {
  if (gameMode === 'play') {
    const speed = getFallSpeed();

    fallingObjects.forEach((data, obj) => {
      data.top += speed;
      obj.style.transform = `translateY(${data.top}px)`;

      if (data.top >= gamecontainer.clientHeight - basket.offsetHeight - data.height) {
        if (checkCollision(obj, data)) return;

        if (data.top >= gamecontainer.clientHeight - data.height) {
          missedCount++;
          combo = 0;
          if (comboElement) comboElement.textContent = '';
          fallingObjects.delete(obj);
          obj.remove();
          returnToPool(obj);
        }
      }
    });

    if (timestamp - lastSpawn >= spawnInterval) {
      lastSpawn = timestamp;
      createFallingObject();
    }
  }
  requestAnimationFrame(gameLoop);
}

// Init basket
basketX = (gamecontainer.clientWidth - basket.offsetWidth) / 2;
basket.style.transform = `translateX(${basketX}px)`;

requestAnimationFrame(gameLoop);
