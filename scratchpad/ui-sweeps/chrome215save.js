// INBOX 215: the popup agent's conversation, kept. The palette holds its turns
// in memory only; "Save as chat" in the foot menu posts them to /conversations
// and hands you the thread.
//
// The agent itself needs a model, which this sandbox has none of, so the turns
// are pushed into `cmdPaletteTurns` directly: what is measured here is the
// menu, the save and what comes back, not the model.
const { boot } = require('./lib.js');

(async () => {
  for (const width of [1440, 390]) {
    const { browser, page } = await boot({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.evaluate(() => toggleAgentPalette());
    await page.waitForTimeout(700);

    const empty = await page.evaluate(() => {
      const host = document.getElementById('command-palette-menu');
      const opener = host.querySelector('[aria-haspopup="menu"]');
      opener.click();
      const rows = [...host.querySelectorAll('[role="menuitem"]')];
      return {
        opener: Math.round(opener.getBoundingClientRect().width) + 'x' + Math.round(opener.getBoundingClientRect().height),
        rows: rows.map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
        unavailable: rows.filter((r) => r.getAttribute('aria-disabled') === 'true').length,
        footH: Math.round(document.querySelector('.command-palette-foot').getBoundingClientRect().height),
      };
    });
    console.log(`215 nothing to save @${width}:`, JSON.stringify(empty));

    const saved = await page.evaluate(async () => {
      document.body.click();
      cmdPaletteTurns.push(
        { question: 'What did I write this week?', answer: 'Two notes about the allotment.' },
        { question: 'Make a note of the second one', answer: 'Filed it under Home.' }
      );
      renderCmdPaletteMenu();
      const host = document.getElementById('command-palette-menu');
      host.querySelector('[aria-haspopup="menu"]').click();
      const rows = [...host.querySelectorAll('[role="menuitem"]')];
      const before = rows.map((r) => r.getAttribute('aria-disabled'));
      rows.find((r) => /Save as chat/.test(r.textContent)).click();
      await new Promise((r) => setTimeout(r, 2500));
      const status = document.getElementById('command-palette-status');
      const toast = document.querySelector('#toast-box .toast');
      const list = await (await fetch('/conversations', {
        headers: { 'X-Auth-Token': localStorage.getItem('token') || '' },
      })).json();
      const newest = (list.items || list)[0];
      const full = await (await fetch(`/conversations/${newest.id}`, {
        headers: { 'X-Auth-Token': localStorage.getItem('token') || '' },
      })).json();
      return {
        rowsBefore: before,
        status: status.textContent.replace(/\s+/g, ' ').trim(),
        toast: toast ? toast.textContent.replace(/\s+/g, ' ').trim() : null,
        hasOpen: !!(toast && [...toast.querySelectorAll('button')].some((b) => b.textContent === 'Open it')),
        title: newest.title,
        messages: full.messages.length,
        roles: full.messages.map((m) => m.role),
        first: (full.messages[0] || {}).content,
        last: (full.messages[full.messages.length - 1] || {}).content,
      };
    });
    console.log(`215 saved @${width}:`, JSON.stringify(saved));
    await browser.close();
  }
})();
