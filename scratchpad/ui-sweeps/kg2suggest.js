// GRAPH_PLAN KG2: the link suggestions panel shows a pair found by structure
// (a shared neighbour and a shared rare tag) with the embedding backend off,
// its combined confidence and each reason; Link keeps the reasons.
//
//   BASE=http://127.0.0.1:8817 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg2suggest.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);

(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.WIDTH || 1440), height: 900 } });
  const s = Date.now().toString(36);
  const ids = await page.evaluate(async (s) => {
    const make = (content, tags = []) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, tags }) });
    const hub = await make(`# Studio plan ${s}\n\nThe year.`);
    const a = await make(`# Glaze trial ${s}\n\nCone 6 celadon`, [`glz${s}`]);
    const b = await make(`# Firing log ${s}\n\nThursday went well`, [`glz${s}`]);
    for (const n of [a, b]) await apiJson(`/entries/${n.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: hub.id }) });
    await loadEntries();
    return { a: a.id, b: b.id };
  }, s);
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => loadLinkSuggestions());
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#link-suggestions .link-suggestion')].map((r) => {
    const why = r.querySelector('.link-suggestion-why');
    const box = r.getBoundingClientRect();
    return {
      text: r.querySelector('.link-suggestion-text')?.textContent || '',
      chip: r.querySelector('.chip')?.textContent || '',
      why: why?.textContent || '', whyH: why ? Math.round(why.getBoundingClientRect().height) : 0,
      w: Math.round(box.width), sideways: r.scrollWidth > r.clientWidth + 1,
    };
  }));
  console.log(JSON.stringify(rows));
  const row = rows.find((r) => r.text.includes(`Glaze trial ${s}`) && r.text.includes(`Firing log ${s}`));
  check('structural pair offered', Boolean(row));
  check('chip is a percentage, not NaN', row && /^\d+%$/.test(row.chip), row && row.chip);
  check('both reasons shown', row && row.why.includes('both linked with') && row.why.includes('both tagged'), row && row.why);
  if (!process.env.WIDTH || Number(process.env.WIDTH) >= 1024) check('reasons line on one line', row && row.whyH <= 20, row && String(row.whyH));
  check('no sideways overflow', row && !row.sideways, JSON.stringify(row));
  await page.evaluate((s) => {
    const r = [...document.querySelectorAll('#link-suggestions .link-suggestion')].find((x) => x.textContent.includes(`Glaze trial ${s}`) && x.textContent.includes(`Firing log ${s}`));
    r.querySelector('button[title="Connect these two notes"]').click();
  }, s);
  await page.waitForTimeout(2000);
  const link = await page.evaluate(async (ids) => (await apiJson(`/entries/${ids.a}/connections`)).outgoing.concat((await apiJson(`/entries/${ids.a}/connections`)).incoming).find((r) => r.id === ids.b), ids);
  console.log(JSON.stringify(await page.evaluate(async (ids) => apiJson(`/entries/${ids.a}/connections`), ids)));
  check('linked, with the reasons as its reason', link && /both/.test(link.reason || ''), link && link.reason);
  await browser.close();
})();
