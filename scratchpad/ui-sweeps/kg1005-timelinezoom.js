// TIMELINE_PLAN section 8: Ctrl and the wheel (or a pinch) steps the date
// groups, + and - on a row do the same, the row at the top keeps its place;
// Options, Time range, On this day lists today's date in earlier years.
//
//   BASE=http://127.0.0.1:8853 WIDTH=1440 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg1005-timelinezoom.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const s = Date.now().toString(36).slice(-5);
  await page.evaluate(async (s) => {
    for (let i = 0; i < 30; i += 1) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `# Zoom ${s} ${i}\n\nnote ${i}` }) });
    }
    localStorage.setItem('timeline-scale', 'day');
    localStorage.setItem('timeline-view', 'feed');
  }, s);
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const sel = $('timeline-scale'); sel.value = 'day'; sel.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(400);
  const scale = () => page.evaluate(() => $('timeline-feed').dataset.scale);
  const box = await page.evaluate(() => { const r = $('timeline-scroll').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 80 }; });
  await page.mouse.move(box.x, box.y);
  const zoomBefore = await page.evaluate(() => window.devicePixelRatio);
  // Out: one notch with Ctrl held is one step coarser.
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 100);
  await page.keyboard.up('Control');
  await page.waitForTimeout(500);
  const s1 = await scale();
  check('Ctrl and the wheel out: day to week', s1 === 'week', s1);
  // A pinch: a stream of small ctrl deltas inside one gesture is one step.
  await page.keyboard.down('Control');
  for (let i = 0; i < 12; i += 1) await page.mouse.wheel(0, 20);
  await page.keyboard.up('Control');
  await page.waitForTimeout(500);
  const s2 = await scale();
  check('a pinch out is one step: week to month', s2 === 'month', s2);
  await page.waitForTimeout(400);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await page.waitForTimeout(500);
  const s3 = await scale();
  check('in again: month to week', s3 === 'week', s3);
  const zoomAfter = await page.evaluate(() => window.devicePixelRatio);
  check('the page itself did not zoom', zoomBefore === zoomAfter);
  // Keys on a focused row; the row keeps focus.
  const key = await page.evaluate(() => { const row = document.querySelector('#timeline-scroll .timeline-row'); row.focus(); return row.dataset.key; });
  await page.keyboard.press('-');
  await page.waitForTimeout(400);
  const k = await page.evaluate(() => ({ scale: $('timeline-feed').dataset.scale, focused: document.activeElement?.dataset?.key || '' }));
  check('- on a row: coarser, and the row keeps focus', k.scale === 'month' && k.focused === key, JSON.stringify(k));
  await page.keyboard.press('+');
  await page.waitForTimeout(400);
  check('+ on a row: finer', (await scale()) === 'week');
  // The table has no date groups: the gesture is left alone there.
  await page.evaluate(() => $('timeline-view-table').click());
  await page.waitForTimeout(500);
  await page.mouse.move(box.x, box.y);
  await page.waitForTimeout(400);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 100);
  await page.keyboard.up('Control');
  await page.waitForTimeout(400);
  const tableScale = await page.evaluate(() => $('timeline-scale').value);
  check('in the table the wheel leaves the grouping alone', tableScale === 'week', tableScale);
  await page.evaluate(() => $('timeline-view-feed').click());
  await page.waitForTimeout(400);
  // On this day: no note today counts, so the range is empty here (every
  // seeded note is today's), and the server was asked with on= and tz=.
  const asked = [];
  page.on('request', (r) => { if (r.url().includes('/timeline?')) asked.push(r.url()); });
  await page.evaluate(() => { const sel = $('timeline-days'); sel.value = 'onthisday'; sel.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(1500);
  const otd = await page.evaluate(() => ({ rows: document.querySelectorAll('#timeline-scroll .timeline-row').length, empty: !$('timeline-empty').classList.contains('hidden') }));
  const url = asked.find((u) => u.includes('on=')) || '';
  check('On this day asks the server for the date', /on=\d\d-\d\d/.test(url) && /tz=-?\d+/.test(url), url.replace(/^.*\/timeline/, ''));
  check("today's notes are not on this day", !otd.rows || otd.empty, JSON.stringify(otd));
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg1005-timelinezoom-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.evaluate(() => { const sel = $('timeline-days'); sel.value = '365'; sel.dispatchEvent(new Event('change')); localStorage.setItem('timeline-scale', 'auto'); localStorage.removeItem('timeline-view'); });
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
})();
