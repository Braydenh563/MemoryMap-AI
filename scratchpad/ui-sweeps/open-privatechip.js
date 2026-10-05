// OPEN.md (sweep 1004 item 7): the "Tag with Atlas" chip is not drawn on a
// private note. Seeds one plain and one private untagged note, counts the chip
// on each card. Base: plain 1, private 1; fixed: plain 1, private 0.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: +(process.env.W || 1440), height: 900 } });
  const out = await page.evaluate(async () => {
    const mk = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    const a = await mk('plain untagged zebra note ' + Date.now());
    const b = await mk('secret untagged giraffe note ' + Date.now());
    let privacy = 'ok';
    try { await apiJson(`/entries/${b.id}/privacy`, { method: 'POST', body: JSON.stringify({ private: true }) }); } catch (e) { privacy = String(e.message); }
    return { a: a.id, b: b.id, privacy };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const res = await page.evaluate((ids) => {
    // No model in the sandbox hides the chip on every card; say one is running.
    modelStatus = { ollama_running: true };
    renderEntries();
    const card = (id) => document.querySelector(`#entry-list li[data-id="${id}"]`);
    const chips = (id) => { const c = card(id); return c ? c.querySelectorAll('.untagged-ai').length : -1; };
    return { plain: chips(ids.a), priv: chips(ids.b) };
  }, out);
  console.log(JSON.stringify({ seed: out, res }));
  await browser.close();
})();
