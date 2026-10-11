// The rename to Tessellate (INBOX 903): no "MemoryMap" renders anywhere a
// person reads, before or after unlock, in the app and on the Pages site,
// except the "Formerly MemoryMap AI" notes.
// BASE=http://127.0.0.1:8795 node scratchpad/ui-sweeps/rebrand.js
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
const ROOT = path.resolve(__dirname, '..', '..');

function scan() {
  const hits = [];
  const skip = (s) => s.replace(/formerly MemoryMap AI/gi, '');
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const tag = n.parentElement && n.parentElement.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') continue;
    if (/MemoryMap/.test(skip(n.textContent))) hits.push(`text:${n.textContent.trim().slice(0, 80)}`);
  }
  for (const el of document.querySelectorAll('*')) {
    for (const a of ['title', 'aria-label', 'placeholder', 'alt', 'content', 'data-help', 'value']) {
      const v = el.getAttribute(a);
      if (v && /MemoryMap/.test(skip(v))) hits.push(`${el.tagName.toLowerCase()}[${a}]:${v.slice(0, 80)}`);
    }
  }
  return { title: document.title, hits, formerly: /formerly MemoryMap AI/i.test(document.documentElement.textContent) };
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const lock = await page.evaluate(scan);
  const lockTitle = await page.evaluate(() => (document.getElementById('lock-title') || {}).textContent);
  console.log('lock', JSON.stringify({ title: lock.title, lockTitle, hits: lock.hits.length, sample: lock.hits.slice(0, 5) }));
  await page.fill('#lock-password', 'testpassword123');
  await page.click('#lock-submit');
  await page.waitForTimeout(5000);
  const app = await page.evaluate(scan);
  console.log('app', JSON.stringify({ title: app.title, hits: app.hits.length, formerly: app.formerly, sample: app.hits.slice(0, 8) }));
  const about = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((x) => x.textContent.trim() === 'Tessellate');
    return h ? h.parentElement.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : null;
  });
  console.log('about', about);
  for (const p of ['/health', '/manifest.webmanifest', '/offline.html', '/clip.html', '/capture.html']) {
    const r = await page.request.get(BASE + p);
    const t = await r.text();
    console.log(p, r.status(), 'MemoryMap:', (t.match(/MemoryMap/g) || []).length, 'Tessellate:', (t.match(/Tessellate/g) || []).length);
  }
  const help = await page.request.get(BASE + '/api/help/topics').catch(() => null);
  if (help) console.log('/api/help/topics', help.status());
  await page.goto('file://' + path.join(ROOT, 'docs', 'index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const site = await page.evaluate(scan);
  const meta = await page.evaluate(() => ({
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    canonical: document.querySelector('link[rel=canonical]')?.href,
    footer: document.querySelector('.site-footer .about')?.textContent.replace(/\s+/g, ' ').trim(),
    hero: document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim(),
  }));
  console.log('pages', JSON.stringify({ title: site.title, hits: site.hits.length, formerly: site.formerly, sample: site.hits.slice(0, 5), ...meta }));
  await browser.close();
})();
