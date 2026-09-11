document.getElementById("close-button").addEventListener("click", () => {
  window.close(); // ← タブを閉じる（スマホブラウザは無視される場合あり）
});

// ▼ スマホ判定
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// ▼ スケールを一括管理（スマホは小さめ）
const scaleManager = {
  player:    isMobile ? 0.05 : 0.1,
  enemy:     isMobile ? 0.025 : 0.06,
  explosion: isMobile ? 0.025 : 0.06
};

// ====== 基本設定 ======
const imgBasePath = "/game/galaxy/img/";

// プレイヤー
const playerImages = ["nova0.png", "nova1.png"];

// 敵タイプ
const enemyTypes = [
  { name: "b_piyo", files: ["b_piyo0.png", "b_piyo1.png"], score: 100, weight: 50 },
  { name: "y_piyo", files: ["y_piyo0.png", "y_piyo1.png"], score: 200, weight: 20 },
  { name: "r_piyo", files: ["r_piyo0.png", "r_piyo1.png"], score: 300, weight: 15 },
  { name: "k_piyo", files: ["k_piyo0.png", "k_piyo1.png"], score: 400, weight: 10 },
  { name: "k_usa", files: ["k_usa0.png", "k_usa1.png"], score: 500, weight: 5 }
];

// 爆発
const explosionFrames = ["explosion0.png", "explosion1.png", "explosion2.png"];

// 背景
const maxStage = 10;

// キャンバス
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// UI
const scoreDisplay = document.getElementById("score-display");
const startButton = document.getElementById("start-button");
const centerMessage = document.getElementById("center-message");
const gameOverOverlay = document.getElementById("game-over-overlay");
const finalScoreLabel = document.getElementById("final-score");
const highScoreLabel = document.getElementById("high-score");

// ====== タイトル画面フラグ ======
let gameStarted = false;

// 画面サイズ
function setupCanvasSize() {
  if (window.innerWidth <= 480) {
    canvas.width = 320;
    canvas.height = 480;
  } else {
    canvas.width = 700;
    canvas.height = 600;
  }
}
setupCanvasSize();
window.addEventListener("resize", setupCanvasSize);

// ====== 画像ロード ======
const imageCache = {};

function loadImage(name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imgBasePath + name;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

async function loadAllImages() {
  const names = new Set();

  playerImages.forEach(n => names.add(n));
  enemyTypes.forEach(t => t.files.forEach(n => names.add(n)));
  explosionFrames.forEach(n => names.add(n));

  for (let i = 1; i <= maxStage; i++) {
    const num = String(i).padStart(2, "0");
    names.add(`stage${num}.png`);
  }

  // ★ タイトル画像
  names.add("start_scr.png");

  const promises = [];
  names.forEach(name => {
    promises.push(
      loadImage(name).then(img => {
        imageCache[name] = img;
      })
    );
  });

  await Promise.all(promises);
}
// ====== ゲーム状態 ======
let player = {
  x: 0, y: 0,
  width: 32, height: 32,
  speed: 4,
  frameIndex: 0,
  attackTimer: 0
};

let bullets = [];
let enemies = [];
let explosions = [];

let enemySpeed = 0.6;
let enemyDir = 1;
let enemyAnimTimer = 0;
let enemyAnimInterval = 300;

let score = 0;
let highScore = 0;
let encounterDensity = 0.3;
let lastScoreForChange = 0;

let isGameRunning = false;
let isGameOver = false;

let keys = {};
let lastTime = 0;

let bgStageIndex = 1;
let centerMessageTimer = 0;

// 降下アニメ用
let isDescending = false;
let descendProgress = 0;
let rowsToAdd = 0;

// 弾
const maxBullets = 3;
const bulletSpeed = 6;
const bulletWidth = 4;
const bulletHeight = 12;

// 行の高さ
let enemySpriteWidth = 32;
let enemySpriteHeight = 32;
let enemyRowHeight = 0;

// プレイヤー初期化
function initPlayer() {
  const baseW = enemySpriteWidth * scaleManager.player;
  const baseH = enemySpriteHeight * scaleManager.player;

  player.width = baseW;
  player.height = baseH;
  player.x = (canvas.width - player.width) / 2;
  player.y = canvas.height - player.height - 20;
  player.frameIndex = 0;
  player.attackTimer = 0;
}

// 行の高さ更新
function updateEnemyRowHeight() {
  enemyRowHeight = enemySpriteHeight * scaleManager.enemy;
}

// ====== 入力 ======
window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === "z" || e.key === "Z") {
    if (isGameRunning && !isGameOver) shootBullet();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// ====== 弾発射 ======
function shootBullet() {
  if (bullets.length >= maxBullets) return;

  bullets.push({
    x: player.x + player.width / 2 - bulletWidth / 2,
    y: player.y,
    width: bulletWidth,
    height: bulletHeight
  });

  player.frameIndex = 1;
  player.attackTimer = 120;
}

// ====== 敵タイプ選択 ======
function chooseEnemyType() {
  const totalWeight = enemyTypes.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * totalWeight;
  for (const t of enemyTypes) {
    if (r < t.weight) return t;
    r -= t.weight;
  }
  return enemyTypes[0];
}
// ====== Y指定版 敵行生成 ======
function spawnEnemyRow(y) {
  const minEnemies = 2;
  const maxEnemies = 10;

  let density = Math.min(1.0, encounterDensity);
  let count = minEnemies + Math.floor((maxEnemies - minEnemies) * density);
  count = Math.max(minEnemies, Math.min(maxEnemies, count));

  const baseW = enemySpriteWidth * scaleManager.enemy;
  const baseH = enemySpriteHeight * scaleManager.enemy;

  let gap = baseW * 0.5;
  if (gap < 6) gap = 6;

  let totalWidth = count * baseW + (count - 1) * gap;
  if (totalWidth < 80) totalWidth = 80;

  let startX = (canvas.width - totalWidth) / 2;
  if (startX < 0) startX = 0;

  for (let i = 0; i < count; i++) {
    const type = chooseEnemyType();
    enemies.push({
      x: startX + i * (baseW + gap),
      y: y,
      width: baseW,
      height: baseH,
      type: type,
      frameIndex: 0
    });
  }
}

// ====== ★ アニメ対応：行追加（複数行OK） ======
function addEnemyRow(count = 1) {
  if (isDescending) {
    rowsToAdd += count;
    return;
  }
  isDescending = true;
  descendProgress = 0;
  rowsToAdd = count;
}

// ====== 端チェック ======
function checkEnemyBoundsAndDescend() {
  if (enemies.length === 0) return;

  let hitEdge = false;
  for (const e of enemies) {
    if (e.x <= 0 && enemyDir < 0) hitEdge = true;
    if (e.x + e.width >= canvas.width && enemyDir > 0) hitEdge = true;
  }

  if (hitEdge) {
    enemyDir *= -1;
    addEnemyRow(1);
  }
}

// ====== 爆発 ======
function createExplosion(x, y, w, h) {
  explosions.push({
    x, y, width: w, height: h,
    frameIndex: 0,
    timer: 0
  });
}

// ====== スコア ======
function updateScore(add) {
  score += add;
  scoreDisplay.textContent = `SCORE: ${score}`;

  const newStageIndex = Math.min(maxStage, Math.floor(score / 5000) + 1);
  bgStageIndex = newStageIndex;

  if (Math.floor(score / 1000) > Math.floor(lastScoreForChange / 1000)) {
    applyScoreChange();
  }
  lastScoreForChange = score;
}

function applyScoreChange() {
  const isSpeedUp = Math.random() < 0.5;

  if (isSpeedUp) {
    enemySpeed *= 1.05;
    showCenterMessage("SPEED UP!");
  } else {
    encounterDensity += 0.03;
    if (encounterDensity > 1.0) encounterDensity = 1.0;
    showCenterMessage("ENCOUNTER UP!");
  }
}

// ====== メッセージ ======
function showCenterMessage(text) {
  centerMessage.textContent = text;
  centerMessage.style.display = "block";
  centerMessageTimer = 2000;
}

// ====== ハイスコア ======
function loadHighScore() {
  const v = localStorage.getItem("galaxy_invader_highscore");
  highScore = v ? parseInt(v, 10) : 0;
}
function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("galaxy_invader_highscore", String(highScore));
  }
}
// ====== resetGame ======
function resetGame() {
  bullets = [];
  enemies = [];
  explosions = [];

  enemySpeed =  isMobile ? 0.4 : 0.6;
  enemyDir = 1;
  enemyAnimTimer = 0;

  score = 0;
  lastScoreForChange = 0;
  encounterDensity = 0.3;
  bgStageIndex = 1;

  isGameOver = false;
  isGameRunning = true;

  centerMessage.style.display = "none";
  gameOverOverlay.style.display = "none";

  initPlayer();
  updateEnemyRowHeight();

  // 初期 3 行
  spawnEnemyRow(40);
  spawnEnemyRow(40 + enemyRowHeight);
  spawnEnemyRow(40 + enemyRowHeight * 2);

  scoreDisplay.textContent = "SCORE: 0";
}

// ====== ゲームオーバー ======
function triggerGameOver() {
  isGameOver = true;
  isGameRunning = false;
  saveHighScore();

  finalScoreLabel.textContent = `SCORE: ${score}`;
  highScoreLabel.textContent = `HIGH SCORE: ${highScore}`;
  gameOverOverlay.style.display = "block";
}

// ====== update ======
function update(delta) {

  // ★ タイトル画面中はゲーム処理しない
  if (!gameStarted) {
    drawTitleScreen();
    return;
  }

  if (!isGameRunning) return;

  // プレイヤー移動
  if (keys["arrowleft"] || keys["a"]) player.x -= player.speed;
  if (keys["arrowright"] || keys["d"]) player.x += player.speed;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

  // 攻撃アニメ
  if (player.attackTimer > 0) {
    player.attackTimer -= delta;
    if (player.attackTimer <= 0) player.frameIndex = 0;
  }

  // 弾移動
  for (const b of bullets) b.y -= bulletSpeed;
  bullets = bullets.filter(b => b.y + b.height > 0);

  // 敵アニメ
  enemyAnimTimer += delta;
  if (enemyAnimTimer >= enemyAnimInterval) {
    enemyAnimTimer = 0;
    for (const e of enemies) e.frameIndex = (e.frameIndex + 1) % 2;
  }

  // ====== 降下アニメ ======
  if (isDescending) {
    const descendSpeed = 2.5;

    descendProgress += descendSpeed;

    for (const e of enemies) {
      e.y += descendSpeed;
      e.x += enemySpeed * enemyDir * 0.2;
      e.frameIndex = (e.frameIndex + 1) % 2;
    }

    if (descendProgress >= enemyRowHeight) {
      isDescending = false;

      for (let i = 0; i < rowsToAdd; i++) {
        const y = 40 + enemyRowHeight * i;
        spawnEnemyRow(y);
      }
      rowsToAdd = 0;
    }

    return;
  }

  // 敵横移動
  for (const e of enemies) e.x += enemySpeed * enemyDir;

  // 端ヒット
  checkEnemyBoundsAndDescend();

  // ====== 当たり判定 ======
  for (const b of bullets) {
    let hitEnemyIndex = -1;
    let hitEnemy = null;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (
        b.x < e.x + e.width &&
        b.x + b.width > e.x &&
        b.y < e.y + e.height &&
        b.y + b.height > e.y
      ) {
        if (!hitEnemy || e.y > hitEnemy.y) {
          hitEnemy = e;
          hitEnemyIndex = i;
        }
      }
    }

    if (hitEnemy) {
      b._remove = true;
      updateScore(hitEnemy.type.score);
      createExplosion(hitEnemy.x, hitEnemy.y, hitEnemy.width, hitEnemy.height);
      enemies.splice(hitEnemyIndex, 1);
    }
  }

  bullets = bullets.filter(b => !b._remove);

  // 爆発アニメ
  for (const ex of explosions) {
    ex.timer += delta;
    if (ex.timer >= 80) {
      ex.timer = 0;
      ex.frameIndex++;
    }
  }
  explosions = explosions.filter(ex => ex.frameIndex < explosionFrames.length);

  // 敵がプレイヤーに到達
  for (const e of enemies) {
    if (e.y + e.height >= player.y) {
      triggerGameOver();
      break;
    }
  }

  // 全滅 → 2 行追加
  if (enemies.length === 0) {
    addEnemyRow(2);
  }

  // メッセージ
  if (centerMessageTimer > 0) {
    centerMessageTimer -= delta;
    if (centerMessageTimer <= 0) centerMessage.style.display = "none";
  }
}
// ====== タイトル画面描画 ======
function drawTitleScreen() {
  const img = imageCache["start_scr.png"];
  if (!img) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // アスペクト比維持で縮小
  const scale = Math.min(
    canvas.width / img.width,
    canvas.height * 0.8 / img.height   // ← ★高さを80%に抑える
  );

  const w = img.width * scale;
  const h = img.height * scale;

  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.drawImage(img, x, y, w, h);
}


// ====== 描画 ======
function drawBackground() {
  const num = String(bgStageIndex).padStart(2, "0");
  const name = `stage${num}.png`;
  const img = imageCache[name];

  if (img) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawPlayer() {
  const imgName = playerImages[player.frameIndex];
  const img = imageCache[imgName];
  if (img) {
    const w = img.width * scaleManager.player;
    const h = img.height * scaleManager.player;
    player.width = w;
    player.height = h;
    ctx.drawImage(img, player.x, player.y, w, h);
  }
}

function drawBullets() {
  ctx.fillStyle = "#ffff00";
  for (const b of bullets) ctx.fillRect(b.x, b.y, b.width, b.height);
}

function drawEnemies() {
  for (const e of enemies) {
    const imgName = e.type.files[e.frameIndex];
    const img = imageCache[imgName];
    if (img) {
      const w = img.width * scaleManager.enemy;
      const h = img.height * scaleManager.enemy;
      e.width = w;
      e.height = h;
      ctx.drawImage(img, e.x, e.y, w, h);
    }
  }
}

function drawExplosions() {
  for (const ex of explosions) {
    const imgName = explosionFrames[ex.frameIndex];
    const img = imageCache[imgName];
    if (img) {
      const w = img.width * scaleManager.explosion;
      const h = img.height * scaleManager.explosion;
      ex.width = w;
      ex.height = h;
      ctx.drawImage(img, ex.x, ex.y, w, h);
    } else {
      ctx.fillStyle = "#fff";
      ctx.fillRect(ex.x, ex.y, ex.width, ex.height);
    }
  }
}
// ====== メイン描画 ======
function render() {

  // ★ タイトル画面中はタイトルだけ描画
  if (!gameStarted) {
    drawTitleScreen();
    return;
  }

  drawBackground();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawExplosions();
}

// ====== メインループ ======
function gameLoop(timestamp) {
  const delta = lastTime ? timestamp - lastTime : 16;
  lastTime = timestamp;

  update(delta);
  render();

  requestAnimationFrame(gameLoop);
}

// ====== クリックでゲーム開始 ======
canvas.addEventListener("click", () => {
  if (!gameStarted) {
    gameStarted = true;
    resetGame();
  }
});

startButton.addEventListener("click", () => {
  if (!gameStarted) {
    gameStarted = true;   // ← これが無いとタイトルから進まない
  }
  resetGame();
});

// ====== 起動 ======
(async function main() {
  loadHighScore();
  await loadAllImages();

  // 敵画像のサイズを取得
  const anyEnemyImg = imageCache[enemyTypes[0].files[0]];
  if (anyEnemyImg) {
    enemySpriteWidth = anyEnemyImg.width;
    enemySpriteHeight = anyEnemyImg.height;
  }

  updateEnemyRowHeight();
  initPlayer();

  // ★ 最初はタイトル画面を描画
  drawTitleScreen();

  requestAnimationFrame(gameLoop);
})();
