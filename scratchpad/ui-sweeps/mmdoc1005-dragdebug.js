// FEAT-02 debug: mapstrip.js's branch drag after three quick adds.
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot();
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  const ids = await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Drag debug", type: "map", layout: "tree-right" }) });
    await openWhiteboardBoard(b.id);
    await apiJson(`/whiteboard/boards/${b.id}/nodes`, { method: "POST", body: JSON.stringify({ kind: "topic", text: "Root" }) });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    const root = wbMapIndex().roots[0];
    const a = await wbMapAddChild(root.id);
    const bb = await wbMapAddChild(root.id);
    const kid = await wbMapAddChild(a.id);
    return { root: root.id, a: a.id, b: bb.id, kid: kid.id };
  });
  await page.waitForTimeout(3600);
  await page.keyboard.press("Escape");
  const out = await page.evaluate((ids) => {
    const objs = wbState.objects;
    const dup = objs.length - new Set(objs.map((o) => o.id)).size;
    const el = document.querySelector(`.wb-object[data-id="${ids.a}"]`);
    const datum = el.__data__;
    const row = objs.find((o) => o.id === ids.a);
    const i = wbMapIndex();
    const sub = wbMapSubtree(i, ids.a).map((o) => o.id);
    const kidEls = document.querySelectorAll(`.wb-object[data-id="${ids.kid}"]`).length;
    const kidRow = objs.find((o) => o.id === ids.kid);
    const kidEl = document.querySelector(`.wb-object[data-id="${ids.kid}"]`);
    return { ids, dup, sameDatum: datum === row, sub, kidEls, kidDatumSame: kidEl?.__data__ === kidRow, kidParent: kidRow?.parent_id,
      pos: [ids.root, ids.a, ids.b, ids.kid].map((id) => { const o = objs.find((x) => x.id === id); const e = document.querySelector(`.wb-object[data-id="${id}"]`); return [o.x, o.y, o.height, e?.style.transform]; }), negatives: objs.filter((o) => o.id < 0).length, sel: wbSelectedItem, multi: [...wbMultiSelection] };
  }, ids);
  console.log(JSON.stringify(out));
  await browser.close();
})();
