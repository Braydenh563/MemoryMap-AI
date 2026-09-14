// INBOX 208: the popup agent's foot row. Every caption on one line, the row
// one control height, and the long reason off the label and onto its help.
const { boot } = require('./lib.js');

async function measure(page) {
  return await page.evaluate(() => {
    const lines = (el) => (el ? el.getClientRects().length : -1);
    const foot = document.querySelector('.command-palette-foot');
    const text = document.getElementById('command-palette-use-note-text');
    const clear = document.getElementById('command-palette-clear');
    const label = document.getElementById('command-palette-use-note-label');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    };
    return {
      footHeight: rect(foot) && rect(foot).h,
      labelLines: lines(text),
      labelText: text && text.textContent,
      labelTitle: label && (label.title || label.getAttribute('data-help-for') || ''),
      clearLines: lines(clear.querySelector('span') || clear),
      clear: rect(clear),
      clearLabel: clear && (clear.textContent || '').trim(),
      clearTitle: clear && clear.title,
      stop: rect(document.getElementById('command-palette-stop')),
      label: rect(label),
      textRect: rect(text),
      wrap: getComputedStyle(foot).flexWrap,
      panel: rect(document.querySelector('.command-palette-panel') || foot.parentElement),
      // every child of the row on one line: the row's own top against each
      tops: [...foot.children].map((el) => Math.round(el.getBoundingClientRect().top)),
    };
  });
}

(async () => {
  for (const width of [1440, 390]) {
    const { browser, page } = await boot({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.evaluate(() => toggleAgentPalette());
    await page.waitForTimeout(900);
    console.log(`208 nothing open @${width}:`, JSON.stringify(await measure(page)));
    // The one variable caption in the row: a note can be called anything, and
    // the status is written mid-run. Neither may grow the row.
    await page.evaluate(() => {
      document.getElementById('command-palette-use-note-text').textContent =
        'Use this mind map: a mind map with a deliberately very long title on it';
      document.getElementById('command-palette-status').textContent =
        'Reading your notes and drafting an answer, this can take a moment';
    });
    await page.waitForTimeout(200);
    console.log(`208 long captions @${width}:`, JSON.stringify(await measure(page)));
    // Mid-run: Stop replaces Start over.
    await page.evaluate(() => {
      document.getElementById('command-palette-clear').classList.add('hidden');
      document.getElementById('command-palette-stop').classList.remove('hidden');
    });
    await page.waitForTimeout(200);
    console.log(`208 running @${width}:`, JSON.stringify(await measure(page)));
    await browser.close();
  }
})();
