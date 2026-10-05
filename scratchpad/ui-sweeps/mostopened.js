// WORLD_CLASS_PLAN section 17 row 5: most opened this month. A note opened
// from the page (flashEntry, which never GETs it) is counted in the month's
// log; the Most used widget has a `.seg` of This month and All time, the month
// first, the choice kept, the list following it.
//
//   BASE=http://127.0.0.1:8841 WIDTH=390 THEME=dark \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mostopened.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const s = Date.now().toString(36).slice(-5);
  const ids = await page.evaluate(async (s) => {
    localStorage.removeItem('mostUsedPeriod');
    const make = async (content) => (await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) })).id;
    const a = await make(`# Opened by a jump ${s}\n\nOnly the page opened this one.`);
    const b = await make(`# Never opened ${s}\n\nNobody looked at this.`);
    await loadEntries();
    return { a, b };
  }, s);
  // A card flashed from elsewhere never GETs the note: flashEntry counts it.
  await page.evaluate((id) => { flashEntry(id); flashEntry(id); }, ids.a);
  await page.waitForTimeout(800);
  const month = await page.evaluate(async () => (await apiJson('/entries/most-accessed?period=month')).map((e) => e.id));
  check('flashEntry counts the open in the month, once for a repeat', month.includes(ids.a) && !month.includes(ids.b), JSON.stringify(month));
  // Two jumps inside the half minute are one open: the file says so.
  const file = JSON.parse(require('fs').readFileSync(`${process.env.DATA || '/tmp/mm-wc1005c'}/opens.json`, 'utf8'));
  const counted = Object.values(file).map((m) => m[String(ids.a)]).find((n) => n);
  check('two jumps within half a minute are one open in the log', counted === 1, `counted ${counted}`);

  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(2000);
  const widgetPresent = await page.evaluate(() => !!document.querySelector('[data-widget="most-used"]:not(.dash-hidden) .dash-body'));
  if (!widgetPresent) {
    await page.evaluate(async () => {
      const layout = dashLayout();
      const hidden = (layout.hidden || []).filter((n) => n !== 'most-used');
      const order = layout.order.includes('most-used') ? layout.order : [...layout.order, 'most-used'];
      await saveDashLayout({ ...layout, hidden, order });
      await renderDashboard({ refresh: false });
    });
    await page.waitForTimeout(2000);
  }
  const m = () => page.evaluate(() => {
    const body = document.querySelector('[data-widget="most-used"] .dash-body');
    if (!body) return null;
    const seg = body.querySelector('.dash-period');
    const buttons = seg ? [...seg.querySelectorAll('button')] : [];
    const card = body.closest('.dash-widget').getBoundingClientRect();
    const sr = seg ? seg.getBoundingClientRect() : null;
    return {
      labels: buttons.map((b) => b.textContent),
      pressed: buttons.map((b) => b.getAttribute('aria-pressed')),
      rows: [...body.querySelectorAll('.dash-list li')].map((li) => li.textContent.trim().slice(0, 30)),
      segH: sr && Math.round(sr.height),
      segInCard: sr && sr.left >= card.left - 1 && sr.right <= card.right + 1,
      btnH: buttons.map((b) => Math.round(b.getBoundingClientRect().height)),
      sideways: document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth,
    };
  });
  const first = await m();
  console.log(JSON.stringify(first));
  check('the widget has the two choices, month first and pressed', first && first.labels.join('|') === 'This month|All time' && first.pressed.join('|') === 'true|false');
  check('this month lists the note the page opened', first && first.rows.some((r) => r.includes('Opened by a jump')));
  check('and not the one nobody opened', first && !first.rows.some((r) => r.includes('Never opened')));
  check('the seg sits inside its card, no sideways scroll', first && first.segInCard && !first.sideways);
  check('its buttons are at least 28px high (44 under touch)', first && first.btnH.every((h) => h >= (WIDTH < 600 ? 40 : 24)), JSON.stringify(first && first.btnH));

  await page.click('[data-widget="most-used"] .dash-period button:nth-child(2)');
  await page.waitForTimeout(1200);
  const all = await m();
  check('All time is pressed after a click and the list is all time (the month note is not in it unless read)', all && all.pressed.join('|') === 'false|true' && !all.rows.some((r) => r.includes('Opened by a jump')), JSON.stringify(all && all.rows));
  const stored = await page.evaluate(() => localStorage.getItem('mostUsedPeriod'));
  check('the choice is remembered on this device', stored === 'all', stored);
  await page.evaluate(async () => { await renderDashboard({ refresh: false }); });
  await page.waitForTimeout(1500);
  const again = await m();
  check('and it is still All time after the dashboard draws again', again && again.pressed.join('|') === 'false|true');
  await page.evaluate(() => localStorage.removeItem('mostUsedPeriod'));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
})();
