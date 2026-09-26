// A map whose notes are all filtered out says so, and gives them back.
//
// Before 2026-09-26 the graph drew "Nothing to map yet: save a few notes"
// over a full notebook whenever its own filters took every note off the map,
// with Capture a note as the only action. This drives the three ways a person
// gets there (every legend category off, Hide unlinked on a notebook whose
// notes have no links shown, every note hidden from the node menu) and checks,
// by the rendered boxes, which variant is on screen, what it says, and that
// its button brings the notes back. On a notebook with notes; the empty
// notebook's own state is graph.js's sweep.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphemptyfilter.js
const { boot } = require('./lib.js');

const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

async function state(page) {
  return page.evaluate(() => {
    const shown = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      //: A variant is `display: contents` (it has no box of its own), so it
      //: is on screen when any of its children has one.
      const boxes = [el, ...el.children].map((x) => x.getBoundingClientRect());
      return boxes.some((r) => r.width > 0 && r.height > 0);
    };
    const vis = (el) => el && el.getBoundingClientRect().width > 0;
    const empty = document.getElementById('graph-empty');
    const title = [...empty.querySelectorAll('.empty-title')].find(vis);
    const why = document.getElementById('graph-empty-filtered-why');
    const btn = document.getElementById('graph-empty-show-all');
    const br = btn ? btn.getBoundingClientRect() : null;
    const er = empty.getBoundingClientRect();
    return {
      empty: shown('graph-empty'),
      fresh: shown('graph-empty-fresh'),
      filtered: shown('graph-empty-filtered'),
      title: title ? title.textContent.trim() : null,
      why: why ? why.textContent.trim() : null,
      nodes: gcTab.nodes.length,
      btn: br && br.width ? { w: Math.round(br.width), h: Math.round(br.height), cx: Math.round(br.left + br.width / 2) } : null,
      centre: Math.round(er.left + er.width / 2),
    };
  });
}

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 } });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  const s0 = await state(page);
  check('the map has notes to start with', s0.nodes > 0 && !s0.empty, `${s0.nodes} nodes`);

  // 1. Every legend category off.
  await page.evaluate(async () => {
    const data = await apiJson('/graph');
    for (const n of data.nodes) if (n.category) graphHiddenCategories.add(n.category);
    renderGraph();
  });
  await page.waitForTimeout(1500);
  const s1 = await state(page);
  check('with every category hidden, the filtered empty state shows, not the fresh one', s1.empty && s1.filtered && !s1.fresh, `title "${s1.title}"`);
  check('it names the legend as the cause', /legend/.test(s1.why || ''), `"${s1.why}"`);
  check('its button is a real, centred target', s1.btn && s1.btn.h >= 28 && Math.abs(s1.btn.cx - s1.centre) <= 2, JSON.stringify(s1.btn));
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/graph-filtered-empty-${width}.png` });
  await page.click('#graph-empty-show-all');
  await page.waitForTimeout(2000);
  const s2 = await state(page);
  check('Show every note brings the map back', !s2.empty && s2.nodes === s0.nodes, `${s2.nodes} nodes`);

  // 2. Every note hidden from the node menu, and Hide unlinked on.
  await page.evaluate(async () => {
    for (const n of gcTab.nodes) gcTab.hiddenIds.add(n.id);
    document.getElementById('graph-hide-orphans').checked = true;
    renderGraph();
  });
  await page.waitForTimeout(1500);
  const s3 = await state(page);
  check('hidden from the menu: the filtered state names both causes', s3.filtered && /node menu/.test(s3.why || '') && /Hide unlinked/.test(s3.why || ''), `"${s3.why}"`);
  await page.click('#graph-empty-show-all');
  await page.waitForTimeout(2000);
  const s4 = await state(page);
  const orphans = await page.evaluate(() => document.getElementById('graph-hide-orphans').checked);
  check('and Show every note clears both', !s4.empty && s4.nodes === s0.nodes && !orphans, `${s4.nodes} nodes, Hide unlinked ${orphans}`);

  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
