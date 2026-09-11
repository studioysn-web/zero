//------------------------------------------------------
// Leon Adventure RPG - かとまん仕様フル版
// ・外部マップ（256×128）
// ・2フレームアニメ
// ・Z：攻撃/会話/宝箱
// ・X：回復のみ（メニューなし）
// ・歩数エンカウント
//------------------------------------------------------

// ===== Canvas =====
const canvas = document.getElementById("game-canvas");
const ctx    = canvas.getContext("2d");

const TILE = 40;

let VIEW_W = canvas.width  / TILE;
let VIEW_H = canvas.height / TILE;

// ===== フィールドサイズ（JSON 読み込み後に上書き） =====
let FIELD_W = 0;
let FIELD_H = 0;

// ===== Game States =====
const STATE_TITLE   = "title";
const STATE_FIELD   = "field";
const STATE_TOWN    = "town";
const STATE_DUNGEON = "dungeon";
const STATE_BATTLE  = "battle";
const STATE_DEAD    = "dead";

let gameState = STATE_TITLE;
let prevState = STATE_FIELD;

// ===== Move Speed =====
const PLAYER_MOVE_SEC = 0.25;

// ===== Images =====
const images = {};
const imageList = {
  // キャラ系（2フレーム）
  player0: "img/0000.png",
  player1: "img/0001.png",

  enemy0:  "img/3000.png",
  enemy1:  "img/3001.png",

  mobMove0: "img/1000.png", // 動く町人
  mobMove1: "img/1001.png",
  mobStay0: "img/1100.png", // 動かない町人
  mobStay1: "img/1101.png",

  // その他
  chest:   "img/takara01.png",
  title:   "img/title.png"
};

function loadImages(list, callback) {
  let loaded = 0;
  const keys = Object.keys(list);

  keys.forEach(key => {
    const img = new Image();
    img.src = list[key];
    img.onload = img.onerror = () => {
      loaded++;
      if (loaded === keys.length) callback();
    };
    images[key] = img;
  });
}

// ===== タイル画像 =====
const tileImages = {};
const tileList = {};
for (let i = 0; i <= 99; i++) {
  tileList[i] = `img/${i}.png`;
}

function loadTileImages(list, callback) {
  let loaded = 0;
  const keys = Object.keys(list);

  if (keys.length === 0) {
    callback();
    return;
  }

  keys.forEach(key => {
    const img = new Image();
    img.src = list[key];
    img.onload = img.onerror = () => {
      loaded++;
      if (loaded === keys.length) callback();
    };
    tileImages[key] = img;
  });
}

// ===== Input =====
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.code] = true;
});
window.addEventListener("keyup", e => {
  keys[e.code] = false;
});

// ===== Smooth Move Object =====
function makeMover(x, y, moveSec = PLAYER_MOVE_SEC, type = "player") {
  const px = x * TILE;
  const py = y * TILE;
  return {
    type,
    gridX: x,
    gridY: y,
    x: px,
    y: py,
    startX: px,
    startY: py,
    targetX: px,
    targetY: py,
    moving: false,
    moveTime: 0,
    moveDuration: moveSec,
    wait: 0,
    flash: 0,
    hp: 10,
    attackTimer: 0,
    alive: true,
    // アニメーション用
    animFrame: 0,   // 0 or 1
    animTimer: 0    // 経過秒
  };
}

// ===== プレイヤー（初期値は仮、後で中央に移動） =====
const player        = makeMover(0, 0, PLAYER_MOVE_SEC, "player");
const townPlayer    = makeMover(10, 14, PLAYER_MOVE_SEC, "player");
const dungeonPlayer = makeMover(10, 14, PLAYER_MOVE_SEC, "player");

// ===== プレイヤーステータス =====
let playerStatus = {
  hp: 200,
  maxHp: 200,
  weapon: { atk: 1 },
  armor:  { hp: 200 },
  healItem: 3,
  gold: 100
};

// ===== NPC =====
const mobA = makeMover(6, 8, PLAYER_MOVE_SEC, "npc");   // 動く町人
mobA.message = "こんにちは";
mobA.npcKind = "move";

const mobB = makeMover(13, 8, PLAYER_MOVE_SEC, "npc");  // 動かない町人
mobB.message = "ようこそ！";
mobB.npcKind = "stay";

// ===== バトル用 =====
const battlePlayer = makeMover(7, 12, PLAYER_MOVE_SEC, "player");
const enemy        = makeMover(7, 3, PLAYER_MOVE_SEC, "enemy");
enemy.hp          = 5;
enemy.alive       = true;
enemy.chest       = false;
enemy.hitCooldown = 0;

// ===== 宝箱 =====
const townChests    = [];
const worldChests   = [];
const dungeonChests = [];

// ===== Balloon =====
let balloon = {
  active: false,
  text: "",
  x: 0,
  y: 0
};

function showBalloon(text, gx, gy) {
  balloon.active = true;
  balloon.text   = text;
  balloon.x      = gx;
  balloon.y      = gy;
}
function closeBalloon() {
  balloon.active = false;
}

// ===== 入口バグ対策 =====
let ignoreEnterTimer = 0;

// ===== 死亡演出 =====
let deathTimer = 0;
let deathReady = false;

// ===== エンカウント管理（歩数） =====
let encounter = 0;

// ===== Map Types =====
const GRASS   = 0;
const TOWN    = 1;
const DUNGEON = 2;
const DOOR    = 3;

// ===== マップID =====
const MAP_WORLD_01        = 1;
const MAP_CITY_01         = 2;
const MAP_DUNGEON_01      = 3;
const MAP_BATTLE_FIELD_01 = 4;

// ===== マップローダー =====
const mapIndex = {
  [MAP_WORLD_01]:        "map/world/world01.json",
  [MAP_CITY_01]:         "map/city/town01.json",
  [MAP_DUNGEON_01]:      "map/dungeon/dungeon01.json",
  [MAP_BATTLE_FIELD_01]: "map/battle/field01.json"
};

async function loadMapById(id) {
  const path = mapIndex[id];
  const res  = await fetch(path);
  if (!res.ok) {
    console.error("マップ読み込み失敗:", path);
    return [];
  }
  return await res.json();
}

// ===== 外部マップ用変数 =====
let field      = [];
let townMap    = [];
let dungeonMap = [];
let battleMap  = [];

// ===== 町・ダンジョンのサイズ =====
const TOWN_W = 20, TOWN_H = 15;
const DUN_W  = 20, DUN_H  = 15;

// ===== 町・ダンジョン入口座標 =====
const townDoor    = { x: 10, y: 14 };
const dungeonDoor = { x: 10, y: 14 };

// ===== 衝突判定 =====
function isFree(x, y, actors, self) {
  return !actors.some(a =>
    a !== self &&
    a.gridX === x &&
    a.gridY === y
  );
}

// ===== Smooth Move =====
function startMove(obj, dx, dy, w, h, actors) {
  if (obj.moving) return;

  const nx = obj.gridX + dx;
  const ny = obj.gridY + dy;

  if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
  if (actors && !isFree(nx, ny, actors, obj)) return;

  obj.startX   = obj.x;
  obj.startY   = obj.y;
  obj.gridX    = nx;
  obj.gridY    = ny;
  obj.targetX  = nx * TILE;
  obj.targetY  = ny * TILE;
  obj.moveTime = 0;
  obj.moving   = true;
}

function updateSmooth(obj, dt) {
  if (!obj.moving) return;

  obj.moveTime += dt;
  let t = obj.moveTime / obj.moveDuration;
  if (t > 1) t = 1;

  obj.x = obj.startX + (obj.targetX - obj.startX) * t;
  obj.y = obj.startY + (obj.targetY - obj.startY) * t;

  if (t >= 1) {
    obj.moving   = false;
    obj.moveTime = 0;
  }
}

// ===== プレイヤー移動入力 =====
function moveInputSmooth(obj, w, h, actors) {
  if (balloon.active) return;
  if (!obj.moving) {
    if (keys["ArrowUp"])    return startMove(obj, 0, -1, w, h, actors);
    if (keys["ArrowDown"])  return startMove(obj, 0,  1, w, h, actors);
    if (keys["ArrowLeft"])  return startMove(obj, -1, 0, w, h, actors);
    if (keys["ArrowRight"]) return startMove(obj, 1,  0, w, h, actors);
  }
}

// ===== キャラアニメーション更新（1秒ごとに0/1切り替え） =====
function updateAnim(obj, dt) {
  obj.animTimer += dt;
  if (obj.animTimer >= 1.0) {
    obj.animTimer -= 1.0;
    obj.animFrame = (obj.animFrame === 0) ? 1 : 0;
  }
}

// ===== NPCランダム移動 =====
function npcRandomMove(npc, w, h, actors, dt) {
  if (npc.moving) return;
  if (balloon.active) return;

  npc.wait -= dt;
  if (npc.wait > 0) return;

  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
  const d = dirs[Math.floor(Math.random()*4)];

  startMove(npc, d[0], d[1], w, h, actors);
  npc.wait = 0.5;
}

// ===== 隣接判定 =====
function isAdj(a, b) {
  return (
    (a.gridX === b.gridX && Math.abs(a.gridY - b.gridY) === 1) ||
    (a.gridY === b.gridY && Math.abs(a.gridX - b.gridX) === 1)
  );
}
//------------------------------------------------------
// update 本体
//------------------------------------------------------
function update(dt) {
  if (ignoreEnterTimer > 0) ignoreEnterTimer -= dt;
  if (enemy.hitCooldown > 0) enemy.hitCooldown -= dt;

  // アニメーション更新
  [
    player, townPlayer, dungeonPlayer,
    battlePlayer, enemy, mobA, mobB
  ].forEach(o => updateAnim(o, dt));

  // フラッシュ減衰
  [player, townPlayer, dungeonPlayer, battlePlayer, enemy].forEach(o => {
    if (o.flash > 0) o.flash -= dt;
  });

  // タイトル
  if (gameState === STATE_TITLE) {
    if (keys["KeyZ"]) {
      keys["KeyZ"] = false;
      gameState = STATE_FIELD;
    }
    return;
  }

  // 死亡
  if (gameState === STATE_DEAD) {
    deathTimer += dt;
    if (deathTimer > 1.5) deathReady = true;
    if (deathReady && keys["KeyZ"]) {
      keys["KeyZ"] = false;
      // 復活：HP全快・フィールド中央へ
      playerStatus.hp = playerStatus.maxHp;
      const cx = Math.floor(FIELD_W / 2);
      const cy = Math.floor(FIELD_H / 2);
      player.gridX = cx;
      player.gridY = cy;
      player.x = cx * TILE;
      player.y = cy * TILE;
      player.startX = player.x;
      player.startY = player.y;
      player.targetX = player.x;
      player.targetY = player.y;
      player.moving = false;

      gameState = STATE_FIELD;
      deathTimer = 0;
      deathReady = false;
    }
    return;
  }

  // 吹き出し中：Zで閉じるだけ許可
  if (balloon.active) {
    if (keys["KeyZ"]) {
      keys["KeyZ"] = false;
      closeBalloon();
    }
    // バトル中だけは、バルーンが出てても敵の攻撃などは進行させたいので
    if (gameState !== STATE_BATTLE) return;
  }

  // ステートごと
  switch (gameState) {
    case STATE_FIELD:
      updateField(dt);
      break;
    case STATE_TOWN:
      updateTown(dt);
      break;
    case STATE_DUNGEON:
      updateDungeon(dt);
      break;
    case STATE_BATTLE:
      updateBattle(dt);
      break;
  }
}

//------------------------------------------------------
// フィールド更新（歩数エンカウント）
//------------------------------------------------------
function updateField(dt) {

  // ★ここに追加（歩数エンカウント）
  if (!player.moving && player.prevMoving) {
    encounter++;
    if (encounter >= 20) {
      encounter = 0;
      startBattle();
      return;
    }
  }

  // ★ここに追加（前フレームの状態を記録）
  player.prevMoving = player.moving;

  // ここから元の処理
  moveInputSmooth(player, FIELD_W, FIELD_H, []);
  updateSmooth(player, dt);

  // X：回復
  if (keys["KeyX"]) {
    keys["KeyX"] = false;
    tryHealOnField();
  }

  // Z：宝箱など
  if (keys["KeyZ"]) {
    keys["KeyZ"] = false;

    for (const c of worldChests) {
      if (!c.opened && isAdj(player, c)) {
        c.opened = true;
        playerStatus.gold += 10;
        showBalloon("「10G」手に入れた", c.gridX, c.gridY);
        return;
      }
    }
  }
}


//------------------------------------------------------
// 町更新
//------------------------------------------------------
function updateTown(dt) {
  moveInputSmooth(townPlayer, TOWN_W, TOWN_H, [mobA, mobB]);
  updateSmooth(townPlayer, dt);
  updateSmooth(mobA, dt);
  updateSmooth(mobB, dt);

  npcRandomMove(mobA, TOWN_W, TOWN_H, [townPlayer, mobB], dt);

  // X：回復
  if (keys["KeyX"]) {
    keys["KeyX"] = false;
    tryHealOnField();
  }

  // Z：会話／宝箱／出口
  if (keys["KeyZ"]) {
    keys["KeyZ"] = false;

    // 会話
    if (isAdj(townPlayer, mobA)) {
      showBalloon(mobA.message, mobA.gridX, mobA.gridY);
      return;
    }
    if (isAdj(townPlayer, mobB)) {
      showBalloon(mobB.message, mobB.gridX, mobB.gridY);
      return;
    }

    // 町の宝箱
    for (const c of townChests) {
      if (!c.opened && isAdj(townPlayer, c)) {
        c.opened = true;
        playerStatus.gold += 10;
        showBalloon("「10G」手に入れた", c.gridX, c.gridY);
        return;
      }
    }

    // フィールドに戻る（出口座標）
    if (townPlayer.gridX === townDoor.x && townPlayer.gridY === townDoor.y) {
      gameState = STATE_FIELD;
      ignoreEnterTimer = 0.5;
      closeBalloon();
      return;
    }
  }
}

//------------------------------------------------------
// ダンジョン更新
//------------------------------------------------------
function updateDungeon(dt) {
  moveInputSmooth(dungeonPlayer, DUN_W, DUN_H, []);
  updateSmooth(dungeonPlayer, dt);

  // X：回復
  if (keys["KeyX"]) {
    keys["KeyX"] = false;
    tryHealOnField();
  }

  // Z：宝箱／出口
  if (keys["KeyZ"]) {
    keys["KeyZ"] = false;

    // ダンジョン宝箱
    for (const c of dungeonChests) {
      if (!c.opened && isAdj(dungeonPlayer, c)) {
        c.opened = true;
        playerStatus.gold += 10;
        showBalloon("「10G」手に入れた", c.gridX, c.gridY);
        return;
      }
    }

    // フィールドに戻る
    if (dungeonPlayer.gridX === dungeonDoor.x && dungeonPlayer.gridY === dungeonDoor.y) {
      gameState = STATE_FIELD;
      ignoreEnterTimer = 0.5;
      closeBalloon();
      return;
    }
  }
}

//------------------------------------------------------
// フィールド・町・ダンジョン共通：Xで回復
//------------------------------------------------------
function tryHealOnField() {
  if (playerStatus.healItem > 0 && playerStatus.hp < playerStatus.maxHp) {
    playerStatus.healItem--;
    playerStatus.hp += 50;
    if (playerStatus.hp > playerStatus.maxHp) playerStatus.hp = playerStatus.maxHp;
    showBalloon("HPが かいふくした！", player.gridX, player.gridY);
  } else {
    showBalloon("かいふくできない！", player.gridX, player.gridY);
  }
}

//------------------------------------------------------
// バトル開始（アクション方式）
//------------------------------------------------------
function startBattle() {
  prevState = gameState;
  gameState = STATE_BATTLE;
  closeBalloon();

  // バトル用プレイヤー位置リセット
  battlePlayer.gridX = 7;
  battlePlayer.gridY = 12;
  battlePlayer.x = battlePlayer.gridX * TILE;
  battlePlayer.y = battlePlayer.gridY * TILE;
  battlePlayer.startX = battlePlayer.x;
  battlePlayer.startY = battlePlayer.y;
  battlePlayer.targetX = battlePlayer.x;
  battlePlayer.targetY = battlePlayer.y;
  battlePlayer.moving = false;

  // 敵リセット
  enemy.gridX = 7;
  enemy.gridY = 3;
  enemy.x = enemy.gridX * TILE;
  enemy.y = enemy.gridY * TILE;
  enemy.startX = enemy.x;
  enemy.startY = enemy.y;
  enemy.targetX = enemy.x;
  enemy.targetY = enemy.y;
  enemy.moving = false;
  enemy.hp = 5;
  enemy.alive = true;
  enemy.chest = false;
  enemy.flash = 0;
  enemy.hitCooldown = 0;
}

//------------------------------------------------------
// バトル更新（Z＝攻撃／X＝回復）
//------------------------------------------------------
let pendingExitBattle = false;

function updateBattle(dt) {
  // プレイヤー移動（バトルフィールド内）
  moveInputSmooth(battlePlayer, 15, 15, [enemy]);
  updateSmooth(battlePlayer, dt);
  updateSmooth(enemy, dt);

  // 敵がプレイヤーを追う
  if (enemy.alive && !enemy.moving) {
    const dx = battlePlayer.gridX - enemy.gridX;
    const dy = battlePlayer.gridY - enemy.gridY;
    let mx = 0, my = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      mx = (dx > 0) ? 1 : -1;
    } else if (dy !== 0) {
      my = (dy > 0) ? 1 : -1;
    }
    startMove(enemy, mx, my, 15, 15, [battlePlayer]);
  }

  // X：回復
  if (keys["KeyX"]) {
    keys["KeyX"] = false;
    if (playerStatus.healItem > 0 && playerStatus.hp < playerStatus.maxHp) {
      playerStatus.healItem--;
      playerStatus.hp += 50;
      if (playerStatus.hp > playerStatus.maxHp) playerStatus.hp = playerStatus.maxHp;
      showBalloon("HPが かいふくした！", battlePlayer.gridX, battlePlayer.gridY);
    } else {
      showBalloon("かいふくできない！", battlePlayer.gridX, battlePlayer.gridY);
    }
  }

  // Z：攻撃 or 宝箱 or 戻る
  if (keys["KeyZ"]) {
    keys["KeyZ"] = false;

    // 敵が生きている → 接触していれば攻撃
    if (enemy.alive) {
      if (isAdj(battlePlayer, enemy)) {
        const dmg = playerStatus.weapon.atk;
        enemy.hp -= dmg;
        enemy.flash = 0.3;
        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.alive = false;
          enemy.chest = true;
          showBalloon("てきを たおした！", enemy.gridX, enemy.gridY);
        }
      } else {
        showBalloon("とどかない！", enemy.gridX, enemy.gridY);
      }
      return;
    }

    // 敵が死んでいて、宝箱状態 → 開ける
    if (enemy.chest) {
      if (isAdj(battlePlayer, enemy)) {
        enemy.chest = false;
        playerStatus.gold += 10;
        showBalloon("「10G」手に入れた", enemy.gridX, enemy.gridY);
        pendingExitBattle = true;
      } else {
        showBalloon("ちかづいて！", enemy.gridX, enemy.gridY);
      }
      return;
    }

    // 宝箱も開け終わっている → フィールドへ戻る
    gameState = prevState;
    closeBalloon();
    return;
  }

  // 敵の攻撃（接触時）
  if (enemy.alive && enemy.hitCooldown <= 0 && isAdj(battlePlayer, enemy)) {
    enemy.hitCooldown = 1.0;
    playerStatus.hp -= 10;
    battlePlayer.flash = 0.3;
    if (playerStatus.hp <= 0) {
      playerStatus.hp = 0;
      gameState = STATE_DEAD;
      deathTimer = 0;
      deathReady = false;
      closeBalloon();
      return;
    }
  }

  // 宝箱を開けたあと、バルーンが消えたらフィールドへ戻る
  if (pendingExitBattle && !balloon.active) {
    gameState = prevState;
    pendingExitBattle = false;
  }
}
//------------------------------------------------------
// 描画系
//------------------------------------------------------

// ===== タイル描画 =====
function drawTile(t, x, y, dark = false) {
  const img = tileImages[t];
  if (img) {
    ctx.drawImage(img, x, y, TILE, TILE);
  } else {
    ctx.fillStyle = dark ? "#800" : "#f00";
    ctx.fillRect(x, y, TILE, TILE);
  }
}

// ===== キャラ画像取得 =====
function getCharImage(obj) {
  if (obj.type === "player") {
    return (obj.animFrame === 0) ? images.player0 : images.player1;
  }
  if (obj.type === "enemy") {
    if (obj.chest) return images.chest;
    return (obj.animFrame === 0) ? images.enemy0 : images.enemy1;
  }
  if (obj.type === "npc") {
    if (obj.npcKind === "move") {
      return (obj.animFrame === 0) ? images.mobMove0 : images.mobMove1;
    } else {
      return (obj.animFrame === 0) ? images.mobStay0 : images.mobStay1;
    }
  }
  if (obj.type === "chest") {
    return images.chest;
  }
  return images.player0;
}

// ===== キャラ描画 =====
function drawChar(obj, x, y) {
  const img = getCharImage(obj);
  if (!img) return;

  if (obj.flash > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(x, y, TILE, TILE);
  }
  ctx.drawImage(img, x, y, TILE, TILE);
}

// ===== 吹き出し =====
function drawBalloonAtScreen(sx, sy) {
  const t = balloon.text;
  ctx.font = "12px sans-serif";
  const w = ctx.measureText(t).width + 8;
  const h = 18;

  const bx = Math.max(0, Math.min(canvas.width - w, sx - w/2));
  const by = Math.max(0, sy - h - 4);

  ctx.fillStyle = "#fff";
  ctx.fillRect(bx, by, w, h);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(bx, by, w, h);

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(t, bx+4, by+h/2);
}

// ===== タイトル =====
function drawTitle() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (images.title && images.title.complete && images.title.width > 0) {
    const w = images.title.width;
    const h = images.title.height;
    const s = Math.min(canvas.width / w, canvas.height / h);
    ctx.drawImage(
      images.title,
      (canvas.width  - w * s) / 2,
      (canvas.height - h * s) / 2,
      w * s, h * s
    );
  } else {
    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LEON ADVENTURE", canvas.width/2, canvas.height/2);
  }

  ctx.fillStyle = "#ccc";
  ctx.font = "14px sans-serif";
  ctx.fillText("Z で開始", canvas.width/2, canvas.height/2 + 40);
}

// ===== フィールド描画 =====
function drawField() {
  const ox = player.x - canvas.width / 2;
  const oy = player.y - canvas.height / 2;

  for (let y = 0; y < FIELD_H; y++) {
    for (let x = 0; x < FIELD_W; x++) {
      const sx = x * TILE - ox;
      const sy = y * TILE - oy;
      if (sx < -TILE || sy < -TILE || sx > canvas.width || sy > canvas.height) continue;
      const t = field[y]?.[x] ?? GRASS;
      drawTile(t, sx, sy);
    }
  }

  drawChar(player, player.x - ox, player.y - oy);

  ctx.fillStyle = "#fff";
  ctx.font = "14px sans-serif";
  ctx.fillText("HP " + playerStatus.hp + "/" + playerStatus.maxHp, 10, 20);
  ctx.fillText("薬 " + playerStatus.healItem, 10, 40);
  ctx.fillText("G " + playerStatus.gold, 10, 60);

  if (balloon.active && gameState === STATE_FIELD) {
    drawBalloonAtScreen(balloon.x * TILE - ox, balloon.y * TILE - oy);
  }
}

// ===== 町描画 =====
function drawTown() {
  const ox = townPlayer.x - canvas.width / 2;
  const oy = townPlayer.y - canvas.height / 2;

  for (let y = 0; y < TOWN_H; y++) {
    for (let x = 0; x < TOWN_W; x++) {
      const sx = x * TILE - ox;
      const sy = y * TILE - oy;
      if (sx < -TILE || sy < -TILE || sx > canvas.width || sy > canvas.height) continue;
      const t = townMap[y]?.[x] ?? GRASS;
      drawTile(t, sx, sy);
    }
  }

  drawChar(townPlayer, townPlayer.x - ox, townPlayer.y - oy);
  drawChar(mobA, mobA.x - ox, mobA.y - oy);
  drawChar(mobB, mobB.x - ox, mobB.y - oy);

  if (balloon.active && gameState === STATE_TOWN) {
    drawBalloonAtScreen(balloon.x * TILE - ox, balloon.y * TILE - oy);
  }
}

// ===== ダンジョン描画 =====
function drawDungeon() {
  const ox = dungeonPlayer.x - canvas.width / 2;
  const oy = dungeonPlayer.y - canvas.height / 2;

  for (let y = 0; y < DUN_H; y++) {
    for (let x = 0; x < DUN_W; x++) {
      const sx = x * TILE - ox;
      const sy = y * TILE - oy;
      if (sx < -TILE || sy < -TILE || sx > canvas.width || sy > canvas.height) continue;
      const t = dungeonMap[y]?.[x] ?? GRASS;
      drawTile(t, sx, sy, true);
    }
  }

  drawChar(dungeonPlayer, dungeonPlayer.x - ox, dungeonPlayer.y - oy);

  if (balloon.active && gameState === STATE_DUNGEON) {
    drawBalloonAtScreen(balloon.x * TILE - ox, balloon.y * TILE - oy);
  }
}

// ===== バトル描画 =====
function drawBattle() {
  ctx.fillStyle = "#003";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawChar(battlePlayer, battlePlayer.x, battlePlayer.y);
  drawChar(enemy, enemy.x, enemy.y);

  ctx.fillStyle = "#fff";
  ctx.font = "14px sans-serif";
  ctx.fillText("HP " + playerStatus.hp + "/" + playerStatus.maxHp, 10, 20);
  ctx.fillText("薬 " + playerStatus.healItem, 10, 40);
  ctx.fillText("G " + playerStatus.gold, 10, 60);

  ctx.font = "12px sans-serif";
  ctx.fillText("Z: こうげき / 宝箱", 10, canvas.height - 30);
  ctx.fillText("X: かいふく", 10, canvas.height - 15);

  if (balloon.active && gameState === STATE_BATTLE) {
    drawBalloonAtScreen(enemy.x, enemy.y - TILE);
  }
}

// ===== 死亡画面 =====
function drawDeath() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "#fff";
  ctx.font = "24px sans-serif";
  ctx.fillText("あなたは たおれた……", 60, 120);

  if (deathReady) {
    ctx.font = "16px sans-serif";
    ctx.fillText("? Zキーで復活する", 60, 180);
  }
}

// ===== メイン描画 =====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (gameState) {
    case STATE_TITLE:   drawTitle();   break;
    case STATE_FIELD:   drawField();   break;
    case STATE_TOWN:    drawTown();    break;
    case STATE_DUNGEON: drawDungeon(); break;
    case STATE_BATTLE:  drawBattle();  break;
    case STATE_DEAD:    drawDeath();   break;
  }
}

//------------------------------------------------------
// メインループ
//------------------------------------------------------
let last = 0;
function loop(t) {
  const dt = (t - last) / 1000;
  last = t;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

//------------------------------------------------------
// 起動
//------------------------------------------------------
loadImages(imageList, () => {
  loadTileImages(tileList, async () => {

    // 外部マップ読み込み
    field      = await loadMapById(MAP_WORLD_01);
    townMap    = await loadMapById(MAP_CITY_01);
    dungeonMap = await loadMapById(MAP_DUNGEON_01);
    battleMap  = await loadMapById(MAP_BATTLE_FIELD_01);

    // JSON サイズを反映
    FIELD_H = field.length;
    FIELD_W = field[0].length;

    console.log("FIELD SIZE:", FIELD_W, FIELD_H);

    // プレイヤー中央スタート
    const centerX = Math.floor(FIELD_W / 2);
    const centerY = Math.floor(FIELD_H / 2);

    player.gridX = centerX;
    player.gridY = centerY;
    player.x = centerX * TILE;
    player.y = centerY * TILE;
    player.startX = player.x;
    player.startY = player.y;
    player.targetX = player.x;
    player.targetY = player.y;
    player.moving = false;

    // メインループ開始
    requestAnimationFrame(loop);
  });
});
