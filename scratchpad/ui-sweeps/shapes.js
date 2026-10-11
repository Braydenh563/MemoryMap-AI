// The answer's shape by its kind (CHAT_PLAN decision 71, B2): asks the Ask
// box a count, a who, a comparison and a "what's left" with no model, and
// measures what renders: the count's figure size, the who card's surface,
// the comparison's table cells and the checklist's items. Run after gold.js
// has seeded the notes.
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/shapes.js
const { boot } = require('./lib.js');

const CASES = [
  { q: 'how much did I spend on groceries?', shot: 'shape-count' },
  { q: 'who is Sam?', shot: 'shape-who' },
  { q: 'Logitech or Razer?', shot: 'shape-compare' },
  { q: 'what do I need to buy?', shot: 'shape-left' },
];

(async () => {
  const { browser, page } = await boot();
  const out = [];
  for (const c of CASES) {
    await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
    await page.waitForTimeout(600);
    await page.fill('#question', c.q);
    await page.evaluate(() => askQuestion());
    await page.waitForSelector('#ai-answer .digest-offer, #ai-answer .digest-card', { timeout: 15000 });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const a = document.querySelector('#ai-answer');
      const fig = a.querySelector('.digest-figure');
      const card = a.querySelector('.digest-card');
      const table = a.querySelector('table');
      const body = a.querySelector('p') ? getComputedStyle(a.querySelector('p')).fontSize : null;
      return {
        bodyPx: body,
        figure: fig ? { text: fig.textContent, px: getComputedStyle(fig).fontSize, weight: getComputedStyle(fig).fontWeight } : null,
        card: card ? { head: card.querySelector('.digest-card-head')?.textContent.trim(), bg: getComputedStyle(card).backgroundColor, radius: getComputedStyle(card).borderRadius, paras: card.querySelectorAll('p').length, offerOutside: !!a.querySelector(':scope > p .digest-offer, :scope p > .digest-offer') && !card.querySelector('.digest-offer') } : null,
        table: table ? { bar: getComputedStyle(table.closest('.md-table-block').querySelector('.code-bar')).display, font: getComputedStyle(table).fontFamily.split(',')[0], rows: table.querySelectorAll('tr').length, cols: table.querySelector('tr').children.length, overflow: table.scrollWidth > a.clientWidth, cites: table.querySelectorAll('.cite, sup, [data-cite]').length } : null,
        checks: a.querySelectorAll('li input[type=checkbox], li.task, li.task-item').length,
        lis: a.querySelectorAll('li').length,
        offer: a.querySelector('.digest-offer')?.textContent || null,
        hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    await page.locator('#ai-answer').screenshot({ path: `${process.env.SCRATCH}/shots/${c.shot}.png` });
    out.push({ q: c.q, ...m });
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
