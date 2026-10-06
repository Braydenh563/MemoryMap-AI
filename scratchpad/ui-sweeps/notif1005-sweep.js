// INBOX 584 and 585: one toast recipe, one notification row recipe, and every
// toast action kept in the bell with the same action.
//
//   BASE=http://127.0.0.1:8862 SCRATCH=/tmp/x node scratchpad/ui-sweeps/notif1005-sweep.js
//   (THEME=dark for dark; W=390 for a phone, which also turns on touch)
//
// Prints one JSON line per check and a FAIL line for anything outside:
//   toast: message to first action >= 8px; the first line of the message,
//          every action and the close on one centre line (within 1px).
//   panel: per row, the dot, the icon, the title's first line and the side
//          column (time, or the controls while pointed at) on one centre
//          line within 1px; no control overlapping the text column; equal
//          top and bottom padding.
//   kept:  five kinds of action toast (Undo on the app's stack, an opener
//          by id, a progress toast's "Show it", a one-shot offer, a
//          settings opener) each have a row with the same label, enabled,
//          and pressing it does the thing.
const { boot, OUT } = require('./lib.js');
const W = Number(process.env.W || 1440);
const phone = W < 600;
const fails = [];
const say = (o) => console.log(JSON.stringify(o));
const fail = (m) => { fails.push(m); console.log('FAIL', m); };

(async () => {
  const { browser, page } = await boot({
    viewport: { width: W, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  try {
    // --- toasts -------------------------------------------------------------
    const toastGeom = () => page.evaluate(() => {
      const out = [];
      for (const note of document.querySelectorAll('#toast-box > .toast')) {
        const msg = note.querySelector('.toast-msg') || note.firstElementChild;
        const range = document.createRange();
        range.selectNodeContents(msg);
        const lines = [...range.getClientRects()].filter((r) => r.width > 0);
        const first = lines[0];
        const mr = msg.getBoundingClientRect();
        const buttons = [...note.querySelectorAll(':scope > button')];
        const firstAction = buttons.find((b) => !b.classList.contains('toast-close'));
        const textRight = Math.max(...lines.filter((l) => Math.abs(l.top - first.top) < 2).map((l) => l.right));
        out.push({
          text: note.textContent.trim().slice(0, 50),
          gap: firstAction ? Math.round((firstAction.getBoundingClientRect().left - textRight) * 10) / 10 : null,
          boxGap: firstAction ? Math.round((firstAction.getBoundingClientRect().left - mr.right) * 10) / 10 : null,
          lineMid: Math.round((first.top + first.height / 2) * 10) / 10,
          mids: buttons.map((b) => { const r = b.getBoundingClientRect(); return Math.round((r.top + r.height / 2) * 10) / 10; }),
          below: firstAction ? firstAction.getBoundingClientRect().top >= mr.bottom - 1 : false,
          lines: new Set(lines.map((l) => Math.round(l.top))).size,
          widths: { toast: Math.round(note.getBoundingClientRect().width), msg: Math.round(mr.width), buttons: buttons.map((b) => Math.round(b.getBoundingClientRect().width)) },
        });
      }
      return out;
    });
    await page.evaluate(() => {
      document.getElementById('toast-box').replaceChildren();
      const p = toastProgress('Reading this file');
      p.done('Finished reading this file.', { actionLabel: 'Show it', onAction: () => switchTab('library') });
      const q = toastProgress('Reading a long one');
      q.done('Finished reading holiday-receipts-scan-0042-final.png.', { actionLabel: 'Show it', onAction: () => {} });
      toastAction('Moved to the bin.', 'Undo', () => {});
      toast('Plain notice.');
      toast('Something failed here.', true);
      toastAction('This is close to an existing note, a rather long preview of the other one that wraps.', 'Open it', () => {});
    });
    await page.waitForTimeout(500);
    for (const t of await toastGeom()) {
      say({ check: 'toast', W, ...t });
      // A gap is measured from the end of the words on the action's line:
      // beside the message (on its first line) or under it.
      if (t.gap !== null && !t.below && t.boxGap < 8) fail(`toast gap ${t.boxGap}px: ${t.text}`);
      // One centre line: every control on the message's first line, unless
      // the actions were put under the message (the phone's error toast).
      const onLine = t.mids.filter((m) => Math.abs(m - t.lineMid) <= 1);
      if (!t.below && onLine.length !== t.mids.length) fail(`toast off-centre ${JSON.stringify(t.mids)} vs ${t.lineMid}: ${t.text}`);
    }
    await page.screenshot({ path: `${OUT}/notif1005-toasts-${W}-${process.env.THEME || 'light'}.png` });
    await page.evaluate(() => document.getElementById('toast-box').replaceChildren());

    // --- the panel ----------------------------------------------------------
    await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem('notificationsReadAt', String(now - 3600e3));
      localStorage.setItem('notifications', JSON.stringify([
        { id: 'task:a', kind: 'task', title: 'Finished: tidy tags', detail: '', at: now - 7200e3 },
        { id: 'export:x', kind: 'export', title: 'Saved notes.zip', detail: '/home/someone/MemoryMap/exports/notes.zip', at: now - 5000e3, action: { exports: true } },
        { id: 'untagged:test', kind: 'assist', title: '7 notes have no tags', detail: 'Tags are how notes find each other. Open the list and add a few.', at: now - 60e3, action: { tab: 'notes', filter: 'is:untagged' } },
      ]));
    });
    await page.click('#notif-btn');
    await page.waitForTimeout(600);
    const rowGeom = (hoverIndex) => page.evaluate((hoverIndex) => {
      const rows = [...document.querySelectorAll('#notif-list > li.notif-row')];
      return rows.map((row, i) => {
        const r = row.getBoundingClientRect();
        const title = row.querySelector('.notif-title');
        const range = document.createRange();
        range.selectNodeContents(title);
        const first = [...range.getClientRects()].find((x) => x.width > 0);
        const mid = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width ? Math.round((b.top + b.height / 2) * 10) / 10 : null; };
        const icon = row.querySelector('.notif-icon i, .notif-icon');
        const dot = row.querySelector('.notif-dot');
        const acts = row.querySelector('.notif-row-actions');
        const visible = (el) => el && getComputedStyle(el).opacity !== '0' && getComputedStyle(el).visibility !== 'hidden';
        const body = row.querySelector('.notif-body').getBoundingClientRect();
        const side = row.querySelector('.notif-side').getBoundingClientRect();
        const textOver = [...row.querySelectorAll('.notif-title, .notif-meta')].some((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > side.left + 0.5);
        const toggle = row.querySelector('.notif-read-toggle');
        const ab = acts.getBoundingClientRect();
        const cs = getComputedStyle(row);
        return {
          i, title: title.textContent.slice(0, 30), h: Math.round(r.height * 10) / 10,
          titleMid: Math.round((first.top + first.height / 2) * 10) / 10,
          iconMid: mid(icon), dotMid: dot && visible(dot) ? mid(dot) : null,
          actsMid: visible(acts) ? mid(acts) : null,
          timeMid: visible(row.querySelector('.notif-time')) ? mid(row.querySelector('.notif-time')) : null,
          overlap: visible(acts) && ab.left < body.right - 0.5 && ab.right > body.left && ab.top < body.bottom && ab.bottom > body.top,
          padTop: cs.paddingTop, padBottom: cs.paddingBottom, padLeft: cs.paddingLeft, padRight: cs.paddingRight,
          cta: (row.querySelector('.notif-cta') || {}).textContent || null,
          textOver, toggleShown: visible(acts) && getComputedStyle(toggle).opacity !== '0',
          hovered: i === hoverIndex,
        };
      });
    }, hoverIndex);
    const first = await page.$('#notif-list > li.notif-row');
    if (!phone) await first.hover();
    await page.waitForTimeout(300);
    const rows = await rowGeom(phone ? -1 : 0);
    for (const row of rows) {
      say({ check: 'row', W, ...row });
      // On touch the controls always show and the time sits under them, by
      // design (06-timeline-dialogs.css): there it must be below, not level.
      if (phone && row.timeMid !== null && row.timeMid <= row.actsMid) fail(`row ${row.i}: time not under the controls on touch`);
      for (const k of ['iconMid', 'dotMid', 'actsMid', ...(phone ? [] : ['timeMid'])]) {
        if (row[k] !== null && Math.abs(row[k] - row.titleMid) > 1) fail(`row ${row.i} ${k} ${row[k]} vs title ${row.titleMid}`);
      }
      if (row.overlap) fail(`row ${row.i}: controls overlap the text`);
      if (row.textOver) fail(`row ${row.i}: text runs into the side column`);
      if (row.actsMid !== null && !row.toggleShown) fail(`row ${row.i}: read toggle hidden while the controls show`);
      if (row.padTop !== row.padBottom) fail(`row ${row.i}: padding ${row.padTop}/${row.padBottom}`);
    }
    await page.screenshot({ path: `${OUT}/notif1005-panel-${W}-${process.env.THEME || 'light'}.png` });
    await page.click('#notif-close');

    // --- every toast action is kept in the bell -----------------------------
    const kept = await page.evaluate(async () => {
      localStorage.setItem('notifications', '[]');
      window.__hits = {};
      // 1. an Undo on the app's stack
      const action = pushUndo('Sweep thing', async () => { window.__hits.undo = (window.__hits.undo || 0) + 1; }, async () => {});
      toastAction('Sweep moved to the bin.', 'Undo', async () => { settleUndoFromToast(action); await action.undo(); });
      // 2. an opener by id: a real note
      const made = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Sweep note for the bell ' + Date.now() }) });
      await refreshEntries([made.id]).catch(() => {});
      toastAction('Sweep saved.', 'Go to it', () => flashEntry(made.id), { go: { open: 'entry', id: made.id } });
      // 3. a progress toast's action
      toastProgress('Sweep reading').done('Sweep finished reading.', { actionLabel: 'Show it', onAction: () => switchTab('library'), go: { tab: 'library' } });
      // 4. a one-shot offer
      toastAction('Sweep offer.', 'Turn on', () => { window.__hits.offer = (window.__hits.offer || 0) + 1; });
      // 5. a settings opener
      toastAction('Sweep settings.', 'Change', () => openSettingsModal('appearance'), { go: { settings: 'appearance' } });
      return made.id;
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('toast-box').replaceChildren());
    await page.click('#notif-btn');
    await page.waitForTimeout(500);
    const ctas = await page.evaluate(() => [...document.querySelectorAll('#notif-list .notif-row')].map((r) => ({
      title: r.querySelector('.notif-title').textContent, cta: r.querySelector('.notif-cta')?.textContent || null,
      disabled: !!r.querySelector('.notif-cta')?.disabled,
    })));
    say({ check: 'kept', W, ctas });
    const want = { 'Sweep moved to the bin.': 'Undo', 'Sweep saved.': 'Go to it', 'Sweep finished reading.': 'Show it', 'Sweep offer.': 'Turn on', 'Sweep settings.': 'Change' };
    for (const [title, label] of Object.entries(want)) {
      const row = ctas.find((c) => c.title === title);
      if (!row) { fail(`kept: no row for ${title}`); continue; }
      if (row.cta !== label || row.disabled) fail(`kept: ${title} has ${row.cta} disabled=${row.disabled}`);
    }
    const press = async (title) => {
      const ok = await page.evaluate((title) => {
        if (document.getElementById('notif-panel').classList.contains('hidden')) document.getElementById('notif-btn').click();
        return true;
      }, title);
      await page.waitForTimeout(400);
      const btn = page.locator('#notif-list .notif-row', { hasText: title }).locator('.notif-cta');
      await btn.click();
      await page.waitForTimeout(900);
      return ok;
    };
    await press('Sweep moved to the bin.');
    await press('Sweep offer.');
    const after = await page.evaluate(() => ({ hits: window.__hits, onStack: undoStack.some((a) => a.label === 'Sweep thing') }));
    say({ check: 'pressed', W, ...after });
    if (after.hits.undo !== 1) fail(`kept: Undo from the bell ran ${after.hits.undo} times`);
    if (after.hits.offer !== 1) fail(`kept: offer from the bell ran ${after.hits.offer} times`);
    if (after.onStack) fail('kept: the Undo is still on the app stack after the bell ran it');
    // Pressed once: now disabled and says so.
    await page.evaluate(() => { if (document.getElementById('notif-panel').classList.contains('hidden')) document.getElementById('notif-btn').click(); });
    await page.waitForTimeout(400);
    const spent = await page.evaluate(() => [...document.querySelectorAll('#notif-list .notif-row')].filter((r) => /Sweep (moved|offer)/.test(r.textContent)).map((r) => ({ t: r.querySelector('.notif-title').textContent, d: r.querySelector('.notif-cta')?.disabled, s: r.querySelector('.notif-cta-state')?.textContent })));
    say({ check: 'spent', W, spent });
    if (spent.some((s) => !s.d)) fail('kept: a spent one-shot action is still enabled');
    await press('Sweep saved.');
    const noteOpen = await page.evaluate((id) => ({ tab: document.querySelector('#tab-notes:not(.hidden)') ? 'notes' : 'other', card: !!document.querySelector(`#entry-list li[data-id="${id}"]`) }), kept);
    say({ check: 'opener', W, ...noteOpen });
    if (noteOpen.tab !== 'notes' || !noteOpen.card) fail('kept: Go to it did not open the note');
    await press('Sweep finished reading.');
    const lib = await page.evaluate(() => !!document.querySelector('#tab-library:not(.hidden)'));
    if (!lib) fail('kept: Show it did not open the Library');
    await press('Sweep settings.');
    const settingsOpen = await page.evaluate(() => !!document.querySelector('#settings-modal[open], #settings-modal:not(.hidden), dialog#settings-modal[open]'));
    say({ check: 'settings', W, settingsOpen });
    if (!settingsOpen) fail('kept: Change did not open Settings');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await page.evaluate(() => { location.hash = ''; });
    // After a reload: the live closures are gone. The opener still works by
    // id, and the one-shot actions say Expired.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const pw = await page.$('#lock-password');
    if (pw && await pw.isVisible()) { await page.fill('#lock-password', 'testpassword123'); await page.click('#lock-submit'); await page.waitForTimeout(3000); }
    await page.evaluate(() => { document.querySelectorAll('.confirm-overlay').forEach((o) => o.remove()); });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.click('#notif-btn');
    await page.waitForTimeout(500);
    const reloaded = await page.evaluate(() => [...document.querySelectorAll('#notif-list .notif-row')].filter((r) => /^Sweep/.test(r.querySelector('.notif-title').textContent)).map((r) => ({ t: r.querySelector('.notif-title').textContent, cta: r.querySelector('.notif-cta')?.textContent, d: !!r.querySelector('.notif-cta')?.disabled, s: r.querySelector('.notif-cta-state')?.textContent || '' })));
    say({ check: 'reloaded', W, reloaded });
    for (const r of reloaded) {
      const opener = /saved|finished|settings/.test(r.t);
      if (opener && r.d) fail(`reload: opener ${r.t} disabled`);
      if (!opener && (!r.d || !r.s)) fail(`reload: one-shot ${r.t} not shown as spent or expired`);
    }
    await page.locator('#notif-list .notif-row', { hasText: 'Sweep saved.' }).locator('.notif-cta').click();
    await page.waitForTimeout(1200);
    const reopened = await page.evaluate((id) => !!document.querySelector(`#entry-list li[data-id="${id}"]`), kept);
    say({ check: 'reopened-after-reload', W, reopened });
    if (!reopened) fail('reload: Go to it did not find the note by id');
  } finally {
    console.log(fails.length ? `FAILS ${fails.length}` : 'ALL OK');
    await browser.close();
  }
})();
