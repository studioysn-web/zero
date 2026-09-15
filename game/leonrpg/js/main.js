// ======================================================
// Part A — 基本・プレイヤー・バトル・描画・ループ
// ======================================================
const DEBUG_MODE = false; // デバッグモード
// ショップ関連の状態
let shopCursor = 0;
let shopMessage = "";
let currentShop = null;
let blockTalkOneFrame = false;
let MAX_KAIHUKU = 200;
let field_speed = DEBUG_MODE ? 0.05 : 0.08;
//let field_speed = DEBUG_MODE ? 0.05 : 0.04;
window.tileSize = 40;
const tileSize = 40;
const HP_DOWN = 0.4;
// ===============================
// タイル属性テーブル
// ===============================
const tileInfo = {
  0:  { pass: false, type: "wall" },
  1:  { pass: false, type: "wall" },
  2:  { pass: false, type: "wall" },
  3:  { pass: false, type: "wall" },
  4:  { pass: false, type: "wall" },
  5:  { pass: false, type: "wall" },
  6:  { pass: false, type: "wall" },
  7:  { pass: false, type: "wall" },
  8:  { pass: false, type: "wall" },
  9:  { pass: false, type: "wall" },
 10:  { pass: false, type: "wall" },
 11:  { pass: false, type: "wall" },
 12:  { pass: false, type: "wall" },
 13:  { pass: false, type: "wall" },
 14: { pass: true,  type: "sea" },
 15: { pass: true,  type: "floor" },
 16: { pass: true,  type: "floor" },
 17: { pass: true,  type: "floor" },
 18: { pass: true,  type: "floor" },
 19: { pass: true,  type: "floor" },
 20: { pass: true,  type: "floor" },
 21: { pass: true,  type: "floor" },
 22: { pass: true,  type: "floor" },
 23: { pass: true,  type: "floor" },
 24: { pass: true,  type: "floor" },
 25: { pass: true,  type: "floor" },
 26: { pass: true,  type: "floor" },
 27: { pass: true,  type: "dock" },
 28: { pass: true,  type: "floor" },
 29: { pass: true,  type: "floor" },
 30: { pass: true,  type: "floor" },
 31: { pass: true,  type: "floor" },
 32: { pass: true,  type: "floor" },
 33: { pass: true,  type: "floor" },
 34: { pass: true,  type: "floor" },
 35: { pass: true,  type: "floor" },
 36: { pass: false, type: "wall" },
 37: { pass: false, type: "wall" },
 38: { pass: false, type: "wall" },
 39: { pass: true,  type: "floor" },
 40: { pass: true,  type: "floor" },
 41: { pass: true,  type: "floor" },
 42: { pass: true,  type: "floor" },
 43: { pass: true,  type: "floor" },
 44: { pass: true,  type: "floor" },
 45: { pass: true,  type: "floor" },
 46: { pass: true,  type: "floor" },
 47: { pass: true,  type: "floor" },
 48: { pass: true,  type: "floor" },
 49: { pass: true,  type: "floor" },
 50: { pass: true,  type: "floor" },
 51: { pass: true,  type: "floor" },
 52: { pass: true,  type: "floor" },
 53: { pass: true,  type: "floor" },
 54: { pass: true,  type: "floor" },
 55: { pass: true,  type: "floor" },
 56: { pass: false, type: "wall" },
 57: { pass: false, type: "wall" },
 58: { pass: false, type: "wall" },
 59: { pass: false, type: "wall" }, 
 60: { pass: false, type: "wall" }, 
 61: { pass: true,  type: "floor" },
 62: { pass: true,  type: "floor" },
 63: { pass: true,  type: "floor" },
 64: { pass: true,  type: "floor" },
 65: { pass: true,  type: "floor" },
 66: { pass: true,  type: "floor" },
 67: { pass: true,  type: "floor" },
 68: { pass: true,  type: "floor" },
 69: { pass: true,  type: "floor" },
 70: { pass: true,  type: "floor" },
 71: { pass: true,  type: "floor" },
 72: { pass: true,  type: "floor" },
 73: { pass: true,  type: "floor" },
 74: { pass: true,  type: "floor" },
 75: { pass: true,  type: "floor" },
 76: { pass: true,  type: "floor" },
 77: { pass: true,  type: "floor" },
 78: { pass: true,  type: "floor" },
 79: { pass: true,  type: "floor" },
 80: { pass: true,  type: "floor" },
 81: { pass: true,  type: "floor" },
 82: { pass: true,  type: "floor" },
 83: { pass: true,  type: "floor" },
 84: { pass: true,  type: "floor" },
 85: { pass: true,  type: "floor" },
 86: { pass: true,  type: "floor" },
 87: { pass: true,  type: "floor" },
 88: { pass: true,  type: "floor" },
 89: { pass: true,  type: "floor" },
 90: { pass: true,  type: "floor" },
 91: { pass: true,  type: "floor" },
};


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
// ★ スマホでもズレないように内部サイズを合わせる
//canvas.width  = canvas.clientWidth;
//canvas.height = canvas.clientHeight;

//canvas.width = 800;
//canvas.height = 600;
let gameState = "title";
let mapLoader = null;

// プレイヤー画像
let playerImg0 = new Image();
let playerImg1 = new Image();

// マスターデータ
let weaponMaster = {};
let enemyMaster = {};

async function loadWeaponMaster() {
  const res = await fetch("data/weapon/weapon.json");
  weaponMaster = await res.json();
}
async function loadEnemyMaster() {
  const res = await fetch("data/enemy/enemy.json");
  enemyMaster = await res.json();
}

// イベントフラグ
let eventFlags = { mapId: "homeR1" };
let blockPortalOneFrame = false;

// キー入力
const keys = {};
let keyZDown = false;   // ← これが絶対に必要

document.addEventListener("keydown", e => {
  if (e.code === "KeyZ") {
    if (!keys["KeyZ"]) {
      keyZDown = true;   // ← Z押した瞬間だけ true
    }
  }
  keys[e.code] = true;
});

document.addEventListener("keyup", e => {
  keys[e.code] = false;
});


// プレイヤーステータス
let playerStatus = {
  hp: 0,
  maxHp: 0,
  weaponRank: 0,
  weapon: null,
  bullets: 10,
  heals: 3,
  gold: 0
};

// プレイヤー画像更新
function updatePlayerImagesByRank(rank) {
  playerImg0.src = `./img/player/${rank}A.png`;
  playerImg1.src = `./img/player/${rank}B.png`;
}

// バトル開始
async function startBattle(encounterId, tileId) {
  gameState = "battle";

  // ★ フィールド用ステータスを保存
  eventFlags.__fieldStatusBackup = JSON.parse(JSON.stringify(playerStatus));

  // ★ 戦闘用ステータスを作成
  const battleStatus = JSON.parse(JSON.stringify(playerStatus));
  const w = weaponMaster[String(battleStatus.weaponRank)];
  battleStatus.weapon = { ...w, rank: battleStatus.weaponRank };
  playerStatus = battleStatus;

  const result = await BattleEngine.start(encounterId, playerStatus, tileId);
  endBattle(result);
}


// バトル終了
function endBattle(result) {

  // ★ バトル描画を即停止（本丸）
  gameState = "game";

  // ★ フィールドステータス復元
  if (eventFlags.__fieldStatusBackup) {
    const field = eventFlags.__fieldStatusBackup;

    field.hp = playerStatus.hp;
    field.maxHp = playerStatus.maxHp;
    field.weapon = playerStatus.weapon;
    field.weaponRank = playerStatus.weapon.rank;
    field.bullets = playerStatus.bullets;
    field.heals = playerStatus.heals;
    field.gold = playerStatus.gold;

    playerStatus = field;
    eventFlags.__fieldStatusBackup = null;
  }

  // ★ 逃亡時は敵を消さずにフィールドへ戻る
  if (result.escaped) {
    eventFlags.__enemyEventData = null;
    eventFlags.__startBattleNext = false; // 使ってるなら
    return;
  }

  // ★ 勝利時：敵NPCを消す
  if (result.win && eventFlags.__enemyEventData) {

    const info = eventFlags.__enemyEventData;
    const eid = String(info.eventId);

    eventFlags[eid] = true;

    npcList = npcList.filter(n => String(n.data.eventId) !== eid);

    if (info.text_after) {
      const txt = info.text_after + "\n--- press C ---";  // ★ C案内を追加
      showBalloon(txt, player);

      balloon.isEnemyTalk = true;   // ★ ここで true にする
    }

    eventFlags.__enemyEventData = null;
  }

  // ★ 死亡処理
  if (playerStatus.hp <= 0) {
    eventFlags.__enemyEventData = null;
    eventFlags.__startBattleNext = false; // 使ってるなら

    // ペナルティ発生
    playerStatus.hp = Math.round(playerStatus.maxHp / 2);
    playerStatus.gold = Math.floor(playerStatus.gold * 0.8);
    checkPortal(eventFlags.lastRespawn);
    return;
  }

  blockPortalOneFrame = false;
}

// Mover（移動オブジェクト）
function makeMover(x, y, moveSec, type = "player") {
  const px = x * tileSize;
  const py = y * tileSize;
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
    animFrame: 0,
    animTimer: 0,
    dir: "down"
  };
}

let player = makeMover(7, 2, 0.12, "player");
let npcList = [];
let balloon = { active: false, text: "", x: 0, y: 0 };

// ゲーム開始
async function startGame() {
  gameState = "loading";

  /*
  // フラグテストエリア(TODO) =============================
eventFlags.ship = true;
eventFlags.stome_off = true;
eventFlags.get_key = true;
eventFlags.get_wood_cube = true;
eventFlags.get_soil_cube = true;
eventFlags.get_snow_cube = true;
eventFlags.get_sky_cube = true;
eventFlags.get_unknown_cube = true;

eventFlags.put_wood_cube = true;
eventFlags.put_sand_cube = true;
eventFlags.put_soil_cube = true;
eventFlags.put_snow_cube = true;
eventFlags.put_fire_cube = true;
eventFlags.put_sky_cube = true;
eventFlags.get_fire_cube = true;
// ★ テストで船を最初から使えるように
  eventFlags.put_unknown_cube = true;
  //eventFlags.all_switch_off = true;
  // ======================================================
*/
  await loadWeaponMaster();
  await loadEnemyMaster();

  mapLoader = new MapLoader(tileSize);
  await mapLoader.loadMap("homeR1");

  player = makeMover(7, 2, 0.12, "player");

  // ★ NPC 再生成（倒した敵を除外）
  npcList = mapLoader.map.char
    .filter(c => {
      if (c.require && !checkRequire(c.require)) return false;
      if (c.eventId && eventFlags[c.eventId]) return false;
      return true;
    })
    .map(c => {
      const mover = makeMover(c.x, c.y, 0.22, "npc");
      return { mover, data: c };
    });

  await BattleEngine.init();

  // ★ 武器初期化を削除（ここが本丸）
  const w = weaponMaster["0"];
  playerStatus.weapon = { ...w, rank: 0 };
  playerStatus.hp = w.hp;
  playerStatus.maxHp = w.hp;

  // ★ 代わりに現在の武器ランクで画像更新
  updatePlayerImagesByRank(playerStatus.weaponRank);

  gameState = "game";
}

// アニメーション更新
function updateAnim(obj, dt) {
  obj.animTimer += dt;
  if (obj.animTimer >= 0.25) {
    obj.animTimer = 0;
    obj.animFrame = obj.animFrame === 0 ? 1 : 0;
  }
}

// ======================================================
// スクロール（完全版）
// ======================================================
function updateScrollOffset() {
  const p = player;

  const px = p.x;
  const py = p.y;

  const mapW = mapLoader.map.size.w * tileSize;
  const mapH = mapLoader.map.size.h * tileSize;

  // プレイヤー中心にスクロール
  let ox = canvas.width / 2 - px - tileSize / 2;
  let oy = canvas.height / 2 - py - tileSize / 2;

  // マップ端で止める
  const maxOffsetX = 0;
  const maxOffsetY = 0;
  const minOffsetX = canvas.width - mapW;
  const minOffsetY = canvas.height - mapH;

  ox = Math.min(maxOffsetX, Math.max(ox, minOffsetX));
  oy = Math.min(maxOffsetY, Math.max(oy, minOffsetY));

  // 小さいマップは中央固定
  if (mapW < canvas.width) ox = (canvas.width - mapW) / 2;
  if (mapH < canvas.height) oy = (canvas.height - mapH) / 2;

  mapLoader.offsetX = ox;
  mapLoader.offsetY = oy;
}


// 描画
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mapLoader.draw(ctx);

  const pImg = player.animFrame === 0 ? playerImg0 : playerImg1;
  ctx.drawImage(
    pImg,
    player.x + mapLoader.offsetX,
    player.y + mapLoader.offsetY,
    tileSize,
    tileSize
  );

  for (const n of npcList) {
    const npc = n.mover;
    const data = n.data;
    const img = mapLoader.charImages[data.name][npc.animFrame];
    if (!img) continue;

    ctx.drawImage(
      img,
      npc.x + mapLoader.offsetX,
      npc.y + mapLoader.offsetY,
      tileSize,
      tileSize
    );
  }

  // ★ mover を使うので balloon.x / balloon.y は不要
  if (balloon.active && balloon.mover) {
    drawBalloonAtScreen();
  }
}


// メインループ
let lastTime = 0;
function loop(t) {
  const dt = (t - lastTime) / 1000;
  lastTime = t;

  if (gameState === "title") {
    drawTitle();
  } else if (gameState === "loading") {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Loading...", canvas.width / 2, canvas.height / 2);

    
    // 宣伝メッセージ（任意）
    ctx.font = "20px sans-serif";
    ctx.fillText("PALETTE BATTLERS - Now Loading", canvas.width / 2, canvas.height / 2 + 40);
  } else if (gameState === "game") {
    updatePlayer(dt);
    updateNPC(dt);
    drawGame();
    updateScrollOffset();
    updateUI();
  } else if (gameState === "battle") {
    BattleEngine.update(dt);
    BattleEngine.draw();
    updateUI();
  } else if (gameState === "shop") {
    drawShopWindow();
    updateUI();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
// ======================================================
// Part B — NPC更新・吹き出し・宝箱・ポータル
// ======================================================

// プレイヤーの前方タイル取得
function getFrontTile(obj) {
  let x = obj.gridX;
  let y = obj.gridY;

  if (obj.dir === "up") y--;
  if (obj.dir === "down") y++;
  if (obj.dir === "left") x--;
  if (obj.dir === "right") x++;

  return { x, y };
}

// スムーズ移動
function updateSmooth(obj, dt) {
  if (!obj.moving) return;

  const fixedDt = Math.min(dt, 0.0095);
  obj.moveTime += fixedDt;

  let t = obj.moveTime / obj.moveDuration;
  if (t > 1) t = 1;

  obj.x = obj.startX + (obj.targetX - obj.startX) * t;
  obj.y = obj.startY + (obj.targetY - obj.startY) * t;

  if (t >= 1) {
    obj.moving = false;
    obj.moveTime = 0;
  }
}

let lastPlayerGridX = player.gridX;
let lastPlayerGridY = player.gridY;

function updatePlayer(dt) {

  if (gameState !== "game") return;
  if (balloon.active) return;

  updateAnim(player, dt);

  if (!player.moving) {
    if (keys["ArrowUp"]) player.dir = "up";
    if (keys["ArrowDown"]) player.dir = "down";
    if (keys["ArrowLeft"]) player.dir = "left";
    if (keys["ArrowRight"]) player.dir = "right";
  }

  if (!player.moving) {
    const actors = npcList.map(n => n.mover);

    if (keys["ArrowUp"])
      startMove(player, 0, -1, mapLoader.map.size.w, mapLoader.map.size.h, actors);
    else if (keys["ArrowDown"])
      startMove(player, 0, 1, mapLoader.map.size.w, mapLoader.map.size.h, actors);
    else if (keys["ArrowLeft"])
      startMove(player, -1, 0, mapLoader.map.size.w, mapLoader.map.size.h, actors);
    else if (keys["ArrowRight"])
      startMove(player, 1, 0, mapLoader.map.size.w, mapLoader.map.size.h, actors);
  }

  updateSmooth(player, dt);

  if (keys["KeyX"]) {
    keys["KeyX"] = false;

    if (playerStatus.hp < playerStatus.maxHp && playerStatus.heals > 0) {
      playerStatus.heals--;
      playerStatus.hp += MAX_KAIHUKU;
      if (playerStatus.hp > playerStatus.maxHp) {
        playerStatus.hp = playerStatus.maxHp;
      }
      player.flash = 0.2;

      const hpRatio = playerStatus.hp / playerStatus.maxHp;
      const fill = document.getElementById("playerHpFill");

      fill.style.width = (hpRatio * 100) + "%";

      if (hpRatio > HP_DOWN) {
        fill.style.background = "rgba(80,255,80,0.9)";
      } else {
        fill.style.background = "rgba(255,80,80,0.9)";
      }
    }
  }

  if (!player.moving &&
      (player.gridX !== lastPlayerGridX || player.gridY !== lastPlayerGridY)) {

    lastPlayerGridX = player.gridX;
    lastPlayerGridY = player.gridY;

    // ★ 先にポータル判定
    checkPortal();

    // ★ ポータルでマップ移動したら gameState が "loading" になるので、
    //   その場合はエンカウントしないようにする
    if (gameState !== "game") return;

    // ★ デバッグモードなら敵を出さない
    if (DEBUG_MODE) return;

    // ★ そのあとでエンカウント判定
    let tileId = mapLoader.map.data[lastPlayerGridY][lastPlayerGridX];
    let rank   = mapLoader.map.rank[lastPlayerGridY][lastPlayerGridX];

    // 敵ランク選考
    rank = getWeightedRank(rank);

    if (tileId !== 14 && rank !== 0 && mapLoader.map.encount !== false) {
      if (Math.random() < 0.03) {
        startBattle(rank, tileId);
        return;
      }
    }
  }
}

// 敵ランク選考
function getWeightedRank(baseRank) {
  const min = Math.max(1, baseRank - 2);
  const max = baseRank;

  // ★ baseRank に寄せる重み
  const weights = [];
  for (let r = min; r <= max; r++) {
    const diff = baseRank - r;     // baseRankとの差
    const weight = 3 - diff;       // baseRank=3, baseRank-1=2, baseRank-2=1
    weights.push(weight);
  }

  // ★ 重み合計
  const total = weights.reduce((a, b) => a + b, 0);

  // ★ 重み付きランダム
  let rnd = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) {
      return min + i;
    }
  }

  return baseRank;
}


// NPC 更新
function updateNPC(dt) {
  if (gameState !== "game") return;

  for (const n of npcList) {
    const npc = n.mover;
    const data = n.data;

    updateAnim(npc, dt);

    // free 以外は固定位置
    if (data.move !== "free") {
      npc.targetX = npc.gridX * tileSize;
      npc.targetY = npc.gridY * tileSize;
      updateSmooth(npc, dt);
      continue;
    }

    // free（ランダム移動）
    if (!npc.moving) {
      npc.wait -= dt;
      if (npc.wait <= 0 && !balloon.active) {
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        const actors = npcList.map(x => x.mover).concat(player);
        startMove(npc, d[0], d[1], mapLoader.map.size.w, mapLoader.map.size.h, actors);
        npc.wait = 0.6;
      }
    }

    updateSmooth(npc, dt);
  }
}

// 吹き出し表示
function showBalloon(text, mover) {
  balloon.active = true;
  balloon.text = text;
  balloon.mover = mover; // ← NPC の実座標を保持
}


// 吹き出し閉じる
function closeBalloon() {
  balloon.active = false;
}

// 吹き出し描画
function drawBalloonAtScreen() {
  const npc = balloon.mover;
  if (!npc) return;

  // NPC の描画座標（スクロール込み）
  const sx = npc.x + mapLoader.offsetX + tileSize / 2;
  const sy = npc.y + mapLoader.offsetY;

  ctx.font = "25px sans-serif";

  const lines = balloon.text.split("\n");
  const lineHeight = 30;
  const padding = 10;

  let maxWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  }

  const w = maxWidth + padding * 2;
  const h = lines.length * lineHeight + padding * 2;

  // NPC の頭上に配置
  let bx = sx - w / 2;
  let by = sy - h - 8;

  // マップ内に収める補正
  const minX = mapLoader.offsetX;
  const maxX = mapLoader.offsetX + mapLoader.map.size.w * tileSize - w;

  const minY = mapLoader.offsetY;
  const maxY = mapLoader.offsetY + mapLoader.map.size.h * tileSize - h;

  if (bx < minX) bx = minX;
  if (bx > maxX) bx = maxX;
  if (by < minY) by = minY;
  if (by > maxY) by = maxY;

  ctx.fillStyle = "#fff";
  ctx.fillRect(bx, by, w, h);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(bx, by, w, h);

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bx + padding, by + padding + i * lineHeight);
  }
}

// 宝箱処理
function tryOpenChest() {
  const chestList = mapLoader.map.chest || [];
  if (!chestList.length) return false;

  const f = getFrontTile(player);

  for (let i = 0; i < chestList.length; i++) {
    const c = chestList[i];

    if (f.x === c.x && f.y === c.y) {

      if (eventFlags[c.eventId]) return false;

      // ★ 宝箱位置の mover を作る（NPC ではない）
      const chestMover = makeMover(c.x, c.y, 0, "npc");
      // アイテムは決め打ちで0～2の三種類のみ
      if (c.group === "item") {
        switch (c.itemId) {
          case 0:
            playerStatus.gold += c.value;
            showBalloon(`${c.value}G を手に入れた！`, chestMover);
            break;

          case 1:
            playerStatus.heals = Math.min(99, playerStatus.heals + c.value);
            showBalloon(`かいふくを ${c.value} 個 手に入れた！`, chestMover);
            break;

          case 2:
            playerStatus.bullets += c.value;
            showBalloon(`鉄くずを ${c.value} 発 手に入れた！`, chestMover);
            break;
          case 3:
            const msg = c.text;
              showBalloon(msg, chestMover);
              updateUI();   // ★ これを追加
            break;
        }
      }

      if (c.group === "weapon") {
        const w = weaponMaster[c.itemId];

        if (w.rank > playerStatus.weaponRank) {
          playerStatus.weaponRank = w.rank;
          playerStatus.weapon = w;

          playerStatus.maxHp = w.hp;
          playerStatus.hp = Math.min(playerStatus.hp, playerStatus.maxHp);

          updatePlayerImagesByRank(w.rank);
          showBalloon(`${w.text}を手に入れた！`, chestMover);
const hpRatio = playerStatus.hp / playerStatus.maxHp;
const fill = document.getElementById("playerHpFill");

fill.style.width = (hpRatio * 100) + "%";

if (hpRatio > HP_DOWN) {
  fill.style.background = "rgba(80,255,80,0.9)";
} else {
  fill.style.background = "rgba(255,80,80,0.9)";
}
        } else {
          playerStatus.gold += w.gold;
          showBalloon(`${w.gold}G を手に入れた！`, chestMover);
        }
      }

      eventFlags[c.eventId] = true;
      chestList.splice(i, 1);
      return true;
    }
  }

  return false;
}

// ポータル処理（復活地点記録つき & HP0復活対応）
async function checkPortal(forceRespawn = null) {

  // ★ HP0 から呼ばれた場合は通常ガードを無視する
  if (!forceRespawn) {
    if (blockPortalOneFrame) {
      blockPortalOneFrame = false;
      return;
    }

    const portals = mapLoader.map.portal;
    if (!portals) return;
  }

  // ★ forceRespawn がある場合は「強制ポータル情報」を作る
  let portalList;
  if (forceRespawn) {

// ★ HPバー更新（死亡時にも反映させる）
const hpRatio = playerStatus.hp / playerStatus.maxHp;
const fill = document.getElementById("playerHpFill");

fill.style.width = (hpRatio * 100) + "%";

if (hpRatio > HP_DOWN) {
  fill.style.background = "rgba(80,255,80,0.9)";
} else {
  fill.style.background = "rgba(255,80,80,0.9)";
}

    portalList = [{
      x: player.gridX,      // 位置判定は無視するので適当でOK
      y: player.gridY,
      to: forceRespawn.map,
      px: forceRespawn.x,
      py: forceRespawn.y
    }];
  } else {
    portalList = mapLoader.map.portal;
  }

  for (const p of portalList) {

    // ★ HP0 の場合は位置判定をスキップして即発動
    if (forceRespawn || (player.gridX === p.x && player.gridY === p.y)) {

      // ★ rebone:true のマップだけ復活地点を保存（通常ポータル時のみ）
      if (!forceRespawn && mapLoader.map.rebone === true) {
        eventFlags.lastRespawn = {
          map: mapLoader.map.mapId,
          x: mapLoader.map.rebone_x,
          y: mapLoader.map.rebone_y
        };
      }

      gameState = "loading";
      npcList = [];

      // ★ マップ読み込み
      await mapLoader.loadMap(p.to);

      // ★ NPC画像ロード（本丸）
      if (mapLoader.loadCharImages) {
        await mapLoader.loadCharImages();
      }

      // ★ 宝箱
      if (mapLoader.map.chest) {
        mapLoader.map.chest = mapLoader.map.chest.filter(c => !eventFlags[c.eventId]);
      }

      // ★ プレイヤー再生成
      player = makeMover(p.px, p.py, field_speed, "player");

      // ★ mapId は JSON の mapId を使う
      eventFlags.mapId = mapLoader.map.mapId;

      // ★ NPC 再生成
      npcList = mapLoader.map.char
        .filter(c => {
          if (c.require && !checkRequire(c.require)) return false;
          if (c.eventId && eventFlags[c.eventId]) return false;
          return true;
        })
        .map(c => {
          const mover = makeMover(c.x, c.y, 0.22, "npc");
          return { mover, data: c };
        });

      updateScrollOffset();
      blockPortalOneFrame = true;
      gameState = "game";
      return;
    }
  }
}

function checkRequire(req) {
  if (!req) return true;

  for (const key in req) {
    const want = req[key];
    const now = eventFlags[key];

    // ★ want が true の場合だけ厳密に判定する
    if (want === true) {
      if (now !== true) return false;
      continue;
    }

    // ★ want が false の場合は「false または undefined」を許可する
    if (want === false) {
      if (now === true) return false;   // true だけ弾く
      continue;
    }

    // ★ want が "undefined" の場合も false と同じ扱いにする
    if (want === "undefined") {
      if (now === true) return false;   // true だけ弾く
      continue;
    }
  }

  return true;
}


// ======================================================
// Part C — ショップ機能完全版
// ======================================================

// ショップを開く
function openShopByNpc(data) {
  currentShop = structuredClone(data.shop);
  shopCursor = 0;
  shopMessage = "";

  // 一番下に「店を出る」を追加
  currentShop.items.push({
    itemId: 999,
    name: "店を出る",
    value: 0,
    gold: 0
  });

  gameState = "shop";
}

// ショップウインドウ描画
function drawShopWindow() {
  const winW = 300;   // ← ウインドウ幅を大きく
  const winH = 220;   // ← ウインドウ高さを大きく

  // ★ 画面中央に配置
  const baseX = (canvas.width  - winW) / 2;
  const baseY = (canvas.height - winH) / 2;

  const lineHeight = 24;
  const cursorHeight = lineHeight * 0.7;

  // ウインドウ
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(baseX, baseY, winW, winH);

  // ヘッダ
  ctx.fillStyle = "#fff";
  ctx.fillText(currentShop.header, baseX + 20, baseY + 30);

  // アイテム一覧
  for (let i = 0; i < currentShop.items.length; i++) {
    const item = currentShop.items[i];
    const y = baseY + 60 + i * lineHeight;

    if (i === shopCursor) {
      ctx.fillStyle = "orange";
      ctx.fillRect(baseX + 10, y - cursorHeight / 2 + 7, winW - 20, cursorHeight);
    }

    ctx.fillStyle = "#fff";
    //ctx.fillText(`${item.name}  ${item.gold}G`, baseX + 20, y);

    if (item.id === 999) {
      ctx.fillText(item.name, baseX + 20, y);
    } else {
      ctx.fillText(`${item.name}  ${item.gold}G`, baseX + 20, y);
    }


  }

  // メッセージ欄
  if (shopMessage) {
    ctx.fillStyle = "yellow";
    ctx.fillText(shopMessage, baseX + 20, baseY + winH - 30);
const hpRatio = playerStatus.hp / playerStatus.maxHp;
const fill = document.getElementById("playerHpFill");

fill.style.width = (hpRatio * 100) + "%";

if (hpRatio > HP_DOWN) {
  fill.style.background = "rgba(80,255,80,0.9)";
} else {
  fill.style.background = "rgba(255,80,80,0.9)";
}
  }
}


// 購入処理
function buyShopItem() {
  const item = currentShop.items[shopCursor];

  // 店を出る
  if (item.itemId === 999) {
    gameState = "game";
    shopMessage = "";
    blockTalkOneFrame = true; // NPCの前で即「いらっしゃい！」防止
    return;
  }

  // お金チェック
  if (playerStatus.gold < item.gold) {
    shopMessage = "お金が足りない！";
    return;
  }

  // 上限チェック
  if (item.itemId === 1 && playerStatus.heals >= 99) {
    shopMessage = "これ以上持てない！";
    return;
  }
  if (item.itemId === 2 && playerStatus.bullets >= 99) {
    shopMessage = "これ以上持てない！";
    return;
  }

  if (item.itemId === 1) playerStatus.heals += item.value;
  if (item.itemId === 2) playerStatus.bullets += item.value;
  if (item.itemId === 3) {
    //playerStatus.weaponRank = item.rank;
    const w = weaponMaster[String(item.rank)]; 
    // item.value に武器ランクを入れてる想定（例：value:1 → ランク1武器）

    // ★ 今より弱い or 同じ武器なら買えない
    if (w.rank <= playerStatus.weaponRank) {
        shopMessage = "いまのままで十分だ！";
        return;
    }

    // ★ ここから買える処理
    playerStatus.weaponRank = w.rank;
    playerStatus.weapon = w;

    playerStatus.maxHp = w.hp;
    playerStatus.hp = Math.min(playerStatus.hp, playerStatus.maxHp);

    updatePlayerImagesByRank(w.rank);
  }

  // 購入
  playerStatus.gold -= item.gold;

  shopMessage = `${item.name}を手に入れた！`;
}

// ショップキー操作
document.addEventListener("keydown", (e) => {

  // ショップモード
  if (gameState === "shop") {

    if (e.code === "ArrowUp") {
      shopCursor = Math.max(0, shopCursor - 1);
      return;
    }

    if (e.code === "ArrowDown") {
      shopCursor = Math.min(currentShop.items.length - 1, shopCursor + 1);
      return;
    }

    if (e.code === "KeyZ") {
      buyShopItem();
      return;
    }

    if (e.code === "KeyX") {
      return;
    }

    return; // ショップ中はゲーム側に行かない
  }


if (e.code === "KeyZ" && gameState === "game") {
  
  // バルーンが出ている時
  if (balloon.active) {
    // ★ 敵吹き出しなら Z を無視
    if (balloon.isEnemyTalk === true) {
      return;
    }
    closeBalloon();

    // ★ ここで Z をクリアしておく
    keys["KeyZ"] = false;

    // enemy 戦闘開始
    if (eventFlags.__startBattleNext) {
      const info = eventFlags.__enemyEventData;
      if (info) {
        startBattle(info.enemyId, info.tileId);
      }
      eventFlags.__startBattleNext = null;
      return;
    }

    // ショップ
    if (eventFlags.__openShopNext) {
      openShopByNpc(eventFlags.__openShopNext);
      eventFlags.__openShopNext = null;
    }

    return;
  }

  // 宝箱
  if (tryOpenChest()) return;

  // 会話
  if (tryTalk()) return;
}
  // ★ ゲーム側の C 処理（敵吹き出し専用）
  if (e.code === "KeyC" && gameState === "game") {

    // ★ 敵吹き出しなら C で閉じる
    if (balloon.active && balloon.isEnemyTalk === true) {
      closeBalloon();
      balloon.isEnemyTalk = false;   // ★ リセット
      return;
    }

  // ★ 通常のC処理（逃亡など）
  // ここはあなたの戦闘側の処理に合わせて必要なら追加
}


});

// ------------------------------------------------------
// ★ ショップ会話 / ゲート / 敵 / 通常NPC / after_change 完全版
// ------------------------------------------------------
function tryTalk() {

  if (blockTalkOneFrame) {
    blockTalkOneFrame = false;
    return false;
  }

  const f = getFrontTile(player);

  for (const n of npcList) {
    const npc = n.mover;
    const data = n.data;

    if (npc.gridX === f.x && npc.gridY === f.y) {

      // ------------------------------------------------------
      // ★ enemy NPC
      // ------------------------------------------------------
      if (data.move === "enemy") {

        eventFlags.__enemyEventData = {
          eventId: String(data.eventId),
          enemyId: data.enemyId,
          tileId: data.tileId,
          text_after: data.text_after || null
        };

        if (data.text_before) {
          showBalloon(data.text_before, npc);
          eventFlags.__startBattleNext = true;
          return true;
        }

        startBattle(data.enemyId, data.tileId);
        return true;
      }

      // ------------------------------------------------------
      // ★ shop NPC
      // ------------------------------------------------------
      if (data.move === "shop") {
        showBalloon(data.text_shop, npc);
        eventFlags.__openShopNext = data;
        return true;
      }

      // ------------------------------------------------------
      // ★ gate NPC
      // ------------------------------------------------------
      if (data.move === "gate") {

        if (data.require && eventFlags[data.require]) {
          const idx = npcList.indexOf(n);
          if (idx !== -1) npcList.splice(idx, 1);
          return true;
        }

        showBalloon(data.text_before, npc);
        return true;
      }

      // ------------------------------------------------------
      // ★ movie NPC（mp4再生）
      // ------------------------------------------------------
      if (data.move === "movie") {

        // mp4ファイルのパスを data.movie_src に入れておく
        showBalloon(data.text_before, npc);
        if (data.movie_src) {
          playMovie(data.movie_src);   // ← ここを自作するだけでOK
        }

        return true;
      }
      // ------------------------------------------------------
      // ★ normal NPC（通常会話）
      // ------------------------------------------------------
      if (data.talk) {
        const txt = getNpcText(data);
        if (txt) {
          showBalloon(txt, npc);

          // ------------------------------------------------------
          // ★ after_change：会話後に NPC の見た目を差し替える
          // ------------------------------------------------------
          if (data.after_change && data.after_name) {
            data.name = data.after_name; 
          }
          return true;
        }
      }

      // ------------------------------------------------------
      // ★ text_before / text_after の通常処理
      // ------------------------------------------------------
      const flag = eventFlags[data.eventId] || false;

      if (!flag) {
        showBalloon(data.text_before, npc);
        eventFlags[data.eventId] = true;
      } else {
        showBalloon(data.text_after, npc);
      }

      // ------------------------------------------------------
      // ★ after_change：通常会話でも差し替え可能
      // ------------------------------------------------------
      if (data.after_change && data.after_name) {
        const tile = getTileById(data.tileId);
        if (tile) {
          tile.name = data.after_name;
        }
      }

      return true;
    }
  }
  return false;
}

function playMovie(src) {
  const canvas = document.getElementById("gameCanvas");
  const rect = canvas.getBoundingClientRect();

  const video = document.createElement("video");
  video.src = src;
  video.autoplay = true;
  video.controls = false;

  video.style.position = "absolute";

  // ★ canvas の中央に配置する
  video.style.left = rect.left + "px";
  video.style.top = rect.top + "px";
  video.style.width = rect.width + "px";
  video.style.height = rect.height + "px";

  video.style.objectFit = "cover";
  video.style.zIndex = 9999;

  document.body.appendChild(video);

}

// ======================================================
// Part D — UI・セーブ・Mover・通行判定（完全版）
// ======================================================

// UI 更新
function updateUI() {
  document.getElementById("uiHp").textContent =
    playerStatus.hp + "/" + playerStatus.maxHp;

  const weaponName = playerStatus.weapon ? playerStatus.weapon.text : "-";
  document.getElementById("uiAtk").textContent = weaponName;

  document.getElementById("uiBullets").textContent = playerStatus.bullets;
  document.getElementById("uiHeals").textContent = playerStatus.heals;
  document.getElementById("uiGold").textContent = playerStatus.gold;
}

// タイトル → ゲーム開始
document.addEventListener("click", () => {
  if (gameState === "title") startGame();
});
document.addEventListener("touchstart", () => {
  if (gameState === "title") startGame();
});

// セーブ
function saveGame() {
  const data = {
    playerStatus,
    eventFlags,
    mapId: eventFlags.mapId,
    playerPos: { x: player.gridX, y: player.gridY }
  };

  localStorage.setItem("PB_SAVE", JSON.stringify(data));
  showBalloon("セーブしました！", npc);
}

// ロード
function loadGame() {
  const raw = localStorage.getItem("PB_SAVE");
  if (!raw) return false;

  const data = JSON.parse(raw);

  playerStatus = data.playerStatus;
  eventFlags = data.eventFlags;

  updatePlayerImagesByRank(playerStatus.weaponRank);

  return true;
}

// フィールド移動（通行判定）
function startMove(obj, dx, dy, w, h, actors) {
  if (obj.moving) return;

  const nx = obj.gridX + dx;
  const ny = obj.gridY + dy;

  if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;

  const tileId = mapLoader.map.data[ny][nx];
  const currentTile = mapLoader.map.data[obj.gridY][obj.gridX];

  const info = tileInfo[tileId];
  const currentInfo = tileInfo[currentTile];

  if (!info || !info.pass) return;

  // 海は船フラグ必要
  //if (info.type === "sea" && (eventFlags.ship ?? 0) === 0) return;
  if (info.type === "sea" && !eventFlags.ship) return;
  // 海 → 海 は自由
  if (currentInfo.type === "sea" && info.type === "sea") {
    // OK
  } else {

    // 陸 → 海 は桟橋からのみ
    if (info.type === "sea" && currentInfo.type !== "dock") {
      return;
    }

    // 海 → 陸 は桟橋のみ
    if (currentInfo.type === "sea" && info.type !== "dock") {
      return;
    }
  }


  // 宝箱ブロック
  for (const it of mapLoader.map.chest) {
    if (it.x === nx && it.y === ny) return;
  }

  // NPCブロック
  if (actors) {
    for (const a of actors) {
      if (a !== obj && a.gridX === nx && a.gridY === ny) return;
    }
  }

  obj.startX = obj.x;
  obj.startY = obj.y;
  obj.gridX = nx;
  obj.gridY = ny;
  obj.targetX = nx * tileSize;
  obj.targetY = ny * tileSize;
  obj.moveTime = 0;
  obj.moving = true;

  // 船画像切替
  if (obj.type === "player") {
    if (info.type === "sea") {
      playerImg0.src = "./img/player/shipA.png";
      playerImg1.src = "./img/player/shipB.png";
    } else {
      updatePlayerImagesByRank(playerStatus.weaponRank);
    }
  }
}
// ======================================================
// タイトル画面描画（完全版）
// ======================================================
let blink = 0;

function drawTitle() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#c05030";
  ctx.font = "64px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PALETTE BATTLERS", canvas.width / 2, 220);

  ctx.fillStyle = "#30e0ff";
  ctx.font = "36px sans-serif";
  ctx.fillText("～ ジイシン 厄災の胎動 ～", canvas.width / 2, 300);

  blink++;
  if (Math.floor(blink / 30) % 2 === 0) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px sans-serif";
    ctx.fillText("PRESS START", canvas.width / 2, 400);
  }
}

function getNpcText(data) {

  // 新方式：条件付きセリフ（条件に合う時だけ優先）
  if (data.talk) {
    for (const t of data.talk) {
      if (checkRequire(t.require)) {

        // ★ talk に flag があればイベントフラグを立てる
        if (t.eventId) {
          for (const key in t.eventId) {
            eventFlags[key] = t.eventId[key];
          }
        }

        return t.text;  // ← talk がヒットした時だけ終了
      }
    }
  }

  // 旧方式：before/after（talk がヒットしなかった時だけ使う）
  const flag = eventFlags[data.eventId] || false;
  return flag ? data.text_after : data.text_before;
}
