// Component states, measured and photographed (INBOX 399 (4), INBOX 405):
// a primary and a ghost button at rest, hovered, pressed and keyboard
// focused; a row's menu opening; a toast; Settings' switches and segmented
// controls. Prints the computed values that decide each state and saves a
// screenshot of each into $SCRATCH/shots with LABEL as a prefix.
//
//   LABEL=after THEME=dark BASE=... node scratchpad/ui-sweeps/f2-states.js
const { boot } = require('./lib.js');
const LABEL = process.env.LABEL || 'now';
const THEME = process.env.THEME || 'light';

(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: 1440, height: 900 } });
  const shot = async (name, clip) => {
    await page.screenshot({ path: `${OUT}/f2-${LABEL}-${THEME}-${name}.png`, clip });
  };
  const box = async (sel) => page.evaluate((s) => {
    const el = [...document.querySelectorAll(s)].find((e) => e.getClientRects().length && e.checkVisibility());
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, sel);
  const style = async (sel, props) => page.evaluate(([s, ps]) => {
    const el = [...document.querySelectorAll(s)].find((e) => e.getClientRects().length && e.checkVisibility());
    if (!el) return null;
    const cs = getComputedStyle(el);
    return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
  }, [sel, props]);
  const PROPS = ['background-color', 'filter', 'scale', 'translate', 'outline-style', 'outline-color', 'box-shadow', 'transition-duration', 'transition-timing-function'];

  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(2500);
  const out = {};
  // Two probe buttons of our own, put into the dashboard's first card: a
  // plain `<button>` (the solid recipe) and a `.ghost`. Pressing a real
  // button would run what it does.
  await page.evaluate(() => {
    const host = document.querySelector('#tab-dashboard .card, #tab-dashboard section') || document.body;
    for (const [id, cls] of [['f2-primary', ''], ['f2-ghost', 'ghost']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = id;
      if (cls) b.className = cls;
      b.textContent = 'Save changes';
      host.prepend(b);
    }
  });
  for (const [name, sel] of [['primary', '#f2-primary'], ['ghost', '#f2-ghost']]) {
    const b = await box(sel);
    if (!b) { out[name] = 'missing'; continue; }
    const clip = { x: Math.max(0, b.x - 12), y: Math.max(0, b.y - 12), width: b.w + 24, height: b.h + 24 };
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    out[name + ' rest'] = await style(sel, PROPS);
    await shot(`${name}-rest`, clip);
    await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
    await page.waitForTimeout(400);
    out[name + ' hover'] = await style(sel, PROPS);
    await shot(`${name}-hover`, clip);
    await page.mouse.down();
    await page.waitForTimeout(250);
    out[name + ' press'] = await style(sel, ['scale', 'translate']);
    await page.mouse.up();
    await page.mouse.move(5, 5);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  // Keyboard focus on the first ghost button: Tab until one is focused.
  await page.evaluate(() => document.activeElement?.blur());
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const ok = await page.evaluate(() => document.activeElement?.matches?.('button:focus-visible'));
    if (ok) break;
  }
  out['focus-visible'] = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { el: el.id || el.className, outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, offset: cs.outlineOffset, shadow: cs.boxShadow.slice(0, 80) };
  });
  const f = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await shot('focus', { x: Math.max(0, f.x - 12), y: Math.max(0, f.y - 12), width: f.w + 24, height: f.h + 24 });

  // A row's menu: its state 40ms after the press, and settled.
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(2500);
  const k = await box('#entry-list > li [aria-haspopup="menu"]');
  if (k) {
    await page.mouse.click(k.x + k.w / 2, k.y + k.h / 2);
    await page.waitForTimeout(40);
    out['menu at 40ms'] = await style('.action-menu:not(.hidden)', ['opacity', 'translate', 'transform', 'scale']);
    await page.waitForTimeout(400);
    out['menu settled'] = await style('.action-menu:not(.hidden)', ['opacity', 'translate', 'transform', 'animation-name', 'animation-duration']);
    const m = await box('.action-menu:not(.hidden)');
    if (m) await shot('menu', { x: Math.max(0, m.x - 16), y: Math.max(0, m.y - 16), width: m.w + 32, height: m.h + 32 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(40);
    out['menu 40ms after Escape'] = await page.evaluate(() => {
      const el = document.querySelector('.action-menu:not(.hidden)');
      return el ? getComputedStyle(el).opacity : 'gone';
    });
  }

  // A toast: its state 40ms after it is shown, and settled.
  await page.evaluate(() => toast('Saved to your notebook'));
  await page.waitForTimeout(40);
  out['toast at 40ms'] = await style('.toast', ['opacity', 'translate', 'transform', 'animation-name']);
  await page.waitForTimeout(500);
  out['toast settled'] = await style('.toast', ['opacity', 'translate', 'transform', 'animation-name', 'animation-duration']);
  const t = await box('.toast');
  if (t) await shot('toast', { x: Math.max(0, t.x - 16), y: Math.max(0, t.y - 16), width: t.w + 32, height: t.h + 32 });

  // Settings' switches and segmented controls.
  await page.evaluate(() => openSettingsModal('appearance'));
  await page.waitForTimeout(1500);
  out['switch knob'] = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.setting-check input[type="checkbox"]')].find((e) => e.getClientRects().length);
    if (!el) return null;
    const cs = getComputedStyle(el, '::after');
    return { transition: `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}` };
  });
  out['segmented'] = await style('.segmented-control label', ['transition-property', 'transition-duration', 'transition-timing-function']);
  const s = await box('#settings-modal .modal-content');
  if (s) await shot('settings', { x: s.x, y: s.y, width: Math.min(s.w, 1000), height: Math.min(s.h, 700) });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
