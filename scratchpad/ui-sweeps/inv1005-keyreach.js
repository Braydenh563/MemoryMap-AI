// Keyboard-complete, measured (WORLD_CLASS_PLAN H6, row 25): is every
// control on every tab's dock reached by Tab, and is anything that looks
// pressable (a pointer cursor) out of the keyboard's reach altogether?
//
//   BASE=http://127.0.0.1:8865 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/inv1005-keyreach.js
//
// keyboard.js asks whether each stop the Tab key lands on is a good stop.
// This asks the other half: of the controls a mouse can press in a dock,
// which ones does Tab never reach? Two findings:
// - "not reached": a visible, enabled control in a dock that ninety Tab
//   presses from the top of the page never focus;
// - "pointer, not focusable": an element showing the pointer cursor that is
//   not a control and has no tabindex, so no key can press it.
// Exit 1 when either is found. WIDTH=390 for the phone shell.
const { boot } = require('./lib.js');

const TABS = (process.env.TABS || 'dashboard,notes,library,chat,graph,timeline,reminders').split(',');
const PRESSES = Number(process.env.PRESSES || 140);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: 900 } });
  let total = 0;
  for (const tab of TABS) {
    await page.evaluate((n) => { try { switchTab(n); } catch (e) {} }, tab);
    await page.waitForTimeout(1200);
    // Mark every visible dock control, so the walk can tick them off.
    const controls = await page.evaluate(() => {
      const page = document.querySelector('.tab-page:not(.hidden)') || document;
      const docks = [...page.querySelectorAll('.dock, [data-dock-name], [role="toolbar"]')];
      const sel = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
      const out = [];
      let n = 0;
      for (const dock of docks) {
        for (const el of dock.querySelectorAll(sel)) {
          if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
          if (el.closest('[inert], [aria-hidden="true"]') || el.getAttribute('tabindex') === '-1') continue;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          el.dataset.kr = String(++n);
          out.push({ kr: String(n), name: (el.getAttribute('aria-label') || el.textContent || el.title || el.id).trim().slice(0, 40), id: el.id });
        }
      }
      const pointer = [];
      for (const el of page.querySelectorAll('div, span, li, i, svg, img, p, label')) {
        if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
        if (getComputedStyle(el).cursor !== 'pointer') continue;
        if (el.closest(sel) || el.closest('[tabindex]') || el.querySelector(sel) || el.closest('label') || el.tagName === 'LABEL') continue;
        if (el.closest('canvas, svg, .cm-editor, .graph-canvas, #graph-container, .wb-canvas, [role="application"]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        pointer.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(/\s+/).slice(0, 2).join('.')}`);
      }
      return { out, pointer: [...new Set(pointer)].slice(0, 12) };
    });
    await page.evaluate(() => document.body.focus());
    const reached = new Set();
    for (let i = 0; i < PRESSES; i++) {
      await page.keyboard.press('Tab');
      const kr = await page.evaluate(() => document.activeElement?.dataset?.kr || '');
      if (kr) reached.add(kr);
    }
    const missed = controls.out.filter((c) => !reached.has(c.kr));
    total += missed.length + controls.pointer.length;
    console.log(`${tab.padEnd(10)} ${String(controls.out.length).padStart(3)} dock controls, ${String(missed.length).padStart(2)} not reached, ${controls.pointer.length} pointer-not-focusable`);
    for (const m of missed) console.log(`    not reached: ${m.id || '(no id)'} "${m.name}"`);
    for (const p of controls.pointer) console.log(`    pointer, not focusable: ${p}`);
    await page.evaluate(() => document.querySelectorAll('[data-kr]').forEach((el) => el.removeAttribute('data-kr')));
  }
  console.log(total ? `FAIL: ${total} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(total ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
