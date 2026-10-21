//////////////////////////////////////////////////////////////
// ★★★ キャンバス取得 & 画像キャッシュ ★★★
//////////////////////////////////////////////////////////////
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

// 画像キャッシュ（描画サイズに縮小済みのcanvasが入る）
const IMAGES = {};

//////////////////////////////////////////////////////////////
// ★★★ 画像プリロード用リスト ★★★
//////////////////////////////////////////////////////////////
const imageList = [
    "./img/battler01.WebP",
    "./img/battler02.WebP",
    "./img/beam.WebP",
    "./img/beam02.WebP",
    "./img/bossBeam01.WebP",
    "./img/teki00.WebP",
    "./img/tekiDeath01.WebP",
    "./img/zikozu0.WebP",
    "./img/zikozu1.WebP",
    "./img/zikozu2.WebP",
    "./img/haikei1.WebP",
    "./img/haikei2.WebP",
    "./img/haikei3.WebP",
    "./img/haikei4.WebP",
    "./img/haikei5.WebP",
    "./img/haikei6.WebP",
    "./img/start_scr.WebP",
    "./img/rip.WebP"
];

//////////////////////////////////////////////////////////////
// ★★★ ローディング画面 ★★★
//////////////////////////////////////////////////////////////
function drawLoadingScreen(progress) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("LOADING...", canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = "gray";
    ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2, 300, 20);

    ctx.fillStyle = "lime";
    ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2, 300 * progress, 20);
}

//////////////////////////////////////////////////////////////
// ★★★ 画像プリロード（描画サイズに縮小して保存） ★★★
//////////////////////////////////////////////////////////////
// 画像パス → 実際に描画するサイズ [幅, 高さ]
function getDrawSize(src) {
    const s = src.toLowerCase();
    if (s.includes("haikei") || s.includes("start_scr")) return [canvas.width, canvas.height];
    if (s.includes("beam")) return [40, 50];
    if (s.includes("teki")) return [80, 80];
    return [100, 100]; // battler / zikozu / rip
}

function bake(img, w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    return c;
}

function preloadImages(list, callback) {
    let done = 0;
    const total = list.length;

    const finish = () => {
        done++;
        drawLoadingScreen(done / total);
        if (done === total) callback();
    };

    list.forEach(src => {
        const img = new Image();
        img.onload = () => {
            const [w, h] = getDrawSize(src);
            IMAGES[src] = bake(img, w, h);
            finish();
        };
        // 1枚でも失敗すると永久にLOADINGのままになるのを防ぐ
        img.onerror = () => {
            console.warn("画像の読み込みに失敗:", src);
            finish();
        };
        img.src = src;
    });
}

//////////////////////////////////////////////////////////////
// ★★★ ゲーム変数 ★★★
//////////////////////////////////////////////////////////////
let player, beams, backgroundX, score, isGameOver;
let enemies = [];
let enemyBeams = [];
let enemyID = 0;

let boss = null;
let bossActive = false;
let bossHP = 5;
let bossDefeatCount = 0;
let bossSpawnedThisStage = false;

let gameLoopId = null;
let gameStarted = false;

// フレーム時間補正（60fps = 1.0）
let lastTime = 0;
let dt = 1;

// 背景スムーズ切替用
let currentBG = 1;
let nextBG = 1;

// 入力
const keys = {};

//////////////////////////////////////////////////////////////
// ★★★ タイトル画面 ★★★
//////////////////////////////////////////////////////////////
function drawTitleScreen() {
    const img = IMAGES["./img/start_scr.WebP"];
    if (!img) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

//////////////////////////////////////////////////////////////
// ★★★ 起動時処理（ローディング → タイトル） ★★★
//////////////////////////////////////////////////////////////
window.onload = () => {
    drawLoadingScreen(0);

    preloadImages(imageList, () => {
        console.log("全画像ロード完了！");
        drawTitleScreen();

        const startBtn = document.getElementById("startButton");
        if (startBtn) startBtn.disabled = false;

        // タッチボタン設定
        ["up", "down"].forEach((dir) => {
            const keyMap = { up: "ArrowUp", down: "ArrowDown" };
            const btn = document.getElementById(dir);

            if (btn) {
                btn.addEventListener("touchstart", (e) => {
                    e.preventDefault();
                    keys[keyMap[dir]] = true;
                }, { passive: false });
                const release = (e) => {
                    e.preventDefault();
                    keys[keyMap[dir]] = false;
                };
                btn.addEventListener("touchend", release, { passive: false });
                btn.addEventListener("touchcancel", release, { passive: false });
            }
        });

        const shootBtn = document.getElementById("shoot");
        if (shootBtn) {
            shootBtn.addEventListener("touchstart", (e) => {
                e.preventDefault();
                if (!player || isGameOver) return;
                if (!player.shooting && beams.length < 3) {
                    shootBeam();
                }
            }, { passive: false });
        }
    });
};

//////////////////////////////////////////////////////////////
// ★★★ ゲーム開始（通信を待たずに即開始） ★★★
//////////////////////////////////////////////////////////////
function startGame() {
    const startBtn = document.getElementById("startButton");
    if (startBtn && startBtn.disabled) return;

    // 二重にループが走らないようにする
    if (gameLoopId) cancelAnimationFrame(gameLoopId);

    resetGame();
    gameStarted = true;
    lastTime = 0;
    gameLoop();

    // ★ Supabase のハイスコアは裏で取得（待たない）
    if (window.loadHighScore) {
        window.loadHighScore().then((hs) => {
            window.highScore = Math.max(Number(hs) || 0, window.highScore || 0);
        }).catch((e) => console.warn("ハイスコア取得失敗:", e));
    }
}

//////////////////////////////////////////////////////////////
// ★★★ リセット ★★★
//////////////////////////////////////////////////////////////
function resetGame() {
    player = {
        x: 20,
        y: 200,
        width: 100,
        height: 100,
        img: "./img/battler01.WebP",
        shooting: false,
        alive: true,
    };

    beams = [];
    backgroundX = 0;
    score = 0;
    isGameOver = false;

    enemies = [];
    enemyBeams = [];
    enemyID = 0;

    boss = null;
    bossActive = false;
    bossHP = 5;
    bossSpawnedThisStage = false;

    bossDefeatCount = 0;
    currentBG = 1;
    nextBG = 1;
}

//////////////////////////////////////////////////////////////
// ★★★ 背景スムーズ切替 ★★★
//////////////////////////////////////////////////////////////
function drawBackground() {
    const level = Math.floor(score / 1500) % 6 + 1;
    nextBG = level;

    const bg1 = IMAGES[`./img/haikei${currentBG}.WebP`];
    const bg2 = IMAGES[`./img/haikei${nextBG}.WebP`];

    const bx = Math.round(backgroundX);

    if (bg1) {
        ctx.drawImage(bg1, bx, 0);
    }
    if (bg2) {
        ctx.drawImage(bg2, bx + canvas.width, 0);
    }

    backgroundX -= 2 * dt;

    if (backgroundX <= -canvas.width) {
        backgroundX += canvas.width;
        currentBG = nextBG;
    }

    // ステージ5でボス出現
    if (level === 5) {
        if (!bossSpawnedThisStage && !bossActive && !boss) {
            spawnBoss();
            bossSpawnedThisStage = true;
        }
    } else {
        bossSpawnedThisStage = false;
    }
}

//////////////////////////////////////////////////////////////
// ★★★ 入力処理 ★★★
//////////////////////////////////////////////////////////////
document.addEventListener("keydown", (e) => {
    keys[e.key] = true;

    if (e.key === "z" && player && !player.shooting && !isGameOver && beams.length < 3) {
        shootBeam();
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

//////////////////////////////////////////////////////////////
// ★★★ プレイヤー＆ビーム ★★★
//////////////////////////////////////////////////////////////
function shootBeam() {
    if (!player) return;

    player.shooting = true;

    beams.push({
        x: player.x + player.width,
        y: player.y + player.height / 2
    });

    player.img = "./img/battler02.WebP";
    setTimeout(() => {
        // やられ画像を上書きしないようにする
        if (player && player.img === "./img/battler02.WebP") player.img = "./img/battler01.WebP";
    }, 100);
    setTimeout(() => (player.shooting = false), 300);
}

function drawPlayer() {
    if (!player) return;
    const img = IMAGES[player.img];
    if (!img) return;

    ctx.drawImage(img, player.x, player.y);
}

function drawBeams() {
    const beamImg = IMAGES["./img/beam.WebP"];
    if (!beamImg) return;

    for (let i = beams.length - 1; i >= 0; i--) {
        const beam = beams[i];
        beam.x += 5 * dt;

        ctx.drawImage(beamImg, Math.round(beam.x), Math.round(beam.y));

        if (beam.x > canvas.width) {
            beams.splice(i, 1);
        }
    }
}

//////////////////////////////////////////////////////////////
// ★★★ スコア表示 ★★★
//////////////////////////////////////////////////////////////
function drawScore() {
    ctx.font = "bold 23px Arial";
    ctx.textAlign = "center";

    // ★ SCORE（中央上）
    ctx.fillStyle = "#ec4abc";
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 50);

    if (score > (window.highScore || 0)) {
        window.highScore = score;
    }

    // ★ HIGH SCORE（その上に赤で派手に）
    if (window.highScore !== undefined) {
        ctx.lineWidth = 6;
        ctx.strokeStyle = "black";
        ctx.strokeText(`HIGH SCORE: ${window.highScore}`, canvas.width / 2, 22);

        ctx.fillStyle = "#fc1414";
        ctx.fillText(`HIGH SCORE: ${window.highScore}`, canvas.width / 2, 22);
    }
}

function drawBossDefeatCount() {
    ctx.fillStyle = "yellow";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`BOSS DEFEATED: ${bossDefeatCount}`, canvas.width - 20, 20);
}

//////////////////////////////////////////////////////////////
// ★★★ メインループ ★★★
//////////////////////////////////////////////////////////////
function gameLoop(t) {
    if (t === undefined) t = performance.now();
    // 60fps換算の経過フレーム数（最大3でクランプ。タブ復帰時の瞬間移動防止）
    dt = lastTime ? Math.min((t - lastTime) / 16.667, 3) : 1;
    lastTime = t;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawPlayer();
    drawBeams();
    drawEnemies();
    drawEnemyBeams();
    drawBoss();
    drawScore();
    drawBossDefeatCount();

    if (!isGameOver) {
        if (player) {
            if (keys["ArrowUp"] && player.y > 100) player.y -= 3 * dt;
            if (keys["ArrowDown"] && player.y < canvas.height - player.height) player.y += 3 * dt;
        }

        updateEnemies();
        updateGameObjects();
        updateBoss();
        checkPlayerCollision();

        gameLoopId = requestAnimationFrame(gameLoop);
    } else {
        gameLoopId = null;
        displayGameOverOverlay();
    }
}

//////////////////////////////////////////////////////////////
// ★★★ 雑魚出現（最大3体まで） ★★★
//////////////////////////////////////////////////////////////
function spawnEnemy() {
    if (gameStarted && enemies.length < 3 && !isGameOver) {
        enemyID++;

        enemies.push({
            id: enemyID,
            x: canvas.width + 50,
            y: Math.random() * (canvas.height - 200) + 100,
            width: 80,
            height: 80,
            img: "./img/teki00.WebP",
            alive: true,
            movingUp: true,
            targetX: canvas.width - 150,
            remove: false
        });
    }
}

// 3秒ごとに雑魚追加
setInterval(spawnEnemy, 3000);

//////////////////////////////////////////////////////////////
// ★★★ 雑魚描画 ★★★
//////////////////////////////////////////////////////////////
function drawEnemies() {
    enemies.forEach((enemy) => {
        const img = IMAGES[enemy.img];
        if (img) {
            ctx.drawImage(img, Math.round(enemy.x), Math.round(enemy.y));
        }

        // 入場中
        if (enemy.x > enemy.targetX) {
            enemy.x -= 3 * dt;
            return;
        }

        // 上下移動
        if (enemy.movingUp) {
            enemy.y -= 2 * dt;
            if (enemy.y <= 100) enemy.movingUp = false;
        } else {
            enemy.y += 2 * dt;
            if (enemy.y >= canvas.height - enemy.height) enemy.movingUp = true;
        }
    });
}

//////////////////////////////////////////////////////////////
// ★★★ 敵弾（雑魚・ボス共通） ★★★
//////////////////////////////////////////////////////////////
function drawEnemyBeams() {
    for (let i = enemyBeams.length - 1; i >= 0; i--) {
        const beam = enemyBeams[i];
        beam.x -= (beam.speed || 5) * dt;

        const key = beam.bossShot
            ? "./img/bossBeam01.WebP"
            : "./img/beam02.WebP";

        const img = IMAGES[key];
        if (img) {
            ctx.drawImage(img, Math.round(beam.x), Math.round(beam.y));
        }

        if (beam.x < -100) {
            enemyBeams.splice(i, 1);
        }
    }
}

//////////////////////////////////////////////////////////////
// ★★★ 雑魚の攻撃（ランダム） ★★★
//////////////////////////////////////////////////////////////
function updateEnemies() {
    enemies.forEach((enemy) => {
        if (enemy.alive && Math.random() < 0.01 * dt) {
            enemyBeams.push({
                x: enemy.x,
                y: enemy.y + enemy.height / 2,
                speed: 5,
                bossShot: false
            });
        }
    });
}

//////////////////////////////////////////////////////////////
// ★★★ プレイヤー被弾判定 ★★★
//////////////////////////////////////////////////////////////
function checkPlayerCollision() {
    const margin = 30;

    for (let i = enemyBeams.length - 1; i >= 0; i--) {
        const beam = enemyBeams[i];

        if (
            beam.x < player.x + player.width - margin &&
            beam.x + 40 > player.x + margin &&
            beam.y < player.y + player.height - margin &&
            beam.y + 50 > player.y + margin
        ) {
            player.img = "./img/rip.WebP";
            setTimeout(() => (isGameOver = true), 500);
            enemyBeams.splice(i, 1);
        }
    }
}

//////////////////////////////////////////////////////////////
// ★★★ 雑魚死亡処理（安全削除） ★★★
//////////////////////////////////////////////////////////////
function updateGameObjects() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];

        if (!enemy.alive && enemy.remove) {
            enemies.splice(i, 1);
            continue;
        }

        for (let j = beams.length - 1; j >= 0; j--) {
            if (checkCollision(beams[j], enemy) && enemy.alive) {
                beams.splice(j, 1);
                enemy.alive = false;
                enemy.img = "./img/tekiDeath01.WebP";
                score += 150;

                setTimeout(() => {
                    enemy.remove = true;
                }, 300);
            }
        }
    }
}

//////////////////////////////////////////////////////////////
// ★★★ 全キャラ共通の当たり判定（HitBox縮小） ★★★
//////////////////////////////////////////////////////////////
function checkCollision(beam, obj) {
    const margin = 30;

    return (
        beam.x < obj.x + obj.width - margin &&
        beam.x + 40 > obj.x + margin &&
        beam.y < obj.y + obj.height - margin &&
        beam.y + 50 > obj.y + margin
    );
}

//////////////////////////////////////////////////////////////
// ★★★ 大ボス ★★★
//////////////////////////////////////////////////////////////
function spawnBoss() {
    bossActive = true;
    bossHP = 5;

    boss = {
        x: canvas.width + 150,
        y: canvas.height / 2 - 50,
        width: 100,
        height: 100,
        alive: true,
        movingUp: true,
        img: "./img/zikozu0.WebP",
        deathImg: "./img/zikozu2.WebP",
        hitEffect: false,
        remove: false
    };
}

//////////////////////////////////////////////////////////////
// ★★★ ボス描画 ★★★
//////////////////////////////////////////////////////////////
function drawBoss() {
    if (!bossActive || !boss) return;

    const img = IMAGES[boss.img];
    if (img) {
        ctx.drawImage(img, Math.round(boss.x), Math.round(boss.y));
    }
}

//////////////////////////////////////////////////////////////
// ★★★ ボス挙動 ★★★
//////////////////////////////////////////////////////////////
function updateBoss() {
    if (!bossActive || !boss) return;
    if (!boss.alive) return;

    // 入場中
    if (boss.x > canvas.width - 200) {
        boss.x -= 2 * dt;
        return;
    }

    // 上下移動
    if (boss.movingUp) {
        boss.y -= 2 * dt;
        if (boss.y <= 100) boss.movingUp = false;
    } else {
        boss.y += 2 * dt;
        if (boss.y >= canvas.height - boss.height) boss.movingUp = true;
    }

    // ボス攻撃
    if (Math.random() < 0.02 * dt) {
        enemyBeams.push({
            x: boss.x - 20,
            y: boss.y + boss.height / 2 - 10,
            bossShot: true,
            speed: 8
        });
    }

    // プレイヤー弾との衝突
    for (let j = beams.length - 1; j >= 0; j--) {
        if (checkCollision(beams[j], boss)) {
            beams.splice(j, 1);
            bossHP--;

            // 赤化エフェクト
            boss.hitEffect = true;
            boss.img = "./img/zikozu1.WebP";

            setTimeout(() => {
                if (boss && boss.alive) {
                    boss.hitEffect = false;
                    boss.img = "./img/zikozu0.WebP";
                }
            }, 100);

            // 撃破
            if (bossHP <= 0) {
                boss.alive = false;
                boss.img = boss.deathImg;
                bossDefeatCount++;

                // ボス弾削除
                enemyBeams = enemyBeams.filter(b => !b.bossShot);

                setTimeout(() => {
                    bossActive = false;
                    boss = null;
                }, 300);
            }
        }
    }
}

//////////////////////////////////////////////////////////////
// ★★★ ゲームオーバー表示（通信待ちなし） ★★★
//////////////////////////////////////////////////////////////
function displayGameOverOverlay() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "red";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 120);

    const defeatBonus = bossDefeatCount * 2000;
    const finalScore = score + defeatBonus;

    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial";
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillText(
        `BOSS BONUS: ${bossDefeatCount} × 2000 = ${defeatBonus}`,
        canvas.width / 2,
        canvas.height / 2 + 10
    );

    ctx.fillText(`TOTAL: ${finalScore}`, canvas.width / 2, canvas.height / 2 + 60);

    // ★ 取得済みのハイスコアをそのまま表示（通信しない）
    ctx.fillStyle = "yellow";
    ctx.fillText(`HIGH SCORE: ${window.highScore || 0}`, canvas.width / 2, canvas.height / 2 + 120);

    gameStarted = false;

    const panel = document.getElementById("scoreEntry");
    if (panel) {
        panel.style.display = "block";
        panel.dataset.score = finalScore;
    }

    // ★ 結果欄をクリア
    const result = document.getElementById("scoreEntryResult");
    if (result) result.innerText = "";
}
