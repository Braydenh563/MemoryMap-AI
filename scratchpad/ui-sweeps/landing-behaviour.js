// Landing page behaviour: file:// load, links, theme toggle, lightbox, no-JS.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const DOCS = path.resolve(__dirname, '../../docs');
const FILE = 'file://' + path.join(DOCS, 'index.html');
(async () => {
  const browser = await chromium.launch();
  const out = {};
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [], failed = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('requestfailed', r => failed.push(r.url()));
    await page.goto(FILE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { for (const i of document.images) i.loading = 'eager'; });
    await page.waitForTimeout(1000);
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
    const bad = links.filter(h => !(h.startsWith('https://github.com/Braydenh563') || h.startsWith('#') || h.startsWith('screenshots/')));
    const missingShots = links.filter(h => h.startsWith('screenshots/') && !fs.existsSync(path.join(DOCS, h)));
    const anchors = links.filter(h => h.startsWith('#') && h !== '#top');
    const anchorMissing = await page.evaluate(hs => hs.filter(h => !document.getElementById(h.slice(1))), anchors);
    const noAlt = await page.evaluate(() => [...document.querySelectorAll('main img, footer img')].filter(i => !i.alt || i.alt.length < 20).length);
    // theme toggle
    const t0 = await page.evaluate(() => getComputedStyle(document.body).color);
    const label0 = await page.getAttribute('#theme-toggle', 'aria-label');
    await page.click('#theme-toggle');
    const t1 = await page.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).color]);
    const label1 = await page.getAttribute('#theme-toggle', 'aria-label');
    // lightbox
    await page.click('#features .feature a.shot');
    await page.waitForTimeout(400);
    const lb = await page.evaluate(() => { const d = document.getElementById('lightbox'); const i = document.getElementById('lightbox-img'); const r = i.getBoundingClientRect(); return { open: d.open, src: i.getAttribute('src'), w: Math.round(r.width), h: Math.round(r.height), natural: i.naturalWidth, caption: document.getElementById('lightbox-caption').textContent.slice(0, 30) }; });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ open: document.getElementById('lightbox').open, focus: document.activeElement.className }));
    // skip link
    await page.goto(FILE, { waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { text: a.textContent, top: Math.round(r.top), outline: getComputedStyle(a).outlineStyle }; });
    await page.keyboard.press('Tab');
    const second = await page.evaluate(() => ({ el: document.activeElement.className, outline: getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth }));
    out.file = { errors, failed, links: links.length, bad, missingShots, anchorMissing, noAlt, toggle: { t0, label0, t1, label1 }, lb, after, skip, second };
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(FILE, { waitUntil: 'domcontentloaded' });
    out.nojs = await page.evaluate(() => ({ toggleShown: !document.getElementById('theme-toggle').hidden, textLen: document.body.innerText.length, h2: document.querySelectorAll('h2').length, sw: document.documentElement.scrollWidth }));
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
