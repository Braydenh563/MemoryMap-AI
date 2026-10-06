const { boot } = require('./lib.js');
(async () => {
  const { browser, page, ctx } = await boot({ viewport: { width: 1440, height: 900 } });
  if (process.env.EXTRA_LS) {
    await page.evaluate((kv) => { for (const [k, v] of Object.entries(JSON.parse(kv))) localStorage.setItem(k, v); }, process.env.EXTRA_LS);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  }
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(4500);
  await page.evaluate(() => openNotePicker());
  await page.waitForTimeout(800);
  await page.click('#note-picker-sources >> text=Images');
  await page.waitForTimeout(600);
  await page.focus('#note-picker-search');
  await page.keyboard.type('sk');
  await page.waitForTimeout(400);
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const i = document.getElementById('note-picker-search');
    const cs = getComputedStyle(i); const b = i.getBoundingClientRect();
    const f = i.closest('.search-field'); const fb = f && f.getBoundingClientRect();
    const kids = [...(i.closest('.search-field') || i.parentElement).children].map((k) => k.tagName + '.' + k.className);
    const oc = cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineOffset;
    return { kids, oc, parent: i.parentElement.className, chain: [i.parentElement.className, i.parentElement.parentElement.className],
      input: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)], border: cs.borderTopWidth + ' ' + cs.borderTopStyle, bg: cs.backgroundColor,
      field: fb && [Math.round(fb.x), Math.round(fb.y), Math.round(fb.width), Math.round(fb.height)] };
  });
  console.log(JSON.stringify(r));
  await page.locator('#note-picker-panel').screenshot({ path: '/tmp/claude-0/attach-images.png' });
  await browser.close();
})();
