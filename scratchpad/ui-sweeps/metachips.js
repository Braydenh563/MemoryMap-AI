// The meta recipe on a note's line (WORLD_CLASS_PLAN 1.2, design-1004):
// facts draw no edge and do not answer the pointer; a chip you can press is a
// `.chip-interactive` and tones under it. Seeds two linked notes, then reads
// every chip on the first card at rest and under the pointer.
//   BASE=http://127.0.0.1:8808 THEME=dark node scratchpad/ui-sweeps/metachips.js
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const H = Number(process.env.H || 900);
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const post = async (content, tags) => (await fetch('/entries', { method: 'POST', headers: h, body: JSON.stringify({ content, tags }) })).json();
    const a = await post('# Metachip target\n\nThe target of a link.', ['sweep']);
    const b = await post('# Metachip source\n\nMeet the team tomorrow about the garden.', []);
    await fetch(`/entries/${b.id}/links`, { method: 'POST', headers: h, body: JSON.stringify({ target_id: a.id }) });
  });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(2500);
  const chips = await page.$$eval('#entry-list > li .entry-meta .chip, #entry-list > li .entry-links .chip', (els) =>
    els.slice(0, 14).map((el, i) => {
      el.dataset.sweepChip = String(i);
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { i, cls: el.className, interactive: el.classList.contains('chip-interactive'),
        border: cs.borderTopWidth + ' ' + cs.borderTopStyle, shadow: cs.boxShadow, bg: cs.backgroundColor,
        img: cs.backgroundImage.slice(0, 30), h: Math.round(r.height * 10) / 10, visible: r.width > 0 };
    }));
  for (const c of chips) {
    if (!c.visible) continue;
    await page.hover(`[data-sweep-chip="${c.i}"]`).catch(() => {});
    await page.waitForTimeout(150);
    const after = await page.$eval(`[data-sweep-chip="${c.i}"]`, (el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, img: cs.backgroundImage.slice(0, 30), color: cs.color };
    });
    c.hoverChanges = after.bg !== c.bg || after.img !== c.img;
    const bad = (!c.interactive && c.hoverChanges && !/suggested-tag/.test(c.cls))
      || (!/item-label|suggested-tag/.test(c.cls) && c.border.startsWith('0px') === false);
    console.log(bad ? 'FAIL' : 'ok  ', c.cls.padEnd(44), 'edge', c.border, '| hover tones', c.hoverChanges, '| h', c.h);
  }
  await page.mouse.move(0, 0);
  await browser.close();
})();
