// WORLD_CLASS_PLAN row 20 (I7): the "Learned from you" line in Settings,
// What it learned. Seeds 24 notes filed by the app (no model: filed by
// words), moves 5 of them by hand, and measures the line: shown, its text,
// on one row with the description above it, its contrast, at the viewport
// and theme given (W, H, THEME). Pass SEED=0 to skip seeding on a rerun.
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.W || 1440);
  const height = Number(process.env.H || 900);
  const { page, browser } = await boot({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(3000);
  if (process.env.SEED === 'moves') {
    await page.evaluate(async () => {
      for (const id of [2, 4, 6, 8, 22]) {
        await apiJson(`/entries/${id}`, { method: 'PUT', body: JSON.stringify({ category: 'Home' }) });
      }
    });
  } else if (process.env.SEED !== '0') {
    await page.evaluate(async () => {
      const made = [];
      for (let i = 0; i < 24; i += 1) {
        const r = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Groceries list ${i}: milk, eggs and bread for the week` }) });
        made.push(r.id);
      }
      await new Promise((ok) => setTimeout(ok, 3000));
      for (const id of [made[0], made[2], made[4], made[6], made[20]]) {
        await apiJson(`/entries/${id}`, { method: 'PUT', body: JSON.stringify({ category: 'Home' }) });
      }
    });
  }
  await page.evaluate(() => openSettingsModal('learned'));
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const line = document.getElementById('learned-from-you');
    const desc = line.previousElementSibling;
    const cs = getComputedStyle(line);
    const b = line.getBoundingClientRect();
    const d = desc.getBoundingClientRect();
    const host = line.closest('.settings-section');
    return {
      hidden: line.classList.contains('hidden'),
      text: line.textContent,
      color: cs.color,
      bg: getComputedStyle(document.querySelector('.modal-content, .settings-modal, body')).backgroundColor,
      fontSize: cs.fontSize,
      box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
      gapBelowDescription: Math.round(b.top - d.bottom),
      leftAlignedWithDescription: Math.round(b.left - d.left),
      overflowsSection: host ? b.right > host.getBoundingClientRect().right + 0.5 : null,
      pageScrollX: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log(JSON.stringify(out));
  await page.screenshot({ path: `/tmp/claude-0/ai1005/learned-${width}-${process.env.THEME || 'light'}.png` });
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
