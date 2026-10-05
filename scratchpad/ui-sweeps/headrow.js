// Every dialog head is one row (INBOX 552, the owner: "wrapping elements at
// the top of the dictionary"; the Suggestions head the same). For every
// `.dialog-head` in the page's markup, and the script-built ones
// (`dialogHead`, `pickerDialog`), shows its surface (a `<dialog>` by
// `showModal`, an overlay or panel by taking `hidden` off it and its
// ancestors), and asserts at 390 (a phone context, the narrowest a dialog
// is) and 1440: every visible button in the head has its centre on the
// title's centre line (within 2px), and nothing in the head runs past the
// head's right edge. THEME=dark for dark.
//
//   BASE=http://127.0.0.1:8810 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/headrow.js
const { boot } = require('./lib.js');

const MEASURE = (head) => {
  const c = (e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; };
  const title = head.querySelector('.dialog-head-title, h2, h3, strong');
  const btns = [...head.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 0);
  if (!title || !title.getBoundingClientRect().width) return { skip: true };
  const hr = head.getBoundingClientRect();
  const off = btns.filter((b) => Math.abs(c(b) - c(title)) > 2).map((b) => b.getAttribute('aria-label') || b.id || b.textContent.trim());
  const past = btns.filter((b) => b.getBoundingClientRect().right > hr.right + 1).map((b) => b.getAttribute('aria-label') || b.id);
  return { title: title.textContent.trim().slice(0, 30), off, past, w: Math.round(hr.width) };
};

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) fails += 1;
  console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : JSON.stringify(detail));
};

(async () => {
  const theme = process.env.THEME || 'light';
  for (const W of [390, 1440]) {
    const phone = W < 600;
    const { browser, page } = await boot(phone
      ? { viewport: { width: W, height: 844 }, hasTouch: true, isMobile: true }
      : { viewport: { width: W, height: 900 } });
    await page.evaluate(() => Promise.race([Promise.all(['graph', 'library'].map((m) => ensureModule(m))), new Promise((r) => setTimeout(r, 8000))]));
    await page.waitForTimeout(600);
    const count = await page.evaluate(() => document.querySelectorAll('.dialog-head').length);
    let measured = 0;
    for (let i = 0; i < count; i += 1) {
      const m = await page.evaluate(([i, measure]) => {
        const fn = eval(`(${measure})`);
        const head = document.querySelectorAll('.dialog-head')[i];
        if (!head) return null;
        const undo = [];
        const dlg = head.closest('dialog');
        if (dlg && !dlg.open) { dlg.showModal(); undo.push(() => dlg.close()); }
        for (let el = head; el && el !== document.body; el = el.parentElement) {
          if (el.classList.contains('hidden')) { el.classList.remove('hidden'); undo.push(() => el.classList.add('hidden')); }
          if (el.hidden) { el.hidden = false; undo.push(() => { el.hidden = true; }); }
        }
        const out = { where: (head.closest('[id]')?.id || '?'), ...fn(head) };
        undo.reverse().forEach((u) => u());
        return out;
      }, [i, MEASURE.toString()]);
      if (!m || m.skip) continue;
      measured += 1;
      check(`${W} ${theme} ${m.where} "${m.title}": one row`, m.off.length === 0 && m.past.length === 0, m);
    }
    // The script-built heads.
    for (const [name, open] of [
      ['pickLibraryItemDialog', () => pickLibraryItemDialog('Point a new node at…')],
      ['pickNotesDialog', () => pickNotesDialog('Make a map of these notes')],
      ['askLinkDetails', () => askLinkDetails({ preview: 'One' }, { preview: 'Two' })],
      ['manageBookmarkGroups', () => manageBookmarkGroups()],
      ['wbInfoDialog', () => wbInfoDialog('What this map is made of', document.createElement('p'))],
    ]) {
      await page.evaluate(`void (${open})()`).catch(() => {});
      await page.waitForTimeout(400);
      const m = await page.evaluate((measure) => {
        const heads = [...document.querySelectorAll('.modal-overlay .dialog-head')].filter((h) => h.getBoundingClientRect().width > 0);
        const head = heads[heads.length - 1];
        return head ? eval(`(${measure})`)(head) : null;
      }, MEASURE.toString());
      measured += 1;
      check(`${W} ${theme} ${name}: one row`, m && !m.skip && m.off.length === 0 && m.past.length === 0, m);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    console.log(`     ${W}: ${measured} heads measured`);
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
