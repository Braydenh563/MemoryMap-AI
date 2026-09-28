// **Escape during a marquee or a lasso takes back the gesture, and only the
// gesture** (WHITEBOARD_PLAN "Placed from INBOX, 2026-09-23", the last row
// of the conventions checklist in agent-remaining/mapux2.md: "Escape during a
// lasso or marquee is the old behaviour ... not re-measured").
//
// What Figma, tldraw and Excalidraw do: a rectangle being dragged vanishes on
// Escape, the selection is what it was before the drag began, and the rest of
// the pointer's travel and its release select nothing. One key undoes one
// thing, the innermost.
//
// The board: three text boxes. A is selected by a click. Then, with Shift (so
// the drag adds to A rather than replacing it), a rectangle is dragged from
// bare canvas over B, Escape is pressed mid-drag, the pointer carries on over
// C and is released. Pass means: no rectangle after Escape, A alone selected
// after Escape and after the release. The lasso gets the same gesture.
//
//   BASE=http://127.0.0.1:8795 SCRATCH=/tmp/mm PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/wbmarqueeescape.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  const ids = await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Marquee escape " + Date.now() }) });
    await openWhiteboardBoard(b.id);
    const out = [];
    for (const [x, name] of [[100, "A"], [400, "B"], [700, "C"]]) {
      const o = await apiJson("/whiteboard/objects", {
        method: "POST",
        body: JSON.stringify({ kind: "text", board_id: b.id, x, y: 200, width: 160, height: 60, data: { content: name } }),
      });
      out.push(o.id);
    }
    await fetchWhiteboardState();
    renderWhiteboardNow();
    return out;
  });
  await page.waitForTimeout(600);
  const boxOf = async (id) => (await page.$(`.wb-object[data-id="${id}"]`)).boundingBox();
  const [a, b, c] = [await boxOf(ids[0]), await boxOf(ids[1]), await boxOf(ids[2])];
  const selected = () => page.evaluate(() => {
    const keys = new Set(wbMultiSelection);
    if (wbSelectedItem) keys.add(`${wbSelectedItem.kind}:${wbSelectedItem.id}`);
    return [...keys].sort();
  });
  const overlays = () => page.evaluate(() => document.querySelectorAll(".wb-marquee, .wb-lasso").length);
  const keyA = `object:${ids[0]}`;

  for (const tool of ["select", "lasso"]) {
    await page.evaluate(() => wbSelectToolRef("select"));
    await page.waitForTimeout(200);
    await page.mouse.click(a.x + a.width / 2, a.y + a.height / 2);
    await page.waitForTimeout(300);
    const before = await selected();
    if (tool === "lasso") {
      await page.evaluate(() => wbSelectToolRef("lasso"));
      await page.waitForTimeout(200);
    }
    // From bare canvas below and left of B, up over B: above the boxes is
    // where the selected item's context bar sits, and a press there is a
    // press on the bar.
    const sx = b.x - 40, sy = b.y + b.height + 80;
    if (!process.env.NOSHIFT) await page.keyboard.down("Shift");
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(sx + i * 30, sy - i * 16);
    const mid = { sel: await selected(), overlays: await overlays(), at: await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className.baseVal || e.className) : null; }, [sx, sy]), tool: await page.evaluate(() => window.currentTool) };
    await page.keyboard.up("Shift");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    const afterEsc = { sel: await selected(), overlays: await overlays() };
    // Carry on over C and let go.
    for (let i = 1; i <= 8; i++) await page.mouse.move(sx + 240 + i * 50, sy - 128 - i * 4);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const afterUp = { sel: await selected(), overlays: await overlays() };
    const tag = tool === "select" ? "marquee" : "lasso";
    check(`${tag}: the drag drew its rectangle`, mid.overlays > 0, `${mid.overlays} overlay(s) mid-drag, selected then ${mid.sel.join(",") || "nothing"}, pressed on ${mid.at}, tool ${mid.tool}`);
    check(`${tag}: Escape takes the rectangle away`, afterEsc.overlays === 0, `${afterEsc.overlays} overlay(s)`);
    check(`${tag}: and keeps the selection that was there before the drag`,
      JSON.stringify(afterEsc.sel) === JSON.stringify(before) && before.includes(keyA),
      `before ${before.join(",")}, after Escape ${afterEsc.sel.join(",") || "nothing"}`);
    check(`${tag}: the rest of the drag and its release select nothing more`,
      JSON.stringify(afterUp.sel) === JSON.stringify(before) && afterUp.overlays === 0,
      `after release ${afterUp.sel.join(",") || "nothing"}, ${afterUp.overlays} overlay(s)`);
    await page.evaluate(() => wbSelectToolRef("select"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  void c;
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
