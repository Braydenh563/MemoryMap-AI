// The chat Attach panel (INBOX 485): one search box per tab, no floating
// selection toolbar while navigating it. Walks every tab with the mouse and
// the keyboard, at 1440 and 390.
const { boot } = require('./lib.js');
(async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { browser, page } = await boot({ viewport: vp });
    await page.evaluate(() => switchTab('chat'));
    await page.waitForTimeout(1200);
    await page.evaluate(() => openNotePicker());
    await page.waitForTimeout(600);
    const tabs = await page.$$eval('#note-picker-sources [role="tab"], #note-picker-sources button', (b) => b.map((x) => x.textContent.trim()));
    for (const t of tabs) {
      await page.click(`#note-picker-sources >> text=${t}`);
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => {
        const panel = document.getElementById('note-picker-panel');
        const inputs = [...panel.querySelectorAll('input[type="search"], input:not([type]), input[type="text"]')].filter((i) => i.offsetParent !== null);
        const boxes = inputs.map((i) => { const b = i.getBoundingClientRect(); return [i.id || i.className, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; });
        const bars = [...document.querySelectorAll('.sel-menu, .selection-menu, [class*="selmenu"], #selection-menu, .text-selection-bar')]
          .filter((e) => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden').map((e) => e.id || e.className);
        return { inputs: boxes, bars };
      });
      console.log(vp.width, t, JSON.stringify(r));
    }
    await browser.close();
  }
})();
