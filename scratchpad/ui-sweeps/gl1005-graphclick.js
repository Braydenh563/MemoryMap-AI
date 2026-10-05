// gl1005: INBOX 587, "when I click nodes on the graph, it moves the graph
// slightly??". Waits for the force layout to end, then clicks ten notes the
// way a person does (press and release on the spot) and measures, after each,
// how far the view and every note on the map moved. A click must move nothing:
// the view transform and every node within 0.5px. Then one real drag (8px),
// which must still move the node.
//   BASE=http://127.0.0.1:8861 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   [VIEWPORT=390x844] [THEME=dark] node gl1005-graphclick.js
const { boot } = require("./lib.js");
const [W, H] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const phone = W < 600;
(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.evaluate(() => localStorage.setItem("graph-layout", "force"));
  await page.evaluate(() => document.getElementById("tab-btn-graph")?.click());
  await page.waitForFunction(() => window.__graphDebug && window.__graphDebug.nodes > 0, null, { timeout: 60000 });
  // The layout has ended when the worker stops sending ticks.
  for (let i = 0; i < 40; i++) {
    const t0 = await page.evaluate(() => window.__graphDebug.ticks);
    await page.waitForTimeout(1000);
    if ((await page.evaluate(() => window.__graphDebug.ticks)) === t0) break;
  }
  const snap = () =>
    page.evaluate(() => {
      const t = window.__graphDebug.transform;
      const rect = document.getElementById("graph-canvas").getBoundingClientRect();
      return {
        t: [t.x, t.y, t.k],
        rect: [rect.left, rect.top],
        nodes: graphNodesRef.filter((n) => Number.isFinite(n.x)).map((n) => [n.id, n.x, n.y]),
      };
    });
  const screenOf = (s, id) => {
    const n = s.nodes.find((m) => m[0] === id);
    return [s.rect[0] + s.t[0] + n[1] * s.t[2], s.rect[1] + s.t[1] + n[2] * s.t[2]];
  };
  const moved = (a, b, except) => {
    const mb = new Map(b.nodes.map(([id, x, y]) => [id, [x, y]]));
    let worst = 0;
    for (const [id, x, y] of a.nodes) {
      if (id === except || !mb.has(id)) continue;
      const [x2, y2] = mb.get(id);
      worst = Math.max(worst, Math.hypot(x2 - x, y2 - y) * a.t[2]);
    }
    return Math.round(worst * 100) / 100;
  };
  const first = await snap();
  // Ten notes inside the visible canvas, away from its edges.
  const box = await page.evaluate(() => {
    const r = document.getElementById("graph-canvas").getBoundingClientRect();
    return [r.left, r.top, r.right, r.bottom];
  });
  const picks = first.nodes
    .map((n) => [n[0], screenOf(first, n[0])])
    .filter(([, [x, y]]) => x > box[0] + 40 && x < box[2] - 40 && y > box[1] + 60 && y < box[3] - 60)
    .filter(([id]) => /^\d+$/.test(String(id)))
    .slice(0, 10);
  const clicks = [];
  for (const [id] of picks) {
    const before = await snap();
    const [x, y] = screenOf(before, id);
    if (phone) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await page.waitForTimeout(1500);
    const after = await snap();
    const popup = await page.evaluate(() => !document.getElementById("graph-popup").classList.contains("hidden"));
    const view = Math.max(...after.t.map((v, i) => Math.abs(v - before.t[i]) * (i === 2 ? 100 : 1)));
    clicks.push({ id, view: Math.round(view * 100) / 100, others: moved(before, after, id), self: moved({ ...before, nodes: before.nodes.filter((n) => n[0] === id) }, after, null), popup });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  // A real drag still moves the note in hand.
  const before = await snap();
  const [dx, dy] = screenOf(before, picks[0][0]);
  await page.mouse.move(dx, dy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(dx + i * 5, dy + i * 3);
  await page.waitForTimeout(200);
  const after = await snap();
  await page.mouse.up();
  const n0 = before.nodes.find((n) => n[0] === picks[0][0]);
  const n1 = after.nodes.find((n) => n[0] === picks[0][0]);
  const dragMoved = Math.round(Math.hypot(n1[1] - n0[1], n1[2] - n0[2]) * before.t[2]);
  const worst = Math.max(...clicks.map((c) => Math.max(c.view, c.others, c.self)));
  console.log(JSON.stringify({ viewport: `${W}x${H}`, theme: process.env.THEME || "light", clicks: clicks.length, worst, clicksDetail: clicks, dragMoved, errors }));
  console.log(clicks.length >= 5 && worst <= 0.5 && clicks.every((c) => c.popup) && dragMoved >= 20 && !errors.length ? "PASS" : "FAIL");
  await browser.close();
})();
