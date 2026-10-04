// GRAPH_PLAN KG5: an entity's page and the list of people and things. The
// mentions in context with the name marked, the names it is named with, the
// dates, the ⋯ (Kind, Rename, Other names, Merge into), nothing sideways.
//
// Entities have no create route (a model extracts them), so they are written
// straight into the server's database: DB=<data dir>/memorymap.db.
//
//   BASE=http://127.0.0.1:8819 DB=/tmp/mm-k19/memorymap.db WIDTH=1440 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/kg5entity.js
const { execFileSync } = require('child_process');
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

function entity(name, kind, ids) {
  const py = `import sqlite3,sys,datetime
c=sqlite3.connect(sys.argv[1]);cur=c.cursor()
cur.execute("insert into entities(name,kind,created_at) values(?,?,?)",(sys.argv[2],sys.argv[3] or None,datetime.datetime.utcnow().isoformat(" ")))
e=cur.lastrowid
for i in sys.argv[4].split(","):
    cur.execute("insert into entity_mentions(entity_id,entry_id,created_at) values(?,?,?)",(e,int(i),datetime.datetime.utcnow().isoformat(" ")))
c.commit();print(e)`;
  return Number(execFileSync('python3', ['-c', py, process.env.DB, name, kind, ids.join(',')]).toString().trim());
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const s = Date.now().toString(36);
  const ids = await page.evaluate(async (s) => {
    const make = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    const a = await make(`# Rota ${s}\n\nWent over the kiln rota with Sam${s} Lee and Priya${s}. Then lunch.`);
    const b = await make(`# Firing ${s}\n\nPriya${s} and Sam${s} Lee loaded kiln two on Thursday, a long sentence that keeps going so the row has to wrap on a phone at least once.`);
    await loadEntries();
    return { a: a.id, b: b.id };
  }, s);
  const sam = entity(`Sam${s} Lee`, 'person', [ids.a, ids.b]);
  entity(`Priya${s}`, 'person', [ids.a, ids.b]);
  await page.evaluate((id) => openEntityPage(id), sam);
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const card = document.querySelector('[data-sheet="entity"] .sheet-card');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return {
      title: card.querySelector('.sheet-title')?.textContent, sub: card.querySelector('.sheet-sub')?.textContent,
      marks: [...card.querySelectorAll('.doc-backlink-context mark')].map((x) => x.textContent),
      related: [...card.querySelectorAll('.entity-related button')].map((x) => x.textContent.trim()),
      dates: [...card.querySelectorAll('.entity-date')].map((x) => x.textContent),
      sections: [...card.querySelectorAll('.entity-section-title')].map((x) => x.textContent),
      kebab: Boolean(card.querySelector('.dialog-head-actions .menu-wrap')),
      closeLast: card.querySelector('.dialog-head-actions > :last-child')?.classList.contains('sheet-close'),
      h: Math.round(r.height), vh: innerHeight, w: Math.round(r.width),
      sideways: card.scrollWidth > card.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
    };
  });
  console.log(JSON.stringify(m));
  check('the page opens with the name and its facts', m && m.title.startsWith('Sam') && /Person · named in 2 notes/.test(m.sub || ''), m && m.sub);
  check('every mention marks the name', m && m.marks.length === 2 && m.marks.every((x) => x.endsWith('Lee')), m && m.marks.join(' | '));
  check('named with Priya, twice', m && m.related.some((x) => x.startsWith('Priya') && x.endsWith('· 2')), m && m.related.join(' | '));
  check('the date its note resolves', m && m.dates.some((x) => /Thursday/.test(x)), m && m.dates.join(' | '));
  check('three sections', m && m.sections.join(',') === 'Mentioned in,Named with,Dates', m && m.sections.join(','));
  check('head: the ⋯ then the close', m && m.kebab && m.closeLast);
  check('within the window, nothing sideways', m && m.h <= m.vh && !m.sideways, m && `${m.w}x${m.h}`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg5entity-${WIDTH}-${process.env.THEME || 'light'}.png` });

  // The ⋯: Kind, then Place.
  await page.click('[data-sheet="entity"] .dialog-head-actions .menu-wrap > button');
  await page.waitForTimeout(400);
  const items = await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) [role="menuitem"], .sheet-overlay [role="menuitem"]')].map((x) => x.textContent.trim()));
  check('the menu: Kind, Rename, Other names, Merge into', ['Kind', 'Rename', 'Other names', 'Merge into…'].every((w) => items.some((x) => x.startsWith(w))), items.join(' | '));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.evaluate(async (id) => { await apiJson(`/entities/${id}`, { method: 'PATCH', body: JSON.stringify({ kind: 'place' }) }); }, sam);

  // Named with: a click opens that entity's page.
  await page.evaluate(() => document.querySelector('.entity-related button')?.click());
  await page.waitForTimeout(1200);
  const other = await page.evaluate(() => document.querySelector('[data-sheet="entity"] .sheet-title')?.textContent);
  check('a name it is named with opens that page', other && other.startsWith('Priya'), other);

  // The list of people and things, filtered.
  await page.keyboard.press('Escape');
  await page.evaluate(() => openEntitiesSheet());
  await page.waitForTimeout(1200);
  await page.fill('[data-sheet="entities"] .entity-filter', `sam${s}`);
  await page.waitForTimeout(200);
  const list = await page.evaluate(() => [...document.querySelectorAll('[data-sheet="entities"] .sheet-row')].map((r) => r.textContent.trim()));
  check('the list filters to the name', list.length === 1 && list[0].startsWith(`Sam`), list.join(' | '));
  await page.keyboard.press('Escape');
  await browser.close();
})();
