class MapLoader {
  constructor(tileSize = 40) {
    this.tileSize = tileSize;
    this.map = null;

    this.tileImages = {};
    this.charImages = {};
    this.itemImages = {};

    this.offsetX = 0;
    this.offsetY = 0;

    this.mapId = null; // ★ main.js の save/load と整合
  }

  async loadMap(mapId, tileId = null) {
    this.mapId = mapId;

    const res = await fetch(`./data/maps/${mapId}.json`);
    this.map = await res.json();

    // ★ tileId が渡されているなら、ここで差し替える
    if (mapId === "bt01") {
      for (let y = 0; y < this.map.size.h; y++) {
        for (let x = 0; x < this.map.size.w; x++) {
          if (this.map.data[y][x] === 91) {
            this.map.data[y][x] = tileId;
          }
        }
      }
    }

  // ★ 差し替え後の画像をロードする
  this.tileImages = {};
  this.charImages = {};
  this.itemImages = {};

  await this.loadTileImages();
  await this.loadCharImages();
  await this.loadItemImages();
}

  async loadTileImages() {
    const usedIds = new Set();

    for (let y = 0; y < this.map.size.h; y++) {
      for (let x = 0; x < this.map.size.w; x++) {
        usedIds.add(this.map.data[y][x]);
      }
    }

    for (const id of usedIds) {
      this.tileImages[id] = await this.loadImage(`./img/tile/${id}.png`);
    }
  }

  async loadCharImages() {
    // ★ char が無いマップでも落ちない
    for (const c of (this.map.char ?? [])) {
      this.charImages[c.name] = [
        await this.loadImage(`./img/char/${c.name}A.png`),
        await this.loadImage(`./img/char/${c.name}B.png`)
      ];
    }
  }

  async loadItemImages() {
    // ★ item が無いマップでも落ちない
    for (const it of (this.map.chest ?? [])) {
      this.itemImages[it.name] = await this.loadImage(`./img/chest/${it.name}.png`);
    }
  }

  loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }

  draw(ctx) {
    const tileSize = this.tileSize;
    const offsetX = this.offsetX;
    const offsetY = this.offsetY;

    // タイル描画
    for (let y = 0; y < this.map.size.h; y++) {
      for (let x = 0; x < this.map.size.w; x++) {
        const id = this.map.data[y][x];
        const img = this.tileImages[id];
        if (img) {
          ctx.drawImage(
            img,
            x * tileSize + offsetX,
            y * tileSize + offsetY,
            tileSize,
            tileSize
          );
        }
      }
    }

    // アイテム描画
    for (const it of (this.map.chest ?? [])) {
      const img = this.itemImages[it.name];
      if (img) {
        ctx.drawImage(
          img,
          it.x * tileSize + offsetX,
          it.y * tileSize + offsetY,
          tileSize,
          tileSize
        );
      }
    }
  }

  clear() {
    // ★ 不完全だった clear を完全版に修正
    this.map = null;
    this.tileImages = {};
    this.charImages = {};
    this.itemImages = {};
    this.offsetX = 0;
    this.offsetY = 0;
    this.mapId = null;
  }
}
