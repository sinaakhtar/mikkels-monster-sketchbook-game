// ===== Mikkel's Monster Sketchbook — menus, save, forge =====
'use strict';
const SAVE_KEY = 'mikkel-monsters-v1';
const DEFAULT_SAVE = () => ({
  v: 1, bones: 0, beaten: {}, items: {}, crafted: {}, wlvl: { twig: 0 }, owned: { twig: true },
  equip: { weapon: 'twig', charm: null, spirit: null }, diff: 'brave', sound: true, music: true, pixelM27: true, lairSeen: 0, giftOpened: false, seenTut: false, deaths: {},
});
let SAVE = DEFAULT_SAVE();
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) SAVE = Object.assign(DEFAULT_SAVE(), s); } catch (e) {} }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }

const $ = s => document.querySelector(s);
function show(id) { document.querySelectorAll('.screen').forEach(e => e.classList.toggle('on', e.id === id)); }
function h(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

function regionUnlocked(r) { if (r === 0) return true; const boss = BOSSES.find(b => b.region === r - 1 && b.boss); return !!SAVE.beaten[boss.id]; }
function minorsBeaten(r) { return BOSSES.filter(b => b.region === r && !b.boss && SAVE.beaten[b.id]).length; }
function bossUnlocked(b) { if (!regionUnlocked(b.region)) return false; if (b.boss) return minorsBeaten(b.region) >= MINORS_TO_UNLOCK_BOSS; return true; }

function tipFor(f) {
  const k = f.lastHit, objs = f.objs || [];
  const has = kind => objs.some(o => o.k === kind && (o.k !== 'pillar' || o.hp > 0));
  if ((k === 'charge' || k === 'grab' || k === 'clones') && objs.some(o => o.k === 'pillar')) return TIPS[k] + ' Even better: stand in front of a pillar and roll away at the last second — it will CRASH!';
  if (k === 'inhale' && has('barrel')) return TIPS.inhale + ' Or hit a barrel while it\'s sucking… it\'ll swallow it! 💥';
  if (['beam', 'spray', 'wavewall', 'spiral', 'homing', 'boomerang', 'cross', 'fissure', 'lash'].includes(k) && objs.some(o => o.k === 'pillar')) return TIPS[k] + ' Hide behind a pillar — it blocks shots and beams!';
  if (k === 'slam' && has('drop')) return TIPS.slam + ' Try dropping the hanging thing on it while it stands in the shadow!';
  return TIPS[k] || TIPS.default;
}
const AURL = p => (typeof assetUrl === 'function' ? assetUrl(p) : p);
function simg(p, alt = '', cls = 'cpic') {
  const safeAlt = String(alt || '').replace(/"/g, '&quot;');
  return `<img class="${cls}" src="${AURL(p)}" data-path="${p}" onerror="window.imgErr&&window.imgErr(this)" alt="${safeAlt}">`;
}
const UI = {
  region: 0,
  gridMode: false,
  init() {
    load();
    document.body.addEventListener('click', () => audioInit(), { once: true });
    try {
      document.querySelectorAll('#title .faces img').forEach(el => {
        const s = el.getAttribute('data-path') || el.getAttribute('src');
        if (s) {
          el.setAttribute('data-path', s);
          el.onerror = function() { if (window.imgErr) window.imgErr(this); };
          el.src = AURL(s);
        }
      });
      setInterval(() => { fetch('index.html', { method: 'HEAD', cache: 'no-store' }).catch(() => {}); }, 25000);
    } catch (e) {}
    if (!SAVE.giftOpened) UI.gift(); else UI.title();
  },
  gift() {
    show('gift'); $('#giftFrom').textContent = 'from ' + GIFT_FROM;
    $('#gift').onclick = () => { audioInit(); sfx('gift'); $('#gift').classList.add('open'); setTimeout(() => { SAVE.giftOpened = true; save(); UI.title(); }, 1600); };
  },
  title() {
    show('title'); musicStart('map');
    $('#btnPlay').onclick = () => { sfx('click'); UI.map(); };
  },
  map() {
    if (F) musicStop(); F = null; show('map'); musicStart('map');
    const tabs = $('#tabs'); tabs.innerHTML = '';
    REGIONS.forEach((r, i) => {
      const un = regionUnlocked(i);
      const t = h(`<button class="tab ${i === UI.region ? 'sel' : ''} ${un ? '' : 'locked'}">${un ? '' : '🔒 '}${r.short}</button>`);
      t.onclick = () => { if (!un) return UI.toast('Beat the big boss of the last Oslo area first!'); sfx('click'); UI.region = i; UI.map(); };
      tabs.appendChild(t);
    });
    const reg = REGIONS[UI.region];
    $('#bones').textContent = SAVE.bones;
    $('#regionName').textContent = reg.name;
    const subEl = $('#regionSub'); if (subEl) subEl.textContent = reg.sub ? '📍 ' + reg.sub : '';
    const vBtn = $('#btnMapView');
    if (vBtn) {
      vBtn.textContent = UI.gridMode ? '🗺️ Oslo Map' : '🃏 Grid View';
      vBtn.onclick = () => { sfx('click'); UI.gridMode = !UI.gridMode; UI.map(); };
    }
    const osloEl = $('#osloMap'), grid = $('#cards');
    if (osloEl) osloEl.style.display = UI.gridMode ? 'none' : 'block';
    grid.style.display = UI.gridMode ? 'grid' : 'none';
    if (osloEl) osloEl.innerHTML = '';
    grid.innerHTML = '';
    const list = BOSSES.filter(b => b.region === UI.region);
    if (osloEl && !UI.gridMode) {
      const mapPath = reg.map || ('a/oslo_' + UI.region + '.jpg');
      osloEl.appendChild(h(simg(mapPath, reg.name, 'oslo-bg')));
      osloEl.appendChild(h('<div class="oslo-vignette"></div>'));
      // Draw SVG trail lines between landmarks in the region
      const minors = list.filter(b => !b.boss), mainBoss = list.find(b => b.boss);
      const lines = [];
      for (let i = 0; i < minors.length - 1; i++) {
        const s1 = (typeof OSLO_SPOTS !== 'undefined' && OSLO_SPOTS[minors[i].id]) || [20 + i * 10, 50, 'Oslo'];
        const s2 = (typeof OSLO_SPOTS !== 'undefined' && OSLO_SPOTS[minors[i + 1].id]) || [30 + i * 10, 50, 'Oslo'];
        lines.push(`<line x1="${s1[0]}" y1="${s1[1]}" x2="${s2[0]}" y2="${s2[1]}" stroke="rgba(242,210,122,0.45)" stroke-width="0.45" stroke-dasharray="1.2,1.0" />`);
      }
      if (mainBoss) {
        const bs = (typeof OSLO_SPOTS !== 'undefined' && OSLO_SPOTS[mainBoss.id]) || [50, 50, 'Oslo'];
        minors.forEach(m => {
          const ms = (typeof OSLO_SPOTS !== 'undefined' && OSLO_SPOTS[m.id]) || [30, 50, 'Oslo'];
          const beat = SAVE.beaten[m.id];
          lines.push(`<line x1="${ms[0]}" y1="${ms[1]}" x2="${bs[0]}" y2="${bs[1]}" stroke="${beat ? 'rgba(255,215,100,0.65)' : 'rgba(200,80,60,0.32)'}" stroke-width="${beat ? '0.55' : '0.35'}" stroke-dasharray="0.9,0.9" />`);
        });
      }
      const svg = h(`<svg class="oslo-paths" viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}</svg>`);
      osloEl.appendChild(svg);
    }
    list.forEach((b, idx) => {
      const un = bossUnlocked(b), beat = SAVE.beaten[b.id];
      const spot = (typeof OSLO_SPOTS !== 'undefined' && OSLO_SPOTS[b.id]) || [18 + (idx % 4) * 22, 30 + Math.floor(idx / 4) * 38, reg.short];
      const pxSup = typeof isPixelSupported === 'function' && isPixelSupported(b.id);
      const hint = b.boss && !un ? `Beat ${MINORS_TO_UNLOCK_BOSS} monsters (${minorsBeaten(b.region)}/${MINORS_TO_UNLOCK_BOSS})` : (pxSup ? '🕹️ 16-Bit Test!' : (b.start && !beat ? '⚔️ Start here!' : ''));
      const cardPath = `a/${b.id}_card.jpg`;
      if (osloEl && !UI.gridMode) {
        const pin = h(`<div class="mnode ${b.boss ? 'boss' : ''} ${un ? '' : 'locked'} ${beat ? 'beat' : ''}" style="left:${spot[0]}%;top:${spot[1]}%">
          ${hint ? `<div class="mhint">${hint}</div>` : ''}
          <div class="mport">
            ${simg(cardPath, b.name, 'cpic')}
          </div>
          ${beat ? '<div class="mstamp">FELLED</div>' : ''}${!un ? '<div class="mlock">🔒</div>' : ''}
          <div class="mlabel">
            <div class="mspot">📍 ${spot[2]}</div>
            <div class="mnm">${b.boss ? '👑 ' : ''}${b.name}</div>
            <div class="mrow"><span>💀 ${b.tier}</span><span>Weak: ${ELEM[b.weak]}</span></div>
          </div>
        </div>`);
        pin.onclick = () => { if (!un) return UI.toast(hint || 'Locked'); sfx('click'); UI.intro(b.id); };
        osloEl.appendChild(pin);
      }
      if (UI.gridMode) {
        const c = h(`<div class="card ${b.boss ? 'boss' : ''} ${un ? '' : 'locked'} ${beat ? 'beat' : ''}">
          <div class="pic">
            ${simg(cardPath, b.name, 'cpic')}
          </div>
          <div class="meta">
            <div class="spot-tag">📍 ${spot[2]}</div>
            <div class="nm">${b.boss ? '👑 ' : ''}${b.name}</div><div class="tt">${b.title}</div>
            <div class="row"><span>💀 ${b.tier}</span><span>Weak: ${ELEM[b.weak]}</span></div>
          </div>
          ${beat ? '<div class="stamp">FELLED</div>' : ''}${!un ? '<div class="lock">🔒</div>' : ''}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`);
        c.onclick = () => { if (!un) return UI.toast(hint || 'Locked'); sfx('click'); UI.intro(b.id); };
        grid.appendChild(c);
      }
    });
    $('#btnForge').onclick = () => { sfx('click'); UI.forge('weapons'); };
    $('#btnSettings').onclick = () => { sfx('click'); UI.settings(); };
    $('#btnTitle').onclick = () => { sfx('click'); UI.title(); };
  },
  intro(id) {
    const b = BOSSES.find(x => x.id === id); show('intro'); musicStart('map'); UI.introId = id;
    const spot = (typeof OSLO_SPOTS !== 'undefined' && OSLO_SPOTS[id]) || [50, 50, REGIONS[b.region].name];
    const ip = $('#introPic');
    const pxSup = typeof isPixelSupported === 'function' && isPixelSupported(id);
    const pxOn = pxSup && isPixelPref();
    if (pxOn) {
      ip.style.backgroundImage = `url(${AURL('a/m27_px_bg.webp')})`;
      ip.style.backgroundSize = 'cover';
      ip.style.imageRendering = 'pixelated';
      ip.innerHTML = `<img src="${AURL('a/m27_px.webp')}" alt="${b.name}" style="width:92%;height:92%;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 8px 0 #09070d)">`;
    } else {
      ip.style.backgroundImage = 'none';
      ip.style.imageRendering = '';
      ip.innerHTML = simg(`a/${id}_card.jpg`, b.name, 'cpic');
    }
    const pxBtn = $('#btnPixelIntro');
    if (pxBtn) {
      pxBtn.style.display = pxSup ? '' : 'none';
      if (pxSup) {
        pxBtn.textContent = pxOn ? '🕹️ 16-Bit Look: ON' : '🎨 16-Bit Look: OFF';
        pxBtn.style.borderColor = pxOn ? '#84ff7a' : '#8a8090';
        pxBtn.onclick = () => { togglePixelMode(); UI.intro(id); };
      }
    }
    $('#introName').textContent = b.name; $('#introTitle').textContent = b.title;
    const tries = SAVE.deaths[id] || 0;
    $('#introInfo').innerHTML = `
      <div>Danger: ${'💀'.repeat(b.tier)}</div>
      <div>Location: <b>📍 ${spot[2]}</b> (${REGIONS[b.region].name})${b.boss ? ' · 👑 Area Boss' : ''}</div>
      <div>Weak to: <b>${ELEM[b.weak]} ${CHARMS[b.weak].name}</b> ${SAVE.equip.charm === b.weak ? '✅ equipped!' : (SAVE.crafted[b.weak] ? '(you have it — equip it in the Forge!)' : '')}</div>
      <div>Drops: ${SAVE.beaten[id] ? b.drop.icon + ' ' + b.drop.name : '❓ ???'}</div>
      ${pxSup ? `<div class="tip" style="border-left-color:#84ff7a;background:rgba(20,55,35,0.5)">🕹️ <b>16-Bit Arcade Prototype:</b> Toggle ON/OFF here or press <b>V</b> (or tap the top badge) live mid-fight!</div>` : ''}
      ${tries ? `<div class="tip">💡 ${TIPS[SAVE.deaths[id + '_last']] || TIPS.default}</div>` : ''}
      ${lairInfo(b.region, id).length ? `<div class="lair"><b>In this lair:</b>${lairInfo(b.region, id).map(x => `<div>${x.icon} <b>${x.name}</b> — ${x.desc}</div>`).join('')}</div>` : ''}
      <div class="gear">Your gear: ${WEAPONS[SAVE.equip.weapon].icon} ${WTIERS[weaponTier(SAVE.wlvl[SAVE.equip.weapon] || 0)].name} ${WEAPONS[SAVE.equip.weapon].name} +${SAVE.wlvl[SAVE.equip.weapon] || 0}
        ${SAVE.equip.charm ? ' · ' + CHARMS[SAVE.equip.charm].icon : ''} ${SAVE.equip.spirit ? ' · 👻 ' + BOSSES.find(x => x.id === SAVE.equip.spirit).name : ''} · ❤️ ${maxHp()} · 🧪 ${maxFlasks()}</div>`;
    $('#btnFight').onclick = () => { sfx('click'); UI.fight(id); };
    $('#btnGear').onclick = () => { sfx('click'); UI.forge('weapons', id); };
    $('#btnBack').onclick = () => { sfx('click'); UI.map(); };
  },
  fight(id) {
    show('none'); startFight(id); SAVE.lairSeen = (SAVE.lairSeen || 0) + 1; save();
    if (!SAVE.seenTut) { F.paused = true; show('tut'); $('#tut').onclick = () => { SAVE.seenTut = true; save(); show('none'); F.paused = false; }; }
  },
  pause() {
    if (!F) return; F.paused = true; show('pause'); musicPause(true);
    const pxBtn = $('#btnPixelPause'), pxSup = typeof isPixelSupported === 'function' && isPixelSupported(F.b.id);
    if (pxBtn) {
      pxBtn.style.display = pxSup ? '' : 'none';
      if (pxSup) {
        const syncTxt = () => { pxBtn.textContent = isPixelPref() ? '🕹️ 16-Bit Look: ON' : '🎨 16-Bit Look: OFF'; };
        syncTxt();
        pxBtn.onclick = () => { togglePixelMode(); syncTxt(); };
      }
    }
    $('#btnResume').onclick = () => { show('none'); F.paused = false; loop.last = performance.now(); musicPause(false); };
    $('#btnQuit').onclick = () => { musicPause(false); UI.map(); };
    $('#btnRetry2').onclick = () => { musicPause(false); UI.fight(F.b.id); };
  },
  fightOver(result, f) {
    const b = f.b.def, first = !SAVE.beaten[b.id];
    let html = '';
    if (result === 'win') {
      const bones = Math.round(bonesFor(b) * (first ? 1 : 0.5));
      SAVE.bones += bones; SAVE.beaten[b.id] = (SAVE.beaten[b.id] || 0) + 1;
      if (first) SAVE.items[b.drop.id] = true;
      if (first && !SAVE.equip.spirit) SAVE.equip.spirit = b.id;
      html = `<h1 class="gold">MONSTER FELLED</h1><div class="pic">${simg('a/' + b.id + '_card.jpg', b.name, 'cpic')}</div>
        <p>+${bones} 🦴 bones${first ? '' : ' (replay)'}</p>
        ${first ? `<p class="item">${b.drop.icon} You found: <b>${b.drop.name}</b></p><p>👻 ${b.name} can now fight for you as a <b>Spirit</b>!</p>` : ''}
        ${first && b.boss ? `<p class="item">❤️ Your max health went up!</p>` : ''}
        ${first && b.boss && !b.final ? `<p class="item">🗺️ A new area of Oslo is open: <b>${REGIONS[b.region + 1].name}</b>!</p>` : ''}
        ${b.final && first ? `<p class="item big">🏆 YOU SAVED ALL OF OSLO! 🏆<br>Merry Christmas, ${HERO_NAME}! Now try Legend mode…</p>` : ''}
        <p class="sub">${f.p.dodges ? `You dodged ${f.p.dodges} attacks!` : ''}</p>`;
    } else {
      const bones = Math.floor(f.dmgDealt / 12);
      SAVE.bones += bones; SAVE.deaths[b.id] = (SAVE.deaths[b.id] || 0) + 1; SAVE.deaths[b.id + '_last'] = f.lastHit;
      const pct = Math.round((1 - f.b.hp / f.b.maxHp) * 100);
      html = `<h1 class="red">YOU DIED</h1>
        <p>You got ${b.name} down by <b>${pct}%</b>!</p>
        <div class="tip">💡 ${tipFor(f)}</div>
        <p>+${bones} 🦴 practice bones</p>
        ${SAVE.deaths[b.id] >= 3 && b.weak !== SAVE.equip.charm ? `<p class="sub">Psst… ${b.name} hates ${ELEM[b.weak]}. Have you got that charm yet?</p>` : ''}
        ${SAVE.deaths[b.id] >= 3 && !SAVE.equip.spirit && Object.keys(SAVE.beaten).length ? `<p class="sub">Try bringing a 👻 Spirit friend!</p>` : ''}`;
    }
    save();
    show('result'); $('#resultBody').innerHTML = html;
    $('#btnAgain').textContent = result === 'win' ? 'Fight again' : 'Try again';
    $('#btnAgain').onclick = () => { sfx('click'); UI.fight(b.id); };
    $('#btnMap').onclick = () => { sfx('click'); UI.map(); };
    $('#btnForge2').onclick = () => { sfx('click'); UI.forge('weapons'); };
  },
  forge(tab, backTo) {
    show('forge'); musicStart('forge'); UI.forgeBack = backTo || UI.forgeBack;
    $('#fbones').textContent = SAVE.bones;
    document.querySelectorAll('#ftabs button').forEach(b => { b.classList.toggle('sel', b.dataset.t === tab); b.onclick = () => { sfx('click'); UI.forge(b.dataset.t); }; });
    const L = $('#flist'); L.innerHTML = '';
    const row = (icon, name, desc, btnTxt, onClick, state = '') => {
      const r = h(`<div class="frow ${state}"><div class="ic">${icon}</div><div class="tx"><b>${name}</b><span>${desc}</span></div>${btnTxt ? `<button>${btnTxt}</button>` : ''}</div>`);
      if (btnTxt && onClick) r.querySelector('button').onclick = () => { onClick(); UI.forge(tab); };
      L.appendChild(r);
    };
    const pay = (c) => { if (SAVE.bones < c) { UI.toast('Not enough bones! Fight more monsters 🦴'); return false; } SAVE.bones -= c; sfx('craft'); save(); return true; };
    if (tab === 'weapons') {
      for (const k in WEAPONS) {
        const w = WEAPONS[k], lvl = SAVE.wlvl[k] || 0, owned = SAVE.owned[k], eq = SAVE.equip.weapon === k;
        if (owned) {
          const cost = 50 + 35 * lvl, ti = weaponTier(lvl), nextAt = WTIER_AT.find(x => x > lvl);
          row('', `${WTIERS[ti].name} ${w.name} +${lvl}`, w.desc + ` · Damage ${Math.round(w.dmg * (1 + WLVL_MULT * lvl))}` + (nextAt != null ? ` · becomes <b>${WTIERS[weaponTier(nextAt)].name}</b> at +${nextAt}` : ' · <b>LEGENDARY!</b>'), null);
          const r = L.lastChild, bx = h('<div class="btns"></div>');
          r.querySelector('.ic').replaceWith(Object.assign(weaponPreview(k, lvl), { className: 'wprev' }));
          const be = h(`<button class="${eq ? 'eq' : ''}">${eq ? 'Equipped' : 'Equip'}</button>`); be.onclick = () => { SAVE.equip.weapon = k; save(); sfx('click'); UI.forge(tab); };
          bx.appendChild(be);
          if (lvl < MAX_WLVL) { const bu = h(`<button>Upgrade 🦴${cost}</button>`); bu.onclick = () => { if (pay(cost)) { SAVE.wlvl[k] = lvl + 1; save(); if (weaponTier(lvl + 1) > weaponTier(lvl)) UI.reforged(k, lvl + 1); } UI.forge(tab); }; bx.appendChild(bu); }
          r.appendChild(bx);
        } else {
          const has = SAVE.items[w.needs], it = BOSSES.find(b => b.drop.id === w.needs).drop;
          row(has ? w.icon : '❓', has ? w.name : '???', has ? w.desc : `Needs: ${it.icon} ${it.name}`, has ? `Craft 🦴${w.cost}` : null,
            () => { if (pay(w.cost)) { SAVE.owned[k] = true; SAVE.wlvl[k] = 0; save(); } }, has ? '' : 'dim');
        }
      }
    }
    if (tab === 'charms') {
      row('⭕', 'No charm', 'Plain attacks.', SAVE.equip.charm ? 'Equip' : 'Equipped', () => { SAVE.equip.charm = null; save(); });
      for (const k in CHARMS) {
        const c = CHARMS[k], has = SAVE.items[c.needs], made = SAVE.crafted[k], it = BOSSES.find(b => b.drop.id === c.needs).drop;
        if (made) row(c.icon, c.name, c.desc, SAVE.equip.charm === k ? 'Equipped' : 'Equip', () => { SAVE.equip.charm = k; save(); sfx('click'); });
        else row(has ? c.icon : '❓', has ? c.name : '???', has ? c.desc : `Needs: ${it.icon} ${it.name}`, has ? `Craft 🦴${c.cost}` : null, () => { if (pay(c.cost)) { SAVE.crafted[k] = true; SAVE.equip.charm = k; save(); } }, has ? '' : 'dim');
      }
    }
    if (tab === 'armor') {
      row('❤️', `Health: ${maxHp()}`, 'Beat the BIG bosses and craft armor for more health.', null);
      row('🧪', `Potions: ${maxFlasks()}`, 'Bring monster treasures here to get more potions.', null);
      for (const k in ARMORS) {
        const a = ARMORS[k], has = SAVE.items[a.needs], made = SAVE.crafted[k], it = BOSSES.find(b => b.drop.id === a.needs).drop;
        if (made) row(a.icon, a.name, a.desc + ' ✅', null);
        else row(has ? a.icon : '❓', has ? a.name : '???', has ? a.desc : `Needs: ${it.icon} ${it.name}`, has ? `Craft 🦴${a.cost}` : null, () => { if (pay(a.cost)) { SAVE.crafted[k] = true; save(); } }, has ? '' : 'dim');
      }
      for (const id of FLASK_ITEMS) {
        const it = BOSSES.find(b => b.drop.id === id).drop, has = SAVE.items[id], made = SAVE.crafted['flask_' + id];
        if (made) row('🧪', 'Potion from ' + it.name, '+1 potion ✅', null);
        else row(has ? it.icon : '❓', has ? it.name : '???', has ? 'Turn it into +1 potion!' : 'A treasure from a monster…', has ? 'Brew 🦴100' : null, () => { if (pay(100)) { SAVE.crafted['flask_' + id] = true; save(); } }, has ? '' : 'dim');
      }
    }
    if (tab === 'spirits') {
      row('🚫', 'No spirit', 'Fight alone, like a true hero.', SAVE.equip.spirit ? 'Equip' : 'Equipped', () => { SAVE.equip.spirit = null; save(); });
      const beat = BOSSES.filter(b => SAVE.beaten[b.id]);
      if (!beat.length) row('👻', 'No spirits yet', 'Every monster you beat becomes a spirit that can help you fight!', null, null, 'dim');
      for (const b of beat) row(simg('a/' + b.id + '_card.jpg', b.name, ''), b.name, `Power 💀 ${b.tier} · Tap 👻 in a fight to call it (once per fight).`, SAVE.equip.spirit === b.id ? 'Equipped' : 'Equip', () => { SAVE.equip.spirit = b.id; save(); sfx('summon'); });
    }
    if (tab === 'trophies') {
      const all = BOSSES.filter(b => b.drop.trophy);
      const got = all.filter(b => SAVE.items[b.drop.id]).length;
      row('🏆', `Trophies: ${got} / ${all.length}`, 'Some monsters drop a trophy. Collect them all!', null);
      for (const b of all) { const has = SAVE.items[b.drop.id]; row(has ? b.drop.icon : '❓', has ? b.drop.name : '???', has ? 'From ' + b.name : 'Beat ' + (SAVE.beaten[b.id] ? b.name : 'a monster') + ' to find it', null, null, has ? '' : 'dim'); }
    }
    $('#btnFBack').onclick = () => { sfx('click'); const b = UI.forgeBack; UI.forgeBack = null; b ? UI.intro(b) : UI.map(); };
  },
  settings() {
    show('settings'); musicStart('map');
    const d = $('#diffs'); d.innerHTML = '';
    for (const k in DIFFS) { const x = DIFFS[k], b = h(`<button class="${SAVE.diff === k ? 'sel' : ''}"><b>${x.name}</b><span>${x.desc}</span></button>`); b.onclick = () => { SAVE.diff = k; save(); sfx('click'); UI.settings(); }; d.appendChild(b); }
    $('#btnSound').textContent = 'Sound: ' + (SAVE.sound ? 'ON 🔊' : 'OFF 🔇');
    $('#btnSound').onclick = () => { SAVE.sound = !SAVE.sound; save(); syncAudioSettings(); if (SAVE.sound) sfx('click'); UI.settings(); };
    $('#btnMusic').textContent = 'Music: ' + (SAVE.music !== false ? 'ON 🎵' : 'OFF');
    $('#btnMusic').onclick = () => { SAVE.music = SAVE.music === false; save(); syncAudioSettings(); sfx('click'); UI.settings(); };
    let resetN = 0;
    $('#btnReset').onclick = () => { resetN++; if (resetN < 3) { $('#btnReset').textContent = `Tap ${3 - resetN} more times to erase everything`; return; } localStorage.removeItem(SAVE_KEY); SAVE = DEFAULT_SAVE(); SAVE.giftOpened = true; save(); UI.map(); };
    $('#btnTest').onclick = () => { BOSSES.forEach(b => { SAVE.items[b.drop.id] = true; }); SAVE.bones += 5000; BOSSES.filter(b => b.boss && !b.final).forEach(b => SAVE.beaten[b.id] = SAVE.beaten[b.id] || 1); BOSSES.filter(b => !b.boss).forEach(b => SAVE.beaten[b.id] = SAVE.beaten[b.id] || 1); save(); UI.toast('Test mode: everything unlocked, +5000 bones'); };
    $('#btnSBack').onclick = () => { sfx('click'); UI.map(); };
  },
  key(e) {
    // keyboard shortcuts for menus (handy when testing on a computer)
    const vis = id => { const el = document.getElementById(id); return el && el.classList.contains('on'); };
    const k = e.code;
    if (k === 'KeyV') {
      if (vis('intro') && $('#btnPixelIntro') && $('#btnPixelIntro').style.display !== 'none') return $('#btnPixelIntro').click();
      if (vis('pause') && $('#btnPixelPause') && $('#btnPixelPause').style.display !== 'none') return $('#btnPixelPause').click();
    }
    if (vis('pause') && (k === 'Escape' || k === 'KeyP')) return $('#btnResume').click();
    if (vis('tut') && (k === 'Enter' || k === 'Space')) return $('#tut').click();
    if (k !== 'Enter' && k !== 'Space' && k !== 'KeyR' && k !== 'Escape') return;
    if (vis('gift') && k !== 'Escape') return $('#gift').click();
    if (vis('title') && k !== 'Escape') return $('#btnPlay').click();
    if (vis('intro')) return k === 'Escape' ? $('#btnBack').click() : $('#btnFight').click();
    if (vis('result')) return k === 'Escape' ? $('#btnMap').click() : $('#btnAgain').click();
  },
  reforged(k, lvl) {
    const T = WTIERS[weaponTier(lvl)], ov = h(`<div class="reforge"><div class="rf-in"><div class="rf-t">✨ RE-FORGED! ✨</div><div class="rf-c"></div><div class="rf-n">${T.name} ${WEAPONS[k].name}</div><div class="rf-s">It glows with new power…</div></div></div>`);
    ov.querySelector('.rf-c').appendChild(weaponPreview(k, lvl, 300, 110));
    document.body.appendChild(ov); sfx('reforge');
    let anim = true; const tick = () => { if (!anim) return; const c = ov.querySelector('canvas'); const n = weaponPreview(k, lvl, 300, 110); c.replaceWith(n); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    ov.onclick = () => { anim = false; ov.remove(); };
  },
  toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(UI._tt); UI._tt = setTimeout(() => t.classList.remove('on'), 2200); },
};
window.addEventListener('load', () => { initEngine(); UI.init(); });
