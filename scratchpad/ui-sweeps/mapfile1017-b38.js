// B38 (INBOX 904): "Attaching a file or thing to a mind map node makes a node
// that I cant edit or even go to the thing attached." A map with a file node,
// a bookmark node, a document node; double-click and F2 on each, record what
// opens, what toasts and whether the label is editable.
const { openBoard, checker } = require("./wb1005-lib.js");
const { check } = checker();
(async () => {
  const { browser, page, ctx, errors, board } = await openBoard({ type: "map", title: "B38 map" });
  const made = await page.evaluate(async (bid) => {
    const entry = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "Holder note for a file" }) });
    const fd = new FormData();
    fd.append("file", new File(["hello world"], "plan.txt", { type: "text/plain" }));
    const up = await apiJson(`/entries/${entry.id}/files`, { method: "POST", headers: authHeaders(), body: fd });
    const att = (up.attachments || [])[0];
    const bm = await apiJson("/bookmarks", { method: "POST", body: JSON.stringify({ url: "https://example.org/x", title: "Example page" }) }).catch((e) => ({ err: String(e) }));
    const doc = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Doc one", content: "x" }) }).catch((e) => ({ err: String(e) }));
    const root = (await apiJson(`/whiteboard/boards/${bid}/tree`)).nodes?.[0];
    const mk = async (kind, refId) => apiJson(`/whiteboard/boards/${bid}/nodes`, { method: "POST", body: JSON.stringify({ kind, ref_id: refId, parent_id: root ? root.id : null }) }).catch((e) => ({ err: String(e) }));
    const nodes = { file: await mk("file", att?.id), link: await mk("link", bm.id), document: await mk("document", doc.id) };
    await openWhiteboardBoard(bid);
    await wbRefreshMapState?.();
    renderWhiteboardNow();
    return { att, bm: bm.id, doc: doc.id, root: root && root.id, nodes: Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, v.err || v.id])) };
  }, board.id);
  console.log("made", JSON.stringify(made));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__toasts = []; const t = window.toast; window.toast = function (m, ...a) { window.__toasts.push(String(m)); return t.apply(this, [m, ...a]); }; window.__opened = []; window.open = (...a) => { window.__opened.push(String(a[0])); return null; }; });
  for (const kind of ["file", "link", "document"]) {
    const id = made.nodes[kind];
    const info = await page.evaluate((id) => {
      const el = document.querySelector(`.wb-object[data-id="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: el.textContent.trim().slice(0, 60), cls: el.className.slice(0, 80) };
    }, id);
    console.log(kind, JSON.stringify(info));
    if (!info) continue;
    await page.mouse.dblclick(info.x, info.y);
    await page.waitForTimeout(700);
    const afterDbl = await page.evaluate(() => ({ toasts: window.__toasts.splice(0), opened: window.__opened.splice(0), lightbox: !!document.querySelector(".lightbox"), editing: !!document.querySelector(".wb-map-text[contenteditable='true']") }));
    await page.evaluate(() => document.querySelector(".lightbox .lightbox-close")?.click());
    await page.waitForTimeout(300);
    await page.evaluate((id) => { selectWbItem("object", id); }, id);
    await page.keyboard.press("Escape");
    await page.evaluate((id) => { selectWbItem("object", id); }, id);
    await page.keyboard.press("F2");
    await page.waitForTimeout(500);
    const dialog = await page.evaluate(() => !!document.querySelector("dialog[open], .modal-overlay:not(.hidden)"));
    let renamed = null;
    if (dialog) {
      console.log("dialog", await page.evaluate(() => { const i = document.querySelector("dialog[open] input, .modal-overlay:not(.hidden) input"); return i ? { v: i.value, focus: document.activeElement === i } : null; }));
      await page.keyboard.press("Control+a");
      await page.keyboard.type("My " + kind);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(900);
      renamed = await page.evaluate((id) => { const o = wbState.objects.find((x) => x.id === id); return [document.querySelector(`.wb-object[data-id="${id}"]`)?.textContent.trim().slice(0, 40), o.data.caption, wbMapLabel(o)]; }, id);
    }
    const afterF2 = await page.evaluate(() => ({ toasts: window.__toasts.splice(0), editing: !!document.querySelector(".wb-map-text[contenteditable='true']") }));
    afterF2.prompt = dialog; afterF2.renamed = renamed;
    console.log(kind, "dblclick", JSON.stringify(afterDbl), "F2", JSON.stringify(afterF2));
  }
  await browser.close();
  console.log(errors);
})();
