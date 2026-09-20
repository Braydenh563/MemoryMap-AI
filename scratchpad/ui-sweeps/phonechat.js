// UI Phase 11 item 3: Chat on a phone. The composer is one row (box, mic,
// Send), the mode segment is the first thing in the controls strip and on
// screen, a reply's sources open as a sheet, and the popup agent goes to
// the Chat tab instead of floating over it.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1000);
  const findings = [];
  const c = await page.evaluate(() => {
    const r = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right) }; };
    const composer = document.querySelector('.chat-composer').getBoundingClientRect();
    const strip = document.querySelector('.chat-dock-controls');
    return { input: r('chat-input'), mic: r('mic-chat'), send: r('chat-send'), seg: r('chat-mode-seg'), composerH: Math.round(composer.height), stripScroll: strip.scrollLeft, firstInStrip: [...strip.children].filter((e) => e.getBoundingClientRect().width > 0).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0]?.className };
  });
  console.log('composer', JSON.stringify(c));
  if (c.mic.y !== c.input.y + c.input.h - c.mic.h && Math.abs((c.mic.y + c.mic.h) - (c.input.y + c.input.h)) > 2) findings.push('the mic is not on the box\'s row');
  if (Math.abs((c.send.y + c.send.h) - (c.input.y + c.input.h)) > 2) findings.push('Send is not on the box\'s row');
  if (c.input.w < 160) findings.push('the box is too narrow on one row: ' + c.input.w);
  if (c.composerH > 60) findings.push('the composer is still two rows tall: ' + c.composerH);
  if (c.seg.right > 390 || c.seg.x < 0) findings.push(`the mode segment is off screen: ${c.seg.x} to ${c.seg.right}`);
  if (!/chat-tool-group-mode/.test(c.firstInStrip || '')) findings.push('the mode segment is not first in the strip: ' + c.firstInStrip);
  if (c.seg.h < 44) findings.push('the mode segment is under 44px: ' + c.seg.h);
  // Sources as a sheet: a panel built the way a reply builds it.
  await page.evaluate(() => {
    const note = allEntries[0];
    const panel = chatSourcesPanel({ sources: [{ kind: 'note', id: note ? note.id : 1, title: 'A source note', preview: 'Some words the answer drew on.' }], meta: {} });
    const host = document.getElementById('chat-messages') || document.querySelector('.chat-messages');
    panel.id = 'probe-sources';
    host.appendChild(panel);
  });
  await page.click('#probe-sources > summary');
  await page.waitForTimeout(600);
  const sheet = await page.evaluate(() => { const ov = document.querySelector('.sheet-overlay[data-sheet="sources"]'); const det = document.getElementById('probe-sources'); return { open: !!ov, cards: ov ? ov.querySelectorAll('.chat-source-card').length : 0, detailsOpen: det.open, bodyInDetails: !!det.querySelector('.chat-sources-body') }; });
  console.log('sources', JSON.stringify(sheet));
  if (!sheet.open || sheet.cards !== 1) findings.push('the sources did not open as a sheet');
  if (sheet.detailsOpen || sheet.bodyInDetails) findings.push('the sources also unfolded in place');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const back = await page.evaluate(() => ({ gone: !document.querySelector('.sheet-overlay[data-sheet="sources"]'), bodyBack: !!document.querySelector('#probe-sources .chat-sources-body') }));
  if (!back.gone || !back.bodyBack) findings.push('closing the sheet did not put the sources back: ' + JSON.stringify(back));
  // The popup agent goes to Chat on a phone.
  await page.evaluate(() => switchTab('notes')); await page.waitForTimeout(400);
  await page.evaluate(() => toggleAgentPalette()); await page.waitForTimeout(500);
  const agent = await page.evaluate(() => ({ tab: document.querySelector('#tab-bar button.active, #phone-tab-dock #tab-bar button.active')?.dataset.tab, palette: !document.getElementById('command-palette-overlay')?.classList.contains('hidden'), focus: document.activeElement && document.activeElement.id }));
  console.log('agent', JSON.stringify(agent));
  if (agent.tab !== 'chat') findings.push('the popup agent did not go to Chat: ' + agent.tab);
  if (agent.palette) findings.push('the popup agent opened over the phone');
  // With no model running the box is disabled (data-needs-model) and cannot
  // take focus; the redirect is still the point.
  const boxDisabled = await page.evaluate(() => document.getElementById('chat-input').disabled);
  if (agent.focus !== 'chat-input' && !boxDisabled) findings.push('the chat box is not focused: ' + agent.focus);
  // Desktop: the composer wraps as before and the palette opens.
  await page.setViewportSize({ width: 1024, height: 800 }); await page.waitForTimeout(600);
  await page.evaluate(() => toggleAgentPalette()); await page.waitForTimeout(400);
  const desk = await page.evaluate(() => ({ palette: !document.getElementById('command-palette-overlay')?.classList.contains('hidden') }));
  if (!desk.palette) findings.push('the popup agent does not open at 1024');
  await page.evaluate(() => toggleAgentPalette());
  if (errors.length) findings.push('page errors: ' + errors.join(' | '));
  console.log(findings.length ? 'FAIL: ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
