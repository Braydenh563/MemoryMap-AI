// Mermaid subgraphs come in as frames (wb-phase2 step 2). Pasted through the
// Import dialog: a nested subgraph flowchart makes its frames with their
// titles, each frame holds exactly its members (measured on the rendered
// boxes), the inner frame lies inside the outer, an edge to a subgraph joins
// its frame, one Undo takes it all back, and the Mermaid export writes the
// frames back out as subgraphs.
//   BASE=http://127.0.0.1:8795 W=1440 H=900 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbmermaidframes.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

const SOURCE = `flowchart TD
A[Start] --> B
subgraph S1 [Build]
  B[Compile] --> C[Test]
  subgraph S2 ["Ship it"]
    D[Deploy]
  end
  C --> D
end
subgraph Q [Review]
  E[Lone]
end
D --> E
A --> S1`;

(async () => {
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
  const { browser, page, errors } = await openBoard({ viewport: { width: W, height: H } });
  await page.evaluate(() => wbRunCommand("import-diagram"));
  await page.waitForTimeout(400);
  const dialog = await page.evaluate(() => {
    const d = document.getElementById("wb-import-dialog");
    const r = d.getBoundingClientRect();
    return { open: d.open, fits: r.left >= 0 && r.right <= innerWidth + 0.5 && document.documentElement.scrollWidth <= innerWidth };
  });
  check("the Import dialog opens and fits the screen", dialog.open && dialog.fits, dialog);
  await page.fill("#wb-import-text", SOURCE);
  await page.click("#wb-import-go");
  await page.waitForTimeout(1500);
  const got = await page.evaluate(() => {
    const frames = (wbState.objects || []).filter((o) => o.kind === "frame");
    const shapes = wbState.sketches.filter((s) => { try { return !String(JSON.parse(s.data).type || "").startsWith("link-"); } catch { return false; } });
    const label = (s) => JSON.parse(s.data).label;
    const box = (s) => wbItemBBox("sketch", s);
    const inside = (b, f) => b.minX >= f.x && b.minY >= f.y && b.maxX <= f.x + f.width && b.maxY <= f.y + f.height;
    const overlaps = (b, f) => b.minX < f.x + f.width && b.maxX > f.x && b.minY < f.y + f.height && b.maxY > f.y;
    const byTitle = Object.fromEntries(frames.map((f) => [wbFrameTitle(f), f]));
    const members = { Build: ["Compile", "Test", "Deploy"], "Ship it": ["Deploy"], Review: ["Lone"] };
    const wrong = [];
    for (const [title, names] of Object.entries(members)) {
      const f = byTitle[title];
      if (!f) { wrong.push(`no frame ${title}`); continue; }
      for (const s of shapes) {
        const b = box(s);
        if (names.includes(label(s)) ? !inside(b, f) : overlaps(b, f)) wrong.push(`${label(s)} vs ${title}`);
      }
    }
    const o = byTitle.Build, i = byTitle["Ship it"];
    const nested = o && i && i.x > o.x && i.y > o.y && i.x + i.width < o.x + o.width && i.y + i.height < o.y + o.height;
    const frameLinks = wbState.sketches.map((s) => JSON.parse(s.data)).filter((d) => String(d.type || "").startsWith("link-") && (d.targetKind === "object" || d.sourceKind === "object"));
    const drawnFrames = frames.filter((f) => document.querySelector(`[data-id="${f.id}"]`)).length;
    const titleEls = [...document.querySelectorAll(".wb-frame-title")].map((t) => t.textContent.trim());
    return { frames: frames.map(wbFrameTitle).sort(), shapes: shapes.length, wrong, nested, frameLinks: frameLinks.length, drawnFrames, titleEls, said: document.getElementById("wb-announcer")?.textContent };
  });
  check("three frames, with their titles", JSON.stringify(got.frames) === JSON.stringify(["Build", "Review", "Ship it"]), got.frames);
  check("five shapes", got.shapes === 5, got.shapes);
  check("each frame holds exactly its members", got.wrong.length === 0, got.wrong);
  check("the inner frame lies inside the outer", got.nested, got);
  check("an edge to a subgraph joins its frame", got.frameLinks === 1, got.frameLinks);
  check("the frames are drawn with their titles", got.drawnFrames === 3 && ["Build", "Ship it", "Review"].every((t) => got.titleEls.some((x) => x.includes(t))), got.titleEls);
  check("the announcement counts the frames", /in 3 frames/.test(got.said || ""), got.said);

  const exported = await page.evaluate(() => wbBoardToMermaid(wbState, wbCardTitleForExport, wbMermaidFrameOf));
  check("the Mermaid export writes the frames back as subgraphs", (exported.match(/subgraph f\d+ \["(Build|Ship it|Review)"\]/g) || []).length === 3, exported);

  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1200);
  const undone = await page.evaluate(() => ({ frames: (wbState.objects || []).filter((o) => o.kind === "frame").length, sketches: wbState.sketches.length }));
  check("one Undo takes the frames, shapes and connectors back", undone.frames === 0 && undone.sketches === 0, undone);

  check("no console errors", errors.length === 0, errors.slice(0, 5));
  const ok = summary();
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
