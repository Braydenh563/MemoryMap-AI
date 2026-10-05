// Screenshots for the 2026-10-05 inventions (a look, not a measurement:
// inv1005-features.js holds the numbers). SCRATCH=<dir> for where they go.
const { boot, BASE } = require('./lib.js');
const { openDoc } = require('./docopen.js');

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, ctx, page, OUT } = await boot({ viewport: { width, height: 900 } });
  const tag = `${process.env.THEME || 'light'}-${width}`;
  await openDoc(page, { title: 'Margin look', content: 'Start.\n\n' });
  await page.evaluate(() => setDocView('live'));
  await page.evaluate(() => { localStorage.setItem('doc-margin-reader', '0'); document.getElementById('doc-margin-reader').click(); });
  await page.click('#doc-editor .cm-content');
  await page.keyboard.press('Control+End');
  await page.keyboard.type('The flat rent is 950 pounds a month and is paid on the first of the month.', { delay: 5 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/inv1005-margin-${tag}.png` });
  await page.evaluate(() => openSettingsModal('data'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('import-app-box').scrollIntoView());
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/inv1005-data-${tag}.png` });
  const clip = await ctx.newPage();
  await clip.setViewportSize({ width: Math.min(width, 560), height: 520 });
  const fragment = encodeURIComponent(JSON.stringify({ u: 'https://example.org/a-long-article', t: 'A long article', s: '' }));
  await clip.goto(`${BASE}/clip.html#${fragment}`, { waitUntil: 'domcontentloaded' });
  await clip.waitForTimeout(800);
  await clip.screenshot({ path: `${OUT}/inv1005-clip-${tag}.png` });
  console.log('shots in', OUT);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
