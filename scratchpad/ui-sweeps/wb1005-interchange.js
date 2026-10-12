// A board in and out as text (W5): Insert, Mermaid, draw.io or board SVG brings a
// pasted flowchart in as shapes and connectors, one undo step; an SVG the
// board exported carries the board and comes back as items, connectors
// rejoined; Export lists Outline and Mermaid on a board and not on a map.
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-interchange.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
const W = Number(process.env.W || 1440);

(async () => {
  const { browser, page, errors } = await openBoard({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.evaluate(() => wbRunCommand("import-diagram"));
  await page.waitForTimeout(400);
  const open = await page.evaluate(() => ({ open: document.getElementById("wb-import-dialog").open, focus: document.activeElement?.id }));
  check("Insert, Mermaid, draw.io or board SVG opens the dialog on the text", open.open && open.focus === "wb-import-text", open);
  await page.fill("#wb-import-text", "flowchart TD\n  A[Start] --> B{Ready?}\n  B -->|yes| C[Ship it]\n  B -- no --> A");
  await page.click("#wb-import-go");
  await page.waitForTimeout(1500);
  const made = await page.evaluate(() => {
    const parsed = wbState.sketches.map((s) => JSON.parse(s.data));
    return {
      shapes: parsed.filter((p) => p.d).map((p) => p.label),
      links: parsed.filter((p) => String(p.type || "").startsWith("link-")).map((p) => [p.route, p.label || ""]),
    };
  });
  check("three shapes with their words", JSON.stringify(made.shapes.sort()) === JSON.stringify(["Ready?", "Ship it", "Start"]), made);
  check("three elbow connectors, the labels kept", made.links.length === 3 && made.links.every((l) => l[0] === "elbow") && made.links.some((l) => l[1] === "yes"), made.links);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(900);
  const undone = await page.evaluate(() => wbState.sketches.length);
  check("one Undo takes the whole flowchart back", undone === 0, undone);
  await page.evaluate(() => wbRedo());
  await page.waitForTimeout(900);

  // The SVG round trip.
  const round = await page.evaluate(async () => {
    const before = wbState.sketches.length;
    const { svg } = wbBuildExportSvg("whole");
    const withBoard = svg.replace(/(<svg[^>]*>)/, `$1${wbBoardSvgMetadata(wbExportRows("whole"))}`);
    await wbImportText(withBoard);
    await new Promise((r) => setTimeout(r, 600));
    const parsed = wbState.sketches.map((s) => JSON.parse(s.data));
    const ids = new Set(wbState.sketches.map((s) => s.id));
    const links = parsed.filter((p) => String(p.type || "").startsWith("link-"));
    return { before, after: wbState.sketches.length, joined: links.every((l) => ids.has(l.sourceId) && ids.has(l.targetId)) };
  });
  check("an exported SVG comes back as the shapes and connectors", round.after === round.before * 2 && round.joined, round);

  // The export dialog's formats.
  const formats = await page.evaluate(() => WB_EXPORT_FORMATS.filter((f) => (!f.map || wbIsMap()) && (!f.board || !wbIsMap())).map((f) => f.value));
  check("a board exports Outline and Mermaid", formats.includes("outline") && formats.includes("mermaid") && !formats.includes("opml"), formats);
  const mermaid = await page.evaluate(() => wbBoardToMermaid(wbState));
  check("and its Mermaid names the joins", /-->\|yes\|/.test(mermaid), mermaid);
  check("no console errors", errors.length === 0, errors);
  summary();
  await browser.close();
})();
