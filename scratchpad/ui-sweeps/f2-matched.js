// Which rules set a property on one element, in cascade order, with a forced
// pseudo-class: for "why does this hover change nothing".
//   TAB=graph SEL='#graph-zoom-in' PROP=background PSEUDO=hover node f2-matched.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((t) => switchTab(t), process.env.TAB || 'graph');
  await page.waitForTimeout(2500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: process.env.SEL });
  if (process.env.PSEUDO) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [process.env.PSEUDO] });
  const m = await cdp.send('CSS.getMatchedStylesForNode', { nodeId });
  const want = process.env.PROP || 'background';
  for (const r of m.matchedCSSRules || []) {
    const props = r.rule.style.cssProperties.filter((p) => p.name.startsWith(want) && p.value);
    if (!props.length) continue;
    const src = r.rule.styleSheetId;
    console.log(`${r.rule.selectorList.text.slice(0, 120)}  ->  ${props.map((p) => `${p.name}: ${p.value}${p.important ? ' !important' : ''}`).join('; ')}`);
    void src;
  }
  await browser.close();
})();
