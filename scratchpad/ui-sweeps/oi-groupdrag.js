// GRAPH_PLAN's open line: a lasso selection drags as one. Seeds a few notes,
// selects three, drags one of them with trusted mouse events, and measures how
// far each selected note and an unselected one moved in world units.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {boot} = require('./lib.js');
(async () => {
  const {browser, page} = await boot();
  let fails = 0;
  const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${got}`); if (!ok) fails++; };
  await page.evaluate(async () => {
    const have = (await apiJson('/entries?limit=5')).length || 0;
    for (let i = have; i < 8; i++) {
      await apiJson('/entries', {method: 'POST', body: JSON.stringify({content: `Graph fixture note ${i}`})});
    }
  });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const i = document.querySelector('input[name="graph-layout"][value="force"]');
    if (i) { i.checked = true; i.dispatchEvent(new Event('change', {bubbles: true})); }
  });
  await page.waitForTimeout(6000);
  const plan = await page.evaluate(() => {
    const nodes = gcNodes.filter((n) => !n.isGroup);
    if (nodes.length < 4) return null;
    const [a, b, c, d] = nodes;
    gcSelected.clear();
    for (const n of [a, b, c]) gcSelected.add(n.id);
    gcSelectionChanged();
    const r = document.getElementById('graph-canvas').getBoundingClientRect();
    const t = gcTransform;
    return {ids: [a.id, b.id, c.id, d.id], k: t.k,
      at: {x: r.left + a.x * t.k + t.x, y: r.top + a.y * t.k + t.y},
      before: Object.fromEntries([a, b, c, d].map((n) => [n.id, [n.x, n.y]]))};
  });
  if (!plan) { console.log('FAIL fewer than four notes on the map'); await browser.close(); process.exit(1); }
  await page.mouse.move(plan.at.x, plan.at.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(plan.at.x + i * 6, plan.at.y + i * 3);
  await page.mouse.up();
  await page.waitForTimeout(150);
  const after = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    const n = gcById.get(id);
    return [id, [n.x, n.y]];
  })), plan.ids);
  const moved = (id) => Math.hypot(after[id][0] - plan.before[id][0], after[id][1] - plan.before[id][1]);
  const want = Math.hypot(120, 60) / plan.k;
  const [a, b, c, d] = plan.ids;
  console.log(`expected about ${want.toFixed(1)} world units; moved a=${moved(a).toFixed(1)} b=${moved(b).toFixed(1)} c=${moved(c).toFixed(1)} d=${moved(d).toFixed(1)}`);
  check('the note in hand moved', moved(a) > want * 0.7, moved(a).toFixed(1));
  check('the selection came with it', moved(b) > want * 0.7 && moved(c) > want * 0.7, `${moved(b).toFixed(1)}, ${moved(c).toFixed(1)}`);
  check('a note outside the selection did not travel', moved(d) < want * 0.5, moved(d).toFixed(1));
  const pins = await page.evaluate((ids) => ids.map((id) => gcById.get(id).fx), plan.ids.slice(0, 3));
  check('a plain drag pins nothing', pins.every((v) => v == null), JSON.stringify(pins));
  console.log(`findings: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
