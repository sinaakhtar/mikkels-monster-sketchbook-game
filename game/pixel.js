// ===== 16-Bit "Streets of Rage" Pixel Mode Prototype (Gnarlhorn / m27) =====
'use strict';

const PIXEL_BOSS_ID = 'm27';
const PX = 3; // 1 arcade pixel = 3 world units (400x253 virtual arcade resolution)

const RIGS_PX = {
  m27: {
    s: 512,
    parts: [
      { t: 'tent', ox: 278, oy: 9,   w: 153, h: 235, px: 324.5, py: 228.7, z: -1, side: 'R', ph: 2.67, sx: 512, sy: 0 },
      { t: 'leg',  ox: 155, oy: 330, w: 101, h: 149, px: 215.7, py: 348.5, z: -1, side: 'L', ph: 5.12, sx: 665, sy: 0 },
      { t: 'leg',  ox: 247, oy: 327, w: 123, h: 179, px: 285.8, py: 347.4, z: -1, side: 'R', ph: 4.62, sx: 766, sy: 0 },
      { t: 'arm',  ox: 105, oy: 198, w: 91,  h: 233, px: 173.3, py: 238.4, z:  1, side: 'L', ph: 5.45, sx: 889, sy: 0 },
      { t: 'arm',  ox: 289, oy: 211, w: 116, h: 215, px: 309.9, py: 236.3, z:  1, side: 'R', ph: 2.41, sx: 512, sy: 235 },
      { t: 'head', ox: 81,  oy: 30,  w: 273, h: 233, px: 239.9, py: 248.5, z:  1, side: 'L', ph: 6.15, sx: 628, sy: 235 },
      { t: 'jaw',  ox: 185, oy: 201, w: 112, h: 51,  px: 239.2, py: 204.2, z:  1, side: 'L', ph: 5.61, sx: 901, sy: 235 },
    ],
  },
};

function isPixelSupported(id) { return id === PIXEL_BOSS_ID; }
function isPixelPref() { return SAVE.pixelM27 !== false; }
function isPixelMode() { return !!(F && F.b && isPixelSupported(F.b.id) && isPixelPref()); }

function syncBossPixelAssets(b) {
  if (!b || !isPixelSupported(b.id)) return;
  if (!b._origImg) {
    b._origImg = b.img;
    b._origRig = b.rig;
    b._origRigImg = b.rigImg;
  }
  if (!b._pxImg) {
    b._pxImg = img('a/m27_px.webp');
    b._pxRig = RIGS_PX.m27;
    b._pxRigImg = img('a/rig_m27_px.webp');
  }
  if (isPixelPref()) {
    b.img = b._pxImg;
    b.rig = b._pxRig;
    b.rigImg = b._pxRigImg;
  } else {
    b.img = b._origImg;
    b.rig = b._origRig;
    b.rigImg = b._origRigImg;
  }
}

function togglePixelMode() {
  SAVE.pixelM27 = !isPixelPref();
  save();
  if (typeof sfx === 'function') sfx('click');
  if (F && F.b && isPixelSupported(F.b.id)) {
    syncBossPixelAssets(F.b);
    F.pxFloorC = F.pxFloorC || renderPixelFloor(hashStr(F.b.id) + 2700);
  }
  if (typeof UI !== 'undefined' && UI.toast) {
    UI.toast(isPixelPref() ? '🕹️ 16-Bit Arcade Look: ON' : '🎨 Original Sketchbook Look: ON');
  }
}

// ---------------- 5x7 ARCADE BITMAP PIXEL FONT ----------------
const PX_GLYPHS = {
  A: [14,17,17,31,17,17,17], B: [30,17,17,30,17,17,30], C: [14,17,16,16,16,17,14], D: [30,17,17,17,17,17,30],
  E: [31,16,16,30,16,16,31], F: [31,16,16,30,16,16,16], G: [14,17,16,23,17,17,15], H: [17,17,17,31,17,17,17],
  I: [14,4,4,4,4,4,14],      J: [7,2,2,2,18,18,12],     K: [17,18,20,24,20,18,17], L: [16,16,16,16,16,16,31],
  M: [17,27,21,21,17,17,17], N: [17,25,21,19,17,17,17], O: [14,17,17,17,17,17,14], P: [30,17,17,30,16,16,16],
  Q: [14,17,17,17,21,18,13], R: [30,17,17,30,20,18,17], S: [15,16,16,14,1,1,30],   T: [31,4,4,4,4,4,4],
  U: [17,17,17,17,17,17,14], V: [17,17,17,17,17,10,4],  W: [17,17,17,21,21,27,17], X: [17,17,10,4,10,17,17],
  Y: [17,17,10,4,4,4,4],     Z: [31,1,2,4,8,16,31],
  '0': [14,17,19,21,25,17,14], '1': [4,12,4,4,4,4,14], '2': [14,17,1,6,8,16,31], '3': [30,1,1,14,1,1,30],
  '4': [2,6,10,18,31,2,2],   '5': [31,16,30,1,1,17,14], '6': [14,16,30,17,17,17,14], '7': [31,1,2,4,8,8,8],
  '8': [14,17,17,14,17,17,14], '9': [14,17,17,15,1,1,14],
  ':': [0,4,4,0,4,4,0], '!': [4,4,4,4,4,0,4], '+': [0,4,4,31,4,4,0], '-': [0,0,0,31,0,0,0],
  '/': [1,2,2,4,8,8,16], '.': [0,0,0,0,0,4,4], '%': [25,26,2,4,8,19,19],
  '(': [2,4,8,8,8,4,2], ')': [8,4,2,2,2,4,8], '[': [14,8,8,8,8,8,14], ']': [14,2,2,2,2,2,14],
  'x': [0,0,17,10,4,10,17], ' ': [0,0,0,0,0,0,0],
};

function drawPxText(g, str, x, y, scale, topCol, botCol, align = 'left', outline = '#09070d') {
  const s = String(str).toUpperCase();
  const ps = Math.max(1, Math.round(scale));
  const cw = 6 * ps;
  const totalW = s.length * cw - ps;
  let sx = Math.round(align === 'center' ? x - totalW / 2 : align === 'right' ? x - totalW : x);
  const sy = Math.round(y);
  g.save();
  for (let idx = 0; idx < s.length; idx++) {
    const gl = PX_GLYPHS[s[idx]] || PX_GLYPHS[' '];
    if (outline) {
      g.fillStyle = outline;
      for (let r = 0; r < 7; r++) {
        const row = gl[r]; if (!row) continue;
        for (let c = 0; c < 5; c++) {
          if (row & (16 >> c)) {
            const px = sx + c * ps, py = sy + r * ps;
            g.fillRect(px - ps, py, ps * 3, ps);
            g.fillRect(px, py - ps, ps, ps * 3);
            g.fillRect(px + ps, py + ps, ps, ps); // drop shadow corner
          }
        }
      }
    }
    for (let r = 0; r < 7; r++) {
      const row = gl[r]; if (!row) continue;
      g.fillStyle = (botCol && r >= 4) ? botCol : topCol;
      for (let c = 0; c < 5; c++) {
        if (row & (16 >> c)) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
      }
    }
    sx += cw;
  }
  g.restore();
}

// ---------------- PIXEL BUFFER HELPERS ----------------
const _pxHeroC = document.createElement('canvas'); _pxHeroC.width = 96; _pxHeroC.height = 96;
const _pxBossC = document.createElement('canvas'); _pxBossC.width = 216; _pxBossC.height = 216;
const _pxPortHero = document.createElement('canvas'); _pxPortHero.width = 32; _pxPortHero.height = 32;
let _pxPortReady = false;

function crispOutlineBuffer(ctx2d, w, h, flashMode) {
  const id = ctx2d.getImageData(0, 0, w, h), d = id.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < w * h; p++, i += 4) {
    if (d[i + 3] >= 112) {
      solid[p] = 1;
      d[i + 3] = 255;
      if (flashMode === 'white') { d[i] = 255; d[i + 1] = 255; d[i + 2] = 245; }
      else if (flashMode === 'ice') { d[i] = Math.min(255, (d[i] >> 1) + 110); d[i + 1] = Math.min(255, (d[i + 1] >> 1) + 195); d[i + 2] = 255; }
      else if (flashMode === 'burn') { d[i] = 255; d[i + 1] = Math.min(255, (d[i + 1] >> 1) + 80); d[i + 2] = d[i + 2] >> 1; }
      else {
        // Subtle 16-bit palette quantization
        d[i]     = (d[i] & 0xf0) | 8;
        d[i + 1] = (d[i + 1] & 0xf0) | 8;
        d[i + 2] = (d[i + 2] & 0xf0) | 8;
      }
    } else {
      d[i + 3] = 0;
    }
  }
  // 1px dark arcade outline (#0b0810) around exterior pixels
  for (let y = 1; y < h - 1; y++) {
    let row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      if (solid[p]) continue;
      if (solid[p - 1] || solid[p + 1] || solid[p - w] || solid[p + w]) {
        const i = p * 4;
        d[i] = 11; d[i + 1] = 8; d[i + 2] = 16; d[i + 3] = 255;
      }
    }
  }
  ctx2d.putImageData(id, 0, 0);
}

function drawPixelShadow(x, y, r, alpha = 0.78) {
  const g = ctx;
  const rx = Math.max(4, Math.round((r * 1.05) / PX)) * PX;
  const ry = Math.max(2, Math.round((r * 0.36) / PX)) * PX;
  const cx = Math.round(x / PX) * PX;
  const cy = Math.round((y + r * 0.56) / PX) * PX;
  g.save();
  g.globalAlpha = Math.min(0.88, alpha * 1.35);
  g.fillStyle = '#07050b';
  for (let dy = -ry; dy <= ry; dy += PX) {
    const ny = dy / (ry + PX * 0.5);
    const span = Math.round((Math.sqrt(Math.max(0, 1 - ny * ny)) * rx) / PX) * PX;
    if (span > 0) g.fillRect(cx - span, cy + dy, span * 2, PX);
  }
  g.restore();
}

// ---------------- 16-BIT AKERSHUS COURTYARD ARENA ----------------
function renderPixelFloor(seed) {
  const W = Math.ceil(AW / PX), H = Math.ceil(AH / PX);
  const small = document.createElement('canvas'); small.width = W; small.height = H;
  const g = small.getContext('2d');
  const R = seeded(seed || 2727);

  // Base dark mortar (#141824)
  g.fillStyle = '#141824';
  g.fillRect(0, 0, W, H);

  // Staggered medieval blue-slate courtyard flagstones matching sor2_pixel_battle
  const stonePal = ['#2a3446', '#313d52', '#252e3f', '#38465d', '#2d384b'];
  const rowH = 14;
  for (let ry = 0, row = 0; ry < H; ry += rowH, row++) {
    let rx = (row % 2) ? -13 : 0;
    const h = Math.min(rowH - 1, H - ry);
    while (rx < W) {
      const sw = 20 + ((R() * 14) | 0);
      const col = stonePal[(R() * stonePal.length) | 0];
      const x0 = Math.max(0, rx + 1), w0 = Math.min(W - x0, sw - 1);
      if (w0 > 1 && h > 1) {
        g.fillStyle = col;
        g.fillRect(x0, ry + 1, w0, h);
        // Top & left 1px stone bevel highlight
        g.fillStyle = '#475772';
        g.fillRect(x0, ry + 1, w0, 1);
        g.fillRect(x0, ry + 1, 1, Math.min(3, h));
        // Bottom 1px stone shadow
        g.fillStyle = '#1b2230';
        g.fillRect(x0, ry + h, w0, 1);
        // Occasional stone pixel crack or scuff
        if (R() < 0.22 && w0 > 8 && h > 5) {
          let cx = x0 + 3 + ((R() * (w0 - 6)) | 0), cy = ry + 3 + ((R() * (h - 4)) | 0);
          g.fillStyle = '#121620';
          for (let s = 0; s < 4; s++) {
            g.fillRect(cx, cy, 1, 1);
            cx += R() < 0.5 ? 1 : -1;
            if (R() < 0.65) cy += 1;
          }
        }
        // Subtle moss or dark bloodstain speckles
        if (R() < 0.08) {
          g.fillStyle = R() < 0.5 ? '#263c2c' : '#3d1620';
          const bx = x0 + 2 + ((R() * Math.max(1, w0 - 5)) | 0), by = ry + 3;
          g.fillRect(bx, by, 3, 2);
          g.fillRect(bx + 1, by - 1, 2, 4);
        }
      }
      rx += sw;
    }
  }

  // Top stone curb shadow where castle wall meets floor
  g.fillStyle = 'rgba(8,6,14,0.58)';
  g.fillRect(0, 0, W, 6);
  g.fillStyle = 'rgba(8,6,14,0.3)';
  g.fillRect(0, 6, W, 5);
  // Left & right wall shadows
  g.fillStyle = 'rgba(8,6,14,0.42)';
  g.fillRect(0, 0, 6, H);
  g.fillRect(W - 6, 0, 6, H);

  // Upscale 3x with nearest-neighbor into AW x AH canvas
  const full = document.createElement('canvas'); full.width = AW; full.height = AH;
  const fg = full.getContext('2d');
  fg.imageSmoothingEnabled = false;
  fg.drawImage(small, 0, 0, W * PX, H * PX);
  return full;
}

function drawPixelArena() {
  const g = ctx;
  g.save();
  g.imageSmoothingEnabled = false;

  // Deep night indigo backdrop
  g.fillStyle = '#0d0f1d';
  g.fillRect(-OX / SC - 4, -OY / SC - 4, SW / SC + 8, SH / SC + 8);

  // Draw pixel Akershus backdrop in the outer frame (visible above/beside the courtyard)
  const pxBg = img('a/m27_px_bg.webp');
  if (pxBg && pxBg.complete && pxBg.naturalWidth) {
    const s = Math.max((SW / SC) / pxBg.naturalWidth, (SH / SC) / pxBg.naturalHeight);
    const dw = Math.round(pxBg.naturalWidth * s), dh = Math.round(pxBg.naturalHeight * s);
    g.globalAlpha = 0.85;
    g.drawImage(pxBg, Math.round(AW / 2 - dw / 2), Math.round(AH / 2 - dh / 2), dw, dh);
    g.globalAlpha = 1;
  }

  // Courtyard cobblestone floor
  if (!F.pxFloorC) F.pxFloorC = renderPixelFloor(hashStr(F.b.id) + 2700);
  g.drawImage(F.pxFloorC, 0, 0);

  // Stepped 16-bit warm torchlight pools on the floor
  drawPixelLighting(g);

  // Crisp pixel stone fortress walls framing the playable courtyard (top parapet + archways + side walls)
  drawPixelCastleRim(g);
  drawPixelTorches(g);

  g.restore();
}

function drawPixelLighting(g) {
  // Banded arcade darkness + warm amber torch pools snapped to pixel steps
  g.save();
  const sources = [
    { x: F.p.x, y: F.p.y - 24, r: 220, col: '255,210,140', a: 0.10 },
  ];
  if (!F.b.dead) sources.push({ x: F.b.x, y: F.b.y - 30, r: F.b.r * 2.5, col: '255,65,50', a: F.b.p2 ? 0.18 : 0.10 });
  const fl = Math.floor(F.time * 10);
  for (let i = 0; i < F.torches.length; i++) {
    const t = F.torches[i];
    const wob = ((fl + i * 3) % 4 === 0) ? 9 : ((fl + i) % 3 === 0 ? -6 : 0);
    sources.push({ x: t.x, y: t.y, r: 195 + wob, col: '255,165,55', a: 0.16 });
  }
  for (const s of sources) {
    const sx = Math.round(s.x / PX) * PX, sy = Math.round(s.y / PX) * PX;
    for (const [f, mul] of [[1.0, 0.35], [0.66, 0.55], [0.36, 0.85]]) {
      const rr = Math.round((s.r * f) / PX) * PX;
      g.fillStyle = `rgba(${s.col},${(s.a * mul).toFixed(3)})`;
      g.fillRect(sx - rr, sy - Math.round(rr * 0.62), rr * 2, Math.round(rr * 1.24));
    }
  }
  g.restore();
}

function drawPixelCastleRim(g) {
  const p = PX;
  // Streets-of-Rage style elevated rear castle wall (from y=-60 down to y=84)
  const wallTop = -12, wallBot = 84, wallH = wallBot - wallTop;
  // Deep night sky strip above battlements
  g.fillStyle = '#0c1126';
  g.fillRect(-48, -90, AW + 96, 84);
  // Distant castle silhouette towers in night sky
  g.fillStyle = '#151d38';
  g.fillRect(60, -66, 132, 60);
  g.fillRect(AW - 210, -72, 150, 66);

  // Main fortress stone rear wall
  g.fillStyle = '#232b3d';
  g.fillRect(-36, wallTop, AW + 72, wallH);

  // Crenellations / battlements along wallTop
  g.fillStyle = '#0b0810';
  g.fillRect(-36, wallTop - p * 4, AW + 72, p * 4);
  for (let x = -24; x < AW + 24; x += p * 12) {
    g.fillStyle = '#2d374e';
    g.fillRect(x, wallTop - p * 5, p * 7, p * 5);
    g.fillStyle = '#465472';
    g.fillRect(x, wallTop - p * 5, p * 7, p);
  }

  // Brick courses on rear wall
  for (let y = wallTop + p * 4; y < wallBot; y += p * 6) {
    g.fillStyle = '#151924';
    g.fillRect(-36, y, AW + 72, p);
    const off = (((y - wallTop) / (p * 6)) | 0) % 2 ? p * 7 : 0;
    for (let x = -36 + off; x < AW + 36; x += p * 14) {
      g.fillStyle = '#151924';
      g.fillRect(x, y - p * 5, p, p * 5);
      g.fillStyle = '#313c54';
      g.fillRect(x + p, y - p * 5, p * 12, p);
    }
  }

  // Arched barred castle windows along rear wall
  for (const wx of [255, AW - 255]) {
    const ww = p * 12, wh = p * 16, wy = wallBot - wh - p * 5;
    g.fillStyle = '#3b4760';
    g.fillRect(wx - ww / 2 - p * 2, wy - p * 2, ww + p * 4, wh + p * 3);
    g.fillStyle = '#0b0d18';
    g.fillRect(wx - ww / 2, wy, ww, wh);
    g.fillStyle = '#263048';
    g.fillRect(wx - p, wy, p * 2, wh);
    g.fillRect(wx - ww / 2, wy + p * 7, ww, p * 2);
  }

  // Center arched iron portcullis gate at x = AW/2
  const gx = AW / 2, gw = p * 30, gh = p * 24;
  g.fillStyle = '#3b4760';
  g.fillRect(gx - gw / 2 - p * 3, wallBot - gh - p * 3, gw + p * 6, gh + p * 3);
  g.fillStyle = '#4e5d7a';
  g.fillRect(gx - gw / 2 - p * 3, wallBot - gh - p * 3, gw + p * 6, p * 2);
  g.fillStyle = '#09080f';
  g.fillRect(gx - gw / 2, wallBot - gh, gw, gh);
  // Iron portcullis bars + spikes
  g.fillStyle = '#323c50';
  for (let bx = gx - gw / 2 + p * 3; bx < gx + gw / 2 - p * 2; bx += p * 4) {
    g.fillRect(bx, wallBot - gh + p * 2, p, gh - p * 5);
  }
  g.fillRect(gx - gw / 2, wallBot - gh + p * 6, gw, p);
  g.fillRect(gx - gw / 2, wallBot - gh + p * 13, gw, p);

  // Crimson & gold hanging Akershus banners on the rear wall
  for (const bx of [132, AW - 132]) {
    const by = wallTop + p * 4;
    g.fillStyle = '#0b0810';
    g.fillRect(bx - p * 5, by - p, p * 10, p * 24);
    g.fillStyle = '#a81928';
    g.fillRect(bx - p * 4, by, p * 8, p * 21);
    g.fillStyle = '#d82838';
    g.fillRect(bx - p * 2, by + p, p * 4, p * 17);
    g.fillStyle = '#e8b838';
    g.fillRect(bx - p * 5, by - p, p * 10, p * 2);
    g.fillRect(bx - p * 4, by, p, p * 21);
    g.fillRect(bx + p * 3, by, p, p * 21);
    g.fillRect(bx - p * 4, by + p * 20, p * 8, p);
  }

  // Stone base molding & drop shadow where rear wall meets courtyard flagstones
  g.fillStyle = '#3b4760';
  g.fillRect(-12, wallBot - p * 2, AW + 24, p * 2);
  g.fillStyle = '#0b0810';
  g.fillRect(-12, wallBot, AW + 24, p * 2);
  g.fillStyle = 'rgba(7,5,12,0.52)';
  g.fillRect(0, wallBot + p * 2, AW, p * 5);

  // Left & Right side walls + bottom stone curb
  g.fillStyle = '#1e2433';
  g.fillRect(-36, -12, 36, AH + 48);
  g.fillRect(AW, -12, 36, AH + 48);
  g.fillStyle = '#181c28';
  g.fillRect(-36, AH, AW + 72, 36);
  g.fillStyle = '#39455c';
  g.fillRect(-6, AH, AW + 12, p * 2);

  // Crisp dark pixel border on sides & bottom
  g.fillStyle = '#0b0810';
  g.fillRect(-p, AH - p, AW + p * 2, p * 2);
  g.fillRect(-p, 0, p * 2, AH);
  g.fillRect(AW - p, 0, p * 2, AH);
}

function drawPixelTorches(g) {
  const p = PX;
  const frame = Math.floor(F.time * 10);
  for (let i = 0; i < F.torches.length; i++) {
    const t = F.torches[i];
    const tx = Math.round(t.x / p) * p;
    // Mount top-wall torches onto the visible stone rear wall!
    const rawY = t.y < 30 ? 58 : t.y;
    const ty = Math.round(rawY / p) * p;
    const f = (frame + i * 2) % 4;
    // Iron bracket & sconce
    g.fillStyle = '#0b0810';
    g.fillRect(tx - p * 3, ty - p * 3, p * 6, p * 9);
    g.fillStyle = '#5c4028';
    g.fillRect(tx - p * 2, ty - p * 2, p * 4, p * 7);
    g.fillStyle = '#8b95a6';
    g.fillRect(tx - p * 3, ty - p * 2, p * 6, p * 2);
    // Pixel flame (stepped orange -> gold -> white-yellow)
    const fh = (f === 0 || f === 2) ? 6 : (f === 1 ? 7 : 5);
    const shift = f === 1 ? p : (f === 3 ? -p : 0);
    g.fillStyle = '#0b0810';
    g.fillRect(tx - p * 3 + shift, ty - p * (3 + fh), p * 6, p * (fh + 1));
    g.fillStyle = '#e84818';
    g.fillRect(tx - p * 2 + shift, ty - p * (2 + fh), p * 4, p * fh);
    g.fillStyle = '#ff9c24';
    g.fillRect(tx - p * 2, ty - p * (1 + fh - 1), p * 4, p * (fh - 2));
    g.fillStyle = '#fff27a';
    g.fillRect(tx - p, ty - p * 5, p * 2, p * 3);
  }
}

// ---------------- PIXEL PILLARS & CRATES (LAIR OBJECTS) ----------------
function drawPixelObj(o) {
  if (o.k !== 'pillar') return false;
  const g = ctx, p = PX;
  const shk = o.sh > 0 ? (Math.floor(F.time * 30) % 2 ? p * 2 : -p * 2) : 0;
  const ox = Math.round((o.x + shk) / p) * p;
  const oy = Math.round(o.y / p) * p;
  const behind = F.p.y < o.y - 10 && F.p.y > o.y - 150 && Math.abs(F.p.x - o.x) < o.r + 20;

  g.save();
  g.translate(ox, oy);
  if (o.hp <= 0) {
    // Crumbled pixel stone + splintered crate rubble
    drawPixelShadow(0, -6, o.r * 1.1, 0.55);
    const chunks = [[-9, -3, 6, 4, '#556074'], [2, -4, 7, 4, '#3e4758'], [-4, 1, 8, 4, '#6d7a90'], [-12, 1, 5, 3, '#7a4e28'], [7, 1, 5, 3, '#a82820']];
    for (const [cx, cy, cw, ch, col] of chunks) {
      g.fillStyle = '#0b0810';
      g.fillRect((cx - 1) * p, (cy - 1) * p, (cw + 2) * p, (ch + 2) * p);
      g.fillStyle = col;
      g.fillRect(cx * p, cy * p, cw * p, ch * p);
    }
    g.restore();
    return true;
  }

  drawPixelShadow(0, -6, o.r * 1.05, 0.72);
  if (behind) g.globalAlpha = 0.52;

  // Pixel stone dungeon column + wooden crate & red hazard barrel prop beside base (matching sor2_pixel_battle!)
  const rw = 12, rh = 38; // in PX units (36w x 114h world units -> radius ~36-40)
  // 1px dark outline around column
  g.fillStyle = '#0b0810';
  g.fillRect((-rw - 2) * p, (-rh - 2) * p, (rw * 2 + 4) * p, (rh + 5) * p);

  // Column pedestal base
  g.fillStyle = '#394356';
  g.fillRect((-rw - 1) * p, -5 * p, (rw * 2 + 2) * p, 7 * p);
  g.fillStyle = '#62718a';
  g.fillRect((-rw - 1) * p, -5 * p, (rw * 2 + 2) * p, 2 * p);

  // Column shaft with 3-tone pixel stone shading & mortar joints
  g.fillStyle = '#4a566d';
  g.fillRect(-rw * p, -rh * p, rw * 2 * p, (rh - 5) * p);
  g.fillStyle = '#6d7d99'; // left highlight band
  g.fillRect((-rw + 1) * p, -rh * p, 5 * p, (rh - 5) * p);
  g.fillStyle = '#2d3546'; // right shadow band
  g.fillRect((rw - 5) * p, -rh * p, 5 * p, (rh - 5) * p);

  // Horizontal pixel stone courses
  for (let sy = -rh + 7; sy < -6; sy += 8) {
    g.fillStyle = '#181d28';
    g.fillRect(-rw * p, sy * p, rw * 2 * p, p);
    g.fillStyle = '#7e8fa8';
    g.fillRect((-rw + 1) * p, (sy + 1) * p, 6 * p, p);
  }

  // Column capital (top cap)
  g.fillStyle = '#0b0810';
  g.fillRect((-rw - 2) * p, (-rh - 3) * p, (rw * 2 + 4) * p, 6 * p);
  g.fillStyle = '#5c6b85';
  g.fillRect((-rw - 1) * p, (-rh - 2) * p, (rw * 2 + 2) * p, 4 * p);
  g.fillStyle = '#899ab5';
  g.fillRect((-rw - 1) * p, (-rh - 2) * p, (rw * 2 + 2) * p, p);

  // Small decorative wooden crate tucked right against column base (purely inside solid radius!)
  const cx = -rw - 1, cy = -12, cs = 10;
  g.fillStyle = '#0b0810';
  g.fillRect((cx - 1) * p, (cy - 1) * p, (cs + 2) * p, (cs + 2) * p);
  g.fillStyle = '#8c5828';
  g.fillRect(cx * p, cy * p, cs * p, cs * p);
  g.fillStyle = '#b87a3d';
  g.fillRect(cx * p, cy * p, cs * p, 2 * p);
  g.fillRect(cx * p, (cy + cs - 2) * p, cs * p, 2 * p);
  g.fillRect(cx * p, cy * p, 2 * p, cs * p);
  g.fillRect((cx + cs - 2) * p, cy * p, 2 * p, cs * p);
  // Diagonal crate brace
  g.fillStyle = '#5c3614';
  for (let d = 2; d < cs - 2; d++) g.fillRect((cx + d) * p, (cy + cs - 1 - d) * p, 2 * p, p);

  // Small red hazard drum tucked on right side of column base (matching sor2_pixel_battle!)
  const dx = 3, dy = -13, dw = 9, dh = 12;
  g.fillStyle = '#0b0810';
  g.fillRect((dx - 1) * p, (dy - 1) * p, (dw + 2) * p, (dh + 2) * p);
  g.fillStyle = '#b8221e';
  g.fillRect(dx * p, dy * p, dw * p, dh * p);
  g.fillStyle = '#e83b30';
  g.fillRect((dx + 1) * p, dy * p, 3 * p, dh * p);
  g.fillStyle = '#751212';
  g.fillRect((dx + dw - 2) * p, dy * p, 2 * p, dh * p);
  // Drum ribs + tiny yellow hazard spark icon
  g.fillStyle = '#261418';
  g.fillRect(dx * p, (dy + 3) * p, dw * p, p);
  g.fillRect(dx * p, (dy + 8) * p, dw * p, p);
  g.fillStyle = '#ffcf38';
  g.fillRect((dx + 3) * p, (dy + 5) * p, 3 * p, 2 * p);

  // Heavy pixel crack if damaged (hp === 1)
  if (o.hp === 1) {
    g.fillStyle = '#0b0810';
    const cr = [[-4, -34], [-2, -31], [-1, -28], [-3, -25], [-1, -22], [2, -19], [1, -16], [4, -13]];
    for (const [kx, ky] of cr) g.fillRect(kx * p, ky * p, 2 * p, 3 * p);
  }

  g.restore();
  return true;
}

// ---------------- 16-BIT HERO KNIGHT (MIKKEL) ----------------
function drawPixelWeapon(g, key, lvl, L, time, extend = 0) {
  const ti = weaponTier(lvl), T = WTIERS[ti];
  const bLight = ti === 5 ? '#ffffff' : T.blade[0];
  const bMid   = ti === 5 ? '#ffe082' : T.blade[1];
  const hilt   = T.metal, hiltDark = T.metal2, grip = T.grip;
  g.save();
  switch (key) {
    case 'twig':
    case 'dragon': {
      const big = key === 'dragon';
      const w = big ? 4.2 : 2.8, gl = big ? 6 : 4.5, bl = Math.max(18, L * 0.44);
      g.fillStyle = grip; g.fillRect(-3, -1.5, gl + 3, 3);
      g.fillStyle = hilt; g.fillRect(-4.5, -2.5, 2.5, 5); // pommel
      const gh = big ? 8 : 6;
      g.fillStyle = hilt; g.fillRect(gl - 1, -gh, 3, gh * 2);
      g.fillStyle = hiltDark; g.fillRect(gl - 1, 1, 3, gh - 1);
      // Pixel broadsword blade (2-tone bevel)
      g.fillStyle = bLight;
      g.beginPath(); g.moveTo(gl + 2, -w); g.lineTo(bl - 5, -w); g.lineTo(bl, 0); g.lineTo(gl + 2, 0); g.closePath(); g.fill();
      g.fillStyle = bMid;
      g.beginPath(); g.moveTo(gl + 2, 0); g.lineTo(bl, 0); g.lineTo(bl - 5, w); g.lineTo(gl + 2, w); g.closePath(); g.fill();
      if (T.gem) { g.fillStyle = T.gem; g.fillRect(gl - 0.5, -1.5, 2.5, 3); }
      break;
    }
    case 'spear': {
      const bl = Math.max(24, L * 0.46), sh = bl - 11;
      g.fillStyle = ti >= 2 ? hiltDark : '#6e4c28'; g.fillRect(-10, -1.3, sh + 10, 2.6);
      g.fillStyle = T.gem || '#d82838'; g.fillRect(sh - 4, 1.3, 3, 5);
      g.fillStyle = bLight;
      g.beginPath(); g.moveTo(sh, -3.5); g.lineTo(bl, 0); g.lineTo(sh, 0); g.closePath(); g.fill();
      g.fillStyle = bMid;
      g.beginPath(); g.moveTo(sh, 0); g.lineTo(bl, 0); g.lineTo(sh, 3.5); g.closePath(); g.fill();
      break;
    }
    case 'hammer': {
      const bl = Math.max(20, L * 0.42), hx = bl - 10;
      g.fillStyle = '#6e4c28'; g.fillRect(-6, -1.5, hx + 6, 3);
      g.fillStyle = hilt; g.fillRect(hx, -8.5, 11, 17);
      g.fillStyle = bLight; g.fillRect(hx + 1, -8.5, 9, 4);
      g.fillStyle = hiltDark; g.fillRect(hx, 3.5, 11, 5);
      break;
    }
    case 'hooks': {
      const bl = Math.max(16, L * 0.42);
      g.fillStyle = grip; g.fillRect(-3, -1.5, 6, 3);
      g.fillStyle = hilt; g.fillRect(2, -4, 2.5, 8);
      g.strokeStyle = bLight; g.lineWidth = 3;
      g.beginPath(); g.moveTo(4, -1); g.quadraticCurveTo(bl * 0.75, -5, bl, -bl * 0.3); g.stroke();
      break;
    }
    case 'whip': {
      const len = (12 + (L * 0.42 - 12) * extend);
      g.fillStyle = grip; g.fillRect(-3, -1.5, 6, 3);
      for (let i = 0; i < 8; i++) {
        const k = i / 8, wx = 3 + len * k, wy = Math.sin(time * (extend > 0.5 ? 16 : 4) - k * 5) * 4 * k;
        g.fillStyle = i % 2 ? hilt : '#c84830';
        g.fillRect(wx, wy - 1.5, Math.max(2.5, len / 8 + 1), 2.8);
      }
      break;
    }
  }
  g.restore();
}

function drawPlayerPixel(P) {
  const g = ctx, C = heroArmorLook(), w = P.w, key = SAVE.equip.weapon, lvl = P.lvl, T = WTIERS[weaponTier(lvl)];
  const mag = Math.hypot(INPUT.mx, INPUT.my), moving = (P.state === 'free' || P.state === 'drink') && mag > 0.15;
  const c = Math.cos(P.face); if (c < -0.25) P.flipT = -1; else if (c > 0.25) P.flipT = 1; else if (!P.flipT) P.flipT = 1;
  P.flipS = P.flipT; // crisp instant arcade facing flip!
  P.rp = (P.rp || 0) + (moving ? mag * 0.24 : 0);

  // Quantize animation clock to 12fps for authentic arcade sprite cadence
  const qt = Math.floor(F.time * 12) / 12;
  const qph = Math.floor(P.rp * 2.2) / 2.2;
  const aimTilt = clamp(Math.atan2(Math.sin(P.face), Math.abs(Math.cos(P.face))), -1.0, 1.0);

  drawPixelShadow(P.x, P.y + 4, P.r * 0.95, 0.78);

  // Render hero into 96x96 pixel buffer (1 buffer px = PX world units = 3 world units)
  const hc = _pxHeroC, hg = hc.getContext('2d');
  hg.setTransform(1, 0, 0, 1, 0, 0);
  hg.clearRect(0, 0, 96, 96);
  hg.imageSmoothingEnabled = false;

  const ox = 48, oy = 76;
  hg.save();
  hg.translate(ox, oy);

  if (P.state === 'roll') {
    const k = Math.floor((P.t / 0.4) * 6) / 6, dir = Math.cos(P.rollA) < 0 ? -1 : 1;
    hg.translate(0, -8);
    hg.rotate(dir * k * TAU);
    hg.fillStyle = C.cape; hg.beginPath(); hg.arc(0, 0, 8.5, 0, TAU); hg.fill();
    hg.fillStyle = '#ffd24a'; hg.fillRect(-8, -2, 16, 2);
    hg.fillStyle = '#9aa8bc'; hg.beginPath(); hg.arc(0, 0, 6, 0, TAU); hg.fill();
    hg.fillStyle = '#dce6f2'; hg.fillRect(-4, -5, 5, 3);
    hg.fillStyle = '#182030'; hg.fillRect(0, -3, 5, 2);
    hg.restore();
    crispOutlineBuffer(hg, 96, 96, null);
    g.save();
    g.imageSmoothingEnabled = false;
    if (P.inv > 0 && Math.floor(F.time * 16) % 2) g.globalAlpha = 0.45;
    // Pixel afterimage ghost during dodge roll
    g.globalAlpha *= 0.35;
    g.drawImage(hc, Math.round((P.x - Math.cos(P.rollA) * 24 - ox * PX) / PX) * PX, Math.round((P.y + 6 - Math.sin(P.rollA) * 24 - oy * PX) / PX) * PX, 96 * PX, 96 * PX);
    g.globalAlpha = (P.inv > 0 && Math.floor(F.time * 16) % 2) ? 0.45 : 1;
    g.drawImage(hc, Math.round((P.x - ox * PX) / PX) * PX, Math.round((P.y + 6 - oy * PX) / PX) * PX, 96 * PX, 96 * PX);
    g.restore();
    return;
  }

  if (P.state === 'dead') { hg.rotate(-Math.PI / 2 * P.flipT); hg.translate(-4 * P.flipT, -2); }
  hg.scale(P.flipT, 1);

  const run = moving ? 1 : 0;
  const bob = run ? -Math.round(Math.abs(Math.sin(qph)) * 2) : (Math.floor(qt * 2) % 2 ? -1 : 0);
  const lean = P.state === 'hurt' ? -0.2 : (P.state === 'attack' ? 0.12 : (run ? 0.08 : 0));
  hg.translate(0, bob);
  hg.rotate(lean);

  const legSw = run ? Math.sin(qph) * 0.72 : 0;
  const capeWave = (Math.floor(qt * 6) % 3 - 1) * 1.2 + (run ? 3.5 : 0) + (P.state === 'attack' ? 2.5 : 0);

  // 1. Billowing crimson cape with gold border (matching sor2_pixel_battle)
  hg.fillStyle = '#7a0e1c';
  hg.beginPath();
  hg.moveTo(-3, -24);
  hg.lineTo(-12 - capeWave, -14);
  hg.lineTo(-14 - capeWave * 1.2, -3);
  hg.lineTo(-4 - capeWave * 0.5, -2);
  hg.lineTo(2, -23);
  hg.closePath();
  hg.fill();
  hg.fillStyle = '#c81d2e';
  hg.beginPath();
  hg.moveTo(-3, -24);
  hg.lineTo(-10 - capeWave, -15);
  hg.lineTo(-11 - capeWave, -5);
  hg.lineTo(-5 - capeWave * 0.4, -4);
  hg.closePath();
  hg.fill();
  hg.strokeStyle = '#f4be38'; hg.lineWidth = 1.6;
  hg.beginPath(); hg.moveTo(-12 - capeWave, -14); hg.lineTo(-14 - capeWave * 1.2, -3); hg.lineTo(-4 - capeWave * 0.5, -2); hg.stroke();

  // Helper for chunky armored pixel legs
  const drawLeg = (lx, ly, sw, bright) => {
    const kx = lx + Math.sin(sw) * 6, ky = ly + Math.cos(sw) * 6;
    const fx = kx + Math.sin(sw * 0.6) * 6, fy = ky + Math.cos(sw * 0.6) * 6;
    hg.strokeStyle = bright ? '#98a8be' : '#58657a';
    hg.lineWidth = 4.2; hg.lineCap = 'butt';
    hg.beginPath(); hg.moveTo(lx, ly); hg.lineTo(kx, ky); hg.lineTo(fx, fy); hg.stroke();
    if (bright) {
      hg.fillStyle = '#dce6f2';
      hg.fillRect(kx - 1.5, ky - 1.5, 3, 3); // knee cop highlight
    }
    // Armored sabaton boot
    hg.fillStyle = bright ? '#7888a0' : '#404a5c';
    hg.fillRect(fx - 2, fy - 1.5, 6, 3.2);
    hg.fillStyle = '#dce6f2';
    hg.fillRect(fx + 1, fy - 1.5, 2.5, 1.5);
  };

  // 2. Back leg
  drawLeg(-2, -12, -legSw, false);

  // 3. Back arm & Shield (or green potion)
  if (P.state === 'drink') {
    hg.fillStyle = '#3ad856'; hg.fillRect(5, -26, 4, 5);
    hg.fillStyle = '#e8f4ff'; hg.fillRect(6, -28, 2, 2);
  }

  // 4. Front leg
  drawLeg(2.5, -12, legSw, true);

  // 5. Armored Torso + Royal Blue Split Tabard + Gold Belt
  hg.fillStyle = '#6c7c92';
  hg.fillRect(-5.5, -25, 11.5, 13);
  hg.fillStyle = '#aebcd0';
  hg.fillRect(-4.5, -25, 8.5, 8);
  hg.fillStyle = '#dce6f2';
  hg.fillRect(-3.5, -24, 5, 3); // chest plate specular

  // Royal blue tabard skirt with gold trim
  hg.fillStyle = '#1d44a8';
  hg.beginPath(); hg.moveTo(-4, -15); hg.lineTo(5, -15); hg.lineTo(4.5, -6); hg.lineTo(0.5, -4.5); hg.lineTo(-3.5, -6); hg.closePath(); hg.fill();
  hg.fillStyle = '#3268e6';
  hg.fillRect(-2.5, -15, 5.5, 8.5);
  hg.fillStyle = '#f4be38';
  hg.fillRect(-3.5, -6.5, 8, 1.4); // gold hem

  // Leather belt & gold buckle
  hg.fillStyle = '#4a2c18'; hg.fillRect(-5.5, -15.5, 11.5, 2.4);
  hg.fillStyle = '#ffd24a'; hg.fillRect(-0.5, -16, 3.2, 3.2);

  // Crimson neck scarf & gold clasp (just like sor2_pixel_battle!)
  hg.fillStyle = '#c81d2e'; hg.fillRect(-5, -26, 10.5, 3);
  hg.fillStyle = '#ffd24a'; hg.fillRect(-2.5, -25.5, 2.5, 2.5);

  // 6. Iconic Knight Helmet + Flowing Red Plume + Glowing Cyan Visor
  const hy = -32 + (P.state === 'hurt' ? 1 : 0);
  // Flowing red feather plume
  hg.fillStyle = '#921020';
  hg.beginPath(); hg.moveTo(-1, hy - 5); hg.quadraticCurveTo(-8, hy - 11, -14 - capeWave * 0.4, hy - 3); hg.quadraticCurveTo(-8, hy - 3, -2, hy - 2); hg.fill();
  hg.fillStyle = '#e82234';
  hg.beginPath(); hg.moveTo(-1, hy - 5.5); hg.quadraticCurveTo(-7, hy - 10, -12 - capeWave * 0.4, hy - 4.5); hg.quadraticCurveTo(-7, hy - 5, -1, hy - 3); hg.fill();

  // Steel visored helm
  hg.fillStyle = '#6c7c92';
  hg.fillRect(-5.5, hy - 5.5, 11.5, 10.5);
  hg.fillStyle = '#aebcd0';
  hg.fillRect(-4.5, hy - 6.5, 9.5, 9.5);
  hg.fillStyle = '#e6eef8';
  hg.fillRect(-3.5, hy - 6.5, 6, 3.5); // dome highlight

  // Dark visor slit + glowing cyan pixel eyes
  hg.fillStyle = '#0d1018';
  hg.fillRect(-0.5, hy - 2, 6.8, 2.6);
  hg.fillStyle = '#5ef6ff';
  hg.fillRect(0.5, hy - 1.5, 2.2, 1.6);
  hg.fillRect(3.6, hy - 1.5, 2.0, 1.6);

  // Vertical visor mouthguard vent bars
  hg.fillStyle = '#2d3646';
  hg.fillRect(0.5, hy + 1.5, 1.1, 3);
  hg.fillRect(2.6, hy + 1.5, 1.1, 3);
  hg.fillRect(4.6, hy + 1.5, 1.1, 3);

  if (SAVE.crafted.crown) {
    hg.fillStyle = '#ffd24a';
    hg.fillRect(-4, hy - 9, 8, 2.5);
    hg.fillRect(-4, hy - 11, 2, 2); hg.fillRect(-1, hy - 11.5, 2, 2.5); hg.fillRect(2, hy - 11, 2, 2);
  }

  // 7. Weapon Arm & Weapon (swings forward on attack!)
  let armA = run ? -Math.sin(qph) * 0.45 + 0.35 : 0.48, wA = 0.85, ext = 0;
  if (P.state === 'attack') {
    const T1 = w.wind, T2 = T1 + w.act, rec = w.rec * (P.combo === w.combo - 1 ? 1.4 : 1), alt = P.combo % 2 === 1;
    let from = alt ? 2.35 : -0.55, to = alt ? -0.35 : 2.25;
    if (key === 'hammer') { from = -1.15; to = 2.35; }
    if (key === 'spear' || key === 'whip') { from = 1.0; to = 1.6; }
    let k;
    if (P.t < T1) { k = P.t / T1; armA = 0.48 + (from - 0.48) * ease(k); }
    else if (P.t < T2) { k = (P.t - T1) / w.act; armA = from + (to - from) * ease(k); ext = k; }
    else { k = clamp((P.t - T2) / rec, 0, 1); armA = to + (0.48 - to) * ease(k); ext = 1 - k; }
    armA += aimTilt * 0.55 * P.flipT;
    wA = 1.57;
  }
  const sx = 2.5, sy = -22, ua = armA, fa = P.state === 'attack' ? 0.15 : 0.45;
  const hx = sx + Math.sin(ua) * 4.5 + Math.sin(ua + fa) * 4.5;
  const hy2 = sy + Math.cos(ua) * 4.5 + Math.cos(ua + fa) * 4.5;

  // Draw pixel weapon from hand
  hg.save();
  hg.translate(hx, hy2);
  const wAng = P.state === 'attack' ? Math.PI / 2 - (ua + fa) : Math.PI / 2 - (ua + fa) - wA + 0.9;
  hg.rotate(-wAng + (P.state === 'attack' ? 0 : -0.55));
  const vis = key === 'whip' ? w.reach : key === 'spear' ? w.reach * 0.75 + (P.state === 'attack' ? ext * 18 : 0) : w.reach * 0.64 + 12;
  drawPixelWeapon(hg, key, lvl, vis, qt, key === 'whip' ? ext : 0);
  hg.restore();

  // Armored sword arm + pauldron + gauntlet
  hg.strokeStyle = '#aebcd0'; hg.lineWidth = 3.6; hg.lineCap = 'butt';
  hg.beginPath(); hg.moveTo(sx, sy); hg.lineTo(hx, hy2); hg.stroke();
  hg.fillStyle = '#dce6f2'; hg.fillRect(sx - 2.5, sy - 2.5, 5.5, 4.5); // pauldron
  hg.fillStyle = '#4a566b'; hg.fillRect(hx - 1.8, hy2 - 1.8, 3.6, 3.6); // gauntlet

  // 8. Royal Blue & Gold 'M' Shield (worn on off-side like sor2_pixel_battle!)
  if (P.state !== 'drink') {
    const shx = P.state === 'attack' ? -5.5 : -4.5, shy = -17;
    hg.fillStyle = '#f4be38'; // gold outer border
    hg.beginPath();
    hg.moveTo(shx - 5.5, shy - 6);
    hg.lineTo(shx + 5.5, shy - 6);
    hg.lineTo(shx + 5.5, shy + 1);
    hg.lineTo(shx, shy + 7.5);
    hg.lineTo(shx - 5.5, shy + 1);
    hg.closePath();
    hg.fill();
    hg.fillStyle = '#2250c8'; // royal blue shield face
    hg.beginPath();
    hg.moveTo(shx - 4, shy - 4.5);
    hg.lineTo(shx + 4, shy - 4.5);
    hg.lineTo(shx + 4, shy + 0.8);
    hg.lineTo(shx, shy + 5.8);
    hg.lineTo(shx - 4, shy + 0.8);
    hg.closePath();
    hg.fill();
    // Crisp pixel 'M' emblem in gold
    hg.fillStyle = '#ffd84a';
    hg.fillRect(shx - 2.8, shy - 3, 1.3, 5.2);
    hg.fillRect(shx + 1.5, shy - 3, 1.3, 5.2);
    hg.fillRect(shx - 1.5, shy - 2, 1.2, 1.6);
    hg.fillRect(shx + 0.3, shy - 2, 1.2, 1.6);
    hg.fillRect(shx - 0.6, shy - 0.6, 1.2, 1.6);
  }

  hg.restore();
  crispOutlineBuffer(hg, 96, 96, P.state === 'hurt' ? 'white' : null);

  g.save();
  g.imageSmoothingEnabled = false;
  if (P.inv > 0 && Math.floor(F.time * 16) % 2) g.globalAlpha = 0.45;
  const dx = Math.round((P.x - ox * PX) / PX) * PX;
  const dy = Math.round((P.y + 6 - oy * PX) / PX) * PX;
  g.drawImage(hc, dx, dy, 96 * PX, 96 * PX);
  g.restore();

  // Pixelated crescent sword slash arc in front of hero (matching sor2_pixel_battle!)
  if (P.state === 'attack') {
    const T1 = w.wind, T2 = w.wind + w.act, arc = w.arc * RAD;
    if (P.t >= T1 && P.t < T2 + 0.14) {
      const side = P.combo % 2 ? -1 : 1, k = clamp((P.t - T1) / w.act, 0, 1), fade = P.t > T2 ? 1 - (P.t - T2) / 0.14 : 1;
      drawPixelSlashArc(g, P.x, P.y - 30, P.face, -arc / 2 * side, (-arc / 2 + arc * Math.max(0.32, k)) * side, P.r + w.reach * 0.36, w.reach + P.r + 8, fade, weaponTier(lvl));
    }
  }
}

function drawPixelSlashArc(g, cx, cy, face, a1, a2, R0, R1, fade, tier) {
  // Crisp pixelated crescent slash arc matching sor2_pixel_battle!
  g.save();
  const lo = Math.min(a1, a2), hi = Math.max(a1, a2);
  const steps = 30;
  const outerCol = '#ffffff';
  const midCol   = tier === 4 ? '#ff9438' : tier === 2 ? '#ffe066' : '#8cf0ff';
  const innerCol = tier === 4 ? '#d83818' : tier === 2 ? '#d89620' : '#2b94ff';
  g.globalAlpha = Math.min(1, fade * 1.08);
  // 1px dark arcade outline pass
  g.fillStyle = '#09070d';
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, ang = face + lo + (hi - lo) * u;
    const taper = Math.sin(u * Math.PI);
    const thick = (R1 - R0) * (0.20 + 0.80 * taper);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (const rr of [R1 - thick - PX, R1 + PX]) {
      const px = Math.round((cx + ca * rr) / PX) * PX;
      const py = Math.round((cy + sa * rr) / PX) * PX;
      g.fillRect(px, py, PX * 2, PX * 2);
    }
  }
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, ang = face + lo + (hi - lo) * u;
    const taper = Math.sin(u * Math.PI); // crescent taper at tips!
    const thick = (R1 - R0) * (0.20 + 0.80 * taper);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let r = R1 - thick; r <= R1; r += PX) {
      const f = (r - (R1 - thick)) / Math.max(1, thick);
      g.fillStyle = f > 0.68 ? outerCol : f > 0.34 ? midCol : innerCol;
      const px = Math.round((cx + ca * r) / PX) * PX;
      const py = Math.round((cy + sa * r) / PX) * PX;
      g.fillRect(px, py, PX * 2, PX * 2);
    }
  }
  g.restore();
}

// ---------------- SPIKY STREETS OF RAGE HIT SPARKS ----------------
function spawnPixelHitSpark(x, y, scale = 1) {
  if (!isPixelMode()) return;
  F.pxSparks = F.pxSparks || [];
  F.pxSparks.push({ x, y, t: 0, dur: 0.2, scale, rot: rand(-0.35, 0.35) });
}

function drawPixelSparks(g) {
  if (!F.pxSparks || !F.pxSparks.length) return;
  F.pxSparks = F.pxSparks.filter(s => { s.t += 1 / 60; return s.t < s.dur; });
  for (const sp of F.pxSparks) {
    const u = sp.t / sp.dur;
    const sc = sp.scale * (0.75 + 0.55 * Math.sin(Math.min(1, u * 1.4) * Math.PI));
    const cx = Math.round(sp.x / PX) * PX, cy = Math.round(sp.y / PX) * PX;
    const rays = 9;
    // Outer orange/gold spiky burst, mid bright yellow burst, white hot center
    for (const [mul, col] of [[1.12, '#0b0810'], [1.0, '#ffa218'], [0.78, '#fff038'], [0.42, '#ffffff']]) {
      g.fillStyle = col;
      const R = 36 * sc * mul;
      for (let i = 0; i < rays * 2; i++) {
        const ang = sp.rot + (i * Math.PI) / rays;
        const len = (i % 2 === 0) ? R * (i % 4 === 0 ? 1.18 : 0.92) : R * 0.34;
        const steps = Math.max(2, Math.round(len / PX));
        for (let k = 0; k <= steps; k++) {
          const d = (k / steps) * len;
          const w = Math.max(1, Math.round((1 - k / steps) * 3 * sc));
          const px = Math.round((cx + Math.cos(ang) * d) / PX) * PX;
          const py = Math.round((cy + Math.sin(ang) * d) / PX) * PX;
          g.fillRect(px - PX, py - PX, w * PX, w * PX);
        }
      }
    }
  }
}

// ---------------- 16-BIT BOSS RENDERER (GNARLHORN) ----------------
function renderRigPixel(b, qTime) {
  const R = b.rig, im = b.rigImg;
  if (!R || !im || !im.complete || !im.naturalWidth) return null;
  const c = b.rigC, g = c.getContext('2d'), pad = b.rigPad;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  g.translate(pad, pad);

  let jo = 0.06 + 0.05 * Math.sin(qTime * 3);
  if (b.wind > 0) jo = 0.35 + 0.55 * (b.windP || 0.5);
  if (b.roar || b.inhale || b.intro > 0 || b.beaming > 0) jo = 1.15;
  if (b.dashing) jo = 0.95;
  if (b.strikeT > 0) {
    const su = 1 - b.strikeT / Math.max(b.strikeDur || 0.34, 0.01);
    jo = b.strikeKind === 'chomp' ? (su < 0.35 ? 1.2 : 0.02) : Math.max(jo, 0.95 * Math.sin(su * Math.PI));
  } else if (b.punch > 0) jo = Math.max(jo, 0.85 * b.punch / 0.28);
  if (b.hurtT > 0) jo = Math.max(jo, 0.6);
  if (b.stagger > 0) jo = 0.35 + 0.2 * Math.sin(qTime * 6);
  if (b.dead) jo = 0.9;
  b.jawOpen += (jo - b.jawOpen) * 0.45;

  if (!b.partPose || b.partPose.length !== R.parts.length) {
    b.partPose = R.parts.map(() => ({ a: 0, dx: 0, dy: 0, s: 1 }));
  }
  const rate = (b.strikeT > 0 || b.dashing || b.spin > 0) ? 0.55 : 0.38;
  const poses = R.parts.map((p, idx) => {
    if (p.t === 'jaw' || p.t === 'maw') return null;
    const tgt = rigPose(b, p, qTime);
    const cur = b.partPose[idx];
    cur.a += (tgt.a - cur.a) * rate;
    cur.dx += (tgt.dx - cur.dx) * rate;
    cur.dy += (tgt.dy - cur.dy) * rate;
    cur.s += (tgt.s - cur.s) * rate;
    return cur;
  });

  const drawPart = (p, q) => {
    g.save();
    g.translate(Math.round(p.px + q.dx), Math.round(p.py + q.dy));
    g.rotate(Math.round(q.a * 24) / 24);
    g.scale(q.s, q.s);
    g.drawImage(im, p.sx, p.sy, p.w, p.h, Math.round(p.ox - p.px), Math.round(p.oy - p.py), p.w, p.h);
    g.restore();
  };

  for (let i = 0; i < R.parts.length; i++) {
    const p = R.parts[i];
    if (p.z < 0 && poses[i]) drawPart(p, poses[i]);
  }
  g.drawImage(im, 0, 0, R.s, R.s, 0, 0, R.s, R.s);
  let headP = null, headQ = null;
  for (let i = 0; i < R.parts.length; i++) {
    const p = R.parts[i];
    if (p.z < 0) continue;
    if (p.t === 'jaw') {
      const q = { a: 0, dx: 0, dy: Math.round(b.jawOpen * p.h * 0.4), s: 1 };
      if (headP) {
        g.save();
        g.translate(Math.round(headP.px + headQ.dx), Math.round(headP.py + headQ.dy));
        g.rotate(Math.round(headQ.a * 24) / 24);
        g.scale(headQ.s, headQ.s);
        g.translate(-Math.round(headP.px), -Math.round(headP.py));
        drawPart(p, q);
        g.restore();
      } else drawPart(p, q);
      continue;
    }
    const q = poses[i];
    if (p.t === 'head') { headP = p; headQ = q; }
    drawPart(p, q);
  }
  return c;
}

function drawBossPixel(b) {
  syncBossPixelAssets(b);
  const g = ctx, S = b.r * 3.55;
  if (b.alpha <= 0.01 && !b.dead && b.intro <= 0) return;

  // Quantize boss animation clock to 12fps arcade frames
  const qt = Math.floor(b.at * 12) / 12;
  const moving = Math.min(1, b.vel / 160);
  let sx = 1, sy = 1, bob = 0;
  bob = -Math.round(Math.abs(Math.sin(qt * 7)) * 3 * moving) * PX;
  if (b.wind > 0) { const wp = b.windP || 0; sy *= 1 + 0.09 * wp; sx *= 1 - 0.05 * wp; }
  if (b.strikeT > 0) {
    const su = 1 - b.strikeT / Math.max(b.strikeDur || 0.34, 0.01), sw = Math.sin(su * Math.PI);
    sx *= 1 + 0.14 * sw; sy *= 1 - 0.08 * sw;
  } else if (b.punch > 0) {
    const k = b.punch / 0.28; sx *= 1 + 0.12 * k; sy *= 1 - 0.08 * k;
  }
  if (b.land > 0) { const k = b.land / 0.32; sx *= 1 + 0.2 * k; sy *= 1 - 0.18 * k; }
  if (b.stagger > 0) { sy *= 0.93; }

  const strikeLunge = b.strikeT > 0 ? Math.sin((1 - b.strikeT / Math.max(b.strikeDur || 0.34, 0.01)) * Math.PI) * b.r * 0.28 : 0;
  const jx = (b.wind > 0 ? (Math.floor(F.time * 24) % 2 ? PX : -PX) : 0) + Math.cos(b.face) * strikeLunge;
  const jy = Math.sin(b.face) * strikeLunge * 0.65;
  const reveal = b.intro > 0 ? clamp(1 - (b.intro - 0.25) / 1.4, 0, 1) : 1;
  const feetY = b.y + S * 0.25 + jy;

  // Pixel shadow & intro portal
  const shR = b.r * (1 - Math.min(0.5, b.air / 400));
  if (b.intro > 0 || b.dead) {
    drawPixelShadow(b.x, b.y + b.r * 0.2, b.r * 1.45, 0.9);
  }
  drawPixelShadow(b.x + jx * 0.5, b.y + jy * 0.5, shR * 1.08, 0.82 * (b.dead ? Math.max(0, 1 - b.deadT) : b.alpha));

  // Rasterize Gnarlhorn at true pixel resolution (216x216 -> 1px = PX world units!)
  const bc = _pxBossC, bg = bc.getContext('2d'), BW = bc.width, BH = bc.height;
  bg.setTransform(1, 0, 0, 1, 0, 0);
  bg.clearRect(0, 0, BW, BH);
  bg.imageSmoothingEnabled = false;

  const rc = b.rig ? renderRigPixel(b, qt) : null;
  const srcIm = rc || b.img;
  if (srcIm && (srcIm.width || srcIm.naturalWidth)) {
    const pad = srcIm.pad || 0;
    const drawPxS = (S / PX) * (1 + 2 * pad);
    const flip = b.flipT || 1;
    bg.save();
    bg.translate(BW / 2, BH * 0.78);
    bg.scale(flip * sx, sy);
    const top = (-0.85 * (S / PX)) - pad * (S / PX);
    const visH = drawPxS * reveal;
    if (reveal < 0.99) {
      bg.beginPath();
      bg.rect(-BW, top + drawPxS - visH, BW * 2, visH + 8);
      bg.clip();
    }
    bg.drawImage(srcIm, -drawPxS / 2, top, drawPxS, drawPxS);
    bg.restore();

    const flash = b.flash > 0.02 ? 'white' : (b.slowT > 0 && Math.floor(F.time * 8) % 2 === 0 ? 'ice' : (b.burnT > 0 && Math.floor(F.time * 10) % 2 === 0 ? 'burn' : null));
    crispOutlineBuffer(bg, BW, BH, flash);

    g.save();
    g.imageSmoothingEnabled = false;
    g.globalAlpha = b.dead ? Math.max(0, 1 - b.deadT / 2.6) : Math.max(b.alpha, b.intro > 0 ? 1 : 0);
    // Phase 2 crimson pixel aura flicker
    if (b.p2 && !b.dead && Math.floor(F.time * 12) % 2 === 0) {
      g.globalAlpha *= 0.98;
    }
    const wx = Math.round((b.x + jx - (BW / 2) * PX) / PX) * PX;
    const wy = Math.round((feetY - b.air + bob + (1 - reveal) * S * 0.35 - (BH * 0.78) * PX) / PX) * PX;
    g.drawImage(bc, wx, wy, BW * PX, BH * PX);
    g.restore();
  }

  // Pixelated boss claw strike arc
  if (!b.dead && b.strikeT > 0) {
    const dur = Math.max(b.strikeDur || 0.34, 0.01), u = clamp(1 - b.strikeT / dur, 0, 1), fade = Math.sin(u * Math.PI);
    if (fade > 0.05) {
      const ang = b.strikeAng != null ? b.strikeAng : b.face;
      const dir = (b.strikeSide || 1) >= 0 ? 1 : -1;
      const span = 1.45, center = ang + dir * (u - 0.45) * span * 0.85;
      drawPixelSlashArc(g, b.x + Math.cos(ang) * b.r * 0.2, b.y - b.r * 0.48 - b.air, center, -span * 0.5, span * 0.5, b.r * 1.1, b.r * 1.85, fade, 4);
    }
  }

  // Pixelated ✦ telegraph sparkle cue (preserves exact dodge timing rule!)
  if (b.sparkT > 0) {
    const k = b.sparkT / 0.32;
    const sxp = Math.round((b.x + Math.cos(b.face) * b.r * 0.4) / PX) * PX;
    const syp = Math.round((b.y - b.air - b.r * 1.05) / PX) * PX;
    const arm = Math.round((10 + (1 - k) * 8)) * PX;
    g.save();
    g.fillStyle = '#0b0810';
    g.fillRect(sxp - arm - PX, syp - PX * 2, arm * 2 + PX * 2, PX * 4);
    g.fillRect(sxp - PX * 2, syp - arm - PX, PX * 4, arm * 2 + PX * 2);
    g.fillStyle = '#ffe84a';
    g.fillRect(sxp - arm, syp - PX, arm * 2, PX * 2);
    g.fillRect(sxp - PX, syp - arm, PX * 2, arm * 2);
    g.fillRect(sxp - PX * 4, syp - PX * 4, PX * 8, PX * 8);
    g.fillStyle = '#ffffff';
    g.fillRect(sxp - Math.round(arm * 0.65), syp - PX, Math.round(arm * 1.3), PX * 2);
    g.fillRect(sxp - PX, syp - Math.round(arm * 0.65), PX * 2, Math.round(arm * 1.3));
    g.restore();
  }

  // Pixelated stagger dizzy stars
  if (b.stagger > 0) {
    for (let i = 0; i < 3; i++) {
      const a = qt * 4.5 + (i * TAU) / 3;
      const sxp = Math.round((b.x + Math.cos(a) * b.r * 0.8) / PX) * PX;
      const syp = Math.round((b.y - b.r * 1.9 + Math.sin(a) * 12) / PX) * PX;
      g.fillStyle = '#0b0810'; g.fillRect(sxp - PX * 3, syp - PX * 3, PX * 6, PX * 6);
      g.fillStyle = '#ffd838'; g.fillRect(sxp - PX * 2, syp - PX, PX * 4, PX * 2); g.fillRect(sxp - PX, syp - PX * 2, PX * 2, PX * 4);
      g.fillStyle = '#ffffff'; g.fillRect(sxp - PX, syp - PX, PX * 2, PX * 2);
    }
  }
}

// ---------------- PIXEL PARTICLES & FLOATING DAMAGE NUMBERS ----------------
function drawPixelFx() {
  const g = ctx;
  g.save();
  for (const p of F.fx) {
    const a = 1 - p.t / p.life;
    if (a <= 0.05) continue;
    g.globalAlpha = a > 0.5 ? 1 : 0.55;
    const sz = Math.max(1, Math.round((p.size * 1.35) / PX)) * PX;
    const px = Math.round(p.x / PX) * PX, py = Math.round(p.y / PX) * PX;
    g.fillStyle = '#0b0810';
    g.fillRect(px - PX, py - PX, sz + PX * 2, sz + PX * 2);
    g.fillStyle = p.col;
    g.fillRect(px, py, sz, sz);
  }
  g.globalAlpha = 1;
  drawPixelSparks(g);
  for (const t of F.texts) {
    const sc = Math.max(2, Math.round(t.size / 9));
    g.globalAlpha = t.t < 0.7 ? 1 : Math.max(0, (1 - t.t) / 0.3);
    const clean = String(t.text).replace(/[^\x20-\x7E]/g, '').trim() || '!';
    drawPxText(g, clean, t.x, t.y - sc * 4, sc, '#ffffff', t.col, 'center', '#09070d');
  }
  g.globalAlpha = 1;
  g.restore();
}

// ---------------- CLASSIC STREETS OF RAGE 2 TOP ARCADE HUD ----------------
function ensureHeroPortrait() {
  if (_pxPortReady) return _pxPortHero;
  _pxPortReady = true;
  const g = _pxPortHero.getContext('2d');
  g.imageSmoothingEnabled = false;
  // Deep arcade blue portrait background
  g.fillStyle = '#182446'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#243668'; g.fillRect(2, 2, 28, 12);
  // Red plume
  g.fillStyle = '#981020'; g.fillRect(4, 3, 12, 6);
  g.fillStyle = '#e82234'; g.fillRect(5, 2, 11, 5);
  // Pauldrons & cape shoulders
  g.fillStyle = '#b81828'; g.fillRect(4, 21, 24, 11);
  g.fillStyle = '#6c7c92'; g.fillRect(6, 22, 20, 10);
  g.fillStyle = '#aebcd0'; g.fillRect(8, 22, 15, 7);
  g.fillStyle = '#c81d2e'; g.fillRect(9, 20, 14, 3);
  g.fillStyle = '#ffd24a'; g.fillRect(10, 21, 3, 3);
  // Visored knight helmet
  g.fillStyle = '#0b0810'; g.fillRect(9, 6, 15, 15);
  g.fillStyle = '#6c7c92'; g.fillRect(10, 7, 13, 13);
  g.fillStyle = '#aebcd0'; g.fillRect(11, 7, 11, 10);
  g.fillStyle = '#e8f0fa'; g.fillRect(12, 8, 7, 4);
  // Visor slit & glowing cyan eyes
  g.fillStyle = '#0b0810'; g.fillRect(14, 12, 9, 3);
  g.fillStyle = '#5ef6ff'; g.fillRect(15, 13, 3, 2); g.fillRect(20, 13, 2, 2);
  // Vertical mouthguard vents
  g.fillStyle = '#263040';
  g.fillRect(15, 16, 1, 3); g.fillRect(17, 16, 1, 3); g.fillRect(19, 16, 1, 3); g.fillRect(21, 16, 1, 3);
  return _pxPortHero;
}

function drawPixelFrameBox(g, x, y, w, h, p) {
  g.fillStyle = '#09070d'; g.fillRect(x - p, y - p, w + p * 2, h + p * 2);
  g.fillStyle = '#cfd8e6'; g.fillRect(x, y, w, h);
  g.fillStyle = '#586376'; g.fillRect(x + p, y + p, w - p, h - p);
  g.fillStyle = '#181c26'; g.fillRect(x + p * 2, y + p * 2, w - p * 4, h - p * 4);
}

function drawPixelTogglePill(g, s) {
  if (!F || !F.b || !isPixelSupported(F.b.id) || !BTNS.pixel) return;
  const B = BTNS.pixel, on = isPixelPref();
  const p = Math.max(2, Math.round(2 * s));
  const w = Math.round(166 * s), h = Math.round(30 * s);
  const x = Math.round(B.x - w / 2), y = Math.round(B.y - h / 2);
  g.save();
  g.fillStyle = '#09070d';
  g.fillRect(x - p, y - p, w + p * 2, h + p * 2);
  g.fillStyle = on ? '#e8b838' : '#6c768a';
  g.fillRect(x, y, w, h);
  g.fillStyle = on ? '#2a1c0e' : '#1b1e28';
  g.fillRect(x + p, y + p, w - p * 2, h - p * 2);
  drawPxText(
    g,
    on ? '16-BIT: ON [V]' : '16-BIT: OFF [V]',
    B.x,
    y + Math.round((h - 7 * p) / 2),
    p,
    on ? '#84ff7a' : '#dce4f0',
    on ? '#32c848' : '#8e99ad',
    'center',
    '#09070d'
  );
  g.restore();
}

function drawHUDPixel() {
  const g = ctx, P = F.p, b = F.b, s = clamp(Math.min(SW, SH) / 800, 0.75, 1.25);
  const p = Math.max(2, Math.round(2.2 * s));
  g.save();
  g.imageSmoothingEnabled = false;

  // -------- 1. TOP-LEFT: MIKKEL PORTRAIT + GREEN ARCADE HP BAR --------
  const portS = Math.round(54 * s);
  const lx = Math.round(16 * s), ly = Math.round(14 * s);
  drawPixelFrameBox(g, lx, ly, portS, portS, p);
  g.drawImage(ensureHeroPortrait(), lx + p * 2, ly + p * 2, portS - p * 4, portS - p * 4);

  const barX = lx + portS + p * 3;
  const barW = Math.round(Math.min(SW * (SW < 640 ? 0.19 : 0.28), 300 * s));
  const barH = Math.round(22 * s);
  P.ghostHp = P.ghostHp == null ? P.hp : P.ghostHp + (P.hp - P.ghostHp) * 0.06;

  drawPixelFrameBox(g, barX, ly, barW, barH, p);
  const inX = barX + p * 2, inY = ly + p * 2, inW = barW - p * 4, inH = barH - p * 4;
  // Damage ghost bar
  if (P.ghostHp > P.hp) {
    g.fillStyle = '#d83828';
    g.fillRect(inX, inY, Math.round(inW * clamp(P.ghostHp / P.maxHp, 0, 1)), inH);
  }
  // Bright green Streets of Rage HP fill
  const hpW = Math.round(inW * clamp(P.hp / P.maxHp, 0, 1));
  if (hpW > 0) {
    g.fillStyle = '#2ec840'; g.fillRect(inX, inY, hpW, inH);
    g.fillStyle = '#86ff7a'; g.fillRect(inX, inY, hpW, Math.max(p, Math.round(inH * 0.32)));
    g.fillStyle = '#188428'; g.fillRect(inX, inY + inH - p, hpW, p);
  }

  // Compact stamina bar right below HP bar
  const stY = ly + barH + p * 2, stW = Math.round(barW * 0.68), stH = Math.round(9 * s);
  g.fillStyle = '#09070d'; g.fillRect(barX - p, stY - p, stW + p * 2, stH + p * 2);
  g.fillStyle = '#1a202c'; g.fillRect(barX, stY, stW, stH);
  const stFill = Math.round(stW * clamp(P.st / P.stMax, 0, 1));
  if (stFill > 0) {
    g.fillStyle = P.st < 20 ? '#c88828' : '#38d8ff';
    g.fillRect(barX, stY, stFill, stH);
  }

  // 'MIKKEL' arcade label + potion counter under portrait/bar
  const txtS = Math.max(2, Math.round(2.5 * s));
  drawPxText(g, HERO_NAME, barX, stY + stH + p * 3, txtS, '#ffffff', '#c4d0e2', 'left');

  // Pixel potion flask icon + count under portrait
  const pxPotX = lx + p, pxPotY = ly + portS + p * 3;
  g.fillStyle = '#09070d'; g.fillRect(pxPotX, pxPotY, p * 5, p * 7);
  g.fillStyle = '#dce8f8'; g.fillRect(pxPotX + p, pxPotY, p * 3, p * 2);
  g.fillStyle = '#3ee060'; g.fillRect(pxPotX + p, pxPotY + p * 2, p * 3, p * 4);
  drawPxText(g, 'x' + P.flasks, pxPotX + p * 6, pxPotY + p, Math.max(2, Math.round(2.1 * s)), '#ffe868', '#d89828', 'left');

  // -------- 2. TOP-CENTER: CLASSIC ARCADE TIMER + 16-BIT TOGGLE --------
  const sec = Math.max(0, Math.floor(F.time));
  const mm = Math.floor(sec / 60), ss = String(sec % 60).padStart(2, '0');
  drawPxText(g, 'TIME', SW / 2, ly + p, Math.max(2, Math.round(2.4 * s)), '#ffe858', '#d89218', 'center');
  drawPxText(g, `${mm}:${ss}`, SW / 2, ly + p + Math.round(22 * s), Math.max(2, Math.round(2.8 * s)), '#ffffff', '#cfd8e8', 'center');
  drawPixelTogglePill(g, s);

  // -------- 3. TOP-RIGHT: GNARLHORN PORTRAIT + SEGMENTED RED BOSS BAR --------
  // Leave room on the far right for BTNS.pause (at SW - 42)
  const rxPort = SW - Math.round(82 * s) - portS;
  drawPixelFrameBox(g, rxPort, ly, portS, portS, p);
  g.fillStyle = '#381018';
  g.fillRect(rxPort + p * 2, ly + p * 2, portS - p * 4, portS - p * 4);
  const pxBossIm = img('a/m27_px.webp');
  if (pxBossIm && pxBossIm.complete && pxBossIm.naturalWidth) {
    // Crop Gnarlhorn's menacing horned pixel head for the portrait box!
    g.drawImage(pxBossIm, 132, 64, 236, 210, rxPort + p * 2, ly + p * 2, portS - p * 4, portS - p * 4);
  }

  const bBarW = Math.round(Math.min(SW * (SW < 640 ? 0.19 : 0.30), 320 * s));
  const bBarX = rxPort - p * 3 - bBarW;
  b.ghostHp = b.ghostHp == null ? b.hp : b.ghostHp + (b.hp - b.ghostHp) * 0.05;
  drawPixelFrameBox(g, bBarX, ly, bBarW, barH, p);
  const binX = bBarX + p * 2, binY = ly + p * 2, binW = bBarW - p * 4, binH = barH - p * 4;
  if (b.ghostHp > b.hp) {
    g.fillStyle = '#ffbe58';
    g.fillRect(binX + Math.round(binW * (1 - clamp(b.ghostHp / b.maxHp, 0, 1))), binY, Math.round(binW * clamp(b.ghostHp / b.maxHp, 0, 1)), binH);
  }
  const bFillW = Math.round(binW * clamp(b.hp / b.maxHp, 0, 1));
  if (bFillW > 0) {
    const startX = binX + (binW - bFillW); // drains toward the portrait on the right, arcade-style!
    g.fillStyle = '#d82424'; g.fillRect(startX, binY, bFillW, binH);
    g.fillStyle = '#ff6e58'; g.fillRect(startX, binY, bFillW, Math.max(p, Math.round(binH * 0.32)));
    g.fillStyle = '#841014'; g.fillRect(startX, binY + binH - p, bFillW, p);
  }
  // Classic Streets of Rage vertical segment dividers across boss HP bar!
  const segs = 12;
  g.fillStyle = '#181c26';
  for (let i = 1; i < segs; i++) {
    g.fillRect(binX + Math.round((binW * i) / segs), binY, p, binH);
  }

  // Boss yellow stagger bar underneath
  const poY = ly + barH + p * 2, poH = Math.round(8 * s);
  g.fillStyle = '#09070d'; g.fillRect(bBarX - p, poY - p, bBarW + p * 2, poH + p * 2);
  g.fillStyle = '#1a202c'; g.fillRect(bBarX, poY, bBarW, poH);
  const poFill = Math.round(bBarW * clamp(b.poise / b.poiseMax, 0, 1));
  if (poFill > 0) {
    g.fillStyle = b.stagger > 0 ? '#ffffff' : '#f4c430';
    g.fillRect(bBarX + (bBarW - poFill), poY, poFill, poH);
  }
  drawPxText(g, b.name, rxPort - p * 3, poY + poH + p * 3, txtS, '#ffffff', '#e0b8b8', 'right');

  // -------- 4. PIXEL-BORDERED ACTION BUTTONS --------
  for (const k in BTNS) {
    if (k === 'pixel') continue;
    const B = BTNS[k]; let dim = false, extra = '';
    if (k === 'heal') { extra = String(P.flasks); dim = P.flasks <= 0; }
    if (k === 'spirit') { if (!SAVE.equip.spirit) continue; dim = F.spiritUsed; }
    if ((k === 'atk' || k === 'roll') && P.st <= 0) dim = true;
    const br = Math.round(B.r), bx = Math.round(B.x - br), by = Math.round(B.y - br), bs = br * 2;
    g.save();
    g.globalAlpha = dim ? 0.32 : (INPUT.btn[k] ? 0.96 : 0.72);
    g.fillStyle = '#09070d'; g.fillRect(bx - p, by - p, bs + p * 2, bs + p * 2);
    g.fillStyle = k === 'atk' ? '#e8b838' : '#9aa8be'; g.fillRect(bx, by, bs, bs);
    g.fillStyle = k === 'atk' ? '#8c1e1e' : '#1e2436'; g.fillRect(bx + p, by + p, bs - p * 2, bs - p * 2);
    g.globalAlpha = dim ? 0.4 : 1;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(B.r * 0.78)}px sans-serif`;
    g.fillText(B.icon, B.x, B.y - (B.label ? B.r * 0.14 : 0));
    if (B.label) drawPxText(g, B.label, B.x, B.y + B.r * 0.42, Math.max(1, Math.round(1.6 * s)), '#ffffff', '#ffd868', 'center');
    if (extra) drawPxText(g, extra, B.x + B.r * 0.58, B.y + B.r * 0.42, Math.max(2, Math.round(2 * s)), '#84ff7a', '#2ec840', 'center');
    if (INPUT.kb && B.key) drawPxText(g, B.key, B.x, by - p * 6, Math.max(1, Math.round(1.4 * s)), '#ffe888', '#d8a030', 'center');
    g.restore();
  }

  // Touch joystick / keyboard hint in pixel style
  if (INPUT.joy) {
    const j = INPUT.joy, R = Math.round(64 * s), kr = Math.round(24 * s);
    g.save();
    g.globalAlpha = 0.55;
    drawPixelFrameBox(g, Math.round(j.ox - R), Math.round(j.oy - R), R * 2, R * 2, p);
    g.globalAlpha = 0.9;
    g.fillStyle = '#09070d'; g.fillRect(Math.round(j.x - kr - p), Math.round(j.y - kr - p), kr * 2 + p * 2, kr * 2 + p * 2);
    g.fillStyle = '#e8b838'; g.fillRect(Math.round(j.x - kr), Math.round(j.y - kr), kr * 2, kr * 2);
    g.fillStyle = '#fff2b0'; g.fillRect(Math.round(j.x - kr + p * 2), Math.round(j.y - kr + p * 2), kr * 2 - p * 4, p * 3);
    g.restore();
  } else if (INPUT.kb) {
    g.save(); g.globalAlpha = 0.72;
    drawPxText(g, 'MOVE: WASD / ARROWS', Math.round(18 * s), SH - Math.round(26 * s), Math.max(1, Math.round(1.6 * s)), '#ffffff', '#9aa8be', 'left');
    g.restore();
  }

  // -------- 5. STAGE INTRO BANNER / YOU DIED --------
  if (F.banner) {
    const B = F.banner, a = Math.min(1, B.t / 0.25, (B.dur - B.t) / 0.4);
    if (a > 0.04) {
      const gy = Math.round(SH * 0.34), bh = Math.round(86 * s);
      g.save();
      g.globalAlpha = a > 0.5 ? 0.92 : a * 1.6;
      g.fillStyle = '#09070d'; g.fillRect(0, gy - bh / 2 - p, SW, bh + p * 2);
      g.fillStyle = '#e8b838'; g.fillRect(0, gy - bh / 2, SW, p * 2); g.fillRect(0, gy + bh / 2 - p * 2, SW, p * 2);
      g.fillStyle = '#1a1224'; g.fillRect(0, gy - bh / 2 + p * 2, SW, bh - p * 4);
      const cleanT = String(B.text).replace(/[^\x20-\x7E]/g, '').trim();
      drawPxText(g, cleanT, SW / 2, gy - (B.sub ? Math.round(24 * s) : Math.round(12 * s)), Math.max(3, Math.round(4.2 * s)), '#ffe858', '#e07a18', 'center');
      if (B.sub) {
        const cleanSub = String(B.sub).replace(/[^\x20-\x7E]/g, '').trim();
        drawPxText(g, cleanSub, SW / 2, gy + Math.round(12 * s), Math.max(2, Math.round(2.1 * s)), '#ffffff', '#b0bed4', 'center');
      }
      g.restore();
    }
  }

  if (F.over && F.result === 'lose' && F.overT > 0.6) {
    const gy = Math.round(SH / 2), bh = Math.round(104 * s);
    g.fillStyle = 'rgba(9,7,13,0.82)'; g.fillRect(0, gy - bh / 2, SW, bh);
    drawPxText(g, 'GAME OVER', SW / 2, gy - Math.round(20 * s), Math.max(4, Math.round(6 * s)), '#ff4838', '#8c1018', 'center');
  }

  g.restore();
}
