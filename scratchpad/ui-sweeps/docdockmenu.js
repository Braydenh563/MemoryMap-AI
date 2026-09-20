// INBOX 262 (1): the Download submenu opens, its rows work, and the menu
// stays inside the window at a short viewport (the owner's screenshot was a
// tall narrow window where it ran off the bottom).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8795';
(async () => {
  const browser = await chromium.launch();
  for (const size of [{ w: 1440, h: 900 }, { w: 900, h: 700 }, { w: 860, h: 1260 }, { w: 390, h: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
    await ctx.addInitScript(() => { try { localStorage.setItem('theme', 'light'); localStorage.setItem('onboardingDone', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 90)));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
    await page.waitForTimeout(3500);
    await page.evaluate(() => { const o = document.getElementById('onboarding-overlay'); if (o) o.classList.add('hidden'); });
    const id = await page.evaluate(async () => {
      const list = await apiJson('/documents');
      const items = list.items || list;
      return items.length ? items[0].id : null;
    });
    if (!id) { console.log(size.w + 'x' + size.h, 'no document'); await ctx.close(); continue; }
    await page.evaluate((d) => { switchTab('documents'); setTimeout(() => openDocument(d), 200); }, id);
    await page.waitForTimeout(3500);
    await page.evaluate(() => { document.querySelector('#doc-dock-menu > summary').click(); });
    await page.waitForTimeout(600);
    const menu = await page.evaluate(() => {
      const list = document.querySelector('#doc-dock-menu .doc-dock-menu-list');
      const r = list.getBoundingClientRect();
      return {
        h: Math.round(r.height), top: Math.round(r.top),
        overflowBottom: Math.round(r.bottom - window.innerHeight),
        overflowTop: Math.round(-r.top),
        overflowRight: Math.round(r.right - window.innerWidth),
        overflowLeft: Math.round(-r.left),
        scrolls: list.scrollHeight > list.clientHeight + 1,
      };
    });
    // open the flyout
    await page.evaluate(() => { document.querySelector('#doc-dock-menu .has-submenu')?.click(); });
    await page.waitForTimeout(600);
    const fly = await page.evaluate(() => {
      const sub = [...document.querySelectorAll('.action-menu.submenu')].find((s) => !s.classList.contains('hidden'));
      if (!sub) return 'closed';
      const r = sub.getBoundingClientRect();
      return {
        rows: [...sub.querySelectorAll('button')].map((b) => b.textContent.trim().slice(0, 24)),
        overflowBottom: Math.round(r.bottom - window.innerHeight),
        overflowRight: Math.round(r.right - window.innerWidth),
        overflowLeft: Math.round(-r.left),
        stacked: getComputedStyle(sub).position !== 'fixed',
      };
    });
    console.log(`${size.w}x${size.h} menu ${JSON.stringify(menu)}`);
    console.log(`          flyout ${JSON.stringify(fly)} errors=${errors.length}`);
    await ctx.close();
  }
  await browser.close();
})();
