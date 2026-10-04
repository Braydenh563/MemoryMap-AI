// INBOX 474: a note's connections row. (a) "+N more links" opens and must
// close again ("Show less"); (b) a chip's label is plain text, never a raw
// Markdown token; (c) a Markdown link in a note body is an anchor.
// Seeds once (marker LCSEED). OVERRIDE_JS="note-cards.js=/path/base.js" for a
// before run. BASE=http://127.0.0.1:8875 node scratchpad/ui-sweeps/linkchips.js
const { boot } = require('./lib.js');
const MARK = 'LCSEED';
const TARGETS = [
  `something lol [something](https://something.com/a/long/path/that/gets/cut) tail ${MARK}`,
  `**Bold start** and _italic_ words about ${MARK} bread`,
  `# ${MARK} Heading target with [[wiki link]] and \`code\``,
  `${MARK} A broken [half link](https://example.com/x`,
  `${MARK} Pictures ![alt text](https://example.com/p.png) are dropped`,
];
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const ids = await page.evaluate(async ({ MARK, TARGETS }) => {
    const r = await apiJson('/entries?limit=200');
    const list = (r.items || r).filter((e) => (e.content || '').includes(MARK));
    if (list.length) return list.map((e) => e.id);
    const out = [];
    for (const content of TARGETS) {
      const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
      out.push(e.id);
    }
    const hub = await apiJson('/entries', { method: 'POST', body: JSON.stringify({
      content: `# ${MARK} Hub note\n\nA body with a [Markdown link](https://example.com/page) and **bold**.` }) });
    for (const t of out) await apiJson(`/entries/${hub.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: t }) });
    return [hub.id, ...out];
  }, { MARK, TARGETS });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  const state = () => page.evaluate((MARK) => {
    const li = [...document.querySelectorAll('#entry-list > li')].find((l) => l.textContent.includes('Hub note'));
    if (!li) return { found: false };
    const row = li.querySelector('.entry-links');
    const vis = (el) => el.offsetParent !== null;
    const chips = [...row.querySelectorAll('.chip.link, .link-connection .chip')];
    const more = row.querySelector('.entry-links-more');
    const a = li.querySelector('.entry-content a');
    return {
      found: true,
      shownChips: chips.filter(vis).length,
      labels: chips.map((c) => c.textContent.trim()),
      moreText: more ? more.textContent : null,
      moreExpanded: more ? more.getAttribute('aria-expanded') : null,
      bodyAnchor: a ? { text: a.textContent, href: a.getAttribute('href'), tag: a.tagName } : null,
      bodyText: li.querySelector('.entry-content').textContent.slice(0, 120),
    };
  }, MARK);
  console.log('initial', JSON.stringify(await state()));
  const btn = page.locator('#entry-list > li:has-text("Hub note") .entry-links-more');
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(300);
    console.log('after more', JSON.stringify(await state()));
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(300);
      console.log('after less', JSON.stringify(await state()));
    }
  }
  await page.screenshot({ path: `${process.env.SCRATCH || '/tmp'}/lc.png` });
  await browser.close();
})();
