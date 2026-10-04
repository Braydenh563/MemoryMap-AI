// INBOX 522: every second-level tab strip is one recipe (.tabs-line): no box,
// text tabs, a 2px accent underline under the active one, one height, one gap,
// no icons. Measures notes, library and the document sidebar strips.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  const probe = () => page.evaluate(() => {
    const out = {};
    for (const id of ['notes-subtabs', 'library-subtabs', 'doc-sidebar-tabs']) {
      const s = document.getElementById(id);
      if (!s || !s.offsetParent) { out[id] = null; continue; }
      const cs = getComputedStyle(s);
      const bs = [...s.querySelectorAll('button')].filter((b) => b.offsetParent);
      const act = bs.find((b) => b.classList.contains('active') || b.getAttribute('aria-selected') === 'true');
      const rects = bs.map((b) => b.getBoundingClientRect());
      const gaps = rects.slice(1).map((r, i) => Math.round((r.left - rects[i].right) * 10) / 10);
      const after = act && getComputedStyle(act, '::after');
      out[id] = {
        h: Math.round(s.getBoundingClientRect().height * 10) / 10,
        bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth + '/' + cs.borderBottomWidth,
        tabH: [...new Set(rects.map((r) => Math.round(r.height * 10) / 10))],
        gaps: [...new Set(gaps)], icons: s.querySelectorAll('i.ph').length,
        fill: act && getComputedStyle(act).backgroundColor,
        underline: after && [after.height, after.backgroundColor, after.transform],
        sticky: cs.position, cls: s.className,
      };
    }
    return out;
  });
  const dump = async (name) => console.log(name, JSON.stringify(await probe(), null, 0));
  const shot = (n) => page.screenshot({ path: (process.env.SCRATCH || '.') + `/shots/${n}.png` });
  const T = process.env.THEME || 'light';
  await page.click('#tab-btn-notes'); await page.waitForTimeout(500); await dump('notes');
  await shot(`subtabs-notes-${W}-${T}`);
  await page.click('#tab-btn-library'); await page.waitForTimeout(600); await dump('library');
  await shot(`subtabs-lib-${W}-${T}`);
  await page.evaluate(async () => { try { switchTab('documents'); await createDocument(); } catch (e) { console.log(String(e)); } }); await page.waitForTimeout(1200); await dump('documents');
  await shot(`subtabs-docs-${W}-${T}`);
  await browser.close();
})();
