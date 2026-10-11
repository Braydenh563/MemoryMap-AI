// Brief 49 (WORLD_CLASS 25c): the manual opened from Settings, Help, searched,
// jumped and printed, at 1440 and 390. BASE=... SCRATCH=... node firstrun49-manual.js
const { boot } = require('./lib.js');
(async () => {
  for (const W of [1440, 390]) {
    const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(process.env.BASE + '/#/settings/help', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const btn = await page.$('#help-open-manual');
    const br = btn && await btn.boundingBox();
    const before = await page.evaluate(() => [document.querySelector('#settings-modal')?.getBoundingClientRect().width, location.hash]); console.log('BEFORE', JSON.stringify(before));
    const t0 = Date.now();
    await page.click('#help-open-manual');
    await page.waitForSelector('.manual-card .manual-topic', { timeout: 10000 });
    const open = Date.now() - t0;
    const m = await page.evaluate(() => {
      const card = document.querySelector('.manual-card').getBoundingClientRect();
      const topics = document.querySelector('.manual-topics');
      const contents = document.querySelector('.manual-contents');
      return { card: [card.x, card.y, card.width, card.height].map(Math.round), articles: document.querySelectorAll('.manual-topic').length,
        count: document.querySelector('.manual-count').textContent, scroll: [topics.scrollHeight, topics.clientHeight],
        contentsShown: getComputedStyle(contents).display, focus: document.activeElement.id,
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        overlayTop: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.manual-overlay') != null };
    });
    await page.fill('#manual-search', 'merge into');
    await page.waitForTimeout(200);
    const q = await page.evaluate(() => ({ count: document.querySelector('.manual-count').textContent,
      shown: [...document.querySelectorAll('.manual-topic')].filter((a) => !a.hidden).map((a) => a.id) }));
    await page.fill('#manual-search', 'zzqqxx');
    await page.waitForTimeout(200);
    const none = await page.evaluate(() => !document.querySelector('.manual-empty').classList.contains('hidden'));
    await page.fill('#manual-search', '');
    if (W === 1440) {
      await page.click('.manual-jump >> nth=3');
      await page.waitForTimeout(200);
      const jump = await page.evaluate(() => { const t = document.querySelector('.manual-topics'); const g = document.querySelectorAll('.manual-group')[3]; return [t.scrollTop, g.offsetTop, g.querySelector('h3').textContent]; });
      console.log('JUMP', JSON.stringify(jump));
      await page.emulateMedia({ media: 'print' });
      await page.evaluate(() => document.body.classList.add('manual-print'));
      const pr = await page.evaluate(() => ({ visibleBodyKids: [...document.body.children].filter((c) => getComputedStyle(c).display !== 'none').map((c) => c.className.slice(0, 40)),
        cardH: Math.round(document.querySelector('.manual-card').getBoundingClientRect().height), topicsOverflow: getComputedStyle(document.querySelector('.manual-topics')).overflowY }));
      console.log('PRINT', JSON.stringify(pr));
      await page.pdf({ path: process.env.SCRATCH + '/manual.pdf' }).catch((e) => console.log('pdf', e.message.slice(0, 80)));
      await page.emulateMedia({ media: 'screen' });
      await page.evaluate(() => document.body.classList.remove('manual-print'));
      await page.screenshot({ path: process.env.SCRATCH + '/manual-1440.png' });
    } else await page.screenshot({ path: process.env.SCRATCH + '/manual-390.png' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const closed = await page.evaluate(() => [!document.querySelector('.manual-overlay'), document.querySelector('#settings-modal')?.getBoundingClientRect().width, getComputedStyle(document.querySelector('#settings-modal')).display]);
    console.log(W, 'BTN', JSON.stringify(br), 'OPEN_MS', open, JSON.stringify(m), 'Q', JSON.stringify(q), 'NONE', none, 'ESC closes only manual', closed, 'ERRS', JSON.stringify(errs));
    await browser.close();
  }
})();
