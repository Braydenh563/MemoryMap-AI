// WORLD_CLASS_PLAN section 17 row 2: the Manage categories panel's tidy
// suggestions. The server's proposals are tested in tests/test_tidy_categories_17.py
// (the sandbox has no embedding model), so the list is answered here by the
// page's own request being fulfilled with a merge and a removal; Merge and Keep
// it then hit the real endpoints. Measured: the region and its rows fit the
// card at 1440 and 390, the buttons are a target high, Keep it is remembered
// (the next list has one row), and Merge moves the notes for real.
//
//   BASE=http://127.0.0.1:8841 WIDTH=390 THEME=dark \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/tidycats.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const s = Date.now().toString(36).slice(-5);
  const names = { run: `Sweep Running ${s}`, fit: `Sweep Fitness ${s}`, stale: `Sweep Stale ${s}` };
  await page.evaluate(async (names) => {
    const make = async (content, category) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, category }) });
    await make('ran 5k easy', names.run);
    await make('ran 10k hard', names.run);
    for (const w of ['leg day', 'push day', 'pull day']) await make(w, names.fit);
    await apiJson('/categories', { method: 'POST', body: JSON.stringify({ name: names.stale }) });
    await loadEntries();
    await loadCategories();
  }, names);
  const meta = await page.evaluate(() => Object.fromEntries([...categoryMeta.entries()].map(([k, v]) => [k, { id: v.id, count: v.count }])));
  let declined = [];
  await page.route('**/categories/tidy', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const all = [
      { kind: 'merge', from: { id: meta[names.run].id, name: names.run, count: 2 }, into: { id: meta[names.fit].id, name: names.fit, count: 3 }, similarity: 0.91, reason: 'Their notes are about the same things (91% alike).' },
      { kind: 'remove', category: { id: meta[names.stale].id, name: names.stale, count: 0 }, reason: 'Empty, and made 45 days ago.' },
    ].filter((p) => !declined.includes(p.kind));
    await route.fulfill({ json: { proposals: all } });
  });
  await page.route('**/categories/tidy/decline', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    declined.push(body.kind);
    await route.fulfill({ json: { declined: true } });
  });
  await page.evaluate(() => openManageCategories());
  await page.waitForTimeout(1500);
  const read = () => page.evaluate(() => {
    const box = document.querySelector('.manage-suggest[aria-label="Tidy suggestions"]');
    if (!box || box.classList.contains('hidden')) return { shown: false };
    const card = box.closest('.manage-cat-card').getBoundingClientRect();
    const br = box.getBoundingClientRect();
    const rows = [...box.querySelectorAll('.manage-tidy-item')];
    return {
      shown: true,
      head: box.querySelector('.manage-suggest-head').textContent.trim(),
      rows: rows.map((r) => r.querySelector('.manage-suggest-names').textContent),
      reasons: rows.map((r) => r.querySelector('p').textContent),
      buttons: [...box.querySelectorAll('.manage-suggest-row button')].map((b) => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), inside: b.getBoundingClientRect().right <= br.right + 1 })),
      inCard: br.left >= card.left - 1 && br.right <= card.right + 1,
      boxOverflow: box.scrollWidth > box.clientWidth + 1,
      sideways: document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth,
    };
  });
  const first = await read();
  console.log(JSON.stringify(first));
  check('two suggestions show under a head that counts them', first.shown && first.rows.length === 2 && /2 tidy-ups suggested/.test(first.head));
  check('the merge says what goes where, the removal what goes', first.rows[0] === `${names.run} into ${names.fit}` && first.rows[1] === `Remove ${names.stale}`);
  check('each has its reason under it', first.reasons.every((r) => r.length > 10));
  check('four buttons, each at least a small target high, none past the box', first.buttons.length === 4 && first.buttons.every((b) => b.h >= (WIDTH < 600 ? 36 : 24) && b.inside), JSON.stringify(first.buttons));
  check('the region fits the card, nothing sideways', first.inCard && !first.boxOverflow && !first.sideways);

  await page.click(`.manage-suggest[aria-label="Tidy suggestions"] .manage-tidy-item:nth-child(3) button:nth-child(3)`);
  await page.waitForTimeout(900);
  const second = await read();
  check('Keep it is sent and remembered: one suggestion left', declined.join() === 'remove' && second.shown && second.rows.length === 1, JSON.stringify(second.rows));

  await page.click('.manage-suggest[aria-label="Tidy suggestions"] .manage-tidy-item button:nth-child(2)');
  await page.waitForTimeout(2000);
  const after = await page.evaluate(async (names) => {
    await loadCategories();
    return { runGone: !categoryMeta.has(names.run), fit: categoryMeta.get(names.fit)?.count };
  }, names);
  check('Merge folds the category for real: the small one is gone, the large one holds 5', after.runGone && after.fit === 5, JSON.stringify(after));
  const toastUndo = await page.evaluate(() => [...document.querySelectorAll('.toast .toast-action')].map((b) => b.textContent));
  check('and offers Undo', toastUndo.includes('Undo'), JSON.stringify(toastUndo));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
})();
