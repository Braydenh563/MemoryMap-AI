// One selection mode, two surfaces: does the Timeline's Select button say what
// is true when you arrive there with Notes already in select mode?
// (`agent-remaining/ui-phase-11.md`: "`selectMode` is one flag for two tabs").
//
//   BASE=http://127.0.0.1:8792 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     timeout 110 node scratchpad/ui-sweeps/selectflag.js
//
// The shared flag is TIMELINE_PLAN decision 6 and is not the question. The
// question is whether the *button* is in step with it: a toggle that is on and
// drawn as off is a control whose first press does the opposite of what it
// offers, and that is the shape the report describes.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    for (let i = 0; i < 3; i++) {
      await fetch('/entries', { method: 'POST', headers: h, body: JSON.stringify({ content: `a note about netting, number ${i}` }) });
    }
  });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  await page.click('#select-btn');
  await page.waitForTimeout(500);

  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById('timeline-view-table')?.click());
  await page.waitForTimeout(1200);

  const onArrival = await page.evaluate(() => {
    const btn = document.getElementById('timeline-select-btn');
    return {
      pressed: btn.getAttribute('aria-pressed'),
      lit: btn.classList.contains('is-on'),
      barShown: !document.getElementById('timeline-batch-bar').classList.contains('hidden'),
      ticks: document.querySelectorAll('#tab-timeline .timeline-col-select:not(.hidden)').length,
    };
  });
  check(
    'the Timeline Select button arrives in step with the mode Notes left on',
    onArrival.pressed === 'true' && onArrival.lit === true,
    JSON.stringify(onArrival)
  );
  check(
    'and its bar and tick column are showing, so the mode is visible rather than only true',
    onArrival.barShown === true && onArrival.ticks > 0,
    JSON.stringify(onArrival)
  );

  // Through the element, not the pointer: the button lives inside the dock's
  // Options menu (Phase 8 put it there at the seven-control ceiling), so a real
  // click needs the menu open and that is not what is being measured here.
  await page.evaluate(() => document.getElementById('timeline-select-btn').click());
  await page.waitForTimeout(600);
  const afterPress = await page.evaluate(() => {
    const btn = document.getElementById('timeline-select-btn');
    return {
      pressed: btn.getAttribute('aria-pressed'),
      barShown: !document.getElementById('timeline-batch-bar').classList.contains('hidden'),
      notesBar: !document.getElementById('batch-bar').classList.contains('hidden'),
    };
  });
  check(
    'pressing it turns the one mode off on both surfaces',
    afterPress.pressed === 'false' && afterPress.barShown === false && afterPress.notesBar === false,
    JSON.stringify(afterPress)
  );

  console.log(fails.length ? `FAILURES: ${fails.length}` : 'all clear');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
