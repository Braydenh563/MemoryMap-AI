// Phase 13 decision 15: does a keyboard focus show what a hover shows? Tab
// through each tab and, for every stop, read the fill and ink at rest, under
// :focus-visible and under the pointer (transitions off). A stop "pairs" when
// its focused fill and ink equal its hovered ones; "lone" when hover changes
// the fill and focus does not. The ring is focusring.js's job.
//   BASE=... [THEME=dark] [W=1440] [STOPS=30] [TABS=...] node focusbox.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440), H = W < 600 ? 844 : 900;
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  await page.evaluate(() => {
    const s = new CSSStyleSheet();
    s.replaceSync('*, *::before, *::after { transition: none !important; animation: none !important; }');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
  });
  const STOPS = +(process.env.STOPS || 30);
  const look = () => { const e = document.activeElement; const s = getComputedStyle(e); return [s.backgroundColor, s.backgroundImage, s.color].join('|'); };
  let total = 0, pairs = 0, lone = [], noHover = 0;
  for (const tab of (process.env.TABS || 'dashboard,notes,chat,library,timeline,reminders,graph,documents').split(',')) {
    await page.evaluate((t) => switchTab(t), tab); await page.waitForTimeout(1200);
    await page.mouse.move(1, H - 1);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.mouse.click(720, 2);
    const seen = new Set();
    for (let i = 0; i < STOPS; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const e = document.activeElement; if (!e || e === document.body) return null;
        if (e.matches('input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable], .cm-content')) return null;
        const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return null;
        const s = getComputedStyle(e);
        return { id: (e.id ? '#' + e.id : e.tagName.toLowerCase()) + '.' + [...e.classList].slice(0, 3).join('.'), focus: [s.backgroundColor, s.backgroundImage, s.color].join('|'), x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      if (!info || seen.has(info.id)) continue; seen.add(info.id);
      const rest = await page.evaluate(() => { const e = document.activeElement; window.__fb = e; e.blur(); const s = getComputedStyle(e); return [s.backgroundColor, s.backgroundImage, s.color].join('|'); });
      await page.mouse.move(info.x, info.y); await page.waitForTimeout(60);
      const hov = await page.evaluate(() => { const e = window.__fb; const s = getComputedStyle(e); return [s.backgroundColor, s.backgroundImage, s.color].join('|'); });
      await page.mouse.move(1, H - 1);
      // Back to where the walk was, by keyboard focus again.
      await page.evaluate(() => window.__fb.focus({ focusVisible: true }));
      total++;
      if (hov === rest) { noHover++; continue; }
      if (hov === info.focus) pairs++; else lone.push(`${tab} ${info.id}  rest ${rest}  hover ${hov}  focus ${info.focus}`);
    }
  }
  console.log(`${W} ${process.env.THEME || 'light'}: ${total} stops; hover changes ${total - noHover}; focus shows the hover on ${pairs}; lone ${lone.length}`);
  for (const x of lone.slice(0, +(process.env.SHOW || 25))) console.log('  ' + x);
  await browser.close();
})();
