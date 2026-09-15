/* ============================================================
   パレットバトラーズ将棋（cell.png × 81 対応版）
   完全スマホ対応・スワイプ対応・AI・戦績・成り
   ＋ 相手駒プレビュー（押している間だけハイライト）
============================================================ */

/* ------------------------------
   定数・グローバル
------------------------------ */
const BOARD_SIZE = 9;
const SENTE = 0;
const GOTE  = 1;

const PIECE_P = 0;
const PIECE_L = 1;
const PIECE_N = 2;
const PIECE_S = 3;
const PIECE_G = 4;
const PIECE_R = 5;
const PIECE_B = 6;
const PIECE_K = 7;

let board = [];
let turn = SENTE;
let inGame = false;
let colorId = 0;
let goteColorId = 0;
let level = 1;

let selected = null;
let legalMoves = [];
let pendingPromotion = null;

let dragging = false;
let dragPiece = null;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

let positionHistory = [];

/* ★ 相手駒プレビュー用フラグ */
let previewingOpponent = false;

let lastMoveFrom = null;
let lastMoveTo = null;

/* ============================================================
   座標取得（スマホ完全対応）
============================================================ */
function getPos(e){
  if(e.touches && e.touches.length > 0){
    return { x:e.touches[0].clientX, y:e.touches[0].clientY };
  }
  if(e.changedTouches && e.changedTouches.length > 0){
    return { x:e.changedTouches[0].clientX, y:e.changedTouches[0].clientY };
  }
  return { x:e.clientX, y:e.clientY };
}

/* ============================================================
   盤面生成
============================================================ */
function createEmptyBoard(){
  const b=[];
  for(let y=0;y<9;y++){
    const row=[];
    for(let x=0;x<9;x++) row.push(null);
    b.push(row);
  }
  return b;
}

/* ============================================================
   初期配置
============================================================ */
function initialSetup(){
  board = createEmptyBoard();

  // 先手
  board[8][4]={owner:SENTE,color:colorId,type:PIECE_K,promoted:0};
  board[8][3]={owner:SENTE,color:colorId,type:PIECE_G,promoted:0};
  board[8][5]={owner:SENTE,color:colorId,type:PIECE_G,promoted:0};
  board[8][2]={owner:SENTE,color:colorId,type:PIECE_S,promoted:0};
  board[8][6]={owner:SENTE,color:colorId,type:PIECE_S,promoted:0};
  board[8][1]={owner:SENTE,color:colorId,type:PIECE_N,promoted:0};
  board[8][7]={owner:SENTE,color:colorId,type:PIECE_N,promoted:0};
  board[8][0]={owner:SENTE,color:colorId,type:PIECE_L,promoted:0};
  board[8][8]={owner:SENTE,color:colorId,type:PIECE_L,promoted:0};
  board[7][1]={owner:SENTE,color:colorId,type:PIECE_B,promoted:0};
  board[7][7]={owner:SENTE,color:colorId,type:PIECE_R,promoted:0};
  for(let x=0;x<9;x++) board[6][x]={owner:SENTE,color:colorId,type:PIECE_P,promoted:0};

  // 後手
  board[0][4]={owner:GOTE,color:goteColorId,type:PIECE_K,promoted:0};
  board[0][3]={owner:GOTE,color:goteColorId,type:PIECE_G,promoted:0};
  board[0][5]={owner:GOTE,color:goteColorId,type:PIECE_G,promoted:0};
  board[0][2]={owner:GOTE,color:goteColorId,type:PIECE_S,promoted:0};
  board[0][6]={owner:GOTE,color:goteColorId,type:PIECE_S,promoted:0};
  board[0][1]={owner:GOTE,color:goteColorId,type:PIECE_N,promoted:0};
  board[0][7]={owner:GOTE,color:goteColorId,type:PIECE_N,promoted:0};
  board[0][0]={owner:GOTE,color:goteColorId,type:PIECE_L,promoted:0};
  board[0][8]={owner:GOTE,color:goteColorId,type:PIECE_L,promoted:0};
  board[1][7]={owner:GOTE,color:goteColorId,type:PIECE_B,promoted:0};
  board[1][1]={owner:GOTE,color:goteColorId,type:PIECE_R,promoted:0};
  for(let x=0;x<9;x++) board[2][x]={owner:GOTE,color:goteColorId,type:PIECE_P,promoted:0};

  turn = SENTE;
}

/* ============================================================
   駒画像パス
============================================================ */
function pieceImagePath(p){
  const code = `${p.owner}${p.color}${p.type}${p.promoted}`;
  return `/zero/game/shogi/img/${code}.png`;
}

/* ============================================================
   盤面描画（cell.png × 81 対応）
============================================================ */
function renderBoard(){
  const grid = document.getElementById("boardGrid");
  const pieceLayer = document.getElementById("pieceLayer");

  grid.innerHTML = "";
  pieceLayer.innerHTML = "";

  // 81マスに cell.png を敷く
  for(let i=0;i<81;i++){
    const img=document.createElement("img");
    img.src="/zero/game/shogi/img/cell.png";
    img.className="cellImg";
    grid.appendChild(img);
  }

  // 駒レイヤー
  for(let y=0;y<9;y++){
    for(let x=0;x<9;x++){
      const cell=document.createElement("div");
      cell.dataset.x=x;
      cell.dataset.y=y;

      const p=board[y][x];
      if(p){
        const img=document.createElement("img");
        img.src=pieceImagePath(p);
        img.className="pieceImg";
        img.dataset.x=x;
        img.dataset.y=y;
        if(p.owner===GOTE) img.style.transform="rotate(180deg)";
        cell.appendChild(img);
        // ★ 追加：駒ラベル
        const label = document.createElement("div");
        label.className = "pieceLabel " + (p.owner === SENTE ? "down" : "up");
        label.textContent = getPieceLabel(p);
        cell.appendChild(label);
      }

      pieceLayer.appendChild(cell);
    }
  }

    // ★ 最後に動いた駒をハイライト
  if(lastMoveTo){
    const index = lastMoveTo.y * 9 + lastMoveTo.x;
    const grid = document.getElementById("boardGrid");
    const cell = grid.children[index];
    cell.style.background = "rgba(255, 0, 0, 0.35)"; // 赤系ハイライト
  }

}
function getPieceLabel(p){
  if(!p) return "";

  // 成り駒
  if(p.promoted){
    switch(p.type){
      case 0: return "と"; // 歩
      case 1: return "杏"; // 香
      case 2: return "圭"; // 桂
      case 3: return "全"; // 銀
      case 5: return "龍"; // 飛
      case 6: return "馬"; // 角
    }
  }

  // 通常駒
  switch(p.type){
    case 0: return "歩";
    case 1: return "香";
    case 2: return "桂";
    case 3: return "銀";
    case 4: return "金";
    case 5: return "飛";
    case 6: return "角";
    case 7: return "王";
  }

  return "";
}

/* ============================================================
   合法手生成（省略なし完全版）
============================================================ */
function isInside(x,y){return x>=0&&x<9&&y>=0&&y<9;}
function enemyOf(o){return o===SENTE?GOTE:SENTE;}
function inEnemyCamp(o,y){return o===SENTE?y<=2:y>=6;}
function lastRank(o,y){return o===SENTE?y===0:y===8;}
function secondLastRank(o,y){return o===SENTE?y===1:y===7;}

function generateMovesForPiece(x,y){
  const p=board[y][x];
  if(!p) return [];

  const dir = p.owner===SENTE ? -1 : 1;
  const moves=[];

  function addStep(dx,dy){
    const nx=x+dx, ny=y+dy;
    if(!isInside(nx,ny))return;
    const t=board[ny][nx];
    if(!t || t.owner!==p.owner) moves.push({x:nx,y:ny});
  }
  function addSlide(dx,dy){
    let nx=x+dx, ny=y+dy;
    while(isInside(nx,ny)){
      const t=board[ny][nx];
      if(!t) moves.push({x:nx,y:ny});
      else{
        if(t.owner!==p.owner) moves.push({x:nx,y:ny});
        break;
      }
      nx+=dx; ny+=dy;
    }
  }

  const promoted = p.promoted===1;

  if(p.type===PIECE_P && !promoted){
    addStep(0,dir);
  }else if(p.type===PIECE_L && !promoted){
    addSlide(0,dir);
  }else if(p.type===PIECE_N && !promoted){
    addStep(-1,2*dir); addStep(1,2*dir);
  }else if(p.type===PIECE_S && !promoted){
    addStep(0,dir); addStep(-1,dir); addStep(1,dir);
    addStep(-1,-dir); addStep(1,-dir);
  }else if(p.type===PIECE_G || (promoted && [PIECE_P,PIECE_L,PIECE_N,PIECE_S].includes(p.type))){
    addStep(0,dir); addStep(-1,dir); addStep(1,dir);
    addStep(-1,0); addStep(1,0); addStep(0,-dir);
  }else if(p.type===PIECE_K){
    addStep(0,1); addStep(0,-1); addStep(1,0); addStep(-1,0);
    addStep(1,1); addStep(1,-1); addStep(-1,1); addStep(-1,-1);
  }else if(p.type===PIECE_B){
    addSlide(1,1); addSlide(1,-1); addSlide(-1,1); addSlide(-1,-1);
    if(promoted){
      addStep(0,1); addStep(0,-1); addStep(1,0); addStep(-1,0);
    }
  }else if(p.type===PIECE_R){
    addSlide(1,0); addSlide(-1,0); addSlide(0,1); addSlide(0,-1);
    if(promoted){
      addStep(1,1); addStep(1,-1); addStep(-1,1); addStep(-1,-1);
    }
  }

  const result=[];
  for(const m of moves){
    const canPromote =
      !promoted &&
      [PIECE_P,PIECE_L,PIECE_N,PIECE_S,PIECE_B,PIECE_R].includes(p.type) &&
      (inEnemyCamp(p.owner,y) || inEnemyCamp(p.owner,m.y));

    let forced=false;
    if(!promoted && p.type===PIECE_P && lastRank(p.owner,m.y)) forced=true;
    if(!promoted && p.type===PIECE_L && lastRank(p.owner,m.y)) forced=true;
    if(!promoted && p.type===PIECE_N && (lastRank(p.owner,m.y)||secondLastRank(p.owner,m.y))) forced=true;

    result.push({
      x:m.x,y:m.y,
      canPromote,
      promoteForced:forced
    });
  }
  return result;
}

/* ============================================================
   ハイライト（引数対応版）
============================================================ */
function highlightLegalMoves(moves){
  const layer = document.getElementById("highlightLayer");
  layer.innerHTML = "";

  // 81マス分の透明セル
  for(let i=0;i<81;i++){
    const div = document.createElement("div");
    layer.appendChild(div);
  }

  // moves に色をつける
  for(const m of moves){
    const index = m.y * 9 + m.x;
    layer.children[index].style.background = "rgba(255,255,0,0.35)";
  }
}

/* ハイライト消去 */
function clearHighlight(){
  const layer = document.getElementById("highlightLayer");
  if(layer) layer.innerHTML = "";
}

/* ============================================================
   成りウィンドウ
============================================================ */
function showPromoteWindow(){
  document.getElementById("promoteOverlay").style.display="flex";
}
function hidePromoteWindow(){
  document.getElementById("promoteOverlay").style.display="none";
}

/* ============================================================
   移動適用
============================================================ */
function applyMoveInternal(fromX,fromY,toX,toY,promote){
  const p=board[fromY][fromX];
  board[fromY][fromX]=null;
  board[toY][toX]={
    owner:p.owner,
    color:p.color,
    type:p.type,
    promoted: promote?1:p.promoted
  };

  lastMoveFrom = {x: fromX, y: fromY};
  lastMoveTo   = {x: toX,   y: toY};

  selected=null;
  legalMoves=[];
  pendingPromotion=null;

  renderBoard();

  clearHighlight();
}

/* ============================================================
   ▼ クリック（タップ）
============================================================ */
document.getElementById("pieceLayer").addEventListener("click", e => {
  if(!inGame)return;
  if(pendingPromotion)return;
  if(dragging)return;

  const cell=e.target.closest("div");
  if(!cell)return;

  const x=parseInt(cell.dataset.x,10);
  const y=parseInt(cell.dataset.y,10);
  const p=board[y][x];

  if(selected && selected.x===x && selected.y===y){
    selected=null;
    legalMoves=[];
    clearHighlight();
    return;
  }

  if(p && p.owner===SENTE){
    selected={x,y};
    legalMoves=generateMovesForPiece(x,y);
    highlightLegalMoves(legalMoves);
    return;
  }

  if(selected){
    const move=legalMoves.find(m=>m.x===x&&m.y===y);
    if(!move){
      selected=null;
      legalMoves=[];
      clearHighlight();
      return;
    }

    if(move.promoteForced){
      applyMoveInternal(selected.x,selected.y,x,y,true);
      afterPlayerMove();
      return;
    }

    if(move.canPromote){
      pendingPromotion={
        fromX:selected.x,fromY:selected.y,
        toX:x,toY:y,
        forced:false
      };
      showPromoteWindow();
      return;
    }

    applyMoveInternal(selected.x,selected.y,x,y,false);
    afterPlayerMove();
  }
});
/* ============================================================
   ▼ ドラッグ開始（相手駒プレビュー統合版）
============================================================ */
function startDrag(e){
  if(!inGame)return;
  if(pendingPromotion)return;

  const img=e.target.closest("img");
  if(!img)return;

  const x=parseInt(img.dataset.x,10);
  const y=parseInt(img.dataset.y,10);
  const p=board[y][x];
  if(!p) return;

  /* ★ 相手の駒：押している間だけハイライト（ドラッグしない） */
  if(p.owner !== turn){
    selected = null;
    legalMoves = generateMovesForPiece(x, y);
    previewingOpponent = true;
    highlightLegalMoves(legalMoves);
    return;
  }

  /* ★ 自分の駒：通常のドラッグ開始 */
  selected={x,y};
  legalMoves=generateMovesForPiece(x,y);
  highlightLegalMoves(legalMoves);

  dragging=true;
  dragPiece=img;
  dragOriginX=x;
  dragOriginY=y;

  const pos=getPos(e);
  dragStartX=pos.x;
  dragStartY=pos.y;

  img.style.position="absolute";
  img.style.zIndex="50";
  img.style.pointerEvents="none";
}

document.getElementById("pieceLayer").addEventListener("mousedown", startDrag);
document.getElementById("pieceLayer").addEventListener("touchstart", e=>{
  e.preventDefault();
  startDrag(e);
});

/* ============================================================
   ▼ ドラッグ中
============================================================ */
function moveDrag(e){
  if(!dragging || !dragPiece)return;

  const pos=getPos(e);
  const dx=pos.x-dragStartX;
  const dy=pos.y-dragStartY;

  const baseRotate = dragPiece.style.transform.includes("180deg") ? "rotate(180deg)" : "";
  dragPiece.style.transform=`translate(${dx}px,${dy}px) ${baseRotate}`;
}

document.addEventListener("mousemove", moveDrag);
document.addEventListener("touchmove", e=>{
  e.preventDefault();
  moveDrag(e);
});

/* ============================================================
   ▼ 相手駒プレビュー解除
============================================================ */
function endPreview(){
  if(!previewingOpponent) return;
  previewingOpponent = false;
  legalMoves = [];
  clearHighlight();
}

/* ============================================================
   ▼ ドロップ
============================================================ */
function endDrag(e){
  if(!dragging || !dragPiece)return;

  dragging=false;

  const pos=getPos(e);
  const rect=document.getElementById("boardArea").getBoundingClientRect();
  const cellW=rect.width/9;
  const cellH=rect.height/9;

  const dropX=Math.floor((pos.x-rect.left)/cellW);
  const dropY=Math.floor((pos.y-rect.top)/cellH);

  dragPiece.style.position="";
  dragPiece.style.zIndex="";
  dragPiece.style.pointerEvents="";
  dragPiece.style.transform="";

  const move=legalMoves.find(m=>m.x===dropX&&m.y===dropY);

  if(!move){
    selected=null;
    legalMoves=[];
    renderBoard();
    dragPiece=null;
    return;
  }

  if(move.promoteForced){
    applyMoveInternal(dragOriginX,dragOriginY,dropX,dropY,true);
    dragPiece=null;
    afterPlayerMove();
    return;
  }

  if(move.canPromote){
    pendingPromotion={
      fromX:dragOriginX,fromY:dragOriginY,
      toX:dropX,toY:dropY,
      forced:false
    };
    dragPiece=null;
    showPromoteWindow();
    return;
  }

  applyMoveInternal(dragOriginX,dragOriginY,dropX,dropY,false);
  dragPiece=null;
  afterPlayerMove();
}

/* ============================================================
   ▼ mouseup / touchend（プレビュー解除 → ドラッグ終了）
============================================================ */
document.addEventListener("mouseup", e=>{
  endPreview();
  endDrag(e);
});
document.addEventListener("touchend", e=>{
  endPreview();
  endDrag(e);
});

/* ============================================================
   成り YES / NO
============================================================ */
document.getElementById("promoteYesBtn").onclick=()=>{
  if(!pendingPromotion)return;
  const m=pendingPromotion;
  hidePromoteWindow();
  applyMoveInternal(m.fromX,m.fromY,m.toX,m.toY,true);
  afterPlayerMove();
};
document.getElementById("promoteNoBtn").onclick=()=>{
  if(!pendingPromotion)return;
  const m=pendingPromotion;
  hidePromoteWindow();
  applyMoveInternal(m.fromX,m.fromY,m.toX,m.toY,false);
  afterPlayerMove();
};
/* ============================================================
   王手・千日手・戦績・AI（省略なし完全版）
============================================================ */

function generateAllMoves(owner){
  const moves=[];
  for(let y=0;y<9;y++){
    for(let x=0;x<9;x++){
      const p=board[y][x];
      if(!p || p.owner!==owner) continue;
      const ms=generateMovesForPiece(x,y);
      for(const m of ms){
        moves.push({
          fromX:x,fromY:y,
          toX:m.x,toY:m.y,
          canPromote:m.canPromote,
          promoteForced:m.promoteForced
        });
      }
    }
  }
  return moves;
}

/* ============================================================
   王の位置
============================================================ */
function findKing(owner){
  for(let y=0;y<9;y++){
    for(let x=0;x<9;x++){
      const p=board[y][x];
      if(p && p.owner===owner && p.type===PIECE_K){
        return {x,y};
      }
    }
  }
  return null;
}

/* ============================================================
   王手判定
============================================================ */
function isCheck(owner){
  const king=findKing(owner);
  if(!king) return false;
  const enemy=enemyOf(owner);
  const moves=generateAllMoves(enemy);
  return moves.some(m=>m.toX===king.x && m.toY===king.y);
}

function showCheck(){
  const el=document.getElementById("checkOverlay");
  el.style.display="flex";
  setTimeout(()=>{ el.style.display="none"; }, 800);
}

/* ============================================================
   千日手
============================================================ */
function recordPosition(){
  const key=JSON.stringify({board,turn});
  positionHistory.push(key);
  const count=positionHistory.filter(k=>k===key).length;
  return count>=4;
}

/* ============================================================
   戦績保存・読み込み
============================================================ */
function saveStats(){
  localStorage.setItem("shogiWins",document.getElementById("wins").textContent);
  localStorage.setItem("shogiLosses",document.getElementById("losses").textContent);
  localStorage.setItem("shogiDraws",document.getElementById("draws").textContent);
  localStorage.setItem("shogiRank",document.getElementById("rank").textContent);
}

function loadStats(){
  const w=localStorage.getItem("shogiWins");
  const l=localStorage.getItem("shogiLosses");
  const d=localStorage.getItem("shogiDraws");
  const r=localStorage.getItem("shogiRank");

  if(w!==null) document.getElementById("wins").textContent=w;
  if(l!==null) document.getElementById("losses").textContent=l;
  if(d!==null) document.getElementById("draws").textContent=d;
  if(r!==null) document.getElementById("rank").textContent=r;
}

/* ============================================================
   カラー解禁
============================================================ */
function updateColorSelect(){
  const rank = parseInt(document.getElementById("rank").textContent, 10);
  const sel = document.getElementById("colorSelect");

  sel.innerHTML = "";

  const names = ["ノーマル", "黄色", "緑色", "青色", "赤色", "深淵"];
  const unlockRank = [0, 1, 4, 7, 10, 11];

  for(let id = 0; id <= 5; id++){
    if(rank >= unlockRank[id]){
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = names[id];
      sel.appendChild(opt);
    }
  }

  if(!sel.querySelector(`option[value="${sel.value}"]`)){
    sel.value = "0";
  }
}

/* ============================================================
   レベル解禁
============================================================ */
function updateLevelSelect(){
  const rank = parseInt(document.getElementById("rank").textContent, 10);
  const sel = document.getElementById("levelSelect");

  sel.innerHTML = "";

  const names = [
    "初段", "二段", "三段", "四段", "五段",
    "六段", "七段", "八段", "九段", "十段", "深淵"
  ];

  // ★ 勝つたびに次の段が解禁される
  const max = Math.min(rank + 1, 11);

  for(let lv = 1; lv <= max; lv++){
    const opt = document.createElement("option");
    opt.value = lv;
    opt.textContent = names[lv - 1];
    sel.appendChild(opt);
  }

  sel.value = max.toString();
}


/* ============================================================
   結果表示
============================================================ */
function showResult(text){
  document.getElementById("resultText").textContent=text;
  const rank=document.getElementById("rank").textContent;
  document.getElementById("resultRank").textContent=`現在の段位：${rank} 段`;
  document.getElementById("resultOverlay").style.display="flex";
}

document.getElementById("resultCloseBtn").onclick=()=>{
  document.getElementById("resultOverlay").style.display="none";
};

/* ============================================================
   王が生きているか
============================================================ */
function checkKingAlive(owner){
  return !!findKing(owner);
}

/* ============================================================
   勝ち処理
============================================================ */
function endGameAsWin(){
  // 勝ち数 +1
  document.getElementById("wins").textContent =
    parseInt(document.getElementById("wins").textContent,10) + 1;

  // 現在の rank（解禁済み段数）
  let rank = parseInt(document.getElementById("rank").textContent, 10);

  // 今回勝った相手の段（startGame() でセットされている level）
  const enemyLevel = level;

  // 現在選べる最大段（levelSelect の最後の option）
  const levelSelect = document.getElementById("levelSelect");
  const maxSelectable = parseInt(levelSelect.lastElementChild.value, 10);

  // ★ 一番上の段に勝ったときだけ rank++
  if(enemyLevel === maxSelectable){
    rank++;
    document.getElementById("rank").textContent = rank;
  }

  saveStats();
  updateColorSelect();
  updateLevelSelect();

  inGame = false;
  document.getElementById("messageBar").textContent = "あなたの勝ち！";
}


/* ============================================================
   プレイヤー手番後処理
============================================================ */
function afterPlayerMove(){
  if(!checkKingAlive(GOTE)){
    endGameAsWin();
    
    showResult("あなたの勝ち！（王を取りました）");
    unlockUI();
    return;
  }

  if(recordPosition()){
    document.getElementById("draws").textContent =
      parseInt(document.getElementById("draws").textContent,10)+1;
    saveStats();
    inGame=false;
    showResult("千日手");
    unlockUI();
    return;
  }

  if(isCheck(GOTE)){
    showCheck();
  }

  const gMoves=generateAllMoves(GOTE);
  if(gMoves.length===0){
    if(isCheck(GOTE)){
      endGameAsWin();
      showResult("あなたの勝ち！（詰み）");
    }else{
      document.getElementById("draws").textContent =
        parseInt(document.getElementById("draws").textContent,10)+1;
      saveStats();
      showResult("持将棋（後手に合法手なし）");
    }
    inGame=false;
    unlockUI();
    return;
  }

  const opp=document.getElementById("opponentSelect").value;

  if(turn===SENTE){
    turn=GOTE;

    if(opp==="ai"){
      document.getElementById("turnInfo").textContent="手番：AI";
      document.getElementById("messageBar").textContent="AI 思考中…";
      setTimeout(()=>aiMove(),300);
    }else{
      document.getElementById("turnInfo").textContent="手番：後手（人間）";
      document.getElementById("messageBar").textContent="後手の手番です。";
    }

  }else{
    turn=SENTE;
    document.getElementById("turnInfo").textContent="手番：あなた";
    document.getElementById("messageBar").textContent="あなたの手番です。";
  }
}
/* ============================================================
   AI 評価関数
============================================================ */
const PIECE_VALUE = {
  0: 1,    // 歩
  1: 3,    // 香
  2: 3,    // 桂
  3: 5,    // 銀
  4: 6,    // 金
  5: 9,    // 飛
  6: 8,    // 角
  7: 1000  // 玉
};

function evaluateBoard(owner){
  let score = 0;
  for(let y = 0; y < 9; y++){
    for(let x = 0; x < 9; x++){
      const p = board[y][x];
      if(!p) continue;

      let v = PIECE_VALUE[p.type];
      if(p.promoted) v += 1;

      score += (p.owner === owner ? v : -v);
    }
  }
  return score;
}

/* ============================================================
   差分適用 make / undo
============================================================ */
function makeMove(move){
  const p = board[move.fromY][move.fromX];
  const captured = board[move.toY][move.toX];

  const newPiece = {
    owner: p.owner,
    color: p.color,
    type: p.type,
    promoted: (move.promoteForced || move.canPromote) ? 1 : p.promoted
  };

  board[move.toY][move.toX] = newPiece;
  board[move.fromY][move.fromX] = null;

  return { captured, original: p };
}

function undoMove(move, state){
  board[move.fromY][move.fromX] = state.original;
  board[move.toY][move.toX] = state.captured;
}

/* ============================================================
   思考時間制限付き αβミニマックス（negamax）
============================================================ */
let aiStartTime = 0;
let aiTimeLimit = 0; // ms
let aiAbort = false;

function minimax(owner, depth, alpha, beta){
  // すでに中断フラグが立っていたら即終了
  if(aiAbort) return 0;

  // 時間切れなら中断フラグを立てて即終了
  if(performance.now() - aiStartTime > aiTimeLimit){
    aiAbort = true;
    return 0;
  }

  if(depth <= 0){
    return evaluateBoard(owner);
  }

  const moves = generateAllMoves(owner);
  if(moves.length === 0){
    return -99999;
  }

  let best = -99999;

  for(const m of moves){
    if(aiAbort) break;

    const state = makeMove(m);
    const score = -minimax(enemyOf(owner), depth - 1, -beta, -alpha);
    undoMove(m, state);

    if(score > best) best = score;
    if(best > alpha) alpha = best;
    if(alpha >= beta) break; // 枝刈り
  }

  return best;
}

/* ============================================================
   王手回避手フィルタ（差分版）
============================================================ */
function filterMovesToEscapeCheck(owner, moves){
  const safe = [];
  for(const m of moves){
    const state = makeMove(m);
    if(!isCheck(owner)) safe.push(m);
    undoMove(m, state);
    if(aiAbort) break;
  }
  return safe;
}

/* ============================================================
   色IDごとの depth と 段位ごとの思考時間
============================================================ */
function getDepthByColorId(colorId){
  // 0:初段, 1:二〜三段, 2:四〜六段, 3:七〜九段, 4:十段, 5:深淵
  if(colorId === 0) return 1; // ノーマル
  if(colorId === 1) return 2; // 黄
  if(colorId === 2) return 3; // 緑
  return 4;                   // 青・赤・深淵は最大深さ4
}

function getThinkTimeByLevel(lv){
  // 段位ごとの思考時間（ms）—ここは好みであとで調整してOK
  if(lv <= 1) return 40;    // 初段
  if(lv === 2) return 70;   // 二段
  if(lv === 3) return 100;  // 三段
  if(lv === 4) return 140;  // 四段
  if(lv === 5) return 180;  // 五段
  if(lv === 6) return 220;  // 六段
  if(lv === 7) return 260;  // 七段
  if(lv === 8) return 300;  // 八段
  if(lv === 9) return 340;  // 九段
  if(lv === 10) return 380; // 十段
  return 420;               // 深淵
}

/* ============================================================
   AI の指し手（色でdepth固定＋段位で思考時間UP）
============================================================ */
function aiMove(){
  if(!inGame) return;

  // 現在の敵段位（level）と色IDから設定
  const lv = level; // startGame() でセットされている前提
  const depthMax = getDepthByColorId(goteColorId);
  const thinkMs = getThinkTimeByLevel(lv);

  aiAbort = false;
  aiStartTime = performance.now();
  aiTimeLimit = thinkMs;

  let moves = generateAllMoves(GOTE);

  if(isCheck(GOTE)){
    moves = filterMovesToEscapeCheck(GOTE, moves);
  }

  if(moves.length === 0){
    endGameAsWin();
    showResult("あなたの勝ち！（AIに合法手なし）");
    unlockUI();
    return;
  }

  let bestScore = -99999;
  let bestMoves = [];

  for(const m of moves){
    if(aiAbort) break;

    const state = makeMove(m);
    const score = -minimax(SENTE, depthMax - 1, -99999, 99999);
    undoMove(m, state);

    if(score > bestScore){
      bestScore = score;
      bestMoves = [m];
    }else if(score === bestScore){
      bestMoves.push(m);
    }

    if(aiAbort) break;
    if(performance.now() - aiStartTime > aiTimeLimit){
      aiAbort = true;
      break;
    }
  }

  // もし時間切れで bestMoves が空なら、とりあえず最初の手を指す保険
  let move;
  if(bestMoves.length > 0){
    move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }else{
    move = moves[0];
  }

  applyMoveInternal(
    move.fromX,
    move.fromY,
    move.toX,
    move.toY,
    (move.promoteForced || move.canPromote)
  );

  // ここから先は元のロジックそのまま
  if(!checkKingAlive(SENTE)){
    document.getElementById("losses").textContent =
      parseInt(document.getElementById("losses").textContent,10)+1;
    saveStats();
    inGame = false;
    showResult("あなたの負け（王を取られました）");
    unlockUI();
    return;
  }

  if(recordPosition()){
    document.getElementById("draws").textContent =
      parseInt(document.getElementById("draws").textContent,10)+1;
    saveStats();
    inGame = false;
    showResult("千日手");
    unlockUI();
    return;
  }

  if(isCheck(SENTE)){
    showCheck();
  }

  const sMoves = generateAllMoves(SENTE);
  if(sMoves.length === 0){
    if(isCheck(SENTE)){
      document.getElementById("losses").textContent =
        parseInt(document.getElementById("losses").textContent,10)+1;
      saveStats();
      showResult("あなたの負け（詰み）");
    }else{
      document.getElementById("draws").textContent =
        parseInt(document.getElementById("draws").textContent,10)+1;
      saveStats();
      showResult("持将棋（先手に合法手なし）");
    }
    inGame = false;
    unlockUI();
    return;
  }

  turn = SENTE;
  document.getElementById("turnInfo").textContent = "手番：あなた";
  document.getElementById("messageBar").textContent = "あなたの手番です。";
}

/* ============================================================
   UIロック
============================================================ */
function lockUI(){
  document.getElementById("levelSelect").disabled=true;
  document.getElementById("colorSelect").disabled=true;
  document.getElementById("opponentSelect").disabled=true;
  document.getElementById("startBtn").classList.add("btn-disabled");
  document.getElementById("endBtn").classList.remove("btn-disabled");
}

function unlockUI(){
  document.getElementById("levelSelect").disabled=false;
  document.getElementById("colorSelect").disabled=false;
  document.getElementById("opponentSelect").disabled=false;
  document.getElementById("startBtn").classList.remove("btn-disabled");
  document.getElementById("endBtn").classList.add("btn-disabled");
}

/* ============================================================
   対局開始
============================================================ */
function getEnemyColorByLevel(lv){
  if(lv === 1) return 0;
  if(lv === 2 || lv === 3) return 1;
  if(lv >= 4 && lv <= 6) return 2;
  if(lv >= 7 && lv <= 9) return 3;
  if(lv === 10) return 4;
  if(lv === 11) return 5;
  return 0;
}

function startGame(){
  lastMoveFrom = null;
  lastMoveTo = null;

  level=parseInt(document.getElementById("levelSelect").value,10);
  goteColorId = getEnemyColorByLevel(level);
  colorId=parseInt(document.getElementById("colorSelect").value,10);

  initialSetup();
  renderBoard();

  inGame=true;
  turn=SENTE;
  positionHistory=[];
  recordPosition();

  lockUI();

  document.getElementById("turnInfo").textContent="手番：あなた";
  document.getElementById("messageBar").textContent="対局開始。あなたの手番です。";
}

document.getElementById("startBtn").onclick=()=>{
  if(inGame)return;
  document.getElementById("titleScreen").style.display="none";
  startGame();
};

/* ============================================================
   対局終了
============================================================ */
document.getElementById("endBtn").onclick = () => {
  if(!inGame) return;

  const lossEl = document.getElementById("losses");
  lossEl.textContent = parseInt(lossEl.textContent, 10) + 1;

  saveStats();

  inGame = false;
  unlockUI();
  document.getElementById("messageBar").textContent = "対局終了。";
};

/* ============================================================
   戦績リセット
============================================================ */
document.getElementById("resetStatsBtn").onclick=()=>{
  document.getElementById("wins").textContent="0";
  document.getElementById("losses").textContent="0";
  document.getElementById("draws").textContent="0";
  document.getElementById("rank").textContent="0";

  saveStats();

  inGame=false;
  unlockUI();

  board=createEmptyBoard();
  renderBoard();

  document.getElementById("turnInfo").textContent="手番：-";
  document.getElementById("messageBar").textContent="戦績をリセットしました。";

  updateColorSelect();
  updateLevelSelect();
  document.getElementById("titleScreen").style.display = "block";
};

/* ============================================================
   CLOSE（タブは閉じられない → ゲーム画面を隠す）
============================================================ */
document.getElementById("close-button").addEventListener("click", () => {
  window.close();
});

/* ============================================================
   初期化
============================================================ */
window.addEventListener("load",()=>{
  loadStats();
  updateColorSelect();
  updateLevelSelect();
  board=createEmptyBoard();
  renderBoard();
});

document.addEventListener("click", e => {
  const btn = e.target.closest("button[data-confirm]");
  if(!btn) return;

  const msg = btn.dataset.confirm;
  if(!confirm(msg)){
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});
