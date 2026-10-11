// canvasdepth2: the current layer (draw.io's), measured: pressing a layer's
// name makes it current, a text box, a drawn shape and a library item then
// land on it, Undo of a delete brings an item back on no layer, a hidden
// current layer takes nothing new, and the row fits the panel.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbcurrentlayer.js
const { openFresh, checker } = require("./cdlib.js");
(async () => {
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
})();
