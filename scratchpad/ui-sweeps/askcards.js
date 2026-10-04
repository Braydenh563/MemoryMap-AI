// The Ask tab's Matching records cards: metadata, badges, links (INBOX 510).
//
// Asks Q (default 'notes about school jokes') from Notes > Ask, then marks the
// first numbered record as cited (the hover on a citation mark does the same,
// `showCitedPassage`) and measures the first three records against the Notes
// list's own card (the INBOX 505 voice):
//
//   pad        the card's side padding (Notes: 20px left)
//   edges      left x of the text, the metadata row, the link row (one edge)
//   category   colour and weight (Notes: muted, 400)
//   link       colour, fill and weight of a link chip (Notes: muted, no fill)
//   reason     whether the match reason sits in the metadata row, its fill
//              and weight, and its vertical centre against the row's centre
//   badge      the citation number's ground and edge, plain and cited
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     Q='notes about planning' node scratchpad/ui-sweeps/askcards.js   (THEME=dark, W=390)
const { boot, OUT } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(() => { switchTab('notes'); showNotesSection('ask'); });
  await page.waitForTimeout(800);
  await page.evaluate((q) => askQuestion(q), process.env.Q || 'notes about school jokes').catch(() => {});
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    const li = document.querySelector('#raw-results > li.is-numbered[data-id]');
    if (li) showCitedPassage(li.dataset.id, 'A passage');
  });
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => {
    const x = (el) => (el ? Math.round(el.getBoundingClientRect().x) : null);
    const mid = (el) => { const b = el.getBoundingClientRect(); return b.y + b.height / 2; };
    const cs = (el, ...p) => { const s = getComputedStyle(el); return p.map((k) => s[k]).join(' '); };
    const rows = [...document.querySelectorAll('#raw-results > li[data-id]')].slice(0, 3);
    return rows.map((li) => {
      const meta = li.querySelector(':scope > .entry-meta');
      const links = li.querySelector(':scope > .entry-links');
      const content = li.querySelector(':scope > .entry-content');
      const cat = li.querySelector('.chip.category');
      const link = li.querySelector('.chip.link');
      const reason = li.querySelector('.result-reason-chip');
      const badge = li.querySelector('.record-index');
      const metaKids = meta ? [...meta.children].filter((c) => c.getBoundingClientRect().width) : [];
      return {
        cited: li.classList.contains('is-cited'),
        pad: cs(li, 'paddingLeft', 'paddingRight'),
        edges: { content: x(content), meta: x(meta), links: x(links), linkPill: x(li.querySelector('.link-connection') || link) },
        category: cat && cs(cat, 'color', 'fontWeight'),
        link: link && cs(link, 'color', 'backgroundColor', 'fontWeight', 'height'),
        reason: reason && {
          inMeta: reason.parentElement === meta,
          style: cs(reason, 'color', 'backgroundColor', 'fontWeight'),
          offCentre: meta ? +Math.max(...metaKids.map((c) => Math.abs(mid(c) - mid(metaKids[0])))).toFixed(1) : null,
        },
        badge: badge && cs(badge, 'backgroundImage', 'boxShadow', 'color'),
      };
    });
  });
  console.log(JSON.stringify(out, null, 1));
  await page.locator('#raw-results > li[data-id]').first().scrollIntoViewIfNeeded();
  await page.locator('#raw-results').screenshot({ path: `${OUT}/askcards-${process.env.THEME || 'light'}-${process.env.W || 1440}.png` });
  await browser.close();
})();
