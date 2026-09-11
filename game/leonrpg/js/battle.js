
// ===============================
// バトル用バルーン（街バルーン互換）
// ===============================
let battleBalloon = {
  active: false,
  text: "",
  x: 0,
  y: 0,
  waitForZ: false
};

// ===============================
// BattleEngine 本体
// ===============================
const BattleEngine = (() => {
  const TILE = tileSize;
  const HP_DOWN = 0.4;
  const battleMap = new MapLoader(TILE);
  const battlePlayer = makeMover(6, 12, 0.35, "player");

  let enemies = [];
  let bullets = [];

  let playerStatus = null;
  let enemyMaster = null;
  let weaponMaster = null;

  let chestImg01 = null;
  let chestImg02 = null;

  let onEndBattle = null;
  let lastDir = { x: 0, y: -1 };

  // ===============================
  // 汎用画像読み込み
  // ===============================
  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }

  async function loadPlayerImages(rank) {
    battlePlayer.img = [
      await loadImage(`./img/player/${rank}A.png`),
      await loadImage(`./img/player/${rank}B.png`)
    ];
  }

async function loadEnemyMaster() {
  const res = await fetch("data/enemy/enemy.json");
  const arr = await res.json();

  enemyMaster = {};
  for (const e of arr) {
    enemyMaster[String(e.id)] = e;
  }
}


  

  async function loadWeaponMaster() {
    const res = await fetch("./data/weapon/weapon.json");
    weaponMaster = await res.json();
  }

  async function loadChestImages() {
    chestImg01 = await loadImage("./img/chest/01.png");
    chestImg02 = await loadImage("./img/chest/02.png");
  }

  // ===============================
  // 敵の初期位置
  // ===============================
  function getEnemyPositions(count) {
    const patterns = {
      1: [6],
      2: [5, 7],
      3: [4, 6, 8]
    };
    return patterns[count] || [6];
  }

  // ===============================
  // 敵生成
  // ===============================
  async function setupEnemies(rank) {
    enemies = [];
    const enemyData = enemyMaster[String(rank)];
    if (!enemyData) return;
    const max = enemyData.max || 1;
    const count = Math.floor(Math.random() * max) + 1;

    const xs = getEnemyPositions(count);

    for (let i = 0; i < count; i++) {
      const base = Number(enemyData.id);

      const imgA = new Image();
      const imgB = new Image();
      imgA.src = `./img/enemy/${base}A.png`;
      imgB.src = `./img/enemy/${base}B.png`;

      const gridX = xs[i];
      const gridY = 1;

      enemies.push({
        id: base,
        name: enemyData.name,
        rank: enemyData.rank,
        hp: enemyData.hp,
        maxHp: enemyData.hp,
        atk: enemyData.atk,
        gold: enemyData.gold,
        drop: enemyData.drop,

        img: [imgA, imgB],
        frame: 0,
        animTimer: 0,

        x: gridX * TILE,
        y: gridY * TILE,
        gridX,
        gridY,

        alive: true,
        isChest: false,
        chestOpened: false,

        flash: 0,
        heal:0,
        wait: 0.25,
        atkWait: 0.79,

        moving: false,
        moveTime: 0,
        moveDuration: 0.12,
        startX: gridX * TILE,
        startY: gridY * TILE,
        targetX: gridX * TILE,
        targetY: gridY * TILE
      });
    }
  }

  // ===============================
  // バトルマップ中央寄せ
  // ===============================
  function updateBattleOffset() {
    const mapW = battleMap.map.size.w * TILE;
    const mapH = battleMap.map.size.h * TILE;

    battleMap.offsetX = (canvas.width - mapW) / 2;
    battleMap.offsetY = (canvas.height - mapH) / 2;
  }

  // ===============================
  // 移動処理
  // ===============================
  function startMoveBattle(obj, dx, dy, w, h, actors, map) {
    if (obj.moving) return;

    const nx = obj.gridX + dx;
    const ny = obj.gridY + dy;

    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;

    const tileId = map.data[ny][nx];
    if (tileId <= 14) return;

    for (const a of actors) {
      if (a !== obj && a.gridX === nx && a.gridY === ny) return;
    }

    obj.startX = obj.x;
    obj.startY = obj.y;
    obj.gridX = nx;
    obj.gridY = ny;
    obj.targetX = nx * TILE;
    obj.targetY = ny * TILE;
    obj.moveTime = 0;
    obj.moving = true;
  }

  function updateSmoothBattle(obj, dt) {
    if (!obj.moving) return;

    obj.moveTime += dt;
    const t = obj.moveTime / obj.moveDuration;

    if (t >= 1) {
      obj.x = obj.targetX;
      obj.y = obj.targetY;
      obj.gridX = obj.targetX / TILE;
      obj.gridY = obj.targetY / TILE;
      obj.moving = false;
      obj.moveTime = 0;
      return;
    }

    obj.x = obj.startX + (obj.targetX - obj.startX) * t;
    obj.y = obj.startY + (obj.targetY - obj.startY) * t;
  }

  // ===============================
  // 隣接判定
  // ===============================
  function isAdj(a, b) {
    return (
      (a.gridX === b.gridX && Math.abs(a.gridY - b.gridY) === 1) ||
      (a.gridY === b.gridY && Math.abs(a.gridX - b.gridX) === 1)
    );
  }

  // ===============================
  // 敵死亡 → 宝箱化
  // ===============================
  function handleEnemyDeath(e) {
    e.isChest = true;
    e.chestOpened = false;

    let drop = null;
    for (const d of e.drop) {
      if (Math.random() < d.rate) {
        drop = d;
        break;
      }
    }
    e.dropResult = drop;

    if (!drop) {
      e.img = [chestImg01, chestImg01];
      return;
    }

    if (drop.type === "item") {
      e.img = [chestImg01, chestImg01];
      return;
    }

    if (drop.type === "weapon") {
      e.img = [chestImg02, chestImg02];
      return;
    }
  }

  // ===============================
  // 宝箱開封（バルーン表示）
  // ===============================
function openChestBattle(e) {
  const screenX = e.x + battleMap.offsetX;
  const screenY = e.y + battleMap.offsetY - 32;

  let msg = "";
  const drop = e.dropResult;

  // ★ drop が null / undefined → ゴールド扱い
  if (!drop) {
    playerStatus.gold += e.gold;
    msg = `${e.gold}G を手に入れた！`;
  }

  // ★ アイテム
  else if (drop.type === "item") {
    if (drop.id === "かいふく") {
      playerStatus.heals++;
      msg = "かいふくを手に入れた！";
    } else {
      // 他の item が増えた時の保険
      msg = `${drop.id} を手に入れた！`;
    }
  }

  // ★ 武器
else if (drop.type === "weapon") {
  const newRank = drop.id;
  console.log("-----------=" + newRank)
  const currentRank = playerStatus.weapon.rank;
  const newWeapon = weaponMaster[newRank];

  if (newRank > currentRank) {
    playerStatus.weapon = newWeapon;

    // ★ HP を武器の値に合わせて更新（重要）
    playerStatus.maxHp = newWeapon.hp;
    playerStatus.hp = Math.min(playerStatus.hp, playerStatus.maxHp);

    loadPlayerImages(newRank);
    updatePlayerImagesByRank(newRank);

    msg = `${newWeapon.text} を手に入れた！`;
  } else {
    playerStatus.gold += newWeapon.gold;
    msg = `${newWeapon.gold}G を手に入れた！`;
  }
}


  // ★ 念のための保険（msg が空なら “かいふく” 扱い）
  if (!msg) {
    playerStatus.heals++;
    msg = "かいふくを手に入れた！";
  }

  // バルーン表示
  battleBalloon.active = true;
  battleBalloon.text = msg;
  battleBalloon.x = screenX;
  battleBalloon.y = screenY;
  battleBalloon.waitForZ = true;

  // 宝箱を消す
  e.chestOpened = true;
  e.isChest = false;
  e.x = -9999;
  e.y = -9999;
}


  // ===============================
  // 戦闘終了判定
  // ===============================
  function checkBattleEnd() {
    enemies = enemies.filter(e => e.alive || e.isChest);

    const still = enemies.some(e => e.alive || e.isChest);
    if (still) return false;

    if (onEndBattle) {
      onEndBattle({
        win: true,
        escaped: false,
        hp: playerStatus.hp,
        gold: playerStatus.gold,
        weapon: playerStatus.weapon,
        heals: playerStatus.heals,
        bullets: playerStatus.bullets
      });
    }
    return true;
  }
  // ===============================
  // バトル更新（update）
  // ===============================
  function update(dt) {
    if (!playerStatus) return;
    updateUI();
    const hpRatio = playerStatus.hp / playerStatus.maxHp;
    const fill = document.getElementById("playerHpFill");

    // バーの長さ
    fill.style.width = (hpRatio * 100) + "%";

    // 色変え
    if (hpRatio > HP_DOWN) {
      fill.style.background = "rgba(80,255,80,0.9)";   // 緑
    } else {
      fill.style.background = "rgba(255,80,80,0.9)";  // 赤
    }

    // --------------------------------
    // ★ バルーン表示中は Z/C だけ受け付ける
    // --------------------------------
    if (battleBalloon.active) {

      // Z閉じる（宝箱）
      if (battleBalloon.waitForZ && keys["KeyZ"]) {
        keys["KeyZ"] = false;
        battleBalloon.active = false;
        battleBalloon.waitForZ = false;

        if (battleBalloon.onClose) {
          battleBalloon.onClose();
          battleBalloon.onClose = null;
        }
        return;
      }

      // C閉じる（死亡）
      if (battleBalloon.waitForC && keys["KeyC"]) {
        keys["KeyC"] = false;
        battleBalloon.active = false;
        battleBalloon.waitForC = false;

        if (battleBalloon.onClose) {
          battleBalloon.onClose();
          battleBalloon.onClose = null;
        }
        return;
      }

      return;
    }

    // --------------------------------
    // プレイヤー移動
    // --------------------------------
    if (!battlePlayer.moving) {
      const actors = enemies.filter(e => e.alive || e.isChest);

      if (keys["ArrowUp"]) {
        startMoveBattle(battlePlayer, 0, -1,
          battleMap.map.size.w, battleMap.map.size.h, actors, battleMap.map);
        lastDir = { x: 0, y: -1 };

      } else if (keys["ArrowDown"]) {
        startMoveBattle(battlePlayer, 0, 1,
          battleMap.map.size.w, battleMap.map.size.h, actors, battleMap.map);
        lastDir = { x: 0, y: 1 };

      } else if (keys["ArrowLeft"]) {
        startMoveBattle(battlePlayer, -1, 0,
          battleMap.map.size.w, battleMap.map.size.h, actors, battleMap.map);
        lastDir = { x: -1, y: 0 };

      } else if (keys["ArrowRight"]) {
        startMoveBattle(battlePlayer, 1, 0,
          battleMap.map.size.w, battleMap.map.size.h, actors, battleMap.map);
        lastDir = { x: 1, y: 0 };
      }
    }

    updateSmoothBattle(battlePlayer, dt);

    // プレイヤーアニメ
    battlePlayer.animTimer += dt;
    const hpRate = playerStatus.hp / playerStatus.maxHp;
    const animSpeed = (hpRate <= HP_DOWN ? 0.05 : 0.25);

    if (battlePlayer.animTimer >= animSpeed) {
      battlePlayer.animTimer = 0;
      battlePlayer.frame = (battlePlayer.frame === 0 ? 1 : 0);
    }

    // --------------------------------
    // 敵AI
    // --------------------------------
    for (const e of enemies) {
      if (!e.alive && !e.isChest) continue;

      e.animTimer += dt;
      if (e.animTimer >= 0.25) {
        e.animTimer = 0;
        e.frame = (e.frame === 0 ? 1 : 0);
      }

      e.wait -= dt;

      if (!e.moving && e.alive && e.wait <= 0) {
        const dx = battlePlayer.gridX - e.gridX;
        const dy = battlePlayer.gridY - e.gridY;

        let mx = 0, my = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          mx = dx > 0 ? 1 : -1;
        } else if (dy !== 0) {
          my = dy > 0 ? 1 : -1;
        }

        const actors = [battlePlayer, ...enemies.filter(x => x !== e)];
        startMoveBattle(e, mx, my,
          battleMap.map.size.w, battleMap.map.size.h, actors, battleMap.map);

        if (e.moving) e.wait = 1.1; // 移動速度
      }

      updateSmoothBattle(e, dt);

      if (e.flash > 0) e.flash -= dt;
      if (e.heal > 0) e.heal -= dt;
    }

    // --------------------------------
    // Zキー（宝箱 → 近接 → 遠距離）
    // --------------------------------
    if (keyZDown) {

          // ★ 宝箱（checkBattleEnd を呼ばない）
          for (const e of enemies) {
            if (e.isChest && !e.chestOpened && isAdj(battlePlayer, e)) {
              openChestBattle(e);
              keyZDown = false;   // ← 1回だけ発火
              return;
            }
          }

          // 近接攻撃
          for (const e of enemies) {
            if (e.alive && isAdj(battlePlayer, e)) {
              
              let dmg = playerStatus.weapon.atk;
              dmg = applyVariance(dmg);

              e.hp -= dmg;
              e.flash = 0.2;
              showHpPie(e, dmg);

              if (e.hp <= 0 && e.alive) {
                e.hp = 0;
                e.alive = false;
                handleEnemyDeath(e);
              }

              keyZDown = false;   // ← ここが重要（長押し暴走防止）

              if (checkBattleEnd()) return;
              return;
            }
          }

          // 遠距離攻撃
          if (playerStatus.bullets > 0) {
            playerStatus.bullets--;

            const bx = battlePlayer.x + battleMap.offsetX + TILE / 2;
            const by = battlePlayer.y + battleMap.offsetY + TILE / 2;

            bullets.push({
              x: bx,
              y: by,
              vx: lastDir.x,
              vy: lastDir.y,
              speed: 300,
              alive: true
            });
          }

          keyZDown = false;   // ← 最後にも入れる（保険）
    }



    function applyVariance(dmg) {
      const rate = 0.9 + Math.random() * 0.2; // 0.9〜1.1
      return Math.floor(dmg * rate);
    }
  // ダメージメーター（円と同時に ダメージ を出す）
    function showHpPie(enemy, dmg) {
      const canvas = document.getElementById("gameCanvas");
      const rect = canvas.getBoundingClientRect();

      const ratio = enemy.hp / enemy.maxHp;

      // キャンバス内部座標
      const x = enemy.x + battleMap.offsetX + TILE / 2;
      const y = enemy.y + battleMap.offsetY - TILE / 2;
      let r = 18;

      // スマホ判定（そのまま）
      const isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isMobile) r = 8;

      // 内部座標 → 画面座標（位置ズレは触らない）
      const scaleX = rect.width  / canvas.width;
      const scaleY = rect.height / canvas.height;

      const screenX = rect.left + x * scaleX;
      const screenY = canvas.offsetTop + y * scaleY;

      // 描画用キャンバス
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = r * 2;
      tempCanvas.height = r * 2;
      const tempCtx = tempCanvas.getContext("2d");

      // 背景円
      tempCtx.beginPath();
      tempCtx.arc(r, r, r, 0, Math.PI * 2);
      tempCtx.fillStyle = "rgba(80,80,80,0.4)";
      tempCtx.fill();

      // ★ HP0 のときは赤円を描かない（満タンバグ防止）
      if (ratio > 0) {
        tempCtx.beginPath();
        tempCtx.moveTo(r, r);
        tempCtx.arc(
          r, r, r,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * ratio
        );
        tempCtx.closePath();
        tempCtx.fillStyle = "#f36100c9";
        tempCtx.fill();
      }

      // 円の画像を追加
      const img = new Image();
      img.src = tempCanvas.toDataURL();
      img.style.position = "absolute";
      img.style.left = (screenX - r) + "px";
      img.style.top  = (screenY - r) + "px";
      img.style.pointerEvents = "none";
      img.style.zIndex = 99999;
      document.body.appendChild(img);

      // ★ hello を円と同じタイミングで出す（位置は自由）
      const hello = document.createElement("div");
      hello.textContent = dmg;
      hello.style.position = "absolute";

      // 円のちょい上に出す例（好きに調整してOK）
      hello.style.left = (screenX - r) + "px";
      hello.style.top  = (screenY - r - 10) + "px";
    hello.style.transform = "translate(60%, -50%)";
      hello.style.fontFamily = "Arial black";
      //hello.style.fontWeight = "bold";  

      hello.style.color = "red";
      hello.style.fontSize = "20px";
      hello.style.pointerEvents = "none";
      hello.style.zIndex = 99999;
      document.body.appendChild(hello);

      // ★ 円と hello を同時に消す
      setTimeout(() => {
        img.remove();
        hello.remove();
      }, 200);
    }

    // --------------------------------
    // 回復（X）
    // --------------------------------
    if (keys["KeyX"]) {
      keys["KeyX"] = false;

      if (playerStatus.hp < playerStatus.maxHp && playerStatus.heals > 0) {
        playerStatus.heals--;
        playerStatus.hp += 130;
        if (playerStatus.hp > playerStatus.maxHp) {
          playerStatus.hp = playerStatus.maxHp;
        }
        battlePlayer.heal = 0.2;
      }
    }

    // --------------------------------
    // 逃亡（C）
    // --------------------------------
    if (keys["KeyC"]) {
      keys["KeyC"] = false;

      if (onEndBattle) {
        onEndBattle({
          win: false,
          escaped: true,
          hp: playerStatus.hp,
          gold: playerStatus.gold,
          weapon: playerStatus.weapon,
          heals: playerStatus.heals,
          bullets: playerStatus.bullets
        });
      }
      return;
    }

    // --------------------------------
    // 敵攻撃
    // --------------------------------
    for (const e of enemies) {
      if (!e.alive) continue;

      e.atkWait -= dt;

      if (e.atkWait <= 0) {
        if (isAdj(battlePlayer, e)) {
          if (Math.random() < 0.55) {
            playerStatus.hp -= e.atk;
            if (playerStatus.hp < 0) playerStatus.hp = 0;
            battlePlayer.flash = 0.3;

            
          }
        }
        e.atkWait = 0.85;
      }
    }

    if (battlePlayer.flash > 0) battlePlayer.flash -= dt;
    if (battlePlayer.heal > 0) battlePlayer.heal -= dt;
    // --------------------------------
    // 弾丸処理
    // --------------------------------
    for (const b of bullets) {
      if (!b.alive) continue;

      b.x += b.vx * b.speed * dt;
      b.y += b.vy * b.speed * dt;

      if (b.x < 0 || b.y < 0 ||
          b.x > canvas.width || b.y > canvas.height) {
        b.alive = false;
        continue;
      }

      const tx = Math.floor((b.x - battleMap.offsetX) / TILE);
      const ty = Math.floor((b.y - battleMap.offsetY) / TILE);

      if (tx >= 0 && ty >= 0 &&
          tx < battleMap.map.size.w && ty < battleMap.map.size.h) {

        const tileId = battleMap.map.data[ty][tx];
        if (tileId <= 14) {
          b.alive = false;
          continue;
        }
      }

      for (const e of enemies) {
        if (!e.alive) continue;

        const ex = e.x + battleMap.offsetX;
        const ey = e.y + battleMap.offsetY;

        if (b.x > ex && b.x < ex + TILE &&
            b.y > ey && b.y < ey + TILE) {

          // ★ 敵の現在HPの7%
          let dmg = Math.floor(e.hp * 0.07);
          if (dmg >= 800) {
            dmg = 800;
          }
          // ★ ±10% 揺らぎ
          dmg = applyVariance(dmg);

          // ★ 最低1ダメージ保証
          if (dmg < 1) dmg = 1;

          e.hp -= dmg;
          //showDamageFloat(e, dmg);
          e.flash = 0.2;
          b.alive = false;
          showHpPie(e, dmg);

          if (e.hp <= 0 && e.alive) {
            e.hp = 0;
            e.alive = false;
            handleEnemyDeath(e);
          }
          break;
        }

      }
    }

    bullets = bullets.filter(b => b.alive);

    if (checkBattleEnd()) return;
  
    // ★ HP0 → 死亡演出（C押したら戦闘終了）
    if (playerStatus.hp <= 0) {

      // 死亡メッセージを出す
      battleBalloon.active = true;
      battleBalloon.text = "貴方は敗れました\n前回の街へ転送されます\n--- press C ---";
      battleBalloon.x = battlePlayer.x + battleMap.offsetX;
      battleBalloon.y = battlePlayer.y + battleMap.offsetY - 32;

      // ★ Cキーで閉じるモード
      battleBalloon.waitForZ = false;
      battleBalloon.waitForC = true;

      // ★ Cで閉じたら戦闘終了
      battleBalloon.onClose = () => {
        if (onEndBattle) {
          onEndBattle({
            win: false,
            escaped: false,
            hp: 0,
            gold: playerStatus.gold,
            weapon: playerStatus.weapon,
            heals: playerStatus.heals,
            bullets: playerStatus.bullets
          });
        }
      };

      return;
    }

  }

  // ===============================
  // 描画（draw）
  // ===============================
  function draw() {


  // ★ 本丸：バトル描画前にキャンバスを完全クリアする
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!battleMap.map) {
      ctx.fillStyle = "rgb(2, 2, 2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    updateBattleOffset();
    battleMap.draw(ctx);

    // プレイヤー
    if (battlePlayer.img && battlePlayer.img[battlePlayer.frame]) {
      ctx.drawImage(
        battlePlayer.img[battlePlayer.frame],
        battlePlayer.x + battleMap.offsetX,
        battlePlayer.y + battleMap.offsetY,
        TILE, TILE
      );
    }

    // プレイヤーダメージ
    if (battlePlayer.flash > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(255,100,150,0.6)";
      ctx.beginPath();
      const cx = battlePlayer.x + battleMap.offsetX + TILE / 2;
      const cy = battlePlayer.y + battleMap.offsetY + TILE / 2;
      const r  = TILE / 2;
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (battlePlayer.heal > 0) {
      ctx.save();  // ← 追加
      ctx.fillStyle = "rgba(21, 213, 247, 0.55)";

      ctx.beginPath();
      const cx = battlePlayer.x + battleMap.offsetX + TILE / 2;
      const cy = battlePlayer.y + battleMap.offsetY + TILE / 2;
      const r  = TILE / 2;
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore(); // ← 追加
    }


    // 敵
    for (const e of enemies) {
      if (e.img && e.img[e.frame]) {
        ctx.drawImage(
          e.img[e.frame],
          e.x + battleMap.offsetX,
          e.y + battleMap.offsetY,
          TILE, TILE
        );
      }

      if (e.flash > 0) {
        ctx.fillStyle = "rgba(255,80,80,0.5)";
        ctx.fillRect(
          e.x + battleMap.offsetX,
          e.y + battleMap.offsetY,
          TILE, TILE
        );
      }
    }

    // 弾丸
    ctx.fillStyle = "rgb(221, 105, 10)";
    for (const b of bullets) {
      if (!b.alive) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // UI
    //drawUI();

    // バルーン
    drawBattleBalloon(ctx);
  }

  // ===============================
  // バルーン描画（街バルーン互換）
  // ===============================
  function drawBattleBalloon(ctx) {

    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    if (!battleBalloon.active) return;

    ctx.font = "25px sans-serif";

    const lines = battleBalloon.text.split("\n");
    const lineHeight = 30;
    const padding = 10;

    let maxWidth = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxWidth) maxWidth = w;
    }

    const w = maxWidth + padding * 2;
    const h = lines.length * lineHeight + padding * 2;

    let bx = battleBalloon.x - w / 2 + 40;
    let by = battleBalloon.y - h + 20;


    // 画面外補正
    const minX = 0;
    const maxX = canvas.width - w;
    const minY = 0;
    const maxY = canvas.height - h;

    if (bx < minX) bx = minX;
    if (bx > maxX) bx = maxX;
    if (by < minY) by = minY;
    if (by > maxY) by = maxY;

    ctx.fillStyle = "#fff";
    ctx.fillRect(bx, by, w, h);

    ctx.strokeStyle = "#000";
    ctx.strokeRect(bx, by, w, h);

    ctx.fillStyle = "#000";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + padding, by + padding + i * lineHeight);
    }
  }

  // ===============================
  // 初期化
  // ===============================
  async function init() {
    await loadEnemyMaster();
    await loadWeaponMaster();
    await loadChestImages();
    //await battleMap.loadMap("bt01");
  }

  function getBattleMapId(tileId) {
    let mapId = "bt01";
    if (tileId === 99) {
      mapId = "bt99";
    }
    return mapId;
  }
  // ===============================
  // 戦闘開始
  // ===============================
  async function start(enemyRank, status, tileId) {

  // ★ バトル状態の完全初期化（本丸）
  battleBalloon.active = false;
  battleBalloon.waitForZ = false;
  battleBalloon.waitForC = false;   // ← 追加
  battleBalloon.onClose = null;     // ← 追加

  enemies = [];
  bullets = [];
  BattleEngine.__finished = false;
  BattleEngine.__result = null;

  // ★ プレイヤーの残りフラグを完全リセット
  battlePlayer.flash = 0;        // ← これがないと前のバトルのフラッシュが残る
  battlePlayer.head = 0;
  battlePlayer.animTimer = 0;
  battlePlayer.frame = 0;

  return new Promise(async (resolve) => {
    await battleMap.loadMap(getBattleMapId(tileId), tileId);

    battleBalloon.active = false;
    battleBalloon.waitForZ = false;
    battleBalloon.text = "";

    playerStatus = status;

    enemies = [];
    bullets = [];

    battlePlayer.gridX = 6;
    battlePlayer.gridY = 12;
    battlePlayer.x = battlePlayer.gridX * TILE;
    battlePlayer.y = battlePlayer.gridY * TILE;

    battlePlayer.startX = battlePlayer.x;
    battlePlayer.startY = battlePlayer.y;
    battlePlayer.targetX = battlePlayer.x;
    battlePlayer.targetY = battlePlayer.y;
    battlePlayer.moving = false;
    battlePlayer.moveTime = 0;

    await loadPlayerImages(playerStatus.weapon.rank);
    enemies = [];
    await setupEnemies(enemyRank);

    onEndBattle = resolve;
  });
}



  // ===============================
  // 外部公開
  // ===============================
  return {
    init,
    start,
    update,
    draw
  };
})();
