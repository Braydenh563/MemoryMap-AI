// The Library's Semantic filter asks the one search engine (search-boot-1005, step 2).
// A note found by meaning, sharing no word with the box, shows under Everything
// with Semantic on, and does not with it off; the cards are the same cards.
//   BASE=http://127.0.0.1:8871 SCRATCH=/tmp/x [W=390] node search1005-library.js
const { boot } = require('./lib.js');

const W = Number(process.env.W || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 800 : 900 } });
  const word = 'pantry' + Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 6);
  await page.evaluate(async (w) => {
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `${w} buy milk and eggs on the way home` }) });
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `${w} a pun about a scarecrow` }) });
  }, word);
  // The new notes are embedded in the background; wait for the engine to see them by meaning.
  const engine = await page.evaluate(async () => {
    for (let i = 0; i < 40; i++) {
      const found = await apiJson('/search?q=groceries&kind=note', { silent: true }).catch(() => null);
      if (found && found.hits.length) return found.hits.length;
      await new Promise((r) => setTimeout(r, 1000));
    }
    return 0;
  });
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(2500);

  const cards = async (query, semantic) => {
    await page.evaluate(([q, on]) => {
      const toggle = document.getElementById('library-semantic-toggle');
      toggle.checked = on;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
      const box = document.getElementById('library-search');
      box.value = q;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }, [query, semantic]);
    await page.waitForTimeout(2200);
    return page.evaluate(() =>
      [...document.querySelectorAll('#library-grid .library-card')]
        .map((card) => (card.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70))
        .filter(Boolean)
    );
  };
  const off = await cards('groceries', false);
  const on = await cards('groceries', true);
  const keyword = await cards(word, true);
  console.log('engine hits for groceries:', engine);
  console.log('semantic off:', JSON.stringify(off));
  console.log('semantic on :', JSON.stringify(on));
  console.log('word, on    :', JSON.stringify(keyword));
  const checks = {
    'off: nothing shares the word, so nothing shows': off.length === 0,
    'on: the notes the engine finds by meaning show': engine > 0 && on.length > 0 && on.some((t) => /milk and eggs/.test(t)),
    'on: a plain word still finds its own two notes': keyword.filter((t) => t.includes(word)).length === 2,
  };
  let ok = true;
  for (const [name, pass] of Object.entries(checks)) {
    console.log(pass ? 'ok  ' : 'FAIL', name);
    ok = ok && pass;
  }
  console.log(ok ? `PASS at ${W}` : `FAIL at ${W}`);
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
