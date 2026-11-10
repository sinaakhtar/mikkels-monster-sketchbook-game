// ===== Mikkel's Monster Sketchbook — fight engine =====
'use strict';
const AW = 1200, AH = 760;               // arena size (world units)
const TAU = Math.PI * 2, RAD = Math.PI / 180;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

let cvs, ctx, DPR = 1, SW = 0, SH = 0, SC = 1, OX = 0, OY = 0;
let F = null;          // current fight
let BDT = 0;           // boss-time delta (slowed by ice)
const IMG = {};
function img(src) {
  if (!IMG[src]) {
    const i = new Image();
    i.setAttribute('data-path', src);
    i.onerror = function() { if (window.imgErr) window.imgErr(this); };
    i.src = typeof assetUrl === 'function' ? assetUrl(src) : src;
    IMG[src] = i;
  }
  return IMG[src];
}

// ---------------- AUDIO (synthesised, no files) ----------------
let AC = null;
function audioInit() { if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
function tone(f, d, type = 'square', v = 0.08, f2 = null, delay = 0) {
  if (!AC || !SAVE.sound) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, v = 0.12, freq = 1200, delay = 0) {
  if (!AC || !SAVE.sound) return;
  const t = AC.currentTime + delay, n = AC.sampleRate * d, buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = buf; fl.type = 'lowpass'; fl.frequency.value = freq; g.gain.value = v;
  s.connect(fl); fl.connect(g); g.connect(AC.destination); s.start(t);
}
const SFX = {
  swing: () => noise(0.12, 0.10, 2500),
  hit: () => { tone(160, 0.12, 'square', 0.10, 60); noise(0.08, 0.12, 900); },
  bighit: () => { tone(110, 0.25, 'sawtooth', 0.12, 40); noise(0.18, 0.18, 700); },
  hurt: () => { tone(320, 0.25, 'sawtooth', 0.10, 90); },
  roll: () => noise(0.18, 0.07, 600),
  spark: () => { tone(1800, 0.12, 'triangle', 0.06, 2600); },
  dash: () => noise(0.35, 0.10, 500),
  slam: () => { tone(70, 0.4, 'sine', 0.25, 30); noise(0.3, 0.2, 400); },
  boom: () => { tone(90, 0.3, 'sine', 0.18, 40); },
  shoot: () => tone(600, 0.08, 'square', 0.04, 300),
  spawn: () => tone(200, 0.3, 'triangle', 0.08, 500),
  vanish: () => tone(900, 0.35, 'sine', 0.06, 200),
  inhale: () => noise(1.6, 0.08, 300),
  chomp: () => { noise(0.15, 0.25, 1500); tone(120, 0.15, 'square', 0.12, 50); },
  roar: () => { tone(90, 1.0, 'sawtooth', 0.14, 50); tone(140, 1.0, 'sawtooth', 0.08, 70); },
  drink: () => { tone(500, 0.1, 'sine', 0.08, 700); tone(700, 0.15, 'sine', 0.08, 1000, 0.1); },
  stagger: () => { tone(1200, 0.1, 'triangle', 0.08); tone(900, 0.1, 'triangle', 0.08, null, 0.1); tone(1500, 0.2, 'triangle', 0.08, null, 0.2); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.10, null, i * 0.14)); },
  die: () => { [300, 220, 160, 110].forEach((f, i) => tone(f, 0.5, 'sawtooth', 0.08, null, i * 0.22)); },
  dodge: () => tone(1400, 0.08, 'sine', 0.05, 1900),
  click: () => tone(700, 0.05, 'triangle', 0.05),
  summon: () => { [400, 600, 900].forEach((f, i) => tone(f, 0.25, 'sine', 0.07, null, i * 0.08)); },
  burn: () => noise(0.1, 0.05, 3000),
  explode: () => { tone(60, 0.6, 'sine', 0.35, 25); noise(0.6, 0.35, 900); noise(0.25, 0.2, 4000); },
  crash: () => { noise(0.35, 0.3, 700); tone(80, 0.3, 'square', 0.12, 40); },
  fuse: () => { noise(0.6, 0.05, 5000); tone(1200, 0.1, 'square', 0.03, 900); },
  creak: () => { tone(180, 0.5, 'sawtooth', 0.05, 120); noise(0.3, 0.06, 1200); },
  buzz: () => { tone(220, 0.5, 'sawtooth', 0.04, 240); tone(233, 0.5, 'sawtooth', 0.03, 225); },
  heal: () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.2, 'sine', 0.07, null, i * 0.07)); },
  imbue: () => { tone(300, 0.5, 'sawtooth', 0.05, 900); noise(0.4, 0.08, 3000); },
};
function sfx(n) { try { SFX[n] && SFX[n](); } catch (e) {} }

// ---------------- INPUT ----------------
const INPUT = { mx: 0, my: 0, joy: null, keys: {}, btn: {} };
const BTNS = {};   // screen-space buttons, computed on resize
function layoutButtons() {
  const m = Math.min(SW, SH), s = clamp(m / 800, 0.75, 1.25), pad = 18 * s;
  BTNS.atk   = { x: SW - 105 * s - pad, y: SH - 105 * s - pad, r: 66 * s, icon: '⚔️', label: 'ATTACK', key: 'J / click' };
  BTNS.roll  = { x: SW - 250 * s - pad, y: SH - 70 * s - pad, r: 50 * s, icon: '💨', label: 'ROLL', key: 'Space / right-click' };
  BTNS.heal  = { x: SW - 225 * s - pad, y: SH - 205 * s - pad, r: 40 * s, icon: '🧪', label: '', key: 'E' };
  BTNS.spirit= { x: SW - 95 * s - pad, y: SH - 250 * s - pad, r: 40 * s, icon: '👻', label: '', key: 'Q' };
  BTNS.pause = { x: SW - 42, y: 42, r: 28, icon: '⏸', label: '', key: 'Esc' };
}
function btnAt(x, y) { for (const k in BTNS) { const b = BTNS[k]; if (Math.hypot(x - b.x, y - b.y) < b.r * 1.15) return k; } return null; }
const pointers = {};
function onDown(e) {
  audioInit();
  if (!F || F.paused) return;
  e.preventDefault();
  const x = e.clientX, y = e.clientY, b = btnAt(x, y);
  if (b) { pointers[e.pointerId] = { btn: b }; press(b); return; }
  if (e.pointerType === 'mouse') { INPUT.kb = true; press(e.button === 2 ? 'roll' : 'atk'); return; }
  if (x < SW * 0.55) { INPUT.joy = { id: e.pointerId, ox: x, oy: y, x, y }; pointers[e.pointerId] = { joy: true }; }
}
function onMove(e) {
  const p = pointers[e.pointerId]; if (!p) return; e.preventDefault();
  if (p.joy && INPUT.joy) { INPUT.joy.x = e.clientX; INPUT.joy.y = e.clientY; }
}
function onUp(e) {
  const p = pointers[e.pointerId]; if (!p) return;
  if (p.joy) INPUT.joy = null;
  if (p.btn) INPUT.btn[p.btn] = false;
  delete pointers[e.pointerId];
}
function press(b) {
  INPUT.btn[b] = true;
  if (!F) return;
  const P = F.p;
  if (b === 'atk') P.buf.atk = 0.3;
  if (b === 'roll') P.buf.roll = 0.25;
  if (b === 'heal') P.buf.heal = 0.25;
  if (b === 'spirit') summonSpirit();
  if (b === 'pause') UI.pause();
}
window.addEventListener('keydown', e => {
  audioInit(); INPUT.keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (!F || F.paused || F.reported) { UI.key && UI.key(e); return; }
  INPUT.kb = true;
  if (e.repeat) return;
  if (e.code === 'KeyJ' || e.code === 'Enter') press('atk');
  if (e.code === 'Space' || e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { press('roll'); e.preventDefault(); }
  if (e.code === 'KeyH' || e.code === 'KeyE') press('heal');
  if (e.code === 'KeyL' || e.code === 'KeyQ') press('spirit');
  if (e.code === 'Escape' || e.code === 'KeyP') press('pause');
});
window.addEventListener('keyup', e => { INPUT.keys[e.code] = false; });
function readMove() {
  let mx = 0, my = 0;
  const k = INPUT.keys;
  if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
  if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1;
  if (INPUT.joy) {
    const j = INPUT.joy, R = 70 * clamp(Math.min(SW, SH) / 800, 0.75, 1.25);
    let dx = j.x - j.ox, dy = j.y - j.oy, d = Math.hypot(dx, dy);
    if (d > R) { j.ox = j.x - dx / d * R; j.oy = j.y - dy / d * R; dx = j.x - j.ox; dy = j.y - j.oy; d = R; }
    if (d > 8) { mx = dx / R; my = dy / R; }
  }
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  INPUT.mx = mx; INPUT.my = my;
}

// ---------------- FIGHT SETUP ----------------
function diff() { return DIFFS[SAVE.diff] || DIFFS.brave; }
function startFight(bossId) {
  const def = BOSSES.find(b => b.id === bossId);
  const D = diff();
  const W = WEAPONS[SAVE.equip.weapon];
  const P = {
    x: AW * 0.5, y: AH * 0.78, r: 24, face: -Math.PI / 2, hp: maxHp(), maxHp: maxHp(), st: 100, stMax: 100, stDelay: 0,
    state: 'free', t: 0, combo: 0, iframes: 0, inv: 0, flasks: maxFlasks(), buf: { atk: 0, roll: 0, heal: 0 },
    w: W, lvl: SAVE.wlvl[SAVE.equip.weapon] || 0, hitSet: null, rollA: 0, kx: 0, ky: 0, alive: true, isPlayer: true, dodges: 0,
  };
  const B = {
    def, id: def.id, name: def.name, x: AW * 0.5, y: AH * 0.3, r: def.r, face: Math.PI / 2,
    hp: Math.round(def.hp * D.hp), maxHp: Math.round(def.hp * D.hp), speed: def.speed, pref: def.pref, dmgMul: TIER_DMG[def.tier],
    teleMul: 1, poise: 0, poiseMax: def.poise, poiseT: 0, stagger: 0, gen: null, idle: 1.4, p2: false,
    contact: 0, air: 0, alpha: 1, ghost: false, wind: 0, sparkT: 0, sparked: false, flash: 0,
    burnB: 0, burnT: 0, burnTick: 0, iceB: 0, slowT: 0, last: null, lastN: 0, dead: false, deadT: 0,
    img: img('a/' + def.id + '.webp'), bob: Math.random() * 10, strafe: Math.random() < 0.5 ? 1 : -1, target: null,
  };
  F = { p: P, b: B, hz: [], minions: [], allies: [], fx: [], texts: [], banner: null, shake: 0, hitstop: 0, time: 0,
        over: false, overT: 0, result: null, paused: false, spiritUsed: false, dmgDealt: 0, lastHit: 'default',
        bg: img('a/' + def.id + '_bg.jpg') };
  INPUT.btn = {}; INPUT.joy = null;
  prepBoss(B); buildLair(def.region, def.id);
  banner(def.name, '#e9d9a8', def.title);
  introSting(def.region); setTimeout(() => { if (F && F.b === B) bossVoice(B, 'intro'); }, 350);
  musicStart(def.region);
  shake(10);
}

function maxHp() {
  let h = 100;
  for (const b of BOSSES) if (b.boss && SAVE.beaten[b.id]) h += 20;
  for (const k in ARMORS) if (SAVE.crafted[k]) h += ARMORS[k].hp;
  return h;
}
function maxFlasks() { return 3 + FLASK_ITEMS.filter(i => SAVE.crafted['flask_' + i]).length; }

// ---------------- HELPERS ----------------
function banner(text, col, sub) { F.banner = { text, col, sub, t: 0, dur: 2.2 }; }
function floatText(x, y, text, col, size = 26) { F.texts.push({ x, y, text, col, size, t: 0 }); }
function shake(n) { F.shake = Math.max(F.shake, n); }
function particles(x, y, n, col, sp = 220, life = 0.6, size = 5) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = rand(sp * 0.3, sp); F.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.5, life), t: 0, col, size: rand(size * 0.5, size) }); }
}
function dust(x, y, n) { particles(x, y, n, 'rgba(180,160,130,0.8)', 260, 0.7, 9); }
function addHaz(h) { h.t = 0; h.hit = new Set(); h.dead = false; F.hz.push(h); return h; }
function dmgOf(b, base) { return base * b.dmgMul * diff().dmg; }
function tele(b, s) { return s * diff().tele * (b.p2 ? 0.85 : 1); }
function faceTo(b, t) { b.face = Math.atan2(t.y - b.y, t.x - b.x); }
function tgt(b) { return (b.target && b.target.alive && (b.target.isPlayer || F.allies.includes(b.target))) ? b.target : F.p; }
function clampE(e) { e.x = clamp(e.x, e.r, AW - e.r); e.y = clamp(e.y, e.r, AH - e.r); }
function hitWall(b) { const x = b.x, y = b.y; clampE(b); return x !== b.x || y !== b.y; }
function spark(b) { b.sparkT = 0.32; b.sparked = true; sfx('spark'); }
function stepToward(e, t, sp) { const a = Math.atan2(t.y - e.y, t.x - e.x); e.x += Math.cos(a) * sp * BDT; e.y += Math.sin(a) * sp * BDT; clampE(e); }

// ---------------- MOVES (generators, one yield per frame) ----------------
function triggerStrike(b, kind, dur = 0.34, side = 0) {
  b.strikeT = dur; b.strikeDur = dur; b.strikeKind = kind || b.moveKind || 'swipe';
  b.strikeSide = side; b.strikeAng = b.face; b.punch = Math.max(b.punch || 0, dur);
}
function* W(s) { let t = 0; while (t < s) { t += BDT; yield; } }
function* waitSpark(b, T, track = true, kind = 'cast') {
  let t = 0; b.wind = T; b.windP = 0; b.moveKind = kind;
  if (T < 0.3) spark(b);
  while (t < T) {
    t += BDT; b.windP = clamp(t / Math.max(T, 0.01), 0, 1);
    if (track && t < T * 0.8) faceTo(b, tgt(b));
    if (!b.sparked && T - t < 0.26) spark(b);
    yield;
  }
  b.sparked = false; b.wind = 0; b.windP = 0;
}
const MOVES = {};
MOVES.swipe = function* (b, o) {
  const n = o.n || 1, range = b.r + (o.range || 110), arc = (o.arc || 115) * RAD;
  b.moveKind = 'swipe'; b.swingMax = n;
  for (let i = 0; i < n; i++) {
    b.swingIdx = i;
    const side = (n > 1 && i === n - 1) ? 0 : (i % 2 === 0 ? 1 : -1); // 1 = front/R lead, -1 = back/L lead, 0 = both overhead
    b.swingSide = side;
    let T = tele(b, i === 0 ? (o.firstT || 0.6) : 0.36);
    if (o.delay && i > 0 && Math.random() < 0.45) T += 0.5;   // delayed swing — don't roll too early!
    const h = addHaz({ type: 'cone', x: b.x, y: b.y, ang: b.face, range, arc, warn: T, dmg: dmgOf(b, o.dmg || 22), name: 'swipe' });
    let t = 0; b.wind = T; b.windP = 0;
    while (t < T) {
      t += BDT; b.windP = clamp(t / Math.max(T, 0.01), 0, 1);
      const g = tgt(b);
      if (t < T * 0.7) { faceTo(b, g); if (dist(b, g) > range * 0.6) stepToward(b, g, b.speed * 0.6); }
      h.x = b.x; h.y = b.y; h.ang = b.face;
      if (!b.sparked && T - t < 0.26) spark(b);
      yield;
    }
    b.sparked = false; b.wind = 0; b.windP = 0;
    b.strikeRange = range; b.strikeArc = arc;
    triggerStrike(b, 'swipe', i === n - 1 ? 0.38 : 0.30, side);
    b.x += Math.cos(b.face) * 34; b.y += Math.sin(b.face) * 34; clampE(b);
    yield* W(0.18);
  }
  yield* W(o.rec || 0.75);
};
MOVES.charge = function* (b, o) {
  const n = o.n || 1;
  b.moveKind = 'charge';
  for (let i = 0; i < n; i++) {
    faceTo(b, tgt(b)); const T = tele(b, i === 0 ? 0.8 : 0.5);
    const h = addHaz({ type: 'line', x: b.x, y: b.y, ang: b.face, len: 1500, w: b.r * 1.7, warn: T, dmg: 0, name: 'charge' });
    let t = 0; b.wind = T; b.windP = 0;
    while (t < T) {
      t += BDT; b.windP = clamp(t / Math.max(T, 0.01), 0, 1);
      if (t < T * 0.65) faceTo(b, tgt(b));
      h.x = b.x; h.y = b.y; h.ang = b.face;
      if (!b.sparked && T - t < 0.26) spark(b);
      yield;
    }
    b.sparked = false; b.wind = 0; b.windP = 0; h.dead = true;
    { const g0 = tgt(b), dg = dist(b, g0); if (rayBlock(b.x, b.y, b.face, dg) < dg - 10) { yield* W(0.35); continue; } }   // path blocked — don't charge into it
    b.contact = dmgOf(b, o.dmg || 26); b.contactName = 'charge'; b.dashing = 'charge'; triggerStrike(b, 'charge', 0.35, 0); sfx('dash');
    let d = 0; const sp = o.speed || 950;
    while (d < (o.dist || 950)) {
      const s = sp * BDT; b.x += Math.cos(b.face) * s; b.y += Math.sin(b.face) * s; d += s;
      const ph = pillarHitBy(b); if (ph) { b.dashing = null; crash(b, ph); return; }
      if (Math.random() < 0.5) F.fx.push({ x: b.x + rand(-20, 20), y: b.y + rand(-20, 20), vx: 0, vy: 0, life: 0.4, t: 0, col: 'rgba(200,180,150,0.6)', size: 12 });
      if (hitWall(b)) { shake(8); dust(b.x, b.y, 12); break; }
      yield;
    }
    b.contact = 0; b.dashing = null;
    yield* W(i === n - 1 ? (o.rec || 0.9) : 0.25);
  }
};
MOVES.slam = function* (b, o) {
  const g = tgt(b), T = tele(b, o.T || 1.0), R = b.r + (o.R || 75);
  let lx = g.x, ly = g.y; const sx = b.x, sy = b.y;
  const h = addHaz({ type: 'circle', x: lx, y: ly, r: R, warn: T, dmg: dmgOf(b, o.dmg || 30), name: 'slam', shadow: true });
  let t = 0; b.wind = T; b.windP = 0; b.moveKind = 'slam'; sfx('dash');
  while (t < T) {
    t += BDT; const k = t / T; b.windP = clamp(k, 0, 1);
    if (k < 0.55) { const g2 = tgt(b); lx += (g2.x - lx) * Math.min(1, BDT * 2.2); ly += (g2.y - ly) * Math.min(1, BDT * 2.2); lx = clamp(lx, b.r, AW - b.r); ly = clamp(ly, b.r, AH - b.r); h.x = lx; h.y = ly; }
    b.x = sx + (lx - sx) * ease(k); b.y = sy + (ly - sy) * ease(k); b.air = Math.sin(k * Math.PI) * 170;
    if (!b.sparked && T - t < 0.26) spark(b);
    yield;
  }
  b.sparked = false; b.wind = 0; b.windP = 0; b.air = 0; b.x = lx; b.y = ly; clampE(b);
  b.strikeRange = R; triggerStrike(b, 'slam', 0.42, 0);
  shake(14); sfx('slam'); dust(b.x, b.y, 26); breakPillarsNear(b.x, b.y, R * 0.55);
  if (o.ring) addHaz({ type: 'ring', x: b.x, y: b.y, r: R * 0.7, v: 420, rmax: 1500, th: 26, warn: 0, dmg: dmgOf(b, 16), name: 'ring' });
  yield* W(o.rec || 1.0);
};
MOVES.slam3 = function* (b, o) { for (let i = 0; i < 3; i++) yield* MOVES.slam(b, { R: 90, T: i ? 0.75 : 1.0, rec: i < 2 ? 0.15 : 1.3, ring: i === 2 }); };
MOVES.spray = function* (b, o) {
  yield* waitSpark(b, tele(b, o.T || 0.6), true, 'spray');
  const waves = o.waves || 1, n = o.n || 5, spread = (o.spread || 60) * RAD;
  for (let w = 0; w < waves; w++) {
    faceTo(b, tgt(b)); const off = (w % 2) ? spread / Math.max(1, n - 1) / 2 : 0;
    triggerStrike(b, 'spray', 0.30, w % 2 === 0 ? 1 : -1);
    for (let i = 0; i < n; i++) {
      const a = b.face - spread / 2 + (n === 1 ? spread / 2 : spread * i / (n - 1)) + off, sp = o.sp || 380;
      addHaz({ type: 'proj', x: b.x + Math.cos(a) * b.r * 0.7, y: b.y + Math.sin(a) * b.r * 0.7, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: o.pr || 13, warn: 0, life: 4, dmg: dmgOf(b, o.dmg || 14), col: o.col || '#ff5a3c', name: 'spray' });
    }
    sfx('shoot'); yield* W(o.gap || 0.4);
  }
  yield* W(o.rec || 0.6);
};
MOVES.ring = function* (b, o) {
  yield* waitSpark(b, tele(b, o.T || 0.8), false, 'ring');
  for (let i = 0; i < (o.n || 1); i++) {
    triggerStrike(b, 'ring', 0.36, 0);
    addHaz({ type: 'ring', x: b.x, y: b.y, r: b.r * 0.8, v: o.v || 360, rmax: 1500, th: 28, warn: 0, dmg: dmgOf(b, o.dmg || 18), name: 'ring' });
    shake(6); sfx('boom'); yield* W(o.gap || 0.6);
  }
  yield* W(o.rec || 0.7);
};
MOVES.rain = function* (b, o) {
  yield* waitSpark(b, tele(b, 0.5), false, 'rain');
  for (let i = 0; i < (o.n || 6); i++) {
    triggerStrike(b, 'rain', 0.25, i % 2 === 0 ? 1 : -1);
    const g = tgt(b), a = Math.random() * TAU, d = i === 0 ? 0 : rand(40, 180);
    addHaz({ type: 'circle', x: clamp(g.x + Math.cos(a) * d, 0, AW), y: clamp(g.y + Math.sin(a) * d, 0, AH), r: o.R || 68, warn: tele(b, o.w || 1.0), dmg: dmgOf(b, o.dmg || 20), name: 'rain', col: o.col });
    yield* W(o.gap || 0.2);
  }
  yield* W(o.rec || 1.0);
};
MOVES.minions = function* (b, o) {
  if (F.minions.length >= 4) { yield* W(0.1); return; }
  yield* waitSpark(b, tele(b, 0.6), false, 'minions');
  triggerStrike(b, 'minions', 0.38, 0);
  for (let i = 0; i < (o.n || 2); i++) {
    const a = Math.random() * TAU;
    F.minions.push({ x: clamp(b.x + Math.cos(a) * (b.r + 30), 20, AW - 20), y: clamp(b.y + Math.sin(a) * (b.r + 30), 20, AH - 20), r: 18, hp: 1, img: b.img, spawn: 0, t: Math.random() * 5, cd: 0 });
    particles(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r, 8, '#a33', 160);
  }
  sfx('spawn'); yield* W(o.rec || 0.6);
};
MOVES.teleport = function* (b, o) {
  b.ghost = true; sfx('vanish'); let t = 0;
  while (t < 0.45) { t += BDT; b.alpha = 1 - t / 0.45; yield; }
  b.alpha = 0; yield* W(o.hide || 0.35);
  const g = tgt(b);
  if (o.burrow) {
    const T = tele(b, o.T || 0.95), h = addHaz({ type: 'circle', x: g.x, y: g.y, r: b.r + 50, warn: T, dmg: dmgOf(b, o.dmg || 28), name: 'burrow' });
    let tt = 0;
    while (tt < T) {
      tt += BDT;
      if (tt < T * 0.55) { const g2 = tgt(b); h.x += (g2.x - h.x) * Math.min(1, BDT * 3); h.y += (g2.y - h.y) * Math.min(1, BDT * 3); }
      if (Math.random() < 0.5) F.fx.push({ x: h.x + rand(-40, 40), y: h.y + rand(-40, 40), vx: rand(-40, 40), vy: rand(-80, -20), life: 0.5, t: 0, col: 'rgba(150,120,80,0.8)', size: 7 });
      if (!b.sparked && T - tt < 0.26) { b.sparkT = 0.32; b.sparked = true; sfx('spark'); b.x = h.x; b.y = h.y; }
      yield;
    }
    b.sparked = false; b.x = h.x; b.y = h.y; clampE(b); b.alpha = 1; b.ghost = false;
    b.strikeRange = b.r + 50; triggerStrike(b, 'slam', 0.40, 0);
    shake(12); sfx('slam'); dust(b.x, b.y, 24);
    yield* W(o.rec || 1.0); return;
  }
  const a = (g.isPlayer ? g.face + Math.PI : Math.random() * TAU) + rand(-0.5, 0.5);
  b.x = g.x + Math.cos(a) * (b.r + 85); b.y = g.y + Math.sin(a) * (b.r + 85); clampE(b); faceTo(b, g);
  t = 0; while (t < 0.18) { t += BDT; b.alpha = t / 0.18; yield; }
  b.alpha = 1; b.ghost = false;
  yield* MOVES.swipe(b, { n: o.n || 1, dmg: o.dmg, firstT: 0.45, rec: o.rec || 0.7, delay: b.p2 });
};
MOVES.burrow3 = function* (b) { for (let i = 0; i < 3; i++) yield* MOVES.teleport(b, { burrow: true, T: i ? 0.75 : 0.95, hide: 0.1, rec: i < 2 ? 0.25 : 1.2 }); };
MOVES.beam = function* (b, o) {
  faceTo(b, tgt(b));
  const sweep = (o.sweep || 140) * RAD * (Math.random() < 0.5 ? 1 : -1), a0 = b.face - sweep / 2, T = tele(b, o.T || 0.95);
  const h1 = addHaz({ type: 'beam', x: b.x, y: b.y, ang: a0, len: 1600, w: o.w || 34, warn: T, dur: o.dur || 1.4, sweep, dmg: dmgOf(b, o.dmg || 20), name: 'beam', col: o.col || '#ff3b2f', owner: b });
  if (o.double) addHaz({ type: 'beam', x: b.x, y: b.y, ang: a0 + Math.PI, len: 1600, w: o.w || 34, warn: T, dur: o.dur || 1.4, sweep, dmg: dmgOf(b, o.dmg || 20), name: 'beam', col: o.col || '#ff3b2f', owner: b });
  yield* waitSpark(b, T, false, 'beam');
  b.beaming = o.dur || 1.4; triggerStrike(b, 'beam', 0.35, 0);
  let bt = 0, bdur = o.dur || 1.4;
  while (bt < bdur) { bt += BDT; b.beaming = bdur - bt; if (h1 && h1.cur != null) b.face = h1.cur; yield; }
  b.beaming = 0;
  yield* W(o.rec || 0.7);
};
MOVES.beam2 = function* (b, o) { yield* MOVES.beam(b, { ...o, double: true, sweep: 200, dur: 2.0 }); };
MOVES.pool = function* (b, o) {
  yield* waitSpark(b, tele(b, 0.5), true, 'pool');
  for (let i = 0; i < (o.n || 3); i++) {
    const g = tgt(b);
    triggerStrike(b, 'spray', 0.26, i % 2 === 0 ? 1 : -1);
    addHaz({ type: 'pool', x: clamp(g.x + rand(-130, 130), 40, AW - 40), y: clamp(g.y + rand(-130, 130), 40, AH - 40), r: o.R || 72, warn: 0.75, life: o.life || 6, dmg: dmgOf(b, o.dmg || 7), name: 'pool', col: o.col || '#7bd13a', tick: {} , sx: b.x, sy: b.y });
    sfx('shoot'); yield* W(0.2);
  }
  yield* W(o.rec || 0.6);
};
MOVES.grab = function* (b, o) {
  yield* waitSpark(b, tele(b, o.T || 0.4), true, 'grab');
  { const g0 = tgt(b), dg = Math.min(dist(b, g0), o.dist || 270); if (rayBlock(b.x, b.y, b.face, dg) < dg - 10) { yield* W(0.4); return; } }
  b.contact = dmgOf(b, o.dmg || 30); b.contactName = 'grab'; b.dashing = 'grab'; triggerStrike(b, 'grab', 0.38, 0); sfx('dash');
  let d = 0; while (d < (o.dist || 270)) { const s = 1150 * BDT; b.x += Math.cos(b.face) * s; b.y += Math.sin(b.face) * s; d += s; const ph = pillarHitBy(b); if (ph) { b.dashing = null; crash(b, ph); return; } if (hitWall(b)) break; yield; }
  b.contact = 0; b.dashing = null; triggerStrike(b, 'swipe', 0.32, 0); yield* W(o.rec || 0.95);
};
MOVES.inhale = function* (b, o) {
  yield* W(tele(b, 0.4)); b.inhale = 1; b.moveKind = 'inhale'; sfx('inhale');
  let t = 0;
  while (t < (o.dur || 1.8)) {
    t += BDT; const p = F.p, a = Math.atan2(b.y - p.y, b.x - p.x);
    if (dist(p, b) > b.r + p.r + 4) { p.x += Math.cos(a) * (o.pull || 190) * BDT; p.y += Math.sin(a) * (o.pull || 190) * BDT; }
    faceTo(b, p); pullBarrels(b, BDT, o.pull || 190);
    if (Math.random() < 0.7) { const pa = b.face + rand(-0.6, 0.6), pd = rand(160, 320); F.fx.push({ x: b.x + Math.cos(pa) * pd, y: b.y + Math.sin(pa) * pd, vx: -Math.cos(pa) * 450, vy: -Math.sin(pa) * 450, life: 0.5, t: 0, col: 'rgba(220,220,255,0.6)', size: 4 }); }
    yield;
  }
  b.inhale = 0;
  const T = tele(b, 0.42);
  addHaz({ type: 'circle', x: b.x + Math.cos(b.face) * b.r * 0.7, y: b.y + Math.sin(b.face) * b.r * 0.7, r: b.r + 85, warn: T, dmg: dmgOf(b, o.dmg || 34), name: 'inhale' });
  spark(b);
  let ct = 0; b.wind = T; b.windP = 0;
  while (ct < T) { ct += BDT; b.windP = clamp(ct / Math.max(T, 0.01), 0, 1); yield; }
  b.wind = 0; b.windP = 0; b.sparked = false;
  b.strikeRange = b.r + 85; triggerStrike(b, 'chomp', 0.40, 0);
  sfx('chomp'); shake(10);
  yield* W(o.rec || 1.1);
};
MOVES.spin = function* (b, o) {
  yield* waitSpark(b, tele(b, 0.85), true, 'spin');
  b.contact = dmgOf(b, o.dmg || 24); b.contactName = 'spin'; b.spin = 1; sfx('dash');
  let ang = b.face, t = 0, retarget = 0;
  while (t < (o.dur || 2.6)) {
    t += BDT; retarget += BDT; const sp = o.sp || 620;
    b.x += Math.cos(ang) * sp * BDT; b.y += Math.sin(ang) * sp * BDT;
    if (b.x <= b.r || b.x >= AW - b.r) { ang = Math.PI - ang; shake(5); sfx('boom'); }
    if (b.y <= b.r || b.y >= AH - b.r) { ang = -ang; shake(5); sfx('boom'); }
    clampE(b);
    const ph = pillarHitBy(b); if (ph) { ang = Math.atan2(b.y - ph.y, b.x - ph.x); damagePillar(ph, 1); shake(8); b.x = ph.x + Math.cos(ang) * (ph.r + b.r * 0.8); b.y = ph.y + Math.sin(ang) * (ph.r + b.r * 0.8); }
    if (retarget > 1.1) { retarget = 0; const g = tgt(b); ang = Math.atan2(g.y - b.y, g.x - b.x) + rand(-0.3, 0.3); }
    yield;
  }
  b.contact = 0; b.spin = 0; yield* W(o.rec || 1.3);
};
function* ROAR(b) {
  b.wind = 1.2; b.moveKind = 'roar'; banner(b.name + ' is ANGRY!', '#ff5a44', 'It got faster…'); sfx('roar'); bossVoice(b, 'rage');
  let t = 0, done = false;
  while (t < 1.4) { t += BDT; b.roar = t; b.windP = clamp(t / 0.5, 0, 1); if (t > 0.5 && !done) { done = true; triggerStrike(b, 'roar', 0.55, 0); addHaz({ type: 'ring', x: b.x, y: b.y, r: b.r, v: 800, rmax: 1500, th: 40, warn: 0, dmg: 0, push: 700, name: 'roar' }); shake(16); } yield; }
  b.roar = 0; b.wind = 0; b.windP = 0;
}

// ---------------- BOSS AI ----------------
function pickMove(b) {
  const list = b.def.moves.concat(b.p2 ? b.def.p2 : []), g = tgt(b), d = dist(b, g);
  const near = new Set(['swipe', 'grab', 'inhale']), far = new Set(['spray', 'beam', 'beam2', 'rain', 'ring']);
  let tot = 0; const ws = list.map(m => {
    let w = m.w || 1;
    if (near.has(m.k) && d > 320) w *= 0.25;
    if (far.has(m.k) && d < 160) w *= 0.5;
    if (m.k === 'minions' && F.minions.length >= 3) w = 0;
    if (m.k === b.last && b.lastN >= 2) w = 0;
    tot += w; return w;
  });
  let r = Math.random() * tot;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[0];
}
function updateBoss(b, dt) {
  BDT = dt * (b.slowT > 0 ? 0.55 : 1) * (inMud(b) && b.air < 40 ? 0.6 : 1);
  b.bob += dt; b.flash = Math.max(0, b.flash - dt); b.sparkT = Math.max(0, b.sparkT - dt);
  if (b.gen && !b.dead && b.intro <= 0 && b.stagger <= 0) {
    const r = b.gen.next();
    if (r.done) { b.gen = null; b.wind = 0; b.windP = 0; b.contact = 0; b.dashing = null; b.beaming = 0; b.sparked = false; }
  }
  updateBossAnim(b, dt);
  if (b.intro > 0 && !b.dead) return;
  if (b.dead) { b.deadT += dt; if (Math.random() < 0.6) particles(b.x + rand(-b.r, b.r), b.y + rand(-b.r, b.r), 2, '#d8c27a', 200, 0.8, 6); return; }
  // elements
  if (b.slowT > 0) b.slowT -= dt;
  if (b.burnT > 0) {
    b.burnT -= dt; b.burnTick -= dt;
    if (Math.random() < 0.5) F.fx.push({ x: b.x + rand(-b.r * 0.6, b.r * 0.6), y: b.y + rand(-b.r * 0.3, b.r * 0.5), vx: rand(-20, 20), vy: rand(-120, -60), life: 0.6, t: 0, col: Math.random() < 0.5 ? '#ff8a2a' : '#ffd23a', size: 7 });
    if (b.burnTick <= 0) { b.burnTick = 0.5; const d = Math.round((3 + F.p.lvl * 0.7) * (b.def.weak === 'fire' ? 1.5 : 1)); damageBoss(b, d, 0, '#ff9a3a', true); }
  }
  if (b.poiseT > 0) b.poiseT -= dt; else b.poise = Math.max(0, b.poise - b.poiseMax * 0.12 * dt);
  if (b.stagger > 0) { b.stagger -= dt; if (b.stagger <= 0) b.poise = 0; return; }
  if (!b.gen) {
    if (b.hp < b.maxHp * 0.5 && !b.p2) { b.p2 = true; b.speed *= 1.15; b.gen = ROAR(b); return; }
    const g = tgt(b), d = dist(b, g), a = Math.atan2(g.y - b.y, g.x - b.x);
    faceTo(b, g);
    let vx = 0, vy = 0;
    if (d > b.pref + 40) { vx = Math.cos(a); vy = Math.sin(a); }
    else if (d < b.pref - 60) { vx = -Math.cos(a) * 0.6; vy = -Math.sin(a) * 0.6; }
    vx += Math.cos(a + Math.PI / 2) * 0.5 * b.strafe; vy += Math.sin(a + Math.PI / 2) * 0.5 * b.strafe;
    [vx, vy] = avoidDir(b, vx, vy);
    b.x += vx * b.speed * 0.8 * BDT; b.y += vy * b.speed * 0.8 * BDT;
    if (hitWall(b)) b.strafe *= -1;
    if (Math.random() < 0.004) b.strafe *= -1;
    b.idle -= BDT;
    if (b.idle <= 0) {
      b.target = (F.allies.length && Math.random() < 0.35) ? F.allies[0] : F.p;
      const m = pickMove(b);
      if (m.k === b.last) b.lastN++; else { b.last = m.k; b.lastN = 1; }
      b.gen = MOVES[m.k](b, m);
      if (Math.random() < 0.55) bossVoice(b, 'grunt');
      b.idle = rand(0.45, 1.0) * (b.p2 ? 0.7 : 1) * diff().idle;
    }
  }
}
function damageBoss(b, d, poise, col, quiet) {
  if (b.dead) return;
  b.hp -= d; F.dmgDealt += d;
  floatText(b.x + rand(-30, 30), b.y - b.r - b.air - 10, String(d), col || '#fff', quiet ? 18 : 26);
  if (!quiet) { b.flash = 0.1; b.hurtT = 0.18; if (F.time - (b.lastHurtV || 0) > 0.8) { b.lastHurtV = F.time; bossVoice(b, 'hurt'); } }
  if (poise) {
    b.poise += poise; b.poiseT = 2.5;
    if (b.poise >= b.poiseMax && b.stagger <= 0 && b.hp > 0) staggerBoss(b, 2.6, 'STAGGERED!', 'Hit it now — extra damage!');
  }
  if (b.hp <= 0) {
    b.hp = 0; b.dead = true; b.gen = null; b.contact = 0; b.air = 0; b.alpha = 1; b.dashing = null; b.beaming = 0;
    F.hz.length = 0; F.minions.forEach(m => particles(m.x, m.y, 10, '#a33')); F.minions.length = 0;
    banner('MONSTER FELLED', '#f2d27a', b.name); sfx('win'); shake(20); F.over = true; F.result = 'win'; F.overT = 0;
    bossVoice(b, 'death'); musicStop(); b.stagger = 0;
  }
}
function staggerBoss(b, dur, text, sub) {
  b.stagger = dur; b.gen = null; b.contact = 0; b.air = 0; b.alpha = 1; b.ghost = false; b.inhale = 0; b.spin = 0; b.wind = 0; b.windP = 0; b.dashing = null; b.beaming = 0; b.poise = b.poiseMax;
  b.sparked = false; banner(text, '#ffd84a', sub); sfx('stagger'); shake(10);
}

// ---------------- PLAYER ----------------
function hurt(t, dmg, sx, sy, name, push) {
  if (!t.alive || F.over) return false;
  if (t.isPlayer) {
    if (t.iframes > 0) { if (dmg > 0) { floatText(t.x, t.y - 40, 'dodge!', '#9fe3ff', 18); sfx('dodge'); t.dodges++; } return false; }
    if (t.inv > 0) return false;
    if (push) { const a = Math.atan2(t.y - sy, t.x - sx); t.kx = Math.cos(a) * push; t.ky = Math.sin(a) * push; if (!dmg) return true; }
    t.hp -= dmg; F.lastHit = name || 'default';
    if (t.state === 'drink') F.lastHit = 'drink';
    const a = Math.atan2(t.y - sy, t.x - sx); t.kx = Math.cos(a) * 420; t.ky = Math.sin(a) * 420;
    t.state = 'hurt'; t.t = 0; t.inv = 0.75; F.hitstop = 0.08; shake(10); sfx('hurt');
    particles(t.x, t.y, 12, '#e33', 240);
    floatText(t.x, t.y - 40, '-' + Math.round(dmg), '#ff5050', 22);
    if (t.hp <= 0) { t.hp = 0; t.alive = false; t.state = 'dead'; F.over = true; F.result = 'lose'; F.overT = 0; sfx('die'); }
    return true;
  } else {
    if (!dmg || t.inv > 0) return false;
    t.hp -= dmg; t.inv = 0.4; particles(t.x, t.y, 6, '#8cf');
    if (t.hp <= 0) t.alive = false;
    return true;
  }
}
function targetsFor() { return [F.p].concat(F.allies); }
function autoAim(P) {
  let best = null, bd = 1e9;
  const b = F.b;
  if (!b.dead && !b.ghost) { best = b; bd = dist(P, b) - b.r; }
  for (const m of F.minions) { const d = dist(P, m) - m.r; if (d < 140 && d < bd) { best = m; bd = d; } }
  if (best) P.face = Math.atan2(best.y - P.y, best.x - P.x);
}
function startAttack(P, c) {
  const w = P.w; P.state = 'attack'; P.t = 0; P.combo = c; P.hitSet = new Set();
  P.st -= w.st; P.stDelay = 0.55; P.buf.atk = 0; autoAim(P); sfx('swing');
}
function updatePlayer(P, dt) {
  const w = P.w;
  for (const k in P.buf) P.buf[k] = Math.max(0, P.buf[k] - dt);
  P.iframes = Math.max(0, P.iframes - dt); P.inv = Math.max(0, P.inv - dt);
  if (P.stDelay > 0) P.stDelay -= dt; else if (P.state !== 'attack' && P.state !== 'roll') P.st = Math.min(P.stMax, P.st + 48 * dt);
  // knockback
  P.x += P.kx * dt; P.y += P.ky * dt; P.kx *= Math.pow(0.002, dt); P.ky *= Math.pow(0.002, dt);
  const mx = INPUT.mx, my = INPUT.my, mag = Math.hypot(mx, my);
  P.t += dt; P.mud = inMud(P);
  if (P.mud && mag > 0.2 && Math.random() < 0.15) F.fx.push({ x: P.x + rand(-10, 10), y: P.y + 14, vx: rand(-40, 40), vy: rand(-60, -20), life: 0.4, t: 0, col: 'rgba(90,60,30,0.8)', size: 4 });
  if (P.imbue) { P.imbue.t -= dt; if (P.imbue.t <= 0) P.imbue = null; }
  const canAct = P.st > 0;
  switch (P.state) {
    case 'free': {
      const sp = 270 * (P.mud ? 0.55 : 1);
      P.x += mx * sp * dt; P.y += my * sp * dt;
      if (mag > 0.15) P.face = Math.atan2(my, mx);
      if (P.buf.roll && canAct) startRoll(P);
      else if (P.buf.atk && canAct) startAttack(P, 0);
      else if (P.buf.heal) { P.buf.heal = 0; if (P.flasks > 0) { P.flasks--; P.state = 'drink'; P.t = 0; P.healed = false; sfx('drink'); } else floatText(P.x, P.y - 40, 'no potions!', '#ccc', 18); }
      break;
    }
    case 'roll': {
      const k = P.t / 0.4, sp = 560 * (1 - k * 0.7) * (P.mud ? 0.7 : 1);
      P.x += Math.cos(P.rollA) * sp * dt; P.y += Math.sin(P.rollA) * sp * dt;
      P.iframes = (P.t > 0.02 && P.t < 0.32) ? 0.02 : 0;
      if (P.t >= 0.4) { P.state = 'free'; P.t = 0; if (P.buf.atk && canAct) startAttack(P, 0); }
      break;
    }
    case 'attack': {
      const T1 = w.wind, T2 = w.wind + w.act, T3 = T2 + w.rec * (P.combo === w.combo - 1 ? 1.4 : 1);
      if (P.t < T1) { P.x += Math.cos(P.face) * 60 * dt; P.y += Math.sin(P.face) * 60 * dt; }
      if (P.t >= T1 && P.t < T2) {
        if (w.lunge) { P.x += Math.cos(P.face) * w.lunge * 5 * dt; P.y += Math.sin(P.face) * w.lunge * 5 * dt; }
        checkPlayerHits(P);
      }
      if (P.t > T2 && P.buf.roll && canAct) { startRoll(P); break; }
      if (P.t > T2 + w.rec * 0.3 && P.buf.atk && P.combo < w.combo - 1 && canAct) { startAttack(P, P.combo + 1); break; }
      if (P.t >= T3) { P.state = 'free'; P.t = 0; P.combo = 0; }
      break;
    }
    case 'drink': {
      P.x += mx * 90 * dt; P.y += my * 90 * dt;
      if (P.t > 0.55 && !P.healed) { P.healed = true; P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.5); particles(P.x, P.y, 18, '#6f6', 140, 0.8); floatText(P.x, P.y - 40, '+HP', '#6f6', 22); }
      if (P.t > 0.95) { P.state = 'free'; P.t = 0; }
      break;
    }
    case 'hurt': if (P.t > 0.32) { P.state = 'free'; P.t = 0; } break;
    case 'dead': break;
  }
  clampE(P); pushSolids(P, P.r);
  // body push vs boss
  const b = F.b;
  if (!b.dead && !b.ghost && b.air < 40) {
    const d = dist(P, b), m = P.r + b.r * 0.82;
    if (d < m && d > 0) { const a = Math.atan2(P.y - b.y, P.x - b.x); P.x = b.x + Math.cos(a) * m; P.y = b.y + Math.sin(a) * m; clampE(P); }
  }
}
function startRoll(P) {
  P.state = 'roll'; P.t = 0; P.buf.roll = 0; P.st -= 22; P.stDelay = 0.6; sfx('roll');
  const mag = Math.hypot(INPUT.mx, INPUT.my);
  P.rollA = mag > 0.15 ? Math.atan2(INPUT.my, INPUT.mx) : P.face + Math.PI;
  if (mag > 0.15) P.face = P.rollA;
}
function checkPlayerHits(P) {
  const w = P.w, b = F.b, arc = w.arc * RAD;
  const hits = (e, er) => { const d = dist(P, e); if (d - er > w.reach + P.r) return false; const a = Math.atan2(e.y - P.y, e.x - P.x); return Math.abs(angDiff(P.face, a)) < arc / 2 + Math.atan2(er, Math.max(d, 1)); };
  if (!b.dead && !b.ghost && b.air < 60 && !P.hitSet.has(b) && hits(b, b.r * 0.85)) {
    P.hitSet.add(b);
    const last = P.combo === w.combo - 1 && w.combo > 2;
    let d = w.dmg * (1 + WLVL_MULT * P.lvl) * (last ? 1.5 : 1);
    const ch = P.imbue ? P.imbue.e : SAVE.equip.charm, weak = ch && ch === b.def.weak;
    if (weak) d *= 1.35;
    if (b.stagger > 0) d *= 1.7;
    d = Math.round(d * rand(0.92, 1.08));
    let poise = w.poise * (last ? 1.5 : 1) * (ch === 'spark' ? 1.7 : 1);
    damageBoss(b, d, poise, weak ? '#ffd84a' : '#fff');
    F.hitstop = w.dmg > 40 ? 0.09 : 0.045; shake(w.dmg > 40 ? 9 : 4); sfx(w.dmg > 40 ? 'bighit' : 'hit');
    const hx = (P.x + b.x) / 2, hy = (P.y + b.y) / 2; particles(hx, hy, 10, '#fff2c0', 260, 0.35, 4);
    if (ch === 'fire') { b.burnB += 0.22 * (weak ? 1.6 : 1); if (b.burnB >= 1) { b.burnB = 0; b.burnT = 4; floatText(b.x, b.y - b.r - 40, 'BURNING!', '#ff8a2a', 22); sfx('burn'); } }
    if (ch === 'ice') { b.iceB += 0.16 * (weak ? 1.6 : 1); if (b.iceB >= 1) { b.iceB = 0; b.slowT = 4.5; floatText(b.x, b.y - b.r - 40, 'FROZEN!', '#9fe3ff', 22); particles(b.x, b.y, 20, '#cff', 200); } }
    if (ch === 'spark') particles(hx, hy, 6, '#ffe84a', 300, 0.3, 3);
  }
  for (const m of F.minions) {
    if (!P.hitSet.has(m) && hits(m, m.r)) { P.hitSet.add(m); m.hp = 0; particles(m.x, m.y, 12, '#a33', 200); sfx('hit'); }
  }
  if (F.objs) for (const o of F.objs) {
    if (P.hitSet.has(o) || !(o.k === 'barrel' || o.k === 'shrine' || o.k === 'drop')) continue;
    if (o.k === 'barrel' && o.state !== 'idle') continue;
    const tgtO = o.k === 'drop' ? { x: o.lx, y: o.ly } : o, rr = o.k === 'drop' ? o.lr + 10 : o.r + 6;
    if (hits(tgtO, rr)) { P.hitSet.add(o); lairHit(o); sfx('hit'); }
  }
}

// ---------------- SPIRIT ALLY ----------------
function summonSpirit() {
  const id = SAVE.equip.spirit; if (!id || F.spiritUsed || F.over) return;
  const def = BOSSES.find(b => b.id === id); if (!def) return;
  F.spiritUsed = true; sfx('summon');
  const P = F.p, a = P.face + Math.PI;
  const tierPow = 4 + def.tier * 3;
  F.allies.push({ x: P.x + Math.cos(a) * 50, y: P.y + Math.sin(a) * 50, r: 26, hp: 40 + def.tier * 25, maxHp: 40 + def.tier * 25, life: 16, cd: 0.6, dmg: tierPow, img: img('a/' + id + '.webp'), alive: true, inv: 0, name: def.name, bob: 0 });
  floatText(P.x, P.y - 60, def.name + ' helps you!', '#9fe3ff', 22);
  particles(P.x, P.y, 24, '#9fe3ff', 220, 0.8);
}
function updateAllies(dt) {
  const b = F.b;
  for (const a of F.allies) {
    a.life -= dt; a.inv = Math.max(0, a.inv - dt); a.bob += dt;
    if (!b.dead && !b.ghost) {
      const d = dist(a, b);
      if (d > b.r + a.r + 10) stepTo(a, b, 230, dt);
      a.cd -= dt;
      if (a.cd <= 0 && d < b.r + a.r + 30 && b.air < 60) { a.cd = 0.85; damageBoss(b, a.dmg, a.dmg * 0.6, '#9fe3ff'); sfx('hit'); particles((a.x + b.x) / 2, (a.y + b.y) / 2, 6, '#9fe3ff'); }
    }
    if (a.life <= 0) a.alive = false;
  }
  for (const a of F.allies) if (!a.alive) particles(a.x, a.y, 18, '#9fe3ff', 200);
  F.allies = F.allies.filter(a => a.alive);
}
function stepTo(e, t, sp, dt) { const a = Math.atan2(t.y - e.y, t.x - e.x); e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt; clampE(e); }

// ---------------- HAZARDS ----------------
function updateHazards(dt) {
  const T = targetsFor();
  for (const h of F.hz) {
    h.t += BDT;
    const live = h.t >= h.warn;
    switch (h.type) {
      case 'circle':
        if (live && !h.fired) { h.fired = true; for (const t of T) if (dist(t, h) < h.r + t.r * 0.5) hurt(t, h.dmg, h.x, h.y, h.name); if (h.name === 'rain') { sfx('boom'); shake(4); } particles(h.x, h.y, 10, h.col || '#ff6a3a', 200, 0.4); }
        if (h.t > h.warn + 0.25) h.dead = true; break;
      case 'cone':
        if (live && !h.fired) { h.fired = true; sfx('swing');
          for (const t of T) { const d = dist(t, h); if (d < h.range + t.r * 0.5) { const a = Math.atan2(t.y - h.y, t.x - h.x); if (Math.abs(angDiff(h.ang, a)) < h.arc / 2) hurt(t, h.dmg, h.x, h.y, h.name); } } }
        if (h.t > h.warn + 0.18) h.dead = true; break;
      case 'line': h.eff = rayBlock(h.x, h.y, h.ang, h.len); if (h.t > h.warn) h.dead = true; break;
      case 'proj':
        h.x += h.vx * BDT; h.y += h.vy * BDT; h.life -= BDT;
        if (F.objs) for (const o of F.objs) { if ((o.k === 'pillar' && o.hp > 0 && dist(h, o) < o.r + h.r) || (o.k === 'barrel' && o.state !== 'gone' && dist({ x: h.x, y: h.y }, { x: o.x, y: o.y - o.r }) < o.r + h.r)) { h.dead = true; particles(h.x, h.y, 6, h.col, 120, 0.3, 3); } }
        if (h.dead) break;
        for (const t of T) if (!h.hit.has(t) && dist(t, h) < h.r + t.r * 0.7) { if (hurt(t, h.dmg, h.x - h.vx, h.y - h.vy, h.name)) { h.dead = true; } h.hit.add(t); }
        if (h.life <= 0 || h.x < -50 || h.x > AW + 50 || h.y < -50 || h.y > AH + 50) h.dead = true; break;
      case 'ring':
        h.r += h.v * BDT;
        for (const t of T) if (!h.hit.has(t) && Math.abs(dist(t, h) - h.r) < h.th / 2 + t.r * 0.6) { h.hit.add(t); hurt(t, h.dmg, h.x, h.y, h.name, h.push); }
        if (h.r > h.rmax) h.dead = true; break;
      case 'beam': {
        if (h.owner) { h.x = h.owner.x; h.y = h.owner.y; }
        if (live) {
          const k = Math.min(1, (h.t - h.warn) / h.dur); h.cur = h.ang + h.sweep * k;
          h.eff = rayBlock(h.x, h.y, h.cur, h.len);
          const x2 = h.x + Math.cos(h.cur) * h.eff, y2 = h.y + Math.sin(h.cur) * h.eff;
          for (const t of T) { h.cd = h.cd || new Map(); if ((h.cd.get(t) || 0) > h.t) continue; if (segDist(t.x, t.y, h.x, h.y, x2, y2) < h.w / 2 + t.r * 0.6) { if (hurt(t, h.dmg, h.x, h.y, h.name) || t.iframes > 0) h.cd.set(t, h.t + 0.5); } }
          if (h.t > h.warn + h.dur) h.dead = true;
        } else { h.cur = h.ang; h.eff = rayBlock(h.x, h.y, h.ang, h.len); }
        if (F.b.stagger > 0 || F.b.dead) h.dead = true;
        break;
      }
      case 'pool':
        if (live) { for (const t of T) { if (dist(t, h) < h.r) { const n = h.tick[t.isPlayer ? 'p' : 'a'] || 0; if (h.t > n) { h.tick[t.isPlayer ? 'p' : 'a'] = h.t + 0.5; if (t.isPlayer && t.iframes <= 0 && t.inv <= 0) { t.hp -= h.dmg; F.lastHit = 'pool'; floatText(t.x, t.y - 40, '-' + Math.round(h.dmg), '#9f6', 18); sfx('burn'); if (t.hp <= 0) { t.hp = 0; t.alive = false; t.state = 'dead'; F.over = true; F.result = 'lose'; F.overT = 0; sfx('die'); } } else if (!t.isPlayer) hurt(t, h.dmg, h.x, h.y); } } } }
        if (h.t > h.warn + h.life) h.dead = true; break;
    }
  }
  F.hz = F.hz.filter(h => !h.dead);
}

function updateMinions(dt) {
  const b = F.b;
  for (const m of F.minions) {
    m.t += dt; m.spawn = Math.min(1, m.spawn + dt * 2); m.cd -= dt;
    const tg = (F.allies.length && dist(m, F.allies[0]) < dist(m, F.p)) ? F.allies[0] : F.p;
    if (m.spawn >= 1) stepTo(m, tg, 135 * (b.slowT > 0 ? 0.6 : 1), dt);
    if (m.cd <= 0 && dist(m, tg) < m.r + tg.r + 4) { m.cd = 0.8; hurt(tg, dmgOf(b, 9), m.x, m.y, 'minion'); }
  }
  F.minions = F.minions.filter(m => m.hp > 0);
  // contact damage from boss body
  if (b.contact > 0 && !b.dead) for (const t of targetsFor()) if (dist(t, b) < b.r * 0.85 + t.r) hurt(t, b.contact, b.x, b.y, b.contactName || 'contact');
}

// ---------------- MAIN UPDATE ----------------
function update(dt) {
  if (!F || F.paused) return;
  readMove();
  if (F.hitstop > 0) { F.hitstop -= dt; dt *= 0.08; }
  F.time += dt;
  F.shake = Math.max(0, F.shake - 40 * dt);
  if (F.banner) { F.banner.t += dt; if (F.banner.t > F.banner.dur) F.banner = null; }
  updatePlayer(F.p, dt);
  updateBoss(F.b, dt);
  if (!F.b.dead) { updateHazards(dt); updateMinions(dt); }
  updateAllies(dt);
  updateLair(dt);
  const bb = F.b; if (!bb.dead && !bb.ghost && bb.air < 40) pushSolids(bb, bb.r * 0.7);
  for (const m of F.minions) pushSolids(m, m.r); for (const a of F.allies) pushSolids(a, a.r);
  for (const p of F.fx) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
  F.fx = F.fx.filter(p => p.t < p.life);
  for (const t of F.texts) { t.t += dt; t.y -= 40 * dt; }
  F.texts = F.texts.filter(t => t.t < 1.0);
  if (F.over && F.result === 'lose' && !F.musicStopped) { F.musicStopped = true; musicStop(); }
  if (F.over) { F.overT += dt; if (F.overT > (F.result === 'win' ? 3.0 : 2.6) && !F.reported) { F.reported = true; UI.fightOver(F.result, F); } }
}

// ---------------- RENDER ----------------
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  SW = window.innerWidth; SH = window.innerHeight;
  cvs.width = SW * DPR; cvs.height = SH * DPR; cvs.style.width = SW + 'px'; cvs.style.height = SH + 'px';
  SC = Math.min(SW / (AW + 40), SH / (AH + 40)); OX = (SW - AW * SC) / 2; OY = (SH - AH * SC) / 2;
  layoutButtons();
}
function drawArena() {
  const g = ctx;
  g.fillStyle = '#0b0809'; g.fillRect(-OX / SC, -OY / SC, SW / SC, SH / SC);
  // backdrop: blurred monster art
  const bg = F.bg;
  if (bg.complete && bg.naturalWidth) {
    const s = Math.max((SW / SC) / bg.naturalWidth, (SH / SC) / bg.naturalHeight);
    g.globalAlpha = 0.9; g.drawImage(bg, AW / 2 - bg.naturalWidth * s / 2, AH / 2 - bg.naturalHeight * s / 2, bg.naturalWidth * s, bg.naturalHeight * s); g.globalAlpha = 1;
  }
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(-OX / SC, -OY / SC, SW / SC, SH / SC);
  g.save(); roundRect(g, 0, 0, AW, AH, 40); g.clip();
  drawLairFloor(g);
  g.restore();
  drawLairFloorOverlay(g);
}
function drawLairFloorOverlay(g) {
  g.save(); g.lineWidth = 26; g.strokeStyle = F.lair.rim; roundRect(g, -13, -13, AW + 26, AH + 26, 46); g.stroke();
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,230,190,0.25)'; roundRect(g, 0, 0, AW, AH, 40); g.stroke(); g.restore();
  drawTorches();
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawHazards() {
  const g = ctx;
  for (const h of F.hz) {
    const k = h.warn > 0 ? clamp(h.t / h.warn, 0, 1) : 1, live = h.t >= h.warn;
    const red = h.col && h.type !== 'proj' ? h.col : '#ff3020';
    g.save();
    switch (h.type) {
      case 'circle':
        if (!live) {
          g.globalAlpha = 0.18 + 0.25 * k; g.fillStyle = red; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill();
          g.globalAlpha = 0.9; g.strokeStyle = red; g.lineWidth = 3; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke();
          g.globalAlpha = 0.5; g.beginPath(); g.arc(h.x, h.y, h.r * k, 0, TAU); g.stroke();
        } else { g.globalAlpha = 1 - (h.t - h.warn) / 0.25; g.fillStyle = '#ffb060'; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill(); }
        break;
      case 'cone':
        g.translate(h.x, h.y); g.rotate(h.ang);
        g.globalAlpha = live ? 0.75 : 0.15 + 0.3 * k; g.fillStyle = live ? '#ffb060' : red;
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, h.range, -h.arc / 2, h.arc / 2); g.closePath(); g.fill();
        if (!live) { g.globalAlpha = 0.8; g.strokeStyle = red; g.lineWidth = 3; g.stroke(); }
        break;
      case 'line':
        g.translate(h.x, h.y); g.rotate(h.ang); g.globalAlpha = 0.12 + 0.25 * k; g.fillStyle = red; const L1 = h.eff || h.len;
        g.fillRect(0, -h.w / 2, L1, h.w); g.globalAlpha = 0.6; g.strokeStyle = red; g.lineWidth = 2; g.strokeRect(0, -h.w / 2, L1, h.w);
        if (h.eff && h.eff < h.len - 1) { g.globalAlpha = 0.9; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.save(); g.translate(L1, 0); g.rotate(-h.ang); g.fillText('💥', 0, 10); g.restore(); }
        break;
      case 'proj':
        g.fillStyle = h.col; g.shadowColor = h.col; g.shadowBlur = 14; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill();
        g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(h.x - h.r * 0.3, h.y - h.r * 0.3, h.r * 0.35, 0, TAU); g.fill();
        break;
      case 'ring':
        g.globalAlpha = h.dmg ? 0.85 : 0.4; g.strokeStyle = h.dmg ? '#ff6a3a' : '#fff'; g.lineWidth = h.th; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke();
        g.globalAlpha = 0.5; g.strokeStyle = '#ffd0a0'; g.lineWidth = 4; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke();
        break;
      case 'beam':
        g.translate(h.x, h.y); g.rotate(h.cur || h.ang);
        if (!live) {
          g.globalAlpha = 0.35 + 0.4 * k; g.strokeStyle = red; g.lineWidth = 3; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(0, 0); g.lineTo(h.eff || h.len, 0); g.stroke(); g.setLineDash([]);
          g.globalAlpha = 0.18; g.fillStyle = red; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 420, 0, h.sweep, h.sweep < 0); g.closePath(); g.fill();
        } else {
          const L2 = h.eff || h.len;
          g.globalAlpha = 0.9; g.fillStyle = red; g.shadowColor = red; g.shadowBlur = 25; g.fillRect(0, -h.w / 2, L2, h.w);
          g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = 0.7; g.fillRect(0, -h.w / 6, L2, h.w / 3);
          if (L2 < h.len - 1) { g.globalAlpha = 0.9; g.fillStyle = '#fff'; g.beginPath(); g.arc(L2, 0, h.w * 0.8, 0, TAU); g.fill(); }
        }
        break;
      case 'pool':
        if (!live) { g.globalAlpha = 0.9; g.fillStyle = h.col; const px = h.sx + (h.x - h.sx) * k, py = h.sy + (h.y - h.sy) * k - Math.sin(k * Math.PI) * 120; g.beginPath(); g.arc(px, py, 12, 0, TAU); g.fill();
          g.globalAlpha = 0.35; g.strokeStyle = h.col; g.lineWidth = 3; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke(); }
        else { const fade = clamp((h.warn + h.life - h.t) / 0.6, 0, 1); g.globalAlpha = 0.45 * fade; g.fillStyle = h.col; g.beginPath();
          for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU, rr = h.r * (0.9 + 0.1 * Math.sin(a * 3 + h.t * 2)); i ? g.lineTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr) : g.moveTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr); }
          g.fill(); g.globalAlpha = 0.6 * fade; g.fillStyle = '#fff'; g.beginPath(); g.arc(h.x + Math.sin(h.t * 3) * h.r * 0.4, h.y + Math.cos(h.t * 2) * h.r * 0.3, 5, 0, TAU); g.fill(); }
        break;
    }
    g.restore();
  }
}
function drawShadow(x, y, r, a = 0.4) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r * 1.0, r * 0.4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
function drawBoss(b) {
  const g = ctx;
  if (b.alpha <= 0.01 && !b.dead) return;
  const S = b.r * 3.5;
  drawShadow(b.x, b.y, b.r * (b.air ? 0.8 : 1), 0.45);
  g.save();
  g.globalAlpha = b.dead ? Math.max(0, 1 - b.deadT / 2.4) : b.alpha;
  let bob = Math.sin(b.bob * 3) * 4, sx = 1, sy = 1;
  if (b.wind > 0) { const q = Math.sin(F.time * 40) * 3; g.translate(q, 0); sx = 1.05; sy = 0.96; }
  if (b.stagger > 0) { sx = 1.06; sy = 0.92; bob = 0; }
  if (b.roar) { const s = 1 + Math.sin(b.roar * 20) * 0.05; sx *= s; sy *= s; }
  if (b.spin) g.translate(b.x, b.y - b.air), g.rotate(F.time * 18), g.translate(-b.x, -(b.y - b.air));
  if (b.dead) { g.translate(rand(-4, 4), rand(-4, 4)); sy *= 1 - b.deadT * 0.15; }
  // glow when winding up
  if (b.wind > 0 || b.inhale) {
    const gr = g.createRadialGradient(b.x, b.y - b.air, b.r * 0.3, b.x, b.y - b.air, b.r * 1.6);
    gr.addColorStop(0, 'rgba(255,40,20,0.45)'); gr.addColorStop(1, 'rgba(255,40,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y - b.air, b.r * 1.6, 0, TAU); g.fill();
  }
  if (b.slowT > 0) { g.fillStyle = 'rgba(150,220,255,0.25)'; g.beginPath(); g.arc(b.x, b.y - b.air, b.r * 1.15, 0, TAU); g.fill(); }
  const flip = Math.cos(b.face) < -0.2 ? -1 : 1;
  g.translate(b.x, b.y - b.air + bob); g.scale(sx * flip, sy);
  if (b.img.complete && b.img.naturalWidth) g.drawImage(b.img, -S / 2, -S * 0.6, S, S);
  if (b.flash > 0 && b.img.complete) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(0.7, b.flash * 7); g.drawImage(b.img, -S / 2, -S * 0.6, S, S); }
  g.restore();
  // sparkle cue ✦
  if (b.sparkT > 0) {
    const k = b.sparkT / 0.32, x = b.x + Math.cos(b.face) * b.r * 0.4, y = b.y - b.air - b.r * 0.9;
    g.save(); g.translate(x, y); g.rotate(k * 2); const s = 30 + (1 - k) * 25; g.globalAlpha = k;
    g.fillStyle = '#fff'; g.shadowColor = '#ffe680'; g.shadowBlur = 30;
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.18 : s; const a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    g.restore();
  }
  if (b.stagger > 0) {
    g.save(); g.fillStyle = '#ffd84a'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = F.time * 4 + i * TAU / 3; g.fillText('★', b.x + Math.cos(a) * b.r * 0.7, b.y - b.r * 1.3 + Math.sin(a) * 12); }
    g.restore();
  }
}
// drawPlayer / weapon art live in hero.js
function drawMinions() {
  const g = ctx;
  for (const m of F.minions) {
    drawShadow(m.x, m.y, m.r, 0.4);
    const s = m.r * 3.2 * m.spawn, wob = Math.sin(m.t * 12) * 0.12;
    g.save(); g.translate(m.x, m.y - Math.abs(Math.sin(m.t * 10)) * 5); g.rotate(wob);
    if (m.img.complete) g.drawImage(m.img, -s / 2, -s * 0.6, s, s);
    g.restore();
  }
}
function drawAllies() {
  const g = ctx;
  for (const a of F.allies) {
    const s = a.r * 3.4, fade = Math.min(1, a.life / 1.5);
    g.save(); g.globalAlpha = 0.85 * fade;
    const gr = g.createRadialGradient(a.x, a.y, 4, a.x, a.y, a.r * 1.8); gr.addColorStop(0, 'rgba(120,220,255,0.6)'); gr.addColorStop(1, 'rgba(120,220,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(a.x, a.y, a.r * 1.8, 0, TAU); g.fill();
    g.translate(a.x, a.y + Math.sin(a.bob * 5) * 4);
    if (a.img.complete) g.drawImage(a.img, -s / 2, -s * 0.6, s, s);
    g.restore();
  }
}
function drawFx() {
  const g = ctx;
  for (const p of F.fx) { g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.size, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  g.textAlign = 'center';
  for (const t of F.texts) { g.globalAlpha = 1 - t.t; g.font = `900 ${t.size}px system-ui, sans-serif`; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(t.text, t.x, t.y); g.fillStyle = t.col; g.fillText(t.text, t.x, t.y); }
  g.globalAlpha = 1;
}
function bar(g, x, y, w, h, k, col, back = 'rgba(0,0,0,0.6)', ghost) {
  g.fillStyle = back; g.fillRect(x - 2, y - 2, w + 4, h + 4);
  if (ghost != null) { g.fillStyle = 'rgba(255,220,180,0.5)'; g.fillRect(x, y, w * clamp(ghost, 0, 1), h); }
  g.fillStyle = col; g.fillRect(x, y, w * clamp(k, 0, 1), h);
}
function drawHUD() {
  const g = ctx, P = F.p, b = F.b, s = clamp(Math.min(SW, SH) / 800, 0.75, 1.25);
  // player bars
  const hw = 260 * s * (P.maxHp / 100) ** 0.5;
  P.ghostHp = P.ghostHp == null ? P.hp : P.ghostHp + (P.hp - P.ghostHp) * 0.05;
  bar(g, 20, 20, hw, 16 * s, P.hp / P.maxHp, '#c8302c', undefined, P.ghostHp / P.maxHp);
  bar(g, 20, 22 + 20 * s, 200 * s, 9 * s, P.st / P.stMax, P.st < 20 ? '#8a9a3a' : '#4fbf5a');
  g.font = `bold ${16 * s}px system-ui`; g.fillStyle = '#fff'; g.textAlign = 'left';
  g.fillText(HERO_NAME, 22, 24 + 42 * s);
  // boss bar
  const bw = Math.min(SW * 0.5, 640), bx = SW / 2 - bw / 2, by = SH - 46 * s;
  b.ghostHp = b.ghostHp == null ? b.hp : b.ghostHp + (b.hp - b.ghostHp) * 0.04;
  g.textAlign = 'left'; g.font = `600 ${18 * s}px Georgia, serif`; g.fillStyle = '#eadbb4'; g.fillText(b.name, bx, by - 10);
  const chH = P.imbue ? P.imbue.e : SAVE.equip.charm;
  if (b.def.weak && chH === b.def.weak) { g.textAlign = 'right'; g.fillText('weak to your ' + ELEM[b.def.weak] + '!', bx + bw, by - 10); }
  if (P.imbue) { g.textAlign = 'left'; g.font = `bold ${16 * s}px system-ui`; g.fillStyle = '#fff'; g.fillText(ELEM[P.imbue.e] + ' ' + Math.ceil(P.imbue.t) + 's', 22 + 110 * s, 24 + 42 * s); }
  bar(g, bx, by, bw, 12 * s, b.hp / b.maxHp, '#9c1c1c', undefined, b.ghostHp / b.maxHp);
  bar(g, bx, by + 16 * s, bw, 5 * s, b.poise / b.poiseMax, b.stagger > 0 ? '#fff' : '#d9b23a');
  // buttons
  for (const k in BTNS) {
    const B = BTNS[k]; let dim = false, extra = '';
    if (k === 'heal') { extra = String(P.flasks); dim = P.flasks <= 0; }
    if (k === 'spirit') { if (!SAVE.equip.spirit) continue; dim = F.spiritUsed; }
    if ((k === 'atk' || k === 'roll') && P.st <= 0) dim = true;
    g.save(); g.globalAlpha = dim ? 0.3 : (INPUT.btn[k] ? 0.95 : 0.6);
    g.fillStyle = k === 'atk' ? 'rgba(160,40,30,0.75)' : 'rgba(30,30,40,0.7)'; g.strokeStyle = 'rgba(255,230,190,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.arc(B.x, B.y, B.r, 0, TAU); g.fill(); g.stroke();
    g.globalAlpha = dim ? 0.4 : 1; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (k === 'spirit' && SAVE.equip.spirit) { const im = img('a/' + SAVE.equip.spirit + '.webp'); if (im.complete) { g.save(); g.beginPath(); g.arc(B.x, B.y, B.r * 0.85, 0, TAU); g.clip(); g.drawImage(im, B.x - B.r, B.y - B.r * 1.1, B.r * 2, B.r * 2); g.restore(); } }
    else { g.font = `${B.r * 0.85}px sans-serif`; g.fillText(B.icon, B.x, B.y - (B.label ? B.r * 0.12 : 0)); }
    if (B.label) { g.font = `bold ${B.r * 0.22}px system-ui`; g.fillStyle = '#fff'; g.fillText(B.label, B.x, B.y + B.r * 0.55); }
    if (extra) { g.font = `bold ${B.r * 0.42}px system-ui`; g.fillStyle = '#fff'; g.fillText(extra, B.x + B.r * 0.7, B.y + B.r * 0.7); }
    if (INPUT.kb && B.key) { g.font = `bold ${13 * s}px system-ui`; g.fillStyle = '#ffe9a8'; g.globalAlpha = 0.9; g.fillText(B.key, B.x, B.y - B.r - 10 * s); }
    g.restore();
  }
  // joystick
  if (INPUT.joy) {
    const j = INPUT.joy, R = 70 * s;
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#000'; g.beginPath(); g.arc(j.ox, j.oy, R, 0, TAU); g.fill();
    g.globalAlpha = 0.8; g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,240,220,0.85)'; g.beginPath(); g.arc(j.x, j.y, R * 0.42, 0, TAU); g.fill(); g.restore();
  } else if (INPUT.kb) {
    g.save(); g.globalAlpha = 0.55; g.font = `bold ${14 * s}px system-ui`; g.fillStyle = '#fff'; g.textAlign = 'left';
    g.fillText('Move: WASD / arrows', 20, SH - 20); g.restore();
  } else if (F.time < 6) {
    g.save(); g.globalAlpha = 0.25 + 0.15 * Math.sin(F.time * 4); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(150 * s, SH - 150 * s, 70 * s, 0, TAU); g.stroke();
    g.font = `bold ${15 * s}px system-ui`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.globalAlpha = 0.7; g.fillText('drag here to move', 150 * s, SH - 150 * s); g.restore();
  }
  // banner
  if (F.banner) {
    const B = F.banner, a = Math.min(1, B.t / 0.3, (B.dur - B.t) / 0.5);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
    const gy = SH * 0.36;
    const grd = g.createLinearGradient(0, 0, SW, 0); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, 'rgba(0,0,0,0.65)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, gy - 50 * s, SW, 100 * s);
    g.font = `600 ${46 * s}px Georgia, serif`; g.fillStyle = B.col; g.shadowColor = B.col; g.shadowBlur = 20; g.fillText(B.text, SW / 2, gy - (B.sub ? 10 * s : 0));
    if (B.sub) { g.shadowBlur = 0; g.font = `italic ${18 * s}px Georgia, serif`; g.fillStyle = '#ddd'; g.fillText(B.sub, SW / 2, gy + 30 * s); }
    g.restore();
  }
  if (F.over && F.result === 'lose' && F.overT > 0.6) {
    const a = Math.min(1, (F.overT - 0.6) / 0.8);
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, SH / 2 - 60 * s, SW, 120 * s);
    g.font = `600 ${72 * s}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b3201c'; g.shadowColor = '#f00'; g.shadowBlur = 25; g.fillText('YOU DIED', SW / 2, SH / 2); g.restore();
  }
}
function render() {
  const g = ctx;
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, SW, SH);
  if (!F) return;
  const sh = F.shake;
  g.save(); g.translate(OX + rand(-sh, sh), OY + rand(-sh, sh)); g.scale(SC, SC);
  drawArena();
  drawHazards();
  // depth sort
  const ents = [{ y: F.b.y + F.b.r * 0.5, d: () => drawBossFancy(F.b) }, { y: F.p.y, d: () => drawPlayer(F.p) }];
  for (const o of F.objs) if (o.k !== 'mud') ents.push({ y: o.k === 'drop' ? o.ly : o.y, d: () => drawObj(o) });
  ents.sort((a, b) => a.y - b.y);
  drawMinions();
  for (const e of ents) if (e.d) e.d();
  drawAllies();
  drawHanging();
  drawAmbient();
  drawFx();
  g.restore();
  drawHUD();
}
function loop(t) {
  const dt = Math.min(0.05, (t - (loop.last || t)) / 1000); loop.last = t;
  try { update(dt); render(); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function initEngine() {
  cvs = document.getElementById('game'); ctx = cvs.getContext('2d');
  resize(); window.addEventListener('resize', resize);
  cvs.addEventListener('pointerdown', onDown, { passive: false });
  cvs.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  document.addEventListener('gesturestart', e => e.preventDefault());
  requestAnimationFrame(loop);
}
