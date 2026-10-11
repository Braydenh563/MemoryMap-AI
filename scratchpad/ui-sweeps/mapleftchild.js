// A new child of a node on a LEFT branch lands beside its parent, growing left,
// under its last child, not far away on the right (owner screenshot, 2026-10-11).
//   BASE=http://127.0.0.1:8811 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapleftchild.js
const { boot } = require("./lib.js");
let bad = 0;
const check = (l, ok, d) => { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${l}  ${d || ""}`); };
async function newBoard(page, name) {
  await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
  await page.click('[data-tab="library"]'); await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]'); await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById("wb-boards-new-map").click()); await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}
(async () => {
  const { browser, page } = await boot();
  for (const layout of ["free", "free+sibling", "tree-both", "tree-both+sibling", "radial"]) {
    await newBoard(page, `Left ${layout} ${Date.now()}`);
    const r = await page.evaluate(async (layout) => {
      const withSib = layout.includes("+"), base = layout.split("+")[0];
      const set = async (n, x, y) => { n.x = x; n.y = y; await wbSaveObject(n); };
      const nodes = () => wbState.objects.filter((o) => o.kind === "topic");
      let root = nodes().find((n) => n.parent_id == null) || await wbMapAddChild(null);
      await wbMapSetLayout("free");
      layout = layout.split("+")[0] === layout ? layout : layout;
      await set(root, 0, 0);
      const goal = await wbMapAddChild(root.id); await set(goal, -300, -120);
      const nt = await wbMapAddChild(goal.id); await set(nt, -600, -180);
      const tasks = await wbMapAddChild(root.id); await set(tasks, 300, 120);
      const t2 = await wbMapAddChild(tasks.id); await set(t2, 600, 160);
      const sibling = withSib ? await wbMapAddChild(nt.id) : null;
      if (sibling) await set(sibling, -900, -60);
      if (base !== "free") await wbMapSetLayout(base);
      renderWhiteboardNow();
      const pre = [goal, nt, tasks, ...(sibling ? [sibling] : [])].map((n) => [n.data.content, Math.round(n.x), Math.round(n.y)]);
      const made = await wbMapAddChild(nt.id);
      const par = wbState.objects.find((o) => o.id === nt.id);
      const sz = (n) => wbMapNodeSize(n);
      const rootNode = wbState.objects.find((o) => o.id === root.id);
      const dx = (made.x + sz(made).w / 2) - (par.x + sz(par).w / 2), dy = made.y - par.y;
      return { layout, pre, par: [Math.round(par.x), Math.round(par.y)], made: [Math.round(made.x), Math.round(made.y)],
        dist: Math.round(Math.hypot(dx, dy)), leftOfParent: made.x + sz(made).w / 2 < par.x + sz(par).w / 2 && made.x < rootNode.x, root: Math.round(root.x) };
    }, layout);
    console.log(JSON.stringify(r));
    check(`${layout}: new child within 400px of parent`, r.dist < 400, `dist=${r.dist}`);
    if (layout !== "radial") check(`${layout}: new child is left of its left-side parent`, r.leftOfParent, `made=${r.made} parent=${r.par}`);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
