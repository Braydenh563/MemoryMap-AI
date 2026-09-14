// INBOX 205, the starters half: what the popup agent offers before you type.
const { boot } = require('./lib.js');

async function measure(page) {
  return await page.evaluate(() => {
    const box = document.getElementById('command-palette-starters');
    const intro = document.getElementById('command-palette-intro');
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    };
    const buttons = [...box.querySelectorAll('button')];
    return {
      groups: [...box.querySelectorAll('.starter-verb')].map((p) => p.textContent),
      buttons: buttons.length,
      wrapped: buttons.filter((b) => b.getBoundingClientRect().height > 34).length,
      tallest: Math.max(...buttons.map((b) => Math.round(b.getBoundingClientRect().height))),
      introH: r(intro).h,
      boxH: r(box).h,
      scrolls: intro.scrollHeight > intro.clientHeight + 1,
      overflow: intro.scrollHeight - intro.clientHeight,
      firstFour: buttons.slice(0, 4).map((b) => b.textContent.trim()),
      // The set: one glyph per family, every glyph actually drawn (a Phosphor
      // name that is not in the vendored subset renders as nothing at all),
      // and every label starting at the same x inside its own column.
      withIcon: buttons.filter((b) => b.querySelector('i.ph')).length,
      blankGlyphs: buttons.filter((b) => {
        const i = b.querySelector('i.ph');
        return !i || i.getBoundingClientRect().width < 4;
      }).length,
      iconNames: [...new Set(buttons.map((b) => {
        const i = b.querySelector('i.ph');
        return i ? [...i.classList].find((c) => c.startsWith('ph-') && c !== 'ph-lead') : null;
      }))],
      justify: [...new Set(buttons.map((b) => getComputedStyle(b).justifyContent))],
      headingRules: [...box.querySelectorAll('.starter-verb')]
        .map((p) => getComputedStyle(p).borderBottomWidth),
      // The label offset inside each column: identical means the glyphs line up.
      labelOffsets: [...new Set(buttons.map((b) => {
        const i = b.querySelector('i.ph');
        return i ? Math.round(i.getBoundingClientRect().left - b.getBoundingClientRect().left) : -1;
      }))],
    };
  });
}

(async () => {
  for (const width of [1440, 390]) {
    const { browser, page } = await boot({ viewport: { width, height: width === 390 ? 844 : 900 } });
    // The panel disables its field and its starters with no model running
    // (decision 11), and this sandbox has none, so the status route is stubbed
    // as running: this sweep is about the shape of the set and its clicks.
    await page.route('**/models/status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ollama_running: true, models: ['fake-model'], current_model: 'fake-model' }),
      });
    });
    await page.evaluate(() => refreshModelStatus());
    await page.waitForTimeout(600);
    await page.evaluate(() => toggleAgentPalette());
    await page.waitForTimeout(900);
    console.log(`205 starters @${width}:`, JSON.stringify(await measure(page)));
    // The chips carry a glyph now, so the click lands on the <i> as often as
    // on the button: the handler reads `closest('[data-example]')`, and this
    // is the measurement that says so. A stem is left in the box with the
    // caret after it, and the recents group appears once one has been used.
    const stem = await page.$('#command-palette-starters button[data-example="Make a note of "]');
    await stem.click();
    await page.waitForTimeout(400);
    console.log(`205 stem click @${width}:`, JSON.stringify(await page.evaluate(() => ({
      box: document.getElementById('command-palette-input').value,
      focused: document.activeElement.id,
    }))));
    await page.evaluate(() => { renderAgentStarters(); });
    await page.waitForTimeout(200);
    console.log(`205 after a use @${width}:`, JSON.stringify(await page.evaluate(() => {
      const box = document.getElementById('command-palette-starters');
      const heads = [...box.querySelectorAll('.starter-verb')].map((p) => p.textContent);
      const recent = [...box.querySelectorAll('button')].filter(
        (b) => b.previousElementSibling && b.previousElementSibling.textContent === 'Recent'
      );
      return { heads, recentIcon: recent[0] && [...(recent[0].querySelector('i.ph')?.classList || [])].join(' ') };
    })));
    await browser.close();
  }
})();
