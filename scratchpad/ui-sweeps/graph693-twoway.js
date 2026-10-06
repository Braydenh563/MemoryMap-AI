// The link menu's Two-way switch, end to end (INBOX 693): open a link's
// peek, press Two-way, and read back the edge, the arrow and /graph.
//
//   BASE=http://127.0.0.1:8838 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graph693-twoway.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  try {
    await page.evaluate(() => {
      localStorage.setItem('graph-arrows', '1');
      switchTab('graph');
    });
    for (let i = 0; i < 80; i++) {
      await page.waitForTimeout(250);
      if (await page.evaluate(() => gcTab.ticks > 5 && gcTab.alpha < 0.002)) break;
    }
    const before = await page.evaluate(() => {
      const edge = gcTab.edges.find((e) => e.kind === 'link' && e.id != null);
      openGraphLinkPeek(edge, { clientX: 500, clientY: 400 }, gcTab.nodes);
      const button = document.getElementById('graph-link-two-way');
      return { id: edge.id, two_way: edge.two_way, pressed: button && button.getAttribute('aria-pressed'), sparks: gcTab.sparksDrawn };
    });
    await page.click('#graph-link-two-way');
    await page.waitForTimeout(600);
    const after = await page.evaluate(async (id) => {
      const edge = gcTab.edges.find((e) => e.id === id && e.kind === 'link');
      const fresh = await api('/graph').then((r) => r.json());
      const served = fresh.edges.find((e) => e.id === id && e.kind === 'link');
      return { two_way: edge.two_way, pressed: document.getElementById('graph-link-two-way').getAttribute('aria-pressed'), served: served.two_way, sparks: gcTab.sparksDrawn };
    }, before.id);
    // Put it back.
    await page.click('#graph-link-two-way');
    await page.waitForTimeout(400);
    console.log(JSON.stringify({ before, after }));
  } finally {
    await browser.close();
  }
})();
