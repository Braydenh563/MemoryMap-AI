// INBOX 665 (d): the room between the note strip's last control and every
// bordered box round it (the strip, the composer or the edit form, the note
// card), Capture and edit, at W. Negative room is a control on or past a line.
//   BASE=... W=1440 OUT=<dir> node scratchpad/ui-sweeps/seg665-toolgap.js
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: 900 } });
  await page.evaluate(async () => {
    await ensureModule('library');
    await api('/entries', { method: 'POST', body: JSON.stringify({ content: 'toolbar gap note', category: 'General' }) });
    switchTab('notes');
  });
  await page.waitForTimeout(1200);
  const gap = (sel) => page.evaluate((s) => {
    const bar = document.querySelector(s);
    if (!bar) return null;
    const ctl = [...bar.querySelectorAll('button, .select-shell, summary')].filter((el) => el.getClientRects().length && !el.closest('.doc-toolbar-over') && !el.closest('.doc-dock-menu-list'));
    const right = Math.max(...ctl.map((el) => el.getBoundingClientRect().right));
    const out = [];
    for (let el = bar; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      const bw = parseFloat(cs.borderRightWidth);
      const r = el.getBoundingClientRect();
      if (bw > 0 || cs.boxShadow !== 'none' || cs.outlineStyle !== 'none') out.push(`${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')} room ${Math.round((r.right - bw - right) * 10) / 10} (border ${bw}, radius ${cs.borderTopRightRadius})`);
      if (out.length > 3) break;
    }
    const b = bar.getBoundingClientRect();
    return { lines: out, clip: { x: Math.max(0, b.right - 260), y: Math.max(0, b.top - 30), width: Math.min(300, innerWidth - Math.max(0, b.right - 260)), height: b.height + 60 } };
  }, sel);
  await page.evaluate(() => showNotesSection?.('capture'));
  await page.waitForTimeout(700);
  const c = await gap('#note-toolbar');
  console.log('capture', JSON.stringify(c.lines));
  if (process.env.OUT) await page.screenshot({ path: `${process.env.OUT}/gap-cap-${W}.png`, clip: c.clip });
  await page.evaluate(async () => { showNotesSection?.('list'); editingId = Number(document.querySelector('#entry-list > li[data-id]')?.dataset.id); await loadEntries?.(); });
  await page.waitForTimeout(800);
  const e = await gap('.note-edit-toolbar');
  console.log('edit', JSON.stringify(e && e.lines));
  if (process.env.OUT && e) await page.screenshot({ path: `${process.env.OUT}/gap-edit-${W}.png`, clip: e.clip });
  await browser.close();
})();
