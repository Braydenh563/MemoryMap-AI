// INBOX 681: every menu, dropdown and popover trigger toggles. Presses each
// trigger found on each tab twice with a real mouse and asserts it is closed
// after the second press; then the same with Enter on the keyboard.
//   BASE=http://127.0.0.1:8823 [THEME=dark] [TABS=notes,library] node scratchpad/ui-sweeps/toggles681.js
// (INBOX 680, the Settings sidebar follow, is in settingsfollow680.js.)
const { boot } = require('./lib.js');
const TABS = ['notes', 'dashboard', 'chat', 'graph', 'library', 'documents', 'timeline', 'reminders'];
const SKIP = '#tab-bar *, #tab-bar-more *, .tab-more *';

// What "open" means for a trigger: its aria-expanded, a <details> menu's
// open flag, or (last resort) a visible menu tied to it.
const stateOf = (page, i) => page.evaluate((i) => {
  const el = window.__trig[i];
  if (!el || !el.isConnected) return 'gone';
  if (el.tagName === 'SUMMARY') return el.parentElement.open ? 'open' : 'closed';
  const a = el.getAttribute('aria-expanded');
  if (a !== null) return a === 'true' ? 'open' : 'closed';
  const c = el.closest('.menu-wrap, .select-shell, details');
  const m = c && c.querySelector('.action-menu:not(.hidden), .select-menu:not(.hidden)');
  return m ? 'open' : 'closed';
}, i);

async function discover(page) {
  return page.evaluate(({ skip }) => {
    const vis = (el) => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'
        && !el.closest('.hidden, [hidden]') && r.bottom > 0 && r.right > 0 && !el.disabled;
    };
    const all = [...document.querySelectorAll('[aria-haspopup], [aria-expanded], summary, [data-help-for]')]
      .filter((el) => !el.matches(skip) && vis(el) && !el.closest('dialog:not([open]), #settings-modal'));
    // aria-expanded on a plain disclosure (an accordion) is not a floating
    // menu: keep what floats (a popup role, a details menu, a help '?').
    const keep = all.filter((el) => el.hasAttribute('aria-haspopup') || el.tagName === 'SUMMARY'
      || el.hasAttribute('data-help-for') || /menu|popover|select|more|dock/i.test(el.className + el.id));
    window.__trig = keep;
    return keep.map((el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).slice(0, 3).join('.'))
      + ' [' + (el.getAttribute('aria-label') || el.textContent.trim().slice(0, 24) || el.title || '') + ']');
  }, { skip: SKIP });
}

const centre = (page, i) => page.evaluate((i) => {
  const el = window.__trig[i]; if (!el) return null;
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, i);

async function neutral(page) {
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
    await page.evaluate((t) => switchTab(t), tab); await page.waitForTimeout(1800);
    await neutral(page);
    const names = await discover(page);
    for (let i = 0; i < names.length; i++) {
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
