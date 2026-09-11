let canvas;
let ctx;
let player, beams, backgroundX, score, isGameOver, enemies, enemyBeams, enemyID;
let gameLoopID = null;
let enemySpawnID = null;

function startGame() {
    document.getElementById("titleScreen").style.opacity = 0;
    document.getElementById("titleScreen").style.pointerEvents = "none";
    document.getElementById("titleScreen").style.display = "none";

    // ★ 開始ボタンを無効化
    const btn = document.getElementById("startButton");
    btn.disabled = true;
    btn.style.opacity = "0.5";

    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    loadHighScore();
    resetGame();

    // ★ すでに動いているループを止める
    if (gameLoopID !== null) {
        cancelAnimationFrame(gameLoopID);
        gameLoopID = null;
    }

    if (enemySpawnID !== null) {
        clearInterval(enemySpawnID);
        enemySpawnID = null;
    }

    // ★ 新しく開始
    gameLoopID = requestAnimationFrame(gameLoop);
    enemySpawnID = setInterval(spawnEnemy, 3000);
}


// ★ これを追加
window.startGame = startGame;

function resetGame() {
    player = {
        x: 20,
        y: 100,
        width: 100,
        height: 100,
        img: "./game/shooting/img/battler01.png",
        shooting: false,
    };
    beams = [];
    backgroundX = 0;
    score = 0;
    isGameOver = false;

    enemies = [];
    enemyBeams = [];
    enemyID = 0;
}



function drawBackground() {
    const backgroundImage = new Image();
    backgroundImage.src = "./game/shooting/img/haikei.png";
    ctx.drawImage(backgroundImage, backgroundX, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, backgroundX + canvas.width, 0, canvas.width, canvas.height);

    backgroundX -= 2;
    if (backgroundX <= -canvas.width) {
        backgroundX = 0;
    }
}

const keys = {};
document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === "z" && !player.shooting && !isGameOver && beams.length < 3) {
        player.shooting = true;
        beams.push({ x: player.x + player.width, y: player.y + player.height / 2 });
        player.img = "./game/shooting/img/battler02.png";
        setTimeout(() => (player.img = "./game/shooting/img/battler01.png"), 100);
        setTimeout(() => (player.shooting = false), 300);
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function drawPlayer() {
    const image = new Image();
    image.src = player.img;
    ctx.drawImage(image, player.x, player.y, player.width, player.height);
}

function drawBeams() {
    beams.forEach((beam, index) => {
        beam.x += 5;
        const beamImage = new Image();
        beamImage.src = "./game/shooting/img/beam.png";
        ctx.drawImage(beamImage, beam.x, beam.y, 40, 50);

        if (beam.x > canvas.width) beams.splice(index, 1);
    });
}


function drawScore() {
    const highScore = loadHighScore(); // ローカルストレージからハイスコアを取得

    // テキストスタイルを共通化
    ctx.fillStyle = "red";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";

    // ハイスコアを中央上部に表示
    ctx.fillText("HIGH-SCORE: " + highScore, canvas.width / 2, 20);

    // 現在のスコアをその下に白色で表示
    ctx.fillStyle = "white";
    ctx.fillText("現在のSCORE: " + score, canvas.width / 2, 40);
}




function displayGameOverOverlay() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "red";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial";
    ctx.fillText("SCORE: " + score, canvas.width / 2, canvas.height / 2 + 40);

    // ハイスコア更新処理
    saveHighScore(score); // 正しくスコアを渡して保存

    document.getElementById("startButton").disabled = false;
    document.getElementById("startButton").style.opacity = "1";
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawPlayer();
    drawBeams();
    drawEnemies();
    drawEnemyBeams();
    drawScore();

    if (!isGameOver) {

        if (keys["ArrowUp"] && player.y > 100) player.y -= 3;
        if (keys["ArrowDown"] && player.y < canvas.height - player.height) player.y += 3;

        adjustAttackFrequency();
        updateEnemies();
        updateGameObjects();
        checkPlayerCollision();

        // ★ ここでIDを保存する
        gameLoopID = requestAnimationFrame(gameLoop);

    } else {
        displayGameOverOverlay();
    }
}

function spawnEnemy() {
    if (enemies.length < 3) {
        enemyID++;
        enemies.push({
            id: enemyID,
            x: canvas.width,
            y: Math.random() * (canvas.height - 100),
            width: 80,
            height: 80,
            img: "./game/shooting/img/teki00.png",
            targetX: canvas.width - 100,
            movingIn: true,
            movingUp: true,
            maxHeight: 50,
            minHeight: canvas.height - 20,
            alive: true,
            shooting: false,
             attackFrequency: (Math.random() * 0.02 + 0.01) * attackFrequencyMultiplier // 周期調整
        });
    }
}

function drawEnemies() {
    enemies.forEach((enemy) => {
        const image = new Image();
        image.src = enemy.img;
        ctx.drawImage(image, enemy.x, enemy.y, enemy.width, enemy.height);

        if (enemy.movingIn) {
            enemy.x -= 5;
            if (enemy.x <= enemy.targetX) enemy.movingIn = false;
        } else {
            if (enemy.movingUp) {
                enemy.y -= 2;
                if (enemy.y <= 100) enemy.movingUp = false;
            } else {
                enemy.y += 2;
                if (enemy.y >= enemy.minHeight - enemy.height) enemy.movingUp = true;
            }
        }
        
        if (!enemy.shooting && Math.random() < enemy.attackFrequency) {
		    enemyBeams.push({ x: enemy.x - 10, y: enemy.y + enemy.height / 2 });
		    enemy.shooting = true;
		    setTimeout(() => (enemy.shooting = false), 1000);
		}
    });
}

function drawEnemyBeams() {
    enemyBeams.forEach((beam, index) => {
        beam.x -= 5;
        const beamImage = new Image();
        beamImage.src = "./game/shooting/img/beam02.png";
        ctx.drawImage(beamImage, beam.x, beam.y, 40, 50);

        if (beam.x < 0) enemyBeams.splice(index, 1);
    });
}

function checkPlayerCollision() {
    const collisionMargin = 40;
    enemyBeams.forEach((beam, index) => {
        if (
            beam.x < player.x + player.width - collisionMargin &&
            beam.x + 40 > player.x + collisionMargin &&
            beam.y < player.y + player.height - collisionMargin &&
            beam.y + 50 > player.y + collisionMargin
        ) {
            player.img = "./game/shooting/img/rip.png";
            setTimeout(() => { 
                isGameOver = true; 
            }, 500); // 0.5秒後にゲームオーバー
            enemyBeams.splice(index, 1);
        }
    });
}


function updateEnemies() {
    enemies.forEach((enemy, enemyIndex) => {
        beams.forEach((beam, beamIndex) => {
            if (checkCollision(beam, enemy) && enemy.alive) {
                enemy.alive = false; // 生存フラグをfalseに
                enemy.img = "./game/shooting/img/tekiDeath01.png";
                beams.splice(beamIndex, 1); // ビームを削除
                score += 150; // スコア加算
            }
        });

        // 敵が死んだ後、一定時間経過で削除
        if (!enemy.alive && !enemy.deathHandled) {
            enemy.deathHandled = true; // 削除フラグを立てる
            setTimeout(() => {
                // IDに基づいて正確に削除
                enemies = enemies.filter((e) => e.id !== enemy.id);
            }, 600); // 1秒後に削除
        }
    });
}


function checkCollision(beam, obj) {
    return (
        beam.x < obj.x + obj.width &&
        beam.x + 40 > obj.x &&
        beam.y < obj.y + obj.height &&
        beam.y + 50 > obj.y
    );
}

function updateGameObjects() {
    // プレイヤーとエネミーの状態を更新
    enemies.forEach((enemy, enemyIndex) => {
        beams.forEach((beam, beamIndex) => {
            // エネミーとの衝突判定
            if (checkCollision(beam, enemy) && enemy.alive) {
                enemy.alive = false; // エネミー死亡
                enemy.img = "./game/shooting/img/tekiDeath01.png"; // エネミー画像変更
                beams.splice(beamIndex, 1); // ビーム削除
                score += 150; // スコア加算
            }
        });
    });

    // プレイヤーの状態を更新
    if (player.alive) {
        enemies.forEach((enemy) => {
            // プレイヤーとエネミーの衝突判定
            if (checkCollision(player, enemy) && enemy.alive) {
                player.alive = false; // プレイヤー死亡
                player.img = "./game/shooting/img/rip.png"; // プレイヤー画像変更
            }
        });
    }

    // 非生存のエネミーを削除（一定時間後）
    enemies.forEach((enemy, index) => {
        if (!enemy.alive && !enemy.deathHandled) {
            enemy.deathHandled = true; // 一度だけ処理
            setTimeout(() => {
                enemies.splice(index, 1); // エネミー削除
            }, 600); // 1秒後に削除
        }
    });
}

let attackFrequencyMultiplier = 1;

function adjustAttackFrequency() {
    // 1000点ごとに倍率を増やす
    attackFrequencyMultiplier = 1 + Math.floor(score / 500) * 10;
}

// ハイスコアを保存
function saveHighScore(score) {
    const currentHighScore = localStorage.getItem("highScore") || 0;
    if (score > currentHighScore) {
        localStorage.setItem("highScore", score);
    }
}

// ハイスコアを取得
function loadHighScore() {
    return localStorage.getItem("highScore") || 0;
}

window.onload = () => {
  // タッチ操作対応（上下）
  ["up", "down"].forEach((dir) => {
    const keyMap = {
      up: "ArrowUp",
      down: "ArrowDown",
    };
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

  // Zボタン（攻撃）
  const shootBtn = document.getElementById("shoot");
  if (shootBtn) {
    shootBtn.addEventListener("touchstart", () => {
      if (!player.shooting && !isGameOver && beams.length < 3) {
        player.shooting = true;
        beams.push({ x: player.x + player.width, y: player.y + player.height / 2 });
        player.img = "./game/shooting/img/battler02.png";
        setTimeout(() => (player.img = "./game/shooting/img/battler01.png"), 100);
        setTimeout(() => (player.shooting = false), 300);
      }
    });
  }
};

window.resetGameState = function() {
    // ゲームループ停止
    isGameOver = true;

    // キャンバスをクリア
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // 全オブジェクト初期化
    player = null;
    beams = [];
    enemies = [];
    enemyBeams = [];
    enemyID = 0;

    // 開始ボタンを元に戻す
    const btn = document.getElementById("startButton");
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
    }
};
