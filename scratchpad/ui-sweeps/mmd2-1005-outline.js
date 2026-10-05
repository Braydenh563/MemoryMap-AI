// The audit's M3 (MINDMAP_PLAN §12.2 item 8, decision 33): a map's Outline,
// an indented list edited in place and kept in step with the canvas.
// Gate: 50 topics edited from the outline show on the canvas within a frame.
//
//   BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmd2-1005-outline.js   (THEME=dark, W=390)
const { boot } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  const md = ["# Outline map", "", "- Centre"];
  for (let b = 1; b <= 7; b++) {
    md.push(`  - Branch ${b}`);
    for (let l = 1; l <= 6; l++) md.push(`    - Leaf ${b}.${l}`);
  }
  await page.evaluate(async (content) => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content }) });
    await openWhiteboardBoard(b.id);
  }, md.join("\n"));
  await page.waitForTimeout(1500);
  const opened = await page.evaluate(() => {
    const sw = document.getElementById("wb-panel-outline");
    const row = sw.closest("label");
    const shownInMenu = !row.hidden;
    sw.checked = true;
    sw.dispatchEvent(new Event("change", { bubbles: true }));
    const panel = document.getElementById("wb-map-outline");
    const rows = [...document.querySelectorAll("#wb-outline-tree .wb-outline-row")];
    const r = panel.getBoundingClientRect();
    return {
      shownInMenu,
      visible: !panel.classList.contains("hidden") && r.width > 0,
      inWindow: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
      rows: rows.length,
      topics: wbMapIndex().nodes.length,
      levels: rows.slice(0, 3).map((x) => x.getAttribute("aria-level")).join(","),
      first: rows[0]?.firstChild.value,
    };
  });
  check("View, Outline opens a row per topic in tree order",
    opened.shownInMenu && opened.visible && opened.inWindow && opened.rows === opened.topics && opened.rows === 50 && opened.levels === "1,2,3" && opened.first === "Centre",
    JSON.stringify(opened));
  const gate = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll("#wb-outline-tree .wb-outline-row")];
    let inFrame = 0;
    const late = [];
    for (let i = 0; i < rows.length; i++) {
      const field = rows[i].firstChild;
      field.focus();
      field.value = `Edited ${i}`;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
      const el = document.querySelector(`.wb-object[data-id="${rows[i]._node.id}"] .wb-map-text`);
      if (el && el.textContent === `Edited ${i}`) inFrame++;
      else late.push(i);
    }
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 2500));
    const fresh = await apiJson(`/whiteboard/?board_id=${window.currentBoardId}`).catch(() => null);
    const saved = fresh ? (fresh.objects || []).filter((o) => /^Edited \d+$/.test(o.data?.content || "")).length : -1;
    return { inFrame, late: late.slice(0, 5), saved };
  });
  check("50 topics edited from the outline show on the canvas within a frame, and are saved",
    gate.inFrame === 50 && (gate.saved === 50 || gate.saved === -1), JSON.stringify(gate));
  // Enter adds after, Tab indents under the one above, Shift+Tab back out.
  const added = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll("#wb-outline-tree .wb-outline-row")];
    const leaf = rows.find((r) => r.getAttribute("aria-level") === "3");
    leaf.firstChild.focus();
    return leaf._node.id;
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  await page.keyboard.type("Added here");
  const afterEnter = await page.evaluate((leafId) => {
    const a = document.activeElement;
    const row = a.closest(".wb-outline-row");
    const rows = [...document.querySelectorAll("#wb-outline-tree .wb-outline-row")];
    const at = rows.indexOf(row);
    return {
      inOutline: Boolean(row), value: a.value, level: row?.getAttribute("aria-level"),
      prev: rows[at - 1]?._node.id === leafId, canvasEditing: Boolean(document.querySelector(".wb-map-text[contenteditable='true']")),
    };
  }, added);
  check("Enter adds a topic right after, typed in the outline, not the canvas",
    afterEnter.inOutline && afterEnter.value === "Added here" && afterEnter.level === "3" && afterEnter.prev && !afterEnter.canvasEditing,
    JSON.stringify(afterEnter));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);
  const indented = await page.evaluate((leafId) => {
    const row = document.activeElement.closest(".wb-outline-row");
    const node = row?._node;
    return { level: row?.getAttribute("aria-level"), parent: node?.parent_id === leafId, name: node?.data?.content };
  }, added);
  check("Tab makes it a child of the topic above, focus kept", indented.level === "4" && indented.parent && indented.name === "Added here", JSON.stringify(indented));
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(1500);
  const outdented = await page.evaluate((leafId) => {
    const row = document.activeElement.closest(".wb-outline-row");
    const rows = [...document.querySelectorAll("#wb-outline-tree .wb-outline-row")];
    const at = rows.indexOf(row);
    return { level: row?.getAttribute("aria-level"), after: rows[at - 1]?._node.id === leafId };
  }, added);
  check("Shift+Tab moves it back out, right after its old parent", outdented.level === "3" && outdented.after, JSON.stringify(outdented));
  // Emptied and Backspace: gone, the focus on the row above.
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(1500);
  const removed = await page.evaluate((leafId) => ({
    gone: !wbMapIndex().nodes.some((n) => n.data?.content === "Added here" || n.data?.content === ""),
    focusOn: document.activeElement.closest(".wb-outline-row")?._node.id === leafId,
    rows: document.querySelectorAll("#wb-outline-tree .wb-outline-row").length,
  }), added);
  check("Backspace on an empty topic removes it", removed.gone && removed.focusOn && removed.rows === 50, JSON.stringify(removed));
  // The canvas to the outline: a rename made on the map shows in its row.
  const back = await page.evaluate(async () => {
    const node = wbMapIndex().roots[0];
    node.data = { ...node.data, content: "Renamed on the canvas" };
    wbScheduleRender();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return document.querySelector("#wb-outline-tree .wb-outline-row").firstChild.value;
  });
  check("a change on the canvas shows in the outline", back === "Renamed on the canvas", back);
  await page.evaluate(() => document.querySelector("#wb-outline-tree .wb-outline-row:nth-child(3) input").focus());
  await page.keyboard.press("Escape");
  const esc = await page.evaluate(() => ({ active: document.activeElement?.id, sel: wbSelectedItem?.kind }));
  check("Escape hands the keys to the canvas with the topic selected", esc.active === "whiteboard-container" && esc.sel === "object", JSON.stringify(esc));
  const closed = await page.evaluate(async () => {
    document.getElementById("wb-outline-close").click();
    const hidden = document.getElementById("wb-map-outline").classList.contains("hidden");
    const pref = localStorage.getItem("wb-map-outline");
    const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Plain", type: "board" }) });
    wbOutlineToggle(true);
    await openWhiteboardBoard(b.id);
    await new Promise((r) => setTimeout(r, 600));
    return { hidden, pref, onBoard: !document.getElementById("wb-map-outline").classList.contains("hidden") };
  });
  check("the close button hides it, remembered, and a board never shows it", closed.hidden && closed.pref === "off" && !closed.onBoard, JSON.stringify(closed));
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
