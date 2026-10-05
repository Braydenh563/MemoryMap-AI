// WORLD_CLASS_PLAN H9 (row 27) in a browser: simple mode, the usage ledger
// and the palette's order, quick capture from anywhere (timed), and the
// speculative warm-up request on a typing pause.
//
//   BASE=http://127.0.0.1:8865 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/inv1005-polish.js      (WIDTH=390, THEME=dark)
const { boot, BASE } = require('./lib.js');

const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, ctx, page } = await boot({ viewport: { width: WIDTH, height: 900 } });
  const say = (k, v) => console.log(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  const visibleTabs = () => page.evaluate(() => [...document.querySelectorAll('button[role="tab"][data-tab]')]
    .filter((b) => b.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && b.getBoundingClientRect().width > 0)
    .map((b) => b.dataset.tab));

  // --- simple mode -------------------------------------------------------------
  say('tabs before', await visibleTabs());
  await page.evaluate(() => openSettingsModal('general'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('pref-simple-mode').click());
  await page.waitForTimeout(400);
  say('simple on', {
    tabs: await visibleTabs(),
    learnedNav: await page.evaluate(() => !!document.querySelector('#settings-nav [data-section="learned"]').offsetParent),
    html: await page.evaluate(() => document.documentElement.dataset.simple || ''),
  });
  await page.evaluate(() => document.getElementById('pref-simple-mode').click());
  await page.waitForTimeout(400);
  say('simple off', await visibleTabs());
  await page.keyboard.press('Escape');

  // --- the ledger and the palette's order ---------------------------------------
  for (const tab of ['notes', 'chat', 'notes', 'library', 'notes']) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(300);
  }
  const command = await page.evaluate(() => {
    const rows = paletteCommands();
    return rows[Math.min(6, rows.length - 1)].label;
  });
  await page.evaluate(() => openPalette());
  await page.waitForTimeout(600);
  const firstBefore = await page.evaluate(() => document.querySelector('#palette-list [role="option"]')?.textContent?.trim().slice(0, 40));
  await page.keyboard.press('Escape');
  for (let i = 0; i < 3; i++) await page.evaluate((label) => usageCount(usageFeatureName(label)), command);
  await page.evaluate(() => usageFlush());
  await page.waitForTimeout(800);
  await page.evaluate(() => openPalette());
  await page.waitForTimeout(1500);
  const firstAfter = await page.evaluate(() => document.querySelector('#palette-list [role="option"]')?.textContent?.trim().slice(0, 40));
  say('palette first row', { before: firstBefore, ranThreeTimes: String(command).slice(0, 40), after: firstAfter });
  await page.keyboard.press('Escape');
  await page.evaluate(() => openSettingsModal('general'));
  await page.waitForTimeout(1800);
  say('what you use', await page.evaluate(() => ({
    most: document.getElementById('usage-most').textContent.slice(0, 160),
    unused: document.getElementById('usage-unused').textContent.slice(0, 160),
    size: getComputedStyle(document.getElementById('usage-most')).fontSize,
    overflowX: document.getElementById('settings-general').scrollWidth - document.getElementById('settings-general').clientWidth,
  })));
  await page.evaluate(() => showSettingsSection('shortcuts'));
  await page.waitForTimeout(1200);
  say('capture command', await page.evaluate(() => ({
    text: document.getElementById('capture-command').textContent.slice(-40),
    w: Math.round(document.getElementById('capture-anywhere-box').getBoundingClientRect().width),
    overflowX: document.getElementById('settings-shortcuts').scrollWidth - document.getElementById('settings-shortcuts').clientWidth,
  })));
  await page.keyboard.press('Escape');

  // --- speculative retrieval: one warm request on a pause ------------------------
  const warms = [];
  page.on('request', (r) => { if (r.url().endsWith('/search/warm')) warms.push(r.postData()); });
  await page.evaluate(() => { switchTab('notes'); showNotesSection('ask'); });
  await page.waitForTimeout(800);
  await page.fill('#question', '');
  await page.type('#question', 'what did I write about the garden shed', { delay: 30 });
  await page.waitForTimeout(1500);
  say('warm requests', warms.length);

  // --- quick capture from anywhere, timed ----------------------------------------
  const capture = await ctx.newPage();
  capture.on('pageerror', (e) => console.log('CAPTURE PAGEERROR:', e.message));
  await capture.setViewportSize({ width: 520, height: 300 });
  const began = Date.now();
  await capture.goto(`${BASE}/capture.html`, { waitUntil: 'domcontentloaded' });
  await capture.waitForSelector('#capture-text');
  const text = `Captured from anywhere ${Date.now()}`;
  await capture.keyboard.type(text);
  await capture.keyboard.press('Enter');
  let saved = false;
  for (let i = 0; i < 60 && !saved; i++) {
    saved = await page.evaluate(async (t) => {
      const r = await fetch('/entries?limit=5', { headers: { 'X-Auth-Token': localStorage.getItem('token') } });
      const body = await r.json();
      const items = Array.isArray(body) ? body : (body.items || body.entries || []);
      return items.some((e) => (e.content || '').includes(t));
    }, text);
    if (!saved) await page.waitForTimeout(100);
  }
  say('capture', { saved, ms: Date.now() - began, focusInBox: await capture.evaluate(() => document.activeElement?.id || 'closed').catch(() => 'closed') });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
