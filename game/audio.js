// ===== Mikkel's Monster Sketchbook — procedural Web Audio engine (SFX, voices, adaptive music) =====
'use strict';

let AC = null;
const AUDIO = {
  ready: false,
  master: null,
  sfxGain: null,
  musGain: null,
  musFilter: null,
  dryBus: null,
  revSend: null,
  convolvers: {},
  activeSpace: null,
  noiseBuf: null,
  distLight: null,
  distHeavy: null,
  lastAt: {},
};

const MUS = {
  timer: null,
  next: 0,
  step: 0,
  mode: null,      // 'map' | 'forge' | 'battle'
  region: 0,
  bossDef: null,
  gain: null,
  duckUntil: 0,
};

function audioRand(a, b) { return a + Math.random() * (b - a); }
function aclamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function makeWaveShaper(ctx, amount) {
  const ws = ctx.createWaveShaper();
  const n = 256, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  ws.curve = curve;
  return ws;
}

function buildImpulse(ctx, dur, decay, lpFreq, preDelay = 0.012) {
  const sr = ctx.sampleRate, len = Math.floor(sr * dur), pre = Math.floor(sr * preDelay);
  const buf = ctx.createBuffer(2, len, sr);
  const a = aclamp(lpFreq / (sr * 0.5), 0.08, 0.95);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last += a * (w - last);
      const env = i < pre ? (i / Math.max(1, pre)) * 0.35 : Math.pow(1 - (i - pre) / (len - pre), decay);
      d[i] = last * env;
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function audioInit() {
  try {
    if (!AC) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      AC = new Ctx();

      const comp = AC.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 4.2;
      comp.attack.value = 0.003;
      comp.release.value = 0.16;
      comp.connect(AC.destination);
      AUDIO.master = comp;

      AUDIO.dryBus = AC.createGain();
      AUDIO.dryBus.gain.value = 0.92;
      AUDIO.dryBus.connect(comp);

      AUDIO.revSend = AC.createGain();
      AUDIO.revSend.gain.value = 0.28;

      AUDIO.convolvers.room = buildImpulse(AC, 0.75, 3.2, 3600, 0.008);
      AUDIO.convolvers.cavern = buildImpulse(AC, 1.45, 2.7, 2600, 0.016);
      AUDIO.convolvers.cathedral = buildImpulse(AC, 2.1, 2.3, 2200, 0.022);
      for (const k in AUDIO.convolvers) AUDIO.convolvers[k].connect(comp);

      AUDIO.sfxGain = AC.createGain();
      AUDIO.sfxGain.gain.value = 1.0;
      AUDIO.sfxGain.connect(AUDIO.dryBus);

      AUDIO.musFilter = AC.createBiquadFilter();
      AUDIO.musFilter.type = 'lowpass';
      AUDIO.musFilter.frequency.value = 16000;
      AUDIO.musFilter.Q.value = 0.6;

      AUDIO.musGain = AC.createGain();
      AUDIO.musGain.gain.value = 0.85;
      AUDIO.musFilter.connect(AUDIO.musGain);
      AUDIO.musGain.connect(AUDIO.dryBus);
      const musRev = AC.createGain();
      musRev.gain.value = 0.30;
      AUDIO.musGain.connect(musRev);
      musRev.connect(AUDIO.revSend);

      const nLen = AC.sampleRate * 2;
      AUDIO.noiseBuf = AC.createBuffer(1, nLen, AC.sampleRate);
      const nd = AUDIO.noiseBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;

      AUDIO.distLight = makeWaveShaper(AC, 14);
      AUDIO.distHeavy = makeWaveShaper(AC, 28);

      setAudioSpace('room');
      AUDIO.ready = true;

      // Unlock iOS/iPadOS WebKit with a 1-frame silent buffer
      const sb = AC.createBuffer(1, 1, 22050), src = AC.createBufferSource();
      src.buffer = sb; src.connect(AC.destination); src.start(0);
    }
    if (AC && (AC.state === 'suspended' || AC.state === 'interrupted')) {
      AC.resume().catch(() => {});
    }
    // Start ambient music if player just unlocked audio on a menu screen
    if (AUDIO.ready && !MUS.timer && typeof SAVE !== 'undefined' && SAVE.sound && SAVE.music !== false) {
      const onScreen = id => { const el = document.getElementById(id); return el && el.classList.contains('on'); };
      if (typeof F !== 'undefined' && F && !F.over) musicStart(F.b.def.region, F.b.def);
      else if (onScreen('forge')) musicStart('forge');
      else if (onScreen('map') || onScreen('title') || onScreen('intro') || onScreen('settings')) musicStart('map');
    }
  } catch (e) {}
}

if (typeof document !== 'undefined') {
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => {
    window.addEventListener(ev, () => { if (!AC || AC.state !== 'running') audioInit(); }, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!AC) return;
    if (document.hidden) { try { AC.suspend(); } catch (e) {} }
    else if (typeof SAVE !== 'undefined' && SAVE.sound) { try { AC.resume(); } catch (e) {} }
  });
}

function setAudioSpace(space) {
  if (!AUDIO.ready || AUDIO.activeSpace === space) return;
  try { AUDIO.revSend.disconnect(); } catch (e) {}
  const target = AUDIO.convolvers[space] || AUDIO.convolvers.cavern;
  AUDIO.revSend.connect(target);
  AUDIO.activeSpace = space;
}

function spaceForRegion(region, bossDef) {
  if (bossDef && bossDef.final) return 'cathedral';
  if (region === 1) return 'room';
  if (region === 4 || region === 5) return 'cathedral';
  return 'cavern';
}

function noiseBuf() {
  if (!AUDIO.noiseBuf && AC) {
    const n = AC.sampleRate * 2;
    AUDIO.noiseBuf = AC.createBuffer(1, n, AC.sampleRate);
    const d = AUDIO.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  return AUDIO.noiseBuf;
}

function sfxOut(wet = 0.22, x = null) {
  const dest = AC.createGain();
  let tail = dest;
  if (x != null && AC.createStereoPanner) {
    const p = AC.createStereoPanner();
    const w = (typeof AW !== 'undefined' && AW) ? AW : 1200;
    p.pan.value = aclamp(((x / w) * 2 - 1) * 0.58, -0.7, 0.7);
    dest.connect(p);
    tail = p;
  }
  tail.connect(AUDIO.sfxGain);
  if (wet > 0) {
    const wg = AC.createGain();
    wg.gain.value = wet;
    tail.connect(wg);
    wg.connect(AUDIO.revSend);
  }
  return dest;
}

function canPlay(key, minGapMs = 26) {
  if (!AC || !AUDIO.ready || typeof SAVE === 'undefined' || !SAVE.sound) return false;
  const now = performance.now();
  if (minGapMs > 0 && now - (AUDIO.lastAt[key] || 0) < minGapMs) return false;
  AUDIO.lastAt[key] = now;
  return true;
}

// Low-level building blocks routed through an output bus
function oscEnv(out, type, fStart, fEnd, t0, dur, vol, attack = 0.004) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(16, fStart), t0);
  if (fEnd && fEnd !== fStart) o.frequency.exponentialRampToValueAtTime(Math.max(16, fEnd), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + Math.min(attack, dur * 0.4));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out);
  o.start(t0); o.stop(t0 + dur + 0.03);
}

function noiseEnv(out, filterType, fStart, fEnd, Q, t0, dur, vol, attack = 0.005, distort = false) {
  const src = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = noiseBuf();
  fl.type = filterType;
  fl.Q.value = Q;
  fl.frequency.setValueAtTime(Math.max(30, fStart), t0);
  if (fEnd && fEnd !== fStart) fl.frequency.exponentialRampToValueAtTime(Math.max(30, fEnd), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + Math.min(attack, dur * 0.45));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(fl);
  if (distort && AUDIO.distLight) { fl.connect(AUDIO.distLight); AUDIO.distLight.connect(g); }
  else fl.connect(g);
  g.connect(out);
  src.start(t0, Math.random() * 1.2);
  src.stop(t0 + dur + 0.03);
}

function fmBell(out, freq, ratio, index, t0, dur, vol) {
  const car = AC.createOscillator(), mod = AC.createOscillator(), mg = AC.createGain(), g = AC.createGain();
  car.type = 'sine'; car.frequency.setValueAtTime(freq, t0);
  mod.type = 'sine'; mod.frequency.setValueAtTime(freq * ratio, t0);
  mg.gain.setValueAtTime(freq * index, t0);
  mg.gain.exponentialRampToValueAtTime(0.5, t0 + Math.min(dur * 0.65, 0.28));
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(out);
  car.start(t0); mod.start(t0);
  car.stop(t0 + dur + 0.03); mod.stop(t0 + dur + 0.03);
}

// Legacy helpers preserved in case anything external calls them
function tone(f, d, type = 'square', v = 0.08, f2 = null, delay = 0) {
  if (!canPlay('_tone', 0)) return;
  oscEnv(sfxOut(0.18), type, f, f2, AC.currentTime + delay, d, v);
}
function noise(d, v = 0.12, freq = 1200, delay = 0) {
  if (!canPlay('_noise', 0)) return;
  noiseEnv(sfxOut(0.18), 'lowpass', freq, freq * 0.5, 0.8, AC.currentTime + delay, d, v);
}

// ---------------- WEAPON & CHARM COMBAT SFX ----------------
function currentWeaponKey() {
  return (typeof SAVE !== 'undefined' && SAVE.equip && SAVE.equip.weapon) || 'twig';
}

function sfxPlayerSwing(P) {
  if (!canPlay('pswing', 30)) return;
  const wk = currentWeaponKey();
  const combo = P ? (P.combo || 0) : 0;
  const maxC = (P && P.w && P.w.combo) || 3;
  const fin = combo === maxC - 1 && maxC > 1;
  const p = audioRand(0.94, 1.06) * (1 + combo * 0.06) * (fin ? 1.06 : 1);
  const t = AC.currentTime, out = sfxOut(0.18, P ? P.x : null);
  const tier = (typeof weaponTier === 'function' && P) ? weaponTier(P.lvl || 0) : 0;

  switch (wk) {
    case 'hammer':
      noiseEnv(out, 'bandpass', 150 * p, 620 * p, 1.8, t, 0.24, 0.28, 0.09);
      oscEnv(out, 'sine', 120 * p, 52, t + 0.03, 0.22, 0.16, 0.05);
      break;
    case 'dragon':
      noiseEnv(out, 'bandpass', 260 * p, 1650 * p, 2.0, t, 0.19, 0.26, 0.05);
      oscEnv(out, 'sawtooth', 240 * p, 110, t + 0.02, 0.16, 0.05, 0.03);
      break;
    case 'spear':
      noiseEnv(out, 'bandpass', 950 * p, 4200 * p, 3.6, t, 0.11, 0.22, 0.015);
      oscEnv(out, 'triangle', 680 * p, 1380 * p, t, 0.08, 0.06, 0.01);
      break;
    case 'hooks':
      noiseEnv(out, 'bandpass', 1200 * p, 4800 * p, 2.8, t, 0.075, 0.18, 0.01);
      fmBell(out, 2650 * p, 2.4, 0.8, t + 0.01, 0.09, 0.035);
      break;
    case 'whip':
      noiseEnv(out, 'bandpass', 320 * p, 5600 * p, 3.4, t, 0.095, 0.22, 0.06);
      noiseEnv(out, 'highpass', 2200, 3600, 0.9, t + 0.082, 0.042, 0.34, 0.002);
      oscEnv(out, 'triangle', 1900 * p, 380, t + 0.082, 0.045, 0.09, 0.002);
      break;
    default: // twig sword
      noiseEnv(out, 'bandpass', 580 * p, 3300 * p, 2.3, t, 0.12, 0.22, 0.025);
      oscEnv(out, 'triangle', 520 * p, 980 * p, t + 0.01, 0.09, 0.045, 0.015);
      break;
  }
  // High upgrade tiers (Crystal / Infernal / Legendary) add a subtle magical blade glint
  if (tier >= 3) {
    fmBell(out, (1560 + tier * 220) * p, 2.0, 0.7, t + 0.015, 0.14, 0.028);
  }
}

function sfxPlayerHit(opts = {}) {
  if (!canPlay('phit', 24)) return;
  const wk = opts.weapon || currentWeaponKey();
  const t = AC.currentTime, p = audioRand(0.93, 1.07) * (opts.finisher ? 1.08 : 1);
  const out = sfxOut(opts.big ? 0.34 : 0.22, opts.x);

  if (wk === 'hammer' || opts.big) {
    // Seismic thud + crunch + rock scatter
    oscEnv(out, 'sine', 125 * p, 28, t, 0.34, 0.46, 0.003);
    oscEnv(out, 'sawtooth', 92 * p, 36, t, 0.22, 0.11, 0.004);
    noiseEnv(out, 'bandpass', 1100 * p, 420, 1.3, t, 0.16, 0.28, 0.003, true);
    if (wk === 'hammer') {
      noiseEnv(out, 'bandpass', 1800, 750, 1.6, t + 0.045, 0.13, 0.16, 0.004);
      fmBell(out, 440 * p, 1.41, 1.6, t, 0.22, 0.06);
    } else {
      fmBell(out, 1860 * p, 1.5, 1.1, t, 0.18, 0.055);
    }
  } else if (wk === 'hooks') {
    [0, 0.032].forEach((dt, i) => {
      oscEnv(out, 'sine', (185 + i * 35) * p, 55, t + dt, 0.09, 0.24, 0.002);
      noiseEnv(out, 'bandpass', 2400 * p, 1200, 1.8, t + dt, 0.06, 0.18, 0.002);
    });
  } else if (wk === 'whip') {
    oscEnv(out, 'sine', 165 * p, 46, t, 0.13, 0.30, 0.002);
    noiseEnv(out, 'highpass', 1900, 900, 1.1, t, 0.07, 0.28, 0.002);
  } else if (wk === 'spear') {
    oscEnv(out, 'sine', 195 * p, 48, t, 0.13, 0.32, 0.002);
    noiseEnv(out, 'bandpass', 2200 * p, 950, 2.0, t, 0.08, 0.22, 0.002, true);
    fmBell(out, 2780 * p, 1.5, 0.9, t, 0.13, 0.045);
  } else {
    // Twig sword & general slash hit
    oscEnv(out, 'sine', 160 * p, 42, t, 0.14, 0.34, 0.003);
    noiseEnv(out, 'bandpass', 1550 * p, 680, 1.4, t, 0.09, 0.24, 0.003, true);
    fmBell(out, 2450 * p, 1.5, 0.8, t, 0.14, 0.04);
  }

  // Finisher or hitting staggered monster = extra meaty punch
  if (opts.finisher || opts.staggered) {
    oscEnv(out, 'sine', 98, 28, t, 0.26, 0.26, 0.004);
    fmBell(out, 1174.66 * p, 2.0, 1.2, t + 0.01, 0.24, 0.055);
  }
  // Super-effective weakness chime!
  if (opts.weak) {
    fmBell(out, 1318.5, 2.0, 0.9, t + 0.015, 0.20, 0.055);
    fmBell(out, 1975.5, 2.0, 0.7, t + 0.045, 0.24, 0.050);
  }
  // Elemental charm layer
  if (opts.charm === 'fire') {
    noiseEnv(out, 'bandpass', 2200, 900, 1.2, t + 0.01, 0.14, 0.13, 0.01);
  } else if (opts.charm === 'ice') {
    fmBell(out, audioRand(2600, 3400), 2.82, 1.4, t + 0.01, 0.16, 0.048);
  } else if (opts.charm === 'spark') {
    for (let i = 0; i < 2; i++) {
      oscEnv(out, 'sawtooth', audioRand(1800, 3600), audioRand(420, 850), t + 0.01 + i * 0.028, 0.032, 0.065, 0.002);
    }
  }
}

// ---------------- GENERAL SFX BANK ----------------
const SFX = {
  swing: (o) => {
    if (o && o.player) return sfxPlayerSwing(o.player);
    if (!canPlay('swing', 35)) return;
    const p = audioRand(0.85, 1.12), t = AC.currentTime;
    const out = sfxOut(0.24, o && o.x != null ? o.x : (typeof F !== 'undefined' && F && F.b ? F.b.x : null));
    noiseEnv(out, 'bandpass', 380 * p, 1900 * p, 2.0, t, 0.15, 0.22, 0.03);
    oscEnv(out, 'sine', 180 * p, 75, t + 0.01, 0.13, 0.12, 0.02);
  },
  hit: (o) => sfxPlayerHit(Object.assign({ big: false }, o)),
  bighit: (o) => sfxPlayerHit(Object.assign({ big: true }, o)),

  hurt: () => {
    if (!canPlay('hurt', 80)) return;
    const t = AC.currentTime, out = sfxOut(0.25, typeof F !== 'undefined' && F ? F.p.x : null);
    oscEnv(out, 'sine', 150, 36, t, 0.28, 0.42, 0.003);
    oscEnv(out, 'sawtooth', 260, 88, t, 0.22, 0.12, 0.005);
    noiseEnv(out, 'bandpass', 950, 320, 1.4, t, 0.15, 0.25, 0.003, true);
  },

  roll: () => {
    if (!canPlay('roll', 60)) return;
    const t = AC.currentTime, mud = typeof F !== 'undefined' && F && F.p && F.p.mud;
    const out = sfxOut(0.16, typeof F !== 'undefined' && F ? F.p.x : null);
    noiseEnv(out, 'bandpass', mud ? 450 : 880, mud ? 220 : 320, 1.5, t, 0.19, 0.18, 0.025);
    oscEnv(out, 'sine', mud ? 140 : 190, 68, t, 0.11, 0.10, 0.01);
  },

  dodge: () => {
    if (!canPlay('dodge', 80)) return;
    const t = AC.currentTime, out = sfxOut(0.42, typeof F !== 'undefined' && F ? F.p.x : null);
    noiseEnv(out, 'bandpass', 1400, 3400, 2.2, t, 0.14, 0.12, 0.01);
    [880, 1108.7, 1318.5, 1760].forEach((f, i) => {
      fmBell(out, f, 2.0, 0.5, t + i * 0.022, 0.20, 0.055);
    });
  },

  spark: () => {
    if (!canPlay('spark', 45)) return;
    const t = AC.currentTime;
    const bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.45, bx);
    // Crisp, unmistakable ✦ telegraph bell chime
    fmBell(out, 1760, 2.0, 1.1, t, 0.20, 0.095);
    fmBell(out, 2637, 2.0, 0.7, t + 0.012, 0.18, 0.065);
    oscEnv(out, 'triangle', 3520, 3600, t, 0.11, 0.035, 0.003);
  },

  dash: () => {
    if (!canPlay('dash', 55)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.28, bx), p = audioRand(0.9, 1.1);
    noiseEnv(out, 'bandpass', 220 * p, 920 * p, 1.6, t, 0.32, 0.24, 0.04);
    oscEnv(out, 'sine', 125 * p, 48, t, 0.26, 0.20, 0.02);
  },

  slam: () => {
    if (!canPlay('slam', 45)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.45, bx), p = audioRand(0.92, 1.08);
    oscEnv(out, 'sine', 105 * p, 26, t, 0.48, 0.52, 0.004);
    oscEnv(out, 'triangle', 74 * p, 30, t, 0.35, 0.22, 0.005);
    noiseEnv(out, 'lowpass', 620, 160, 1.0, t, 0.36, 0.34, 0.005, true);
    noiseEnv(out, 'bandpass', 1500, 520, 1.4, t + 0.02, 0.18, 0.16, 0.005);
  },

  boom: () => {
    if (!canPlay('boom', 38)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.35, bx), p = audioRand(0.9, 1.12);
    oscEnv(out, 'sine', 110 * p, 34, t, 0.32, 0.34, 0.004);
    noiseEnv(out, 'lowpass', 780 * p, 200, 1.1, t, 0.22, 0.20, 0.004);
  },

  shoot: () => {
    if (!canPlay('shoot', 32)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.24, bx), p = audioRand(0.88, 1.16);
    oscEnv(out, 'triangle', 740 * p, 210 * p, t, 0.11, 0.11, 0.003);
    noiseEnv(out, 'bandpass', 1800 * p, 600, 2.2, t, 0.08, 0.10, 0.003);
  },

  spit: () => {
    if (!canPlay('spit', 40)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.26, bx), p = audioRand(0.88, 1.15);
    oscEnv(out, 'sine', 240 * p, 580 * p, t, 0.09, 0.12, 0.008);
    oscEnv(out, 'sine', 520 * p, 160 * p, t + 0.06, 0.10, 0.10, 0.005);
    noiseEnv(out, 'bandpass', 1100, 480, 3.5, t, 0.13, 0.12, 0.01);
  },

  beamCharge: (dur = 0.85) => {
    if (!canPlay('bchg', 120)) return;
    const t = AC.currentTime, d = aclamp(dur, 0.35, 1.4);
    const bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.35, bx);
    oscEnv(out, 'sawtooth', 180, 920, t, d, 0.065, d * 0.7);
    oscEnv(out, 'sine', 360, 1840, t, d, 0.06, d * 0.7);
    noiseEnv(out, 'bandpass', 500, 3200, 4.0, t, d, 0.08, d * 0.65);
  },

  beamFire: (dur = 1.2) => {
    if (!canPlay('bfire', 120)) return;
    const t = AC.currentTime, d = aclamp(dur, 0.4, 2.2);
    const bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.4, bx);
    oscEnv(out, 'sawtooth', 145, 110, t, d * 0.85, 0.10, 0.02);
    noiseEnv(out, 'bandpass', 1600, 950, 1.8, t, d * 0.9, 0.16, 0.015, true);
    oscEnv(out, 'sine', 95, 38, t, 0.25, 0.28, 0.004);
  },

  spawn: () => {
    if (!canPlay('spawn', 60)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.32, bx);
    [220, 310, 440].forEach((f, i) => {
      oscEnv(out, 'sine', f * 0.7, f * 1.45, t + i * 0.055, 0.14, 0.10, 0.01);
    });
    noiseEnv(out, 'bandpass', 700, 1800, 2.5, t, 0.24, 0.11, 0.03);
  },

  vanish: () => {
    if (!canPlay('vanish', 60)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.5, bx);
    oscEnv(out, 'sine', 980, 170, t, 0.34, 0.10, 0.02);
    noiseEnv(out, 'bandpass', 2600, 320, 2.8, t, 0.32, 0.14, 0.02);
  },

  appear: () => {
    if (!canPlay('appear', 60)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.45, bx);
    noiseEnv(out, 'bandpass', 340, 2200, 2.4, t, 0.18, 0.14, 0.02);
    oscEnv(out, 'triangle', 220, 620, t, 0.16, 0.08, 0.02);
  },

  burrow: () => {
    if (!canPlay('burrow', 140)) return;
    const t = AC.currentTime, out = sfxOut(0.25);
    oscEnv(out, 'sine', 78, 44, t, 0.16, 0.16, 0.01);
    noiseEnv(out, 'lowpass', 380, 180, 1.2, t, 0.15, 0.14, 0.01);
  },

  inhale: () => {
    if (!canPlay('inhale', 150)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.35, bx);
    noiseEnv(out, 'bandpass', 220, 1150, 2.8, t, 1.55, 0.18, 0.55);
    oscEnv(out, 'sine', 75, 195, t, 1.5, 0.11, 0.5);
  },

  chomp: () => {
    if (!canPlay('chomp', 60)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.32, bx);
    oscEnv(out, 'sine', 165, 34, t, 0.22, 0.44, 0.002);
    noiseEnv(out, 'bandpass', 1900, 580, 1.5, t, 0.13, 0.34, 0.002, true);
    oscEnv(out, 'square', 130, 48, t + 0.015, 0.12, 0.12, 0.002);
  },

  roar: () => {
    if (!canPlay('roar', 200)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.55, bx);
    // Sub shockwave + dramatic Phase 2 brass tension hit
    oscEnv(out, 'sine', 95, 28, t, 1.1, 0.38, 0.04);
    [73.42, 110, 155.56].forEach(f => {
      oscEnv(out, 'sawtooth', f, f * 0.98, t + 0.05, 1.05, 0.045, 0.08);
    });
    noiseEnv(out, 'lowpass', 650, 180, 1.2, t + 0.45, 0.55, 0.22, 0.02);
  },

  drink: () => {
    if (!canPlay('drink', 100)) return;
    const t = AC.currentTime, out = sfxOut(0.25, typeof F !== 'undefined' && F ? F.p.x : null);
    // Cork pop + two potion glugs
    oscEnv(out, 'sine', 380, 920, t, 0.055, 0.12, 0.004);
    [0.12, 0.28].forEach((dt, i) => {
      oscEnv(out, 'sine', 340 + i * 70, 680 + i * 90, t + dt, 0.11, 0.12, 0.015);
    });
  },

  heal: () => {
    if (!canPlay('heal', 80)) return;
    const t = AC.currentTime, out = sfxOut(0.48, typeof F !== 'undefined' && F ? F.p.x : null);
    [587.3, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => {
      fmBell(out, f, 2.0, 0.6, t + i * 0.055, 0.34, 0.065);
    });
  },

  stagger: () => {
    if (!canPlay('stagger', 120)) return;
    const t = AC.currentTime, bx = typeof F !== 'undefined' && F && F.b ? F.b.x : null;
    const out = sfxOut(0.6, bx);
    // Momentarily duck battle music so the poise shatter feels monumental
    MUS.duckUntil = t + 0.9;
    oscEnv(out, 'sine', 135, 30, t, 0.62, 0.48, 0.004);
    [1174.66, 1760, 2349.3, 3136].forEach((f, i) => {
      fmBell(out, f, 1.5, 1.3, t + i * 0.018, 0.48, 0.075);
    });
    [73.42, 110.0, 146.83].forEach(f => {
      const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
      o.type = 'sawtooth'; o.frequency.value = f * audioRand(0.996, 1.004);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(280, t);
      lp.frequency.exponentialRampToValueAtTime(1850, t + 0.11);
      lp.frequency.exponentialRampToValueAtTime(420, t + 0.78);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.075, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.82);
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.86);
    });
  },

  summon: () => {
    if (!canPlay('summon', 100)) return;
    const t = AC.currentTime, out = sfxOut(0.55);
    noiseEnv(out, 'bandpass', 400, 2400, 2.5, t, 0.45, 0.12, 0.12);
    [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => {
      fmBell(out, f, 2.0, 0.8, t + i * 0.06, 0.45, 0.06);
    });
  },

  burn: () => {
    if (!canPlay('burn', 55)) return;
    const t = AC.currentTime, out = sfxOut(0.24);
    noiseEnv(out, 'bandpass', 1100, 3200, 1.3, t, 0.20, 0.14, 0.015);
    oscEnv(out, 'sine', 160, 70, t, 0.15, 0.10, 0.01);
  },

  freeze: () => {
    if (!canPlay('freeze', 100)) return;
    const t = AC.currentTime, out = sfxOut(0.5);
    [1567.98, 2093.0, 2637.02, 3135.96].forEach((f, i) => {
      fmBell(out, f, 2.83, 1.8, t + i * 0.025, 0.36, 0.065);
    });
    noiseEnv(out, 'highpass', 3200, 6000, 1.2, t, 0.18, 0.12, 0.005);
  },

  explode: (o) => {
    if (!canPlay('explode', 60)) return;
    const t = AC.currentTime, out = sfxOut(0.55, o && o.x);
    oscEnv(out, 'sine', 95, 22, t, 0.68, 0.56, 0.003);
    noiseEnv(out, 'lowpass', 1150, 160, 0.9, t, 0.62, 0.42, 0.004, true);
    noiseEnv(out, 'bandpass', 2800, 750, 1.3, t + 0.015, 0.30, 0.24, 0.005);
    if (o && o.v === 'confetti') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => fmBell(out, f * 2, 2.0, 0.9, t + 0.04 + i * 0.025, 0.28, 0.05));
    }
  },

  crash: () => {
    if (!canPlay('crash', 50)) return;
    const t = AC.currentTime, out = sfxOut(0.42);
    oscEnv(out, 'sine', 115, 36, t, 0.32, 0.36, 0.003);
    for (let i = 0; i < 3; i++) {
      noiseEnv(out, 'bandpass', audioRand(700, 2100), 380, 1.6, t + i * 0.045, 0.18, 0.22 * (1 - i * 0.22), 0.004, true);
    }
  },

  fuse: () => {
    if (!canPlay('fuse', 80)) return;
    const t = AC.currentTime, out = sfxOut(0.2);
    noiseEnv(out, 'bandpass', 3800, 6500, 2.2, t, 0.85, 0.09, 0.03);
    for (let i = 0; i < 5; i++) {
      fmBell(out, 1100 + i * 160, 1.5, 0.8, t + i * 0.16, 0.07, 0.045);
    }
  },

  creak: () => {
    if (!canPlay('creak', 80)) return;
    const t = AC.currentTime, out = sfxOut(0.35);
    oscEnv(out, 'sawtooth', 260, 135, t, 0.22, 0.07, 0.01);
    // Falling whistle down to the crush!
    oscEnv(out, 'sine', 1250, 320, t + 0.14, 0.56, 0.08, 0.04);
    noiseEnv(out, 'bandpass', 1800, 900, 2.0, t, 0.18, 0.10, 0.005);
  },

  buzz: () => {
    if (!canPlay('buzz', 90)) return;
    const t = AC.currentTime, out = sfxOut(0.18);
    oscEnv(out, 'sawtooth', 215, 248, t, 0.36, 0.038, 0.03);
    oscEnv(out, 'sawtooth', 229, 206, t, 0.36, 0.034, 0.03);
  },

  imbue: (o) => {
    if (!canPlay('imbue', 100)) return;
    const t = AC.currentTime, out = sfxOut(0.5), e = o && o.e;
    noiseEnv(out, 'bandpass', 380, 3200, 2.0, t, 0.48, 0.16, 0.08);
    const notes = e === 'ice' ? [659.25, 987.77, 1318.5, 1975.5]
      : e === 'spark' ? [587.33, 880, 1174.66, 1760]
      : [440, 554.37, 659.25, 880];
    notes.forEach((f, i) => fmBell(out, f, e === 'ice' ? 2.82 : 2.0, 1.1, t + i * 0.05, 0.42, 0.07));
  },

  click: () => {
    if (!canPlay('click', 22)) return;
    const t = AC.currentTime, out = sfxOut(0.10), p = audioRand(0.95, 1.06);
    // Warm wooden sketchbook tap
    oscEnv(out, 'triangle', 540 * p, 240 * p, t, 0.042, 0.085, 0.002);
    noiseEnv(out, 'bandpass', 2200 * p, 1100, 2.0, t, 0.028, 0.055, 0.002);
  },

  craft: () => {
    if (!canPlay('craft', 80)) return;
    const t = AC.currentTime, out = sfxOut(0.45);
    // Blacksmith anvil ring + ember hiss + chord
    fmBell(out, 1396.9, 2.76, 2.2, t, 0.55, 0.13);
    fmBell(out, 2093.0, 1.41, 1.5, t + 0.005, 0.42, 0.08);
    oscEnv(out, 'sine', 180, 58, t, 0.16, 0.28, 0.002);
    noiseEnv(out, 'highpass', 2600, 4800, 1.0, t + 0.04, 0.28, 0.09, 0.02);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => fmBell(out, f, 2.0, 0.6, t + 0.08 + i * 0.055, 0.36, 0.055));
  },

  reforge: () => {
    if (!canPlay('reforge', 150)) return;
    const t = AC.currentTime, out = sfxOut(0.6);
    fmBell(out, 1567.98, 2.76, 2.4, t, 0.7, 0.14);
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
      fmBell(out, f, 2.0, 0.9, t + 0.08 + i * 0.075, 0.65, 0.075);
    });
  },

  gift: () => {
    if (!canPlay('gift', 200)) return;
    const t = AC.currentTime, out = sfxOut(0.6);
    // Christmas celesta & sleigh-bell sparkle fanfare!
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0].forEach((f, i) => {
      fmBell(out, f, 3.01, 1.2, t + i * 0.085, 0.75, 0.08);
    });
    noiseEnv(out, 'bandpass', 5500, 7500, 3.5, t + 0.05, 0.45, 0.06, 0.04);
  },

  win: () => {
    if (!canPlay('win', 120)) return;
    const t = AC.currentTime, out = sfxOut(0.55);
    // Heroic timpani + brass + bell victory fanfare
    oscEnv(out, 'sine', 110, 48, t, 0.45, 0.34, 0.005);
    oscEnv(out, 'sine', 146.8, 65.4, t + 0.42, 0.65, 0.36, 0.005);
    const notes = [
      { f: 523.25, at: 0.00, d: 0.20 },
      { f: 659.25, at: 0.14, d: 0.20 },
      { f: 783.99, at: 0.28, d: 0.20 },
      { f: 1046.5, at: 0.42, d: 0.85 },
    ];
    notes.forEach(n => {
      fmBell(out, n.f, 2.0, 0.85, t + n.at, n.d + 0.15, 0.085);
      [-0.004, 0.004].forEach(det => {
        const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
        o.type = 'sawtooth'; o.frequency.value = n.f * 0.5 * (1 + det);
        lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t + n.at); lp.frequency.exponentialRampToValueAtTime(2400, t + n.at + 0.05);
        g.gain.setValueAtTime(0.0001, t + n.at); g.gain.linearRampToValueAtTime(0.055, t + n.at + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + n.at + n.d);
        o.connect(lp); lp.connect(g); g.connect(out);
        o.start(t + n.at); o.stop(t + n.at + n.d + 0.03);
      });
    });
  },

  die: () => {
    if (!canPlay('die', 200)) return;
    const t = AC.currentTime, out = sfxOut(0.6);
    oscEnv(out, 'sine', 92, 34, t, 0.9, 0.34, 0.01);
    [293.66, 261.63, 233.08, 220.0].forEach((f, i) => {
      const at = t + i * 0.26;
      const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
      o.type = 'sawtooth'; o.frequency.value = f * 0.5;
      lp.type = 'lowpass'; lp.frequency.value = 620 - i * 80;
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.07, at + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.58);
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(at); o.stop(at + 0.62);
    });
  },
};

function sfx(name, opts) {
  try {
    if (!AC) audioInit();
    if (SFX[name]) SFX[name](opts);
  } catch (e) {}
}

// ---------------- EXPRESSIVE MONSTER VOICES ----------------
const VOICES = {
  beast:   { w: 'sawtooth', f: 145, f1: [380, 680, 320], f2: [950, 1480, 860], growl: 36, noise: 0.26, sub: 0.45, dist: 1, pat: 'roar' },
  deep:    { w: 'sawtooth', f: 74,  f1: [260, 440, 220], f2: [680, 1020, 600], growl: 25, noise: 0.32, sub: 0.65, dist: 1, pat: 'roar' },
  dragon:  { w: 'sawtooth', f: 58,  f1: [250, 620, 210], f2: [640, 1160, 540], growl: 21, noise: 0.55, sub: 0.75, dist: 1, pat: 'roar' },
  squeak:  { w: 'square',   f: 700, f1: [1400, 2100, 1500], f2: [2800, 3600, 2900], growl: 0, noise: 0.06, sub: 0, dist: 0, pat: 'chitter' },
  ghost:   { w: 'sine',     f: 330, f1: [720, 1120, 680], f2: [1450, 2100, 1380], growl: 6, noise: 0.42, sub: 0.15, dist: 0, pat: 'wail' },
  giggle:  { w: 'triangle', f: 410, f1: [860, 1280, 900], f2: [2100, 2800, 2200], growl: 0, noise: 0.04, sub: 0, dist: 0, pat: 'laugh' },
  witch:   { w: 'sawtooth', f: 255, f1: [720, 1180, 780], f2: [1850, 2550, 1900], growl: 9, noise: 0.14, sub: 0.1, dist: 0, pat: 'laugh' },
  machine: { w: 'square',   f: 215, f1: [950, 1550, 950], f2: [2200, 3100, 2200], growl: 0, noise: 0.08, sub: 0.25, dist: 0, pat: 'bleep' },
  goo:     { w: 'sine',     f: 112, f1: [310, 640, 360], f2: [740, 1350, 820], growl: 13, noise: 0.18, sub: 0.4, dist: 0, pat: 'blub' },
  hiss:    { w: 'sawtooth', f: 205, f1: [2100, 3200, 2400], f2: [4400, 6200, 4800], growl: 52, noise: 0.85, sub: 0, dist: 0, pat: 'hiss' },
  human:   { w: 'sawtooth', f: 136, f1: [620, 860, 660], f2: [1120, 1460, 1180], growl: 0, noise: 0.05, sub: 0.25, dist: 0, pat: 'laugh' },
};

function voiceSyl(destOut, t0, d, fA, fB, fC, v, vol, vib = 0.03) {
  const out = AC.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.045, d * 0.22));
  out.gain.setValueAtTime(vol * 0.92, t0 + d * 0.68);
  out.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  if (v.dist && AUDIO.distLight) {
    const sh = makeWaveShaper(AC, 16);
    out.connect(sh); sh.connect(destOut);
  } else {
    out.connect(destOut);
  }

  const f1 = AC.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 3.2;
  f1.frequency.setValueAtTime(v.f1[0], t0);
  f1.frequency.exponentialRampToValueAtTime(v.f1[1], t0 + d * 0.35);
  f1.frequency.exponentialRampToValueAtTime(v.f1[2], t0 + d);

  const f2 = AC.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 4.2;
  f2.frequency.setValueAtTime(v.f2[0], t0);
  f2.frequency.exponentialRampToValueAtTime(v.f2[1], t0 + d * 0.35);
  f2.frequency.exponentialRampToValueAtTime(v.f2[2], t0 + d);

  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = v.f2[1] * 1.4;
  const lpg = AC.createGain(); lpg.gain.value = 0.38;

  const mix = AC.createGain(); mix.gain.value = 1;
  mix.connect(f1); mix.connect(f2); mix.connect(lp);
  f1.connect(out); f2.connect(out); lp.connect(lpg); lpg.connect(out);

  let am = mix;
  if (v.growl) {
    const g = AC.createGain(); g.gain.value = 0.65; g.connect(mix);
    const lfo = AC.createOscillator(), lg = AC.createGain();
    lfo.frequency.setValueAtTime(v.growl * audioRand(0.85, 1.18), t0);
    lfo.frequency.linearRampToValueAtTime(v.growl * 0.72, t0 + d);
    lg.gain.value = 0.38;
    lfo.connect(lg); lg.connect(g.gain);
    lfo.start(t0); lfo.stop(t0 + d + 0.05);
    am = g;
  }

  [1, 1.013].forEach((det, idx) => {
    const o = AC.createOscillator(); o.type = v.w;
    o.frequency.setValueAtTime(Math.max(22, fA * det), t0);
    o.frequency.linearRampToValueAtTime(Math.max(22, fB * det), t0 + d * 0.3);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, fC * det), t0 + d);
    if (idx === 0 && vib > 0) {
      const vl = AC.createOscillator(), vg = AC.createGain();
      vl.frequency.value = 5.6; vg.gain.value = fA * vib;
      vl.connect(vg); vg.connect(o.frequency);
      vl.start(t0); vl.stop(t0 + d + 0.05);
    }
    const og = AC.createGain(); og.gain.value = idx === 0 ? 0.85 : 0.5;
    o.connect(og); og.connect(am);
    o.start(t0); o.stop(t0 + d + 0.05);
  });

  if (v.sub) {
    const sub = AC.createOscillator(), sg = AC.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(Math.max(24, fA * 0.5), t0);
    sub.frequency.exponentialRampToValueAtTime(Math.max(20, fC * 0.5), t0 + d);
    sg.gain.value = v.sub * 0.55;
    sub.connect(sg); sg.connect(out);
    sub.start(t0); sub.stop(t0 + d + 0.05);
  }

  if (v.noise) {
    const n = AC.createBufferSource(), ng = AC.createGain();
    n.buffer = noiseBuf(); ng.gain.value = v.noise * 0.75;
    n.connect(ng); ng.connect(am);
    n.start(t0, Math.random()); n.stop(t0 + d + 0.05);
  }
}

function bossVoice(b, kind) {
  if (!canPlay('voice_' + kind, kind === 'hurt' ? 120 : 60) || !b) return;
  try {
    const v = VOICES[b.voiceType] || VOICES.beast, now = AC.currentTime + 0.01;
    const D = { intro: 1.35, rage: 1.4, death: 1.9, grunt: 0.32, hurt: 0.18 }[kind] || 0.3;
    b.voiceT = D;
    let f = v.f * (b.pitch || 1);
    const vol = { intro: 0.25, rage: 0.28, death: 0.25, grunt: 0.13, hurt: 0.12 }[kind] || 0.16;
    if (kind === 'hurt') f *= 1.45;

    // Special signature for Uncle Hydra (h6): Three heads vocalizing in stereo harmony!
    if (b.id === 'h6') {
      const heads = [
        { dx: -260, pm: 0.89, dt: 0.00 },
        { dx: 0,    pm: 1.00, dt: 0.05 },
        { dx: 260,  pm: 1.14, dt: 0.10 },
      ];
      heads.forEach(hd => {
        const hout = sfxOut(0.45, aclamp(b.x + hd.dx, 0, 1200));
        const hf = f * hd.pm, tStart = now + hd.dt;
        if (kind === 'hurt') {
          voiceSyl(hout, tStart, D, hf * 1.35, hf * 1.55, hf * 1.1, v, vol * 0.6);
        } else {
          const n = kind === 'grunt' ? 2 : kind === 'death' ? 6 : 5;
          for (let i = 0; i < n; i++) {
            const p = hf * 1.2 * Math.pow(kind === 'death' ? 0.85 : 0.95, i);
            voiceSyl(hout, tStart + i * 0.17, 0.13, p * 1.12, p, p * 0.84, v, vol * 0.52, 0.02);
          }
        }
      });
      return;
    }

    const wet = (v.pat === 'wail' || b.voiceType === 'witch' || b.voiceType === 'dragon') ? 0.55 : 0.38;
    const out = sfxOut(wet, b.x);

    switch (v.pat) {
      case 'roar':
        if (kind === 'death') voiceSyl(out, now, D, f * 1.2, f * 0.95, f * 0.32, v, vol);
        else if (kind === 'hurt') voiceSyl(out, now, D, f * 1.3, f * 1.6, f * 1.05, v, vol);
        else voiceSyl(out, now, D, f * 0.82, f * 1.38, f * 0.56, v, vol);
        break;
      case 'chitter': {
        const n = Math.max(2, Math.round(D / 0.075));
        for (let i = 0; i < n; i++) {
          const p = f * audioRand(0.82, 1.48) * (kind === 'death' ? 1 - (i / n) * 0.6 : 1);
          voiceSyl(out, now + i * 0.075, 0.06, p, p * 1.22, p * 0.88, v, vol * 0.72, 0);
        }
        break;
      }
      case 'wail': {
        const k = kind === 'death' ? 0.38 : kind === 'hurt' ? 1.5 : 1.28;
        voiceSyl(out, now, D, f, f * k, f * (kind === 'death' ? 0.28 : 0.78), v, vol, 0.11);
        // Ghostly shimmer fifth
        if (kind !== 'hurt') voiceSyl(out, now + 0.06, D * 0.85, f * 1.5, f * 1.5 * k, f * 1.2, v, vol * 0.32, 0.09);
        break;
      }
      case 'laugh': {
        if (kind === 'hurt') { voiceSyl(out, now, D, f * 1.4, f * 1.6, f * 1.15, v, vol); break; }
        const n = kind === 'grunt' ? 2 : kind === 'death' ? 6 : 5;
        for (let i = 0; i < n; i++) {
          const p = f * 1.25 * Math.pow(kind === 'death' ? 0.85 : 0.94, i);
          voiceSyl(out, now + i * 0.18, 0.13, p * 1.12, p, p * 0.84, v, vol * 0.82, 0.025);
        }
        break;
      }
      case 'bleep': {
        const n = Math.max(2, Math.round(D / 0.085)), steps = [1, 1.5, 2, 1.25, 0.75, 1.33];
        const seed = b.id ? b.id.charCodeAt(b.id.length - 1) : 3;
        for (let i = 0; i < n; i++) {
          const p = f * (kind === 'death' ? 2 - (i / n) * 1.6 : steps[(i + seed) % steps.length]);
          voiceSyl(out, now + i * 0.085, 0.068, p, p * 1.02, p, v, vol * 0.65, 0);
        }
        break;
      }
      case 'blub': {
        const n = Math.max(2, Math.round(D / 0.115));
        for (let i = 0; i < n; i++) {
          const p = f * audioRand(0.8, 1.32);
          voiceSyl(out, now + i * 0.115 + audioRand(0, 0.025), 0.10, p, p * 2.25, p * 1.65, v, vol * 0.85, 0);
        }
        break;
      }
      case 'hiss':
        voiceSyl(out, now, D, f, f * 1.12, f * (kind === 'death' ? 0.38 : 0.88), v, vol * 0.82, 0.02);
        break;
    }
  } catch (e) {}
}

// ---------------- FIGHT INTRO STING ----------------
const REGION_ROOT_MIDI = [38, 36, 43, 40, 42, 36]; // D2, C2, G2, E2, F#2, C2

function introSting(region, bossDef) {
  if (!canPlay('introSting', 200)) return;
  try {
    setAudioSpace(spaceForRegion(region, bossDef));
    const t = AC.currentTime + 0.02;
    const rootM = bossDef && bossDef.final ? 35 : (REGION_ROOT_MIDI[region] || 38);
    const root = midiFreq(rootM) * 2;
    const isMajorBoss = !!(bossDef && bossDef.boss);
    const out = sfxOut(0.55);

    // Orchestral timpani double-boom
    oscEnv(out, 'sine', 105, 36, t, 1.0, 0.44, 0.005);
    if (isMajorBoss) oscEnv(out, 'sine', 86, 30, t + 0.24, 1.15, 0.38, 0.005);

    // Dramatic brass swell
    const intervals = bossDef && bossDef.final ? [0, 3, 6, 11, 12] : [0, 3, 7, 12];
    intervals.forEach(semi => {
      const freq = root * Math.pow(2, semi / 12) * audioRand(0.996, 1.004);
      const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(220, t);
      lp.frequency.exponentialRampToValueAtTime(isMajorBoss ? 2800 : 2100, t + 0.34);
      lp.frequency.exponentialRampToValueAtTime(380, t + 1.75);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(isMajorBoss ? 0.068 : 0.055, t + 0.07);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(t); o.stop(t + 1.9);
    });

    // Tubular doom bell for region bosses & final boss
    if (isMajorBoss) {
      fmBell(out, root * 2, 2.76, 1.9, t + 0.02, 1.8, 0.10);
    }
  } catch (e) {}
}

// ---------------- COMPOSED ADAPTIVE MUSIC ENGINE ----------------
function mOut() { return MUS.gain; }

function instBrass(t, freq, dur, vol, bright = 1600, atk = 0.028) {
  const dest = mOut(); if (!dest) return;
  [-0.0045, 0.0045].forEach(det => {
    const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq * (1 + det);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.max(120, bright * 0.35), t);
    lp.frequency.exponentialRampToValueAtTime(bright, t + Math.min(atk * 1.5, dur * 0.5));
    lp.frequency.exponentialRampToValueAtTime(Math.max(120, bright * 0.45), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.04);
  });
}

function instPad(t, freq, dur, vol, bright = 900, type = 'sawtooth') {
  const dest = mOut(); if (!dest) return;
  [-0.006, 0.006].forEach(det => {
    const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
    o.type = type; o.frequency.value = freq * (1 + det);
    lp.type = 'lowpass'; lp.frequency.value = bright;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.22, dur * 0.3));
    g.gain.setValueAtTime(vol * 0.85, t + dur * 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  });
}

function instBell(t, freq, dur, vol, ratio = 3.01, index = 1.2) {
  const dest = mOut(); if (!dest) return;
  fmBell(dest, freq, ratio, index, t, dur, vol);
}

function instPluck(t, freq, dur, vol, bright = 1800) {
  const dest = mOut(); if (!dest) return;
  const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
  o.type = 'triangle'; o.frequency.value = freq;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(bright, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.3), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.03);
}

function instFlute(t, freq, dur, vol) {
  const dest = mOut(); if (!dest) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'triangle'; o.frequency.value = freq;
  const vib = AC.createOscillator(), vg = AC.createGain();
  vib.frequency.value = 5.4; vg.gain.value = freq * 0.012;
  vib.connect(vg); vg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.035);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); vib.start(t);
  o.stop(t + dur + 0.04); vib.stop(t + dur + 0.04);
}

function instOrgan(t, freq, dur, vol) {
  const dest = mOut(); if (!dest) return;
  [1, 2, 3].forEach((h, i) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = i === 1 ? 'triangle' : 'sine';
    o.frequency.value = freq * h;
    const v = vol / (i + 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.025);
    g.gain.setValueAtTime(v * 0.9, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.04);
  });
}

function instTimp(t, freq, vol = 0.28) {
  const dest = mOut(); if (!dest) return;
  oscEnv(dest, 'sine', freq * 1.5, freq * 0.74, t, 0.34, vol, 0.004);
}

function instPerc(t, dur, vol, bpFreq, Q = 1.1) {
  const dest = mOut(); if (!dest) return;
  noiseEnv(dest, 'bandpass', bpFreq, bpFreq * 0.85, Q, t, dur, vol, 0.002);
}

// Composed themes (64-step 4-bar loops in 4/4, or 48-step 4-bar loops in 3/4 waltz)
const BATTLE_SCORES = {
  // 0: The Dark Dungeon — D Harmonic Minor (Dm | Bb | Gm | A7)
  0: {
    bpm: 112, stepsPerBar: 16, leadStyle: 'brass',
    chords: [
      { bass: 38, pad: [50, 53, 57] },
      { bass: 34, pad: [46, 50, 53] },
      { bass: 31, pad: [43, 46, 50] },
      { bass: 33, pad: [45, 49, 52] },
    ],
    melA: { 0: 62, 3: 65, 6: 69, 8: 70, 12: 69, 14: 65, 16: 65, 19: 62, 22: 58, 24: 57, 32: 67, 35: 70, 38: 74, 40: 73, 44: 69, 48: 73, 50: 74, 52: 76, 56: 69 },
    melB: { 0: 74, 4: 73, 6: 74, 8: 77, 12: 74, 16: 70, 20: 69, 24: 65, 28: 62, 32: 67, 36: 70, 40: 69, 44: 67, 48: 69, 52: 64, 56: 62 },
  },
  // 1: The Haunted Toybox — C Minor Waltz (Cm | Ab | F#dim7 | G7)
  1: {
    bpm: 120, stepsPerBar: 12, leadStyle: 'celesta',
    chords: [
      { bass: 36, pad: [60, 63, 67] },
      { bass: 32, pad: [56, 60, 63] },
      { bass: 30, pad: [54, 60, 63] },
      { bass: 31, pad: [55, 59, 62] },
    ],
    melA: { 0: 72, 2: 75, 4: 79, 6: 78, 8: 79, 10: 75, 12: 72, 15: 68, 18: 67, 24: 72, 26: 75, 28: 78, 30: 80, 32: 78, 34: 75, 36: 74, 39: 71, 42: 67 },
    melB: { 0: 84, 3: 79, 6: 75, 9: 72, 12: 80, 15: 75, 18: 72, 24: 78, 26: 80, 28: 78, 30: 75, 33: 72, 36: 74, 38: 75, 40: 74, 42: 71 },
  },
  // 2: The Rotten Swamp — G Dorian / Crooked Groove (Gm | Cm | Eb | D7)
  2: {
    bpm: 100, stepsPerBar: 16, leadStyle: 'marimba',
    chords: [
      { bass: 43, pad: [55, 58, 62] },
      { bass: 36, pad: [48, 51, 55] },
      { bass: 39, pad: [51, 55, 58] },
      { bass: 38, pad: [50, 54, 57] },
    ],
    melA: { 0: 67, 2: 70, 6: 74, 8: 73, 10: 74, 14: 70, 16: 72, 19: 67, 22: 63, 26: 62, 32: 67, 34: 70, 38: 75, 42: 74, 48: 78, 51: 74, 54: 70, 58: 66 },
    melB: { 0: 79, 3: 74, 6: 70, 10: 67, 16: 75, 18: 74, 20: 72, 24: 67, 32: 70, 35: 74, 38: 79, 42: 75, 48: 74, 52: 70, 56: 66 },
  },
  // 3: The Moonlit Forest — E Aeolian Folk Gallop (Em | C | G | B7)
  3: {
    bpm: 122, stepsPerBar: 16, leadStyle: 'flute',
    chords: [
      { bass: 40, pad: [52, 55, 59] },
      { bass: 36, pad: [48, 52, 55] },
      { bass: 43, pad: [55, 59, 62] },
      { bass: 35, pad: [47, 51, 54] },
    ],
    melA: { 0: 64, 2: 67, 4: 71, 8: 74, 12: 71, 14: 67, 16: 72, 20: 71, 22: 67, 24: 64, 32: 67, 34: 71, 36: 74, 40: 76, 44: 74, 48: 71, 52: 75, 56: 71 },
    melB: { 0: 76, 4: 79, 6: 76, 8: 74, 12: 71, 16: 72, 18: 74, 20: 76, 24: 71, 32: 74, 36: 71, 40: 67, 44: 64, 48: 66, 50: 67, 52: 71, 56: 75 },
  },
  // 4: The Tentacle Depths — F# Phrygian/Minor Abyssal (F#m | G | Em | C#7)
  4: {
    bpm: 96, stepsPerBar: 16, leadStyle: 'abyss',
    chords: [
      { bass: 42, pad: [54, 57, 61] },
      { bass: 43, pad: [55, 59, 62] },
      { bass: 40, pad: [52, 55, 59] },
      { bass: 37, pad: [49, 53, 56] },
    ],
    melA: { 0: 66, 6: 69, 8: 73, 14: 74, 16: 71, 22: 67, 26: 64, 32: 64, 38: 67, 40: 71, 48: 68, 52: 71, 56: 73 },
    melB: { 0: 78, 4: 73, 8: 69, 12: 66, 16: 79, 20: 74, 24: 71, 32: 76, 36: 71, 40: 67, 48: 73, 52: 68, 56: 65 },
  },
  // 5: The Nightmare Halls — C Phrygian Dominant Gothic (Cm | Db | Bbm | G7)
  5: {
    bpm: 128, stepsPerBar: 16, leadStyle: 'organ',
    chords: [
      { bass: 36, pad: [48, 51, 55] },
      { bass: 37, pad: [49, 53, 56] },
      { bass: 34, pad: [46, 49, 53] },
      { bass: 31, pad: [43, 47, 50] },
    ],
    melA: { 0: 72, 2: 73, 4: 72, 6: 67, 8: 68, 12: 67, 16: 65, 19: 68, 22: 73, 26: 72, 32: 70, 35: 73, 38: 77, 42: 73, 48: 71, 50: 72, 52: 74, 56: 67 },
    melB: { 0: 79, 4: 77, 6: 75, 8: 73, 12: 72, 16: 73, 20: 77, 24: 80, 32: 77, 36: 73, 40: 70, 44: 68, 48: 67, 52: 71, 56: 74 },
  },
  // Final Boss: The Ink Witch (m39) — B Minor Grand Sketchbook Showdown (Bm | G | Em | F#7)
  final: {
    bpm: 134, stepsPerBar: 16, leadStyle: 'final',
    chords: [
      { bass: 35, pad: [47, 50, 54] },
      { bass: 43, pad: [55, 59, 62] },
      { bass: 40, pad: [52, 55, 59] },
      { bass: 42, pad: [54, 58, 61] },
    ],
    melA: { 0: 71, 2: 74, 4: 78, 6: 79, 8: 78, 12: 74, 16: 79, 18: 78, 20: 74, 24: 71, 32: 76, 35: 79, 38: 83, 42: 79, 48: 78, 50: 76, 52: 78, 56: 82 },
    melB: { 0: 83, 3: 78, 6: 74, 8: 71, 12: 74, 16: 83, 19: 79, 22: 74, 26: 71, 32: 76, 34: 79, 36: 83, 40: 86, 44: 83, 48: 82, 52: 78, 56: 73 },
  },
};

function musicStart(modeOrRegion, bossDef = null) {
  const wantMode = (typeof modeOrRegion === 'string') ? modeOrRegion : 'battle';
  const wantRegion = (typeof modeOrRegion === 'number') ? modeOrRegion : 0;

  // Keep seamless ambient loop if switching between map / title / intro / settings
  if (MUS.timer && wantMode !== 'battle' && MUS.mode === wantMode) return;

  musicStop(wantMode === 'battle' ? 0.35 : 0.6);
  if (!AC || !AUDIO.ready || typeof SAVE === 'undefined' || !SAVE.sound || SAVE.music === false) {
    MUS.mode = wantMode; MUS.region = wantRegion; MUS.bossDef = bossDef;
    return;
  }

  setAudioSpace(wantMode === 'battle' ? spaceForRegion(wantRegion, bossDef) : 'room');
  if (AUDIO.musFilter) AUDIO.musFilter.frequency.setValueAtTime(16000, AC.currentTime);

  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, AC.currentTime);
  g.gain.linearRampToValueAtTime(wantMode === 'battle' ? 1.0 : 0.65, AC.currentTime + (wantMode === 'battle' ? 1.8 : 1.2));
  g.connect(AUDIO.musFilter);

  MUS.gain = g;
  MUS.mode = wantMode;
  MUS.region = wantRegion;
  MUS.bossDef = bossDef;
  MUS.step = 0;
  MUS.next = AC.currentTime + (wantMode === 'battle' ? 1.35 : 0.12);
  MUS.timer = setInterval(musicTick, 35);
}

function musicStop(fadeSec = 0.65) {
  if (MUS.timer) { clearInterval(MUS.timer); MUS.timer = null; }
  if (MUS.gain && AC) {
    const g = MUS.gain;
    try {
      g.gain.cancelScheduledValues(AC.currentTime);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), AC.currentTime);
      g.gain.linearRampToValueAtTime(0.0001, AC.currentTime + fadeSec);
    } catch (e) {}
    setTimeout(() => { try { g.disconnect(); } catch (e) {} }, Math.ceil(fadeSec * 1000) + 250);
  }
  MUS.gain = null;
}

function musicPause(paused) {
  if (!AC || !AUDIO.ready) return;
  const now = AC.currentTime;
  if (MUS.gain) MUS.gain.gain.setTargetAtTime(paused ? 0.28 : 1.0, now, 0.08);
  if (AUDIO.musFilter) AUDIO.musFilter.frequency.setTargetAtTime(paused ? 580 : 16000, now, 0.08);
}

function syncAudioSettings() {
  if (!AC) audioInit();
  if (!AUDIO.ready) return;
  if (!SAVE.sound || SAVE.music === false) {
    musicStop(0.2);
  } else if (!MUS.timer) {
    const onScreen = id => { const el = document.getElementById(id); return el && el.classList.contains('on'); };
    if (typeof F !== 'undefined' && F && !F.over) musicStart(F.b.def.region, F.b.def);
    else if (onScreen('forge')) musicStart('forge');
    else musicStart('map');
  }
}

function playBattleLead(style, t, mNote, dur, p2, isBoss) {
  const f = midiFreq(mNote);
  switch (style) {
    case 'brass':
      instBrass(t, f, dur, 0.052, p2 ? 2500 : 1850, 0.02);
      if (p2 || isBoss) instBell(t, f * 2, dur * 0.85, p2 ? 0.036 : 0.022, 2.0, 0.7);
      break;
    case 'celesta':
      instBell(t, f, dur * 1.15, 0.075, 3.01, 1.3);
      if (p2) instBrass(t, f * 0.5, dur * 0.7, 0.032, 2100, 0.012);
      break;
    case 'marimba':
      instBell(t, f, dur * 0.7, 0.08, 4.0, 0.9);
      instPluck(t, f * 0.5, dur * 0.8, 0.05, 1100);
      if (p2) instBrass(t, f, dur * 0.7, 0.035, 1900, 0.015);
      break;
    case 'flute':
      instFlute(t, f, dur * 0.95, 0.068);
      if (p2 || isBoss) instPluck(t, f * 2, dur * 0.7, 0.038, 2800);
      break;
    case 'abyss':
      instBell(t, f, dur * 1.3, 0.062, 2.0, 1.5);
      instBrass(t, f * 0.5, dur * 1.1, 0.042, p2 ? 1700 : 1100, 0.05);
      break;
    case 'organ':
      instOrgan(t, f, dur * 0.95, 0.048);
      if (p2) instBrass(t, f, dur * 0.85, 0.04, 2400, 0.02);
      break;
    case 'final':
      instOrgan(t, f, dur * 0.95, 0.045);
      instBrass(t, f, dur * 0.9, 0.045, p2 ? 2800 : 2100, 0.02);
      instBell(t, f * 2, dur * 0.9, 0.042, 3.0, 1.1);
      break;
  }
}

function tickMapMusic() {
  // Cozy, mysterious Sketchbook theme in D Dorian / Minor (90 BPM)
  const st = 60 / 90 / 2; // 8th-note steps
  const chords = [
    [50, 57, 62, 65], // Dm
    [48, 55, 60, 64], // C
    [46, 53, 58, 62], // Bbmaj7
    [45, 52, 57, 61], // A
  ];
  const mel = { 0: 74, 3: 72, 4: 69, 8: 72, 11: 69, 12: 67, 16: 70, 19: 69, 20: 65, 24: 69, 28: 64 };
  while (MUS.next < AC.currentTime + 0.14) {
    const s = MUS.step % 32, bar = Math.floor(s / 8), bStep = s % 8, t = MUS.next;
    const ch = chords[bar];
    // Warm storybook harp arpeggio
    instPluck(t, midiFreq(ch[bStep % 4]), st * 2.2, 0.048, 1500);
    if (bStep === 0) instPad(t, midiFreq(ch[0] - 12), st * 7.8, 0.024, 520, 'triangle');
    if (mel[s] != null) instBell(t, midiFreq(mel[s]), st * 3.2, 0.038, 2.0, 0.55);
    MUS.next += st;
    MUS.step++;
  }
}

function tickForgeMusic() {
  // Warm blacksmith hearth groove in A Dorian (98 BPM)
  const st = 60 / 98 / 2;
  const chords = [
    [45, 52, 57, 60], // Am
    [43, 50, 55, 59], // G
    [41, 48, 53, 57], // F
    [40, 47, 52, 55], // Em
  ];
  const mel = { 0: 69, 2: 72, 4: 76, 6: 74, 8: 71, 12: 67, 16: 69, 19: 72, 22: 69, 24: 64 };
  while (MUS.next < AC.currentTime + 0.14) {
    const s = MUS.step % 32, bar = Math.floor(s / 8), bStep = s % 8, t = MUS.next;
    const ch = chords[bar];
    if (bStep === 0 || bStep === 4) instPluck(t, midiFreq(ch[0]), st * 2.4, 0.06, 950);
    instPluck(t, midiFreq(ch[(bStep % 3) + 1]), st * 1.5, 0.036, 1700);
    // Gentle distant anvil ping on beat 3 of bars 1 & 3
    if (bStep === 4 && bar % 2 === 0) instBell(t, 1760, 0.35, 0.022, 2.76, 1.6);
    if (mel[s] != null) instFlute(t, midiFreq(mel[s]), st * 2.4, 0.038);
    MUS.next += st;
    MUS.step++;
  }
}

function musicTick() {
  if (!MUS.gain || !AC) return;
  if (MUS.mode === 'map') return tickMapMusic();
  if (MUS.mode === 'forge') return tickForgeMusic();

  // Battle music
  if (typeof F === 'undefined' || !F || F.paused || F.over) {
    MUS.next = Math.max(MUS.next, AC.currentTime + 0.06);
    return;
  }

  const b = F.b, def = b.def || MUS.bossDef || {};
  const score = def.final ? BATTLE_SCORES.final : (BATTLE_SCORES[MUS.region] || BATTLE_SCORES[0]);
  const p2 = !!b.p2, isBoss = !!def.boss, stag = b.stagger > 0;
  const spb = score.stepsPerBar;
  const totalSteps = spb * 4;
  const bpm = score.bpm * (p2 ? 1.14 : 1) * (isBoss && !def.final ? 1.04 : 1);
  const st = 60 / bpm / (spb === 12 ? 3 : 4);

  // Momentary duck during stagger poise-break
  if (AUDIO.musFilter) {
    const duck = AC.currentTime < MUS.duckUntil || stag;
    AUDIO.musFilter.frequency.setTargetAtTime(duck ? 950 : 16000, AC.currentTime, 0.06);
  }

  while (MUS.next < AC.currentTime + 0.12) {
    const cycle = Math.floor(MUS.step / totalSteps);
    const s = MUS.step % totalSteps;
    const bar = Math.floor(s / spb), bStep = s % spb, t = MUS.next;
    const ch = score.chords[bar];
    const useB = (cycle % 2 === 1);
    const mel = useB ? score.melB : score.melA;

    // 1. Sustained choir/string harmonic bed at bar start
    if (bStep === 0) {
      ch.pad.forEach(n => instPad(t, midiFreq(n), st * (spb - 0.5), p2 ? 0.028 : 0.020, p2 ? 1150 : 720));
      if (isBoss && bar % 2 === 0) {
        instBell(t, midiFreq(ch.bass + 24), st * 8, 0.032, 2.76, 1.5);
      }
    }

    // 2. Bass / Cello Ostinato + Percussion
    if (spb === 12) {
      // 3/4 Waltz feel (Haunted Toybox)
      if (bStep === 0) instTimp(t, midiFreq(ch.bass + 12), 0.24);
      if (bStep === 4 || bStep === 8) instPluck(t, midiFreq(ch.pad[bStep === 4 ? 0 : 1] - 12), st * 1.4, 0.055, 1100);
      if (bStep % 2 === 0) instPerc(t, 0.026, bStep % 4 === 0 ? 0.032 : 0.018, 6200, 2.0);
      if (p2 && (bStep === 4 || bStep === 8 || bStep === 11)) instPerc(t, 0.075, 0.085, 2200, 1.0);
      if ((p2 || isBoss) && bStep % 2 === 1) instBell(t, midiFreq(ch.pad[bStep % 3]), st * 2.0, 0.028, 3.01, 0.9);
    } else {
      // 4/4 Driving Boss Rush feel
      if (bStep % 2 === 0 || (p2 && bStep % 4 === 3)) {
        const oct = (bStep % 4 === 2) ? 12 : 0;
        instBrass(t, midiFreq(ch.bass + oct), st * 1.65, 0.058, p2 ? 960 : 620, 0.008);
      }
      if (MUS.region === 3 || def.final) {
        // Harp/lute arpeggio shimmer in Forest & Final Boss
        if (bStep % 2 === 0) instPluck(t, midiFreq(ch.pad[(bStep / 2) % 3] + 12), st * 1.9, 0.034, 2200);
      }
      // Timpani & War Drums
      if (bStep === 0 || bStep === 6 || bStep === 12 || (p2 && bStep === 10)) {
        instTimp(t, midiFreq(ch.bass), bStep === 0 ? 0.30 : 0.20);
      }
      // Snare / Rimshot
      if (bStep === 4 || bStep === 12 || (p2 && (bStep === 14 || bStep === 15))) {
        instPerc(t, bStep >= 14 ? 0.065 : 0.12, p2 ? 0.11 : 0.065, 2100, 0.95);
      }
      // Hi-hat / Shaker pulse
      if (bStep % 2 === 0) {
        instPerc(t, 0.03, bStep % 4 === 2 ? 0.032 : 0.016, 6800, 1.6);
      }
    }

    // 3. Lead Melody
    if (mel[s] != null) {
      playBattleLead(score.leadStyle, t, mel[s], st * 3.4, p2, isBoss);
    }

    MUS.next += st;
    MUS.step++;
  }
}
