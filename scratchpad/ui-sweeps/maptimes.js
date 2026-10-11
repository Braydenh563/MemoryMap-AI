// The column layouts tidy the whole map on every add (`wbMapTidyBranchScope`,
// ledger row 980: "not timed at 200 topics"). Times `wbMapTidy` on a 200-topic
// map in each of them. A bound here is generous ("not broken"); the numbers are
// what the row asked for.
//   BASE=http://127.0.0.1:8803 node scratchpad/ui-sweeps/maptimes.js
const { boot } = require("./lib.js");
const N = Number(process.env.TOPICS || 200);
const log = (k, v) => console.log(k, JSON.stringify(v));

function outline(n, name) {
  const root = { kids: [] };
  const queue = [root];
  for (let i = 1; i < n; i += 1) {
    const parent = queue[0];
    const node = { kids: [] };
    parent.kids.push(node);
    queue.push(node);
    if (parent.kids.length === 4) queue.shift();
  }
  const lines = [`# ${name}`, "- Trunk"];
  let made = 0;
  const walk = (node, depth) => {
    for (const kid of node.kids) {
      made += 1;
      lines.push(`${"  ".repeat(depth)}- Topic ${made}`);
      walk(kid, depth + 1);
    }
  };
  walk(root, 1);
  return lines.join("\n");
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
  });
  const board = await page.evaluate(
    async ([content, name]) => apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content, name }) }),
    [outline(N, `Timing ${N}`), `Timing ${N}`]);
  await page.evaluate(async ([id, want]) => {
    await openWhiteboardBoard(id);
    const deadline = performance.now() + 60000;
    while (performance.now() < deadline) {
      if (document.querySelectorAll("#wb-html-layer .wb-map-node").length >= want) break;
      await new Promise((r) => setTimeout(r, 8));
    }
  }, [board.id, N]);
  const results = {};
  for (const layout of ["tree-table", "timeline", "fishbone", "tree-right"]) {
    await page.selectOption("#wb-map-layout", layout);
    await page.waitForTimeout(2500);
    results[layout] = await page.evaluate(async () => {
      const ms = [];
      for (let i = 0; i < 3; i += 1) {
        const t = performance.now();
        await wbMapTidy({ quiet: true });
        ms.push(Math.round(performance.now() - t));
      }
      return { ms, topics: wbMapIndex().nodes.length, columnLayout: WB_MAP_COLUMN_LAYOUTS.has(wbMapLayout()) };
    });
    log(layout, results[layout]);
  }
  const worst = Math.max(...Object.values(results).flatMap((r) => r.ms));
  log("bound", { worstMs: worst, ok: worst < 30000 });
  await browser.close();
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
