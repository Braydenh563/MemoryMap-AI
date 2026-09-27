// A long chat opened before p5 has loaded (the review of 2026-09-27): p5 is
// held back by a route, a TURNS-turn chat is opened, p5 is let through, and
// the sweep counts the p5 sketches the transcript started and the blank
// reply emblems. Should be 1 sketch and 0 blank.
//
//   BASE=http://127.0.0.1:8830 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/emblemcold.js      (TURNS=40)
const { boot } = require('./lib.js');
const TURNS = Number(process.env.TURNS || 40);
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const out = {};
  try {
    const convId = await page.evaluate(async (n) => {
      const first = await apiJson('/conversations', { method: 'POST', body: JSON.stringify({ question: 'Cold q0', answer: 'Answer 0.' }) });
      for (let i = 1; i < n; i++) {
        await api(`/conversations/${first.id}/turns`, { method: 'POST', body: JSON.stringify({ question: `Cold q${i}`, answer: `Answer ${i}.` }) });
      }
      localStorage.setItem('activeTab', 'chat');
      return first.id;
    }, TURNS);
    let release;
    const gate = new Promise((r) => { release = r; });
    await page.context().route('**/vendor/p5.min.js*', async (route) => { await gate; await route.continue(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof openConversation === 'function' && document.getElementById('lock-overlay')?.classList.contains('hidden'), null, { timeout: 20000, polling: 100 }).catch(async () => {
      if (await page.$('#lock-password')) { await page.fill('#lock-password', 'testpassword123'); await page.click('#lock-submit'); }
    });
    await page.waitForTimeout(1500);
    out.p5Before = await page.evaluate(() => typeof p5 !== 'undefined');
    await page.evaluate((id) => { switchTab('chat'); return openConversation(id); }, convId);
    await page.waitForTimeout(800);
    out.replies = await page.evaluate(() => document.querySelectorAll('#chat-messages .msg.assistant').length);
    release();
    await page.waitForFunction(() => typeof p5 !== 'undefined', null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    out.after = await page.evaluate(() => {
      const chat = [...emblemInstances.keys()].filter((h) => h.closest('#chat-messages')).length;
      const canvases = document.querySelectorAll('#chat-messages canvas').length;
      const blank = [...document.querySelectorAll('#chat-messages canvas')].filter((c) => !c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0)).length; return { chatSketches: chat, allSketches: emblemInstances.size, chatCanvases: canvases, blank };
    });
  } finally {
    console.log(JSON.stringify(out));
    await browser.close();
  }
})();
