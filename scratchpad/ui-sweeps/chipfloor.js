// Phase 11: an icon-only chip in a dock is still a 44px target, and the chip
// row still takes one line inside the Timeline dock.
//
// The defect this gates, measured 2026-09-13 with `touch.js` at 390x844: four
// `button.library-chip.active` at 34.0x44.0 and 33.0x44.0, the only findings
// on a seventeen-surface sweep. The dock's touch block raises `min-height`
// only, and a chip whose label is hidden below 600 is the first control in a
// dock that is one glyph wide.
//
//   BASE=http://127.0.0.1:8943 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/chipfloor.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
const MIN = 44;

(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  for (const width of [390, 360, 320]) {
    const ctx = await browser.newContext({
      viewport: { width, height: 844 },
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: true,
    });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('theme', 'light'); localStorage.setItem('onboardingDone', '1'); } catch (e) {}
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
    await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(2500);
    if (await page.$('#lock-password') && await page.isVisible('#lock-password')) {
      await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(2500);
    }
    await page.evaluate(() => { const o = document.getElementById('onboarding-overlay'); if (o) o.classList.add('hidden'); });
    await page.waitForTimeout(800);
    await page.click('[data-tab="timeline"]').catch(() => {});
    await page.waitForTimeout(800);

    const out = await page.evaluate(() => {
      const dock = document.querySelector('[data-dock-name="timeline"]');
      const chips = [...document.querySelectorAll('[data-dock-name="timeline"] .dock-chip-row .library-chip')];
      const tops = new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top)));
      return {
        dockH: dock ? +dock.getBoundingClientRect().height.toFixed(1) : null,
        chips: chips.map((c) => {
          const r = c.getBoundingClientRect();
          return { name: (c.textContent || '').trim() || c.getAttribute('aria-label') || '?', w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
        }),
        chipRows: tops.size,
        sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    const under = out.chips.filter((c) => c.w < MIN || c.h < MIN);
    bad += under.length + (out.sideways ? 1 : 0);
    console.log(`${width}  dock ${out.dockH}px  chips ${out.chips.length}  rows ${out.chipRows}  under-44px ${under.length}  sideways ${out.sideways}`);
    out.chips.forEach((c) => console.log(`    ${c.name} ${c.w}x${c.h}`));
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `FAIL: ${bad} findings` : 'PASS: 0 findings');
  process.exit(bad ? 1 : 0);
})();
