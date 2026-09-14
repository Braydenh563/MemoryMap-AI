// INBOX 206: the help popover's ceiling on a short window and on a phone, and
// the first painted frame in both. Same probe as chromehelp.js, other sizes.
const { boot } = require('./lib.js');

async function probe(page, triggerSel, panelId) {
  return await page.evaluate(async ([sel, id]) => {
    const panel = document.getElementById(id);
    const trigger = document.querySelector(sel);
    const frames = [];
    let done = false;
    const tick = () => {
      const r = panel.getBoundingClientRect();
      frames.push({ x: Math.round(r.x), y: Math.round(r.y), h: Math.round(r.height), vis: getComputedStyle(panel).visibility });
      if (frames.length < 3) requestAnimationFrame(tick); else done = true;
    };
    trigger.click();
    requestAnimationFrame(tick);
    while (!done) await new Promise((r) => setTimeout(r, 16));
    const r = panel.getBoundingClientRect();
    return {
      frames,
      final: { x: Math.round(r.x), y: Math.round(r.y), h: Math.round(r.height) },
      cap: getComputedStyle(panel).maxHeight,
      scrolls: panel.scrollHeight > panel.clientHeight,
      insideWindow: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
      vh: window.innerHeight,
      vw: window.innerWidth,
    };
  }, [triggerSel, panelId]);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1024, height: 700 } });
  await page.click('#tab-bar button[data-tab="notes"]');
  await page.waitForTimeout(400);
  //: Capture is a SECTION of the Notes tab, not a tab: clicking a tab
  //: selector that matches nothing leaves the trigger in a hidden tab page,
  //: whose rect is all zeroes, and the popover then measures its own
  //: unmeasured-anchor fallback (8,10) rather than a real placement.
  await page.click('#notes-subtabs button[data-section="capture"]');
  await page.waitForTimeout(400);
  console.log('206 at 1024x700:', JSON.stringify(await probe(page, '#capture-help', 'capture-help-hint')));
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  console.log('206 at 390x844:', JSON.stringify(await probe(page, '#capture-help', 'capture-help-hint')));
  await browser.close();
})();
