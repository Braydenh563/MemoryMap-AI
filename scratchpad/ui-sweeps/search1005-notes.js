// The Notes list asks the one search engine (search-boot-1005, step 1).
//   - `has:`, `kind:` and `space:` are the engine's operators: before, the
//     list read each as a plain word and matched nothing.
//   - A bare `kind:` (still being typed) narrows nothing.
//   - The Semantic toggle's results come from GET /search, ranked, and a note
//     sharing no word with the query is not dropped by the list's own word test.
//   BASE=http://127.0.0.1:8871 SCRATCH=/tmp/x [W=390] node search1005-notes.js
// Base for comparison: OVERRIDE_JS="notes-list.js=/path/to/base/notes-list.js".
const { boot } = require('./lib.js');

const W = Number(process.env.W || 1440);
// One word per run, so a re-run on the same data dir counts only its own notes.
const WORD = 'harbour' + Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 6);

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 800 : 900 } });
  const seeded = await page.evaluate(async (word) => {
    const make = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    const a = await make(`${word} walk with the dog`);
    const b = await make(`${word} notes tied to the walk`);
    const c = await make(`${word} sunrise unconnected`);
    const d = await make(`${word} remember to buy milk and eggs`);
    await apiJson(`/entries/${b.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: a.id }) });
    return { a: a.id, b: b.id, c: c.id, d: d.id };
  }, WORD);
  await page.evaluate(() => loadEntries());
  await page.waitForTimeout(1500);

  const shown = async (query) => {
    await page.evaluate((q) => showNotesFilter(q), query);
    await page.waitForTimeout(1800);
    return page.evaluate((word) =>
      [...document.querySelectorAll('#entry-list > li')]
        .map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60))
        .filter((t) => t.includes(word)),
    WORD);
  };
  const has = (rows, word) => rows.some((t) => t.includes(word));

  const out = {};
  out.link = await shown(`has:link ${WORD}`);
  out.kind = await shown(`kind:note ${WORD}`);
  out.nowhere = await shown(`space:nowhere ${WORD}`);
  out.typing = await shown(`kind: ${WORD}`);
  out.plain = await shown(WORD);
  console.log(JSON.stringify(out, null, 1));

  const checks = {
    'has:link keeps the two linked notes': out.link.length === 2 && has(out.link, 'walk with the dog') && has(out.link, 'tied to the walk'),
    'kind:note keeps all four notes': out.kind.length === 4,
    'space:nowhere shows none': out.nowhere.length === 0,
    'a bare kind: narrows nothing': out.typing.length === 4,
    'a plain word is unchanged': out.plain.length === 4,
  };

  // The Semantic toggle (needs an embedding backend; asserted only when the
  // engine itself finds the note by meaning).
  const byMeaning = await page.evaluate(async () => {
    const found = await apiJson('/search?q=groceries&kind=note', { silent: true }).catch(() => null);
    return found ? found.hits.map((h) => h.id) : null;
  });
  await page.evaluate(() => { document.getElementById('semantic-search-toggle').checked = true; });
  out.semantic = await shown('milk');
  checks['Semantic on: a word hit still shows'] = has(out.semantic, 'buy milk and eggs');
  out.semanticMeaning = await page.evaluate(async () => {
    showNotesFilter('groceries');
    await new Promise((r) => setTimeout(r, 2500));
    return [...document.querySelectorAll('#entry-list > li')].map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60));
  });
  console.log('semantic "groceries":', JSON.stringify(out.semanticMeaning), 'engine ids:', JSON.stringify(byMeaning), 'd =', seeded.d);
  if (byMeaning && byMeaning.length) {
    // The list shows what the engine found by meaning, none of it sharing the word.
    checks['Semantic on: the notes found by meaning show'] = out.semanticMeaning.length === byMeaning.length;
  }
  await page.evaluate(() => { document.getElementById('semantic-search-toggle').checked = false; });

  let ok = true;
  for (const [name, pass] of Object.entries(checks)) {
    console.log(pass ? 'ok  ' : 'FAIL', name);
    ok = ok && pass;
  }
  console.log(ok ? `PASS at ${W}` : `FAIL at ${W}`);
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
