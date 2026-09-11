document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // メニュー開閉
  // =========================
  const menuButton = document.querySelector('.menu-button');
  const sideMenu = document.querySelector('.side-menu');

  menuButton.addEventListener('click', () => {
    sideMenu.classList.toggle('open');
  });


  // =========================
  // トップページのスライダー
  // =========================
  const slides = document.querySelector('.slides');
  const slideImages = document.querySelectorAll('.slides img');
  let currentIndex = 0;

  function showSlide(index) {
    const width = slideImages[0].clientWidth;
    slides.style.transform = `translateX(${-width * index}px)`;
  }

  setInterval(() => {
    currentIndex = (currentIndex + 1) % slideImages.length;
    showSlide(currentIndex);
  }, 3000);


  // =========================
  // カタログ（外部HTML読み込み）
  // =========================
  const colorLayer = document.getElementById('color-layer');
  const catalogLinks = document.querySelectorAll('.open-catalog');

catalogLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    const vol = link.dataset.vol;

    // ★ ここにゲーム専用の条件を追加
    if (vol === "game") {
      fetch("./game/gameCenter.html")
        .then(res => res.text())
        .then(html => {
          colorLayer.innerHTML = html;
          colorLayer.style.display = "flex";
        });
      return;
    }

    // ★ ここから先は従来の catalog 処理
    const file = `./catalog/catalog_vol${vol}.html`;

    fetch(file)
      .then(res => res.text())
      .then(html => {
        colorLayer.innerHTML = html;
        colorLayer.style.display = 'flex';

        attachColorEvents();
        attachViewerEvents();
        if (document.querySelector('.catalog-slider')) {
          attachCatalogSlideEvents();
        }
      });
  });
});



  // =========================
  // カタログ閉じる（動的要素対応）
  // =========================
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('close-btn')) {

    // レイヤーを閉じる
    // ★ scrollLayer が開いていたら閉じる
    if (scrollLayer.style.display !== "none") {
      scrollLayer.style.display = "none";
      document.querySelector('.shoot-close-btn').style.display = "none";
      return;
    }

    // ★ colorLayer が開いていたら閉じる
    if (colorLayer.style.display !== "none") {
      colorLayer.innerHTML = "";
      colorLayer.style.display = "none";
      document.querySelector('.shoot-close-btn').style.display = "none";
      return;
    }
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('shoot-close-btn')) {

    // ゲームリセット
    if (window.resetGameState) window.resetGameState();

    // レイヤーを閉じる
    colorLayer.innerHTML = "";
    colorLayer.style.display = 'none';

    // ★ 閉じるボタンを非表示
    document.querySelector('.shoot-close-btn').style.display = 'none';
  }
});


colorLayer.addEventListener('click', (e) => {
  if (e.target === colorLayer) {

    // ★ ゲームリセット
    if (window.resetGameState) {
      window.resetGameState();
    }

    // レイヤーを閉じる
    colorLayer.innerHTML = "";
    colorLayer.style.display = 'none';

    // ★ シューティング専用 × ボタンを消す
    document.querySelector('.shoot-close-btn').style.display = 'none';
  }
});



  // =========================
  // 色変更イベント（動的要素対応）
  // =========================
  function attachColorEvents() {
    const dots = colorLayer.querySelectorAll('.color-dot-vertical');

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const color = dot.dataset.color;
        const item = dot.closest('.item');
        const product = item.dataset.product;
        const vol = item.dataset.vol;

        const img = item.querySelector('.main-img');
        img.src = `img/vol${vol}/${product}_${color}.png`;
      });
    });
  }


  // =========================
  // 正円ビューア（商品ごとに独立）
  // =========================
  function attachViewerEvents() {
    const viewers = colorLayer.querySelectorAll('.viewer');

    viewers.forEach(viewer => {
      let index = 1;

      const img = viewer.querySelector('.viewer-wide');
      const left = viewer.querySelector('.viewer-arrow.left');
      const right = viewer.querySelector('.viewer-arrow.right');

      const cutWidth = 100;

      function update() {
        img.style.transform = `translateX(-${index * cutWidth}px)`;
      }

      left.addEventListener('click', () => {
        index = Math.max(0, index - 1);
        update();
      });

      right.addEventListener('click', () => {
        index = Math.min(2, index + 1);
        update();
      });

      img.addEventListener("load", () => {
        index = 1;
        update();
      });

      if (img.complete) {
        index = 1;
        update();
      }
    });
  }


  // =========================
  // カタログスライダー（動的要素対応）
  // =========================
  function attachCatalogSlideEvents() {
    let pageIndex = 0;

    const slider = colorLayer.querySelector('.catalog-slider');
    const track = colorLayer.querySelector('.catalog-track');
    const prev = colorLayer.querySelector('.catalog-prev');
    const next = colorLayer.querySelector('.catalog-next');

    const totalPages = track.children.length;

    function showPage(i) {
      const width = slider.clientWidth;
      track.style.transform = `translateX(${-width * i}px)`;
      updateArrows();
    }

    function updateArrows() {
      prev.style.visibility = (pageIndex === 0) ? "hidden" : "visible";
      next.style.visibility = (pageIndex === totalPages - 1) ? "hidden" : "visible";
    }

    prev.addEventListener('click', () => {
      pageIndex = Math.max(0, pageIndex - 1);
      showPage(pageIndex);
    });

    next.addEventListener('click', () => {
      pageIndex = Math.min(totalPages - 1, pageIndex + 1);
      showPage(pageIndex);
    });

    updateArrows();
  }


// =========================
// バトルページ読み込み
// =========================
document.addEventListener("click", (e) => {
  if (e.target.closest(".open-shooting")) {

    const file = "./game/shooting/battleShoot.html";
fetch(file)
  .then(res => res.text())
  .then(html => {
    colorLayer.innerHTML = html;
    colorLayer.style.display = "flex";

    // ★ dpad / zpad イベントをここで付ける
    const btnUp = colorLayer.querySelector("#up");
    const btnDown = colorLayer.querySelector("#down");
    const btnShoot = colorLayer.querySelector("#shoot");

    if (btnUp) {
      btnUp.addEventListener("mousedown", () => keys["ArrowUp"] = true);
      btnUp.addEventListener("mouseup", () => keys["ArrowUp"] = false);
      btnUp.addEventListener("touchstart", () => keys["ArrowUp"] = true);
      btnUp.addEventListener("touchend", () => keys["ArrowUp"] = false);
    }

    if (btnDown) {
      btnDown.addEventListener("mousedown", () => keys["ArrowDown"] = true);
      btnDown.addEventListener("mouseup", () => keys["ArrowDown"] = false);
      btnDown.addEventListener("touchstart", () => keys["ArrowDown"] = true);
      btnDown.addEventListener("touchend", () => keys["ArrowDown"] = false);
    }

if (btnShoot) {
  const shoot = () => {
    if (!player.shooting && !isGameOver && beams.length < 3) {
      player.shooting = true;
      beams.push({ x: player.x + player.width, y: player.y + player.height / 2 });
      player.img = "./game/shooting/img/battler02.png";
      setTimeout(() => (player.img = "./game/shooting/img/battler01.png"), 100);
      setTimeout(() => (player.shooting = false), 300);
    }
  };

  btnShoot.addEventListener("mousedown", shoot);
  btnShoot.addEventListener("touchstart", shoot);
}


    // ★ shoot.js を読み込む
    const script = document.createElement("script");
    script.src = "./game/shooting/shoot.js";
    document.body.appendChild(script);
  });

  }
});


function executeScripts(container) {
  const scripts = container.querySelectorAll("script");

  scripts.forEach(oldScript => {
    const newScript = document.createElement("script");

    if (oldScript.src) {
      newScript.src = oldScript.src;
    } else {
      newScript.textContent = oldScript.textContent;
    }

    document.body.appendChild(newScript);
  });
}
// =========================
// 通常HTML読み込み
// =========================
const htmlLinks = document.querySelectorAll('.open-html');

htmlLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    const file = link.dataset.file;

    // ★ 読み物ページは scrollLayer に読み込む
    if (file.includes("etc/")) {
      fetch(file)
        .then(res => res.text())
        .then(html => {
          scrollContent.innerHTML = html;
          scrollLayer.style.display = 'block';
        });
      return;
    }

    // ★ それ以外は従来どおり colorLayer
    fetch(file)
      .then(res => res.text())
      .then(html => {
        colorLayer.innerHTML = html;
        colorLayer.style.display = 'flex';
        executeScripts(colorLayer);
      });
  });
});
});

const menuLinks = document.querySelectorAll('.side-menu a');

menuLinks.forEach(link => {
  link.addEventListener('mouseenter', () => {
    const randomColor = `hsl(${Math.random() * 360}, 80%, 60%)`;
    link.style.color = randomColor;
  });

  link.addEventListener('mouseleave', () => {
    link.style.color = ""; // 元の色に戻す
  });
});


