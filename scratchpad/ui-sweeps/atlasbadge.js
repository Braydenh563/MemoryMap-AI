// INBOX 234: "the web search and skills hyperlinked badges in the atlas
// interface dont work" (Chat, which carries `data-goto-tab`, does).
//
//   BASE=http://127.0.0.1:8801 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/atlasbadge.js
//
// The badges come back from the help chat's answer, which needs a model this
// sandbox does not have, so the answer row is built directly through the same
// renderer the stream uses (`renderHelpChatMessage`) with the three badge
// shapes the server can send: tab only, section only, and both. Everything
// after that is a real click on the real button in the real sheet.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  const inject = () => page.evaluate(() => {
    document.querySelector('[data-sheet="guide"] .sheet-close')?.click();
    if (typeof closeSettingsModal === 'function') closeSettingsModal();
    openHelpChat();
    renderHelpChatMessage('assistant', 'Try these.', [
      { label: 'Chat', tab: 'chat' },
      { label: 'Web search', section: 'websearch' },
      { label: 'Skills', section: 'skills' },
      { label: 'Reminders', tab: 'reminders', section: 'preferences' },
    ]);
  });

  const state = () => page.evaluate(() => ({
    sheet: !!document.querySelector('[data-sheet="guide"]'),
    modal: !document.getElementById('settings-modal').classList.contains('hidden'),
    section: typeof currentSettingsSection === 'string' ? currentSettingsSection : null,
    tab: localStorage.getItem('activeTab'),
  }));

  for (const [label, want] of [
    ['Chat', { modal: false, tab: 'chat' }],
    ['Web search', { modal: true, section: 'websearch' }],
    ['Skills', { modal: true, section: 'skills' }],
    ['Reminders', { modal: true, section: 'preferences' }],
  ]) {
    await inject();
    await page.waitForTimeout(300);
    const before = await state();
    await page.click(`.help-chat-badges >> text="${label}"`);
    await page.waitForTimeout(500);
    const after = await state();
    const ok = Object.entries(want).every(([k, v]) => after[k] === v) && after.sheet === false;
    check(`badge "${label}" arrives`, ok,
      `before ${JSON.stringify(before)} -> after ${JSON.stringify(after)}, wanted ${JSON.stringify(want)} with the sheet closed`);
  }

  // The Settings modal's own section links must still be handled once, by the
  // modal's delegated handler: a second handler that closes and reopens the
  // modal would flash it under the pointer.
  await page.evaluate(() => { if (typeof closeSettingsModal === 'function') closeSettingsModal(); openSettingsModal('websearch'); });
  await page.waitForTimeout(300);
  const inModal = await page.evaluate(() => {
    const opened = [];
    const closed = [];
    const realOpen = window.openSettingsModal;
    const realClose = window.closeSettingsModal;
    window.openSettingsModal = (s) => { opened.push(s || null); return realOpen(s); };
    window.closeSettingsModal = (...a) => { closed.push(1); return realClose(...a); };
    const link = document.querySelector('#settings-modal [data-goto-section]:not([data-goto-tab])');
    link?.click();
    window.openSettingsModal = realOpen;
    window.closeSettingsModal = realClose;
    return { found: !!link, to: link?.dataset.gotoSection, opened, closed: closed.length, section: currentSettingsSection };
  });
  check('a Settings-internal section link is not re-opened', inModal.found && inModal.opened.length === 0 && inModal.closed === 0 && inModal.section === inModal.to,
    `link to ${inModal.to}: openSettingsModal ${inModal.opened.length} times, closeSettingsModal ${inModal.closed} times, landed on ${inModal.section}`);

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
