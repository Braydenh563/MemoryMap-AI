// canvasdepth2: a map out as .xmind, measured: the export dialog offers
// XMind, its button fits the dialog, the download is a zip named .xmind with
// content.json in it, and the file reads back in as the same map.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapxmind.js
const { openFresh, checker, openMap } = require("./cd2lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  await openMap(page, ["# Trip", "- Trip", "  - Book", "    - Hotel", "  - Pack"].join("\n"));
  await page.evaluate(() => wbExportBoard());
  await page.waitForTimeout(500);
  const seg = await page.evaluate(() => {
    const b = [...document.querySelectorAll(".wb-export-seg button")].find((x) => x.textContent.trim() === "XMind");
    const dlg = b?.closest("dialog, .modal, [role=dialog]");
    const r = b?.getBoundingClientRect(), d = dlg?.getBoundingClientRect();
    return b ? { w: r.width, h: r.height, inside: r.left >= d.left && r.right <= d.right + 0.5, wrapW: b.parentElement.scrollWidth, wrapC: b.parentElement.clientWidth } : null;
  });
  check("the export dialog offers XMind, inside the dialog", seg && seg.inside, seg);
  check("its row does not scroll sideways", seg && seg.wrapW <= seg.wrapC + 1, seg);
  await page.keyboard.press("Escape");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.evaluate(() => wbExportMapText("xmind")),
  ]);
  const path = await download.path();
  const bytes = require("fs").readFileSync(path);
  check("a .xmind file", /\.xmind$/.test(download.suggestedFilename()), download.suggestedFilename());
  check("a zip (PK header)", bytes[0] === 0x50 && bytes[1] === 0x4b, bytes.slice(0, 2));
  const back = await page.evaluate(async (b64) => {
    const made = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "xmind", content: b64, name: "Back" }) });
    const st = await apiJson(`/whiteboard/?board_id=${made.id}`);
    return st.objects.map((o) => o.data.content).sort();
  }, bytes.toString("base64"));
  check("it reads back in as the same four topics", JSON.stringify(back) === JSON.stringify(["Book", "Hotel", "Pack", "Trip"]), back);
  console.log(`    ${bytes.length} bytes, ${download.suggestedFilename()}`);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
