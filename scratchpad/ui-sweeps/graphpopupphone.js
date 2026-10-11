// INBOX 883 and 884: the graph node panel's action row. Phone (default W=390):
// one row, every visible control named by a word or the kebab's labelled rows.
// Desktop (W=1440): the nine icon buttons stay on one row with a tooltip each.
//
//   BASE=http://127.0.0.1:8941 W=390 node scratchpad/ui-sweeps/graphpopupphone.js
const { boot } = require('./lib.js');
const W = Number(process.env.W || 390);
const phone = W < 600;
(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const fails = [];
  await page.evaluate(async () => {
    const list = await apiPagedList('/entries', 50).catch(() => []);
    for (let i = list.length; i < 8; i++) await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Map note ${i} about thesis reading` }) }).catch(() => {});
  });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(5000);
  await page.evaluate(() => setGraphOptionsOpen(false));
  const r = await page.evaluate(async () => {
    const n = (graphNodesRef || []).find((x) => gcIsNote(x));
    await openGraphPopup({ clientX: 200, clientY: 300, stopPropagation() {} }, n);
    await new Promise((res) => setTimeout(res, 800));
    const box = document.getElementById('graph-popup-actions');
    const vis = [...box.querySelectorAll('button')].filter((b) => b.offsetParent);
    const rows = new Set(vis.map((b) => Math.round(b.getBoundingClientRect().top))).size;
    const panel = document.getElementById('graph-popup').getBoundingClientRect();
    return { rows, boxH: Math.round(box.getBoundingClientRect().height), vis: vis.length, unnamed: vis.filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length, bare: vis.filter((b) => !b.textContent.trim()).length, right: Math.round(box.getBoundingClientRect().right), panelRight: Math.round(panel.right) };
  });
  console.log(JSON.stringify(r));
  if (r.rows !== 1) fails.push(`rows ${r.rows}`);
  if (r.unnamed) fails.push('unnamed buttons');
  if (phone && r.bare !== 1) fails.push(`phone: ${r.bare} bare icon buttons (want the kebab only)`);
  if (phone && r.vis !== 3) fails.push(`phone: ${r.vis} visible controls (want 3)`);
  if (phone) {
    await page.tap('#graph-popup-actions .kebab-opener');
    await page.waitForTimeout(700);
    const items = await page.evaluate(() => [...document.querySelectorAll('.menu-item')].filter((b) => b.offsetParent).map((b) => b.textContent.trim()));
    console.log('MENU', JSON.stringify(items));
    if (items.length !== 7) fails.push(`menu has ${items.length} rows`);
    // A row of the sheet must still run its action: Focus sets the focus note.
    await page.tap('.menu-item:has-text("Focus on this note")');
    await page.waitForTimeout(800);
    const focused = await page.evaluate(() => graphFocusModeId !== null && graphFocusModeId !== undefined);
    console.log('FOCUS', focused);
    if (!focused) fails.push('the kebab row Focus did nothing');
  }
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
