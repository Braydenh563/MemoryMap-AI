// FEAT-14: the PNG export takes a size (1x, 2x, 3x) and a transparent ground,
// and its file is named after the board.
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-export.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const { browser, page, errors } = await openBoard({ title: "Export plan" });
  await page.evaluate(async () => {
    await wbCreateSticky(0, 0);
    await wbCreateSticky(300, 160);
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => wbExportBoard());
  await page.waitForTimeout(300);
  const dialog = await page.evaluate(() => {
    const card = document.querySelector(".wb-export-card");
    const size = card.querySelector('[aria-label="Picture size"]');
    return {
      size: size && !size.hidden ? [...size.querySelectorAll("button")].map((b) => b.textContent) : null,
      pressed: size?.querySelector('[aria-pressed="true"]')?.textContent,
      clear: !card.querySelector(".wb-export-clear").hidden,
      overflow: card.scrollWidth > card.clientWidth + 1,
    };
  });
  check("PNG shows the size choice, 2x by default", JSON.stringify(dialog.size) === '["1x","2x","3x"]' && dialog.pressed === "2x", dialog);
  check("and the transparent switch", dialog.clear, dialog);
  check("the dialog does not overflow", !dialog.overflow, dialog);
  await page.click('.wb-export-card [aria-label="Format"] [data-value="svg"]');
  const hiddenForSvg = await page.evaluate(() => document.querySelector('.wb-export-card [aria-label="Picture size"]').hidden);
  check("SVG hides the picture size", hiddenForSvg);
  await page.keyboard.press("Escape");

  const out = await page.evaluate(async () => {
    const measure = async (scale, transparent) => {
      const { svg, width, height } = wbBuildExportSvg("whole", { transparent });
      const blob = await wbRasterizeSvg(svg, width * scale, height * scale, "image/png");
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      const corner = ctx.getImageData(1, 1, 1, 1).data[3];
      return { w: bmp.width, h: bmp.height, board: [Math.round(width), Math.round(height)], cornerAlpha: corner };
    };
    return { one: await measure(1, false), two: await measure(2, true), name: wbExportFileName("whole", "png") };
  });
  check("2x is twice the board's size", out.two.w === out.one.w * 2 && out.two.h === out.one.h * 2, out);
  check("a transparent export has no ground", out.two.cornerAlpha === 0 && out.one.cornerAlpha === 255, out);
  check("the file is named after the board", /^Export plan \d+\.png$/.test(out.name), out.name);
  check("no console errors", errors.length === 0, errors);
  summary();
  await browser.close();
})();
