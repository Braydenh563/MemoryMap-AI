// INBOX 485: does a chat bubble's action bar show over the Attach panel?
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const box = document.getElementById('chat-messages');
    for (let i = 0; i < 6; i++) {
      const msg = document.createElement('div'); msg.className = 'msg assistant';
      const body = document.createElement('div'); body.className = 'msg-body'; body.textContent = 'An answer paragraph that is long enough to fill a line. '.repeat(4);
      msg.appendChild(body);
      msg.appendChild(assistantMessageActions({ bubble: msg, text: 'x', question: 'q' }));
      box.appendChild(msg);
    }
    box.scrollTop = box.scrollHeight;
  });
  await page.evaluate(() => openNotePicker());
  await page.waitForTimeout(700);
  const panel = await page.locator('#note-picker-panel').boundingBox();
  const shown = [];
  for (let y = panel.y + 10; y < panel.y + panel.height; y += 20) {
    for (const x of [panel.x + 30, panel.x + panel.width / 2, panel.x + panel.width - 30]) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(60);
      const vis = await page.evaluate(() => [...document.querySelectorAll('.msg-actions')].filter((a) => getComputedStyle(a).opacity !== '0').length);
      if (vis) shown.push([Math.round(x), Math.round(y)]);
    }
  }
  const z = await page.evaluate(() => {
    const p = document.getElementById('note-picker-panel');
    const top = (x, y) => { const e = document.elementFromPoint(x, y); return e && (e.closest('.msg') ? 'msg' : e.closest('#note-picker-panel') ? 'panel' : e.tagName); };
    const b = p.getBoundingClientRect();
    return { mid: top(b.x + b.width / 2, b.y + 40), left: top(b.x + 20, b.y + 80) };
  });
  const walk = [];
  await page.focus('#note-picker-search');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab');
    walk.push(await page.evaluate(() => { const a = document.activeElement; return (a.closest('#note-picker-panel') ? 'panel:' : a.closest('.msg') ? 'MSG:' : 'other:') + (a.id || a.className || a.tagName).toString().slice(0, 24); }));
  }
  const fwd = [];
  await page.focus('#note-picker-done');
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    fwd.push(await page.evaluate(() => { const a = document.activeElement; return (a.closest('#note-picker-panel') ? 'panel:' : a.closest('.msg') ? 'MSG:' : 'other:') + (a.id || a.className || a.tagName).toString().slice(0, 24); }));
  }
  console.log(JSON.stringify({ back: walk, fwd }));
  const guard = await page.evaluate(() => {
    const btn = document.querySelector('#chat-messages .msg-action'); btn.focus();
    const row = btn.closest('.msg-actions');
    const open = getComputedStyle(row).visibility;
    document.getElementById('note-picker-panel').classList.add('hidden');
    const closed = getComputedStyle(row).visibility;
    return { open, closed };
  });
  console.log('guard', JSON.stringify(guard), guard.open === 'hidden' && guard.closed === 'visible' ? 'PASS' : 'FAIL');
  console.log(JSON.stringify({ panel, actionsShownAt: shown.length, sample: shown.slice(0, 4), z }));
  await browser.close();
})();
