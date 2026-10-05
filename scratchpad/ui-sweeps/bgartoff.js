// **Off means off** (INBOX 611): with the art switched off, startBgArt() draws nothing.
// Pass {"afterStart":0}; the base drew 1 canvas.
const { boot } = require("/home/user/MemoryMap-AI/scratchpad/ui-sweeps/lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
  const r = await page.evaluate(async () => {
    localStorage.setItem("bgArt", "off"); applyAppearance(); stopBgArt();
    const count = () => document.querySelectorAll("#bg-art-layer, #bg-art-twin, .bg-art-canvas").length;
    const before = count();
    startBgArt();
    await new Promise((r) => setTimeout(r, 500));
    return { before, afterStart: count(), dataset: document.documentElement.dataset.bgArt };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
