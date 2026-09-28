// Measures the dialog-head recipe rollout (DESIGN.md, "A dialog's head";
// INBOX 431 f) on the ten surfaces it touched, before and after, in both
// themes, at 1093x614. Each overlay is shown directly (its own `.hidden`
// class removed) rather than through its real opening flow: this sweep
// measures the head's shape, not the trigger, and several of these open
// from deep inside another flow (a note's history, a binned note) that
// would cost more setup than the number it produces.
//
//   BASE=http://127.0.0.1:8801 node dialoghead.js   # after
//   BASE=http://127.0.0.1:8802 node dialoghead.js   # before
// THEME=dark for the dark pass.
const { boot } = require('./lib.js');

const SURFACES = [
  { id: 'doc-ai-panel', close: '#doc-ai-close', help: '[data-help-for="doc-ai-verb-help"]', extra: ['#doc-ai-history'] },
  { id: 'notif-panel', close: '#notif-close', help: null, extra: ['#notif-mute-toggle'] },
  { id: 'history-overlay', close: '#history-close', help: null, extra: [] },
  { id: 'connections-overlay', close: '#connections-close', help: null, extra: [] },
  { id: 'binned-overlay', close: '#binned-close', help: null, extra: [] },
  { id: 'shortcuts-overlay', close: '#shortcuts-close', help: null, extra: [] },
  { id: 'features-overlay', close: '#features-close', help: null, extra: [] },
  { id: 'meeting-overlay', close: '#meeting-close', help: '[data-help-for="meeting-help"]', extra: [] },
  { id: 'improve-overlay', close: '#improve-close', help: null, extra: [] },
  { id: 'sketch-overlay', close: '#sketch-close', help: null, extra: [] },
];

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1093, height: 614 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

  // doc-ai-panel lives inside the Documents tab's own markup (a proposal
  // panel over the editor), not beside the other overlays near the end of
  // body: its tab-page ancestor is `display: none` until the tab is active,
  // which `display: flex` on the overlay itself cannot escape regardless of
  // its own `position: fixed`. Every other surface here is a body-level
  // overlay with no such ancestor.
  await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('documents'); });
  await page.waitForTimeout(300);

  const rows = [];
  for (const s of SURFACES) {
    const measured = await page.evaluate(({ id, close, help, extra }) => {
      const overlay = document.getElementById(id);
      if (!overlay) return { id, missing: true };
      const wasHidden = overlay.classList.contains('hidden');
      overlay.classList.remove('hidden');
      const rectOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          w: Math.round(r.width), h: Math.round(r.height),
          color: cs.color, bg: cs.backgroundColor, radius: cs.borderRadius,
        };
      };
      const closeRect = rectOf(close);
      const helpRect = help ? rectOf(help) : null;
      const extraRects = extra.map((sel) => rectOf(sel));
      if (wasHidden) overlay.__sweepRestoreHidden = true;
      document.activeElement && document.activeElement.blur();
      return { id, close: closeRect, help: helpRect, extra: extraRects };
    }, s);
    // `:focus-visible` only matches a browser-flagged keyboard focus (a
    // plain scripted `.focus()` never sets it in Chromium, measured:
    // matches(':focus-visible') came back false every time), so the ring is
    // checked by really tabbing to the button, the only faithful way to
    // measure it without eyes on a screen. Tabbing has to start scoped to
    // the dialog, not from the top of the whole page: this app has far more
    // than 15 focusable elements before most of these overlays in DOM order.
    // A div is not normally tabbable; a temporary `tabindex="-1"` makes it a
    // one-shot focus anchor, gone again the instant it is removed, and the
    // very next real Tab moves to the first focusable thing after it, which
    // is the dialog's own head.
    await page.evaluate((id) => {
      const overlay = document.getElementById(id);
      overlay.setAttribute('tabindex', '-1');
      overlay.focus();
      overlay.removeAttribute('tabindex');
    }, s.id);
    let focusOutline = 'not reached by Tab';
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const at = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el && document.activeElement === el;
      }, s.close);
      if (at) {
        focusOutline = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          const cs = getComputedStyle(el);
          return `${cs.outlineStyle} ${cs.outlineColor} ${cs.outlineWidth}`;
        }, s.close);
        break;
      }
    }
    measured.focusOutline = focusOutline;
    await page.evaluate((id) => {
      const overlay = document.getElementById(id);
      if (overlay.__sweepRestoreHidden) overlay.classList.add('hidden');
    }, s.id);
    rows.push(measured);
  }
  console.log(JSON.stringify({ theme: process.env.THEME || 'light', base: process.env.BASE, rows, errors }, null, 2));
  await browser.close();
})().catch((e) => { console.error('SWEEP_ERROR', e.message, e.stack); process.exit(1); });
