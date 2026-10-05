// Entity merge Undo (INBOX 553(a)): the toast offers Undo, and Undo splits
// the two names back. Seeds two entities with SEED (a python script writing
// the data dir) before the page loads, then merges through the API from the
// page, shows the app's own toast, clicks Undo and reads the result back.
//   BASE=http://127.0.0.1:8841 SCRATCH=/tmp/x node arch1005-entitymerge.js
// THEME=dark for dark; WIDTH=390 for a phone.
const { boot } = require('./lib.js');

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page, OUT } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600 });
  const result = await page.evaluate(async () => {
    await ensureModule('inbox');
    const list = await apiJson('/entities');
    const rows = (list.entities || list.items || list).filter((e) => e.name === 'Sammy' || e.name === 'Sam Lee');
    const gone = rows.find((e) => e.name === 'Sammy');
    const keep = rows.find((e) => e.name === 'Sam Lee');
    if (!gone || !keep) return { error: 'seed missing', rows: list };
    const done = await apiJson(`/entities/${gone.id}/merge`, { method: 'POST', body: JSON.stringify({ into_id: keep.id }) });
    toastEntityMerge(done, gone.id, keep.id);
    return { gone: gone.id, keep: keep.id, undoId: done.undo_id };
  });
  if (result.error) { console.log('FAIL', JSON.stringify(result).slice(0, 400)); await browser.close(); process.exit(1); }
  await page.waitForTimeout(400);
  const toast = await page.evaluate(() => {
    const host = [...document.querySelectorAll('.toast, [role="status"] *')].find((el) => /Merged into/.test(el.textContent || ''));
    if (!host) return null;
    const box = host.getBoundingClientRect();
    const button = [...host.querySelectorAll('button')].find((b) => /Undo/.test(b.textContent || ''));
    const bb = button ? button.getBoundingClientRect() : null;
    return { text: host.textContent.trim().slice(0, 80), box: [box.left, box.top, box.right, box.bottom], inView: box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, undo: bb ? [bb.width, bb.height] : null };
  });
  console.log('toast', JSON.stringify(toast));
  await page.screenshot({ path: `${OUT}/arch1005-entitymerge-${width}-${process.env.THEME || 'light'}.png` });
  await page.locator('button', { hasText: 'Undo' }).last().click();
  await page.waitForTimeout(800);
  const after = await page.evaluate(async (ids) => {
    const list = await apiJson('/entities');
    const rows = (list.entities || list.items || list);
    return { goneListed: rows.some((e) => e.id === ids.gone), keepListed: rows.some((e) => e.id === ids.keep) };
  }, result);
  console.log('after undo', JSON.stringify(after));
  const ok = toast && toast.inView && toast.undo && after.goneListed && after.keepListed;
  console.log(ok ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
