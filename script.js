// Fallstar - Enhanced
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

// Game Constants & State
const GAME_DURATION = 60;
let score = 0;
let gameMode = 'ready'; // ready | play | pause | ended
let combo = 0;
let level = 1;
// Basket interpolation
let targetBasketX = 0;
let currentBasketX = 0;
let isTouch = false;

let timeLeft = GAME_DURATION;
let timerInterval = null;
let highScore = parseInt(localStorage.getItem('high-score') || '0', 10);
let gameStarted = false;
let caughtCount = 0;
let missedCount = 0;

// Power-up State
let freezeActive = false;
let freezeTimer = null;
let globalSpeedMultiplier = 1.0;

// Object Pooling
const objectPool = [];
const fallingObjects = new Map();
const FALL_SPEED_BASE = 2.5; // Slightly faster base speed
const LEVEL_THRESHOLDS = [0, 20, 50, 100, 150, 200, 300, 500];

// Types
// weights overlap: 0-0.5 normal (50%), 0.5-0.7 double (20%), 0.7-0.8 time (10%), 0.8-0.9 freeze (10%), 0.9-1.0 bomb (10%)
// Adjusted for better gameplay balance
const OBJECT_TYPES = [
  { type: 'normal', isBomb: false, color: '#ff6b6b' },
  { type: 'normal', isBomb: false, color: '#4ecdc4' },
  { type: 'normal', isBomb: false, color: '#ffe66d' },
  { type: 'double', isBomb: false, color: '#ffd700' },
  { type: 'time',   isBomb: false, color: '#4facfe' },
  { type: 'freeze', isBomb: false, color: '#84fab0' },
  { type: 'bomb',   isBomb: true,  color: '#2d3436' }
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
  obj.classList.remove('bomb', 'fruit', 'double', 'time', 'freeze');
  objectPool.push(obj);
}

// UI Functions
function showGuide() { guideModal.classList.remove('hidden'); }
function hideGuide() {
  guideModal.classList.add('hidden');
  localStorage.setItem('fallstar-guide-seen', '1');
}

function showGameOver() {
  gameMode = 'ended';
  clearInterval(timerInterval);
  timerInterval = null;
  finalScoreEl.textContent = `Score: ${score}`;
  gameStatsEl.textContent = `Caught: ${caughtCount}  •  Missed: ${missedCount}`;
  newHighEl.classList.toggle('hidden', score <= highScore);
  gameOverModal.classList.remove('hidden');
}
function hideGameOver() { gameOverModal.classList.add('hidden'); }

function createFloatingText(x, y, text, color) {
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  gamecontainer.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function triggerShake() {
  gamecontainer.classList.remove('shake');
  void gamecontainer.offsetWidth; // trigger reflow
  gamecontainer.classList.add('shake');
}

// Game Logic
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
  freezeActive = false;
  globalSpeedMultiplier = 1.0;
  
  if (freezeTimer) clearTimeout(freezeTimer);

  scoreElement.textContent = `Score: ${score}`;
  if (comboElement) comboElement.textContent = '';
  if (levelElement) levelElement.textContent = 'Level 1';
  timerElement.textContent = '1:00';
  timerElement.classList.remove('timer-low');
  action.textContent = 'Pause';

  // Cleanup
  document.querySelectorAll('.falling-object').forEach(el => el.remove());
  document.querySelectorAll('.particle').forEach(el => el.remove());
  document.querySelectorAll('.floating-text').forEach(el => el.remove());
  fallingObjects.clear();
  objectPool.length = 0;

  // Basket Reset
  targetBasketX = (gamecontainer.clientWidth - basket.offsetWidth) / 2;
  currentBasketX = targetBasketX;
  updateBasketPos();

  // Timer
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameMode !== 'play') return;
    timeLeft--;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    timerElement.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 10) timerElement.classList.add('timer-low');
    else timerElement.classList.remove('timer-low');
    
    if (timeLeft <= 0) showGameOver();
  }, 1000);
}

startGameBtn.addEventListener('click', startNewGame);
playAgainBtn.addEventListener('click', startNewGame);
helpBtn.addEventListener('click', () => {
  if(gameMode === 'play') checkgamemode(); // pause if playing
  showGuide();
});

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

// Input Handling
function updateBasketPos() {
    basket.style.transform = `translateX(${currentBasketX}px)`;
}

document.addEventListener('mousemove', (e) => {
  if (gameMode !== 'play' || isTouch) return;
  const rect = gamecontainer.getBoundingClientRect();
  targetBasketX = e.clientX - rect.left - basket.offsetWidth / 2;
  // Clamping happens in the update loop or here
  targetBasketX = Math.max(0, Math.min(targetBasketX, gamecontainer.clientWidth - basket.offsetWidth));
});

// Touch
if ('ontouchstart' in window) {
  gamecontainer.addEventListener('touchstart', (e) => {
    if (gameMode !== 'play') return;
    isTouch = true;
    const rect = gamecontainer.getBoundingClientRect();
    targetBasketX = e.touches[0].clientX - rect.left - basket.offsetWidth / 2;
    targetBasketX = Math.max(0, Math.min(targetBasketX, gamecontainer.clientWidth - basket.offsetWidth));
  }, {passive: true});
  
  gamecontainer.addEventListener('touchmove', (e) => {
    if (gameMode !== 'play') return;
    const rect = gamecontainer.getBoundingClientRect();
    targetBasketX = e.touches[0].clientX - rect.left - basket.offsetWidth / 2;
    targetBasketX = Math.max(0, Math.min(targetBasketX, gamecontainer.clientWidth - basket.offsetWidth));
  }, {passive: true});
  
  document.addEventListener('touchend', () => {
    // isTouch = false; // Keep touch mode active to avoid mouse conflict
  });
}

// Particle System
function createParticles(x, y, color) {
  const particles = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    // Randomize distance slightly
    const dist = 30 + Math.random() * 20;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${x}px;top:${y}px;background:${color};--dx:${dx}px;--dy:${dy}px`;
    gamecontainer.appendChild(p);
    particles.push(p);
  }
  setTimeout(() => particles.forEach(p => p.remove()), 600);
}

// Spawning Logic
let lastSpawn = 0;
let spawnInterval = 1000;

function getFallSpeed() {
  // Speed increases with level. Freeze mode slows it down.
  const base = FALL_SPEED_BASE + (level * 0.5);
  return base * (freezeActive ? 0.4 : 1.0);
}

function updateLevel() {
  const newLevel = LEVEL_THRESHOLDS.filter(t => score >= t).length;
  if (newLevel > level) {
    level = newLevel;
    if (levelElement) levelElement.textContent = `Level ${level}`;
    // Clamp spawn interval
    spawnInterval = Math.max(350, 1000 - (level * 60)); 
    createFloatingText(gamecontainer.clientWidth/2 - 40, gamecontainer.clientHeight/2, "LEVEL UP!", "#fff");
  }
}

function spawnObject() {
  if (gameMode !== 'play' || timeLeft <= 0) return;

  const r = Math.random();
  let typeConfig;
  
  // Weighted Random
  // 0.0 - 0.45 : Normal (45%)
  // 0.45 - 0.65 : Double (20%)
  // 0.65 - 0.75 : Time (10%)
  // 0.75 - 0.85 : Freeze (10%)
  // 0.85 - 1.00 : Bomb (15%)
  
  if (r < 0.45) typeConfig = OBJECT_TYPES[Math.floor(Math.random() * 3)]; // Random normal color
  else if (r < 0.65) typeConfig = OBJECT_TYPES[3]; // Double
  else if (r < 0.75) typeConfig = OBJECT_TYPES[4]; // Time
  else if (r < 0.85) typeConfig = OBJECT_TYPES[5]; // Freeze
  else typeConfig = OBJECT_TYPES[6]; // Bomb

  const obj = getPooledObject();
  obj.classList.add(typeConfig.type);
  if (typeConfig.type === 'normal') obj.classList.add('fruit');
  
  // Random X position
  const maxLeft = gamecontainer.clientWidth - 34;
  const left = Math.random() * maxLeft;
  
  obj.style.display = 'block';
  obj.style.left = left + 'px';
  obj.style.top = '-40px'; // Start slightly above
  obj.style.backgroundColor = typeConfig.color;
  
  // Set icons/images (using CSS matching or background)
  // For simplicity using colors/gradients from CSS, but could add specific icons here
  if(typeConfig.type === 'bomb') {
      obj.style.backgroundImage = 'none'; // handled in CSS
  } else {
      // In a real asset pipeline we'd set images
      obj.style.backgroundImage = 'none'; 
  }

  gamecontainer.appendChild(obj);

  fallingObjects.set(obj, {
    y: -40,
    x: left,
    type: typeConfig.type,
    isBomb: typeConfig.isBomb,
    width: 34,
    height: 34,
    speedVariation: 0.8 + Math.random() * 0.4 // Slight speed variance per object
  });
}

function activateFreeze() {
  freezeActive = true;
  createFloatingText(basketX + 20, gamecontainer.clientHeight - 80, "❄️ SLOW ❄️", "#84fab0");
  if (freezeTimer) clearTimeout(freezeTimer);
  freezeTimer = setTimeout(() => {
    freezeActive = false;
  }, 3000);
}

function handleCollision(obj, data) {
    caughtCount++;
    const centerX = data.x + data.width/2;
    const centerY = data.y + data.height/2;

    if (data.isBomb) {
        score = Math.max(0, score - 5);
        combo = 0;
        triggerShake();
        createFloatingText(centerX, centerY, "-5", "#ff0000");
    } else {
        // Scoring
        const basePoints = 1;
        let points = basePoints;
        let text = "+1";
        let color = "#fff";

        if (data.type === 'double') {
            points = 2;
            text = "+2";
            color = "#ffd700";
        }
        
        // Combo multiplier
        if (combo >= 5) {
            points += 2;
            text += " (Combo!)";
        }
        
        score += points;
        combo++;

        // Special Effects
        if (data.type === 'time') {
            timeLeft += 5;
            createFloatingText(centerX, centerY, "+5s", "#4facfe");
            color = "#4facfe";
        } else if (data.type === 'freeze') {
            activateFreeze();
            color = "#84fab0";
        } else {
            createFloatingText(centerX, centerY, text, color);
        }
        
        createParticles(centerX, centerY, color);
    }

    scoreElement.textContent = `Score: ${score}`;
    if (comboElement) comboElement.textContent = combo > 1 ? `Combo x${combo}` : '';
    
    // High Score Check
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('high-score', String(highScore));
        highScoreElement.textContent = `High-Score: ${highScore}`;
    }

    updateLevel();
    
    // Cleanup
    fallingObjects.delete(obj);
    obj.remove();
    returnToPool(obj);
}

// Main Game Loop
function gameLoop(timestamp) {
  if (gameMode === 'play') {
    // 1. Spawning
    if (timestamp - lastSpawn >= spawnInterval) {
      lastSpawn = timestamp;
      spawnObject();
    }

    // 2. Movement & Collision
    const speedBase = getFallSpeed();
    const basketRect = basket.getBoundingClientRect();
    const containerRect = gamecontainer.getBoundingClientRect();
    
    // Smooth basket movement (Lerp)
    // 0.2 lerp factor for smooth lag-free feel
    if (!isTouch) {
        currentBasketX += (targetBasketX - currentBasketX) * 0.25;
    } else {
        // Direct mapping for touch feels better usually, or very fast lerp
        currentBasketX += (targetBasketX - currentBasketX) * 0.4;
    }
    // Clamp
    currentBasketX = Math.max(0, Math.min(currentBasketX, gamecontainer.clientWidth - basket.offsetWidth));
    updateBasketPos();

    // Basket internal hit box (smaller than visual)
    const basketHitX = currentBasketX + 10;
    const basketHitW = basket.offsetWidth - 20;
    const basketTop = gamecontainer.clientHeight - basket.offsetHeight + 10;

    fallingObjects.forEach((data, obj) => {
      // Move
      data.y += speedBase * data.speedVariation;
      obj.style.transform = `translate(${data.x}px, ${data.y}px)`;

      // Collision Detection
      // Check if object is near basket vertical plane
      if (data.y + data.height >= basketTop && data.y < gamecontainer.clientHeight) {
          // Check horizontal overlap
          if (data.x + data.width > basketHitX && data.x < basketHitX + basketHitW) {
              handleCollision(obj, data);
              return;
          }
      }

      // Missed / Out of bounds
      if (data.y > gamecontainer.clientHeight) {
          if (!data.isBomb) {
              missedCount++;
              combo = 0;
              if (comboElement) comboElement.textContent = '';
          }
          fallingObjects.delete(obj);
          obj.remove();
          returnToPool(obj);
      }
    });
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

