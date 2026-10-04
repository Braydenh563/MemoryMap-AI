// GRAPH_PLAN KG8 part two: the graph's Filter fold. Chips for the kinds of
// link on the map (a press takes that kind's links off the map, and back),
// and for the properties its notes carry (a press lights those notes).
//
//   BASE=http://127.0.0.1:8819 WIDTH=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg8filter.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const s = Date.now().toString(36).slice(-5);
  const ids = await page.evaluate(async (s) => {
    try { localStorage.removeItem('graph-hidden-link-kinds'); } catch {}
    const make = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    const a = await make(`# Claim ${s}`);
    const b = await make(`---\nstatus: checked${s}\n---\n# Evidence ${s}`);
    const c = await make(`# Aside ${s}`);
    await apiJson(`/entries/${a.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: b.id, link_type: 'supports' }) });
    await apiJson(`/entries/${a.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: c.id }) });
    await loadEntries();
    return { a: a.id, b: b.id, c: c.id };
  }, s);
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    revealGraphOptions();
    const fold = document.getElementById('graph-filter-section');
    if (fold) fold.open = true;
  });
  await page.waitForTimeout(800);
  const chips = await page.evaluate(() => ({
    kinds: [...document.querySelectorAll('#graph-link-kinds .library-chip')].map((c) => `${c.textContent}|${c.getAttribute('aria-pressed')}`),
    props: [...document.querySelectorAll('#graph-prop-chips .library-chip')].map((c) => c.textContent),
  }));
  console.log(JSON.stringify(chips));
  check('a chip per kind of link, pressed (drawn)', chips.kinds.some((k) => /^Supports\d+\|true$/.test(k)) && chips.kinds.some((k) => /^No kind\d+\|true$/.test(k)), chips.kinds.join(' ; '));
  check('a chip per property value', chips.props.some((p) => p.startsWith(`status: checked${s}`)), chips.props.slice(0, 6).join(' ; '));
  const drawn = () => page.evaluate((ids) => gcTab.edges.filter((e) => e.kind === 'link' && [e.source.id ?? e.source, e.target.id ?? e.target].includes(ids.b)).length, ids);
  const before = await drawn();
  await page.evaluate(() => [...document.querySelectorAll('#graph-link-kinds .library-chip')].find((c) => c.textContent.startsWith('Supports'))?.click());
  await page.waitForTimeout(1500);
  const after = await drawn();
  check('Supports off: its link leaves the map', before === 1 && after === 0, `${before} -> ${after}`);
  const sheet = await page.evaluate(() => {
    const panel = document.querySelector('.graph-overlay .graph-options') || document.querySelector('[data-sheet] .sheet-card');
    return panel ? { sideways: panel.scrollWidth > panel.clientWidth + 1 } : null;
  });
  check('the options panel scrolls nothing sideways', sheet && !sheet.sideways);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg8filter-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.evaluate(() => [...document.querySelectorAll('#graph-link-kinds .library-chip')].find((c) => c.textContent.startsWith('Supports'))?.click());
  await page.waitForTimeout(1500);
  check('Supports on again: it is back', (await drawn()) === 1);
  await page.evaluate((s) => [...document.querySelectorAll('#graph-prop-chips .library-chip')].find((c) => c.textContent.startsWith(`status: checked${s}`))?.click(), s);
  await page.waitForTimeout(800);
  const lit = await page.evaluate(() => (graphHighlightIds ? [...graphHighlightIds] : null));
  check('a property chip lights its notes', JSON.stringify(lit) === JSON.stringify([ids.b]), JSON.stringify(lit));
  await browser.close();
})();
