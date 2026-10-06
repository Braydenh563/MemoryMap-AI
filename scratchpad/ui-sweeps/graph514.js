// GRAPH_PLAN 514, measured: tags, attachments and unwritten [[names]] as
// nodes, arrows, text fade, link thickness, link force, focus depth and
// direction, the pane's options, and a ghost's click writing its note.
//   BASE=http://127.0.0.1:8807 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/graph514.js (THEME=dark)
// Seeds its own notes (prefix "P514") on top of whatever is there.
const { boot, OUT } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  // A fresh run id, so every name (and the unwritten one) is new each run.
  const seeded = await page.evaluate(async (R) => {
    const post = (content, tags = []) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, tags }) });
    const hub = await post(`# ${R} hub\n\nsee [[${R} spoke a]] and [[${R} never written]]`, [`t${R}`, 'graphs']);
    const a = await post(`# ${R} spoke a\n\nhere`);
    await post(`# ${R} spoke b\n\nlinks in [[${R} hub]]`, [`t${R}`]);
    const c = await post(`# ${R} far\n\nthree away`);
    await apiJson(`/entries/${a.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: c.id }) });
    const form = new FormData();
    form.append('file', new Blob(['plain words'], { type: 'text/plain' }), `${R}.txt`);
    await api(`/entries/${hub.id}/files`, { method: 'POST', body: form, headers: { 'X-Auth-Token': authToken() } });
    return { hub: hub.id, a: a.id, R };
  }, `P${Date.now().toString(36)}`);
  console.log('seeded', JSON.stringify(seeded));
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(4000);
  const types = () => page.evaluate(() => {
    const out = {};
    for (const n of gcTab.nodes) out[n.type || 'note'] = (out[n.type || 'note'] || 0) + 1;
    return out;
  });
  console.log('default types', JSON.stringify(await types()));
  // The panel's open state is remembered across runs: open it only if shut.
  if (await page.evaluate(() => document.getElementById('graph-options').classList.contains('hidden'))) await page.click('#graph-options-toggle');
  await page.waitForTimeout(300);
  console.log('panel', JSON.stringify(await page.evaluate(() => { const p = document.getElementById('graph-options'); const b = document.getElementById('graph-tags').closest('label').getBoundingClientRect(); return { hidden: p.classList.contains('hidden'), top: Math.round(b.top), h: Math.round(b.height), w: Math.round(b.width) }; })));
  for (const id of ['graph-tags', 'graph-attachments', 'graph-unresolved']) {
    await page.click(`label:has(#${id})`);
    await page.waitForTimeout(1500);
  }
  console.log('with tags, files, unwritten', JSON.stringify(await types()));
  const frame = () => page.evaluate(async () => {
    const ctx = document.getElementById('graph-canvas').getContext('2d');
    const n = { heads: 0, widths: [] };
    const fill = ctx.fill, stroke = ctx.stroke;
    ctx.fill = function (path, ...rest) { if (path instanceof Path2D) n.heads++; return fill.call(this, path, ...rest); };
    ctx.stroke = function (...a) { if (a[0] instanceof Path2D) n.widths.push(+(this.lineWidth * gcTab.transform.k).toFixed(2)); return stroke.apply(this, a); };
    gcRequestDraw();
    await new Promise((r) => setTimeout(r, 300));
    ctx.fill = fill; ctx.stroke = stroke;
    return { headBatches: n.heads, linkWidths: [Math.min(...n.widths), Math.max(...n.widths)] };
  });
  console.log('arrows off', JSON.stringify(await frame()));
  if (!(await page.evaluate(() => document.getElementById('graph-display').open))) await page.click('#graph-display > summary');
  await page.click('label:has(#graph-arrows)');
  await page.waitForTimeout(300);
  console.log('arrows on', JSON.stringify(await frame()));
  for (const v of ['0', '100']) {
    await page.evaluate((v) => { const el = document.getElementById('graph-link-width'); el.value = v; el.dispatchEvent(new Event('change')); }, v);
    console.log(`link thickness ${v}`, JSON.stringify(await frame()));
  }
  await page.evaluate(() => { const el = document.getElementById('graph-link-width'); el.value = '50'; el.dispatchEvent(new Event('change')); });
  const labels = async (v) => {
    await page.evaluate((v) => { const el = document.getElementById('graph-label-fade'); el.value = v; el.dispatchEvent(new Event('input')); }, v);
    await page.waitForTimeout(500);
    return page.evaluate(() => ({ k: +gcTab.transform.k.toFixed(2), drawn: gcTab.labelsDrawn, nodes: gcTab.nodes.length }));
  };
  console.log('text fade 0', JSON.stringify(await labels('0')), 'text fade 100', JSON.stringify(await labels('100')), 'text fade 50', JSON.stringify(await labels('50')));
  await page.screenshot({ path: `${OUT}/graph514-${process.env.THEME || 'light'}.png` });
  // Link force: mean link length once settled, weakest and strongest.
  const linkLength = async (v) => {
    await page.evaluate((v) => { const el = document.getElementById('graph-link-force'); el.value = v; el.dispatchEvent(new Event('change')); }, v);
    await page.waitForTimeout(6000);
    return page.evaluate(() => {
      const ls = gcTab.edges.filter((e) => e.kind === 'link').map((e) => Math.hypot(e.source.x - e.target.x, e.source.y - e.target.y));
      return +(ls.reduce((a, b) => a + b, 0) / ls.length).toFixed(1);
    });
  };
  console.log('mean link length at force 0', await linkLength('0'), 'at 100', await linkLength('100'));
  await page.evaluate(() => { const el = document.getElementById('graph-link-force'); el.value = '50'; el.dispatchEvent(new Event('change')); });
  // The ghost writes its note.
  const ghost = await page.evaluate(async (R) => {
    const node = gcTab.nodes.find((n) => n.type === 'unresolved' && n.preview === `${R} never written`);
    if (!node) return 'no ghost';
    gcClickNode(null, node);
    await new Promise((r) => setTimeout(r, 2500));
    const still = gcTab.nodes.some((n) => n.id === node.id);
    const made = gcTab.nodes.find((n) => n.preview === `${R} never written` && n.type !== 'unresolved');
    const linked = made && gcTab.edges.some((e) => (e.source.id === made.id || e.target.id === made.id) && e.kind === 'link');
    return { ghostGone: !still, noteMade: Boolean(made), linkedFromHolder: Boolean(linked) };
  }, seeded.R);
  console.log('ghost click', JSON.stringify(ghost));
  // Focus mode: the section shows; depth and direction change what is drawn.
  const focus = async (set) => {
    await page.evaluate(async ({ hub, set }) => {
      for (const [id, v] of Object.entries(set)) {
        const el = document.getElementById(id);
        if (el.type === 'checkbox') el.checked = v; else el.value = v;
        el.dispatchEvent(new Event('change'));
      }
      graphFocusModeId = hub;
      await renderGraph();
    }, { hub: seeded.a, set });
    await page.waitForTimeout(1500);
    return page.evaluate(() => ({ shown: !document.getElementById('graph-focus-section').classList.contains('hidden'), nodes: gcTab.nodes.length }));
  };
  console.log('focus depth 1', JSON.stringify(await focus({ 'graph-focus-depth': '1' })));
  console.log('focus depth 3', JSON.stringify(await focus({ 'graph-focus-depth': '3' })));
  console.log('focus depth 1, incoming off', JSON.stringify(await focus({ 'graph-focus-depth': '1', 'graph-focus-in': false })));
  console.log('focus depth 1, outgoing off', JSON.stringify(await focus({ 'graph-focus-depth': '1', 'graph-focus-in': true, 'graph-focus-out': false })));
  await focus({ 'graph-focus-depth': '2', 'graph-focus-in': true, 'graph-focus-out': true });
  await page.evaluate(() => { graphFocusModeId = null; renderGraph(); });
  // The pane: open the hub in Notes, then depth 2.
  await page.click('[data-tab="notes"]');
  await page.waitForTimeout(800);
  const pane = async (v) => {
    await page.evaluate(async ({ hub, v }) => {
      if (v) { const el = document.getElementById('graph-pane-depth'); el.value = v; el.dispatchEvent(new Event('change')); }
      else flashEntry(hub);
    }, { hub: seeded.a, v });
    await page.waitForTimeout(2500);
    return page.evaluate(() => ({ count: document.getElementById('graph-pane-count')?.textContent, fold: Boolean(document.getElementById('graph-pane-options')) }));
  };
  console.log('pane depth 1', JSON.stringify(await pane(null)), 'pane depth 2', JSON.stringify(await pane('2')));
  await pane('1');
  await browser.close();
})();
