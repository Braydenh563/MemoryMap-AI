// INBOX 531: the Attach panel draws over the chat's own header.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 700) } });
  await page.evaluate(() => switchTab('chat')); await page.waitForTimeout(1200);
  await page.evaluate(() => openNotePicker()); await page.waitForTimeout(700);
  const out = await page.evaluate(() => {
    const p = document.getElementById('note-picker-panel'); const r = p.getBoundingClientRect();
    const pts = []; for (let y = r.top + 4; y < r.top + 80; y += 12) { const el = document.elementFromPoint(r.left + r.width / 2, y); pts.push(p.contains(el) ? 'panel' : (el.id || el.className.toString().slice(0, 30))); }
    const chain = []; let e = p; while (e && e !== document.body) { const s = getComputedStyle(e); if (s.zIndex !== 'auto' || s.isolation === 'isolate' || s.transform !== 'none' || s.contain.includes('paint') || s.backdropFilter !== 'none') chain.push((e.id || e.className.toString().slice(0, 25)) + ' z' + s.zIndex); e = e.parentElement; }
    return { top: Math.round(r.top), pts, chain };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
