// ===== Hero knight + weapon art with upgrade tiers =====
'use strict';

// Every 3 upgrades the weapon is re-forged in a new material.
const WTIERS = [
  { name: 'Iron',      blade: ['#b4b9bf', '#62686f'], edge: '#d8dce0', metal: '#70757c', metal2: '#3e4247', grip: '#4a3424', gem: null,      glow: null,          trail: '255,255,255' },
  { name: 'Steel',     blade: ['#f4f8fc', '#8c99a8'], edge: '#ffffff', metal: '#c3ccd6', metal2: '#6c7886', grip: '#24365a', gem: '#4a8aff', glow: null,          trail: '200,225,255' },
  { name: 'Golden',    blade: ['#fffaf0', '#d8c690'], edge: '#ffe17a', metal: '#f0bc3a', metal2: '#a8761a', grip: '#6a1a1a', gem: '#ff3a3a', glow: '255,200,90',  trail: '255,215,110' },
  { name: 'Crystal',   blade: ['#ecfeff', '#4fc8ec'], edge: '#ffffff', metal: '#d8e6f2', metal2: '#7a90a8', grip: '#16345a', gem: '#9ff0ff', glow: '110,225,255', trail: '130,235,255' },
  { name: 'Infernal',  blade: ['#3e2628', '#120809'], edge: '#ff7a2a', metal: '#3a3032', metal2: '#140c0d', grip: '#3a0808', gem: '#ff4a1a', glow: '255,100,25',  trail: '255,110,35' },
  { name: 'Legendary', blade: ['#ffffff', '#ffe6a0'], edge: '#ffffff', metal: '#ffd96a', metal2: '#c08a20', grip: '#4a2a8a', gem: '#ff6af0', glow: '255,235,190', trail: 'rainbow' },
];
const WTIER_AT = [0, 3, 6, 9, 12, 15];
function weaponTier(lvl) { let t = 0; for (let i = 0; i < WTIER_AT.length; i++) if (lvl >= WTIER_AT[i]) t = i; return t; }
function weaponTitle(key, lvl) { return `${WTIERS[weaponTier(lvl)].name} ${WEAPONS[key].name.replace(/^(Twig |Cleaver |Tooth |Jester |Dragon |Ink )/, m => m)}`; }
function trailRGB(T, k) { if (T.trail !== 'rainbow') return T.trail; const h = ((F ? F.time : performance.now() / 1000) * 240 + k * 300) % 360; return hslToRgb(h, 90, 70); }
function hslToRgb(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return `${Math.round(255 * f(0))},${Math.round(255 * f(8))},${Math.round(255 * f(4))}`; }

// Draws a weapon pointing along +x with the hand at the origin. L = reach in world units.
function drawWeaponArt(g, key, lvl, L, time, extend = 0) {
  const ti = weaponTier(lvl), T = WTIERS[ti];
  g.save();
  if (T.glow) { g.shadowColor = `rgba(${T.glow},0.9)`; g.shadowBlur = 6 + ti * 3 + Math.sin(time * 4) * 2; }
  const bladeGrad = (x0, x1, w) => {
    const gr = g.createLinearGradient(0, -w, 0, w);
    if (ti === 5) { const h = (time * 80) % 360; gr.addColorStop(0, '#fff'); gr.addColorStop(0.45, `hsl(${h},90%,85%)`); gr.addColorStop(0.55, `hsl(${(h + 60) % 360},90%,78%)`); gr.addColorStop(1, '#fff'); }
    else { gr.addColorStop(0, T.blade[0]); gr.addColorStop(0.5, T.blade[1]); gr.addColorStop(1, T.blade[0]); }
    return gr;
  };
  const metalGrad = (y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, T.metal); gr.addColorStop(1, T.metal2); return gr; };
  const gem = (x, y, r) => { if (!T.gem) return; g.fillStyle = T.gem; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU); g.fill(); };
  const grip = (x0, x1, h) => { g.fillStyle = T.grip; g.fillRect(x0, -h, x1 - x0, h * 2); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let x = x0 + 3; x < x1; x += 4) { g.beginPath(); g.moveTo(x, -h); g.lineTo(x - 2, h); g.stroke(); } };
  const runes = (x0, x1) => { if (ti < 3) return; g.save(); g.shadowBlur = 8; g.shadowColor = `rgba(${T.glow},1)`; g.fillStyle = ti === 4 ? '#ffb060' : '#ffffff'; g.font = 'bold 7px serif'; const s = 'ᚠᚱᛗᛁᚲᛖᛚ'; for (let i = 0, x = x0; x < x1; x += 9, i++) g.fillText(s[i % s.length], x, 2.5); g.restore(); };
  const cracks = (x0, x1, w) => { if (ti !== 4) return; g.strokeStyle = `rgba(255,${120 + 60 * Math.sin(time * 6)},40,0.95)`; g.lineWidth = 1.4; g.beginPath(); let y = 0; g.moveTo(x0, 0); for (let x = x0; x < x1; x += 6) { y = Math.sin(x * 0.7) * w * 0.5; g.lineTo(x, y); } g.stroke(); };
  const wings = (x, s) => { if (ti < 5) return; g.fillStyle = '#fffbe8'; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x, d * 6); g.quadraticCurveTo(x - 10 * s, d * 26 * s, x - 22 * s, d * 20 * s); g.quadraticCurveTo(x - 10 * s, d * 14 * s, x - 6, d * 6); g.fill(); } };
  switch (key) {
    case 'twig': case 'dragon': {
      const big = key === 'dragon', w = (big ? 8.5 : 4.5) + ti * 0.5, gl = big ? 16 : 12, bl = L;
      grip(-gl * 0.2, gl, 2.6);
      g.fillStyle = metalGrad(-5, 5); g.beginPath(); g.arc(-gl * 0.25, 0, big ? 5.5 : 4.2, 0, TAU); g.fill(); gem(-gl * 0.25, 0, 2);
      // crossguard
      const gh = (big ? 20 : 13) + ti * 2;
      g.fillStyle = metalGrad(-gh, gh);
      if (big) { g.beginPath(); g.moveTo(gl, -4); g.quadraticCurveTo(gl - 6, -gh, gl - 12, -gh - 4); g.lineTo(gl + 6, -6); g.lineTo(gl + 6, 6); g.lineTo(gl - 12, gh + 4); g.quadraticCurveTo(gl - 6, gh, gl, 4); g.fill(); }
      else { g.fillRect(gl - 1, -gh, 5, gh * 2); if (ti >= 2) { g.beginPath(); g.arc(gl + 1.5, -gh, 4, 0, TAU); g.arc(gl + 1.5, gh, 4, 0, TAU); g.fill(); } }
      gem(gl + 1.5, 0, big ? 3.2 : 2.4);
      wings(gl, big ? 1.1 : 0.8);
      // blade
      const x0 = gl + 4, x1 = bl;
      g.fillStyle = bladeGrad(x0, x1, w);
      g.beginPath(); g.moveTo(x0, -w);
      if (big || ti >= 4) { for (let x = x0 + 8; x < x1 - w * 2; x += 9) { g.lineTo(x, -w); g.lineTo(x + 4, -w - 3.5); } }
      g.lineTo(x1 - w * 2.2, -w); g.lineTo(x1, 0); g.lineTo(x1 - w * 2.2, w); g.lineTo(x0, w); g.closePath(); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0 + 2, 0); g.lineTo(x1 - w * 2.6, 0); g.stroke();   // fuller
      g.strokeStyle = T.edge; g.globalAlpha = 0.9; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, -w + 0.6); g.lineTo(x1 - w * 2.2, -w + 0.6); g.lineTo(x1 - 1, 0); g.stroke(); g.globalAlpha = 1;
      cracks(x0 + 4, x1 - w * 2, w); runes(x0 + 4, x1 - w * 3);
      break;
    }
    case 'spear': {
      const sh = L - 30;
      const sg = g.createLinearGradient(0, -3, 0, 3); sg.addColorStop(0, ti >= 2 ? T.metal : '#8a6a44'); sg.addColorStop(1, ti >= 2 ? T.metal2 : '#4a341e');
      g.fillStyle = sg; g.fillRect(-26, -2.6, sh + 26, 5.2);
      if (ti >= 1) { g.fillStyle = metalGrad(-4, 4); for (const x of [-26, sh * 0.3, sh - 6]) g.fillRect(x, -3.6, 6, 7.2); }
      // ribbon
      const rc = ti >= 1 ? (T.gem || '#c03030') : '#a03030';
      g.strokeStyle = rc; g.lineWidth = 3; g.beginPath(); g.moveTo(sh - 4, 0); for (let i = 1; i <= 6; i++) g.lineTo(sh - 4 - i * 5, 6 + i * 2 + Math.sin(time * 9 + i) * 4); g.stroke();
      // head
      g.fillStyle = bladeGrad(sh, L, 8); const hw = 7 + ti * 0.8;
      g.beginPath(); g.moveTo(sh, -3); g.quadraticCurveTo(sh + 10, -hw * 1.4, L, 0); g.quadraticCurveTo(sh + 10, hw * 1.4, sh, 3); g.closePath(); g.fill();
      g.shadowBlur = 0; g.strokeStyle = T.edge; g.lineWidth = 1; g.beginPath(); g.moveTo(sh + 2, 0); g.lineTo(L - 3, 0); g.stroke();
      if (ti >= 2) { g.fillStyle = metalGrad(-6, 6); g.beginPath(); g.moveTo(sh, -7); g.lineTo(sh - 6, 0); g.lineTo(sh, 7); g.fill(); gem(sh - 2, 0, 2.2); }
      wings(sh, 0.7); cracks(sh + 4, L - 8, 4);
      break;
    }
    case 'hammer': {
      const sh = L - 10;
      const sg = g.createLinearGradient(0, -3, 0, 3); sg.addColorStop(0, ti >= 2 ? T.metal : '#7a5a34'); sg.addColorStop(1, ti >= 2 ? T.metal2 : '#3e2a14');
      g.fillStyle = sg; g.fillRect(-12, -3, sh + 12, 6); grip(-12, 6, 3.4);
      const hx = sh - 14, hw = 26 + ti * 2, hh = 22 + ti * 1.5;
      if (ti >= 4) { g.fillStyle = metalGrad(-hh, hh); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(hx + 4, d * hh); g.lineTo(hx + hw / 2, d * (hh + 12)); g.lineTo(hx + hw - 4, d * hh); g.fill(); } }
      const hg = g.createLinearGradient(hx, 0, hx + hw, 0); hg.addColorStop(0, T.metal2); hg.addColorStop(0.4, T.metal); hg.addColorStop(1, T.metal2);
      if (ti === 3) { hg.addColorStop(0.5, '#bff4ff'); }
      if (ti === 5) { const h = (time * 80) % 360; hg.addColorStop(0.5, `hsl(${h},90%,85%)`); }
      g.fillStyle = hg; roundRect(g, hx, -hh, hw, hh * 2, 4); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(hx, -hh * 0.55, hw, 3); g.fillRect(hx, hh * 0.45, hw, 3);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(hx + 2, -hh + 2, hw - 4, 3);
      if (ti === 4) { g.strokeStyle = `rgba(255,${120 + 60 * Math.sin(time * 6)},40,0.95)`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx + 4, -hh + 6); g.lineTo(hx + 12, -2); g.lineTo(hx + 8, 8); g.lineTo(hx + hw - 6, hh - 6); g.stroke(); }
      gem(hx + hw / 2, 0, 4); wings(hx, 1.1);
      if (ti >= 3) { g.save(); g.translate(hx + hw / 2, 0); g.rotate(Math.PI / 2); runes(-hh + 6, hh - 6); g.restore(); }
      break;
    }
    case 'hooks': {
      grip(-6, 10, 2.6);
      g.fillStyle = metalGrad(-6, 6); g.fillRect(9, -6, 4, 12); gem(11, 0, 2);
      g.fillStyle = bladeGrad(12, L, 6);
      g.beginPath(); g.moveTo(12, -3); g.quadraticCurveTo(L * 0.7, -10, L, -L * 0.25); g.quadraticCurveTo(L * 0.95, -L * 0.05, L * 0.8, 2); g.quadraticCurveTo(L * 0.6, -2, 12, 3); g.closePath(); g.fill();
      g.shadowBlur = 0; g.strokeStyle = T.edge; g.lineWidth = 1.2; g.beginPath(); g.moveTo(14, -3); g.quadraticCurveTo(L * 0.7, -10, L, -L * 0.25); g.stroke();
      if (ti >= 3) { g.fillStyle = `rgba(${T.glow},0.8)`; g.beginPath(); g.arc(L * 0.55, -5, 2, 0, TAU); g.fill(); }
      wings(12, 0.6);
      break;
    }
    case 'whip': {
      grip(-8, 12, 3);
      g.fillStyle = metalGrad(-5, 5); g.beginPath(); g.arc(-9, 0, 4, 0, TAU); g.fill(); gem(-9, 0, 2);
      const len = 30 + (L - 30) * extend, n = 14;
      g.lineCap = 'round';
      let px = 12, py = 0;
      for (let i = 1; i <= n; i++) {
        const k = i / n, x = 12 + len * k, y = Math.sin(time * (extend > 0.5 ? 20 : 4) - k * 6) * (extend > 0.5 ? 8 : 14) * k + (1 - extend) * k * k * 30;
        g.strokeStyle = ti === 5 ? `hsl(${(time * 120 + i * 25) % 360},85%,70%)` : i % 2 ? T.metal : (ti >= 3 ? T.blade[1] : '#3a3060');
        g.lineWidth = 5.5 - k * 3; g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); px = x; py = y;
      }
      g.shadowBlur = 0; g.fillStyle = T.edge; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 6, py - 4); g.lineTo(px + 6, py); g.lineTo(px - 6, py + 4); g.fill();
      break;
    }
  }
  g.restore();
}

// ---------------- HERO ----------------
const HERO_COL = { armor: '#c9d2de', armor2: '#6a7686', dark: '#2b3446', tabard: '#2a56c8', trim: '#ffd36a', cape: '#a01c2c', cape2: '#5a0c16', plume: '#e0303a', skin: '#e8b48a', eyes: '#7af0ff' };
function heroArmorLook() {
  const c = Object.assign({}, HERO_COL);
  if (SAVE.crafted.hide) { c.cape = '#2f5a2a'; c.cape2 = '#16301a'; }
  if (SAVE.crafted.shell) { c.armor = '#a9c48a'; c.armor2 = '#4a6a3a'; }
  return c;
}
function drawPlayer(P) {
  const g = ctx, C = heroArmorLook(), t = F.time, w = P.w, key = SAVE.equip.weapon, lvl = P.lvl, T = WTIERS[weaponTier(lvl)];
  const mag = Math.hypot(INPUT.mx, INPUT.my), moving = (P.state === 'free' || P.state === 'drink') && mag > 0.15;
  // facing with a little hysteresis
  const c = Math.cos(P.face); if (c < -0.25) P.flipT = -1; else if (c > 0.25) P.flipT = 1; else if (!P.flipT) P.flipT = 1;
  P.flipS = P.flipS == null ? P.flipT : P.flipS + (P.flipT - P.flipS) * 0.35;
  P.rp = (P.rp || 0) + (moving ? mag * 0.24 : 0);
  const aimTilt = clamp(Math.atan2(Math.sin(P.face), Math.abs(Math.cos(P.face))), -1.0, 1.0);
  drawShadow(P.x, P.y + 4, P.r * 0.9, 0.5);
  // slash trail (shows the hit area, in world space)
  if (P.state === 'attack') {
    const T1 = w.wind, T2 = w.wind + w.act, arc = w.arc * RAD;
    if (P.t >= T1 && P.t < T2 + 0.08) {
      const side = P.combo % 2 ? -1 : 1, k = clamp((P.t - T1) / w.act, 0, 1), fade = P.t > T2 ? 1 - (P.t - T2) / 0.08 : 1;
      g.save(); g.translate(P.x, P.y - 30); g.rotate(P.face);
      const a1 = -arc / 2 * side, a2 = (-arc / 2 + arc * k) * side, R0 = P.r + w.reach * 0.3, R1 = w.reach + P.r;
      for (let i = 0; i < 4; i++) {
        const f = i / 4, rr = R0 + (R1 - R0) * f;
        g.globalAlpha = (0.15 + 0.5 * (1 - f)) * fade;
        g.strokeStyle = `rgba(${trailRGB(T, f)},1)`; g.lineWidth = (R1 - R0) / 4 + 2;
        g.beginPath(); g.arc(0, 0, rr, Math.min(a1, a2), Math.max(a1, a2)); g.stroke();
      }
      g.globalAlpha = 0.95 * fade; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, R1, Math.min(a1, a2), Math.max(a1, a2)); g.stroke();
      g.restore();
    }
  }
  g.save();
  g.translate(P.x, P.y + 6);
  if (P.inv > 0 && Math.floor(t * 20) % 2) g.globalAlpha = 0.45;
  // ----- roll: tucked ball -----
  if (P.state === 'roll') {
    const k = P.t / 0.4, dir = Math.cos(P.rollA) < 0 ? -1 : 1;
    g.translate(0, -20); g.scale(1.18, 1.18); g.rotate(dir * k * TAU * 1.1);
    g.fillStyle = C.cape; g.beginPath(); g.arc(0, 0, 21, 0, TAU); g.fill();
    g.strokeStyle = C.trim; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 21, 0.3, 2.4); g.stroke();
    const ag = g.createRadialGradient(-5, -5, 2, 0, 0, 17); ag.addColorStop(0, '#fff'); ag.addColorStop(0.3, C.armor); ag.addColorStop(1, C.armor2);
    g.fillStyle = ag; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
    g.fillStyle = C.dark; g.fillRect(-2, -10, 12, 4);
    g.restore();
    g.save(); g.globalAlpha = 0.25; g.fillStyle = '#9fe3ff'; g.beginPath(); g.arc(P.x - Math.cos(P.rollA) * 26, P.y - 12 - Math.sin(P.rollA) * 26, 16, 0, TAU); g.fill(); g.restore();
    return;
  }
  if (P.state === 'dead') { g.rotate(-Math.PI / 2 * P.flipT); g.translate(-10 * P.flipT, -6); }
  g.scale(P.flipS * 1.18, 1.18);
  const run = moving ? 1 : 0, ph = P.rp;
  const bob = run ? -Math.abs(Math.sin(ph)) * 3.5 : Math.sin(t * 2.2) * 1;
  let lean = run ? 0.12 : 0;
  if (P.state === 'hurt') lean = -0.25;
  if (P.state === 'attack') lean = 0.1;
  g.translate(0, bob);
  g.rotate(lean);
  // limb helper (joint chain)
  const limb = (x, y, a1, l1, a2, l2, wdt, col, col2, foot) => {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1, fx = kx + Math.sin(a1 + a2) * l2, fy = ky + Math.cos(a1 + a2) * l2;
    g.lineCap = 'round'; g.strokeStyle = col2; g.lineWidth = wdt + 2; g.beginPath(); g.moveTo(x, y); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
    g.strokeStyle = col; g.lineWidth = wdt; g.beginPath(); g.moveTo(x, y); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(kx, ky, wdt * 0.62, 0, TAU); g.fill();
    if (foot) { g.fillStyle = C.dark; g.beginPath(); g.ellipse(fx + 3, fy + 1, 6.5, 3.6, 0, 0, TAU); g.fill(); }
    return [fx, fy];
  };
  const legSw = run ? Math.sin(ph) * 0.7 : 0;
  // cape (behind everything)
  const capeWave = Math.sin(t * 5) * 3 + (run ? 6 : 0) + (P.state === 'attack' ? 4 : 0);
  const cg = g.createLinearGradient(0, -62, -20, -6); cg.addColorStop(0, C.cape); cg.addColorStop(1, C.cape2);
  g.fillStyle = cg; g.beginPath(); g.moveTo(-6, -64); g.quadraticCurveTo(-18 - capeWave, -40, -24 - capeWave * 1.6, -8 + Math.sin(t * 7) * 2);
  g.lineTo(-10 - capeWave * 0.8, -6 + Math.sin(t * 6 + 1) * 2); g.quadraticCurveTo(-6, -30, 4, -62); g.closePath(); g.fill();
  g.strokeStyle = C.trim; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-24 - capeWave * 1.6, -8 + Math.sin(t * 7) * 2); g.lineTo(-10 - capeWave * 0.8, -6 + Math.sin(t * 6 + 1) * 2); g.stroke();
  // back leg & back arm (with shield)
  limb(-3, -34, -legSw, 16, Math.max(0, legSw) * 0.8 + 0.1, 16, 8, C.armor2, '#20242c', true);
  let backA = run ? Math.sin(ph) * 0.5 : 0.15 + Math.sin(t * 2) * 0.05;
  if (P.state === 'drink') backA = Math.PI * 0.85;
  const [bhx, bhy] = limb(-4, -60, backA, 12, -0.4, 12, 7, C.armor2, '#20242c');
  if (P.state === 'drink') { g.fillStyle = '#5adf6a'; g.beginPath(); g.ellipse(bhx + 2, bhy - 4, 4, 6, 0.3, 0, TAU); g.fill(); g.fillStyle = '#ddd'; g.fillRect(bhx, bhy - 13, 4, 4); }
  else { // shield
    g.save(); g.translate(bhx - 4, bhy - 6);
    const sg = g.createLinearGradient(-10, 0, 10, 0); sg.addColorStop(0, '#1c3c8c'); sg.addColorStop(1, C.tabard);
    g.fillStyle = sg; g.beginPath(); g.moveTo(-11, -12); g.lineTo(11, -12); g.lineTo(11, 2); g.quadraticCurveTo(0, 16, 0, 18); g.quadraticCurveTo(0, 16, -11, 2); g.closePath(); g.fill();
    g.strokeStyle = C.trim; g.lineWidth = 2; g.stroke(); g.fillStyle = C.trim; g.font = 'bold 13px Georgia'; g.textAlign = 'center'; g.fillText('M', 0, 3);
    g.restore();
  }
  // front leg
  limb(4, -34, legSw, 16, Math.max(0, -legSw) * 0.8 + 0.1, 16, 9, C.armor, C.armor2, true);
  // torso
  const tg = g.createLinearGradient(-12, 0, 14, 0); tg.addColorStop(0, C.armor2); tg.addColorStop(0.45, C.armor); tg.addColorStop(1, C.armor2);
  g.fillStyle = tg; roundRect(g, -12, -68, 25, 36, 8); g.fill();
  g.fillStyle = C.tabard; g.beginPath(); g.moveTo(-9, -54); g.lineTo(11, -54); g.lineTo(9, -26); g.lineTo(1, -22); g.lineTo(-7, -26); g.closePath(); g.fill();
  g.strokeStyle = C.trim; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = C.trim; g.beginPath(); g.moveTo(1, -48); g.lineTo(5, -42); g.lineTo(1, -36); g.lineTo(-3, -42); g.closePath(); g.fill();
  g.fillStyle = '#4a3020'; g.fillRect(-12, -36, 25, 4); g.fillStyle = C.trim; g.fillRect(-1, -36.5, 5, 5);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-6, -66, 9, 3);
  // head / helmet
  const hy = -80 + (P.state === 'hurt' ? 2 : 0);
  // plume
  g.fillStyle = C.plume; g.beginPath(); g.moveTo(-2, hy - 12); g.quadraticCurveTo(-14 - capeWave * 0.5, hy - 22, -24 - capeWave, hy - 8 + Math.sin(t * 8) * 2); g.quadraticCurveTo(-12, hy - 10, -2, hy - 6); g.fill();
  const hg = g.createRadialGradient(-2, hy - 6, 2, 1, hy, 15); hg.addColorStop(0, '#fff'); hg.addColorStop(0.35, C.armor); hg.addColorStop(1, C.armor2);
  g.fillStyle = hg; g.beginPath(); g.moveTo(-11, hy + 9); g.lineTo(-12, hy - 4); g.quadraticCurveTo(-10, hy - 15, 1, hy - 15); g.quadraticCurveTo(13, hy - 14, 13, hy - 2); g.lineTo(12, hy + 9); g.closePath(); g.fill();
  g.strokeStyle = C.dark; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = C.dark; g.fillRect(2, hy - 5, 11, 4.5);                                  // visor slit
  g.fillStyle = C.eyes; g.shadowColor = C.eyes; g.shadowBlur = 6; g.fillRect(6, hy - 4, 2.5, 2.5); g.fillRect(10, hy - 4, 2.5, 2.5); g.shadowBlur = 0;
  g.strokeStyle = C.trim; g.lineWidth = 1.5; g.beginPath(); g.moveTo(1, hy - 15); g.lineTo(1, hy + 9); g.stroke();
  if (SAVE.crafted.crown) { g.fillStyle = '#ffd36a'; g.beginPath(); g.moveTo(-9, hy - 13); g.lineTo(-7, hy - 21); g.lineTo(-3, hy - 15); g.lineTo(1, hy - 23); g.lineTo(5, hy - 15); g.lineTo(9, hy - 21); g.lineTo(10, hy - 13); g.closePath(); g.fill(); }
  // pauldron
  const pg = g.createRadialGradient(3, -64, 1, 4, -62, 10); pg.addColorStop(0, '#fff'); pg.addColorStop(0.4, C.armor); pg.addColorStop(1, C.armor2);
  g.fillStyle = pg; g.beginPath(); g.ellipse(4, -62, 9, 7, 0, 0, TAU); g.fill(); g.strokeStyle = C.trim; g.lineWidth = 1.2; g.stroke();
  // weapon arm: angle from straight-down (0) — negative = raised behind, positive = forward
  let armA = run ? -Math.sin(ph) * 0.5 + 0.3 : 0.45 + Math.sin(t * 2) * 0.04, wA = 0.9, ext = 0;
  if (P.state === 'attack') {
    const T1 = w.wind, T2 = T1 + w.act, rec = w.rec * (P.combo === w.combo - 1 ? 1.4 : 1), alt = P.combo % 2 === 1;
    let from = alt ? 2.4 : -0.6, to = alt ? -0.4 : 2.3;              // overhead → low  /  low → high
    if (key === 'hammer') { from = -1.2; to = 2.4; }
    if (key === 'spear' || key === 'whip') { from = 1.0; to = 1.6; }
    let k;
    if (P.t < T1) { k = P.t / T1; armA = 0.45 + (from - 0.45) * ease(k) - (key === 'spear' ? 0.0 : 0.25 * k); }
    else if (P.t < T2) { k = (P.t - T1) / w.act; armA = from + (to - from) * ease(k); ext = k; }
    else { k = clamp((P.t - T2) / rec, 0, 1); armA = to + (0.45 - to) * ease(k); ext = 1 - k; }
    armA += aimTilt * 0.6 * (P.flipT);
    wA = 1.57;                                                        // weapon in line with the forearm while swinging
  }
  // compute hand position
  const sx = 5, sy = -60, ua = armA, fa = P.state === 'attack' ? 0.15 : 0.5;
  const ex = sx + Math.sin(ua) * 11, ey = sy + Math.cos(ua) * 11, hx = ex + Math.sin(ua + fa) * 11, hy2 = ey + Math.cos(ua + fa) * 11;
  // weapon (behind the hand)
  g.save(); g.translate(hx, hy2);
  const wAng = (P.state === 'attack' ? Math.PI / 2 - (ua + fa) : Math.PI / 2 - (ua + fa) - wA + 0.9) ;
  g.rotate(-wAng + (P.state === 'attack' ? 0 : -0.6));
  const vis = key === 'whip' ? w.reach : key === 'spear' ? w.reach * 0.75 + (P.state === 'attack' ? ext * 18 : 0) : w.reach * 0.62 + 10;
  drawWeaponArt(g, key, lvl, vis, t, key === 'whip' ? ext : 0);
  g.restore();
  limb(sx, sy, ua, 11, fa, 11, 8, C.armor, C.armor2);
  g.fillStyle = C.dark; g.beginPath(); g.arc(hx, hy2, 4.2, 0, TAU); g.fill();       // gauntlet
  // tier sparkles
  const ti = weaponTier(lvl);
  if (ti >= 2 && Math.random() < 0.08 + ti * 0.05) {
    const wx = P.x + (hx + Math.cos(-wAng) * vis * 0.6) * P.flipS, wy = P.y + 6 + hy2 + Math.sin(-wAng) * vis * 0.6;
    F.fx.push({ x: wx + rand(-8, 8), y: wy + rand(-8, 8), vx: rand(-20, 20), vy: rand(-60, -10), life: 0.6, t: 0, col: ti === 5 ? `rgb(${hslToRgb(Math.random() * 360, 90, 75)})` : `rgb(${T.glow})`, size: ti >= 4 ? 2.6 : 2 });
  }
  g.restore();
}
// small canvas preview for the forge
function weaponPreview(key, lvl, w = 150, h = 54) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px';
  const g = c.getContext('2d'); g.scale(2, 2); g.translate(14, h / 2 + (key === 'hooks' ? 10 : 0));
  drawWeaponArt(g, key, lvl, key === 'whip' ? w - 24 : w - 30, performance.now() / 1000, key === 'whip' ? 1 : 0);
  return c;
}
