const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(async () => { switchTab("library"); await ensureModule("library"); });
  await page.waitForTimeout(800);
  await page.evaluate(async () => { await openWhiteboardBoard(null); });
  await page.waitForTimeout(2000);
  const seeded = await page.evaluate(async () => {
    const mk = (d) => apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify({ d, color: "#7fd", width: 3, shape: "pen" }), x: 0, y: 0, z: 5, board_id: window.currentBoardId }) });
    await mk("M 300 300 L 340 320 L 380 300");                              // pen stroke
    await mk("M 320 400 A 30 30 0 1 0 380 400 A 30 30 0 1 0 320 400 Z");   // circle via absolute arcs
    if (typeof renderWhiteboard === "function") renderWhiteboard();
    await new Promise((r) => setTimeout(r, 800));
    const c = document.getElementById("whiteboard-container").getBoundingClientRect();
    return { sketches: wbState.sketches.length, tool: window.currentTool, container: [Math.round(c.left), Math.round(c.top), Math.round(c.width), Math.round(c.height)] };
  });
  await page.evaluate(() => { document.querySelector('#wb-tool-group button[data-tool="select"]')?.click(); });
  await page.waitForTimeout(300);
  // world (200,250)-(450,470) → screen via the zoom transform
  const pts = await page.evaluate(() => {
    const svg = document.getElementById("wb-svg-layer");
    const g = document.getElementById("wb-zoom-group");
    const m = g.getScreenCTM();
    const to = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
    return { a: to(200, 250), b: to(450, 470), tool: window.currentTool };
  });
  await page.mouse.move(pts.a[0], pts.a[1]);
  await page.mouse.down();
  await page.mouse.move(pts.a[0] + 20, pts.a[1] + 20, { steps: 4 });
  await page.mouse.move(pts.b[0], pts.b[1], { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const result = await page.evaluate(() => ({ selected: [...wbMultiSelection], tool: window.currentTool, target: document.elementFromPoint(400, 400)?.className?.baseVal ?? document.elementFromPoint(400,400)?.className }));
  // Now drag the group by one of its shapes: the circle's centre is world (350,400).
  const before = await page.evaluate(() => wbState.sketches.map((s) => JSON.parse(s.data).d.slice(0, 24)));
  const c = await page.evaluate(() => { const m = document.getElementById("wb-zoom-group").getScreenCTM(); return [m.a * 350 + m.e, m.d * 400 + m.f, m.a * 320 + m.e, m.d * 400 + m.f]; });
  await page.mouse.move(c[2], c[3]);   // on the circle's stroke (left edge)
  await page.mouse.down();
  await page.mouse.move(c[2] + 60, c[3] + 40, { steps: 6 });
  await page.mouse.move(c[2] + 120, c[3] + 80, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await page.evaluate(([c0, c1]) => ({ d: wbState.sketches.map((s) => JSON.parse(s.data).d.slice(0, 24)), selected: [...wbMultiSelection], hit: document.elementFromPoint(c0, c1)?.tagName }), [c[2], c[3]]);
  console.log(JSON.stringify({ seeded, result, before, after }));
  await browser.close();
})();
