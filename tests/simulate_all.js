const { chromium } = require('playwright'); const serve = require('./serve.js');
(async () => { const SV = await serve();
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(SV.url + '/index.html?v=' + Date.now()); await p.waitForTimeout(1000);
  const r = await p.evaluate(() => {
    SAVE.giftOpened = true; SAVE.seenTut = true; const ws = Object.keys(WEAPONS); let wi = 0, renderMs = 0, frames = 0, won = 0;
    for (const bd of BOSSES) {
      const k = ws[wi++ % ws.length]; SAVE.owned[k] = true; SAVE.wlvl[k] = (wi * 3) % 16; SAVE.equip.weapon = k;
      startFight(bd.id); F.p.hp = 1e9; F.p.maxHp = 1e9;
      for (let i = 0; i < 60 * 20; i++) {
        if (i == 60 * 8) F.b.hp = F.b.maxHp * 0.45; if (i == 60 * 16) F.b.hp = 5;
        INPUT.mx = Math.sin(i / 50); INPUT.my = Math.cos(i / 70); if (i % 20 == 0) F.p.buf.atk = .3; if (i % 90 == 0) F.p.buf.roll = .3;
        update(1 / 60);
        if (i % 4 == 0) { const t0 = performance.now(); render(); renderMs += performance.now() - t0; frames++; }
      }
      if (F.b.dead) won++; F.reported = true; musicStop();
    }
    return { avgRenderMs: (renderMs / frames).toFixed(2), won };
  });
  console.log(JSON.stringify(r)); console.log('ERRORS', errs.slice(0, 5));
  await b.close(); SV.close();
})();
