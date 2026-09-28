// The Agent activity panel's alignment, measured (owner report, 2026-09-23:
// "these elements need to be better designed as they are not aligned and
// look unprofessional").
//
// Seeds three runs (two background jobs, one skill with steps), opens the
// panel at the owner's 1184x760 window and prints the numbers the report is
// about: the header's controls' centre lines, each row's left edges for the
// name, the detail and the bar, the state pill's right edge, and whether a
// long name truncates rather than wraps. Exit code 1 when any of them fails.
//
//   BASE=http://127.0.0.1:8791 node scratchpad/ui-sweeps/monitorgrid.js
const {boot, OUT} = require('./lib.js');
(async () => {
  const {browser, page} = await boot({viewport: {width: 1184, height: 760}});
  const r = await page.evaluate(() => {
    const a = addAgentRun({kind: 'job', name: 'Captioning photo_2026-09-20_long_filename_example.jpg', icon: 'ph:gear',
      detail: 'Describing the picture with the vision model so it can be searched later'});
    a.progress = 0.4; renderAgentRunSummary(a);
    const b = addAgentRun({kind: 'job', name: 'Reading text in an image', icon: 'ph:gear', detail: 'Page 1'});
    addAgentRun({kind: 'skill', name: 'Summarise my week', icon: 'ph:sparkle', steps: ['Find notes', 'Write it']});
    endAgentRun(b, {state: 'done'});
    setAgentMonitorVisible(true);
    const R = (el) => {
      if (!el || el.offsetParent === null) return null;
      const x = el.getBoundingClientRect();
      return {l: +x.left.toFixed(1), r: +x.right.toFixed(1), t: +x.top.toFixed(1), b: +x.bottom.toFixed(1),
        cy: +((x.top + x.bottom) / 2).toFixed(1), h: +x.height.toFixed(1)};
    };
    const hdr = document.querySelector('.monitor-header');
    const out = {headBottom: +hdr.getBoundingClientRect().bottom.toFixed(1), headMargin: getComputedStyle(hdr).margin};
    out.head = [hdr.querySelector('.monitor-title'), ...hdr.querySelectorAll('button')].map((el) =>
      ({t: (el.textContent.trim() || el.getAttribute('aria-label')).slice(0, 16), ...R(el)}));
    out.rows = [...document.querySelectorAll('.agent-run-row')].map((row) => {
      const s = row.querySelector('summary');
      const name = row.querySelector('.agent-run-name');
      const st = getComputedStyle(row.querySelector('.agent-run-state'));
      return {row: R(row), summary: R(s), icon: R(row.querySelector('.agent-run-icon')), name: R(name),
        nameClipped: name.scrollWidth > name.clientWidth, nameH: name.getBoundingClientRect().height,
        state: R(row.querySelector('.agent-run-state')), pill: st.backgroundColor + ' ' + st.borderRadius,
        meta: R(row.querySelector('.agent-run-meta')), bar: R(row.querySelector('progress')),
        radius: getComputedStyle(row).borderRadius, pad: getComputedStyle(s).padding};
    });
    return out;
  });
  console.log(JSON.stringify(r));
  const fails = [];
  const heads = r.head.filter((h) => h.cy != null).map((h) => h.cy);
  if (Math.max(...heads) - Math.min(...heads) > 1) fails.push(`header centres spread ${Math.max(...heads) - Math.min(...heads)}`);
  const names = r.rows.map((x) => x.name.l);
  if (Math.max(...names) - Math.min(...names) > 1) fails.push(`name left edges ${names}`);
  const rights = r.rows.map((x) => x.state.r);
  if (Math.max(...rights) - Math.min(...rights) > 1) fails.push(`state right edges ${rights}`);
  for (const x of r.rows) {
    if (x.meta && Math.abs(x.meta.l - x.name.l) > 1) fails.push(`meta left ${x.meta.l} vs name ${x.name.l}`);
    if (Math.abs(x.state.cy - x.name.cy) > 1) fails.push(`state cy ${x.state.cy} vs name ${x.name.cy}`);
    if (x.nameH > 24) fails.push(`name wraps (${x.nameH}px)`);
  }
  // A step starts under its run's icon, and the log toggle says what it does.
  const more = await page.evaluate(() => {
    const row = document.querySelectorAll('.agent-run-row')[2];
    row.open = true;
    const step = row.querySelector('.agent-run-step > summary').getBoundingClientRect().left;
    const icon = row.querySelector('.agent-run-icon').getBoundingClientRect().left;
    const t = document.getElementById('agent-monitor-log-toggle');
    const before = t.getAttribute('aria-label');
    t.click();
    const after = t.getAttribute('aria-label');
    const logShown = !document.getElementById('agent-monitor-logs').classList.contains('hidden');
    t.click();
    return {stepLeft: +step.toFixed(1), iconLeft: +icon.toFixed(1), before, after, logShown};
  });
  console.log(JSON.stringify(more));
  if (Math.abs(more.stepLeft - more.iconLeft) > 1) fails.push(`step left ${more.stepLeft} vs icon ${more.iconLeft}`);
  if (!more.logShown || more.before === more.after) fails.push('log toggle did not switch');
  await page.waitForTimeout(700);
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'OK monitor grid');
  await page.screenshot({path: OUT + '/monitorgrid.png', clip: {x: 0, y: 300, width: 480, height: 460}});
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
