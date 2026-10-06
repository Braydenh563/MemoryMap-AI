// INBOX 534: pane bottom vs dock top under a grown composer, chips, streaming.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 900) } });
  await page.evaluate(() => switchTab('chat')); await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const box = document.getElementById('chat-messages');
    for (let i = 0; i < 14; i++) { const m = document.createElement('div'); m.className = 'msg ' + (i % 2 ? 'assistant' : 'user'); const b = document.createElement('div'); b.className = 'msg-body'; b.textContent = ('Answer line ' + i + '. ').repeat(i % 2 ? 40 : 2); m.append(b); box.append(m); }
  });
  const measure = (label) => page.evaluate((label) => {
    const p = document.getElementById('chat-messages'); const r = p.getBoundingClientRect();
    const d = document.querySelector('.chat-dock').getBoundingClientRect();
    const covered = [...document.querySelectorAll('body *')].filter((e) => { if (p.contains(e) || e.contains(p)) return false; const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const b = e.getBoundingClientRect(); return b.width > 40 && b.height > 4 && b.top < r.bottom - 2 && b.bottom > r.bottom - 60 && b.left < r.right - 5 && b.right > r.right - 20 && (s.position === 'absolute' || s.position === 'fixed' || s.position === 'sticky'); }).map((e) => e.id || e.className.toString().slice(0, 28)).slice(0, 4);
    return label + ' ' + JSON.stringify({ paneBottom: Math.round(r.bottom), dockTop: Math.round(d.top), overlap: Math.round(r.bottom - d.top), overScrollbar: covered });
  }, label);
  console.log(await measure('base'));
  await page.evaluate(() => { const i = document.getElementById('chat-input'); i.value = Array(10).fill('a longer message line').join('\n'); i.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(300); console.log(await measure('tall composer'));
  await page.evaluate(() => { document.getElementById('chat-input').value = ''; document.getElementById('chat-input').dispatchEvent(new Event('input', { bubbles: true })); });
  await page.evaluate(() => { const pane = document.getElementById('chat-messages'); pane.scrollTop = 0; pane.dispatchEvent(new Event('scroll')); if (typeof syncChatJumpLatest === 'function') syncChatJumpLatest(); });
  await page.waitForTimeout(300); console.log(await measure('scrolled up (jump pill)'));
  await browser.close();
})();
