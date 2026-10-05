// CHAT_PLAN, INBOX 71: Settings, Tools it can use, grouped by what a tool
// does (Reads, Changes, Asks you first, Reaches the web). Measures: the
// heads in order with their counts, each head spanning the list, no row
// outside a group, the filter hiding a head with its last row, the count line.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(2500);
  await page.evaluate(() => openSettingsModal('tools'));
  await page.waitForTimeout(2500);
  const read = () => page.evaluate(() => {
    const list = document.getElementById('tool-list');
    const lb = list.getBoundingClientRect();
    const heads = [...list.querySelectorAll(':scope > li.tool-group-head')];
    const visible = (el) => !el.classList.contains('hidden') && el.getBoundingClientRect().height > 0;
    return {
      heads: heads.filter(visible).map((h) => {
        const b = h.getBoundingClientRect();
        const rows = list.querySelectorAll(`:scope > li[data-tool][data-group="${h.dataset.group}"]:not(.hidden)`).length;
        return { text: h.textContent, rows, spans: Math.abs(b.width - lb.width) < 1, h: Math.round(b.height), font: getComputedStyle(h.querySelector('h4')).fontSize };
      }),
      ungrouped: list.querySelectorAll(':scope > li[data-tool]:not([data-group])').length,
      count: document.getElementById('tool-count')?.textContent,
      pageScrollX: document.documentElement.scrollWidth > innerWidth,
    };
  });
  console.log(W, 'all', JSON.stringify(await read()));
  await page.fill('#tool-filter', 'delete');
  await page.waitForTimeout(300);
  console.log(W, 'filter delete', JSON.stringify(await read()));
  await page.fill('#tool-filter', 'zzzz');
  await page.waitForTimeout(300);
  console.log(W, 'filter none', JSON.stringify(await read()));
  console.log('errors:', errors.length, errors.slice(0, 3));
  if (process.env.SHOT) {
    await page.fill('#tool-filter', '');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#tool-list li.tool-group-head[data-group=write]').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: process.env.SHOT });
  }
  await browser.close();
})();
