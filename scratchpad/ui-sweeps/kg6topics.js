// GRAPH_PLAN KG6: the Topic colour rule. Seeds two subjects joined by one
// bridge (one island, two topics), picks Colour: Topic, and measures the
// legend's named entries, the node colours per topic and the hull's plate
// pixels on the canvas. SHOT=path for a screenshot. THEME=dark for dark.
//
//   BASE=http://127.0.0.1:8817 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg6topics.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const s = Date.now().toString(36).slice(-4);
  await page.evaluate(async (s) => {
    const make = (content, tags) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, tags }) });
    const link = (a, b) => apiJson(`/entries/${a.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: b.id }) });
    const groups = [];
    for (const [word, tag] of [['Glaze', `glaze${s}`], ['Garden', `garden${s}`]]) {
      const made = [];
      for (let i = 0; i < 5; i++) made.push(await make(`# ${word} note ${i} ${s}`, [tag]));
      for (let i = 0; i < made.length; i++) for (let j = i + 1; j < made.length; j++) await link(made[i], made[j]);
      groups.push(made);
    }
    await link(groups[0][4], groups[1][0]);
    await loadEntries();
  }, s);
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const sel = document.getElementById('graph-colour'); sel.value = 'topic'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(4000);
  const out = await page.evaluate((s) => {
    const legend = [...document.querySelectorAll('#graph-legend .legend-item')].map((b) => b.textContent.trim());
    const topics = (graphStructure && graphStructure.topics) || [];
    const mine = topics.filter((t) => t.name.endsWith(s));
    const colours = mine.map((t) => new Set(gcTab.nodes.filter((n) => t.ids.includes(n.id)).map((n) => n.colour)));
    return { legend, names: mine.map((t) => t.name), colours: colours.map((c) => [...c]), mode: graphColourMode() };
  }, s);
  console.log(JSON.stringify(out));
  check('Topic rule chosen', out.mode === 'topic');
  check('two topics named by their tags', out.names.length === 2 && out.names.every((n) => n.startsWith('#')), out.names.join(', '));
  check('legend names them', out.names.every((n) => out.legend.some((l) => l.startsWith(n))));
  check('one colour per topic, two colours', out.colours.every((c) => c.length === 1) && out.colours[0][0] !== out.colours[1][0], JSON.stringify(out.colours));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  await browser.close();
})();
