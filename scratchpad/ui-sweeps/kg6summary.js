// GRAPH_PLAN KG6 remainder: a topic's card from its legend entry (name,
// shared terms, Summarise; with no model the shared terms answer), and no
// note's label on a topic's plate. Seeds two subjects joined by one bridge, as
// kg6topics.js does. WIDTH=390 for a phone, THEME=dark for dark.
//
//   BASE=http://127.0.0.1:8819 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg6summary.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
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
  await page.waitForTimeout(5000);

  // No label on a plate, at the settled fit and zoomed in.
  const overlap = () => page.evaluate(() => {
    const plates = gcTab.topicPlates || [];
    const boxes = gcTab.labelBoxes || [];
    const hits = boxes.filter((b) => plates.some((p) => b.left < p.right && b.right > p.left && b.top < p.bottom && b.bottom > p.top));
    return { plates: plates.length, labels: boxes.length, on: hits.map((b) => b.text) };
  });
  const fit = await overlap();
  console.log(JSON.stringify(fit));
  check('plates drawn and labels placed', fit.plates >= 2 && fit.labels > 0, `${fit.plates} plates, ${fit.labels} labels`);
  check('no label on a plate', fit.on.length === 0, fit.on.join(' | '));

  // The card, from the legend.
  await page.evaluate((s) => {
    const item = [...document.querySelectorAll('#graph-legend .legend-item')].find((b) => b.textContent.includes(`glaze${s}`));
    item?.click();
  }, s);
  await page.waitForTimeout(500);
  const card = await page.evaluate(() => {
    const box = document.getElementById('graph-topic');
    const r = box.getBoundingClientRect();
    return {
      shown: !box.classList.contains('hidden') && r.width > 0,
      name: box.querySelector('.graph-topic-head strong')?.textContent,
      terms: box.querySelector('.graph-topic-terms')?.textContent,
      w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth,
      sideways: box.scrollWidth > box.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
    };
  });
  console.log(JSON.stringify(card));
  check('the card opens from the legend, named', card.shown && card.name && card.name.startsWith('#glaze'), card.name);
  check('it lists what the notes share', /Shared: #glaze/.test(card.terms || ''), card.terms);
  check('inside the window, nothing sideways', card.right <= card.vw && !card.sideways, `${card.w}px`);
  await page.evaluate(() => [...document.querySelectorAll('#graph-topic button')].find((b) => b.textContent.includes('Summarise'))?.click());
  await page.waitForTimeout(3000);
  const said = await page.evaluate(() => document.querySelector('#graph-topic .graph-topic-summary')?.textContent || '');
  check('Summarise answers (the model, or the shared terms with no model)', /notes about #glaze|\w+/.test(said) && said.length > 10, said);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg6summary-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.evaluate(() => [...document.querySelectorAll('#graph-topic button')].find((b) => b.getAttribute('aria-label') === 'Close the topic' || b.title === 'Close the topic')?.click());
  check('the X closes it', await page.evaluate(() => document.getElementById('graph-topic').classList.contains('hidden')));
  await browser.close();
})();
