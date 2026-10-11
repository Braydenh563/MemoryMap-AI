// A new topic added by the + button lands beside its parent in EVERY layout
// (owner screenshot, 2026-10-11: Timeline put it far right under "Tasks").
//   BASE=http://127.0.0.1:8837 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/maplayoutchild.js
const { boot } = require("./lib.js");
let bad = 0;
const check = (l, ok, d) => { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${l}  ${d || ""}`); };
const LAYOUTS = ["tree-right", "tree-left", "tree-both", "tree-down", "radial", "logic-right", "timeline", "fishbone", "tree-table", "free"];
(async () => {
  const { browser, page } = await boot();
  await page.waitForTimeout(1500);
  for (const pinned of [false, true]) for (const layout of LAYOUTS) {
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await page.click('[data-tab="library"]'); await page.waitForTimeout(500);
    await page.click('[data-target="library-view-whiteboard"]'); await page.waitForTimeout(700);
    await page.evaluate(() => document.getElementById("wb-boards-new-map").click()); await page.waitForTimeout(2500);
    await page.keyboard.press("Escape");
    const ids = await page.evaluate(async ({ layout, pinned }) => {
      let root = wbState.objects.find((o) => o.kind === "topic" && o.parent_id == null);
      if (!root) { await wbMapAddChild(null); root = wbState.objects.find((o) => o.kind === "topic" && o.parent_id == null); }
      const goal = await wbMapAddChild(root.id), tasks = await wbMapAddChild(root.id);
      const nt = await wbMapAddChild(goal.id);
      await wbMapAddChild(tasks.id);
      await wbMapSetLayout(layout);
      renderWhiteboardNow();
      if (pinned) {
        // dragged by hand, as the owner did: Goal up-left of the root, its child further out
        const o = wbState.objects.find((n) => n.id === goal.id), c = wbState.objects.find((n) => n.id === nt.id);
        o.x = -300; o.y = -120; o.data = { ...o.data, pinned: true }; await wbSaveObject(o);
        c.x = -600; c.y = -180; c.data = { ...c.data, pinned: true }; await wbSaveObject(c);
        renderWhiteboardNow();
      }
      return { nt: nt.id, goal: goal.id };
    }, { layout, pinned });
    await page.waitForTimeout(800);
    const measure = () => page.evaluate((id) => {
      const o = wbState.objects.find((n) => n.id === id), s = wbMapNodeSize(o);
      return { cx: o.x + s.w / 2, cy: o.y + s.h / 2, ids: wbState.objects.filter((n) => n.kind === "topic").map((n) => n.id) };
    }, ids.nt);
    const before = await measure();
    // the + button of New topic, by click
    const btn = page.locator(`[data-id="${ids.nt}"] .wb-map-add, #wb-object-${ids.nt} .wb-map-add`).first();
    let clicked = false;
    try { await page.evaluate((id) => { const o = wbState.objects.find((n) => n.id === id); wbSelectOnly?.(o); }, ids.nt); } catch {}
    try { await btn.dispatchEvent("click", { bubbles: true }, { timeout: 2000 }); clicked = true; } catch (e) { console.log("no + button found for", layout, String(e).slice(0, 80)); }
    await page.waitForTimeout(1200);
    const r = await page.evaluate(({ id, known }) => {
      const p = wbState.objects.find((n) => n.id === id), ps = wbMapNodeSize(p);
      const made = wbState.objects.find((n) => n.kind === "topic" && n.parent_id === id && !known.includes(n.id));
      if (!made) return null;
      const ms = wbMapNodeSize(made);
      return { dist: Math.round(Math.hypot(made.x + ms.w / 2 - (p.x + ps.w / 2), made.y + ms.h / 2 - (p.y + ps.h / 2))), made: [Math.round(made.x), Math.round(made.y)], par: [Math.round(p.x), Math.round(p.y)] };
    }, { id: ids.nt, known: before.ids });
    console.log(pinned ? "pinned" : "tidy", layout, clicked, JSON.stringify(r));
    check(`${pinned ? "dragged " : ""}${layout}: + under New topic lands within 450px of it`, !!r && r.dist < 450, r ? `dist=${r.dist}` : "no child made");
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
