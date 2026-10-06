// WORLD_CLASS_PLAN 1.3: a Library document card's menu has "Show in graph".
// Makes a document, finds its card in Library > Documents, opens the card's
// menu, presses the row, and checks that the graph tab is showing, the
// Documents switch is on, the document's own node is drawn (finite x) and the
// keyboard focus is on it. Then the same from a note, to prove the note path
// is unchanged.
//   BASE=http://127.0.0.1:8851 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node docingraph.js
const { boot } = require('./lib.js');

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { page, browser } = await boot({ viewport: { width, height: 900 } });
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };

  const doc = await page.evaluate(async () => {
    const made = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Graph door probe', content: '# Graph door probe\n\nA paragraph.' }) });
    return made;
  });
  const docId = doc.id;
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  const card = await page.evaluateHandle(() => [...document.querySelectorAll('.library-card')].find((c) => /Graph door probe/.test(c.textContent) && c.getClientRects().length));
  check('the document card is in the Library', !!(await card.asElement()));
  await card.asElement().scrollIntoViewIfNeeded();
  await card.asElement().hover();
  await card.asElement().$('.library-card-menu').then((m) => m.click());
  await page.waitForTimeout(400);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.kebab-menu-list [role="menuitem"], .kebab-list [role="menuitem"], [role="menu"] [role="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()));
  console.log('menu rows:', JSON.stringify(rows));
  check('the menu has Show in graph', rows.some((t) => /Show in graph/.test(t)));
  check('Show in graph sits before Ask Atlas', rows.findIndex((t) => /Show in graph/.test(t)) < rows.findIndex((t) => /Ask Atlas/.test(t)));
  await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((e) => /Show in graph/.test(e.textContent) && e.getClientRects().length).click());
  await page.waitForTimeout(3500);
  const state = await page.evaluate((id) => {
    const focusId = typeof graphKeyboardId !== 'undefined' ? graphKeyboardId : null;
    const node = graphNodeById(focusId);
    return {
      tab: document.querySelector('#tab-graph') && !document.querySelector('#tab-graph').classList.contains('hidden'),
      switchOn: !!document.getElementById('graph-documents')?.checked,
      node: !!node,
      x: node ? Number.isFinite(node.x) : false,
      focus: focusId,
      preview: node ? node.preview : null,
    };
  }, docId);
  console.log(JSON.stringify(state));
  check('the graph tab is showing', state.tab);
  check('the Documents switch is on', state.switchOn);
  check('the document is a drawn node', state.node && state.x);
  check('the keyboard focus is on a document node', /^document:\d+$/.test(String(state.focus)));
  check('and it is the probe document', state.preview === 'Graph door probe', state.preview);

  // A note still goes the old way and does not touch the Documents switch.
  await page.evaluate(() => { const b = document.getElementById('graph-documents'); b.checked = false; b.dispatchEvent(new Event('change', { bubbles: true })); });
  const note = await page.evaluate(async () => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'A note for the graph door probe, long enough to be a note.' }) }));
  const noteId = note.id || note.entry?.id;
  await page.evaluate((id) => showNoteInGraph(id), noteId);
  await page.waitForTimeout(1500);
  const after = await page.evaluate((id) => ({ switchOn: !!document.getElementById('graph-documents')?.checked, node: !!graphNodeById(id) }), noteId);
  check('a note leaves the Documents switch alone', !after.switchOn);
  check('a note is on the graph', after.node);
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `FAIL ${failed}` : `PASS ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
