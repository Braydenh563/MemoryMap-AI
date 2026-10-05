// **The gesture strip's close sits at its end, evenly** (INBOX 562). The X
// glyph's inset from the pill's right edge is within 3px of the first hint's
// inset from the left, and a divider separates it from the hints.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbgestureclose.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failed++; };
  for (const theme of ["light", "dark"]) {
    process.env.THEME = theme;
    const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
    await page.click("#tab-btn-library");
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const v = document.getElementById("library-view-whiteboard");
      for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
      await initWhiteboard();
    });
    const board = await page.evaluate(async () => apiJson("/whiteboard/boards/import", {
      method: "POST", body: JSON.stringify({ format: "markdown", content: "# Gestures\n- Root", name: "Gestures " + Date.now() }),
    }));
    await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
    await page.waitForTimeout(1800);
    const m = await page.evaluate(() => {
      const strip = document.getElementById("wb-gestures");
      strip.classList.remove("hidden");
      const s = strip.getBoundingClientRect();
      const first = strip.querySelector(".wb-gesture kbd").getBoundingClientRect();
      const btn = document.getElementById("wb-gestures-dismiss");
      const glyph = btn.querySelector("i").getBoundingClientRect();
      const last = [...strip.querySelectorAll(".wb-gesture")].pop().getBoundingClientRect();
      return {
        left: Math.round(first.left - s.left), right: Math.round(s.right - glyph.right),
        gapToX: Math.round(glyph.left - last.right), divider: getComputedStyle(btn).borderLeftWidth,
        pad: getComputedStyle(strip).paddingRight, bw: btn.getBoundingClientRect().width, gw: glyph.width, btnR: Math.round(s.right - btn.getBoundingClientRect().right),
        centred: Math.abs((glyph.top + glyph.bottom) / 2 - (s.top + s.bottom) / 2),
      };
    });
    console.log(JSON.stringify(m));
    check(m.btnR >= 0 && Math.abs(m.left - m.right) <= 4, `${theme}: X whole (${m.btnR}px in) and inset ${m.right}px like the first hint's ${m.left}px`);
    check(m.divider === "1px", `${theme}: a divider before X`);
    check(m.gapToX >= 8 && m.gapToX <= 24, `${theme}: X sits ${m.gapToX}px after the last hint`);
    check(m.centred <= 1.5, `${theme}: X centred on the pill (${m.centred.toFixed(1)}px)`);
    await browser.close();
  }
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
