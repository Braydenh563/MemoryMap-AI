// INBOX 666: the palette is commands and places; typed text ends with a row
// that opens Find anything with the text. Ctrl+K, a note's word: no note rows,
// the handoff row is there and Enter opens Find anything with the text and
// results; "dark" lists the theme command; no console errors.
//   BASE=http://127.0.0.1:8816 [THEME=dark] node palette666.js
const { boot } = require('./lib');

const rows = (page) => page.evaluate(() => [...document.querySelectorAll('#palette-list .rich-picker-row, #palette-list [role="option"]')]
  .map((r) => ({ text: r.textContent.replace(/\s+/g, ' ').trim(), lit: r.classList.contains('active') || r.getAttribute('aria-selected') === 'true' })));

(async () => {
  const errors = [];
  const { browser, page } = await boot({});
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  const word = 'zephyrquartz';
  await page.evaluate(async (w) => {
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `A note about ${w} and sourdough starters.` }) });
  }, word);
  await page.waitForTimeout(2500);

  const out = {};
  // 1. The note's word: no note row, one handoff row, lit.
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#palette-overlay:not(.hidden)');
  out.placeholder = await page.getAttribute('#palette-input', 'placeholder');
  await page.keyboard.type(word, { delay: 15 });
  await page.waitForTimeout(500);
  out.noteRows = await rows(page);
  out.groupHeaders = await page.evaluate(() => [...document.querySelectorAll('#palette-list .palette-group-header')].map((h) => h.textContent.trim()));
  const calls = [];
  page.on('request', (r) => { if (/\/search\?/.test(r.url())) calls.push(r.url()); });
  await page.keyboard.type('s', { delay: 15 });
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(600);
  out.searchCallsFromPalette = calls.length;

  // 2. Enter opens Find anything with the text, searched.
  await page.keyboard.press('Enter');
  await page.waitForSelector('#finder-overlay:not(.hidden)', { timeout: 5000 });
  await page.waitForTimeout(1500);
  out.finder = await page.evaluate(() => ({
    paletteHidden: document.getElementById('palette-overlay').classList.contains('hidden'),
    value: document.getElementById('finder-input').value,
    focused: document.activeElement === document.getElementById('finder-input'),
    results: [...document.querySelectorAll('#finder-results .finder-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)),
  }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 3. "dark": the theme command is listed; the handoff is last.
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#palette-overlay:not(.hidden)');
  await page.keyboard.type('dark', { delay: 15 });
  await page.waitForTimeout(400);
  out.dark = await rows(page);
  // Click the handoff row too.
  await page.click('#palette-list .rich-picker-row:last-child, #palette-list [role="option"]:last-of-type');
  await page.waitForSelector('#finder-overlay:not(.hidden)', { timeout: 5000 });
  out.clickedFinderValue = await page.inputValue('#finder-input');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. A word no command has: the handoff is the only row and is lit; empty box shows commands.
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#palette-overlay:not(.hidden)');
  await page.keyboard.type('qqqzzz', { delay: 15 });
  await page.waitForTimeout(300);
  out.noCommand = await rows(page);
  await page.fill('#palette-input', '');
  await page.waitForTimeout(200);
  out.emptyCount = (await rows(page)).length;
  out.emptyHasHandoff = (await rows(page)).some((r) => /Search everything for/.test(r.text));
  await page.keyboard.press('Escape');

  console.log(JSON.stringify(out, null, 1));
  const handoff = out.noteRows.filter((r) => /Search everything for/.test(r.text));
  const ok =
    out.noteRows.length === 1 && handoff.length === 1 && handoff[0].text.includes(`“${word}”`) &&
    !out.noteRows.some((r) => /sourdough|zephyr.*note/i.test(r.text) && !/Search everything/.test(r.text)) &&
    out.searchCallsFromPalette === 0 &&
    out.finder.paletteHidden && out.finder.value === word && out.finder.focused && out.finder.results.length > 0 &&
    out.dark.length >= 2 && out.dark.some((r) => /light\/dark|theme|dark/i.test(r.text) && !/Search everything/.test(r.text)) &&
    /Search everything for/.test(out.dark[out.dark.length - 1].text) &&
    out.clickedFinderValue === 'dark' &&
    out.noCommand.length === 1 && out.noCommand[0].lit &&
    out.emptyCount > 5 && !out.emptyHasHandoff &&
    errors.length === 0;
  if (errors.length) console.log('ERRORS', errors);
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
