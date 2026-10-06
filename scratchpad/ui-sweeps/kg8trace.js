// GRAPH_PLAN KG8: a Trace hop shows how many other reasons its two notes
// relate (+N on the label) and spells them out on hover (the title).
//
//   BASE=http://127.0.0.1:8817 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg8trace.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const s = Date.now().toString(36).slice(-4);
  const ids = await page.evaluate(async (s) => {
    const make = (content, tags) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, tags }) });
    const a = await make(`# Trace start ${s}`, [`tr${s}`]);
    const hub = await make(`# Trace hub ${s}`, []);
    const b = await make(`# Trace end ${s}`, [`tr${s}`]);
    const c = await make(`# Trace side ${s}`, []);
    const link = (x, y) => apiJson(`/entries/${x.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: y.id }) });
    await link(a, b); await link(a, c); await link(b, c);
    await loadEntries();
    return { a: a.id, b: b.id };
  }, s);
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(3000);
  await page.evaluate((ids) => { setTraceEnd('from', ids.a); setTraceEnd('to', ids.b); }, ids);
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => [...document.querySelectorAll('#graph-trace-result .graph-trace-connector')].map((c) => ({
    title: c.title, label: c.querySelector('.graph-trace-connector-label')?.textContent || '',
    w: Math.round(c.getBoundingClientRect().width),
  })));
  console.log(JSON.stringify(out));
  check('one hop', out.length === 1);
  check('label counts the other reasons', out[0] && /\+2$/.test(out[0].label), out[0] && out[0].label);
  check('hover spells them out', out[0] && out[0].title.includes('both tagged') && out[0].title.includes('both linked with'), out[0] && out[0].title);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('no sideways scroll', !sideways);
  await browser.close();
})();
