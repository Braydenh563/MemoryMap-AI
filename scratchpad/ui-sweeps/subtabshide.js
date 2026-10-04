// INBOX 476: the Library sub-tab bar hides while a whiteboard or mind map is
// open (all widths), and the board's own Back returns to the list with the bar.
// BASE=http://127.0.0.1:8875 node scratchpad/ui-sweeps/subtabshide.js
const { boot } = require('./lib.js');
(async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 820, height: 900 }, { width: 390, height: 844 }]) {
    const { page, browser } = await boot({ viewport: vp });
    await page.evaluate(() => switchTab('library'));
    await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]').click());
    await page.waitForTimeout(1200);
    const probe = () => page.evaluate(() => {
      const bar = document.getElementById('library-subtabs');
      const canvas = document.getElementById('wb-canvas-view');
      const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height)]; };
      const stage = document.querySelector('#wb-canvas-view canvas, #wb-canvas-view svg');
      return {
        bar: getComputedStyle(bar).display, barH: Math.round(bar.getBoundingClientRect().height),
        canvasView: canvas.classList.contains('hidden') ? 'hidden' : r(canvas),
        stage: stage ? r(stage) : null,
      };
    });
    console.log(vp.width, 'list  ', JSON.stringify(await probe()));
    const open = await page.evaluate(() => {
      const card = document.querySelector('#library-view-whiteboard .wb-card, #library-view-whiteboard [data-board-id], #library-view-whiteboard li, #library-view-whiteboard .library-card');
      if (!card) return false;
      card.click();
      return true;
    });
    await page.waitForTimeout(1500);
    console.log(vp.width, 'opened', open, JSON.stringify(await probe()));
    await page.screenshot({ path: `${process.env.SCRATCH || '/tmp'}/sh-${vp.width}.png` });
    const back = page.locator('#wb-back-to-boards');
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await page.waitForTimeout(800);
      console.log(vp.width, 'back  ', JSON.stringify(await probe()));
    } else console.log(vp.width, 'no visible back button');
    await browser.close();
  }
})();
