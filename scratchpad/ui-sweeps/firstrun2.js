// INBOX 472, the first-run walk, part two: what a new person does next with
// no AI. The AI pill's popup, Settings > Models, the first note captured and
// filed, a question in Ask and in Chat, then the example notes.
// Run after firstrun.js on the same data dir (it unlocks with the password
// that one set).
//   BASE=http://127.0.0.1:8865 W=1440 THEME=light SCRATCH=/tmp/fr node firstrun2.js
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
const phone = W < 600;
const tag = `${W}-${process.env.THEME || 'light'}`;

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
  const OUT = (process.env.SCRATCH || '.') + '/fr';
  const log = [];
  page.on('response', (r) => { if (r.status() >= 400) log.push(`HTTP ${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
  page.on('console', (m) => { if (m.type() === 'error') log.push('ERR ' + m.text().slice(0, 160)); });
  const toasts = () => page.evaluate(() => [...document.querySelectorAll('#toast-container > *, .toast')].filter((t) => t.getBoundingClientRect().height > 0).map((t) => t.innerText.replace(/\s+/g, ' ').slice(0, 220)));

  // 1. the AI pill
  await page.click('#ai-status');
  await page.waitForTimeout(500);
  console.log('PILL', JSON.stringify(await page.evaluate(() => {
    const b = document.getElementById('ai-status'); const p = document.getElementById('ai-status-popup');
    const cs = getComputedStyle(b); const r = b.getBoundingClientRect(); const pr = p.getBoundingClientRect();
    return { level: b.dataset.level, glyph: b.innerText, bg: cs.backgroundColor, fg: cs.color, rect: [r.left, r.top, r.width, r.height], popup: p.innerText, prect: [pr.left, pr.top, pr.width, pr.height], links: p.querySelectorAll('button,a').length };
  })));
  await page.screenshot({ path: `${OUT}/${tag}-20-pill.png` });
  await page.click('#ai-status');

  // 2. Settings > Models
  await page.evaluate(() => openSettingsModal('models'));
  await page.waitForTimeout(1500);
  console.log('MODELS', JSON.stringify(await page.evaluate(() => {
    const pane = [...document.querySelectorAll('.settings-pane, [data-pane]')].find((p) => p.getBoundingClientRect().height > 0 && /model/i.test(p.id || p.dataset.pane || ''));
    const errs = [...document.querySelectorAll('.error, .status.error, .warn, [class*="error"]')].filter((e) => e.getBoundingClientRect().height > 0 && e.innerText.trim()).map((e) => e.className + ': ' + e.innerText.trim().slice(0, 160));
    return { pane: pane ? pane.id : null, text: pane ? pane.innerText.replace(/\s+/g, ' ').slice(0, 1400) : null, errs };
  })));
  await page.screenshot({ path: `${OUT}/${tag}-21-models.png` });
  await page.evaluate(() => closeSettingsModal());
  await page.waitForTimeout(500);

  // 3. capture a first note without AI
  await page.evaluate(() => { switchTab('notes'); showNotesSection('capture'); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${tag}-22-capture.png` });
  const capInfo = await page.evaluate(() => {
    const vis = (e) => e && e.getBoundingClientRect().height > 0;
    return [...document.querySelectorAll('#tab-notes .muted, #tab-notes .hint, #tab-notes [class*="hint"], #tab-notes [class*="banner"]')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12);
  });
  console.log('CAPTURE hints', JSON.stringify(capInfo));
  const ed = await page.evaluate(() => { const el = [...document.querySelectorAll('#tab-notes [contenteditable="true"], #tab-notes textarea, #tab-notes .cm-content')].find((e) => e.getBoundingClientRect().height > 40); if (!el) return null; const r = el.getBoundingClientRect(); return [r.left + 40, r.top + 20, el.className]; });
  console.log('EDITOR', JSON.stringify(ed));
  if (ed) await page.mouse.click(ed[0], ed[1]);
  await page.keyboard.type('Dentist appointment on Friday at 3pm, bring the insurance card');
  await page.waitForTimeout(400);
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(3000);
  console.log('CAPTURE toasts', JSON.stringify(await toasts()));
  await page.screenshot({ path: `${OUT}/${tag}-23-captured.png` });
  await page.evaluate(() => showNotesSection('list'));
  await page.waitForTimeout(1500);
  console.log('LIST', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#entry-list > *')].slice(0, 3).map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 240)))));
  await page.screenshot({ path: `${OUT}/${tag}-24-list.png` });

  // 4. Chat with no model
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1200);
  // the suggestion chips with no model: what does a press do
  const chip = await page.$('.chat-empty button:has-text("What have I saved")');
  if (chip) { await chip.click({ timeout: 3000 }).catch((e) => console.log('CHIP click failed', e.message.split('\n')[0])); }
  await page.waitForTimeout(2500);
  console.log('CHAT', JSON.stringify(await page.evaluate(() => (document.getElementById('chat-messages') || {}).innerText?.replace(/\s+/g, ' ').slice(-600))), JSON.stringify(await toasts()));
  await page.screenshot({ path: `${OUT}/${tag}-25-chat.png` });

  // 5. the graph with one note
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  console.log('GRAPH1', JSON.stringify(await page.evaluate(() => { const e = document.getElementById('graph-empty'); return e && e.getBoundingClientRect().height > 0 ? e.innerText.replace(/\s+/g, ' ') : 'map drawn'; })));
  await page.screenshot({ path: `${OUT}/${tag}-26-graph1.png` });

  // 6. Dashboard after one note
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/${tag}-27-dash1.png`, fullPage: false });
  console.log('LOG', JSON.stringify([...new Set(log)]));
  await browser.close();
})();
