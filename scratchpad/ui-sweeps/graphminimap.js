// INBOX 268 (3), verbatim: "the empty minimap goes behind the top bar and sits
// right in the corner with no gap. the mini map probably shouldnt even appear
// when the graph is empty."
//
// Two measurements, against an empty notebook, which is the state the report
// is in: is the box on screen at all, and if it is, where is it relative to
// the graph dock it is supposed to clear.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(3000);
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(4000);

  const read = await page.evaluate(() => {
    const box = document.getElementById('graph-minimap');
    const dock = document.querySelector('#graph-card .dock, #graph-dock, .graph-dock');
    const empty = document.getElementById('graph-empty');
    const r = box?.getBoundingClientRect();
    const d = dock?.getBoundingClientRect();
    const cs = box ? getComputedStyle(box) : null;
    return {
      nodes: typeof graphNodesRef === 'undefined' ? null : (graphNodesRef || []).length,
      emptyShown: empty ? !empty.classList.contains('hidden') : null,
      box: box ? { hidden: box.classList.contains('hidden'), display: cs.display,
        top: Math.round(r.top), left: Math.round(r.left),
        w: Math.round(r.width), h: Math.round(r.height), z: cs.zIndex } : null,
      dock: d ? { top: Math.round(d.top), bottom: Math.round(d.bottom), left: Math.round(d.left) } : null,
      dots: document.querySelectorAll('#graph-minimap-dots *').length,
    };
  });
  console.log(JSON.stringify(read, null, 1));

  // And again with notes in it: "goes behind the top bar" has to be checked
  // in the state the box is meant to be used in, or a fix that only hides it
  // when empty would leave the real collision in place.
  await page.evaluate(async () => {
    const ids = [];
    for (let i = 0; i < 4; i++) {
      const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `minimap probe note ${i}`, category: 'General' }) });
      ids.push(e.id);
    }
    for (let i = 1; i < ids.length; i++) {
      await apiJson('/links', { method: 'POST', body: JSON.stringify({ source_id: ids[0], target_id: ids[i] }) }).catch(() => {});
    }
  });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(600);
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(5000);
  const full = await page.evaluate(() => {
    const box = document.getElementById('graph-minimap');
    const dock = document.querySelector('#graph-card .dock, #graph-dock, .graph-dock');
    const r = box?.getBoundingClientRect();
    const d = dock?.getBoundingClientRect();
    const cs = box ? getComputedStyle(box) : null;
    return {
      nodes: typeof graphNodesRef === 'undefined' ? null : (graphNodesRef || []).length,
      dots: document.querySelectorAll('#graph-minimap-dots *').length,
      hidden: box?.classList.contains('hidden'),
      top: r ? Math.round(r.top) : null,
      cssTop: cs?.top,
      chromeTop: cs ? getComputedStyle(document.getElementById('graph-card') || document.body).getPropertyValue('--graph-chrome-top').trim() : '',
      dockBottom: d ? Math.round(d.bottom) : null,
    };
  });
  console.log('with notes:', JSON.stringify(full));

  const findings = [];
  if (full.dots > 0 && !full.hidden && full.dockBottom && full.top < full.dockBottom) {
    findings.push(`with ${full.nodes} notes the minimap still starts ${full.dockBottom - full.top}px above the bottom of the dock`);
  }
  if (read.emptyShown && read.box && !read.box.hidden && read.box.display !== 'none') {
    findings.push('the minimap box is on screen with nothing to map');
    // Only worth measuring the overlap while it is still drawn.
    if (read.dock && read.box.top < read.dock.bottom) {
      findings.push(`it starts ${read.dock.bottom - read.box.top}px above the bottom of the dock, so it sits under the top bar`);
    }
  }
  if (errors.length) findings.push(`${errors.length} page error(s): ${errors.slice(0, 2)}`);
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
