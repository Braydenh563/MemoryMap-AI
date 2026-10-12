// Renders converted stencil shapes beside the stencil XML's own drawing ops
// and measures the difference (WHITEBOARD_PLAN "The draw.io programme").
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node render_compare.js \
//       <converted json dir> <decoded xml dir> <out dir> lib:Shape Name ...
//   e.g. flowchart:Decision basic:Heart arrows:"Circular Arrow"
//
// Left half of each PNG is the converted JSON (what the board would draw from
// `data.d`), right half is the stencil XML interpreted straight onto a canvas
// (`mxStencil.drawNode`'s ops, own SVG-arc maths, no shared code with the
// converter). draw.io's own PNG of a shape cannot be produced offline, so the
// stencil's ops are the reference. Fills draw solid and strokes at one device
// pixel, so only geometry is compared. Prints one JSON line per shape.
const fs = require("fs");
const path = require("path");
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const [jsonDir, xmlDir, outDir, ...wanted] = process.argv.slice(2);
if (!wanted.length) {
  console.error("usage: render_compare.js JSONDIR XMLDIR OUTDIR lib:Shape ...");
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

// Runs in the page. `entry` is a converted library entry, `xml` one <shape>.
function pageMain(entry, xml) {
  const SIZE = 200, FIT = 180;
  const dom = new DOMParser().parseFromString(xml, "text/xml").documentElement;
  // mxStencil defaults a missing w or h to 100.
  const W = parseFloat(dom.getAttribute("w")) || 100, H = parseFloat(dom.getAttribute("h")) || 100;
  const s = Math.min(FIT / W, FIT / H);
  const ox = (SIZE - W * s) / 2, oy = (SIZE - H * s) / 2;

  // SVG arc, endpoint form to centre form (implementation notes F.6.5).
  function svgArc(p, x0, y0, rx, ry, rotDeg, large, sweep, x, y) {
    if (rx === 0 || ry === 0) { p.lineTo(x, y); return; }
    const phi = (rotDeg * Math.PI) / 180, c = Math.cos(phi), sn = Math.sin(phi);
    const dx = (x0 - x) / 2, dy = (y0 - y) / 2;
    const x1 = c * dx + sn * dy, y1 = -sn * dx + c * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
    const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
    let co = Math.sqrt(Math.max(0, num / den));
    if (large === sweep) co = -co;
    const cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
    const cx = c * cxp - sn * cyp + (x0 + x) / 2, cy = sn * cxp + c * cyp + (y0 + y) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
    let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    else if (sweep && dt < 0) dt += 2 * Math.PI;
    p.ellipse(cx, cy, rx, ry, phi, t1, t1 + dt, dt < 0);
  }

  // The XML side: a list of painted geometries, in order.
  function xmlPaints() {
    const out = [];
    let cur = new Path2D(), px = 0, py = 0, sx = 0, sy = 0;
    let st = { fill: null, stroke: null }, stack = [];
    let segs = 0;
    const paint = (kind) => {
      out.push({ path: cur, fill: kind !== "stroke" && st.fill !== "none", stroke: kind !== "fill" && st.stroke !== "none", fc: st.fill, sc: st.stroke });
    };
    for (const sec of ["background", "foreground"]) {
      const node = [...dom.children].find((c) => c.tagName === sec);
      if (!node) continue;
      for (const op of node.children) {
        const t = op.tagName, g = (k) => parseFloat(op.getAttribute(k) || "0");
        if (t === "save") stack.push({ ...st });
        else if (t === "restore") st = stack.pop() || st;
        else if (t === "fillcolor") st.fill = op.getAttribute("color");
        else if (t === "strokecolor") st.stroke = op.getAttribute("color");
        else if (t === "path") {
          cur = new Path2D();
          for (const o of op.children) {
            const k = o.tagName, v = (n) => parseFloat(o.getAttribute(n) || "0");
            segs += 1;
            if (k === "move") { cur.moveTo(v("x"), v("y")); px = sx = v("x"); py = sy = v("y"); }
            else if (k === "line") { cur.lineTo(v("x"), v("y")); px = v("x"); py = v("y"); }
            else if (k === "quad") { cur.quadraticCurveTo(v("x1"), v("y1"), v("x2"), v("y2")); px = v("x2"); py = v("y2"); }
            else if (k === "curve") { cur.bezierCurveTo(v("x1"), v("y1"), v("x2"), v("y2"), v("x3"), v("y3")); px = v("x3"); py = v("y3"); }
            else if (k === "arc") { svgArc(cur, px, py, v("rx"), v("ry"), v("x-axis-rotation"), +o.getAttribute("large-arc-flag"), +o.getAttribute("sweep-flag"), v("x"), v("y")); px = v("x"); py = v("y"); }
            else if (k === "close") { cur.closePath(); px = sx; py = sy; }
          }
        } else if (t === "rect" || t === "roundrect" || t === "ellipse") {
          segs += 1;
          cur = new Path2D();
          const x = g("x"), y = g("y"), w = g("w"), h = g("h");
          if (w > 0 && h > 0) {
            if (t === "rect") cur.rect(x, y, w, h);
            else if (t === "ellipse") cur.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
            else {
              const r = Math.min(w, h) * ((g("arcsize") || 15) / 100);
              cur.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
            }
          }
        } else if (t === "fillstroke" || t === "fill" || t === "stroke") paint(t);
      }
    }
    return { paints: out, segs };
  }

  // JSON side: one painted path per row.
  function jsonPaints() {
    return entry.payload.items.map((r) => ({
      path: new Path2D(r.data.d),
      fill: Boolean(r.data.fill),
      stroke: !r.data.noStroke,
      fc: r.data.fill,
      sc: r.data.color,
    }));
  }

  function canvas() {
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.setTransform(s, 0, 0, s, ox, oy);
    return { c, ctx };
  }
  function masks(paints) {
    const f = canvas(), k = canvas();
    for (const p of paints) {
      if (p.fill) { f.ctx.fillStyle = "#000"; f.ctx.fill(p.path); }
      if (p.stroke) { k.ctx.strokeStyle = "#000"; k.ctx.lineWidth = 1 / s; k.ctx.stroke(p.path); }
    }
    const read = (cc) => cc.ctx.getImageData(0, 0, SIZE, SIZE).data;
    return { fill: read(f), stroke: read(k) };
  }
  function stats(m) {
    let fillPx = 0, minX = SIZE, minY = SIZE, maxX = -1, maxY = -1;
    const ink = new Uint8Array(SIZE * SIZE);
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      const fo = m.fill[i * 4] < 128, so = m.stroke[i * 4] < 128;
      if (fo) fillPx += 1;
      if (fo || so) {
        ink[i] = 1;
        const x = i % SIZE, y = (i / SIZE) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    return { fillPx, ink, bbox: [minX, minY, maxX, maxY] };
  }
  const A = jsonPaints(), x = xmlPaints();
  const sa = stats(masks(A)), sb = stats(masks(x.paints));
  let inter = 0, uni = 0;
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    if (sa.ink[i] && sb.ink[i]) inter += 1;
    if (sa.ink[i] || sb.ink[i]) uni += 1;
  }
  // The picture: left converted, right stencil ops, real default colours.
  const pic = document.createElement("canvas");
  pic.width = SIZE * 2; pic.height = SIZE;
  const pc = pic.getContext("2d");
  pc.fillStyle = "#fff"; pc.fillRect(0, 0, SIZE * 2, SIZE);
  const draw = (paints, dx) => {
    pc.save(); pc.setTransform(s, 0, 0, s, ox + dx, oy);
    for (const p of paints) {
      if (p.fill) { pc.globalAlpha = 0.5; pc.fillStyle = p.fc && p.fc !== "default" && p.fc !== "ink" && /^#|^[a-z]+$/i.test(p.fc) && p.fc !== "none" ? p.fc : "#9aa3b2"; pc.fill(p.path); pc.globalAlpha = 1; }
      if (p.stroke) { pc.strokeStyle = "#1f2430"; pc.lineWidth = 2 / s; pc.stroke(p.path); }
    }
    pc.restore();
  };
  draw(A, 0); draw(x.paints, SIZE);
  pc.setTransform(1, 0, 0, 1, 0, 0);
  pc.strokeStyle = "#ccc"; pc.beginPath(); pc.moveTo(SIZE, 0); pc.lineTo(SIZE, SIZE); pc.stroke();
  const boxArea = W * s * H * s;
  return {
    png: pic.toDataURL("image/png"),
    box: [W, H],
    jsonBBox: sa.bbox, xmlBBox: sb.bbox,
    jsonFill: +(sa.fillPx / boxArea).toFixed(4), xmlFill: +(sb.fillPx / boxArea).toFixed(4),
    jsonSegments: entry.stencil.segments, xmlOps: x.segs,
    inkIoU: +(inter / (uni || 1)).toFixed(4),
  };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<!doctype html><title>x</title>");
  for (const spec of wanted) {
    const [lib, ...rest] = spec.split(":");
    const name = rest.join(":");
    const data = JSON.parse(fs.readFileSync(path.join(jsonDir, `${lib}.json`), "utf8"));
    const entry = data.items.find((i) => i.name === name);
    const xmlText = fs.readFileSync(path.join(xmlDir, `${lib}.xml`), "utf8");
    const doc = new (require("util").TextDecoder)().decode(Buffer.from(xmlText));
    const m = doc.match(new RegExp(`<shape [^>]*name="${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>[\\s\\S]*?</shape>`));
    if (!entry || !m) { console.log(JSON.stringify({ spec, error: "not found" })); continue; }
    const r = await page.evaluate(`(${pageMain.toString()})(${JSON.stringify(entry)}, ${JSON.stringify(m[0])})`);
    const file = path.join(outDir, `${lib}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`);
    fs.writeFileSync(file, Buffer.from(r.png.split(",")[1], "base64"));
    delete r.png;
    console.log(JSON.stringify({ shape: spec, file: path.basename(file), ...r }));
  }
  await browser.close();
})();
