(() => {

  // ▼ ゲーム開始フラグ（タイトル画面用）
  let gameStarted = false;

  // ▼ キャンバス
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const TILE = 30;

  let COLS = 20;
  let ROWS = 20;

  const PLAYER_SPEED = 1.3;
  const STAGE_TIME = 50;

  const ENEMY_MIN = 1.8;
  const ENEMY_MAX = 5;
  const ENEMY_CHARGE = 1.5;

  const SCALE = 2.8;

  // ▼ キー入力
  const keys = {};
  window.addEventListener('keydown', e => keys[e.key] = true);
  window.addEventListener('keyup', e => keys[e.key] = false);

  // ▼ タイトル画像（パスは img/ に統一）
  let titleLoaded = false;
  const titleImg = new Image();
  titleImg.src = "img/start_scr.png";
  titleImg.onload = () => titleLoaded = true;

  // ▼ プレイヤー画像
  const imgPlayer1 = new Image();
  imgPlayer1.src = "img/USA01.png";

  const imgPlayer2 = new Image();
  imgPlayer2.src = "img/USA02.png";

  let playerFrame = 0;
  let playerAnimTimer = 0;

  // ▼ 壁・床タイル画像
  const wallImgs = [];
  const roadImgs = [];
  for (let i = 1; i <= 6; i++) {
    const w = new Image();
    w.src = `img/wall${i}.png`;
    wallImgs.push(w);

    const r = new Image();
    r.src = `img/road${i}.png`;
    roadImgs.push(r);
  }

  let currentWallImg = null;
  let currentRoadImg = null;

  // ▼ 宝箱
  const chestPairs = [
    { closed: "img/takara01.png", open: "img/takara01_open.png", score: 100 },
    { closed: "img/takara02.png", open: "img/takara02_open.png", score: 200 },
    { closed: "img/takara03.png", open: "img/takara03_open.png", score: 300 },
    { closed: "img/takara04.png", open: "img/takara04_open.png", score: 400 }
  ].map(pair => ({
    closed: Object.assign(new Image(), { src: pair.closed }),
    open:   Object.assign(new Image(), { src: pair.open }),
    score: pair.score
  }));

  const specialChest = {
    closed: Object.assign(new Image(), { src: "img/habakiri.png" }),
    open:   Object.assign(new Image(), { src: "img/habakiri_open.png" }),
    score: 400
  };

  let chest = null;
  let chestOpened = false;
  let chestOpenTimer = 0;

  // ▼ ゴール
  const goalImgClosed = new Image();
  goalImgClosed.src = "img/goal.png";

  const goalImgOpen = new Image();
  goalImgOpen.src = "img/goal_open.png";

  let goalOpened = false;

  // ▼ 敵
  const enemyTypes = [
    {
      normal: Object.assign(new Image(), { src: "img/teki01.png" }),
      atk:    Object.assign(new Image(), { src: "img/teki01_atk.png" }),
      beamColor: "rgba(0,150,255,0.9)",
      beamWidth: TILE * 0.3,
      beamLength: 3
    },
    {
      normal: Object.assign(new Image(), { src: "img/teki02.png" }),
      atk:    Object.assign(new Image(), { src: "img/teki02_atk.png" }),
      beamColor: "rgba(255,255,0,0.9)",
      beamWidth: TILE * 0.45,
      beamLength: 5
    },
    {
      normal: Object.assign(new Image(), { src: "img/teki03.png" }),
      atk:    Object.assign(new Image(), { src: "img/teki03_atk.png" }),
      beamColor: "rgba(180,0,255,0.9)",
      beamWidth: TILE * 0.6,
      beamLength: 5
    }
  ];

  const specialEnemyType = {
    normal: Object.assign(new Image(), { src: "img/mikaduchi.png" }),
    atk:    Object.assign(new Image(), { src: "img/mikaduchi_atk.png" }),
    beamColor: "rgba(255,0,0,0.9)",
    beamWidth: TILE,
    beamLength: 999
  };
  // ▼ ゲーム状態
  let map = [];
  let player = { x:0, y:0, r:TILE/2 - 5, speedBoost:0 };
  let startPoint = null;
  let goalPoint = null;
  let reachedStart = false;

  let score = 0;
  let highScore = Number(localStorage.getItem('maze_goal_highscore') || 0);
  let stage = 1;
  let timeLeft = STAGE_TIME;
  let gameOver = false;

  let enemies = [];
  let nextEnemy = 0;

  let floatTexts = [];

  let deathFreeze = false;
  let deathTimer = 0;

  // ▼ 特別ステージ
  let isSpecialStage = false;
  let nextSpecialScore = 3000;

  // ▼ 中央メッセージ
  let centerMessage = "";
  let centerMessageTimer = 0;

  function showCenterMessage(text, duration = 1) {
    centerMessage = text;
    centerMessageTimer = duration;
  }

  // ▼ ステージクリア演出
  let stageClearTimer = 0;
  let lastChestScore = 0;
  let lastGoalScore = 0;

  // ▼ アイテム画像
  const itemSpeedImg = new Image();
  itemSpeedImg.src = "img/item01.png";

  const itemTimeImg = new Image();
  itemTimeImg.src = "img/item02.png";

  let item = null;

  // ▼ 乱数
  function rand(a,b){ return a + Math.random()*(b-a); }
  function randi(a,b){ return Math.floor(rand(a,b+1)); }

  // ---------------------------------------------------------
  // ゲームリセット
  // ---------------------------------------------------------
  function resetGame(){
    score = 0;
    stage = 1;
    timeLeft = STAGE_TIME;
    gameOver = false;

    isSpecialStage = false;
    nextSpecialScore = 3000;

    player.x = 0;
    player.y = 0;
    player.speedBoost = 0;

    enemies = [];
    nextEnemy = rand(ENEMY_MIN, ENEMY_MAX);
    item = null;
    floatTexts = [];

    reachedStart = false;
    chestOpened = false;
    chestOpenTimer = 0;
    goalOpened = false;
    deathFreeze = false;
    deathTimer = 0;

    centerMessage = "";
    centerMessageTimer = 0;

    stageClearTimer = 0;
    lastChestScore = 0;
    lastGoalScore = 0;

    updateMapSizeForStage();
    startStage();
  }

  // ---------------------------------------------------------
  // マップサイズ調整
  // ---------------------------------------------------------
  function updateMapSizeForStage() {
    const base = 14;
    const grow = Math.floor(score / 500) * 2;
    const size = Math.min(base + grow, 40);
    COLS = size;
    ROWS = size;
  }

  // ---------------------------------------------------------
  // 迷路生成
  // ---------------------------------------------------------
  function generateMaze() {
    map = Array.from({length:ROWS},()=>Array(COLS).fill(1));

    function carve(x,y){
      map[y][x] = 0;
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-0.5);
      for(const [dx,dy] of dirs){
        const nx = x + dx*2;
        const ny = y + dy*2;
        if(nx>0 && nx<COLS-1 && ny>0 && ny<ROWS-1 && map[ny][nx]===1){
          map[y+dy][x+dx] = 0;
          carve(nx,ny);
        }
      }
    }

    carve(1,1);

    // ▼ プレイヤー初期位置
    let px,py;
    do{
      px = randi(1,COLS-2);
      py = randi(1,ROWS-2);
    }while(map[py][px]===1);

    player.x = px*TILE + TILE/2;
    player.y = py*TILE + TILE/2;

    // ▼ 宝箱
    startPoint = randomWalkable();

    // ▼ ゴール
    goalPoint = randomFarWalkable(startPoint);

    reachedStart = false;
    chestOpened = false;
    chestOpenTimer = 0;
    goalOpened = false;
  }

  function randomWalkable(){
    let x,y;
    do{
      x = randi(1,COLS-2);
      y = randi(1,ROWS-2);
    }while(map[y][x]===1);
    return {x,y};
  }

  function randomFarWalkable(from){
    const minDist = Math.floor(Math.min(COLS, ROWS) / 4);
    let cell;

    do {
      cell = randomWalkable();
      const dx = cell.x - from.x;
      const dy = cell.y - from.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist >= minDist) break;
    } while(true);

    return cell;
  }

  // ---------------------------------------------------------
  // 壁判定
  // ---------------------------------------------------------
  function isWalkable(px, py){
    const r = player.r;

    const checkPoints = [
      { x: px - r, y: py },
      { x: px + r, y: py },
      { x: px,     y: py - r },
      { x: px,     y: py + r },
      { x: px - r*0.7, y: py - r*0.7 },
      { x: px + r*0.7, y: py - r*0.7 },
      { x: px - r*0.7, y: py + r*0.7 },
      { x: px + r*0.7, y: py + r*0.7 }
    ];

    for(const p of checkPoints){
      const gx = Math.floor(p.x / TILE);
      const gy = Math.floor(p.y / TILE);

      if(gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
      if(map[gy][gx] === 1) return false;
    }

    return true;
  }
  // ---------------------------------------------------------
  // 敵生成
  // ---------------------------------------------------------
  function spawnEnemy(){
    if(enemies.length >= 3) return;

    const cell = randomWalkable();

    const enemy = {
      x: cell.x,
      y: cell.y,
      dir: {x:0,y:1},
      timer: 0,
      fired: false
    };

    if(isSpecialStage){
      Object.assign(enemy, specialEnemyType);
    }else{
      const idx = randi(0, enemyTypes.length - 1);
      Object.assign(enemy, enemyTypes[idx]);
    }

    const ex = enemy.x*TILE + TILE/2;
    const ey = enemy.y*TILE + TILE/2;

    const dx = player.x - ex;
    const dy = player.y - ey;

    if(Math.abs(dx) > Math.abs(dy)){
      enemy.dir = dx > 0 ? {x:1,y:0} : {x:-1,y:0};
    } else {
      enemy.dir = dy > 0 ? {x:0,y:1} : {x:0,y:-1};
    }

    enemies.push(enemy);
  }

  // ---------------------------------------------------------
  // 敵更新
  // ---------------------------------------------------------
  function updateEnemies(dt){
    nextEnemy -= dt;
    if(nextEnemy <= 0){
      spawnEnemy();
      nextEnemy = rand(ENEMY_MIN, ENEMY_MAX);
    }

    enemies = enemies.filter(e => {
      e.timer += dt;

      if(!e.fired && e.timer >= ENEMY_CHARGE){
        e.fired = true;
        if(checkBeamHit(e)) triggerDeath();
      }

      if(e.fired){
        if(checkBeamHit(e)) triggerDeath();
      }

      return e.timer < ENEMY_CHARGE + 0.5;
    });
  }

  // ---------------------------------------------------------
  // ビーム当たり判定
  // ---------------------------------------------------------
  function checkBeamHit(e){
    const ex = e.x;
    const ey = e.y;
    const d = e.dir;

    const beamRadius = e.beamWidth / 2;
    const pr = player.r;

    const len = e.beamLength;

    for(let i=1;i<=len;i++){
      const bx = ex + d.x*i;
      const by = ey + d.y*i;
      if(bx<0||bx>=COLS||by<0||by>=ROWS) break;

      const cx = bx*TILE + TILE/2;
      const cy = by*TILE + TILE/2;

      const dx = player.x - cx;
      const dy = player.y - cy;

      const hitDist = pr + beamRadius;

      if(dx*dx + dy*dy < hitDist * hitDist){
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------
  // 死亡処理
  // ---------------------------------------------------------
  function triggerDeath(){
    deathFreeze = true;
    deathTimer = 1.5;
  }

  function setGameOver(){
    gameOver = true;
    if(score > highScore){
      highScore = score;
      localStorage.setItem('maze_goal_highscore', highScore);
    }
  }

  // ---------------------------------------------------------
  // 浮遊テキスト
  // ---------------------------------------------------------
  function addFloat(text,x,y,color='yellow'){
    floatTexts.push({text,x,y,life:1,vy:-20,color});
  }

  function updateFloat(dt){
    floatTexts = floatTexts.filter(t=>{
      t.life -= dt;
      t.y += t.vy*dt;
      return t.life>0;
    });
  }

  // ---------------------------------------------------------
  // アイテム生成
  // ---------------------------------------------------------
  function spawnItem(){
    const cell = randomWalkable();
    const type = Math.random() < 0.5 ? "speed" : "time";
    item = { x: cell.x, y: cell.y, type };
  }

  // ---------------------------------------------------------
  // ステージ開始
  // ---------------------------------------------------------
  function startStage(){
    item = null;
    player.speedBoost = 0;

    if(score >= nextSpecialScore){
      isSpecialStage = true;
      nextSpecialScore += 3000;
    }else{
      isSpecialStage = false;
    }

    if(isSpecialStage){
      currentWallImg = wallImgs[5];
      currentRoadImg = roadImgs[5];
    }else{
      const pattern = randi(1,5);
      currentWallImg = wallImgs[pattern - 1];
      currentRoadImg = roadImgs[pattern - 1];
    }

    updateMapSizeForStage();
    generateMaze();
    timeLeft = STAGE_TIME;
    enemies = [];
    nextEnemy = rand(ENEMY_MIN,ENEMY_MAX);
    deathFreeze = false;

    if(isSpecialStage){
      chest = specialChest;
    }else{
      chest = chestPairs[randi(0, chestPairs.length - 1)];
    }

    chestOpened = false;
    chestOpenTimer = 0;
    goalOpened = false;

    spawnItem();

    showCenterMessage("宝を探せ！", 3);
  }

  // ---------------------------------------------------------
  // 更新処理
  // ---------------------------------------------------------
  function update(dt){
    if (!gameStarted) return;

    if(gameOver){
        if(keys[' ']||keys['Enter']) resetGame();
        return;
    }
    if(gameOver){
      if(keys[' ']||keys['Enter']) resetGame();
      return;
    }

    if(stageClearTimer > 0){
      stageClearTimer -= dt;
      return;
    }

    if(deathFreeze){
      deathTimer -= dt;
      if(deathTimer<=0){
        deathFreeze = false;
        setGameOver();
      }
      return;
    }

    if(centerMessageTimer > 0){
      centerMessageTimer -= dt;
      if(centerMessageTimer < 0) centerMessageTimer = 0;
    }

    if(reachedStart){
      timeLeft -= dt;
      if(timeLeft <= 0){
        triggerDeath();
      }
    }

    if(chestOpenTimer > 0){
      chestOpenTimer -= dt;
      if(chestOpenTimer < 0) chestOpenTimer = 0;
    }

    // ▼ 移動
    const speed = PLAYER_SPEED + (player.speedBoost || 0);
    let vx=0,vy=0;

    if(keys['ArrowLeft']) vx -= speed;
    if(keys['ArrowRight']) vx += speed;
    if(keys['ArrowUp']) vy -= speed;
    if(keys['ArrowDown']) vy += speed;

    const nx = player.x + vx;
    const ny = player.y + vy;

    if(isWalkable(nx,player.y)) player.x = nx;
    if(isWalkable(player.x,ny)) player.y = ny;

    // ▼ プレイヤーアニメ
    playerAnimTimer += dt;
    if(playerAnimTimer > 0.45){
      playerFrame = 1 - playerFrame;
      playerAnimTimer = 0;
    }

    // ▼ アイテム取得
    if(item){
      const ix = item.x*TILE + TILE/2;
      const iy = item.y*TILE + TILE/2;

      const dx = player.x - ix;
      const dy = player.y - iy;

      if(dx*dx + dy*dy < player.r*player.r){
        if(item.type === "speed"){
          player.speedBoost += 0.4;
          addFloat("SPEED UP!", ix, iy, "orange");
        }else{
          timeLeft += 10;
          addFloat("+10s", ix, iy, "yellow");
        }
        item = null;
      }
    }

    // ▼ 宝箱
    if(!reachedStart){
      const sx = startPoint.x*TILE + TILE/2;
      const sy = startPoint.y*TILE + TILE/2;
      const dx = player.x - sx;
      const dy = player.y - sy;

      if(dx*dx+dy*dy < player.r*player.r){
        reachedStart = true;

        score += chest.score;
        lastChestScore = chest.score;

        chestOpened = true;
        chestOpenTimer = 2;

        goalOpened = true;

        addFloat("+" + chest.score, sx, sy, "cyan");

        showCenterMessage("出口を目指せ！", 3);
      }
    }

    // ▼ ゴール
    if(goalPoint && reachedStart){
      const gx = goalPoint.x*TILE + TILE/2;
      const gy = goalPoint.y*TILE + TILE/2;
      const dx = player.x - gx;
      const dy = player.y - gy;

      if(dx*dx+dy*dy < player.r*player.r){

        lastGoalScore = 200;
        score += 200;

        addFloat("+200", gx, gy, "lime");

        stageClearTimer = 2.5;
        stage++;

        startStage();
      }
    }

    updateEnemies(dt);
    updateFloat(dt);
  }
  // ---------------------------------------------------------
  // 描画
  // ---------------------------------------------------------
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // ▼ タイトル画面（ゲーム開始前）
    if (!gameStarted) {
      if (titleLoaded) {
        ctx.drawImage(titleImg, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "black";
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      return; // ← タイトルを描いたら終了
    }

    // ▼ ゲーム画面
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.scale(SCALE, SCALE);
    ctx.translate(-player.x,-player.y);

    // ▼ マップ描画
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const tileX = x*TILE;
        const tileY = y*TILE;

        if(map[y][x] === 1){
          ctx.drawImage(currentWallImg, tileX, tileY, TILE, TILE);
        }else{
          ctx.drawImage(currentRoadImg, tileX, tileY, TILE, TILE);
        }
      }
    }

    // ▼ 宝箱
    if(!reachedStart || chestOpenTimer > 0){
      const sx = startPoint.x*TILE + TILE/2;
      const sy = startPoint.y*TILE + TILE/2;
      const imgChest = chestOpened ? chest.open : chest.closed;
      ctx.drawImage(imgChest, sx - TILE/2, sy - TILE*0.4, TILE, TILE*0.8);
    }

    // ▼ ゴール
    if(goalPoint){
      const gx = goalPoint.x*TILE + TILE/2;
      const gy = goalPoint.y*TILE + TILE/2;
      const imgG = goalOpened ? goalImgOpen : goalImgClosed;
      ctx.drawImage(imgG, gx - TILE/2, gy - TILE/2, TILE, TILE);
    }

    // ▼ アイテム
    if(item){
      const ix = item.x*TILE + TILE/2;
      const iy = item.y*TILE + TILE/2;
      const img = item.type === "speed" ? itemSpeedImg : itemTimeImg;
      ctx.drawImage(img, ix - TILE/2, iy - TILE/2, TILE, TILE);
    }

    // ▼ 敵
    for(const e of enemies){
      const ex = e.x*TILE + TILE/2;
      const ey = e.y*TILE + TILE/2;

      const imgE = e.fired ? e.atk : e.normal;
      ctx.drawImage(imgE, ex - TILE/2, ey - TILE/2, TILE, TILE);

      if(!e.fired){
        const t = Math.min(e.timer / ENEMY_CHARGE, 1);
        ctx.strokeStyle = `rgba(255,0,0,${0.3 + 0.7*t})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ex, ey, TILE/2 + 5*t, 0, Math.PI*2);
        ctx.stroke();
      }else{
        ctx.strokeStyle = e.beamColor;
        ctx.lineWidth = e.beamWidth;
        ctx.lineCap = "round";

        const d = e.dir;
        const len = e.beamLength;

        ctx.beginPath();
        ctx.moveTo(ex + d.x*TILE, ey + d.y*TILE);
        ctx.lineTo(ex + d.x*TILE*len, ey + d.y*TILE*len);
        ctx.stroke();
      }
    }

    // ▼ プレイヤー
    const imgP = playerFrame === 0 ? imgPlayer1 : imgPlayer2;
    ctx.drawImage(imgP, player.x - TILE/2, player.y - TILE/2, TILE, TILE);

    // ▼ 浮遊テキスト
    for(const t of floatTexts){
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.font = "20px sans-serif";
      ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // ▼ UI（タイマー）
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "red";
    ctx.strokeText(`${timeLeft.toFixed(1)}s`, canvas.width/2, 50);
    ctx.fillText(`${timeLeft.toFixed(1)}s`, canvas.width/2, 50);

    // ▼ スコア
    ctx.textAlign = "left";
    ctx.font = "bold 30px sans-serif";
    ctx.fillStyle = "#9cf114";
    ctx.fillText(`SCORE: ${score}`,10,660);
    ctx.fillText(`HI: ${highScore}`,10,685);

    // ▼ 中央メッセージ
    if(centerMessageTimer > 0){
      ctx.save();
      ctx.globalAlpha = Math.min(centerMessageTimer, 1);
      ctx.fillStyle = "red";
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(centerMessage, canvas.width/2, canvas.height/2 - 100);
      ctx.restore();
    }

    // ▼ ステージクリア演出
    if(stageClearTimer > 0){
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0,0,canvas.width,canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "white";

      ctx.font = "bold 48px sans-serif";
      ctx.fillText(`STAGE ${stage-1} クリア！`, canvas.width/2, canvas.height/2 - 80);

      ctx.font = "28px sans-serif";
      ctx.fillText(`宝： +${lastChestScore}`, canvas.width/2, canvas.height/2 - 20);
      ctx.fillText(`脱出： +${lastGoalScore}`, canvas.width/2, canvas.height/2 + 20);

      ctx.font = "bold 32px sans-serif";
      ctx.fillText(`合計： +${lastChestScore + lastGoalScore}`, canvas.width/2, canvas.height/2 + 80);

      ctx.restore();
    }

    // ▼ GAME OVER
    if(gameOver){
      ctx.fillStyle="rgba(0,0,0,0.7)";
      ctx.fillRect(0,0,canvas.width,canvas.height);

      ctx.textAlign="center";
      ctx.font="bold 60px sans-serif";
      ctx.fillStyle="red";
      ctx.fillText("GAME OVER",canvas.width/2,canvas.height/2-40);

      ctx.font="24px sans-serif";
      ctx.fillStyle="#555";
      ctx.fillText(`SCORE: ${score}`,canvas.width/2,canvas.height/2+10);
      ctx.fillText(`HIGH SCORE: ${highScore}`,canvas.width/2,canvas.height/2+40);
      ctx.fillText("スペース or Enter で再スタート",canvas.width/2,canvas.height/2+80);
    }
  }

  // ---------------------------------------------------------
  // ループ
  // ---------------------------------------------------------
  let last=0;
  function loop(t){
    const dt = (t-last)/1000;
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------
  // START ボタン
  // ---------------------------------------------------------
function startGame(){
    // ▼ ゲームオーバー後の再スタート対応
    if (gameOver) {
        resetGame();
        gameOver = false;
    }

    if (gameStarted) return;

    gameStarted = true;
    startStage();
}


  document.getElementById("startButton").addEventListener("click", startGame);
  canvas.addEventListener("click", () => {
    if (!gameStarted) startGame();
  });

  // ---------------------------------------------------------
  // D-Pad（上下左右）
  // ---------------------------------------------------------
  function bindPad(id, key){
    const btn = document.getElementById(id);
    if(!btn) return;

    btn.addEventListener("mousedown", () => keys[key] = true);
    btn.addEventListener("mouseup",   () => keys[key] = false);

    btn.addEventListener("touchstart", e => {
      e.preventDefault();
      keys[key] = true;
    });
    btn.addEventListener("touchend", e => {
      e.preventDefault();
      keys[key] = false;
    });
  }

  bindPad("btn-up", "ArrowUp");
  bindPad("btn-down", "ArrowDown");
  bindPad("btn-left", "ArrowLeft");
  bindPad("btn-right", "ArrowRight");

  // ---------------------------------------------------------
  // ★ タイトルを表示するために、最初からループだけ回す
  // ---------------------------------------------------------
  requestAnimationFrame(loop);

})();
