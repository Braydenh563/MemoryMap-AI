// The command palette's Notes and Documents groups come from GET /search
// (search-boot-1005, step 3). Before, it matched the loaded notes in the browser
// (title or body, exact letters) and the Library's loaded documents by title, so:
//   - a typo ("gardn") found no note,
//   - a word only inside a document's body found no document, and
//   - a document was not findable at all until the Library had been opened.
//   BASE=http://127.0.0.1:8871 SCRATCH=/tmp/x [W=390] node search1005-palette.js
// Base for comparison: OVERRIDE_JS="app-palette.js=/path/to/base/app-palette.js".
const { boot } = require('./lib.js');

const W = Number(process.env.W || 1440);
const STAMP = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 6);

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 800 : 900 } });
  await page.evaluate(async (stamp) => {
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Planted the garden beds today ${stamp}` }) });
    await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: `Plan ${stamp}`, content: `The quokka${stamp} enclosure needs a new fence.` }) });
  }, STAMP);
  await page.evaluate(() => loadEntries());
  await page.waitForTimeout(1500);

  const rowsFor = async (text) => {
    await page.evaluate(() => openPalette());
    await page.waitForSelector('#palette-overlay:not(.hidden)');
    await page.fill('#palette-input', '');
    await page.type('#palette-input', text, { delay: 20 });
    await page.waitForTimeout(1500);
    const rows = await page.evaluate(() => {
      const out = [];
      let group = '';
      for (const el of document.querySelectorAll('#palette-list > *')) {
        if (el.classList.contains('palette-group-header')) { group = el.textContent.trim(); continue; }
        out.push(`${group}: ${(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)}`);
      }
      return out;
    });
    await page.keyboard.press('Escape');
    return rows;
  };

  const typo = await rowsFor('gardn');
  const body = await rowsFor(`quokka${STAMP}`);
  const exact = await rowsFor('garden beds');
  console.log('typo  :', JSON.stringify(typo));
  console.log('body  :', JSON.stringify(body));
  console.log('exact :', JSON.stringify(exact));

  const checks = {
    'a typo finds the note': typo.some((r) => r.startsWith('Notes') && /garden beds/.test(r)),
    "a word inside a document's body finds the document": body.some((r) => r.startsWith('Documents') && r.includes(`Plan ${STAMP}`)),
    'an exact phrase still finds the note': exact.some((r) => r.startsWith('Notes') && /garden beds/.test(r)),
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
