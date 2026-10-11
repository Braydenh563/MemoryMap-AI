// Brief 86 (b) and (c): Settings, Data's "Clear and forget" and "Recent changes".
// Measured at 1440 and 390: each row's count line, each clear and its Undo from
// the toast, a changed switch listed with its Undo, a look setting undone, and
// the rows' geometry (one height, nothing spilling).
//   B_ONLY=1 stops after (b)'s clears.
//   BASE=http://127.0.0.1:8875 SCRATCH=<dir> node scratchpad/ui-sweeps/settingsclear86.js [390]
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.argv[2] || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 800 : 900 } });
  const out = {};
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const api = (path, opts = {}) => page.evaluate(async ([p, o, t]) => {
    const r = await fetch(p, { ...o, headers: { 'Content-Type': 'application/json', 'X-Auth-Token': t, ...(o.headers || {}) } });
    return r.json();
  }, [path, opts, token]);
  // Seed: recents, a dismissed merge, a guide turn.
  await page.evaluate(async () => { await ensureModule('searchSuggest'); await ensureModule('settingsData'); searchRecent.push('notes', 'garden beans'); searchRecent.push('web', 'weather'); searchRecent.push('boards', 'plan'); });
  const a = await api('/entries', { method: 'POST', body: JSON.stringify({ content: 'merge probe' }) });
  await page.evaluate(async ([id, t]) => {
    await fetch('/suggestions/merges/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': t }, body: JSON.stringify({ a: id, b: id + 1000, signals: ['part_name'] }) });
  }, [a.id, token]);
  await page.evaluate(() => openSettingsModal('data'));
  await page.waitForTimeout(1500);
  const lines = () => page.evaluate(() => ({
    recents: document.getElementById('clear-recents-what').textContent,
    previews: document.getElementById('clear-previews-what').textContent,
    guide: document.getElementById('clear-guide-what').textContent,
    dismissed: document.getElementById('clear-dismissed-what').textContent,
    off: ['clear-recents', 'clear-previews', 'clear-guide', 'clear-dismissed'].map((id) => document.getElementById(id).disabled),
  }));
  out.before = await lines();
  const geometry = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('#clear-box .setting-row')];
    return rows.map((row) => {
      const r = row.getBoundingClientRect();
      const btn = row.querySelector('button').getBoundingClientRect();
      return { h: Math.round(r.height), btnRight: Math.round(btn.right), rowRight: Math.round(r.right), spills: row.scrollWidth > row.clientWidth };
    });
  });
  out.geometry = await geometry();
  await page.locator('#clear-box').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/shots86/settings-clear-${width}.png` });
  // Recents: clear, toast, undo.
  await page.click('#clear-recents');
  await page.waitForTimeout(500);
  out.afterRecents = { all: await page.evaluate(() => JSON.stringify(searchRecentAll())), toast: await page.evaluate(() => document.querySelector('.toast')?.textContent) };
  await page.locator('.toast .toast-action').first().click();
  await page.waitForTimeout(500);
  out.undoRecents = await page.evaluate(() => JSON.stringify(searchRecentAll()));
  // Dismissed: clear, merge count, undo.
  await page.click('#clear-dismissed');
  await page.waitForTimeout(800);
  out.afterDismissed = await api('/suggestions/dismissed');
  await page.locator('.toast .toast-action').last().click();
  await page.waitForTimeout(800);
  out.undoDismissed = await api('/suggestions/dismissed');
  if (process.env.B_ONLY) { console.log(JSON.stringify(out, null, 1)); await browser.close(); return; }
  // (c) a changed switch has an Undo on its toast and a row in Recent changes.
  await page.evaluate(() => showSettingsSection('general'));
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => document.getElementById('pref-notif-mute-except-reminders').checked);
  await page.click('label:has(#pref-notif-mute-except-reminders)');
  await page.waitForTimeout(1500);
  out.switchToast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent));
  await page.evaluate(() => showSettingsSection('data'));
  await page.waitForTimeout(800);
  out.recentChanges = await page.evaluate(() => [...document.querySelectorAll('#recent-changes-list li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
  await page.locator('#recent-changes-box').scrollIntoViewIfNeeded();
  //: INBOX 848: the words and the action never overlap, the action is one line, and it is a quiet text button.
  out.recentGeometry = await page.evaluate(() => [...document.querySelectorAll('#recent-changes-list li')].map((li) => {
    const w = li.querySelector('.recent-change-words').getBoundingClientRect();
    const a = li.querySelector('.row-actions');
    if (!a) return { h: Math.round(li.getBoundingClientRect().height), noAction: true };
    const b = a.querySelector('button');
    const ar = a.getBoundingClientRect(); const br = b.getBoundingClientRect(); const cs = getComputedStyle(b);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    return {
      h: Math.round(li.getBoundingClientRect().height),
      overlapPx: Math.round(Math.max(0, Math.min(w.right, ar.right) - Math.max(w.left, ar.left))),
      gapPx: Math.round(ar.left - w.right),
      btnLines: (() => { const r = document.createRange(); r.selectNodeContents(b); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; })(),
      btnH: Math.round(br.height), shownAtRest: getComputedStyle(a).opacity === '1' && b.textContent.trim().length > 0, nowrap: cs.whiteSpace, ws: getComputedStyle(a).whiteSpace,
      btnText: b.textContent.trim(), border: cs.borderTopColor === 'rgba(0, 0, 0, 0)' || cs.borderTopWidth === '0px', rightInRow: Math.round(li.getBoundingClientRect().right - br.right),
    };
  }));
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/shots86/settings-recent-${width}.png` });
  await page.locator('#recent-changes-list li button').first().click();
  await page.waitForTimeout(1200);
  const prefs = await api('/preferences');
  out.switchUndone = { before, serverNow: prefs.notifications_muted_except_reminders };
  out.rowAfterUndo = await page.evaluate(() => document.querySelector('#recent-changes-list li')?.textContent.replace(/\s+/g, ' ').trim());
  // A look setting: the density, set then undone.
  await page.evaluate(() => showSettingsSection('appearance'));
  await page.waitForTimeout(800);
  const densityBefore = await page.evaluate(() => localStorage.getItem('density'));
  await page.evaluate((b) => { localStorage.setItem('density', b === 'compact' ? 'comfortable' : 'compact'); }, densityBefore);
  await page.waitForTimeout(1500);
  out.lookToast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent));
  await page.evaluate(() => showSettingsSection('data'));
  await page.waitForTimeout(600);
  out.lookRow = await page.evaluate(() => document.querySelector('#recent-changes-list li')?.textContent.replace(/\s+/g, ' ').trim());
  await page.locator('#recent-changes-list li button').first().click();
  await page.waitForTimeout(1200);
  out.densityUndone = { before: densityBefore, now: await page.evaluate(() => localStorage.getItem('density')) };
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
