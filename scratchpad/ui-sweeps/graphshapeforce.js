// **Shape is the Force layout's** (the owner, 2026-10-10: "the graph shape
// options shouldnt be enabled when on a view other than force"). Switches the
// layout through all four and reads the Shape list's disabled state, row
// opacity and title. Pass: enabled at opacity 1 on Force only.
const { boot } = require("/home/user/MemoryMap-AI/scratchpad/ui-sweeps/lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab("graph"));
  await page.waitForTimeout(2500);
  const out = {};
  for (const layout of ["tree", "radial", "arc", "force"]) {
    await page.evaluate((v) => { const l = document.getElementById("graph-layout"); l.value = v; l.dispatchEvent(new Event("change", { bubbles: true })); }, layout);
    await page.waitForTimeout(800);
    out[layout] = await page.evaluate(() => {
      const s = document.getElementById("graph-shape");
      return { disabled: s.disabled, opacity: getComputedStyle(document.getElementById("graph-shape-row")).opacity, title: s.title };
    });
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
