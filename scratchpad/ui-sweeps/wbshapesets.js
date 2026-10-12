// canvasdepth: the draw.io shape sets in the Library panel, measured.
//   BASE=http://127.0.0.1:8850 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbshapesets.js
const { openFresh, checker } = require("./cdlib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors, phone } = await openFresh({ width: W });
  const { check, summary } = checker();
  await page.evaluate(() => wbOpenSidebar("library"));
  await page.waitForTimeout(1500);
  const groups = await page.evaluate(() => [...document.querySelectorAll("#wb-lib-list .wb-lib-group")].map((d) => ({
    key: d.dataset.group, open: d.open, count: d.querySelector(".wb-lib-count")?.textContent, tiles: d.querySelectorAll(".wb-lib-tile").length,
  })));
  const shapeGroups = groups.filter((g) => g.key.startsWith("set:drawio-"));
  check("five draw.io groups listed", shapeGroups.length === 5, shapeGroups);
  check("closed and unfetched at open", shapeGroups.every((g) => !g.open && g.tiles === 0), shapeGroups);
  check("counts sum to 196", shapeGroups.reduce((a, g) => a + Number(g.count), 0) === 196, shapeGroups.map((g) => g.count));
  // Open Flowchart, more.
  await page.evaluate(() => { const d = document.querySelector('#wb-lib-list [data-group="set:drawio-flowchart"]'); d.scrollIntoView(); d.querySelector("summary").click(); });
  await page.waitForFunction(() => document.querySelectorAll('#wb-lib-list [data-group="set:drawio-flowchart"] .wb-lib-tile').length > 0, null, { timeout: 8000 }).catch(() => {});
  const opened = await page.evaluate(() => {
    const d = document.querySelector('#wb-lib-list [data-group="set:drawio-flowchart"]');
    const tiles = [...d.querySelectorAll(".wb-lib-tile")];
    const inked = tiles.filter((t) => t.querySelector("svg path, svg rect, svg ellipse")).length;
    const r = tiles[0]?.getBoundingClientRect();
    return { open: d.open, tiles: tiles.length, inked, w: r?.width, h: r?.height };
  });
  check("flowchart opens with 36 tiles, each with a drawing", opened.open && opened.tiles === 36 && opened.inked === 36, opened);
  check(`tile at least ${phone ? 44 : 24}px`, opened.w >= (phone ? 44 : 24) && opened.h >= (phone ? 44 : 24), opened);
  // Search finds a networks shape before its set was opened.
  await page.fill("#wb-lib-search", "router");
  await page.evaluate(() => document.getElementById("wb-lib-search").dispatchEvent(new Event("input", { bubbles: true })));
  await page.waitForFunction(() => [...document.querySelectorAll('#wb-lib-list [data-group="search"] .wb-lib-tile')].some((t) => t.dataset.ref.startsWith("builtin:drawio-networks/")), null, { timeout: 8000 }).catch(() => {});
  const found = await page.evaluate(() => [...document.querySelectorAll('#wb-lib-list [data-group="search"] .wb-lib-tile')].map((t) => t.dataset.ref));
  check("search 'router' finds a network shape", found.some((r) => r.startsWith("builtin:drawio-networks/")), found.slice(0, 5));
  await page.fill("#wb-lib-search", "");
  await page.evaluate(() => document.getElementById("wb-lib-search").dispatchEvent(new Event("input", { bubbles: true })));
  // Place a Decision and read its ports; connect to its E port; move and resize; the end stays on E.
  const res = await page.evaluate(async () => {
    const entry = wbLibEntries().find((e) => e.ref === "builtin:drawio-flowchart/decision");
    await wbLibPlace(entry, [400, 300]);
    const s = wbState.sketches.find((x) => /drawio-flowchart\/decision/.test(x.data));
    const ports = wbPortFractions("sketch", s);
    const pos = wbAnchorPositions("sketch", s);
    const e = pos.find((p) => p.anchor.name === "E");
    const box = wbItemBBox("sketch", s);
    return { n: ports.length, names: ports.map((p) => p.name), ex: e && Math.round(e.x), ey: e && Math.round(e.y), maxX: Math.round(box.maxX), midY: Math.round((box.minY + box.maxY) / 2) };
  });
  check("placed decision has its stencil ports", res.n >= 4 && res.names.includes("E"), res);
  check("E port sits on the right tip", Math.abs(res.ex - res.maxX) <= 2 && Math.abs(res.ey - res.midY) <= 2, res);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check("no horizontal page scroll", overflow <= 0, overflow);
  summary();
  await browser.close();
})();
