// INBOX 681: every menu, dropdown and popover trigger toggles. Presses each
// trigger found on each tab twice with a real mouse and asserts it is closed
// after the second press; then the same with Enter on the keyboard.
//   BASE=http://127.0.0.1:8823 [THEME=dark] [TABS=notes,library] node scratchpad/ui-sweeps/toggles681.js
// (INBOX 680, the Settings sidebar follow, is in settingsfollow680.js.)
const { boot } = require('./lib.js');
const TABS = ['notes', 'dashboard', 'chat', 'graph', 'library', 'documents', 'timeline', 'reminders', 'board', 'map', 'settings:appearance', 'settings:models', 'settings:privacy', 'settings:system'];
const SKIP = '#tab-bar *, #tab-bar-more *, .tab-more *';

// What "open" means for a trigger: its aria-expanded, a <details> menu's
// open flag, or (last resort) a visible menu tied to it.
const stateOf = (page, i) => page.evaluate((i) => {
  const el = window.__trig[i];
  if (!el || !el.isConnected) return 'gone';
  if (el.tagName === 'SUMMARY') return el.parentElement.open ? 'open' : 'closed';
  const a = el.getAttribute('aria-expanded');
  if (a !== null) return a === 'true' ? 'open' : 'closed';
  // No aria state (a chip, a context-style menu): any menu on show counts,
  // because every press starts from a page with none open.
  const m = document.querySelector('.action-menu:not(.hidden), .select-menu:not(.hidden), .help-popover');
  return m ? 'open' : 'closed';
}, i);

async function discover(page, first) {
  return page.evaluate(({ skip, first }) => {
    if (!first) { // look the tagged controls up again; the DOM may have redrawn
      const t = []; document.querySelectorAll('[data-t681]').forEach((e) => { t[+e.getAttribute('data-t681')] = e; });
      window.__trig = t; return [];
    }
    const vis = (el) => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'
        && !el.closest('.hidden, [hidden]') && r.right > 0 && !el.disabled
        // Hit-testable: what is under the centre is the control itself, so a
        // control a layer covers (or that is off screen) is not pressed blind.
        && (r.top < 0 || r.bottom > innerHeight || (() => { const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!t && (t === el || el.contains(t)); })());
    };
    const all = [...document.querySelectorAll('[aria-haspopup], [aria-expanded], summary, [data-help-for]')]
      .filter((el) => !el.matches(skip) && vis(el) && !el.closest('dialog:not([open])') && (window.__inSettings ? !!el.closest('#settings-modal') && !el.closest('#settings-nav') : !el.closest('#settings-modal')));
    // aria-expanded on a plain disclosure (an accordion) is not a floating
    // menu: keep what floats (a popup role, a details menu, a help '?').
    const keep = all.filter((el) => el.tagName !== 'INPUT' && (el.hasAttribute('aria-haspopup') || (el.tagName === 'SUMMARY' && /menu|dock|more/i.test(el.parentElement.className + el.className))
      || el.hasAttribute('data-help-for') || /menu|popover|select|more|dock/i.test(el.className + el.id)));
    document.querySelectorAll('[data-t681]').forEach((e) => e.removeAttribute('data-t681'));
    keep.forEach((e, i) => e.setAttribute('data-t681', i));
    window.__trig = keep;
    return keep.map((el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).slice(0, 3).join('.'))
      + ' [' + (el.getAttribute('aria-label') || el.textContent.trim().slice(0, 24) || el.title || '') + ']');
  }, { skip: SKIP, first });
}

const centre = (page, i) => page.evaluate((i) => {
  const el = window.__trig[i]; if (!el) return null;
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  // A split button (the board's Shapes): its menu is the caret half, the
  // main half picks a tool.
  const part = el.querySelector('.wb-shape-caret') || el;
  const r = part.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, i);

async function neutral(page) {
  if (await page.evaluate(() => window.__inSettings)) { // Escape and the backdrop would close the dialog
    await page.click('#settings-search', { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(250); return;
  }
  await page.keyboard.press('Escape'); await page.mouse.click(2, 2); await page.waitForTimeout(250);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const out = [];
  let errs = 0;
  page.on('pageerror', () => errs++);
  await page.evaluate(async () => {
    const have = await apiJson('/entries?limit=3').catch(() => []);
    if (!have.length) for (const content of ['First note about alpha', 'Second note about beta', 'Third note']) await api('/entries', { method: 'POST', body: JSON.stringify({ content }) });
  });
  const only = process.env.TABS ? process.env.TABS.split(',') : TABS;
  for (const tab of only) {
    await page.evaluate((s) => { window.__inSettings = s; }, tab.startsWith('settings'));
    if (tab.startsWith('settings')) {
      await page.evaluate((p) => openSettingsModal(p), tab.split(':')[1]); await page.waitForTimeout(1500);
    } else if (tab === 'board' || tab === 'map') {
      // The board's and the map's own toolbars: a board of its own, made
      // through the API (a fresh data dir has none).
      await page.evaluate(() => switchTab('library')); await page.waitForTimeout(1500);
      await page.evaluate(async (tab) => {
        const r = tab === 'map'
          ? await apiJson('/whiteboard/boards/import', { method: 'POST', body: JSON.stringify({ format: 'markdown', content: '# Bars\n\n- Centre\n  - A topic\n  - Another' }) })
          : await (await api('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Toggle sweep' }) })).json();
        await openWhiteboardBoard(r.id);
      }, tab);
      await page.waitForTimeout(2500);
    } else { await page.evaluate((t) => switchTab(t), tab); await page.waitForTimeout(1800); }
    await neutral(page);
    const names = await discover(page, true);
    for (let i = 0; i < names.length; i++) {
      if (tab.startsWith('settings')) { // Escape and a backdrop press close the dialog itself
        await page.evaluate((p) => { if (document.getElementById('settings-modal').classList.contains('hidden')) return openSettingsModal(p); }, tab.split(':')[1]);
        await page.waitForTimeout(700);
      }
      await discover(page); // fresh element list each time (the DOM may redraw)
      const rec = { tab, name: names[i] };
      try {
        const box = await centre(page, i);
        await page.waitForTimeout(80);
        await page.mouse.click(box.x, box.y); await page.waitForTimeout(450);
        await discover(page); rec.s1 = await stateOf(page, i);
        const box2 = await centre(page, i);
        if (box2) { await page.mouse.click(box2.x, box2.y); await page.waitForTimeout(450); }
        await discover(page); rec.s2 = await stateOf(page, i);
        if (rec.s1 === 'open' && rec.s2 === 'closed') {
          await page.evaluate((i) => window.__trig[i].focus(), i);
          await page.keyboard.press('Enter'); await page.waitForTimeout(450);
          await discover(page); rec.k1 = await stateOf(page, i);
          await page.evaluate((i) => window.__trig[i] && window.__trig[i].focus(), i);
          await page.keyboard.press('Enter'); await page.waitForTimeout(450);
          await discover(page); rec.k2 = await stateOf(page, i);
        }
      } catch (e) { rec.err = String(e.message).slice(0, 80); }
      await neutral(page);
      rec.ok = rec.s1 === 'open' ? (rec.s2 === 'closed' && (rec.k1 !== 'open' || rec.k2 === 'closed')) : null;
      out.push(rec);
    }
  }
  const opened = out.filter((r) => r.s1 === 'open');
  console.log(out.map((r) => JSON.stringify(r)).join('\n'));
  const bad = opened.filter((r) => !r.ok);
  console.log(`\nTRIGGERS found ${out.length}, opened by first press ${opened.length}, toggled shut by second ${opened.length - bad.length}, FAILED ${bad.length}; page errors ${errs}`);
  for (const b of bad) console.log('FAIL', JSON.stringify(b));
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
