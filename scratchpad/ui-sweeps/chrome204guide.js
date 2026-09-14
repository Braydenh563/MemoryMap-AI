// INBOX 204, the second half: the guide's name on every surface that says it,
// and its empty state saying what it is before it is asked.
const { boot } = require('./lib.js');

(async () => {
  for (const width of [1440, 390]) {
    const { browser, page } = await boot({ viewport: { width, height: width === 390 ? 844 : 900 } });
    // The status bar's slot, built by app.js from the one constant.
    console.log(`204 status slot @${width}:`, JSON.stringify(await page.evaluate(() => {
      const slot = document.getElementById('status-guide');
      return slot && { text: slot.textContent.trim(), title: slot.title, hidden: slot.hidden };
    })));
    await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(700);
    console.log(`204 guide sheet @${width}:`, JSON.stringify(await page.evaluate(() => {
      const sheet = document.querySelector('[data-sheet="guide"]');
      const empty = document.getElementById('help-chat-empty');
      const head = sheet && sheet.querySelector('.sheet-head');
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { w: Math.round(b.width), h: Math.round(b.height) };
      };
      return {
        sheetTitle: head && head.textContent.replace(/\s+/g, ' ').trim(),
        subhead: (document.querySelector('#help-chat-group .setting-subhead') || {}).textContent,
        emptyShown: !!empty && !empty.hidden && r(empty).h > 0,
        emptyBox: r(empty),
        emptyText: empty && empty.textContent.replace(/\s+/g, ' ').trim(),
        // Every remaining "Guide" or "the guide" on this surface: the name is
        // supposed to be in one place, so a stray one is a rename that did not
        // finish.
        strays: [...document.querySelectorAll('#help-chat-group *')]
          .flatMap((el) => [el.title, el.getAttribute('aria-label'), el.placeholder])
          .filter((t) => t && /\bguide\b/i.test(t)),
      };
    })));
    // A turn retires the description, New chat brings it back.
    await page.evaluate(() => {
      renderHelpChatMessage('user', 'who are you?');
      renderHelpChatMessage('assistant', 'I am Atlas, this app\'s guide.', []);
    });
    await page.waitForTimeout(200);
    const afterTurn = await page.evaluate(() => {
      const e = document.getElementById('help-chat-empty');
      return { hidden: e.hidden, rows: document.querySelectorAll('.help-chat-msg').length };
    });
    await page.click('#help-chat-clear');
    await page.waitForTimeout(300);
    const afterClear = await page.evaluate(() => {
      const e = document.getElementById('help-chat-empty');
      return { hidden: e.hidden, rows: document.querySelectorAll('.help-chat-msg').length };
    });
    console.log(`204 empty state @${width}:`, JSON.stringify({ afterTurn, afterClear }));
    await browser.close();
  }
})();
