// Phase 12 decision 2, the hover grammar: an icon-only button answers hover by
// colouring its glyph, never with a box (background) behind it. For every
// visible icon-only button (`.icon-only`, `.icon-button`, or a button whose
// only content is an icon) on each tab, force `:hover` through CDP and count
// the ones whose background changes (a hover box) and the ones whose hover
// changes nothing. Also counts the distinct border radii those buttons take.
//   BASE=... [TABS=notes,chat] [THEME=dark] node hoverbox.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  await page.evaluate(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('*, *::before, *::after { transition: none !important; }');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
  let total = 0, box = 0, flat = 0, tint = 0; const boxes = {}, radii = {};
  for (const tab of (process.env.TABS || 'dashboard,notes,chat,library,timeline,reminders,graph,documents').split(',')) {
    await page.evaluate((t) => switchTab(t), tab); await page.waitForTimeout(1800); await page.mouse.move(2, 2);
    await page.evaluate(() => {
      let i = 0;
      for (const b of document.querySelectorAll('button')) {
        delete b.dataset.hb;
        if (!b.getClientRects().length || !b.checkVisibility() || b.disabled) continue;
        if (b.matches('.active,[aria-pressed="true"],[aria-expanded="true"],[aria-selected="true"],.is-on')) continue;
        const iconOnly = b.matches('.icon-only,.icon-button') || (!b.textContent.trim() && b.querySelector('i.ph,svg'));
        if (iconOnly) b.dataset.hb = String(i++);
      }
    });
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'button[data-hb]' });
    for (const nodeId of nodeIds) {
      // A list that re-renders mid-sweep drops a node; skip it, do not die.
      const attrs = await cdp.send('DOM.getAttributes', { nodeId }).then((r) => r.attributes, () => null);
      if (!attrs) continue;
      const idx = attrs[attrs.indexOf('data-hb') + 1];
      const get = () => page.evaluate((i) => {
        const b = document.querySelector(`button[data-hb="${i}"]`); const cs = getComputedStyle(b);
        const g = b.querySelector('i,svg'); const gc = g ? getComputedStyle(g).color : '';
        return { bg: cs.backgroundColor + cs.backgroundImage, ink: cs.color + gc + cs.filter + cs.borderColor, r: cs.borderRadius,
          who: (b.id ? '#' + b.id : '') + '.' + [...b.classList].filter((c) => !/^(small|ghost)$/.test(c)).slice(0, 2).join('.') + ' ' + (b.getAttribute('aria-label') || b.title || '').slice(0, 24) };
      }, idx);
      const rest = await get().catch(() => null);
      if (!rest) continue;
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
      const hov = await get();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      total++; radii[rest.r] = (radii[rest.r] || 0) + 1;
      // A box that appears: transparent at rest, painted on hover. A button
      // that rests on its own surface (a floating scroll-to-top) and tints it
      // is counted apart, as a tint.
      const clear = (s) => /rgba\(0, 0, 0, 0\)none|transparentnone/.test(s);
      if (rest.bg !== hov.bg && clear(rest.bg)) { box++; boxes[rest.who] = (boxes[rest.who] || 0) + 1; }
      else if (rest.bg !== hov.bg) tint++;
      else if (rest.ink === hov.ink) flat++;
    }
  }
  console.log(`${total} icon buttons hovered; ${box} draw a box on hover; ${tint} tint a box they rest on; ${flat} change nothing; radii ${JSON.stringify(radii)}`);
  for (const [k, v] of Object.entries(boxes).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${v}  ${k}`);
  await browser.close();
})();
