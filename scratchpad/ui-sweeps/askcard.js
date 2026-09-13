// INBOX 169/171/173: the ask-user card chooses then sends, has its own
// answer field, is settled by a send from the chat bar; the logs dock's
// kebab has no chevron over its dots. As numbers.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node askcard.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  const bad = [];
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(500);
  const q = await page.evaluate(() => {
    const holder = document.getElementById('chat-messages');
    const orig = window.sendChatMessage; window.__sent = []; window.sendChatMessage = (t) => { window.__sent.push(t); };
    renderAgentQuestion(holder, { question: 'Which one?', options: ['Alpha', 'Beta', 'Other'] });
    const card = holder.querySelector('.agent-ask');
    const btns = [...card.querySelectorAll('.agent-ask-options button')];
    const send = [...card.querySelectorAll('button')].find((b) => /Send answer/.test(b.textContent));
    const disabledAtStart = send.disabled;
    btns[1].click();
    const pressed = btns.map((b) => b.getAttribute('aria-pressed')).join(',');
    const sentAfterPick = window.__sent.length;
    const input = card.querySelector('.agent-ask-other-input');
    const inputH = Math.round(input.getBoundingClientRect().height), btnH = Math.round(btns[0].getBoundingClientRect().height);
    input.value = 'my own words'; input.dispatchEvent(new Event('input'));
    send.click();
    const cardGone = !holder.querySelector('.agent-ask');
    renderAgentQuestion(holder, { question: 'Again?', options: ['A', 'B'] });
    settlePendingAgentQuestion('typed in the bar');
    const secondGone = !holder.querySelector('.agent-ask');
    const chips = [...holder.querySelectorAll('.tool-chip, details.tool-chip')].map((c) => c.textContent.trim().slice(0, 40));
    window.sendChatMessage = orig;
    return { disabledAtStart, pressed, sentAfterPick, inputH, btnH, sent: window.__sent, cardGone, secondGone, chips };
  });
  console.log(`169 card        send disabled at start ${q.disabledAtStart}, pick marks ${q.pressed} and sends ${q.sentAfterPick}, field ${q.inputH}px beside ${q.btnH}px buttons, sent ${JSON.stringify(q.sent)}, card folded ${q.cardGone}, bar-typed answer folds the next ${q.secondGone}: ${JSON.stringify(q.chips)}`);
  if (!q.disabledAtStart || q.pressed !== 'false,true,false' || q.sentAfterPick !== 0 || q.inputH !== q.btnH || q.sent.length !== 1 || !q.cardGone || !q.secondGone) bad.push('ask card');
  await page.evaluate(() => openSettingsModal('logs')); await page.waitForTimeout(800);
  const k = await page.evaluate(() => { const s = document.querySelector('#logs-more-menu > summary'); const r = s.getBoundingClientRect(); const b = getComputedStyle(s, '::before'); const i = s.querySelector('i').getBoundingClientRect(); return { before: b.content, iconOffset: Math.round(i.left - r.left), iconW: Math.round(i.width), btnW: Math.round(r.width) }; });
  console.log(`173 logs kebab  before ${k.before}, icon at ${k.iconOffset}px of ${k.btnW}px (${k.iconW}px wide)`);
  if (k.before !== 'none' || Math.abs(k.iconOffset * 2 + k.iconW - k.btnW) > 2) bad.push('kebab chevron');
  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
