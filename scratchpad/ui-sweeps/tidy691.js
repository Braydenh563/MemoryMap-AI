// tidy691.js: Tidy (INBOX 691) in the running app.
//
//   bash scratchpad/ui-sweeps/serve.sh 8828 <scratch>/mm-tidy
//   .venv/bin/python scratchpad/ui-sweeps/seed-showcase.py 8828 <scratch>/mm-tidy
//   BASE=http://127.0.0.1:8828 SCRATCH=<scratch> node scratchpad/ui-sweeps/tidy691.js
//   (THEME=dark for dark, WIDTH=390 for a phone; APPLY=1 applies and undoes)
//
// Measures, never looks: the dock's count against `/tidy`'s total; for every
// review, the rows the sheet draws against the server's, and with APPLY=1 that
// applying one row drops the count by one and Undo (the toast's) brings it
// back; the sheet's box inside the viewport; the dock row's height (no wrap);
// console errors. Prints one JSON line per check and a summary.
const { boot, BASE } = require('./lib');

const WIDTH = Number(process.env.WIDTH || 1440);
const PHONE = WIDTH < 600;

(async () => {
  const { browser, page, OUT } = await boot({
    viewport: { width: WIDTH, height: PHONE ? 844 : 900 },
    ...(PHONE ? { hasTouch: true, isMobile: true } : {}),
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const out = { width: WIDTH, theme: process.env.THEME || 'light', checks: [] };
  const check = (name, ok, extra = {}) => { out.checks.push({ name, ok, ...extra }); console.log(JSON.stringify({ name, ok, ...extra })); };

  //: One case for each review: run tidy691-seed.py once on the data dir first.
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  // The module arrives four seconds after boot and fetches the count.
  await page.waitForFunction(() => typeof window.openTidySheet === 'function' && document.getElementById('notes-tidy-count') && !document.getElementById('notes-tidy-count').hidden, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => tidyBadge(true));
  const summary = await page.evaluate(() => apiJson('/tidy'));
  const badge = await page.evaluate(() => {
    const c = document.getElementById('notes-tidy-count');
    const b = document.getElementById('notes-tidy');
    const r = b.getBoundingClientRect();
    const dock = document.querySelector('[data-dock-name="notes"]').getBoundingClientRect();
    b.hidden = true;
    const without = Math.round(document.querySelector('[data-dock-name="notes"]').getBoundingClientRect().height);
    b.hidden = false;
    return { text: c.textContent, hidden: c.hidden, label: b.getAttribute('aria-label'), visible: r.width > 0 && r.height > 0, dockHeight: Math.round(dock.height), withoutTidy: without };
  });
  check('dock count equals /tidy total', badge.text === (summary.total > 99 ? '99+' : String(summary.total)) && !badge.hidden, { badge, total: summary.total });
  //: The dock already wraps between 1280 and 1440 while the connections rail
  //: is open (measured before Tidy); what is checked is that Tidy adds no row.
  check('Tidy adds no dock row', badge.dockHeight === badge.withoutTidy, { dockHeight: badge.dockHeight, withoutTidy: badge.withoutTidy });
  await page.screenshot({ path: `${OUT}/tidy691-dock-${WIDTH}-${out.theme}.png`, clip: { x: 0, y: 0, width: WIDTH, height: 260 } });

  await page.click('#notes-tidy');
  await page.waitForSelector('[data-sheet="tidy"] #tidy-review', { timeout: 10000 });
  await page.waitForTimeout(800);
  const box = await page.evaluate(() => {
    const r = document.querySelector('[data-sheet="tidy"] .sheet-card').getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), vw: innerWidth, vh: innerHeight };
  });
  check('sheet inside the viewport', box.left >= 0 && box.right <= box.vw && box.top >= 0 && box.bottom <= box.vh, box);

  for (const review of summary.reviews) {
    await page.evaluate((key) => { const s = document.getElementById('tidy-review'); s.value = key; s.dispatchEvent(new Event('change')); }, review.key);
    await page.waitForFunction((key) => {
      const list = document.getElementById('tidy-list');
      return TIDY.state && TIDY.state.key === key && list && !/Looking/.test(list.textContent);
    }, review.key, { timeout: 15000 });
    await page.waitForTimeout(300);
    const drawn = await page.evaluate(() => ({
      rows: document.querySelectorAll('#tidy-list .tidy-row').length,
      ticked: document.querySelectorAll('#tidy-list .note-picker-box:checked').length,
      apply: document.getElementById('tidy-apply')?.textContent.trim(),
      option: document.getElementById('tidy-review').selectedOptions[0].textContent,
      first: (() => { const r = document.querySelector('#tidy-list .tidy-row'); return r ? [...r.querySelectorAll('.note-picker-text, .note-picker-meta, .tidy-change')].map((e) => e.textContent) : null; })(),
      overflowX: document.getElementById('tidy-list').scrollWidth > document.getElementById('tidy-list').clientWidth + 1,
    }));
    const server = Math.min(review.count, 300);
    check(`${review.key}: rows drawn`, drawn.rows === server, { drawn: drawn.rows, server: review.count, ticked: drawn.ticked, option: drawn.option, apply: drawn.apply, first: drawn.first });
    check(`${review.key}: no sideways scroll`, !drawn.overflowX);
    await page.screenshot({ path: `${OUT}/tidy691-${review.key}-${WIDTH}-${out.theme}.png` });

    if (process.env.APPLY && drawn.rows) {
      const firstSelectable = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('#tidy-list .tidy-row')];
        const row = rows.find((r) => !r.querySelector('.note-picker-box').disabled);
        if (!row) return false;
        TIDY.state.ticked.clear();
        tidyRows();
        const again = [...document.querySelectorAll('#tidy-list .tidy-row')].find((r) => !r.querySelector('.note-picker-box').disabled);
        again.click();
        return true;
      });
      if (!firstSelectable) continue;
      const before = await page.evaluate((key) => apiJson(`/tidy/${key}`).then((b) => b.count), review.key);
      await page.click('#tidy-apply');
      await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /Undo/.test(t.textContent)), null, { timeout: 15000 });
      const after = await page.evaluate((key) => apiJson(`/tidy/${key}`).then((b) => b.count), review.key);
      const toastText = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()).pop());
      // A rewritten reason or a merge can leave the review's count the same
      // (lookalikes merged, a link named) or drop it by one; never raise it.
      check(`${review.key}: apply changes one`, after < before, { before, after, toast: toastText });
      await page.evaluate(() => { const t = [...document.querySelectorAll('.toast')].pop(); [...t.querySelectorAll('button')].find((b) => /Undo/.test(b.textContent)).click(); });
      await page.waitForTimeout(2500);
      const undone = await page.evaluate((key) => apiJson(`/tidy/${key}`).then((b) => b.count), review.key);
      check(`${review.key}: undo restores`, undone === before, { before, undone });
    }
  }
  const history = await page.evaluate(() => document.getElementById('tidy-history')?.textContent || '');
  if (process.env.APPLY) check('recent runs listed', /Recent runs/.test(history), { history: history.slice(0, 200) });
  check('no console errors', errors.length === 0, { errors });
  const failed = out.checks.filter((c) => !c.ok).length;
  console.log(`SUMMARY ${WIDTH} ${out.theme}: ${out.checks.length - failed} of ${out.checks.length} passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
