// GRAPH_PLAN KG7: one live query, the same ids in the list, the table and the
// graph. Types `type:meeting<s> prop:status=open` into the notes filter; the
// list shows the open meetings, the bar says how many, its Table lists the
// same notes with the properties as columns, and Show on graph lights them.
//
//   BASE=http://127.0.0.1:8819 WIDTH=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg7query.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const s = Date.now().toString(36).slice(-5);
  const want = await page.evaluate(async (s) => {
    const make = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    const a = await make(`---\ntype: Meeting${s}\nstatus: open\nowner: Priya\n---\n# Standup ${s}`);
    const b = await make(`---\ntype: Meeting${s}\nstatus: open\n---\n# Planning ${s}`);
    await make(`---\ntype: Meeting${s}\nstatus: done\n---\n# Retro ${s}`);
    await make(`---\nstatus: open\n---\n# Not a meeting ${s}`);
    await loadEntries();
    return [a.id, b.id].sort((x, y) => x - y);
  }, s);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1000);
  await page.fill('#note-search', `type:meeting${s} prop:status=open`);
  await page.waitForTimeout(1500);
  const list = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('#entry-list > li[data-id]')].map((li) => Number(li.dataset.id)).sort((x, y) => x - y),
    bar: document.querySelector('.note-query-bar')?.textContent || '',
  }));
  console.log(JSON.stringify(list));
  check('the list shows the two open meetings', JSON.stringify(list.ids) === JSON.stringify(want), JSON.stringify(list.ids));
  check('the bar counts them', /^2 notes match this query/.test(list.bar), list.bar);
  const server = await page.evaluate(async (s) => (await apiJson(`/entries/query?q=${encodeURIComponent(`type:meeting${s} prop:status=open`)}`)).ids.sort((x, y) => x - y), s);
  check('the server gives the same ids', JSON.stringify(server) === JSON.stringify(want), JSON.stringify(server));

  await page.evaluate(() => [...document.querySelectorAll('.note-query-bar button')].find((b) => b.textContent.includes('Table'))?.click());
  await page.waitForTimeout(1200);
  const table = await page.evaluate(() => {
    const card = document.querySelector('[data-sheet="query-table"] .sheet-card');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return {
      head: [...card.querySelectorAll('th')].map((th) => th.textContent),
      rows: [...card.querySelectorAll('tbody tr')].map((tr) => tr.firstChild.textContent),
      h: Math.round(r.height), vh: innerHeight,
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  });
  console.log(JSON.stringify(table));
  check('the table: the note, then type, status, owner', table && table.head.join(',') === 'Note,type,status,owner', table && table.head.join(','));
  check('the table has the same two notes', table && table.rows.length === 2 && table.rows.every((t) => t.endsWith(s)), table && table.rows.join(' | '));
  check('the table fits the window', table && table.h <= table.vh && !table.sideways, table && String(table.h));
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg7query-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.keyboard.press('Escape');

  await page.evaluate(() => [...document.querySelectorAll('.note-query-bar button')].find((b) => b.textContent.includes('graph'))?.click());
  await page.waitForTimeout(4000);
  const lit = await page.evaluate(() => (typeof graphHighlightIds !== 'undefined' && graphHighlightIds ? [...graphHighlightIds].sort((x, y) => x - y) : null));
  check('the graph lights the same ids', JSON.stringify(lit) === JSON.stringify(want), JSON.stringify(lit));
  await browser.close();
})();
