// INBOX 224's second half: Atlas offered where the question comes up. Every
// line comes from one table (`ATLAS_PROMPTS` / `ATLAS_STARTERS`, app.js), and
// pressing one opens the sheet with the question already asked.
const { boot } = require('./lib.js');

(async () => {
  for (const width of [1440, 390]) {
    const { browser, page } = await boot({ viewport: { width, height: width === 390 ? 844 : 900 } });

    // 1. the help popovers: a line under each panel the table names, and none
    //    under the ones it does not.
    console.log(`224 popovers @${width}:`, JSON.stringify(await page.evaluate(() => {
      const keyed = Object.keys(ATLAS_PROMPTS);
      const lines = [...document.querySelectorAll('.help-body .help-atlas')];
      return {
        inTable: keyed.length,
        withLine: keyed.filter((id) => document.getElementById(id) && document.getElementById(id).querySelector('.help-atlas')).length,
        missingPanel: keyed.filter((id) => !document.getElementById(id)),
        lines: lines.length,
        stray: lines.filter((l) => !keyed.includes(l.closest('.help-body').id)).length,
        sample: lines[0] ? lines[0].textContent.trim() : null,
      };
    })));

    // 2. the empty states: one line each on Notes, Chat and Library.
    console.log(`224 empty states @${width}:`, JSON.stringify(await page.evaluate(() => {
      renderChatEmptyState();
      return {
        notes: !!document.querySelector('#empty-message .help-atlas'),
        library: !!document.querySelector('#library-empty .help-atlas'),
        chat: !!document.querySelector('#chat-messages .chat-empty .help-atlas'),
      };
    })));

    // 3. the palette: the command, and a typed question routed to Atlas. Read
    //    off the rendered list rather than by calling `paletteMatches`
    //    directly, which reaches for the app's own in-memory note and document
    //    arrays and only has them once the palette is open.
    await page.evaluate(() => runShortcut('palette'));
    await page.waitForTimeout(600);
    await page.fill('#palette-input', 'how do I turn off web search?');
    await page.waitForTimeout(400);
    const asQuestion = await page.evaluate(() =>
      [...document.querySelectorAll('#palette-list li')].slice(0, 3).map((r) => r.textContent.trim())
    );
    await page.fill('#palette-input', 'atlas');
    await page.waitForTimeout(400);
    const byName = await page.evaluate(() =>
      [...document.querySelectorAll('#palette-list li')].slice(0, 3).map((r) => r.textContent.trim())
    );
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    console.log(`224 palette @${width}:`, JSON.stringify({ asQuestion, byName }));

    // 4. the shortcut, in the registry and therefore in the sheet.
    console.log(`224 shortcut @${width}:`, JSON.stringify(await page.evaluate(() => ({
      keys: shortcuts.askAtlas && shortcuts.askAtlas.keys,
      label: shortcuts.askAtlas && shortcuts.askAtlas.label,
    }))));

    // 5. pressing one opens the sheet with the question in the input.
    console.log(`224 press @${width}:`, JSON.stringify(await page.evaluate(async () => {
      const line = document.querySelector('#command-palette-help .help-atlas button');
      const asked = line.textContent.replace('Ask Atlas: ', '');
      line.click();
      await new Promise((r) => setTimeout(r, 900));
      const input = document.getElementById('help-chat-input');
      const bubbles = [...document.querySelectorAll('[data-sheet="guide"] .help-chat-msg')];
      return {
        asked,
        sheet: !!document.querySelector('[data-sheet="guide"]'),
        // The question is sent, not just typed: the first bubble is it.
        firstBubble: bubbles[0] ? bubbles[0].textContent.trim() : null,
        boxEmptied: input ? input.value : null,
      };
    })));
    await browser.close();
  }
})();
