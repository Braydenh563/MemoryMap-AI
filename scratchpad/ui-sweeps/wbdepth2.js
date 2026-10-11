// canvasdepth2 sweeps for the whiteboard surface, consolidated: one async function per case.
// Run one case by name, or every case in order with no argument:
//   node scratchpad/ui-sweeps/wbdepth2.js wbcurrentlayer

// canvasdepth2: the current layer (draw.io's), measured: pressing a layer's
// name makes it current, a text box, a drawn shape and a library item then
// land on it, Undo of a delete brings an item back on no layer, a hidden
// current layer takes nothing new, and the row fits the panel.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbdepth2.js wbcurrentlayer
async function wbcurrentlayer() {
  const { openFresh, checker } = require("./cdlib.js");
    const W = Number(process.env.W || 1440);
    const { browser, page, errors, phone } = await openFresh({ width: W });
    const { check, summary } = checker();
    await page.evaluate(async () => {
      const loose = await wbCreateObject("text", { content: "Loose" }, 0, 200, 140, 60);
      window.__loose = loose.id;
      await wbSaveNamedLayers([{ id: "back", name: "Background" }, { id: "notes", name: "Notes" }], { undo: false });
      wbOpenSidebar("layers");
    });
    await page.waitForSelector('.wb-named-layer[data-layer="notes"] .wb-named-layer-current', { state: "visible" });
    await page.click('.wb-named-layer[data-layer="notes"] .wb-named-layer-current');
    await page.waitForTimeout(700);
    const row = await page.evaluate(() => {
      const li = document.querySelector('.wb-named-layer[data-layer="notes"]');
      const b = li.querySelector(".wb-named-layer-current").getBoundingClientRect();
      const p = document.querySelector(".wb-sidebar-panel")?.getBoundingClientRect();
      return { current: wbState.layers.find((l) => l.current)?.id, pressed: li.querySelector(".wb-named-layer-current").getAttribute("aria-pressed"), cls: li.getAttribute("aria-current") === "true", h: b.height, right: b.right, panelRight: p?.right };
    });
    check("pressing the name makes the layer current", row.current === "notes" && row.pressed === "true" && row.cls, row);
    const min = phone ? 44 : 28;
    check(`the name is a ${min}px target inside the panel`, row.h >= min - 0.5 && row.right <= row.panelRight + 0.5, row);
    const made = await page.evaluate(async () => {
      const text = await wbCreateObject("text", { content: "New" }, 200, 0, 140, 60);
      const shape = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify({ d: "M0 0 L80 0 L80 60 L0 60 Z", shape: "rect", color: "#333", width: 2 }), board_id: window.currentBoardId, x: 0, y: 0, z: 2 }) });
      wbState.sketches.push(shape);
      const placed = await apiJson(`/whiteboard/boards/${window.currentBoardId}/place`, { method: "POST", body: JSON.stringify({ builtin: "flowchart/decision", x: 400, y: 0 }) }).catch((e) => String(e));
      return { text: text.data.layer, shape: JSON.parse(shape.data).layer, placed: placed && typeof placed === "object" ? [...(placed.objects || []).map((o) => o.data.layer), ...(placed.sketches || []).map((s) => JSON.parse(s.data).layer)] : placed, count: document.querySelector('.wb-named-layer[data-layer="notes"] .wb-lib-count')?.textContent };
    });
    check("a new text box lands on the current layer", made.text === "notes", made);
    check("so does a drawn shape", made.shape === "notes", made);
    check("and a library item", Array.isArray(made.placed) && made.placed.length > 0 && made.placed.every((l) => l === "notes"), made);
    const back = await page.evaluate(async () => {
      const o = wbState.objects.find((x) => x.id === window.__loose);
      wbHandleItemClick("object", o.id, { shiftKey: false });
      await deleteWbSelection();
      await new Promise((r) => setTimeout(r, 400));
      await wbUndo();
      const again = wbState.objects.find((x) => x.data?.content === "Loose");
      return again ? (again.data.layer ?? null) : "missing";
    });
    check("Undo of a delete brings an item back on no layer", back === "" || back === null, back);
    const hidden = await page.evaluate(async () => {
      await wbNamedLayerSet("notes", { hidden: true });
      const t = await wbCreateObject("text", { content: "While hidden" }, 0, 400, 140, 60);
      return t.data.layer ?? null;
    });
    check("a hidden current layer takes nothing new", hidden === null, hidden);
    const off = await page.evaluate(async () => { await wbNamedLayerSet("notes", { hidden: false }); await wbSetCurrentLayer(null); const t = await wbCreateObject("text", { content: "Off" }, 0, 500, 140, 60); return [t.data.layer ?? null, wbState.layers.some((l) => l.current)]; });
    check("Draw on no layer: new things go on none", off[0] === null && off[1] === false, off);
    check("no page errors", errors.length === 0, errors.slice(0, 3));
    summary();
    await browser.close();
}

// canvasdepth2: every page of a .drawio file, measured: three pages (one
// compressed, one empty) come in as two frames named after their pages, side
// by side with nothing overlapping, each holding its own shapes and joined
// connectors; the Pages tab lists them; one Undo takes the whole file away.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbdepth2.js wbdrawiopages
async function wbdrawiopages() {
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
}

// canvasdepth2: Edit data (draw.io's custom properties), measured: the
// Format panel's Data tab lists a shape's named values, Add a property and
// typing saves one, a bad name is refused, remove takes one off, one Undo
// per change, the values survive a reopen, and the rows fit the panel.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbdepth2.js wbeditdata
async function wbeditdata() {
  const { openFresh, checker } = require("./cdlib.js");
    const W = Number(process.env.W || 1440);
    const { browser, page, errors, phone } = await openFresh({ width: W });
    const { check, summary } = checker();
    const id = await page.evaluate(async () => {
      const s = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify({ d: "M100 100 L300 100 L300 200 L100 200 Z", shape: "rect", color: "#333333", width: 2, props: { owner: "Ann" } }), board_id: window.currentBoardId, z: 5 }) });
      wbState.sketches.push(s);
      renderWhiteboardNow();
      wbHandleItemClick("sketch", s.id, { shiftKey: false });
      await wbRunCommand("edit-data");
      return s.id;
    });
    await page.waitForTimeout(500);
    const first = await page.evaluate(() => ({ tab: document.querySelector('[data-format-tab="data"]').getAttribute("aria-selected"), rows: [...document.querySelectorAll("#wb-fmt-props .wb-fmt-prop")].map((r) => [r.querySelector(".wb-fmt-prop-name").value, r.querySelector(".wb-fmt-prop-value").value]) }));
    check("Edit data opens the Data tab with the shape's values", first.tab === "true" && JSON.stringify(first.rows) === '[["owner","Ann"]]', first);
    await page.click("#wb-fmt-prop-add");
    await page.keyboard.type("status");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Draft");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(800);
    const saved = await page.evaluate((id) => wbSketchData(wbState.sketches.find((s) => s.id === id)).props, id);
    check("Add a property, type a name and a value: saved", saved?.status === "Draft" && saved?.owner === "Ann", saved);
    const fit = await page.evaluate(() => {
      const panel = document.getElementById("wb-format").getBoundingClientRect();
      const rows = [...document.querySelectorAll("#wb-fmt-props .wb-fmt-prop")].map((r) => r.getBoundingClientRect());
      const tabs = document.getElementById("wb-format-tabs");
      const rm = document.querySelector(".wb-fmt-prop-remove").getBoundingClientRect();
      return { inside: rows.every((r) => r.left >= panel.left - 0.5 && r.right <= panel.right + 0.5), tabsScroll: tabs.scrollWidth - tabs.clientWidth, rm: [Math.round(rm.width), Math.round(rm.height)] };
    });
    check("the rows fit the panel and the four tabs do not scroll", fit.inside && fit.tabsScroll <= 1, fit);
    const min = phone ? 44 : 24;
    check(`the remove button is at least ${min}px`, fit.rm[0] >= min && fit.rm[1] >= min, fit.rm);
    await page.evaluate(() => { const v = document.querySelector("#wb-fmt-props .wb-fmt-prop .wb-fmt-prop-name"); v.value = "9 lives"; v.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(700);
    const refused = await page.evaluate((id) => wbSketchData(wbState.sketches.find((s) => s.id === id)).props, id);
    check("a name starting with a digit is not kept", refused && !("9 lives" in refused) && refused.status === "Draft", refused);
    const undone = await page.evaluate(async (id) => { await wbUndo(); return wbSketchData(wbState.sketches.find((s) => s.id === id)).props; }, id);
    check("one Undo puts the last change back", undone?.owner === "Ann" && undone?.status === "Draft", undone);
    const back = await page.evaluate(async (id) => { await openWhiteboardBoard(window.currentBoardId); return wbSketchData(wbState.sketches.find((s) => s.id === id)).props; }, id);
    check("the values survive a reopen", back?.status === "Draft", back);
    if (process.env.SHOTS) { await page.evaluate((id) => { wbHandleItemClick("sketch", id, { shiftKey: false }); wbFormatOpen("data", { focus: false }); }, id); await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.SHOTS}/editdata-${W}.png` }); }
    check("no page errors", errors.length === 0, errors.slice(0, 3));
    summary();
    await browser.close();
}

// canvasdepth2: the hand-drawn look (Excalidraw's), measured: the View menu's
// board switch roughens shapes and connectors but not the pen, the drawn
// path is the same on a second render (seeded by the item), its hit band
// keeps the true shape, an item can opt out in the Format panel, and the
// switch is one Undo step.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbdepth2.js wbrough
async function wbrough() {
  const { openFresh, checker } = require("./cdlib.js");
    const W = Number(process.env.W || 1440);
    const { browser, page, errors } = await openFresh({ width: W });
    const { check, summary } = checker();
    const ids = await page.evaluate(async () => {
      const mk = async (blob) => { const s = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(blob), board_id: window.currentBoardId, z: 5 }) }); wbState.sketches.push(s); return s.id; };
      const rect = await mk({ d: "M100 100 L300 100 L300 220 L100 220 Z", shape: "rect", color: "#333333", width: 2, fill: "#ffe08a", fillOpacity: 1 });
      const pen = await mk({ d: "M100 300 L140 320 L180 300 L220 330", shape: "draw", color: "#333333", width: 3 });
      const line = await mk({ d: "M350 100 L520 200", shape: "line", color: "#333333", width: 2 });
      renderWhiteboardNow();
      return { rect, pen, line };
    });
    await page.waitForTimeout(400);
    const read = () => page.evaluate((ids) => Object.fromEntries(Object.entries(ids).map(([k, id]) => {
      const g = [...document.querySelectorAll(".sketch-group")].find((x) => x.__data__?.id === id);
      return [k, { d: g?.querySelector(".sketch-path")?.getAttribute("d") || "", hit: g?.querySelector(".sketch-hitbox")?.getAttribute("d") || "" }];
    })), ids);
    const plain = await read();
    await page.evaluate(() => { const t = document.getElementById("wb-rough-toggle"); t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(900);
    const rough = await read();
    check("the board switch roughens a shape", rough.rect.d !== plain.rect.d && (rough.rect.d.match(/M/g) || []).length === 2, rough.rect.d.slice(0, 80));
    check("and a line", rough.line.d !== plain.line.d, rough.line.d.slice(0, 60));
    check("but not the freehand pen", rough.pen.d === plain.pen.d);
    check("the hit band keeps the true shape", rough.rect.hit === plain.rect.hit);
    const bbox = await page.evaluate((id) => { const g = [...document.querySelectorAll(".sketch-group")].find((x) => x.__data__?.id === id); const b = g.querySelector(".sketch-path").getBBox(); return [b.x, b.y, b.width, b.height].map(Math.round); }, ids.rect);
    check("the rough rectangle stays within 4px of the true one", Math.abs(bbox[0] - 100) <= 4 && Math.abs(bbox[1] - 100) <= 4 && Math.abs(bbox[2] - 200) <= 8 && Math.abs(bbox[3] - 120) <= 8, bbox);
    await page.evaluate(() => renderWhiteboardNow());
    const again = await read();
    check("the same drawing on the next render", again.rect.d === rough.rect.d);
    const reopened = await page.evaluate(async () => { await openWhiteboardBoard(window.currentBoardId); return wbBoardBackground().rough; });
    await page.waitForTimeout(700);
    const after = await read();
    check("the look survives a reopen, drawn the same", reopened === true && after.rect.d === rough.rect.d, reopened);
    // One item opts out from the Format panel.
    await page.evaluate((id) => { wbHandleItemClick("sketch", id, { shiftKey: false }); wbFormatOpen("style", { focus: false }); }, ids.rect);
    await page.waitForTimeout(400);
    const row = await page.evaluate(() => { const r = document.querySelector('[data-fmt="rough"]'); const box = document.getElementById("wb-fmt-rough"); return { shown: r && !r.hidden, checked: box?.checked }; });
    check("the Format panel shows Hand-drawn, ticked", row.shown && row.checked, row);
    await page.evaluate(() => { const t = document.getElementById("wb-fmt-rough"); t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(800);
    const opted = await read();
    check("unticked, that shape is drawn plain on a rough board", opted.rect.d === plain.rect.d && opted.line.d === rough.line.d);
    const undone = await page.evaluate(async () => { await wbUndo(); await wbUndo(); return wbBoardBackground().rough ?? false; });
    await page.waitForTimeout(600);
    check("two Undos take the opt-out and the board's look back", undone === false && (await read()).rect.d === plain.rect.d, undone);
    if (process.env.SHOTS) { await page.evaluate(async () => { await wbRedo(); }); await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.SHOTS}/rough-${W}.png` }); }
    const t0 = await page.evaluate(() => { const t = performance.now(); for (let i = 0; i < 200; i++) wbRoughD("M0 0 L400 0 L400 300 L0 300 Z", 1000 + i); return Math.round(performance.now() - t); });
    console.log(`    200 fresh rectangles roughened in ${t0} ms`);
    check("no page errors", errors.length === 0, errors.slice(0, 3));
    summary();
    await browser.close();
}

// canvasdepth2: a table on the board (draw.io's), measured: Insert, Table
// places a 3 by 3 grid that fills its box; double-click and type fills a
// cell, Tab walks to the next; the menu adds and removes rows and columns at
// the cell pressed, growing the box; a resize resizes every cell; the words
// survive a reopen; Undo takes a change back.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbdepth2.js wbtable
async function wbtable() {
  const { openFresh, checker } = require("./cdlib.js");
    const W = Number(process.env.W || 1440);
    const { browser, page, errors, phone } = await openFresh({ width: W });
    const { check, summary } = checker();
    await page.evaluate(() => wbRunCommand("insert-table"));
    await page.waitForTimeout(800);
    const t = await page.evaluate(() => {
      const d = wbState.objects.find((o) => o.kind === "table");
      const el = document.querySelector(`.wb-object[data-id="${d.id}"]`);
      const g = el.querySelector(".wb-table-grid").getBoundingClientRect(), e = el.getBoundingClientRect();
      return { id: d.id, cells: el.querySelectorAll(".wb-table-cell").length, fill: Math.abs(g.width - e.width) < 3 && Math.abs(g.height - e.height) < 3, w: d.width, h: d.height, head: getComputedStyle(el.querySelector('.wb-table-cell[data-r="0"]')).fontWeight };
    });
    check("Insert, Table places a 3 by 3 grid filling its box", t.cells === 9 && t.fill, t);
    check("its first row is a header (bold)", Number(t.head) >= 600, t.head);
    const cell = async (r, c) => page.evaluate(([id, r, c]) => { const b = document.querySelector(`.wb-object[data-id="${id}"] .wb-table-cell[data-r="${r}"][data-c="${c}"]`).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height }; }, [t.id, r, c]);
    const c00 = await cell(0, 0);
    await page.mouse.dblclick(c00.x, c00.y);
    await page.waitForTimeout(200);
    await page.keyboard.type("Name");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Owner");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
    const typed = await page.evaluate((id) => wbState.objects.find((o) => o.id === id).data.cells, t.id);
    check("double-click, type, Tab, type, Enter fills two cells", typed[0][0] === "Name" && typed[0][1] === "Owner", typed[0]);
    const c11 = await cell(1, 1);
    await page.mouse.click(c11.x, c11.y);
    await page.waitForTimeout(300);
    const rows = await page.evaluate((id) => wbTableMenuRows(wbState.objects.find((o) => o.id === id)).map(([l]) => l), t.id);
    check("the menu offers rows and columns at the cell pressed", rows.includes("Add a row below") && rows.includes("Delete this column"), rows);
    await page.evaluate(async (id) => { const d = wbState.objects.find((o) => o.id === id); await wbTableMenuRows(d).find(([l]) => l === "Add a row below")[2](); }, t.id);
    await page.waitForTimeout(500);
    await page.evaluate(async (id) => { const d = wbState.objects.find((o) => o.id === id); await wbTableMenuRows(d).find(([l]) => l === "Add a column to the right")[2](); }, t.id);
    await page.waitForTimeout(700);
    const grown = await page.evaluate((id) => { const d = wbState.objects.find((o) => o.id === id); return { rows: d.data.cells.length, cols: d.data.cells[0].length, w: d.width, h: d.height, newRow: d.data.cells[2].every((x) => x === ""), drawn: document.querySelectorAll(`.wb-object[data-id="${id}"] .wb-table-cell`).length }; }, t.id);
    check("a row went in under row 2 and a column after column 2", grown.rows === 4 && grown.cols === 4 && grown.newRow && grown.drawn === 16, grown);
    check("the box grew by one row and one column", Math.round(grown.h - t.h) === 40 && Math.round(grown.w - t.w) === 120, { before: [t.w, t.h], after: [grown.w, grown.h] });
    const undone = await page.evaluate(async (id) => { await wbUndo(); const d = wbState.objects.find((o) => o.id === id); return [d.data.cells.length, d.data.cells[0].length, d.width]; }, t.id);
    check("Undo takes the column back out", undone[0] === 4 && undone[1] === 3 && undone[2] === t.w, undone);
    const resized = await page.evaluate(async (id) => { const d = wbState.objects.find((o) => o.id === id); d.width = 600; await wbSaveObject(d); renderWhiteboardNow(); await new Promise((r) => setTimeout(r, 200)); const c = document.querySelector(`.wb-object[data-id="${id}"] .wb-table-cell`).getBoundingClientRect(); return { cellW: c.width }; }, t.id);
    const c00b = await cell(0, 0);
    check("a wider table widens every cell", c00b.w > c00.w * 1.2, { before: c00.w, after: c00b.w });
    const back = await page.evaluate(async (id) => { await openWhiteboardBoard(window.currentBoardId); return wbState.objects.find((o) => o.id === id)?.data.cells; }, t.id);
    await page.waitForTimeout(600);
    const shown = await page.evaluate((id) => document.querySelector(`.wb-object[data-id="${id}"] .wb-table-cell`)?.textContent, t.id);
    check("the words survive a reopen", back?.[0]?.[0] === "Name" && shown === "Name", { back: back?.[0], shown });
    const rowsMenu = await page.evaluate(() => [...document.querySelectorAll('#wb-insert-menu [data-wb-cmd="insert-table"]')].length);
    check("the Insert menu has Table", rowsMenu === 1);
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/table-${W}.png` });
    check("no page errors", errors.length === 0, errors.slice(0, 3));
    summary();
    await browser.close();
}

const CASES = {
  wbcurrentlayer,
  wbdrawiopages,
  wbeditdata,
  wbrough,
  wbtable,
};
const names = process.argv.slice(2);
const unknown = names.filter((n) => !Object.prototype.hasOwnProperty.call(CASES, n));
if (unknown.length) {
  console.error(`unknown case: ${unknown.join(", ")}`);
  console.error(`cases: ${Object.keys(CASES).join(", ")}`);
  process.exit(2);
}
(async () => {
  for (const name of names.length ? names : Object.keys(CASES)) await CASES[name]();
})();
