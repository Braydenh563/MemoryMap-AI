// GRAPH_PLAN KG1: a note's backlinks with their sentence and its unlinked
// mentions with a Link button, in the Notes rail and the Connections sheet.
// Seeds three notes, opens the target, measures the groups, presses Link and
// measures again. THEME=dark for dark.
//
//   BASE=http://127.0.0.1:8817 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg1rail.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const stamp = Date.now().toString(36);
  const ids = await page.evaluate(async (s) => {
    const make = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    const target = await make(`# Kiln schedule ${s}\n\nFiring times.`);
    const linker = await make(`# Studio day ${s}\n\nMonday was slow. I checked the [[Kiln schedule ${s}]] before glazing. Then lunch.`);
    const mentioner = await make(`# Errands ${s}\n\nAsk Jo about the kiln schedule ${s} next week.`);
    await loadEntries();
    return { target: target.id, linker: linker.id, mentioner: mentioner.id };
  }, stamp);
  await page.evaluate(() => { try { localStorage.removeItem('notes-rail'); } catch (e) {} switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(2000);
  await page.evaluate((id) => flashEntry(id), ids.target);
  await page.waitForTimeout(2500);
  const measure = () => page.evaluate(() => {
    const rail = document.getElementById('notes-rail');
    const heads = [...rail.querySelectorAll('.connection-heading')].map((h) => h.textContent.trim());
    const contexts = [...rail.querySelectorAll('.doc-backlink-context')].map((p) => ({
      text: p.textContent, mark: p.querySelector('mark')?.textContent || '',
      clamp: p.scrollHeight - p.clientHeight, w: Math.round(p.getBoundingClientRect().width),
    }));
    const links = [...rail.querySelectorAll('.doc-backlink-action')].map((b) => b.textContent.trim());
    return {
      shown: !rail.hidden, heads, contexts, links,
      count: document.getElementById('notes-rail-count')?.textContent,
      sideways: rail.scrollWidth > rail.clientWidth + 1,
    };
  });
  const before = await measure();
  console.log(JSON.stringify(before));
  check('rail shown', before.shown);
  check('linked sentence under the incoming row', before.contexts.some((c) => c.mark.includes('[[Kiln schedule')));
  check('unlinked group present', before.heads.some((h) => h.startsWith('Mentioned, not linked (1)')));
  check('one Link button', before.links.length === 1, before.links.join(','));
  check('count excludes the mention', before.count === '1 link', before.count);
  check('no sideways scroll in the rail', !before.sideways);
  await page.click('#notes-rail .doc-backlink-action');
  await page.waitForTimeout(3000);
  const after = await measure();
  console.log(JSON.stringify(after));
  const text = await page.evaluate(async (id) => (await apiJson(`/entries/${id}`)).content, ids.mentioner);
  check('mention rewritten to a wiki link', text.includes(`[[kiln schedule ${stamp}]]`), text);
  check('mention group gone', !after.heads.some((h) => h.startsWith('Mentioned')));
  check('two sentences now', after.contexts.length === 2, String(after.contexts.length));
  check('count is 2 links', after.count === '2 links', after.count);
  // The sheet shows the same.
  await page.evaluate((id) => openConnections('entries', id, 'x'), ids.target);
  await page.waitForTimeout(1500);
  const sheet = await page.evaluate(() => document.querySelectorAll('#connections-list .doc-backlink-context').length);
  check('sheet shows the sentences', sheet === 2, String(sheet));
  await browser.close();
})();
