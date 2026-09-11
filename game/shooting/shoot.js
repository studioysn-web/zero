//////////////////////////////////////////////////////////////
// ★★★ キャンバス取得 & 画像キャッシュ ★★★
//////////////////////////////////////////////////////////////
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 画像キャッシュ
const IMAGES = {};

//////////////////////////////////////////////////////////////
// ★★★ 画像プリロード用リスト ★★★
//////////////////////////////////////////////////////////////
const imageList = [
    "./img/battler01.png",
    "./img/battler02.png",
    "./img/beam.png",
    "./img/beam02.png",
    "./img/bossBeam01.png",
    "./img/teki00.png",
    "./img/tekiDeath01.png",
    "./img/zikozu0.png",
    "./img/zikozu1.png",
    "./img/zikozu2.png",
    "./img/haikei1.png",
    "./img/haikei2.png",
    "./img/haikei3.png",
    "./img/haikei4.png",
    "./img/haikei5.png",
    "./img/haikei6.png",
    "./img/start_scr.png",
    "./img/rip.png"
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
// ★★★ 画像プリロード（キャッシュ対応） ★★★
//////////////////////////////////////////////////////////////
function preloadImages(list, callback) {
    let loaded = 0;
    const total = list.length;

    list.forEach(src => {
        const img = new Image();
        img.onload = () => {
            loaded++;
            drawLoadingScreen(loaded / total);
            if (loaded === total) callback();
        };
        img.src = src;

        // キャッシュに保存
        IMAGES[src] = img;
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

// 背景スムーズ切替用
let currentBG = 1;
let nextBG = 1;

// 入力
const keys = {};

//////////////////////////////////////////////////////////////
// ★★★ タイトル画面 ★★★
//////////////////////////////////////////////////////////////
function drawTitleScreen() {
    const img = IMAGES["./img/start_scr.png"];
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
                btn.addEventListener("touchstart", () => {
                    keys[keyMap[dir]] = true;
                });
                btn.addEventListener("touchend", () => {
                    keys[keyMap[dir]] = false;
                });
            }
        });

        const shootBtn = document.getElementById("shoot");
        if (shootBtn) {
            shootBtn.addEventListener("touchstart", () => {
                if (!player || isGameOver) return;
                if (!player.shooting && beams.length < 3) {
                    shootBeam();
                }
            });
        }
    });
};

//////////////////////////////////////////////////////////////
// ★★★ ゲーム開始 ★★★
//////////////////////////////////////////////////////////////
function startGame() {
    const startBtn = document.getElementById("startButton");
    if (startBtn && startBtn.disabled) return;

    if (gameLoopId) cancelAnimationFrame(gameLoopId);

    loadHighScore();
    resetGame();
    gameStarted = true;
    gameLoop();
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
        img: "./img/battler01.png",
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
// ★★★ 背景スムーズ切替（キャッシュ使用） ★★★
//////////////////////////////////////////////////////////////
function drawBackground() {
    const level = Math.floor(score / 1500) % 6 + 1;
    nextBG = level;

    const bg1 = IMAGES[`./img/haikei${currentBG}.png`];
    const bg2 = IMAGES[`./img/haikei${nextBG}.png`];

    if (bg1) {
        ctx.drawImage(bg1, backgroundX, 0, canvas.width, canvas.height);
    }
    if (bg2) {
        ctx.drawImage(bg2, backgroundX + canvas.width, 0, canvas.width, canvas.height);
    }

    backgroundX -= 2;

    if (backgroundX <= -canvas.width) {
        backgroundX = 0;
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

    player.img = "./img/battler02.png";
    setTimeout(() => (player.img = "./img/battler01.png"), 100);
    setTimeout(() => (player.shooting = false), 300);
}

function drawPlayer() {
    if (!player) return;
    const img = IMAGES[player.img];
    if (!img) return;

    ctx.drawImage(img, player.x, player.y, player.width, player.height);
}

function drawBeams() {
    const beamImg = IMAGES["./img/beam.png"];
    if (!beamImg) return;

    for (let i = beams.length - 1; i >= 0; i--) {
        const beam = beams[i];
        beam.x += 5;

        ctx.drawImage(beamImg, beam.x, beam.y, 40, 50);

        if (beam.x > canvas.width) {
            beams.splice(i, 1);
        }
    }
}

//////////////////////////////////////////////////////////////
// ★★★ スコア表示 ★★★
//////////////////////////////////////////////////////////////
function drawScore() {
    const hs = loadHighScore();

    ctx.fillStyle = "red";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`HIGH-SCORE: ${hs.score}`, canvas.width / 2, 20);

    ctx.fillStyle = "white";
    ctx.fillText(`現在のSCORE: ${score}`, canvas.width / 2, 40);
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
function gameLoop() {
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
            if (keys["ArrowUp"] && player.y > 100) player.y -= 3;
            if (keys["ArrowDown"] && player.y < canvas.height - player.height) player.y += 3;
        }

        updateEnemies();
        updateGameObjects();
        updateBoss();
        checkPlayerCollision();

        gameLoopId = requestAnimationFrame(gameLoop);
    } else {
        displayGameOverOverlay();
    }
}
//////////////////////////////////////////////////////////////
// ★★★ 雑魚出現（最大3体まで） ★★★
//////////////////////////////////////////////////////////////
function spawnEnemy() {
    if (enemies.length < 3 && !isGameOver) {
        enemyID++;

        enemies.push({
            id: enemyID,
            x: canvas.width + 50,
            y: Math.random() * (canvas.height - 200) + 100,
            width: 80,
            height: 80,
            img: "./img/teki00.png",
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
// ★★★ 雑魚描画（キャッシュ使用） ★★★
//////////////////////////////////////////////////////////////
function drawEnemies() {
    enemies.forEach((enemy) => {
        const img = IMAGES[enemy.img];
        if (img) {
            ctx.drawImage(img, enemy.x, enemy.y, enemy.width, enemy.height);
        }

        // 入場中
        if (enemy.x > enemy.targetX) {
            enemy.x -= 3;
            return;
        }

        // 上下移動
        if (enemy.movingUp) {
            enemy.y -= 2;
            if (enemy.y <= 100) enemy.movingUp = false;
        } else {
            enemy.y += 2;
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
        beam.x -= beam.speed || 5;

        const key = beam.bossShot
            ? "./img/bossBeam01.png"
            : "./img/beam02.png";

        const img = IMAGES[key];
        if (img) {
            ctx.drawImage(img, beam.x, beam.y, 40, 50);
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
        if (enemy.alive && Math.random() < 0.01) {
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
            player.img = "./img/rip.png";
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
                enemy.img = "./img/tekiDeath01.png";
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
// ★★★ 大ボス（ステージ6限定） ★★★
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
        img: "./img/zikozu0.png",
        deathImg: "./img/zikozu2.png",
        hitEffect: false,
        remove: false
    };
}

//////////////////////////////////////////////////////////////
// ★★★ ボス描画（キャッシュ使用） ★★★
//////////////////////////////////////////////////////////////
function drawBoss() {
    if (!bossActive || !boss) return;

    const img = IMAGES[boss.img];
    if (img) {
        ctx.drawImage(img, boss.x, boss.y, boss.width, boss.height);
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
        boss.x -= 2;
        return;
    }

    // 上下移動
    if (boss.movingUp) {
        boss.y -= 2;
        if (boss.y <= 100) boss.movingUp = false;
    } else {
        boss.y += 2;
        if (boss.y >= canvas.height - boss.height) boss.movingUp = true;
    }

    // ボス攻撃
    if (Math.random() < 0.02) {
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
            boss.img = "./img/zikozu1.png";

            setTimeout(() => {
                if (boss && boss.alive) {
                    boss.hitEffect = false;
                    boss.img = "./img/zikozu0.png";
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
// ★★★ ハイスコア保存・読み込み ★★★
//////////////////////////////////////////////////////////////
function saveHighScore(finalScore) {
    const currentHighScore = Number(localStorage.getItem("highScore") || 0);

    if (finalScore > currentHighScore) {
        localStorage.setItem("highScore", finalScore);
    }
}

function loadHighScore() {
    return {
        score: Number(localStorage.getItem("highScore") || 0)
    };
}

//////////////////////////////////////////////////////////////
// ★★★ GAME OVER 画面（通常 → ボーナス → 合計 → ハイスコア） ★★★
//////////////////////////////////////////////////////////////
function displayGameOverOverlay() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "red";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 120);

    // 撃破ボーナス
    const defeatBonus = bossDefeatCount * 2000;
    const finalScore = score + defeatBonus;

    // 保存
    saveHighScore(finalScore);

    // 最新ハイスコア取得
    const hs = loadHighScore();

    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial";

    // ① 通常スコア
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 - 40);

    // ② ボス撃破ボーナス
    ctx.fillText(
        `BOSS BONUS: ${bossDefeatCount} × 2000 = ${defeatBonus}`,
        canvas.width / 2,
        canvas.height / 2 + 10
    );

    // ③ 合計スコア
    ctx.fillText(`TOTAL: ${finalScore}`, canvas.width / 2, canvas.height / 2 + 60);

    // ④ ハイスコア
    ctx.fillStyle = "yellow";
    ctx.fillText(`HIGH SCORE: ${hs.score}`, canvas.width / 2, canvas.height / 2 + 120);

    gameStarted = false;
}

//////////////////////////////////////////////////////////////
// ★★★ スマホ操作（タッチ） ★★★
// ※ window.onload 内で設定済みなので追加なし
//////////////////////////////////////////////////////////////
