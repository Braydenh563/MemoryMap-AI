// Does every drawn button change when hovered? (INBOX 405.) For each visible
// button on each tab, force `:hover` through CDP and compare the computed
// background, colour, border, box-shadow, outline and filter with the resting
// ones. Prints the buttons whose hover changes nothing, grouped by class.
//   TABS=dashboard,notes node scratchpad/ui-sweeps/f2-hover.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const PROPS = ['background-color', 'background-image', 'color', 'border-color', 'box-shadow', 'outline-style', 'filter', 'text-decoration-line'];
  // Transitions off, or a forced :hover reads the resting value at the start
  // of its own transition. A constructed sheet: the CSP refuses <style>.
  await page.evaluate(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('*, *::before, *::after { transition: none !important; }');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
  const flat = {};
  let total = 0;
  for (const tab of (process.env.TABS || 'dashboard,notes,chat,library,timeline,reminders,graph').split(',')) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(2200);
    await page.mouse.move(2, 2);
    await page.evaluate(() => {
      let i = 0;
      for (const b of document.querySelectorAll('button')) {
        if (b.getClientRects().length && b.checkVisibility() && !b.disabled) b.dataset.f2h = String(i++);
        else delete b.dataset.f2h;
      }
    });
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'button[data-f2h]' });
    for (const nodeId of nodeIds) {
      const read = () => page.evaluate(([ps]) => {
        const out = {};
        return out;
      }, [PROPS]);
      const attrs = (await cdp.send('DOM.getAttributes', { nodeId })).attributes;
      const idx = attrs[attrs.indexOf('data-f2h') + 1];
      const get = () => page.evaluate(([i, ps]) => {
        const b = document.querySelector(`button[data-f2h="${i}"]`);
        const cs = getComputedStyle(b);
        return ps.map((p) => cs.getPropertyValue(p)).join('|');
      }, [idx, PROPS]);
      const rest = await get();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
      const hover = await get();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      total++;
      if (rest === hover) {
        const who = await page.evaluate((i) => {
          const b = document.querySelector(`button[data-f2h="${i}"]`);
          const cls = (b.className || '').split(/\s+/).filter((c) => c && c !== 'small').sort().join('.');
          const p = b.parentElement;
          if (cls) return cls + ' (' + (b.id ? '#' + b.id : b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20)) + ')';
          return 'no class, in ' + (p.id ? '#' + p.id : p.tagName.toLowerCase() + (p.className ? '.' + String(p.className).split(/\s+/)[0] : ''));
        }, idx);
        flat[who] = (flat[who] || 0) + 1;
      }
      void read;
    }
  }
  const rows = Object.entries(flat).sort((a, b) => b[1] - a[1]);
  console.log(`${total} buttons hovered; ${rows.reduce((n, r) => n + r[1], 0)} change nothing on hover`);
  for (const [k, v] of rows) console.log(`  ${v}  ${k}`);
  await browser.close();
})();
