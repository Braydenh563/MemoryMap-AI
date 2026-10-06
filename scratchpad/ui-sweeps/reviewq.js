// WORLD_CLASS_PLAN row 11, section 17's first row: the review queue. Three
// notes: one filed at 31% by Atlas, one left in Uncategorised, one filed at
// 92%. The Categories widget says "2 notes to check" (or more, on a reused
// data dir) with Review filings; is:review lists the unsure ones with
// Accept, Refile and Split on one line inside the card; Accept takes the note
// out, Undo brings it back.
//
//   DATA=<the server's data dir> BASE=http://127.0.0.1:8800 WIDTH=390 THEME=dark \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/reviewq.js
const { execFileSync } = require('child_process');
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const s = Date.now().toString(36).slice(-5);
  const ids = await page.evaluate(async (s) => {
    const make = async (content, category) => (await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, category }) })).id;
    return {
      unsure: await make(`# Kiln temperatures ${s}\n\nCone 6 for the glaze.`, 'Work'),
      tray: await make(`# Loose thought ${s}\n\nSomething about bread.`, 'Uncategorised'),
      sure: await make(`# Standup ${s}\n\nShip on Friday.`, 'Work'),
    };
  }, s);
  // The janitor's numbers, set where it would set them: an API never lets a
  // caller claim to be the janitor.
  execFileSync('/home/user/MemoryMap-AI/.venv/bin/python', ['-c', `
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
db.execute("update entries set user_filed = 0, ai_confidence = 31 where id = ?", (${ids.unsure},))
db.execute("update entries set user_filed = 0, ai_confidence = 0 where id = ?", (${ids.tray},))
db.execute("update entries set user_filed = 0, ai_confidence = 92 where id = ?", (${ids.sure},))
db.commit()
`, `${process.env.DATA}/memorymap.db`]);
  await page.evaluate(async () => {
    await loadEntries();
    await switchTab('dashboard');
  });
  await page.waitForTimeout(1500);
  const dash = await page.evaluate(async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    dashStatsInflight = null;
    await renderCategoriesWidget(host);
    const row = host.querySelector('.night-questions-row');
    const out = row ? { text: row.querySelector('.night-questions').textContent, button: row.querySelector('button')?.textContent.trim() } : null;
    host.remove();
    return out;
  });
  console.log(JSON.stringify(dash));
  const waiting = dash ? Number(dash.text.split(' ')[0]) : 0;
  check('the Categories widget counts the filings to check', dash && waiting >= 2 && dash.button === 'Review filings', dash && dash.text);

  await page.evaluate(() => showNotesFilter('is:review'));
  await page.waitForTimeout(1500);
  const list = await page.evaluate((ids) => {
    const shown = [...document.querySelectorAll('#entry-list li[data-id]')].map((li) => Number(li.dataset.id));
    const li = document.querySelector(`#entry-list li[data-id="${ids.unsure}"]`);
    const row = li?.querySelector('.entry-review');
    const r = row?.getBoundingClientRect();
    const card = li?.getBoundingClientRect();
    const buttons = row ? [...row.querySelectorAll('button')].map((b) => {
      const br = b.getBoundingClientRect();
      return { text: b.textContent.trim(), h: Math.round(br.height), inside: br.left >= card.left - 0.5 && br.right <= card.right + 0.5 };
    }) : [];
    return { shown, has: { unsure: shown.includes(ids.unsure), tray: shown.includes(ids.tray), sure: shown.includes(ids.sure) }, buttons, rows: r ? Math.round(r.height) : 0, sideways: document.documentElement.scrollWidth > innerWidth || (li && li.scrollWidth > li.clientWidth + 1) };
  }, ids);
  console.log(JSON.stringify(list));
  check('is:review lists the unsure and the Uncategorised notes, not the sure one', list.has.unsure && list.has.tray && !list.has.sure, JSON.stringify(list.has));
  check('the card offers Accept, Refile and Split', list.buttons.map((b) => b.text).join(',') === 'Accept,Refile…,Split…', list.buttons.map((b) => b.text).join(','));
  check('the three buttons are one height, inside the card', list.buttons.length === 3 && new Set(list.buttons.map((b) => b.h)).size === 1 && list.buttons.every((b) => b.inside), JSON.stringify(list.buttons));
  check('nothing sideways', !list.sideways);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/reviewq-${WIDTH}-${process.env.THEME || 'light'}.png` });

  await page.evaluate((id) => [...document.querySelector(`#entry-list li[data-id="${id}"] .entry-review`).querySelectorAll('button')].find((b) => b.textContent.trim() === 'Accept').click(), ids.unsure);
  await page.waitForTimeout(1200);
  const after = await page.evaluate((id) => ({
    gone: !document.querySelector(`#entry-list li[data-id="${id}"]`),
    toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()).join(' | '),
  }), ids.unsure);
  check('Accept takes it out of the list and says where it stays', after.gone && /Kept in Work\./.test(after.toast), after.toast.slice(0, 80));
  const user = await page.evaluate(async (id) => (await apiJson(`/entries/${id}`)).user_filed, ids.unsure);
  check('the server has it as the person\'s filing', user === true);
  await page.evaluate(() => [...document.querySelectorAll('.toast button')].find((b) => b.textContent.trim() === 'Undo')?.click());
  await page.waitForTimeout(1200);
  const back = await page.evaluate(async (id) => ({ listed: !!document.querySelector(`#entry-list li[data-id="${id}"]`), user: (await apiJson(`/entries/${id}`)).user_filed }), ids.unsure);
  check('Undo puts it back in the queue', back.listed && back.user === false, JSON.stringify(back));
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();
})();
