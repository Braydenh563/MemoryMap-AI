// canvasdepth: a .drawio file onto a board, plain and compressed, measured.
//   BASE=http://127.0.0.1:8850 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbdrawio.js
const zlib = require("zlib");
const { openFresh, checker } = require("./cdlib.js");
const MODEL = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="lane" value="Customer" style="swimlane;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="420" height="200" as="geometry"/></mxCell>
<mxCell id="a" value="&lt;b&gt;Order&lt;/b&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="lane"><mxGeometry x="20" y="60" width="120" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="Paid?" style="rhombus;whiteSpace=wrap;html=1;" vertex="1" parent="lane"><mxGeometry x="240" y="50" width="80" height="80" as="geometry"/></mxCell>
<mxCell id="c" value="Ship" style="ellipse;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="560" y="60" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="t" value="A caption" style="text;html=1;" vertex="1" parent="1"><mxGeometry x="0" y="240" width="120" height="30" as="geometry"/></mxCell>
<mxCell id="e1" value="" style="edgeStyle=orthogonalEdgeStyle;endArrow=classic;" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e2" value="yes" style="endArrow=block;dashed=1;" edge="1" parent="1" source="b" target="c"><mxGeometry relative="1" as="geometry"/></mxCell>
<UserObject label="Wrapped" id="w"><mxCell style="shape=cylinder3;" vertex="1" parent="1"><mxGeometry x="560" y="200" width="60" height="80" as="geometry"/></mxCell></UserObject>
</root></mxGraphModel>`;
const PLAIN = `<mxfile host="app.diagrams.net"><diagram name="Page-1" id="p1">${MODEL}</diagram><diagram name="Page-2" id="p2"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>`;
const PACKED = `<mxfile><diagram name="Page-1" id="p1">${zlib.deflateRawSync(Buffer.from(encodeURIComponent(MODEL))).toString("base64")}</diagram></mxfile>`;
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  const run = (text) => page.evaluate(async (t) => {
    const before = { sk: wbState.sketches.length, ob: (wbState.objects || []).length };
    let toastText = "";
    const real = window.toast;
    window.toast = (m, ...rest) => { toastText = m; return real(m, ...rest); };
    await wbImportText(t);
    window.toast = real;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const made = wbState.sketches.slice(before.sk).map((x) => JSON.parse(x.data));
    const objs = (wbState.objects || []).slice(before.ob);
    const shapes = made.filter((m) => !m.type);
    const links = made.filter((m) => m.type);
    const frame = objs.find((o) => o.kind === "frame");
    const order = shapes.find((s) => s.label === "Order");
    const inFrame = order && frame && (() => { const b = wbPathBBox(order.d); return b.minX >= frame.x && b.maxX <= frame.x + frame.width && b.minY >= frame.y && b.maxY <= frame.y + frame.height; })();
    return {
      toast: toastText, shapes: shapes.map((s) => [s.label, s.shape, s.fill || null]), links: links.map((l) => [l.route || "", l.endCap || "", l.label || "", l.dash || "", Boolean(l.sourceId && l.targetId)]),
      frames: objs.filter((o) => o.kind === "frame").map((o) => o.data?.content), texts: objs.filter((o) => o.kind === "text").map((o) => o.data?.content), inFrame,
    };
  }, text);
  for (const [name, text] of [["plain", PLAIN], ["compressed", PACKED]]) {
    const r = await run(text);
    check(`${name}: 4 shapes, labels as text`, r.shapes.length === 4 && r.shapes.some((s) => s[0] === "Order" && s[2] === "#dae8fc") && r.shapes.some((s) => s[0] === "Wrapped"), r.shapes);
    check(`${name}: swimlane is a frame holding its shapes`, r.frames.length === 1 && r.frames[0] === "Customer" && r.inFrame, [r.frames, r.inFrame]);
    check(`${name}: caption is a text box`, r.texts.length === 1 && r.texts[0] === "A caption", r.texts);
    check(`${name}: 2 connectors joined, elbow and dashed labelled`, r.links.length === 2 && r.links.every((l) => l[4]) && r.links.some((l) => l[0] === "elbow") && r.links.some((l) => l[2] === "yes" && l[3] === "dashed"), r.links);
    check(`${name}: report names what was not kept`, /cylinder3/.test(r.toast) && (name === "compressed" || /first of 2 pages/.test(r.toast)), r.toast);
  }
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
