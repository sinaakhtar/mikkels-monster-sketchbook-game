// ===== Lairs: floors, lighting, ambient life and interactive objects =====
'use strict';
// Object kinds:
//  pillar — solid; blocks shots & beams; a charging monster that hits it gets dizzy (2 crashes break it)
//  barrel — hit it → explodes after a second (variants: fire, confetti, gas, bees, mine, ink)
//  drop   — something hanging from the ceiling; hit its lever to drop it on the monster
//  shrine — hit it to give your weapon an element for 12s
//  heal   — walk over it to heal; regrows
//  mud    — slows everyone who stands in it
const LAIRS = [
  { style: 'dungeon', dark: 0.5, tint: '16,6,4', rim: '#4a3a30', amb: 'dust', torch: 'torch',
    torches: [[300, 0], [900, 0], [300, 760], [900, 760], [0, 200], [1200, 560]],
    objects: [] },
  { style: 'toybox', dark: 0.3, tint: '12,4,26', rim: '#5a3a6a', amb: 'sparkle', torch: 'nightlight',
    torches: [[200, 0], [1000, 0], [0, 600], [1200, 600]],
    objects: [] },
  { style: 'swamp', dark: 0.45, tint: '4,14,8', rim: '#2f3a22', amb: 'bubble', torch: 'lantern',
    torches: [[150, 0], [1050, 0], [600, 760]],
    objects: [] },
  { style: 'forest', dark: 0.55, tint: '4,8,24', rim: '#22301e', amb: 'firefly', torch: 'moon',
    torches: [[600, 380, 640]],
    objects: [] },
  { style: 'depths', dark: 0.5, tint: '0,14,32', rim: '#1a3a4a', amb: 'bubble2', torch: 'jelly',
    torches: [[150, 100], [1050, 100], [150, 660], [1050, 660]],
    objects: [] },
  { style: 'nightmare', dark: 0.55, tint: '20,0,8', rim: '#3a1a24', amb: 'ember', torch: 'candle',
    torches: [[0, 120], [1200, 120], [0, 640], [1200, 640], [600, 0]],
    objects: [] },
];
// Objects only appear in fights designed around them (by boss id).
const LAIR_EXTRA = {
  // chargers: dodge at the last second with a pillar BEHIND you and they crash
  m27: [ { k: 'pillar', x: 330, y: 400 }, { k: 'pillar', x: 870, y: 400 } ],                                   // Gnarlhorn — teaches the trick
  h6:  [ { k: 'pillar', x: 600, y: 420 } ],                                                                     // Uncle Hydra
  m30: [ { k: 'pillar', x: 300, y: 380 }, { k: 'pillar', x: 900, y: 380 }, { k: 'drop', x: 600, y: 330, lx: 70, ly: 330 }, { k: 'heal', x: 600, y: 120 } ], // King Rotcrown's throne room
  m40: [ { k: 'pillar', x: 380, y: 300 }, { k: 'mud', x: 820, y: 470, r: 120 } ],                              // Muckhound
  n1:  [ { k: 'pillar', x: 350, y: 300 }, { k: 'pillar', x: 850, y: 470 } ],                                   // Moonclaw
  n21: [ { k: 'pillar', x: 600, y: 400 } ],                                                                     // Deskcrawler
  // swallowers: hit a barrel WHILE it's sucking you in and it swallows the bomb
  m34: [ { k: 'barrel', x: 400, y: 380, v: 'fire' }, { k: 'barrel', x: 800, y: 380, v: 'fire' } ],             // Gulpus
  m38: [ { k: 'barrel', x: 600, y: 380, v: 'confetti' } ],                                                       // Mr. Snuggles
  n20: [ { k: 'barrel', x: 420, y: 330, v: 'mine' }, { k: 'barrel', x: 780, y: 330, v: 'mine' } ],             // Voidbelly
  // drop it on their heads — but only while they're busy attacking
  n23: [ { k: 'drop', x: 600, y: 380, lx: 1130, ly: 380 } ],                                                    // Bonebrute
  n8:  [ { k: 'drop', x: 600, y: 360, lx: 70, ly: 360 }, { k: 'shrine', x: 1120, y: 120, e: 'ice' } ],         // Octomikk (weak to ice)
  n9:  [ { k: 'drop', x: 600, y: 400, lx: 600, ly: 728 }, { k: 'barrel', x: 150, y: 300, v: 'bees' } ],        // Emberwing
  // swamp kings
  n25: [ { k: 'mud', x: 330, y: 420, r: 130 }, { k: 'mud', x: 880, y: 330, r: 120 }, { k: 'barrel', x: 600, y: 160, v: 'gas' }, { k: 'heal', x: 600, y: 700 } ], // Rotgut
  m37: [ { k: 'mud', x: 600, y: 380, r: 140 } ],                                                                 // Shellrot spins slower in mud
  // element shrines where the weakness matters
  m28: [ { k: 'shrine', x: 80, y: 380, e: 'fire' } ],                                                            // Tri-Skull Butcher (weak to fire)
  m31: [ { k: 'shrine', x: 1120, y: 380, e: 'ice' }, { k: 'heal', x: 80, y: 380 } ],                           // Hooky (weak to ice)
  // the finale
  m39: [ { k: 'drop', x: 400, y: 330, lx: 50, ly: 330 }, { k: 'drop', x: 800, y: 330, lx: 1150, ly: 330 }, { k: 'pillar', x: 600, y: 520 }, { k: 'heal', x: 600, y: 110 } ],
};
const LAIR_NAMES = {
  pillar: { dungeon: 'Stone pillars', toybox: 'Toy block towers', swamp: 'Dead trees', forest: 'Big trees', depths: 'Coral', nightmare: 'Bookshelves' },
  barrel: { fire: 'Powder kegs', confetti: 'Surprise boxes', gas: 'Gas bulbs', bees: 'Beehives', mine: 'Sea mines', ink: 'Ink pots' },
  drop: { dungeon: 'Chandelier', toybox: 'Toy mobile', forest: 'Hanging log', depths: 'Anchor', nightmare: 'Chandeliers' },
  shrine: { fire: 'Fire brazier', ice: 'Snow globe', spark: 'Lightning lamp' },
  heal: 'Heart flower', mud: 'Sticky mud',
};
const LAIR_ICON = { pillar: '🪨', barrel: '💥', drop: '⬇️', shrine: '✨', heal: '💚', mud: '🟫' };
function lairInfo(region, bossId) {
  const L = LAIRS[region], objs = L.objects.concat(LAIR_EXTRA[bossId] || []), seen = new Set(), out = [];
  for (const o of objs) {
    const key = o.k + (o.v || o.e || ''); if (seen.has(key)) continue; seen.add(key);
    let name, desc;
    switch (o.k) {
      case 'pillar': name = LAIR_NAMES.pillar[L.style]; desc = 'Block shots and beams. Make a charging monster CRASH into one — it gets dizzy!'; break;
      case 'barrel': name = LAIR_NAMES.barrel[o.v]; desc = { fire: 'Hit one, then RUN — it explodes and sets the monster on fire.', confetti: 'Hit one, then run — the blast makes monsters dizzy fast.', gas: 'Hit one to release poison gas. Keep the monster in it!', bees: 'Hit one and angry bees chase the monster!', mine: 'Hit one, then run — BIG explosion.', ink: 'Hit one — the ink splash slows the monster down.' }[o.v]; break;
      case 'drop': name = LAIR_NAMES.drop[L.style]; desc = 'Hit the lever to drop it! Wait until the monster stands in the shadow.'; break;
      case 'shrine': name = LAIR_NAMES.shrine[o.e]; desc = `Hit it to give your weapon ${ELEM[o.e]} power for 12 seconds.`; break;
      case 'heal': name = LAIR_NAMES.heal; desc = 'Walk over it to heal. It grows back after a while.'; break;
      case 'mud': name = LAIR_NAMES.mud; desc = 'Slows down everyone — trap the monster in it!'; break;
    }
    out.push({ icon: o.k === 'barrel' ? '💥' : LAIR_ICON[o.k], name, desc });
  }
  return out;
}

// ---------------- BUILD ----------------
function seeded(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }
function buildLair(region, bossId) {
  const L = LAIRS[region], flip = Math.random() < 0.5, fx = x => flip ? AW - x : x;
  F.lair = L; F.flashes = []; F.bees = []; F.amb = [];
  F.objs = L.objects.concat(LAIR_EXTRA[bossId] || []).map(o => {
    const n = Object.assign({}, o, { x: fx(o.x), y: o.y, tm: 0, state: 'idle', cd: 0, sh: 0 });
    // keep things out from under the thumb controls in the bottom corners
    if (o.k !== 'mud' && n.y > 540 && (n.x > 920 || n.x < 280)) n.y = 510;
    if (o.k === 'drop' && o.ly > 540 && (fx(o.lx) > 920 || fx(o.lx) < 280)) n.ly = 510; else if (o.k === 'drop') n.ly = o.ly;
    n.ox = n.x; n.oy = n.y;
    n.r = { pillar: 40, barrel: 25, drop: 115, shrine: 28, heal: 26, mud: o.r || 120 }[o.k];
    if (o.k === 'pillar') n.hp = 2;
    if (o.k === 'drop') { n.state = 'hang'; n.lx = fx(o.lx); n.lr = 24; }
    n.ox = n.x; n.oy = n.y;
    return n;
  });
  F.torches = (L.torches || []).map(t => ({ x: fx(t[0]), y: t[1], r: t[2] || 260, ph: Math.random() * 10 }));
  F.floorC = renderFloor(L, region * 1000 + hashStr(bossId));
  F.lightC = document.createElement('canvas'); F.lightC.width = AW / 2; F.lightC.height = AH / 2;
  pushSolids(F.p, F.p.r); pushSolids(F.b, F.b.r * 0.7);
}

// ---------------- FLOORS (pre-rendered once per fight) ----------------
function renderFloor(L, seed) {
  const c = document.createElement('canvas'); c.width = AW; c.height = AH; const g = c.getContext('2d'), R = seeded(seed);
  const blob = (x, y, r, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); for (let i = 0; i <= 12; i++) { const an = i / 12 * TAU, rr = r * (0.75 + R() * 0.4); i ? g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr) : g.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } g.fill(); g.globalAlpha = 1; };
  switch (L.style) {
    case 'dungeon': {
      g.fillStyle = '#1c1715'; g.fillRect(0, 0, AW, AH);
      for (let y = 0; y < AH; y += 76) for (let x = (y / 76) % 2 ? -38 : 0; x < AW; x += 76) {
        const s = 46 + R() * 18; g.fillStyle = `rgb(${s},${s * 0.9 | 0},${s * 0.82 | 0})`; g.fillRect(x + 2, y + 2, 72, 72);
        g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(x + 2, y + 2, 72, 4);
        if (R() < 0.25) { g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.beginPath(); let cx = x + R() * 72, cy = y + R() * 72; g.moveTo(cx, cy); for (let i = 0; i < 4; i++) { cx += rand(-18, 18); cy += rand(-18, 18); g.lineTo(cx, cy); } g.stroke(); }
      }
      for (let i = 0; i < 25; i++) blob(R() * AW, R() * AH, 10 + R() * 30, '#3a5a2a', 0.25);
      for (let i = 0; i < 6; i++) blob(R() * AW, R() * AH, 14 + R() * 20, '#4a0a08', 0.3);
      g.strokeStyle = 'rgba(230,220,200,0.55)'; g.lineCap = 'round';
      for (let i = 0; i < 14; i++) { const x = R() * AW, y = R() * AH, a = R() * TAU, l = 10 + R() * 14; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      break;
    }
    case 'toybox': {
      for (let y = 0; y < AH; y += 44) { const s = 70 + R() * 20; g.fillStyle = `rgb(${s + 30},${s * 0.7 | 0},${s * 0.45 | 0})`; g.fillRect(0, y, AW, 42); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 42, AW, 2);
        for (let x = R() * 300; x < AW; x += 240 + R() * 200) { g.fillRect(x, y, 2, 42); } }
      const cols = ['#6a1f3a', '#c99a4a', '#2a4a8a', '#6a1f3a', '#3a7a5a'];
      for (let i = 0; i < 5; i++) { g.fillStyle = cols[i]; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(AW / 2, AH / 2, 430 - i * 75, 290 - i * 52, 0, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      const bc = ['#e04040', '#3a7ae0', '#e0c030', '#40b060'];
      for (let i = 0; i < 18; i++) { const x = R() * AW, y = R() * AH, s = 14 + R() * 10; g.save(); g.translate(x, y); g.rotate(R() * 1.5); g.fillStyle = bc[i % 4]; g.fillRect(-s / 2, -s / 2, s, s); g.fillStyle = '#fff'; g.font = `bold ${s * 0.7}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ABCXYZ'[i % 6], 0, 1); g.restore(); }
      for (let i = 0; i < 10; i++) { g.strokeStyle = bc[i % 4]; g.globalAlpha = 0.4; g.lineWidth = 3; g.beginPath(); let x = R() * AW, y = R() * AH; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += rand(-30, 30); y += rand(-30, 30); g.lineTo(x, y); } g.stroke(); }
      g.globalAlpha = 1; break;
    }
    case 'swamp': {
      g.fillStyle = '#26301c'; g.fillRect(0, 0, AW, AH);
      for (let i = 0; i < 90; i++) blob(R() * AW, R() * AH, 20 + R() * 60, R() < 0.5 ? '#1c2614' : '#34402a', 0.5);
      for (let i = 0; i < 7; i++) { const x = R() * AW, y = R() * AH, r = 50 + R() * 70; blob(x, y, r, '#16302e', 0.8); g.strokeStyle = 'rgba(140,180,150,0.15)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, r * 0.6, r * 0.35, 0, 0, TAU); g.stroke();
        for (let j = 0; j < 3; j++) { const px = x + rand(-r * 0.5, r * 0.5), py = y + rand(-r * 0.4, r * 0.4); g.fillStyle = '#3a6a2a'; g.beginPath(); g.arc(px, py, 10, 0.3, TAU - 0.3); g.lineTo(px, py); g.fill(); } }
      g.strokeStyle = '#4a5a2a'; g.lineWidth = 2;
      for (let i = 0; i < 30; i++) { const x = R() * AW, y = R() * AH; for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(x + j * 3, y); g.lineTo(x + j * 3 + rand(-6, 6), y - 18 - R() * 16); g.stroke(); } }
      break;
    }
    case 'forest': {
      g.fillStyle = '#1c2e1a'; g.fillRect(0, 0, AW, AH);
      g.strokeStyle = '#3a2a1a'; g.globalAlpha = 0.7; g.lineWidth = 90; g.lineCap = 'round'; g.beginPath(); g.moveTo(-50, AH * 0.75); g.bezierCurveTo(300, AH * 0.4, 800, AH * 0.95, AW + 50, AH * 0.3); g.stroke(); g.globalAlpha = 1;
      for (let i = 0; i < 2200; i++) { const x = R() * AW, y = R() * AH, s = 30 + R() * 50; g.strokeStyle = `rgba(${s * 0.6 | 0},${s + 30 | 0},${s * 0.5 | 0},0.5)`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-3, 3), y - 5 - R() * 7); g.stroke(); }
      const lc = ['#8a4a1a', '#a06a2a', '#6a2a14', '#b08a3a'];
      for (let i = 0; i < 80; i++) { g.fillStyle = lc[i % 4]; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(R() * AW, R() * AH, 6, 3, R() * 3, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.strokeStyle = '#2a1a0e'; g.lineWidth = 7;
      for (let i = 0; i < 9; i++) { g.beginPath(); let x = R() * AW, y = R() * AH; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += rand(-50, 50); y += rand(-30, 30); g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 12; i++) { const x = R() * AW, y = R() * AH; g.fillStyle = '#ddd'; g.fillRect(x - 1.5, y - 6, 3, 7); g.fillStyle = '#c03a2a'; g.beginPath(); g.arc(x, y - 6, 6, Math.PI, 0); g.fill(); }
      break;
    }
    case 'depths': {
      const gr = g.createLinearGradient(0, 0, 0, AH); gr.addColorStop(0, '#0e2632'); gr.addColorStop(1, '#173a44'); g.fillStyle = gr; g.fillRect(0, 0, AW, AH);
      for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(200,220,200,${R() * 0.12})`; g.fillRect(R() * AW, R() * AH, 2, 2); }
      g.strokeStyle = 'rgba(150,230,255,0.07)'; g.lineWidth = 3;
      for (let i = 0; i < 60; i++) { g.beginPath(); let x = R() * AW, y = R() * AH; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += rand(-40, 40); y += rand(-40, 40); g.quadraticCurveTo(x + rand(-20, 20), y + rand(-20, 20), x, y); } g.stroke(); }
      for (let i = 0; i < 14; i++) blob(R() * AW, R() * AH, 14 + R() * 22, '#2a3a42', 0.9);
      for (let i = 0; i < 12; i++) { const x = R() * AW, y = R() * AH; g.fillStyle = '#e8c8b0'; g.beginPath(); g.arc(x, y, 6, Math.PI, 0); g.fill(); }
      break;
    }
    case 'nightmare': {
      for (let y = 0; y < AH; y += 60) for (let x = 0; x < AW; x += 60) { g.fillStyle = ((x + y) / 60) % 2 ? '#1c1016' : '#2c1620'; g.fillRect(x, y, 60, 60); }
      for (let i = 0; i < 10; i++) { g.save(); g.translate(R() * AW, R() * AH); g.rotate(R() * 1 - 0.5); g.fillStyle = 'rgba(230,220,200,0.12)'; g.fillRect(-40, -55, 80, 110); g.strokeStyle = 'rgba(120,120,160,0.2)'; g.lineWidth = 1; for (let l = -40; l < 50; l += 10) { g.beginPath(); g.moveTo(-36, l); g.lineTo(36, l); g.stroke(); } g.restore(); }
      for (let i = 0; i < 16; i++) { g.strokeStyle = R() < 0.5 ? 'rgba(160,20,30,0.35)' : 'rgba(0,0,0,0.45)'; g.lineWidth = 2 + R() * 3; g.beginPath(); let x = R() * AW, y = R() * AH; g.moveTo(x, y); for (let j = 0; j < 14; j++) { x += rand(-25, 25); y += rand(-25, 25); g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 8; i++) blob(R() * AW, R() * AH, 12 + R() * 28, '#080206', 0.6);
      break;
    }
  }
  // mud patches go into the floor
  for (const o of F.objs) if (o.k === 'mud') {
    const gr = g.createRadialGradient(o.x, o.y, 10, o.x, o.y, o.r); gr.addColorStop(0, '#3a2a14'); gr.addColorStop(0.8, '#2a1e10'); gr.addColorStop(1, 'rgba(42,30,16,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.y, o.r * 1.1, 0, TAU); g.fill();
    for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(200,170,120,0.12)'; g.lineWidth = 2; g.beginPath(); g.ellipse(o.x + rand(-o.r / 2, o.r / 2), o.y + rand(-o.r / 2, o.r / 2), 14, 6, 0, 0, TAU); g.stroke(); }
  }
  // edge darkening
  const vg = g.createRadialGradient(AW / 2, AH / 2, AH * 0.35, AW / 2, AH / 2, AW * 0.68); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg; g.fillRect(0, 0, AW, AH);
  return c;
}

// ---------------- HELPERS ----------------
function solid(o) { return (o.k === 'pillar' && o.hp > 0) || (o.k === 'barrel' && o.state !== 'gone') || o.k === 'shrine'; }
function pushSolids(e, rr) {
  if (!F.objs) return;
  for (const o of F.objs) if (solid(o)) {
    const m = o.r + rr, d = dist(e, o);
    if (d < m && d > 0.01) { const a = Math.atan2(e.y - o.y, e.x - o.x); e.x = o.x + Math.cos(a) * m; e.y = o.y + Math.sin(a) * m; clampE(e); }
  }
}
// steering: bend a desired direction around obstacles and player-made gas
function avoidDir(b, vx, vy) {
  if (!F.objs) return [vx, vy];
  const look = b.r + 140;
  const obst = F.objs.filter(o => solid(o) || o.k === 'mud').map(o => ({ x: o.x, y: o.y, r: o.r }))
    .concat(F.hz.filter(h => h.lair && h.t >= h.warn).map(h => ({ x: h.x, y: h.y, r: h.r })));
  for (const o of obst) {
    const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy), m = o.r + look;
    if (d > m || d < 0.01) continue;
    if ((-dx) * vx + (-dy) * vy <= 0 && d > o.r + b.r) continue;     // only things ahead
    const w = (1 - d / m) * 2.2, nx = dx / d, ny = dy / d;
    const side = (nx * vy - ny * vx) > 0 ? 1 : -1;                    // slide around it
    vx += nx * w + -ny * side * w * 0.8; vy += ny * w + nx * side * w * 0.8;
  }
  const l = Math.hypot(vx, vy) || 1, l0 = Math.min(1.2, l); return [vx / l * l0, vy / l * l0];
}
function inMud(e) { if (!F.objs) return false; for (const o of F.objs) if (o.k === 'mud' && dist(e, o) < o.r * 0.9) return true; return false; }
function pillarHitBy(e) { if (!F.objs) return null; for (const o of F.objs) if (o.k === 'pillar' && o.hp > 0 && dist(e, o) < o.r + e.r * 0.75) return o; return null; }
function rayBlock(x, y, ang, len) {
  let best = len; if (!F.objs) return best;
  const c = Math.cos(ang), s = Math.sin(ang);
  for (const o of F.objs) {
    if (o.k !== 'pillar' || o.hp <= 0) continue;
    const dx = o.x - x, dy = o.y - y, pr = dx * c + dy * s; if (pr < 0) continue;
    const perp = Math.abs(-dx * s + dy * c); if (perp < o.r) { const d = pr - Math.sqrt(o.r * o.r - perp * perp); if (d > 0 && d < best) best = d; }
  }
  return best;
}
function damagePillar(o, n = 1) {
  if (o.hp <= 0) return; o.hp -= n; o.sh = 0.3; dust(o.x, o.y, 14); particles(o.x, o.y - 40, 12, '#9a8a7a', 280, 0.6, 6); sfx('crash');
  if (o.hp <= 0) { shake(10); particles(o.x, o.y - 50, 24, '#8a7a6a', 340, 0.8, 8); floatText(o.x, o.y - 90, 'CRUMBLE!', '#d8c8a0', 20); }
}
function breakPillarsNear(x, y, r) { if (F.objs) for (const o of F.objs) if (o.k === 'pillar' && o.hp > 0 && Math.hypot(o.x - x, o.y - y) < r + o.r) damagePillar(o, 2); }
function crash(b, o) {
  damagePillar(o, 1); shake(18);
  const a = Math.atan2(b.y - o.y, b.x - o.x); b.x = o.x + Math.cos(a) * (o.r + b.r * 0.8); b.y = o.y + Math.sin(a) * (o.r + b.r * 0.8); clampE(b);
  b.contact = 0; b.spin = 0;
  damageBoss(b, Math.round(b.maxHp * 0.03 + 8), 0, '#ffd84a');
  if (!b.dead) staggerBoss(b, 1.8, 'CRASH!', 'It ran into the ' + (LAIR_NAMES.pillar[F.lair.style] || 'pillar').toLowerCase().replace(/s$/, '') + '!');
  bossVoice(b, 'hurt');
}
function armBarrel(o, fuse = 1.1) { if (o.k !== 'barrel' || o.state !== 'idle') return; o.state = 'armed'; o.tm = 0; o.fuse = fuse; sfx('fuse'); }
function armBarrelsIn(test) { if (F.objs) for (const o of F.objs) if (o.k === 'barrel' && o.state === 'idle' && test(o)) armBarrel(o, 0.35); }
function pullBarrels(b, dt, pull) {
  for (const o of F.objs) {
    if (o.k !== 'barrel' || o.state !== 'armed') continue;   // only bombs YOU lit get swallowed
    const d = dist(o, b); if (d > 460) continue;
    const a = Math.atan2(b.y - o.y, b.x - o.x), s = pull * 1.25 * dt;
    o.x += Math.cos(a) * s; o.y += Math.sin(a) * s;
    if (d < b.r * 0.9) { explode(o, 1.5); banner('GULP… BOOM!', '#ffb04a', b.name + ' swallowed it!'); }
  }
}
function lairHit(o) {
  // player struck an object
  if (o.k === 'barrel') { armBarrel(o, 1.1); floatText(o.x, o.y - 50, 'RUN!', '#ffb04a', 22); }
  else if (o.k === 'drop') { if (o.state === 'hang') { o.state = 'falling'; o.tm = 0; sfx('creak'); floatText(o.lx, o.ly - 40, 'Look out!', '#ffd84a', 20); } }
  else if (o.k === 'shrine') {
    if (o.state === 'idle') { o.state = 'cool'; o.cd = 35; F.p.imbue = { e: o.e, t: 12 }; sfx('imbue', { e: o.e }); particles(o.x, o.y - 30, 30, { fire: '#ff8a2a', ice: '#9fe3ff', spark: '#ffe84a' }[o.e], 260, 0.8, 5); floatText(F.p.x, F.p.y - 60, ELEM[o.e] + ' weapon!', '#fff', 24); }
  }
}
function explode(o, mult = 1) {
  o.state = 'gone'; o.cd = 40; const v = o.v || 'fire', R = v === 'mine' ? 175 : 150, b = F.b;
  shake(16); sfx('explode', { x: o.x, v });
  const col = { fire: '#ff8a2a', confetti: '#ff5ad0', gas: '#9bd13a', bees: '#ffd23a', mine: '#ffb04a', ink: '#2a1030' }[v];
  particles(o.x, o.y, 40, col, 400, 0.7, 8); particles(o.x, o.y, 20, '#fff2c0', 250, 0.4, 5);
  if (v === 'confetti') for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, s = rand(100, 380); F.fx.push({ x: o.x, y: o.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.2, t: 0, col: ['#ff5a5a', '#5ad0ff', '#ffe84a', '#7aff7a', '#ff5ad0'][i % 5], size: 4 }); }
  F.flashes.push({ x: o.x, y: o.y, r: 460, a: 1, t: 0, life: 0.5 });
  if (v === 'gas') { addHaz({ type: 'pool', x: o.x, y: o.y, r: 120, warn: 0.15, life: 4.5, dmg: 6, name: 'pool', col: '#9bd13a', tick: {}, sx: o.x, sy: o.y, lair: true }); }
  if (v === 'bees') { F.bees.push({ x: o.x, y: o.y, t: 5, cd: 0 }); sfx('buzz'); }
  if (v !== 'gas' && v !== 'bees') {
    if (!b.dead && dist(o, b) < R + b.r * 0.7) {
      const d = Math.round((b.maxHp * (v === 'mine' ? 0.06 : 0.045) + 20) * mult);
      damageBoss(b, d, b.poiseMax * (v === 'confetti' ? 0.6 : 0.35) * mult, '#ffb04a');
      if (v === 'fire' && !b.dead) { b.burnT = 3; }
      if (v === 'ink' && !b.dead) { b.slowT = 3; floatText(b.x, b.y - b.r * 2, 'INKED!', '#c58bff', 22); }
      floatText(o.x, o.y - 70, 'BOOM!', '#ffb04a', 34);
    }
    for (const t of targetsFor()) if (dist(o, t) < R * 0.8) hurt(t, 20, o.x, o.y, 'barrel');
    for (const m of F.minions) if (dist(o, m) < R) m.hp = 0;
    for (const p of F.objs) if (p.k === 'pillar' && p.hp > 0 && dist(o, p) < R * 0.6) damagePillar(p, 1);
  }
  for (const o2 of F.objs) if (o2 !== o && o2.k === 'barrel' && o2.state === 'idle' && dist(o, o2) < R + 30) armBarrel(o2, 0.25);
}
function crushDrop(o) {
  const b = F.b; o.state = 'down'; o.cd = 45; o.tm = 0; shake(24); sfx('slam'); sfx('crash'); dust(o.x, o.y, 40);
  F.flashes.push({ x: o.x, y: o.y, r: 300, a: 0.7, t: 0, life: 0.4 });
  if (!b.dead && dist(o, b) < o.r + b.r * 0.4 && b.air < 80) {
    damageBoss(b, Math.round(b.maxHp * 0.08 + 30), 0, '#ffd84a');
    if (!b.dead) staggerBoss(b, 2.4, 'CRUSHED!', 'Right on the head!');
    bossVoice(b, 'hurt');
  }
  for (const t of targetsFor()) if (dist(o, t) < o.r * 0.9) hurt(t, 30, o.x, o.y, 'crush');
  for (const m of F.minions) if (dist(o, m) < o.r) m.hp = 0;
  breakPillarsNear(o.x, o.y, o.r * 0.5);
}

// ---------------- UPDATE ----------------
function updateLair(dt) {
  if (!F.objs) return;
  const P = F.p, b = F.b;
  for (const o of F.objs) {
    o.tm += dt; o.sh = Math.max(0, o.sh - dt);
    switch (o.k) {
      case 'barrel':
        if (o.state === 'armed') { if (Math.random() < 0.5) F.fx.push({ x: o.x + rand(-6, 6), y: o.y - 34, vx: rand(-60, 60), vy: rand(-120, -40), life: 0.3, t: 0, col: '#ffe08a', size: 3 }); if (o.tm >= o.fuse) explode(o); }
        else if (o.state === 'gone') { o.cd -= dt; if (o.cd <= 0) { o.state = 'idle'; o.x = o.ox; o.y = o.oy; particles(o.x, o.y, 10, '#fff', 120); } }
        break;
      case 'drop':
        if (o.state === 'falling') {
          // a monster that isn't busy attacking steps out of the shadow
          if (!b.gen && !b.dead && b.stagger <= 0 && dist(b, o) < o.r + b.r * 0.4) { const a = Math.atan2(b.y - o.y, b.x - o.x); b.x += Math.cos(a) * 420 * dt; b.y += Math.sin(a) * 420 * dt; clampE(b); }
          if (o.tm > 0.75) crushDrop(o);
        }
        else if (o.state === 'down') { o.cd -= dt; if (o.cd <= 0) { o.state = 'hang'; o.tm = 0; } }
        break;
      case 'shrine': if (o.state === 'cool') { o.cd -= dt; if (o.cd <= 0) o.state = 'idle'; } break;
      case 'heal':
        if (o.state === 'idle') { if (P.alive && P.hp < P.maxHp && dist(P, o) < o.r + P.r) { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.3); o.state = 'grow'; o.cd = 60; sfx('heal'); particles(o.x, o.y, 20, '#7aff9a', 160, 0.8); floatText(P.x, P.y - 50, '+HP', '#7aff9a', 22); } }
        else { o.cd -= dt; if (o.cd <= 0) o.state = 'idle'; }
        break;
    }
  }
  // bees chase the monster
  for (const s of F.bees) {
    s.t -= dt; s.cd -= dt;
    if (!b.dead) { const a = Math.atan2(b.y - b.r * 0.5 - s.y, b.x - s.x); s.x += Math.cos(a) * 230 * dt; s.y += Math.sin(a) * 230 * dt;
      if (dist(s, b) < b.r * 1.1 && s.cd <= 0) { s.cd = 0.5; damageBoss(b, 3 + b.def.tier, 3, '#ffe84a', true); if (Math.random() < 0.3) sfx('buzz'); } }
  }
  F.bees = F.bees.filter(s => s.t > 0);
  for (const f of F.flashes) f.t += dt;
  F.flashes = F.flashes.filter(f => f.t < f.life);
  // lair-owned gas hurts the monster too
  for (const h of F.hz) if (h.lair && h.t >= h.warn && !b.dead && dist(b, h) < h.r + b.r * 0.5) { h.btick = (h.btick || 0) - dt; if (h.btick <= 0) { h.btick = 0.6; damageBoss(b, 3 + b.def.tier, 2, '#9bd13a', true); } }
  // ambient life
  const L = F.lair, want = { dust: 40, sparkle: 30, bubble: 22, firefly: 26, bubble2: 30, ember: 34 }[L.amb] || 20;
  while (F.amb.length < want) F.amb.push(spawnAmb(L.amb, true));
  for (const a of F.amb) { a.t += dt; a.x += a.vx * dt; a.y += a.vy * dt; if (a.kind === 'firefly') { a.vx += rand(-60, 60) * dt; a.vy += rand(-60, 60) * dt; a.vx *= 0.99; a.vy *= 0.99; } }
  F.amb = F.amb.filter(a => a.t < a.life && a.x > -20 && a.x < AW + 20 && a.y > -20 && a.y < AH + 20);
}
function spawnAmb(kind, anywhere) {
  const x = rand(0, AW), y = rand(0, AH);
  switch (kind) {
    case 'dust': return { kind, x, y, vx: rand(-8, 8), vy: rand(-6, 6), t: 0, life: rand(4, 9), col: 'rgba(220,200,170,', s: rand(1, 2.5) };
    case 'sparkle': return { kind, x, y, vx: rand(-5, 5), vy: rand(-12, -2), t: 0, life: rand(2, 5), col: Math.random() < 0.5 ? 'rgba(255,200,240,' : 'rgba(200,220,255,', s: rand(1.5, 3), tw: true };
    case 'bubble': return { kind, x, y, vx: rand(-3, 3), vy: rand(-14, -4), t: 0, life: rand(2, 4), col: 'rgba(170,220,150,', s: rand(2, 5), ring: true };
    case 'firefly': return { kind, x, y, vx: rand(-20, 20), vy: rand(-20, 20), t: 0, life: rand(5, 10), col: 'rgba(220,255,120,', s: 2.5, glow: true, tw: true };
    case 'bubble2': return { kind, x, y: anywhere ? y : AH + 10, vx: rand(-6, 6), vy: rand(-50, -20), t: 0, life: rand(6, 14), col: 'rgba(190,240,255,', s: rand(2, 6), ring: true };
    case 'ember': return { kind, x, y, vx: rand(-10, 10), vy: rand(-30, -10), t: 0, life: rand(3, 6), col: Math.random() < 0.6 ? 'rgba(255,60,40,' : 'rgba(255,170,80,', s: rand(1.5, 3), glow: true };
  }
}

// ---------------- DRAW ----------------
function drawLairFloor(g) {
  if (F.floorC) g.drawImage(F.floorC, 0, 0);
  // live mud ripples
  for (const o of F.objs) if (o.k === 'mud') { g.save(); g.strokeStyle = 'rgba(220,190,140,0.15)'; g.lineWidth = 2; const k = (F.time * 0.5 + o.x) % 1; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(o.x, o.y, o.r * k, o.r * 0.6 * k, 0, 0, TAU); g.stroke(); g.restore(); }
  drawLighting(g);
  // levers' dotted guide line to the shadow
  for (const o of F.objs) if (o.k === 'drop' && o.state === 'hang') { g.save(); g.setLineDash([6, 10]); g.strokeStyle = 'rgba(255,220,140,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(o.lx, o.ly); g.lineTo(o.x, o.y); g.stroke(); g.restore(); }
  // drop shadows on floor
  for (const o of F.objs) if (o.k === 'drop' && o.state !== 'down') {
    const falling = o.state === 'falling', k = falling ? clamp(o.tm / 0.75, 0, 1) : 0;
    g.save(); g.globalAlpha = falling ? 0.35 + 0.4 * k : 0.22; g.fillStyle = falling ? '#ff4020' : '#000'; g.beginPath(); g.arc(o.x, o.y, o.r * (falling ? 0.6 + 0.4 * k : 1), 0, TAU); g.fill();
    g.globalAlpha = falling ? 0.9 : 0.35; g.strokeStyle = falling ? '#ff4020' : '#ffd890'; g.setLineDash(falling ? [] : [10, 8]); g.lineWidth = 3; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.stroke(); g.restore();
  }
}
function drawLighting(g) {
  const L = F.lair, lc = F.lightC; if (!lc) return; const c = lc.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, lc.width, lc.height);
  c.fillStyle = `rgba(${L.tint},${L.dark})`; c.fillRect(0, 0, lc.width, lc.height);
  c.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a) => { const gr = c.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r / 2); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(x / 2, y / 2, r / 2, 0, TAU); c.fill(); };
  light(F.p.x, F.p.y, 320, 0.85);
  if (!F.b.dead) light(F.b.x, F.b.y, F.b.r * 3.4, 0.6);
  for (const t of F.torches) light(t.x, t.y, t.r + Math.sin(F.time * 9 + t.ph) * 16 + Math.sin(F.time * 23 + t.ph) * 6, 0.95);
  for (const o of F.objs) {
    if (o.k === 'shrine' && o.state === 'idle') light(o.x, o.y, 230, 0.85);
    if (o.k === 'drop' && o.state === 'hang' && (L.style === 'dungeon' || L.style === 'nightmare')) light(o.x, o.y, 260, 0.6);
    if (o.k === 'barrel' && o.state === 'armed') light(o.x, o.y, 200, 0.9);
    if (o.k === 'heal' && o.state === 'idle') light(o.x, o.y, 110, 0.5);
  }
  for (const f of F.flashes) light(f.x, f.y, f.r, f.a * (1 - f.t / f.life));
  for (const a of F.amb) if (a.glow) light(a.x, a.y, 70, 0.5);
  if (F.b.burnT > 0) light(F.b.x, F.b.y, 260, 0.6);
  g.drawImage(lc, 0, 0, AW, AH);
}
// solid / standing objects (depth-sorted with entities)
function drawObj(o) {
  const g = ctx, st = F.lair.style, P = F.p, shk = o.sh > 0 ? Math.sin(F.time * 60) * 3 : 0;
  g.save(); g.translate(o.x + shk, o.y);
  switch (o.k) {
    case 'pillar': {
      const behind = P.y < o.y - 10 && P.y > o.y - 150 && Math.abs(P.x - o.x) < o.r + 20;
      if (o.hp <= 0) { // rubble
        g.fillStyle = '#00000055'; g.beginPath(); g.ellipse(0, 6, o.r * 1.3, o.r * 0.5, 0, 0, TAU); g.fill();
        const rc = { dungeon: '#6a6058', toybox: '#d04040', swamp: '#4a3a2a', forest: '#5a3a20', depths: '#d07070', nightmare: '#5a3a2a' }[st];
        for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? rc : '#00000033'; g.beginPath(); g.arc(Math.cos(i * 2.3) * o.r * 0.8, Math.sin(i * 1.7) * o.r * 0.3, 8 + (i % 3) * 4, 0, TAU); g.fill(); }
        break;
      }
      drawShadow(0, -6, o.r, 0.5);
      if (behind) g.globalAlpha = 0.5;
      const H = 120, r = o.r;
      if (st === 'dungeon' || st === 'nightmare' && false) {
        const gr = g.createLinearGradient(-r, 0, r, 0); gr.addColorStop(0, '#8a8078'); gr.addColorStop(0.5, '#6a6058'); gr.addColorStop(1, '#3a332e');
        g.fillStyle = gr; g.fillRect(-r, -H, r * 2, H); g.fillStyle = '#9a9088'; g.beginPath(); g.ellipse(0, -H, r, r * 0.35, 0, 0, TAU); g.fill();
        g.fillStyle = '#00000044'; g.fillRect(-r, -H * 0.15, r * 2, 8); g.fillRect(-r, -H * 0.8, r * 2, 6);
        g.fillStyle = '#5a5048'; g.beginPath(); g.ellipse(0, 0, r * 1.15, r * 0.4, 0, 0, Math.PI); g.fill();
      } else if (st === 'toybox') {
        const cols = ['#d04040', '#3a6ad0', '#e0b030']; const s = r * 1.7;
        for (let i = 0; i < 3; i++) { const y = -s * (i + 1) + 8, off = (i % 2 ? 6 : -4); g.fillStyle = cols[i]; g.fillRect(-s / 2 + off, y, s, s); g.fillStyle = '#00000030'; g.fillRect(-s / 2 + off + s * 0.75, y, s * 0.25, s); g.fillStyle = '#fff'; g.font = `bold ${s * 0.6}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KIM'[i], off - 4, y + s / 2 + 2); }
      } else if (st === 'swamp') {
        g.fillStyle = '#3a2e20'; g.beginPath(); g.moveTo(-r * 1.1, 0); g.quadraticCurveTo(-r * 0.4, -H * 0.5, -r * 0.5, -H * 1.3); g.lineTo(r * 0.4, -H * 1.3); g.quadraticCurveTo(r * 0.4, -H * 0.5, r * 1.1, 0); g.fill();
        g.strokeStyle = '#3a2e20'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, -H * 1.1); g.lineTo(-r * 1.4, -H * 1.6); g.moveTo(0, -H * 1.2); g.lineTo(r * 1.2, -H * 1.75); g.stroke();
        g.strokeStyle = '#ffffff10'; g.lineWidth = 3; g.beginPath(); g.moveTo(-r * 0.2, -10); g.lineTo(-r * 0.1, -H); g.stroke();
      } else if (st === 'forest') {
        g.fillStyle = '#3a2614'; g.fillRect(-r * 0.6, -H * 1.3, r * 1.2, H * 1.3); g.fillStyle = '#2a1a0c'; g.beginPath(); g.ellipse(0, 0, r * 1.0, r * 0.35, 0, 0, Math.PI); g.fill();
        g.globalAlpha *= behind ? 1 : 0.95;
        for (const [cx, cy, cr, cc] of [[-r * 0.9, -H * 1.5, r * 1.5, '#1f3a1c'], [r * 0.9, -H * 1.55, r * 1.4, '#244020'], [0, -H * 1.85, r * 1.7, '#2a4a24']]) { g.fillStyle = cc; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill(); }
      } else if (st === 'depths') {
        g.strokeStyle = '#d0607a'; g.lineCap = 'round';
        for (const [a, l, w] of [[-1.3, H * 1.1, 14], [-1.7, H * 0.9, 11], [-1.0, H * 0.8, 10], [-2.0, H * 0.7, 9]]) { g.lineWidth = w; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a) * l * 0.4, Math.sin(a) * l * 0.6, Math.cos(a) * l * 0.8, Math.sin(a) * l); g.stroke(); g.fillStyle = '#f090a0'; g.beginPath(); g.arc(Math.cos(a) * l * 0.8, Math.sin(a) * l, w * 0.8, 0, TAU); g.fill(); }
      } else { // nightmare bookshelf
        g.fillStyle = '#3a2418'; g.fillRect(-r * 1.1, -H * 1.2, r * 2.2, H * 1.2);
        const bc = ['#7a1a1a', '#1a3a5a', '#2a5a2a', '#6a5a1a', '#4a1a4a'];
        for (let row = 0; row < 3; row++) { const y = -H * 1.2 + 8 + row * H * 0.38; for (let x = -r + 4, i = row; x < r - 6; x += 9, i++) { g.fillStyle = bc[i % 5]; g.fillRect(x, y, 7, H * 0.32); } g.fillStyle = '#2a180e'; g.fillRect(-r * 1.1, y + H * 0.32, r * 2.2, 5); }
      }
      if (o.hp === 1) { g.strokeStyle = '#000000aa'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-r * 0.4, -H * 0.9); g.lineTo(0, -H * 0.6); g.lineTo(-r * 0.2, -H * 0.4); g.lineTo(r * 0.3, -H * 0.15); g.stroke(); }
      break;
    }
    case 'barrel': {
      if (o.state === 'gone') { g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 4, o.r * 1.2, o.r * 0.45, 0, 0, TAU); g.fill(); break; }
      const armed = o.state === 'armed', pulse = armed ? Math.sin(o.tm * 30) : 0, r = o.r;
      drawShadow(0, -4, r, 0.45);
      if (armed) g.scale(1 + pulse * 0.06, 1 - pulse * 0.04);
      switch (o.v) {
        case 'fire': g.fillStyle = '#7a4a24'; g.beginPath(); g.ellipse(0, -r, r, r * 1.2, 0, 0, TAU); g.fill(); g.fillStyle = '#3a2a1a'; g.fillRect(-r, -r * 1.5, r * 2, 5); g.fillRect(-r, -r * 0.6, r * 2, 5); g.fillStyle = '#9a6a3a'; g.beginPath(); g.ellipse(0, -r * 2.1, r * 0.75, r * 0.25, 0, 0, TAU); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -r * 2.1); g.quadraticCurveTo(8, -r * 2.6, 4, -r * 2.9); g.stroke(); g.fillStyle = '#e8d0a0'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('BOOM', 0, -r * 0.9); break;
        case 'confetti': { const s = r * 1.8; g.fillStyle = '#c03a8a'; g.fillRect(-s / 2, -s, s, s); g.fillStyle = '#ffe84a'; g.fillRect(-4, -s, 8, s); g.fillRect(-s / 2, -s * 0.55, s, 8); g.beginPath(); g.ellipse(-9, -s - 4, 9, 5, -0.5, 0, TAU); g.ellipse(9, -s - 4, 9, 5, 0.5, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillText('?', 0, -s * 0.2); break; }
        case 'gas': { const gl = 0.6 + 0.4 * Math.sin(F.time * 3 + o.x); g.fillStyle = '#3a5a20'; g.fillRect(-4, -r * 0.6, 8, r * 0.6); g.fillStyle = `rgba(150,220,60,${0.7 + gl * 0.3})`; g.shadowColor = '#9bd13a'; g.shadowBlur = 18 * gl; g.beginPath(); g.arc(0, -r * 1.4, r, 0, TAU); g.fill(); g.shadowBlur = 0; g.strokeStyle = '#2a4a14'; g.lineWidth = 2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * r * 0.4, -r * 0.6); g.quadraticCurveTo(i * r * 0.9, -r * 1.4, i * r * 0.3, -r * 2.3); g.stroke(); } break; }
        case 'bees': g.fillStyle = '#c99a2a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(0, -r * 0.4 - i * r * 0.42, r * (1 - i * 0.18), r * 0.28, 0, 0, TAU); g.fill(); g.fillStyle = i % 2 ? '#c99a2a' : '#a07a1a'; } g.fillStyle = '#2a1a0a'; g.beginPath(); g.arc(0, -r * 0.6, 5, 0, TAU); g.fill();
          for (let i = 0; i < 3; i++) { const a = F.time * 5 + i * 2 + o.x; g.fillStyle = '#ffe84a'; g.beginPath(); g.arc(Math.cos(a) * r * 1.3, -r + Math.sin(a * 1.3) * r * 0.6, 3, 0, TAU); g.fill(); } break;
        case 'mine': g.strokeStyle = '#222'; g.lineWidth = 4; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.8, -r * 1.2 + Math.sin(a) * r * 0.8); g.lineTo(Math.cos(a) * r * 1.25, -r * 1.2 + Math.sin(a) * r * 1.25); g.stroke(); }
          g.fillStyle = '#2a2a30'; g.beginPath(); g.arc(0, -r * 1.2, r * 0.9, 0, TAU); g.fill(); g.fillStyle = (armed || Math.sin(F.time * 4 + o.x) > 0.6) ? '#ff3020' : '#601010'; g.beginPath(); g.arc(0, -r * 2.05, 4, 0, TAU); g.fill(); break;
        case 'ink': g.fillStyle = '#18101e'; g.beginPath(); g.moveTo(-r * 0.9, -r * 1.6); g.quadraticCurveTo(-r * 1.2, 0, 0, 0); g.quadraticCurveTo(r * 1.2, 0, r * 0.9, -r * 1.6); g.fill(); g.fillStyle = '#4a1a6a'; g.beginPath(); g.ellipse(0, -r * 1.6, r * 0.9, r * 0.3, 0, 0, TAU); g.fill(); g.fillStyle = '#e8e0d0'; g.fillRect(-r * 0.6, -r * 1.1, r * 1.2, r * 0.45); g.fillStyle = '#222'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('INK', 0, -r * 0.75); break;
      }
      if (armed) { g.globalAlpha = 0.35 + 0.35 * pulse; g.fillStyle = '#ff3a1a'; g.beginPath(); g.arc(0, -r, r * 1.4, 0, TAU); g.fill(); }
      break;
    }
    case 'drop': { // the lever (the hanging part is drawn later, above everything)
      g.translate(o.lx - o.x, o.ly - o.y);
      const ready = o.state === 'hang';
      drawShadow(0, -4, 16, 0.4);
      g.fillStyle = '#4a3a2a'; g.fillRect(-14, -16, 28, 16); g.strokeStyle = '#c9a25a'; g.lineWidth = 6; g.lineCap = 'round';
      const a = ready ? -2.2 : -0.9; g.beginPath(); g.moveTo(0, -12); g.lineTo(Math.cos(a) * 34, -12 + Math.sin(a) * 34); g.stroke();
      g.fillStyle = ready ? '#ff5a3a' : '#666'; g.beginPath(); g.arc(Math.cos(a) * 34, -12 + Math.sin(a) * 34, 7, 0, TAU); g.fill();
      break;
    }
    case 'shrine': {
      const on = o.state === 'idle', e = o.e, col = { fire: '#ff8a2a', ice: '#9fe3ff', spark: '#ffe84a' }[e];
      drawShadow(0, -4, o.r, 0.45);
      if (e === 'fire') { g.fillStyle = '#3a3a40'; g.fillRect(-4, -40, 8, 40); g.fillStyle = '#5a5a60'; g.beginPath(); g.moveTo(-26, -40); g.lineTo(26, -40); g.lineTo(18, -54); g.lineTo(-18, -54); g.fill();
        if (on) for (let i = 0; i < 5; i++) { const fl = Math.sin(F.time * 12 + i * 1.7); g.fillStyle = i % 2 ? '#ffd23a' : '#ff6a1a'; g.beginPath(); g.ellipse(-12 + i * 6, -62 - fl * 4, 6, 14 + fl * 5, 0, 0, TAU); g.fill(); } }
      else if (e === 'ice') { g.fillStyle = '#5a4a6a'; g.fillRect(-20, -14, 40, 14); g.fillStyle = on ? 'rgba(190,235,255,0.75)' : 'rgba(120,140,160,0.5)'; g.beginPath(); g.arc(0, -36, 24, 0, TAU); g.fill(); g.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) { const a = F.time * 0.8 + i; g.beginPath(); g.arc(Math.cos(a * 1.3) * 14, -36 + Math.sin(a) * 14, 2, 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(-8, -46, 6, 0, TAU); g.fill(); }
      else { g.fillStyle = '#4a4a50'; g.fillRect(-6, -54, 12, 54); g.fillStyle = '#8a6a3a'; for (let y = -50; y < -10; y += 7) g.fillRect(-10, y, 20, 3); g.fillStyle = on ? '#ffe84a' : '#776'; g.beginPath(); g.arc(0, -62, 12, 0, TAU); g.fill();
        if (on) { g.strokeStyle = '#fffbb0'; g.lineWidth = 2; for (let i = 0; i < 2; i++) { g.beginPath(); let x = 0, y = -62; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += rand(-14, 14); y += rand(-12, 4); g.lineTo(x, y); } g.stroke(); } } }
      if (on) { g.globalAlpha = 0.25 + 0.15 * Math.sin(F.time * 4); g.fillStyle = col; g.beginPath(); g.arc(0, -40, 46, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.font = '22px sans-serif'; g.textAlign = 'center'; g.fillText(ELEM[e], 0, -96 + Math.sin(F.time * 3) * 5); }
      else { g.fillStyle = '#fff'; g.globalAlpha = 0.6; g.font = 'bold 13px system-ui'; g.textAlign = 'center'; g.fillText(Math.ceil(o.cd) + 's', 0, -80); }
      break;
    }
    case 'heal': {
      const on = o.state === 'idle', k = on ? 1 : clamp(1 - o.cd / 60, 0.2, 0.8);
      g.scale(k, k);
      g.strokeStyle = '#3a7a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.stroke();
      g.fillStyle = '#4a9a4a'; g.beginPath(); g.ellipse(-9, -12, 9, 4, -0.5, 0, TAU); g.ellipse(9, -14, 9, 4, 0.5, 0, TAU); g.fill();
      if (on) { for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + F.time * 0.5; g.fillStyle = '#ff7ab0'; g.beginPath(); g.ellipse(Math.cos(a) * 11, -32 + Math.sin(a) * 11, 8, 5, a, 0, TAU); g.fill(); }
        g.fillStyle = '#ff3a6a'; g.shadowColor = '#ff7ab0'; g.shadowBlur = 16 + 8 * Math.sin(F.time * 4); g.font = '16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💚', 0, -32); }
      break;
    }
  }
  // "hit me" hints at the start of a fight
  if (F.time < 7 && ((o.k === 'barrel' && o.state === 'idle') || (o.k === 'shrine' && o.state === 'idle') || (o.k === 'drop' && o.state === 'hang')) && (SAVE.lairSeen || 0) < 6) {
    const hx = o.k === 'drop' ? o.lx - o.x : 0, hy = o.k === 'drop' ? o.ly - o.y : 0;
    g.globalAlpha = 0.85 * Math.min(1, (7 - F.time) / 1.5); g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillStyle = '#ffe9a8'; g.strokeStyle = '#000'; g.lineWidth = 3;
    const ty = hy - (o.k === 'barrel' ? 75 : o.k === 'shrine' ? 120 : 55) + Math.sin(F.time * 5) * 4; g.strokeText('⚔️ hit me!', hx, ty); g.fillText('⚔️ hit me!', hx, ty);
  }
  g.restore();
}
// things hanging from the ceiling — drawn after everything so they're "above"
function drawHanging() {
  const g = ctx, st = F.lair.style;
  for (const o of F.objs) {
    if (o.k !== 'drop' || o.state === 'down' && o.tm > 1.5) continue;
    let h = 230;
    if (o.state === 'falling') h = 230 * (1 - Math.pow(clamp(o.tm / 0.75, 0, 1), 2));
    if (o.state === 'down') h = 0;
    if (o.state === 'hang' && o.tm < 1.5) h = 230 + Math.pow(1 - o.tm / 1.5, 2) * 450;   // lowers in from the ceiling
    const y = o.y - h, sway = o.state === 'hang' ? Math.sin(F.time * 1.2 + o.x) * 6 : 0;
    g.save(); g.translate(o.x + sway, y);
    if (o.state !== 'down') { g.strokeStyle = st === 'forest' ? '#8a6a3a' : '#555'; g.lineWidth = 3; g.setLineDash(st === 'forest' ? [] : [6, 3]); g.beginPath(); g.moveTo(-sway, -y - 30); g.lineTo(0, -20); g.stroke(); g.setLineDash([]); }
    if (o.state === 'down') g.globalAlpha = Math.max(0, 1 - o.tm / 1.5);
    else if (o.state === 'hang') { const under = [F.b, F.p].some(e => Math.abs(e.x - o.x) < 130 && e.y > y - 40 && e.y < y + 260); g.globalAlpha = under ? 0.45 : 0.9; }
    switch (st) {
      case 'forest': g.fillStyle = '#5a3a1e'; g.fillRect(-90, -24, 180, 48); g.fillStyle = '#7a5a34'; g.beginPath(); g.ellipse(-90, 0, 12, 24, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(90, 0, 12, 24, 0, 0, TAU); g.fill(); g.strokeStyle = '#3a2a14'; g.lineWidth = 2; for (let x = -70; x < 80; x += 30) { g.beginPath(); g.moveTo(x, -20); g.lineTo(x + 10, 20); g.stroke(); } break;
      case 'toybox': g.strokeStyle = '#c9a25a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-90, -20); g.lineTo(90, -20); g.stroke();
        for (let i = 0; i < 5; i++) { const x = -80 + i * 40, yy = 10 + (i % 2) * 18; g.beginPath(); g.moveTo(x, -20); g.lineTo(x, yy - 12); g.stroke(); g.font = '26px sans-serif'; g.textAlign = 'center'; g.fillText(['⭐', '🌙', '🧸', '⭐', '🌙'][i], x, yy + 6); } break;
      case 'depths': g.strokeStyle = '#8a9aa4'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -40); g.lineTo(0, 40); g.moveTo(-28, -24); g.lineTo(28, -24); g.stroke(); g.beginPath(); g.arc(0, 10, 46, 0.3, Math.PI - 0.3); g.stroke(); g.beginPath(); g.arc(0, -52, 12, 0, TAU); g.stroke(); break;
      default: // chandelier
        g.strokeStyle = '#c9a25a'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, 90, 26, 0, 0, TAU); g.stroke();
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6, cx = Math.cos(a) * 90, cy = Math.sin(a) * 26; g.fillStyle = '#e8e0c8'; g.fillRect(cx - 4, cy - 18, 8, 18); if (o.state !== 'down') { const fl = Math.sin(F.time * 14 + i); g.fillStyle = '#ffcf5a'; g.beginPath(); g.ellipse(cx, cy - 24 - fl, 4, 8 + fl * 2, 0, 0, TAU); g.fill(); } }
        g.globalCompositeOperation = 'lighter'; g.globalAlpha *= 0.25; const gr = g.createRadialGradient(0, 0, 10, 0, 0, 160); gr.addColorStop(0, '#ffcf5a'); gr.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 160, 0, TAU); g.fill();
    }
    g.restore();
  }
}
function drawTorches() {
  const g = ctx, st = F.lair.torch;
  for (const t of F.torches) {
    g.save(); g.translate(t.x, t.y);
    const fl = Math.sin(F.time * 11 + t.ph) * 0.15 + Math.sin(F.time * 27 + t.ph) * 0.08;
    let col = '#ffb04a';
    switch (st) {
      case 'torch': g.fillStyle = '#3a2a1a'; g.fillRect(-5, -6, 10, 22); g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(0, -16, 8 * (1 + fl), 16 * (1 + fl), 0, 0, TAU); g.fill(); g.fillStyle = '#ffe07a'; g.beginPath(); g.ellipse(0, -12, 4, 8, 0, 0, TAU); g.fill(); break;
      case 'nightlight': col = '#ffe8a8'; g.font = '26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🌟', 0, 0); break;
      case 'lantern': col = '#d8ff7a'; g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 20); g.stroke(); g.fillStyle = `rgba(210,255,120,${0.8 + fl})`; g.beginPath(); g.arc(0, 30, 10, 0, TAU); g.fill(); break;
      case 'jelly': { col = '#7ae8ff'; const by = Math.sin(F.time * 1.5 + t.ph) * 10; g.fillStyle = 'rgba(120,230,255,0.7)'; g.beginPath(); g.arc(0, by, 16, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(120,230,255,0.5)'; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 6, by); g.quadraticCurveTo(i * 6 + Math.sin(F.time * 3 + i) * 6, by + 14, i * 6, by + 28); g.stroke(); } break; }
      case 'candle': col = '#ffcf5a'; for (let i = -1; i <= 1; i++) { g.fillStyle = '#e8e0c8'; g.fillRect(i * 10 - 3, -4 - (i + 1) * 3, 6, 14 + (i + 1) * 3); g.fillStyle = '#ffcf5a'; g.beginPath(); g.ellipse(i * 10, -10 - (i + 1) * 3, 3, 6 * (1 + fl), 0, 0, TAU); g.fill(); } break;
      case 'moon': g.restore(); continue;
    }
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + fl;
    const gr = g.createRadialGradient(0, -10, 2, 0, -10, 70); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, -10, 70, 0, TAU); g.fill();
    g.restore();
  }
}
function drawAmbient() {
  const g = ctx;
  for (const a of F.amb) {
    const k = Math.min(1, a.t / 0.6, (a.life - a.t) / 0.8), tw = a.tw ? 0.5 + 0.5 * Math.sin(a.t * 6 + a.x) : 1, al = 0.6 * k * tw;
    if (a.ring) { g.strokeStyle = a.col + al + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(a.x, a.y, a.s, 0, TAU); g.stroke(); }
    else { if (a.glow) { g.globalCompositeOperation = 'lighter'; } g.fillStyle = a.col + al + ')'; g.beginPath(); g.arc(a.x, a.y, a.s, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
  }
  for (const s of F.bees) for (let i = 0; i < 9; i++) { const a = F.time * 9 + i * 1.7; g.fillStyle = i % 2 ? '#ffe84a' : '#2a1a0a'; g.beginPath(); g.arc(s.x + Math.cos(a) * 18 * Math.sin(i), s.y + Math.sin(a * 1.3) * 14, 3.5, 0, TAU); g.fill(); }
}
