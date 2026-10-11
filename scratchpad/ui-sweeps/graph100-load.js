// The app loading straight onto a tab (START=graph|dashboard): per frame from
// navigation, what the graph canvas and the constellation show.
//   BASE=... START=graph node load.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE;
const START = process.env.START || 'graph';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((start) => {
    try {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('onboardingDone', '1');
      localStorage.setItem('tourDone', '1');
      localStorage.setItem('nm-buddy-hint', 'done');
    } catch (e) {}
    window.__L = [];
    const loop = (now) => {
      const s = typeof gcTab !== 'undefined' ? gcTab : null;
      const c = s && s.canvas;
      let op = 0;
      if (c && c.isConnected) {
        op = 1;
        for (let el = c; el && el !== document.documentElement; el = el.parentElement) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') { op = 0; break; }
          op *= Number(cs.opacity);
        }
      }
      const curtain = document.documentElement.classList.contains('shell-curtain') || !!document.querySelector('#lock-overlay:not(.hidden)');
      let cx = null, cy = null, bw = null;
      if (s && s.nodes && s.nodes.length && s.transform) {
        let x0 = Infinity, x1 = -Infinity, sx = 0, sy = 0, n = 0;
        for (const node of s.nodes) { if (!Number.isFinite(node.x)) continue; const x = node.x * s.transform.k + s.transform.x, y = node.y * s.transform.k + s.transform.y; sx += x; sy += y; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
        if (n) { cx = sx / n; cy = sy / n; bw = x1 - x0; }
      }
      const art = document.querySelector('.art-holder canvas:not(.art-veil)');
      let artOp = 0;
      if (art) { artOp = 1; for (let el = art; el && el !== document.documentElement; el = el.parentElement) { const cs = getComputedStyle(el); if (cs.display === 'none') { artOp = 0; break; } artOp *= Number(cs.opacity); } }
      const skel = document.querySelector('.tab-loading .skeleton, #tab-graph .skeleton');
      window.__L.push([Math.round(now), +op.toFixed(2), curtain ? 1 : 0, s && s.timing ? s.timing.frames : 0, cx && Math.round(cx), cy && Math.round(cy), bw && Math.round(bw), +artOp.toFixed(2), skel ? 1 : 0, s && s.nodes ? s.nodes.length : 0]);
      if (window.__L.length < 1500) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, START);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { timeout: 20000 });
  await page.fill('#lock-password', 'testpassword123');
  await page.click('#lock-submit');
  await page.waitForTimeout(4000);
  await page.evaluate((start) => switchTab(start), START);
  await page.waitForTimeout(Number(process.env.PRE || 3000));
  const cached = await page.evaluate(() => (localStorage.getItem('graphPositions') || '').length);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const way = await (await page.waitForFunction(() => {
    const f = document.getElementById('lock-password');
    const o = document.getElementById('lock-overlay');
    if (f && o && !o.classList.contains('hidden') && f.offsetParent !== null) return 'lock';
    return window.__L.length > 30 ? 'app' : false;
  }, null, { timeout: 20000, polling: 50 })).jsonValue();
  const tLogin = way === 'lock' ? await page.evaluate(() => performance.now()) : 0;
  if (way === 'lock') { await page.fill('#lock-password', 'testpassword123'); await page.click('#lock-submit'); }
  await page.waitForTimeout(9000);
  const L = await page.evaluate(() => window.__L);
  // Visible = graph drawn, canvas opacity, curtain gone.
  const vis = L.map((r) => (r[2] ? 0 : r[1]) * (r[3] > 0 ? 1 : 0));
  let firstVisible = null, jumps = 0, maxJump = 0, opJumps = 0, frames = 0, motionFrames = 0, artFirst = null, artPop = 0;
  for (let i = 1; i < L.length; i++) {
    if (L[i][0] < tLogin) continue;
    if (firstVisible == null && vis[i] > 0.05) firstVisible = L[i][0] - tLogin;
    if (vis[i] - vis[i - 1] > 0.5) opJumps += 1;
    if (vis[i] > 0.05 && vis[i - 1] > 0.05 && L[i][4] != null && L[i - 1][4] != null) {
      frames += 1;
      const d = Math.hypot(L[i][4] - L[i - 1][4], L[i][5] - L[i - 1][5]) + Math.abs(L[i][6] - L[i - 1][6]) / 2;
      if (d > 1) motionFrames += 1;
      maxJump = Math.max(maxJump, d);
      if (d > 40) jumps += 1;
    }
    const a = L[i][2] ? 0 : L[i][7], b = L[i - 1][2] ? 0 : L[i - 1][7];
    if (artFirst == null && a > 0.05) artFirst = L[i][0] - tLogin;
    if (a - b > 0.5) artPop += 1;
  }
  console.log(JSON.stringify({ cached, way, start: START, nodes: L[L.length - 1][9], firstVisibleMs: firstVisible && Math.round(firstVisible), opacityPops: opJumps,
    visibleFrames: frames, motionFrames, layoutJumpsOver40px: jumps, maxJumpPx: Math.round(maxJump), artFirstMs: artFirst && Math.round(artFirst), artPops: artPop,
    skeletonFrames: L.filter((r) => r[8]).length }));
  if (process.env.DUMP) console.log(L.filter((r, i) => r[0] > tLogin && r[3] > 0).slice(0, 60).map((r) => r.join(',')).join('\n'));
  console.log(await page.evaluate(() => [document.querySelector('.tab-content.active, section.active')?.id, localStorage.getItem('activeTab'), window.__L.length, typeof gcTab]));
  await browser.close();
})();
