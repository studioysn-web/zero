function drawLoadingScreen() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("LOADING...", canvas.width / 2, canvas.height / 2);
}

// ====== 基本設定 ======
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ★ MAPを80px下げるため、canvasを480pxに拡張
canvas.width = 800;
canvas.height = 480;

const gridSize = 80;
const mapWidth = 10;
const mapHeight = 5;

let map = [];
let playerX = 4;
let playerY = 2;

let drawX = playerX * gridSize;
let drawY = playerY * gridSize;

let isSliding = false;
let direction = "down";
let attacking = false;
let attackTimer = 0;
const attackDuration = 200;

let walkFrame = 0;
let walkTimer = 0;
const walkInterval = 150;

let gameStarted = false;
let gameOver = false;

let score = 0;
let highScore = Number(localStorage.getItem("highScore") || 0);
let newRecord = false;

let keys = {};
const moveDelay = 200;
let lastMoveTime = 0;

const FOREST_RATIO = 0.2;
const TOWN_RATIO = 0.3;
const TOTAL_TILES = mapWidth * mapHeight;
const TARGET_FOREST = Math.round(TOTAL_TILES * FOREST_RATIO);
const TARGET_TOWN = Math.round(TOTAL_TILES * TOWN_RATIO);

let timeLeft = 30;
let timerInterval = null;

// ====== update ループID ======
let updateLoop = null;

// ====== 画像 ======
const grassImg = new Image(); grassImg.src = "/game/destroying/img/grass.png";
const forestImg = new Image(); forestImg.src = "/game/destroying/img/forest.png";
const townImg = new Image(); townImg.src = "/game/destroying/img/town.png";
const townDestroyedImg = new Image(); townDestroyedImg.src = "/game/destroying/img/town_destroyed.png";

const gruttonWalk = {
  up:    [new Image(), new Image()],
  down:  [new Image(), new Image()],
  left:  [new Image(), new Image()],
  right: [new Image(), new Image()]
};

gruttonWalk.up[0].src = "/game/destroying/img/grutton_up_0.png";
gruttonWalk.up[1].src = "/game/destroying/img/grutton_up_1.png";
gruttonWalk.down[0].src = "/game/destroying/img/grutton_down_0.png";
gruttonWalk.down[1].src = "/game/destroying/img/grutton_down_1.png";
gruttonWalk.left[0].src = "/game/destroying/img/grutton_left_0.png";
gruttonWalk.left[1].src = "/game/destroying/img/grutton_left_1.png";
gruttonWalk.right[0].src = "/game/destroying/img/grutton_right_0.png";
gruttonWalk.right[1].src = "/game/destroying/img/grutton_right_1.png";

const gruttonAttack = {
  up: new Image(),
  down: new Image(),
  left: new Image(),
  right: new Image()
};

gruttonAttack.up.src = "/game/destroying/img/grutton_up_attack.png";
gruttonAttack.down.src = "/game/destroying/img/grutton_down_attack.png";
gruttonAttack.left.src = "/game/destroying/img/grutton_left_attack.png";
gruttonAttack.right.src = "/game/destroying/img/grutton_right_attack.png";


// ====== ★ IRIS攻撃（専用レーン＋残留1秒） ======
const irisImg = new Image();
irisImg.src = "/game/destroying/img/irisShot.png";

let irisActive = false;
let irisX = 0;
let arrowY = 0;
let arrowSpeed = 5;

let irisCount = 0;       // 最大3回
let irisCooldown = 0;

let irisState = "idle";  // idle → aim → shoot → stay
let irisDelay = 0;       // aim中の待ち時間
let irisStayTimer = 0;   // 矢消滅後の1秒残留
// ====== ★ ポップアップ演出 ======
let popups = [];  // {x, y, text, color, life}

function addPopup(x, y, text, color) {
  popups.push({
    x: x,
    y: y,
    text: text,
    color: color,
    life: 40  // 40フレーム ≒ 0.6秒
  });
}


// ====== 入力 ======
function keydownHandler(e) {
  if (!gameStarted || gameOver) return;
  keys[e.key] = true;

  if (e.key === "z" || e.key === "Z") attack(direction);
}

function keyupHandler(e) {
  keys[e.key] = false;
}

document.addEventListener("keydown", keydownHandler);
document.addEventListener("keyup", keyupHandler);


// ====== スマホボタン ======
const buttonHandlers = [];

function bindButton(selector, key) {
  const btn = document.querySelector(selector);
  if (!btn) return;

  const down = () => {
    if (key === "z") attack(direction);
    keys[key] = true;
  };
  const up = () => {
    keys[key] = false;
  };

  btn.addEventListener("mousedown", down);
  btn.addEventListener("mouseup", up);
  btn.addEventListener("touchstart", (e) => { e.preventDefault(); down(); });
  btn.addEventListener("touchend", (e) => { e.preventDefault(); up(); });

  buttonHandlers.push({ btn, down, up });
}

function unbindAllButtons() {
  for (const h of buttonHandlers) {
    h.btn.removeEventListener("mousedown", h.down);
    h.btn.removeEventListener("mouseup", h.up);
    h.btn.removeEventListener("touchstart", h.down);
    h.btn.removeEventListener("touchend", h.up);
  }
  buttonHandlers.length = 0;
}


// ====== マップ生成 ======
function generateMap() {
  map = [];
  for (let y = 0; y < mapHeight; y++) {
    const row = [];
    for (let x = 0; x < mapWidth; x++) row.push(0);
    map.push(row);
  }

  placeRandomTiles(1, TARGET_FOREST);
  placeRandomTiles(2, TARGET_TOWN);

  map[playerY][playerX] = 0;
}

function placeRandomTiles(type, count) {
  let placed = 0;
  while (placed < count) {
    const x = Math.floor(Math.random() * mapWidth);
    const y = Math.floor(Math.random() * mapHeight);
    if (map[y][x] === 0) {
      map[y][x] = type;
      placed++;
    }
  }
}

function refillTowns() {
  let current = 0;
  for (let y = 0; y < mapHeight; y++)
    for (let x = 0; x < mapWidth; x++)
      if (map[y][x] === 2) current++;

  while (current < TARGET_TOWN) {
    placeRandomTiles(2, 1);
    current++;
  }
}


// ====== 攻撃 ======
function attack(dir) {
  if (attacking) return;
  attacking = true;
  attackTimer = Date.now();
  checkAttackHit(dir);
}

function checkAttackHit(dir) {
  const dx = { up: 0, down: 0, left: -1, right: 1 }[dir];
  const dy = { up: -1, down: 1, left: 0, right: 0 }[dir];

  const tx = playerX + dx;
  const ty = playerY + dy;

  if (tx < 0 || ty < 0 || tx >= mapWidth || ty >= mapHeight) return;

  if (map[ty][tx] === 2) {
    map[ty][tx] = 3;
    score += 100;

    // ★ +300 ポップアップ
    addPopup(tx * gridSize + 40, ty * gridSize + 80 + 40, "+300", "yellow");

    setTimeout(() => {
      map[ty][tx] = 0;
      refillTowns();
    }, 1000);
  }
}


// ====== 移動 ======
function tryMove(dx, dy, dir) {
  const now = Date.now();

  if (isSliding) return;
  if (now - lastMoveTime < moveDelay) return;

  const nx = playerX + dx;
  const ny = playerY + dy;

  direction = dir;

  if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) return;

  const tile = map[ny][nx];
  if (tile === 1 || tile === 2 || tile === 3) return;

  playerX = nx;
  playerY = ny;
  lastMoveTime = now;

  if (!attacking && now - walkTimer > walkInterval) {
    walkFrame = (walkFrame + 1) % 2;
    walkTimer = now;
  }
}

const titleImg = new Image();
titleImg.src = "/game/destroying/img/start_scr.png";

function drawTitleScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(titleImg, 0, 0, canvas.width, canvas.height);
}

// ====== 更新 ======
function update() {
  // ★ 1. gameOver を最優先で描画
  if (gameOver) {
    draw();
    return;
  }

  // ★ 2. ゲーム開始前はタイトル画面
  if (!gameStarted) {
    drawTitleScreen();
    return;
  }

  // 移動
  if (keys["ArrowUp"])    tryMove(0, -1, "up");
  else if (keys["ArrowDown"])  tryMove(0, 1, "down");
  else if (keys["ArrowLeft"])  tryMove(-1, 0, "left");
  else if (keys["ArrowRight"]) tryMove(1, 0, "right");

  if (attacking && Date.now() - attackTimer > attackDuration) {
    attacking = false;
  }

  const speed = 2;
  const targetX = playerX * gridSize;
  const targetY = playerY * gridSize;

  if (drawX < targetX) drawX = Math.min(drawX + speed, targetX);
  if (drawX > targetX) drawX = Math.max(drawX - speed, targetX);
  if (drawY < targetY) drawY = Math.min(drawY + speed, targetY);
  if (drawY > targetY) drawY = Math.max(drawY - speed, targetY);

  isSliding = !(drawX === targetX && drawY === targetY);


  // ====== ★ IRIS 出現（最大3回） ======
  if (!irisActive && irisCount < 5 && timeLeft <= 15) {

    if (irisCooldown <= 0) {

      if (Math.random() < 0.01) {
        irisActive = true;
        irisCount++;

        irisX = playerX;  // グラットンの真上

        irisState = "aim";     // 狙い状態
        irisDelay = 20;        // 0.3秒待つ

        arrowY = gridSize - 10;  // IRISの真下から発射
      }

    } else {
      irisCooldown--;
    }
  }


  // ====== ★ IRIS 狙い状態 ======
  if (irisActive && irisState === "aim") {
    irisDelay--;

    if (irisDelay <= 0) {
      irisState = "shoot";
    }
  }


  // ====== ★ IRIS 発射（高速レーザー） ======
  if (irisActive && irisState === "shoot") {

    arrowY += arrowSpeed;

    const px = drawX;
    const py = drawY + 80;  // MAPが80px下がったので補正

    const arrowXpx = irisX * gridSize + gridSize / 2;

    // 当たり判定
    if (arrowY >= py - 20 && Math.abs(arrowXpx - (px + gridSize/2)) < 25) {

      score = Math.max(0, score - 300);
      // ★ -300 ポップアップ
      addPopup(playerX * gridSize + 40, playerY * gridSize + 80 + 40, "-300", "red");

      irisState = "stay";     // ← 矢消滅後、IRISは1秒残る
      irisStayTimer = 60;     // 1秒
    }

    if (arrowY > canvas.height) {
      irisState = "stay";
      irisStayTimer = 60;
    }
  }


  // ====== ★ IRIS 残留1秒 ======
  if (irisActive && irisState === "stay") {

    irisStayTimer--;

    if (irisStayTimer <= 0) {
      irisActive = false;
      irisState = "idle";
      irisCooldown = 60;
    }
  }

    // ====== ★ ポップアップ更新 ======
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].y -= 1;     // 上にフワッと移動
    popups[i].life--;

    if (popups[i].life <= 0) {
      popups.splice(i, 1);
    }
  }

  draw();
}


// ====== 描画 ======
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "rgba(200, 200, 200, 0.4)";
ctx.fillRect(0, 0, canvas.width, 80);
  // ====== MAP（80px下げて描画） ======
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      ctx.drawImage(grassImg, x * gridSize, y * gridSize + 80, gridSize, gridSize);
    }
  }

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = map[y][x];
      if (tile === 1) ctx.drawImage(forestImg, x * gridSize, y * gridSize + 80, gridSize, gridSize);
      if (tile === 2) ctx.drawImage(townImg, x * gridSize, y * gridSize + 80, gridSize, gridSize);
      if (tile === 3) ctx.drawImage(townDestroyedImg, x * gridSize, y * gridSize + 80, gridSize, gridSize);
    }
  }

  // ====== グラットン（80px下げる） ======
  const sprite = attacking
    ? gruttonAttack[direction]
    : gruttonWalk[direction][walkFrame];

  const trimTop = 20;

  ctx.drawImage(
    sprite,
    0, trimTop, sprite.width, sprite.height - trimTop,
    drawX,
    drawY + 80,
    gridSize,
    gridSize
  );

  // ====== スコア・タイム ======
  ctx.fillStyle = "white";
  ctx.font = "24px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`SCORE: ${score}`, canvas.width - 10, 30);

  ctx.textAlign = "left";
  ctx.fillText(`TIME: ${timeLeft}s`, 10, 30);


  // ====== ★ IRIS描画（専用レーン） ======
  if (irisActive) {

    // IRIS本体（y=0）
    ctx.drawImage(
      irisImg,
      irisX * gridSize,
      0,
      gridSize,
      gridSize
    );

    // 発射中だけ矢を描画
    if (irisState === "shoot") {
      ctx.fillStyle = "yellow";
      ctx.fillRect(
        irisX * gridSize + gridSize/2 - 4,
        arrowY,
        8,
        40
      );
    }
  }

  for (const p of popups) {
    ctx.fillStyle = p.color;
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.text, p.x, p.y);
  }
  // ====== GAME OVER ======
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "red";
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = "yellow";
    ctx.font = "40px sans-serif";
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

    ctx.fillStyle = "white";
    ctx.font = "30px sans-serif";
    ctx.fillText(`HIGH SCORE: ${highScore}`, canvas.width / 2, canvas.height / 2 + 70);

    if (newRecord) {
      ctx.fillStyle = "gold";
      ctx.font = "50px sans-serif";
      ctx.fillText("★ NEW RECORD ★", canvas.width / 2, canvas.height / 2 + 130);
    }
  }
}


// ====== タイマー ======
function startTimer() {
  timeLeft = 30;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameStarted) return;
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      gameStarted = false;
      gameOver = true;

      newRecord = false;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        newRecord = true;
      }

      clearInterval(timerInterval);
    }
  }, 1000);
}


// ====== リセット ======
function resetGame() {
  gameStarted = false;
  gameOver = false;

  playerX = 4;
  playerY = 2;
  drawX = playerX * gridSize;
  drawY = playerY * gridSize;

  direction = "down";
  attacking = false;
  attackTimer = 0;
  walkFrame = 0;
  walkTimer = 0;
  lastMoveTime = 0;

  score = 0;
  newRecord = false;

  keys = {};

  if (timerInterval) clearInterval(timerInterval);
  timeLeft = 30;

  irisActive = false;
  irisState = "idle";
  irisCount = 0;
  irisCooldown = 0;

  generateMap();
}


// ====== START ======
document.getElementById("startBtn").addEventListener("click", () => {
  resetGame();
  gameStarted = true;
  startTimer();
});


// ====== 完全アンロード ======
function unloadGame() {

  if (updateLoop) {
    clearInterval(updateLoop);
    updateLoop = null;
  }

  document.removeEventListener("keydown", keydownHandler);
  document.removeEventListener("keyup", keyupHandler);

  unbindAllButtons();

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gameStarted = false;
  gameOver = false;
  keys = {};

  console.log("Grutton Game: 完全アンロード完了");
}


// ====== ループ開始 ======
updateLoop = setInterval(update, 16);
// ★ 最初に LOADING を描画
drawLoadingScreen();
