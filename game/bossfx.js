// ===== Boss animation, voices and battle music =====
'use strict';

// [motion style, voice]
// motion: stomp (heavy walker), skitter (crawler), float (hover), jelly (blob), slither (wavy), hop (bouncy)
const STYLE = {
  m27: ['stomp', 'beast'], m28: ['stomp', 'deep'], m29: ['jelly', 'machine'], m34: ['jelly', 'goo'], n22: ['stomp', 'beast'],
  n24: ['stomp', 'ghost'], n10: ['stomp', 'goo'], h6: ['stomp', 'human'], m30: ['stomp', 'deep'],
  m36: ['float', 'giggle'], m32: ['jelly', 'goo'], m33: ['float', 'ghost'], m38: ['stomp', 'deep'], n2: ['hop', 'squeak'],
  h2: ['hop', 'beast'], h12: ['float', 'giggle'], n6: ['skitter', 'squeak'], h9: ['float', 'deep'], m31: ['hop', 'giggle'],
  m37: ['stomp', 'deep'], m40: ['skitter', 'beast'], m42: ['skitter', 'squeak'], m41: ['skitter', 'hiss'], n7: ['skitter', 'squeak'],
  h8: ['stomp', 'beast'], n25: ['jelly', 'goo'],
  n1: ['stomp', 'beast'], h0: ['slither', 'hiss'], h4: ['float', 'squeak'], h7: ['skitter', 'hiss'], h14: ['float', 'ghost'],
  h10: ['slither', 'hiss'], n9: ['stomp', 'dragon'],
  n15: ['skitter', 'squeak'], n16: ['slither', 'goo'], n17: ['slither', 'ghost'], n18: ['float', 'ghost'], n20: ['slither', 'deep'],
  h11: ['slither', 'goo'], h13: ['slither', 'hiss'], n8: ['slither', 'giggle'],
  n3: ['stomp', 'ghost'], n5: ['float', 'giggle'], n11: ['skitter', 'deep'], n12: ['jelly', 'deep'], n13: ['jelly', 'squeak'],
  n14: ['hop', 'giggle'], n21: ['skitter', 'hiss'], n23: ['stomp', 'dragon'], h5: ['skitter', 'squeak'], n0: ['float', 'machine'],
  m39: ['float', 'witch'],
};
function hashStr(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

// ---------------- PREP ----------------
function prepBoss(b) {
  const st = STYLE[b.id] || ['stomp', 'beast'];
  b.anim = st[0]; b.voiceType = st[1];
  b.pitch = clamp(64 / b.r, 0.7, 1.35) * (0.9 + (hashStr(b.id) % 20) / 100);
  b.ax = b.x; b.ay = b.y; b.vel = 0; b.lean = 0; b.flipS = 1; b.flipT = 1; b.punch = 0; b.land = 0; b.hurtT = 0;
  b.windP = 0; b.strikeT = 0; b.strikeDur = 0.34; b.strikeKind = ''; b.strikeSide = 0; b.strikeAng = 0;
  b.moveKind = ''; b.swingSide = 0; b.swingIdx = 0; b.swingMax = 1; b.dashing = null; b.beaming = 0;
  b.prevWind = 0; b.prevAir = 0; b.at = Math.random() * 10; b.intro = 1.9;
  b.auraCol = '255,70,50';
  setupRig(b);
  const im = b.img;
  const make = () => { try { b.auraCol = avgColor(im); b.glowImg = silhouette(im, `rgb(${b.auraCol})`, 0.07); b.flashImg = silhouette(im, '#fff', 0); } catch (e) {} };
  if (im.complete && im.naturalWidth) make(); else im.addEventListener('load', make, { once: true });
}
function silhouette(im, col, blur) {
  const s = im.naturalWidth, pad = Math.round(s * (blur ? 0.12 : 0)), c = document.createElement('canvas');
  c.width = c.height = s + pad * 2; const g = c.getContext('2d');
  if (blur) { g.filter = `blur(${Math.round(s * blur)}px)`; }
  g.drawImage(im, pad, pad);
  g.filter = 'none'; g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  if (blur) { // fallback "blur" for browsers without canvas filter: stack offsets
    const c2 = document.createElement('canvas'); c2.width = c2.height = c.width; const g2 = c2.getContext('2d');
    const off = s * blur * 0.7; g2.globalAlpha = 0.25;
    for (let a = 0; a < TAU; a += TAU / 8) g2.drawImage(c, Math.cos(a) * off, Math.sin(a) * off);
    g2.globalAlpha = 0.6; g2.drawImage(c, 0, 0); c2.pad = pad / s; return c2;
  }
  c.pad = 0; return c;
}
function avgColor(im) {
  const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d');
  g.drawImage(im, 0, 0, 24, 24); const d = g.getImageData(0, 0, 24, 24).data;
  let r = 0, gg = 0, bb = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 160) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
  if (!n) return '255,70,50';
  r /= n; gg /= n; bb /= n;
  // boost saturation & brightness
  const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb), mid = (mx + mn) / 2;
  const boost = v => clamp(Math.round(mid + (v - mid) * 2.2 + (255 - mx) * 0.5), 30, 255);
  return `${boost(r)},${boost(gg)},${boost(bb)}`;
}

// ---------------- ANIMATION STATE ----------------
function updateBossAnim(b, dt) {
  const dx = b.x - b.ax, dy = b.y - b.ay; b.ax = b.x; b.ay = b.y;
  const sp = Math.hypot(dx, dy) / Math.max(dt, 1e-3);
  b.vel += (Math.min(sp, 1200) - b.vel) * Math.min(1, dt * 10);
  const c = Math.cos(b.face); if (c < -0.2) b.flipT = -1; else if (c > 0.2) b.flipT = 1;
  b.flipS += (b.flipT - b.flipS) * Math.min(1, dt * 9);
  if (b.wind <= 0) b.windP = 0;
  let lt = clamp((dx / Math.max(dt, 1e-3)) / 700, -0.45, 0.45) * b.flipT;
  if (b.wind > 0) lt = -0.18 - 0.34 * (b.windP || 0);
  if (b.dashing) lt = 0.58;
  if (b.strikeT > 0) {
    const su = 1 - b.strikeT / Math.max(b.strikeDur || 0.34, 0.01);
    lt = Math.sin(su * Math.PI) * 0.72;
  } else if (b.punch > 0) lt = 0.55;
  if (b.hurtT > 0) lt = -0.35;
  if (b.stagger > 0) lt = Math.sin(F.time * 4) * 0.25;
  b.lean += (lt - b.lean) * Math.min(1, dt * 15);
  if (b.prevWind > 0 && b.wind <= 0 && !b.dead) b.punch = Math.max(b.punch || 0, 0.28);
  if (b.prevAir > 30 && b.air <= 0) b.land = 0.32;
  b.prevWind = b.wind; b.prevAir = b.air;
  b.voiceT = Math.max(0, (b.voiceT || 0) - dt);
  b.punch = Math.max(0, b.punch - dt); b. strikeT = Math.max(0, (b.strikeT || 0) - dt);
  b.land = Math.max(0, b.land - dt); b.hurtT = Math.max(0, b.hurtT - dt);
  if (b.intro > 0) {
    b.intro -= dt;
    if (Math.random() < 0.7) F.fx.push({ x: b.x + rand(-b.r, b.r), y: b.y + b.r * 0.5 + rand(-8, 8), vx: rand(-30, 30), vy: rand(-140, -40), life: 0.7, t: 0, col: Math.random() < 0.5 ? '#1a0a10' : '#5a1020', size: rand(4, 9) });
  }
  b.at += dt * (b.p2 ? 1.35 : 1) * (b.slowT > 0 ? 0.5 : 1);
  if (b.p2 && !b.dead && Math.random() < 0.3) F.fx.push({ x: b.x + rand(-b.r * 0.6, b.r * 0.6), y: b.y - rand(0, b.r * 1.8) - b.air, vx: rand(-15, 15), vy: rand(-110, -50), life: 0.9, t: 0, col: Math.random() < 0.5 ? '#ff4a2a' : '#ffb04a', size: 3 });
  if (b.dead && Math.random() < 0.8) F.fx.push({ x: b.x + rand(-b.r, b.r), y: b.y + rand(-b.r * 1.5, b.r * 0.4), vx: rand(-40, 40), vy: rand(20, 120), life: 1.0, t: 0, col: Math.random() < 0.6 ? '#120608' : `rgb(${b.auraCol})`, size: rand(3, 8) });
}

// Draw an image as horizontal strips so it can bend, breathe and wave.
function drawStrips(g, im, S, t, o) {
  if (!im || !(im.width || im.naturalWidth)) return;
  const N = 14, iw = im.width || im.naturalWidth, ih = im.height || im.naturalHeight;
  const pad = im.pad || 0, SS = S * (1 + 2 * pad);
  const top = -0.85 * S - pad * S, sh = SS / N;
  const start = Math.floor(N * (1 - (o.reveal == null ? 1 : o.reveal)));
  for (let i = start; i < N; i++) {
    const k = 1 - (i + 0.5) / N;                // 1 at top, 0 at feet
    let off = Math.sin(t * 1.7 + k * 1.5) * o.sway * S * 0.014 * k + Math.sin(t * 5 - k * 7) * o.wave * S * 0.02 * (0.3 + k);
    const w = SS * (1 + Math.sin(t * 2.3) * 0.035 * o.breathe * Math.sin(k * Math.PI));
    let yo = 0;
    if (o.melt) { const d = Math.max(0, o.melt * 1.5 - (1 - k) * 0.8); yo = d * d * S * 0.35; off += Math.sin(i * 2.1) * d * 26; }
    g.drawImage(im, 0, i * ih / N, iw, ih / N + 1, -w / 2 + off, top + i * sh + yo, w, sh + 1.5);
  }
}

function drawBossFancy(b) {
  const g = ctx, S = b.r * 3.5, A = b.anim, t = b.at;
  if (b.alpha <= 0.01 && !b.dead && b.intro <= 0) return;
  const moving = Math.min(1, b.vel / 160);
  let sx = 1, sy = 1, bob = 0, rot = 0, sway = 0.5, wave = 0, breathe = 1;
  switch (A) {
    case 'stomp': bob = -Math.abs(Math.sin(t * 7)) * 8 * moving; sy *= 1 - Math.abs(Math.cos(t * 7)) * 0.045 * moving; sway = 0.7; break;
    case 'skitter': bob = Math.sin(t * 30) * 3 * moving; rot = Math.sin(t * 22) * 0.035 * moving; sx *= 1 + Math.sin(t * 15) * 0.025; sway = 0.3; break;
    case 'float': bob = Math.sin(t * 2.2) * 12 - 20; rot = Math.sin(t * 1.3) * 0.06; sway = 1.4; break;
    case 'jelly': { const q = Math.sin(t * 4.2); sx *= 1 + q * 0.07; sy *= 1 - q * 0.07; wave = 0.5; breathe = 1.6; } break;
    case 'slither': wave = 1.6; sway = 0.9; bob = Math.sin(t * 3) * 4; break;
    case 'hop': { const fast = moving > 0.25, h = Math.abs(Math.sin(t * (fast ? 9 : 3))); bob = -h * (fast ? 28 : 7); sy *= 1 + (h - 0.5) * 0.1; sx *= 1 - (h - 0.5) * 0.06; } break;
  }
  if (b.wind > 0) {
    const wp = b.windP || 0;
    sy *= 1 + 0.11 * wp; sx *= 1 - 0.06 * wp;
  }
  if (b.strikeT > 0) {
    const su = 1 - b.strikeT / Math.max(b.strikeDur || 0.34, 0.01), sw = Math.sin(su * Math.PI);
    sx *= 1 + 0.16 * sw; sy *= 1 - 0.1 * sw;
  } else if (b.punch > 0) {
    const k = b.punch / 0.28; sx *= 1 + 0.15 * k; sy *= 1 - 0.1 * k;
  }
  if (b.spin > 0) {
    rot += Math.sin(F.time * 28) * 0.14; sx *= 1.08 + Math.cos(F.time * 36) * 0.06;
  }
  if (b.land > 0) { const k = b.land / 0.32; sx *= 1 + 0.25 * k; sy *= 1 - 0.22 * k; }
  if (b.air > 0) { sy *= 1.1; sx *= 0.93; }
  if (b.stagger > 0) { rot += Math.sin(F.time * 5) * 0.12; sy *= 0.92; sway = 2.5; }
  if (b.roar) { const s = 1 + Math.sin(b.roar * 30) * 0.05; sx *= s; sy *= s; }
  if (b.inhale) sx *= 1.1 + Math.sin(F.time * 30) * 0.02;
  if (b.hurtT > 0) { const k = b.hurtT / 0.18; sx *= 1 - 0.06 * k; sy *= 1 + 0.05 * k; }
  const strikeLunge = b.strikeT > 0 ? Math.sin((1 - b.strikeT / Math.max(b.strikeDur || 0.34, 0.01)) * Math.PI) * b.r * 0.28 : 0;
  const jx = (b.wind > 0 ? Math.sin(F.time * 45) * 3 * (0.4 + 0.6 * (b.windP || 0)) : 0) + Math.cos(b.face) * strikeLunge;
  const jy = Math.sin(b.face) * strikeLunge * 0.65;
  const reveal = b.intro > 0 ? clamp(1 - (b.intro - 0.25) / 1.4, 0, 1) : 1;
  const feetY = b.y + S * 0.25 + jy;
  // shadow & intro ink puddle
  const shR = b.r * (A === 'float' ? 0.7 : 1) * (1 - Math.min(0.5, b.air / 400));
  if (b.intro > 0 || b.dead) {
    const k = b.dead ? Math.min(1, b.deadT / 1.2) : Math.min(1, b.intro / 0.4);
    g.save(); g.globalAlpha = 0.85 * k; g.fillStyle = '#12060a'; g.beginPath(); g.ellipse(b.x, b.y + b.r * 0.6, b.r * 1.5, b.r * 0.55, 0, 0, TAU); g.fill();
    g.globalAlpha = 0.5 * k; g.strokeStyle = `rgb(${b.auraCol})`; g.lineWidth = 3; g.stroke(); g.restore();
  }
  drawShadow(b.x + jx * 0.5, b.y + jy * 0.5, shR, 0.5 * (b.dead ? Math.max(0, 1 - b.deadT) : b.alpha));
  g.save();
  g.globalAlpha = b.dead ? Math.max(0, 1 - b.deadT / 2.6) : Math.max(b.alpha, b.intro > 0 ? 1 : 0);
  g.translate(b.x + jx, feetY - b.air + bob + (1 - reveal) * S * 0.35);
  g.rotate(rot);
  g.transform(1, 0, -b.lean * 0.28, 1, 0, 0);    // lean: top shifts forward
  const spinFlip = b.spin > 0 ? Math.sign(Math.cos(F.time * 18) || 1) : 1;
  g.scale(b.flipS * spinFlip * sx, sy);
  if (b.rig) { wave *= 0.4; sway *= 0.6; }
  const o = { sway, wave, breathe, reveal, melt: b.dead ? b.deadT : 0 };
  // aura glow
  if (b.glowImg) {
    const base = g.globalAlpha;
    const k = b.p2 ? 0.65 + 0.3 * Math.sin(F.time * 6) : b.wind > 0 ? 0.75 : b.strikeT > 0 ? 0.85 : b.stagger > 0 ? 0.9 : 0.35;
    g.globalAlpha = base * k; drawStrips(g, b.glowImg, S, t, o);
    if (b.p2) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = base * 0.25 * (0.6 + 0.4 * Math.sin(F.time * 9)); drawStrips(g, b.glowImg, S, t, o); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = base;
  }
  const rc = b.rig ? renderRig(b) : null;
  drawStrips(g, rc || b.img, S, t, o);
  if (!rc && b.flashImg && (b.flash > 0 || b.slowT > 0 || b.burnT > 0)) {
    const base = g.globalAlpha;
    if (b.flash > 0) { g.globalAlpha = base * Math.min(0.85, b.flash * 8); drawStrips(g, b.flashImg, S, t, o); }
    if (b.slowT > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = base * 0.18; drawStrips(g, b.flashImg, S, t, o); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = base;
  }
  g.restore();
  // Weapon / claw slash arc VFX on active strikes & whirlwind spins
  if (!b.dead && (b.strikeT > 0 || b.spin > 0)) {
    drawBossStrikeArc(g, b);
  }
  if (b.slowT > 0) { g.save(); g.globalAlpha = 0.25; g.fillStyle = '#9fe3ff'; g.beginPath(); g.arc(b.x, b.y - b.r * 0.5 - b.air, b.r * 1.1, 0, TAU); g.fill(); g.restore(); }
  // sparkle cue ✦
  if (b.sparkT > 0) {
    const k = b.sparkT / 0.32, x = b.x + Math.cos(b.face) * b.r * 0.4, y = b.y - b.air - b.r * 1.0;
    g.save(); g.translate(x, y); g.rotate(k * 2); const s = 32 + (1 - k) * 28; g.globalAlpha = k;
    g.fillStyle = '#fff'; g.shadowColor = '#ffe680'; g.shadowBlur = 30;
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.18 : s; const a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    g.restore();
  }
  if (b.stagger > 0) {
    g.save(); g.fillStyle = '#ffd84a'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = F.time * 4 + i * TAU / 3; g.fillText('★', b.x + Math.cos(a) * b.r * 0.8, b.y - b.r * 1.9 + Math.sin(a) * 12); }
    g.restore();
  }
}

function drawBossStrikeArc(g, b) {
  if (b.spin > 0) {
    const a0 = F.time * 16, r = b.r * 1.55, cy = b.y - b.r * 0.45 - b.air;
    g.save();
    for (let i = 0; i < 2; i++) {
      const ang = a0 + i * Math.PI;
      g.beginPath();
      g.arc(b.x, cy, r, ang - 0.9, ang + 0.9);
      g.arc(b.x, cy, r * 0.72, ang + 0.9, ang - 0.9, true);
      g.closePath();
      g.fillStyle = `rgba(${b.auraCol},0.55)`; g.fill();
      g.beginPath();
      g.arc(b.x, cy, r * 0.92, ang - 0.65, ang + 0.65);
      g.strokeStyle = 'rgba(255,255,240,0.85)'; g.lineWidth = 6; g.lineCap = 'round'; g.stroke();
    }
    g.restore();
    return;
  }
  const kind = b.strikeKind;
  if (kind !== 'swipe' && kind !== 'grab' && kind !== 'chomp' && kind !== 'slam' && kind !== 'ring') return;
  const dur = Math.max(b.strikeDur || 0.34, 0.01);
  const u = clamp(1 - b.strikeT / dur, 0, 1);
  const fade = Math.sin(u * Math.PI);
  if (fade <= 0.02) return;
  const ang = b.strikeAng != null ? b.strikeAng : b.face;
  const dir = (b.strikeSide || 1) >= 0 ? 1 : -1;
  const span = kind === 'slam' || kind === 'ring' ? 1.15 : 1.55;
  const sweepCenter = ang + dir * (u - 0.45) * span * 0.85;
  const a1 = sweepCenter - span * 0.52, a2 = sweepCenter + span * 0.52;
  const reach = b.r * (kind === 'grab' ? 2.05 : kind === 'swipe' ? 1.85 : 1.55);
  const cx = b.x + Math.cos(ang) * b.r * 0.25, cy = b.y - b.r * 0.48 - b.air + Math.sin(ang) * b.r * 0.18;
  g.save();
  g.globalAlpha = fade * 0.85;
  g.beginPath();
  g.arc(cx, cy, reach, a1, a2);
  g.arc(cx, cy, reach * 0.66, a2, a1, true);
  g.closePath();
  g.fillStyle = `rgba(${b.auraCol},0.65)`;
  g.fill();
  g.beginPath();
  g.arc(cx, cy, reach * 0.9, a1 + span * 0.12, a2 - span * 0.12);
  g.strokeStyle = '#fff9e6';
  g.lineWidth = Math.max(5, b.r * 0.11) * fade;
  g.lineCap = 'round';
  g.stroke();
  g.restore();
}

// Voices, introSting, and adaptive music live in audio.js

// ---------------- PUPPET RIGS ----------------
// Built offline by rig/build.py: each monster's picture is cut into parts (head, jaw, arms, legs,
// tentacles…) with the body filled in behind them. Here we pose the parts every frame.
function setupRig(b) {
  const R = (typeof RIGS !== 'undefined') && RIGS[b.id];
  if (!R) return;
  b.rig = R; b.rigImg = img('a/rig_' + b.id + '.webp');
  const pad = Math.round(R.s * 0.38), c = document.createElement('canvas');
  c.width = c.height = R.s + pad * 2; c.pad = pad / R.s; b.rigC = c; b.rigPad = pad; b.jawOpen = 0; b.voiceT = 0;
  b.partPose = R.parts.map(() => ({ a: 0, dx: 0, dy: 0, s: 1 }));
}
function rigPose(b, p, t) {
  const out = p.side === 'L' ? 1 : -1;          // + = swing away from the body
  const cy = p.oy + p.h * 0.5;
  // In the flipped rig space (+x is always forward toward the player):
  // - If a limb/weapon's center is above its pivot (cy < p.py - 10, e.g. raised cleavers/hooks/horns/tentacles/wings), +a rotates it forward & down (+x, +y).
  // - If a limb hangs below its pivot (cy >= p.py - 10, e.g. arms/legs), -a rotates it forward (+x) and +a coils it backward (-x).
  const dirFwd = cy < p.py - 10 ? 1 : -1;
  const mv = Math.min(1, b.vel / 160), ph = p.ph || 0;
  const wind = b.wind > 0, wp = wind ? clamp(b.windP || 0.5, 0, 1) : 0;
  const wEase = wp * wp * (3 - 2 * wp);
  const stDur = Math.max(b.strikeDur || 0.34, 0.01);
  const stU = b.strikeT > 0 ? clamp(1 - b.strikeT / stDur, 0, 1) : 0;
  const swing = b.strikeT > 0 ? Math.sin(stU * Math.PI) : (b.punch > 0 ? Math.sin((1 - b.punch / 0.28) * Math.PI) : 0);
  const mKind = b.wind > 0 ? (b.moveKind || 'swipe') : (b.strikeT > 0 ? (b.strikeKind || 'swipe') : '');
  const wSide = b.swingSide || 0, sSide = b.strikeSide || 0;
  const isLeadWind = wSide === 0 || (wSide > 0 ? p.side === 'R' : p.side === 'L');
  const isLeadStrike = sSide === 0 || (sSide > 0 ? p.side === 'R' : p.side === 'L');
  const roar = !!b.roar, stag = b.stagger > 0;
  const tremor = wind ? Math.sin(F.time * 42 + ph) * 0.06 * wp : 0;
  let a = 0, dx = 0, dy = 0, s = 1;
  switch (p.t) {
    case 'leg': {
      const freq = b.dashing ? 22 : 9 * (b.p2 ? 1.2 : 1);
      const amp = b.dashing ? 1 : mv;
      const sw = Math.sin(t * freq + (p.side === 'L' ? 0 : Math.PI));
      a = sw * (b.dashing ? 0.55 : 0.34) * amp;
      dx = -sw * (b.dashing ? 14 : 6) * amp;
      dy = -Math.max(0, sw) * (b.dashing ? 14 : 8) * amp;
      if (wind) {
        if (mKind === 'charge') {
          const paw = Math.sin(F.time * 28 + (p.side === 'L' ? 0 : Math.PI));
          a = paw * 0.42 * wEase; dy = -Math.max(0, paw) * 10 * wEase;
        } else {
          a = (p.side === 'R' ? 0.32 : -0.22) * wEase;
          dx = (p.side === 'R' ? -14 : 8) * wEase;
          dy = -6 * wEase;
        }
      }
      if (swing > 0) {
        a = (p.side === 'R' ? -0.45 : 0.35) * swing;
        dx = (p.side === 'R' ? 22 : -12) * swing;
        dy = 4 * swing;
      }
      if (b.air > 0) { a = out * 0.45; dy = -10; }
      if (b.land > 0) { a = out * 0.25; dy = 7; }
      if (stag) a = Math.sin(F.time * 5 + ph) * 0.14;
      break;
    }
    case 'arm':
    case 'tent':
    case 'tail': {
      const isTent = p.t !== 'arm';
      const baseWave = isTent
        ? Math.sin(t * 3 + ph) * 0.26
        : Math.sin(t * 2 + ph) * 0.09 + Math.sin(t * 9 + (p.side === 'L' ? Math.PI : 0)) * 0.22 * mv;
      a = baseWave;
      if (wind) {
        if (mKind === 'slam') {
          // Both arms & weapon tentacles raise high overhead
          a = -dirFwd * (1.35 * wEase) + tremor;
          dx = -18 * wEase;
          dy = -42 * wEase;
          s = 1 + 0.15 * wEase;
        } else if (mKind === 'charge') {
          // Sweep arms/weapons back as the monster lowers its head to charge
          a = -dirFwd * (0.95 * wEase) + tremor;
          dx = -26 * wEase;
          dy = 10 * wEase;
        } else if (mKind === 'spray' || mKind === 'pool' || mKind === 'ring' || mKind === 'rain' || mKind === 'beam' || mKind === 'minions') {
          // Raise wide to cast/channel
          a = -dirFwd * (1.05 * wEase) + out * 0.35 * wEase + tremor;
          dx = -20 * wEase;
          dy = -28 * wEase;
          s = 1 + 0.12 * wEase;
        } else {
          // swipe / grab: lead arm/weapon coils way back & overhead, off-hand braces
          if (isLeadWind) {
            a = -dirFwd * (1.32 * wEase) + tremor;
            dx = -32 * wEase;
            dy = -34 * wEase;
            s = 1 + 0.16 * wEase;
          } else {
            a = -dirFwd * (0.55 * wEase) + out * 0.25 * wEase;
            dx = -12 * wEase;
            dy = -10 * wEase;
          }
        }
      }
      if (swing > 0) {
        if (mKind === 'slam' || mKind === 'ring') {
          // Overhead smash down into the ground
          const arc = -0.3 * (1 - stU) + 1.38 * swing;
          a = dirFwd * arc;
          dx = 40 * swing;
          dy = 48 * swing;
          s = 1 + 0.2 * swing;
        } else if (mKind === 'spray' || mKind === 'pool' || mKind === 'rain' || mKind === 'beam' || mKind === 'minions' || mKind === 'roar') {
          a = dirFwd * (0.95 * swing) + out * 0.35 * swing;
          dx = 34 * swing;
          dy = 14 * swing;
          s = 1 + 0.14 * swing;
        } else {
          // swipe / grab / chomp: whip the weapon/limb violently across the body toward the player!
          if (isLeadStrike) {
            const arc = -0.35 * (1 - stU) + 1.52 * swing;
            a = dirFwd * arc;
            dx = 64 * swing;
            dy = (-14 * (1 - stU) + 34 * stU) * swing;
            s = 1 + 0.22 * swing;
          } else {
            a = -dirFwd * (0.48 * swing);
            dx = -16 * swing;
            dy = 8 * swing;
          }
        }
      }
      if (b.dashing === 'grab') {
        a = dirFwd * 1.22 + Math.sin(F.time * 28 + ph) * 0.14;
        dx = 58;
        dy = 12;
        s = 1.16;
      } else if (b.dashing === 'charge') {
        a = -dirFwd * 0.85 + Math.sin(F.time * 24 + ph) * 0.1;
        dx = -22;
        dy = 10;
      }
      if (b.spin > 0) {
        const spA = F.time * 28 + ph;
        a = dirFwd * (0.95 + Math.sin(spA) * 0.75);
        dx = 44 * Math.cos(spA);
        dy = 20 * Math.sin(spA);
        s = 1.18;
      }
      if (b.beaming > 0) {
        a = dirFwd * 0.85 + Math.sin(F.time * 35 + ph) * 0.12;
        dx = 28;
        dy = -14;
        s = 1.1;
      }
      if (roar || b.inhale) {
        a = -dirFwd * 0.85 + out * 0.35 + Math.sin(F.time * 25 + ph) * 0.1;
        dx = -16;
        dy = -18;
        s = 1.08;
      }
      if (stag) { a = out * 0.35 + Math.sin(F.time * 5 + ph) * 0.32; dy = 10; }
      if (b.dead) { a = out * Math.min(1.2, 0.4 + b.deadT * 0.4); dy = 14; }
      break;
    }
    case 'head': {
      a = Math.sin(t * 1.7 + ph) * 0.06; dy = Math.sin(t * 2.3 + ph) * 2;
      if (wind) {
        if (mKind === 'charge') {
          a = 0.28 * wEase; dx = 16 * wEase; dy = 14 * wEase;
        } else if (mKind === 'slam') {
          a = -0.22 * wEase; dx = -10 * wEase; dy = -16 * wEase;
        } else {
          a = -0.16 * wEase; dx = -14 * wEase; dy = -8 * wEase;
        }
      }
      if (swing > 0) {
        a = (mKind === 'slam' ? 0.34 : 0.24) * swing;
        dx = 28 * swing;
        dy = (mKind === 'slam' ? 26 : 12) * swing;
        s = 1 + 0.08 * swing;
      }
      if (b.dashing === 'charge') { a = 0.35; dx = 32; dy = 18; s = 1.08; }
      else if (b.dashing === 'grab') { a = 0.18; dx = 24; dy = 8; }
      if (b.beaming > 0) { a = 0.14 + Math.sin(F.time * 30) * 0.04; dx = 22; dy = 4; s = 1.07; }
      if (roar) { a = Math.sin(F.time * 30) * 0.08; dx = 8; dy = -12; s = 1.08; }
      if (b.inhale) { a = -0.12 + Math.sin(F.time * 26) * 0.05; dx = -10; dy = -6; s = 1.08; }
      if (b.hurtT > 0) { a -= 0.24 * (b.hurtT / 0.18); dx -= 12 * (b.hurtT / 0.18); }
      if (stag) a = Math.sin(F.time * 4) * 0.22;
      if (b.dead) a = 0.3;
      break;
    }
    case 'wing': {
      a = out * Math.sin(t * (b.anim === 'float' ? 11 : 5) + ph) * 0.5 - out * 0.1;
      if (wind) { a = -out * (0.85 * wEase) + tremor; dy = -22 * wEase; s = 1 + 0.1 * wEase; }
      if (swing > 0) { a = out * (1.15 * swing); dx = 20 * swing; dy = 18 * swing; s = 1 + 0.14 * swing; }
      if (b.air > 0) { a = out * Math.sin(F.time * 24 + ph) * 0.75; dy = -14; }
      if (b.spin > 0) { a = out * (0.9 + Math.sin(F.time * 30 + ph) * 0.5); s = 1.12; }
      break;
    }
  }
  return { a, dx, dy, s };
}
function renderRig(b) {
  const R = b.rig, im = b.rigImg;
  if (!im.complete || !im.naturalWidth) return null;
  const c = b.rigC, g = c.getContext('2d'), pad = b.rigPad, t = b.at;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.translate(pad, pad);
  let jo = 0.06 + 0.05 * Math.sin(t * 3);
  if (b.wind > 0) jo = 0.35 + 0.55 * (b.windP || 0.5);
  if (b.roar || b.inhale || b.intro > 0 || b.beaming > 0) jo = 1.15;
  if (b.dashing) jo = 0.95;
  if (b.strikeT > 0) {
    const su = 1 - b.strikeT / Math.max(b.strikeDur || 0.34, 0.01);
    jo = b.strikeKind === 'chomp' ? (su < 0.35 ? 1.2 : 0.02) : Math.max(jo, 0.95 * Math.sin(su * Math.PI));
  } else if (b.punch > 0) jo = Math.max(jo, 0.85 * b.punch / 0.28);
  if (b.hurtT > 0) jo = Math.max(jo, 0.6);
  if (b.stagger > 0) jo = 0.35 + 0.2 * Math.sin(F.time * 6);
  if (b.voiceT > 0) jo = Math.max(jo, 0.45 + 0.45 * Math.abs(Math.sin(F.time * 22)));
  if (b.dead) jo = 0.9;
  b.jawOpen += (jo - b.jawOpen) * 0.35;
  if (!b.partPose || b.partPose.length !== R.parts.length) {
    b.partPose = R.parts.map(() => ({ a: 0, dx: 0, dy: 0, s: 1 }));
  }
  const rate = (b.strikeT > 0 || b.dashing || b.spin > 0) ? 0.52 : 0.34;
  const poses = R.parts.map((p, idx) => {
    if (p.t === 'jaw' || p.t === 'maw') return null;
    const tgt = rigPose(b, p, t);
    const cur = b.partPose[idx];
    cur.a += (tgt.a - cur.a) * rate;
    cur.dx += (tgt.dx - cur.dx) * rate;
    cur.dy += (tgt.dy - cur.dy) * rate;
    cur.s += (tgt.s - cur.s) * rate;
    return cur;
  });
  const drawPart = (p, q) => { g.save(); g.translate(p.px + q.dx, p.py + q.dy); g.rotate(q.a); g.scale(q.s, q.s); g.drawImage(im, p.sx, p.sy, p.w, p.h, p.ox - p.px, p.oy - p.py, p.w, p.h); g.restore(); };
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
      const q = { a: 0, dx: 0, dy: b.jawOpen * p.h * 0.4, s: 1 };
      if (headP) { g.save(); g.translate(headP.px + headQ.dx, headP.py + headQ.dy); g.rotate(headQ.a); g.scale(headQ.s, headQ.s); g.translate(-headP.px, -headP.py); drawPart(p, q); g.restore(); }
      else drawPart(p, q);
      continue;
    }
    if (p.t === 'maw') { const o = b.jawOpen; drawPart(p, { a: Math.sin(F.time * 3) * 0.08 * o, dx: 0, dy: 0, s: 1 + o * 0.15 }); continue; }
    const q = poses[i];
    if (p.t === 'head') { headP = p; headQ = q; }
    drawPart(p, q);
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  if (b.flash > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(0.85, b.flash * 8)})`; g.fillRect(0, 0, c.width, c.height); }
  if (b.slowT > 0) { g.fillStyle = 'rgba(150,220,255,0.28)'; g.fillRect(0, 0, c.width, c.height); }
  if (b.burnT > 0) { g.fillStyle = `rgba(255,110,30,${0.12 + 0.08 * Math.sin(F.time * 20)})`; g.fillRect(0, 0, c.width, c.height); }
  g.globalCompositeOperation = 'source-over';
  return c;
}
