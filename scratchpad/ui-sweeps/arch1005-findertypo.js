// The finder finds through a typo (audit ARCH-07): a note about the garden
// is found for "gardn". Writes the note, opens the finder, types, counts.
//   BASE=http://127.0.0.1:8841 SCRATCH=/tmp/x node arch1005-findertypo.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(async () => {
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Planted the garden beds today, arch1005' }) });
  });
  await page.evaluate(() => openFinder('gardn'));
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('#finder-results .finder-row')].map((row) => row.textContent.replace(/\s+/g, ' ').trim().slice(0, 80))
  );
  console.log('rows', JSON.stringify(rows));
  const noise = rows.filter((text) => /Met Sam/i.test(text)).length;
  // By meaning, with no shared word: needs the embedding model warm.
  await page.evaluate(async () => {
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Bought milk, eggs and bread at the corner shop' }) });
  });
  await page.evaluate(() => { closeFinder(); openFinder('groceries'); });
  await page.waitForTimeout(2500);
  const meaning = await page.evaluate(() =>
    [...document.querySelectorAll('#finder-results .finder-row')].map((row) => row.textContent.replace(/\s+/g, ' ').trim().slice(0, 80))
  );
  console.log('meaning', JSON.stringify(meaning));
  const ok = rows.some((text) => /garden beds/i.test(text)) && noise === 0;
  console.log('unrelated notes on the typo search:', noise, '; meaning found:', meaning.some((t) => /corner shop/i.test(t)));
  console.log(ok ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
