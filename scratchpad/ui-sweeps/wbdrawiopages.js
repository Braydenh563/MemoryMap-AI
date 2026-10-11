// canvasdepth2: every page of a .drawio file, measured: three pages (one
// compressed, one empty) come in as two frames named after their pages, side
// by side with nothing overlapping, each holding its own shapes and joined
// connectors; the Pages tab lists them; one Undo takes the whole file away.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbdrawiopages.js
const zlib = require("zlib");
const { openFresh, checker } = require("./cdlib.js");
const page = (a, b) => `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="${a}" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="120" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="${b}" style="ellipse;" vertex="1" parent="1"><mxGeometry x="240" y="120" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="e" value="" style="endArrow=classic;" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel>`;
const FILE = `<mxfile><diagram name="Plan" id="p1">${page("Idea", "Draft")}</diagram>`
  + `<diagram name="Empty" id="p2"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram>`
  + `<diagram name="Ship" id="p3">${zlib.deflateRawSync(Buffer.from(encodeURIComponent(page("Test", "Release")))).toString("base64")}</diagram></mxfile>`;
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page: pg, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  const r = await pg.evaluate(async (t) => {
    let said = "";
    const real = window.toast;
    window.toast = (m, ...rest) => { said = m; return real(m, ...rest); };
    await wbImportText(t);
    window.toast = real;
    const frames = (wbState.objects || []).filter((o) => o.kind === "frame");
    const shapes = wbState.sketches.map((x) => JSON.parse(x.data)).filter((m) => !m.type);
    const links = wbState.sketches.map((x) => JSON.parse(x.data)).filter((m) => m.type);
    const inside = (label, f) => { const s = shapes.find((x) => x.label === label); const b = wbPathBBox(s.d); return b.minX >= f.x && b.maxX <= f.x + f.width && b.minY >= f.y && b.maxY <= f.y + f.height; };
    const [f1, f2] = frames.sort((a, b) => a.x - b.x);
    return { said, names: [f1?.data.content, f2?.data.content], overlap: f1 && f2 ? f1.x + f1.width > f2.x : null, inside: f1 && f2 ? [inside("Idea", f1), inside("Draft", f1), inside("Test", f2), inside("Release", f2)] : [], shapes: shapes.length, joined: links.filter((l) => l.sourceId && l.targetId).length };
  }, FILE);
  check("two frames named after the pages with shapes, in order", JSON.stringify(r.names) === '["Plan","Ship"]', r);
  check("side by side, not overlapping", r.overlap === false, r);
  check("each page's shapes inside its own frame", r.inside.length === 4 && r.inside.every(Boolean), r.inside);
  check("four shapes and two joined connectors", r.shapes === 4 && r.joined === 2, r);
  check("the report says pages each in a frame", /2 pages each in a frame/.test(r.said), r.said);
  const listed = await pg.evaluate(async () => { wbOpenSidebar("pages"); await new Promise((res) => setTimeout(res, 400)); return [...document.querySelectorAll("#wb-pages-list li, .wb-page-row")].map((li) => li.textContent.trim()).filter(Boolean); });
  check("the Pages tab lists both", listed.some((t) => /Plan/.test(t)) && listed.some((t) => /Ship/.test(t)), listed);
  const undone = await pg.evaluate(async () => { await wbUndo(); return [(wbState.objects || []).length, wbState.sketches.length]; });
  check("one Undo takes the whole file away", undone[0] === 0 && undone[1] === 0, undone);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
