// The app's mark, measured where it shows (brief "logo", 2026-10-11): the
// lock screen, the status bar's mark, the chat's welcome, Settings' About
// and an assistant head set to the emblem. For each: drawn or not, its box,
// the tile's colours, the animations its layers run. Then the motion: the
// landing sampled, the busy lift on and off sampled every frame (the largest
// step between two frames is the jolt check), and Interface animations off
// (every layer's transform `none`, the final frame).
//
//   BASE=http://127.0.0.1:8796 WIDTH=1440 THEME=light node scratchpad/ui-sweeps/emblem.js
//
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8796';
const WIDTH = Number(process.env.WIDTH || 1440);
const THEME = process.env.THEME || 'light';
const phone = WIDTH < 600;

const describe = (sel) => {
  const art = document.querySelector(sel);
  if (!art) return { sel, drawn: false };
  const r = art.getBoundingClientRect();
  const layers = [...art.querySelectorAll('span')].map((s) => getComputedStyle(s).animationName).filter((n) => n !== 'none');
  return {
    sel, drawn: true, w: +r.width.toFixed(1), h: +r.height.toFixed(1), visible: r.width > 0 && !!art.getClientRects().length,
    tile: (getComputedStyle(art).backgroundImage.match(/rgb\([^)]*\)/g) || []).join(' '), anims: [...new Set(layers)].join(','), cls: art.className,
  };
};

async function frames(page, sel, ms) {
  return page.evaluate(([sel, ms]) => new Promise((resolve) => {
    const els = [...document.querySelectorAll(sel)];
    const out = []; const start = performance.now();
    const step = () => {
      const now = document.timeline.currentTime; // the time the animations were sampled at
      out.push(els.map((el) => { const m = new DOMMatrix(getComputedStyle(el).transform); return [m.e, m.f, now]; }));
      if (performance.now() - start < ms) requestAnimationFrame(step); else resolve(out);
    };
    requestAnimationFrame(step);
  }), [sel, ms]);
}
//: The largest move between two frames, as px per 16.7ms frame, so a
//: headless browser's dropped frames do not read as a jolt.
const maxStep = (fr) => {
  let max = 0;
  for (let i = 1; i < fr.length; i++) fr[i].forEach(([x, y, t], k) => {
    const [px, py, pt] = fr[i - 1][k];
    max = Math.max(max, (Math.hypot(x - px, y - py) / Math.max(1, t - pt)) * 16.7);
  });
  return +max.toFixed(2);
};
const maxLift = (fr) => +Math.max(...fr.flat().map(([, y]) => -y)).toFixed(2);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: phone ? 844 : 900 }, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('onboardingDone', '1'); localStorage.setItem('tourDone', '1'); localStorage.setItem('nm-buddy-hint', 'done'); localStorage.setItem('ui-motion', 'on'); } catch (e) {} }, THEME);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/401/.test(m.text())) errors.push(m.text()); });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  const landing = await frames(page, '#lock-emblem .emblem-cell-c', 1600);
  console.log('lock', JSON.stringify(await page.evaluate(describe, '#lock-emblem .emblem-art')));
  console.log('landing: frames', landing.length, 'max step px', maxStep(landing), 'start', JSON.stringify(landing[0][0].slice(0, 2)), 'end', JSON.stringify(landing.at(-1)[0].slice(0, 2)));
  await page.fill('#lock-password', 'testpassword123');
  await page.click('#lock-submit');
  await page.waitForTimeout(3500);
  //: A fresh data dir asks about updates first; its dialog takes the clicks.
  if (await page.$('.confirm-overlay')) await page.keyboard.press('Escape');
  console.log('ai-mark', JSON.stringify(await page.evaluate(describe, '#ai-mark .emblem-art')));
  await page.click('#tab-btn-chat').catch(() => {});
  await page.waitForSelector('#chat-empty-emblem .emblem-art', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('chat-welcome', JSON.stringify(await page.evaluate(describe, '#chat-empty-emblem .emblem-art')));
  // Busy: a running agent run, then its end; every frame sampled.
  await page.evaluate(() => { window.__run = { state: 'running' }; agentRuns.push(window.__run); syncEmblemBusy(); });
  const sel = '#chat-empty-emblem .emblem-rise';
  const busy = await frames(page, sel, 2600);
  console.log('busy: lift px max', maxLift(busy), 'max step px', maxStep(busy), 'cls', await page.evaluate(() => document.querySelector('#chat-empty-emblem .emblem-art').className));
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__run.state = 'done'; syncEmblemBusy(); });
  const ending = await frames(page, sel, 2800);
  if (process.env.DEBUG) {
    for (let i = 1; i < ending.length; i++) ending[i].forEach(([x, y, tt], k) => {
      const [px, py, pt] = ending[i - 1][k];
      const v = (Math.hypot(x - px, y - py) / Math.max(1, tt - pt)) * 16.7;
      if (v > 0.5) console.log('  step', k, (tt - ending[0][0][2]).toFixed(0) + 'ms', [px, py].map((n) => n.toFixed(2)), '->', [x, y].map((n) => n.toFixed(2)));
    });
  }
  console.log('busy end: max step px', maxStep(ending), 'final', JSON.stringify(ending.at(-1).map(([x, y]) => [x, y])), 'cls', await page.evaluate(() => document.querySelector('#chat-empty-emblem .emblem-art').className));
  // Interface animations off: the final frame.
  await page.evaluate(() => { document.documentElement.dataset.uiMotion = 'off'; });
  await page.waitForTimeout(300);
  console.log('ui-motion off', JSON.stringify(await page.evaluate(() => {
    const art = document.querySelector('#chat-empty-emblem .emblem-art');
    return [...art.querySelectorAll('span')].map((s) => getComputedStyle(s).transform + '/' + getComputedStyle(s).animationName).filter((v) => v !== 'none/none');
  })));
  await page.evaluate(() => { document.documentElement.dataset.uiMotion = 'on'; });
  // Settings' About.
  await page.evaluate(() => document.getElementById('settings-btn')?.click());
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('button[data-section="about"]')?.click());
  await page.waitForTimeout(1500);
  console.log('about', JSON.stringify(await page.evaluate(describe, '#about-emblem .emblem-art')), 'busy now', await page.evaluate(() => [typeof chatController !== 'undefined' && !!chatController, agentRuns.filter((r) => r.state === 'running').length]));
  // An assistant head with Appearance, Assistant avatar set to the emblem.
  await page.evaluate(() => {
    const select = document.getElementById('assistant-avatar');
    select.value = 'emblem';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const row = assistantHeadRow();
    row.id = 'emblem-sweep-head';
    document.getElementById('about-emblem').after(row);
  });
  await page.waitForTimeout(1500);
  console.log('head', JSON.stringify(await page.evaluate(describe, '#emblem-sweep-head .emblem-art')));
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
