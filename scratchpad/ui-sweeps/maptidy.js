// The four things the seventh run recorded under "Found while measuring, not
// fixed", the three of them that are about a tidy:
//
//   * Tidy persisted one node at a time. Counted here as requests: a tidy of a
//     map with a dozen nodes must not be a dozen PUTs.
//   * `wbMapNodeSize` and the rendered node disagreed by 94px at 390x844. The
//     layout, the edge anchors and the ring's centring all work off that
//     function, so a node whose real box is a different size puts every one of
//     them somewhere the node is not.
//   * A map does not re-frame itself after a tidy, which at phone width left
//     the trunk's own centre off the canvas.
//
//   VIEWPORT=390x844 BASE=http://127.0.0.1:8791 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/maptidy.js
const { boot } = require("./lib.js");

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 1440, height: 900 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
})();

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function newMap(page, name) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(600);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(900);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

(async () => {
  const { browser, page } = await boot({ viewport: VIEWPORT });
  const calls = { single: 0, many: 0, object: 0 };
  page.on("request", (req) => {
    const u = req.url();
    if (req.method() !== "PUT") return;
    if (/\/nodes\/move-many$/.test(u)) calls.many += 1;
    else if (/\/nodes\/\d+\/move$/.test(u)) calls.single += 1;
    else if (/\/whiteboard\/objects\/\d+$/.test(u)) calls.object += 1;
  });

  await newMap(page, `Tidy ${Date.now()}`);
  // A map with three branches of three, so a tidy has a dozen boxes to write.
  await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    for (let i = 0; i < 3; i++) {
      const branch = await wbMapAddChild(root.id);
      for (let j = 0; j < 3; j++) await wbMapAddChild(branch.id);
    }
  });
  await page.waitForTimeout(3500);

  // Scatter every node, so the tidy has real work and every node is a write.
  // Through the API, not by writing to the local objects: a scatter that only
  // exists on the client comes back as the old positions on the next fetch and
  // the persistence check below reads that as the tidy having failed to save.
  await page.evaluate(async () => {
    const index = wbMapIndex();
    let n = 0;
    for (const node of index.nodes) {
      const x = 200 + (n % 5) * 260;
      const y = 150 + Math.floor(n / 5) * 190;
      n += 1;
      await apiJson(`/whiteboard/objects/${node.id}`, {
        method: "PUT",
        // The object PUT wants the whole object, not a patch.
        body: JSON.stringify({ ...node, x, y }),
      });
      node.x = x;
      node.y = y;
    }
    renderWhiteboardNow();
  });
  await page.waitForTimeout(600);
  const before = { ...calls };
  const movedCount = await page.evaluate(() => wbMapTidy({ quiet: true }));
  await page.waitForTimeout(2500);
  const spent = {
    many: calls.many - before.many,
    single: calls.single - before.single,
    object: calls.object - before.object,
  };
  console.log("  tidy moved", movedCount, "nodes, requests", JSON.stringify(spent));
  check("a tidy writes the whole map in one request",
    spent.many >= 1 && spent.object === 0 && spent.single === 0,
    `${spent.many} move-many, ${spent.single} single moves, ${spent.object} object PUTs, for ${movedCount} nodes`);

  // The tidy survives a reload: the batch really wrote.
  const persisted = await page.evaluate(async () => {
    const id = window.currentBoardId;
    const before = wbMapIndex().nodes.map((o) => `${o.id}:${Math.round(o.x)},${Math.round(o.y)}`).sort().join("|");
    await fetchWhiteboardState(id);
    renderWhiteboardNow();
    const after = wbMapIndex().nodes.map((o) => `${o.id}:${Math.round(o.x)},${Math.round(o.y)}`).sort().join("|");
    return { same: before === after, n: wbMapIndex().nodes.length };
  });
  await page.waitForTimeout(900);
  check("and what it wrote is what comes back", persisted.same, `${persisted.n} nodes`);

  // `wbMapNodeSize` against the box the node actually has.
  const sizes = await page.evaluate(() => {
    const out = [];
    for (const node of wbMapIndex().nodes) {
      const el = document.querySelector(`.wb-object[data-id="${node.id}"]`);
      if (!el) continue;
      const t = d3.zoomTransform(document.getElementById("whiteboard-container"));
      const r = el.getBoundingClientRect();
      const said = wbMapNodeSize(node);
      out.push({
        id: node.id,
        saidW: Math.round(said.w), saidH: Math.round(said.h),
        realW: Math.round(r.width / t.k), realH: Math.round(r.height / t.k),
      });
    }
    return out;
  });
  const worst = sizes.reduce((acc, s) => Math.max(acc, Math.abs(s.saidW - s.realW), Math.abs(s.saidH - s.realH)), 0);
  const offender = sizes.find((s) => Math.abs(s.saidW - s.realW) === worst || Math.abs(s.saidH - s.realH) === worst);
  console.log("  worst size disagreement", worst, JSON.stringify(offender));
  check("wbMapNodeSize agrees with the node on screen", worst <= 2,
    `${worst}px worst over ${sizes.length} nodes`);

  // Re-framing after a tidy.
  const framed = await page.evaluate(() => {
    const box = document.getElementById("whiteboard-container").getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of wbMapIndex().nodes) {
      const el = document.querySelector(`.wb-object[data-id="${node.id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom);
    }
    const root = wbMapIndex().roots[0];
    const rootEl = document.querySelector(`.wb-object[data-id="${root.id}"]`);
    const rr = rootEl.getBoundingClientRect();
    const at = document.elementFromPoint(Math.round(rr.left + rr.width / 2), Math.round(rr.top + rr.height / 2));
    return {
      out: {
        left: Math.round(box.left - minX), top: Math.round(box.top - minY),
        right: Math.round(maxX - box.right), bottom: Math.round(maxY - box.bottom),
      },
      rootCentreIs: at ? (at.closest(".wb-object") ? "the topic" : at.id || at.tagName) : "nothing",
    };
  });
  console.log("  framing:", JSON.stringify(framed));
  const spill = Math.max(framed.out.left, framed.out.top, framed.out.right, framed.out.bottom);
  check("a tidy leaves the whole map inside the canvas", spill <= 1,
    `worst overhang ${spill}px (${JSON.stringify(framed.out)})`);
  check("and the trunk's own centre is on the canvas", framed.rootCentreIs === "the topic",
    `it is ${framed.rootCentreIs}`);

  const bad = results.filter((r) => !r.ok);
  console.log(`\n${VIEWPORT.width}x${VIEWPORT.height}: ${results.length - bad.length}/${results.length} passed`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
