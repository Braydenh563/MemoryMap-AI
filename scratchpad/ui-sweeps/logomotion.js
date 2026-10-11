// The Tessellate mark moves wherever it shows: for each place, animations on its layers (getAnimations
// subtree) and whether any layer's computed transform changes over 500 ms. RM=1 emulates reduced motion.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8812';
const probe = (page, sel) => page.evaluate(async (sel) => {
  const el = document.querySelector(sel);
  if (!el) return { sel, found: false };
  const art = el.querySelector('.emblem-art') || el;
  const layers = [...art.querySelectorAll('*')];
  const snap = () => layers.map((n) => getComputedStyle(n).transform + '|' + getComputedStyle(n).opacity).join(';');
  const a = snap(); await new Promise((r) => setTimeout(r, 500)); const b = snap();
  const anims = art.getAnimations({ subtree: true });
  const r = art.getBoundingClientRect();
  return { sel, found: true, size: Math.round(r.width), animations: anims.length, names: [...new Set(anims.map((x) => x.animationName))].join(','), changed: a !== b, visible: art.offsetParent !== null };
}, sel);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(() => { try { localStorage.setItem('theme', 'light'); if (window.__MOTION) localStorage.setItem('motion', window.__MOTION); localStorage.setItem('onboardingDone', '1'); localStorage.setItem('tourDone', '1'); localStorage.setItem('nm-buddy-hint', 'done'); } catch (e) {} });
  const page = await ctx.newPage(); if (process.env.MOTION) await page.addInitScript((m) => { window.__MOTION = m; }, process.env.MOTION);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log(JSON.stringify(await probe(page, '#lock-overlay .emblem')));
  await page.fill('#lock-password', 'testpassword123'); await page.click('#lock-submit');
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.getElementById('recovery-key-dialog')?.close());
  console.log(JSON.stringify(await probe(page, '.dash-hero-emblem')));
  console.log(JSON.stringify(await probe(page, '#status-bar .emblem-mark')));
  await page.evaluate(() => document.getElementById('tab-btn-chat')?.click()); await page.waitForTimeout(1500);
  console.log(JSON.stringify(await probe(page, '#chat-empty-emblem')));
  await page.evaluate(() => document.getElementById('settings-btn').click()); await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('#settings-modal [data-section="about"]')?.click()); await page.waitForTimeout(800);
  console.log(JSON.stringify(await probe(page, '#about-emblem')));
  await browser.close();
})();
