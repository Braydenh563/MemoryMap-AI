// The Ask tab's Matching records cards: metadata, badges, links (INBOX 510).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(() => { switchTab('notes'); showNotesSection('ask'); });
  await page.waitForTimeout(800);
  await page.evaluate((q) => askQuestion(q), process.env.Q || 'notes about school jokes').catch(() => {});
  await page.waitForTimeout(6000);
  const out = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const cs = (el, ...p) => { const s = getComputedStyle(el); return Object.fromEntries(p.map((k) => [k, s[k]])); };
    const rows = [...document.querySelectorAll('#raw-results > li[data-id]')].slice(0, 3);
    return rows.map((li) => ({
      li: r(li), pad: cs(li, 'paddingLeft', 'paddingRight'),
      kids: [...li.children].map((c) => [c.tagName.toLowerCase() + '.' + [...c.classList].join('.'), r(c)]),
      cat: (() => { const c = li.querySelector('.chip.category'); return c && { r: r(c), ...cs(c, 'color', 'fontWeight', 'borderColor', 'backgroundColor') }; })(),
      links: [...li.querySelectorAll('.chip.link')].slice(0, 3).map((c) => ({ r: r(c), ...cs(c, 'color', 'backgroundColor', 'borderColor', 'fontWeight', 'paddingLeft', 'height') })),
      reason: (() => { const c = li.querySelector('.result-reason-chip'); return c && { r: r(c), ...cs(c, 'color', 'backgroundColor', 'fontWeight') }; })(),
      num: (() => { const c = li.querySelector('[class*="cite"], .result-number, .entry-number'); return c && { cls: c.className, r: r(c), ...cs(c, 'backgroundColor', 'color') }; })(),
    }));
  });
  console.log(JSON.stringify(out, null, 1));
  await page.screenshot({ path: '/tmp/askcards.png', clip: { x: 720, y: 60, width: 720, height: 840 } });
  await browser.close();
})();
