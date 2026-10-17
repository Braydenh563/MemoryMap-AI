// B73 (INBOX 904): "Cant select on separate attachment nodes in the graph??"
// Notes with attached files, "Attachments" switched on in the graph options;
// click an attachment node and a document node the way a person does and
// record what changes: the popup, the selected set, the highlight, a toast.
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i += 1) {
      const entry = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Attachment probe note ${i} about trips and tickets` }) });
      const fd = new FormData();
      fd.append("file", new File([`file ${i}`], `ticket-${i}.txt`, { type: "text/plain" }));
      await apiJson(`/entries/${entry.id}/files`, { method: "POST", headers: authHeaders(), body: fd });
    }
    localStorage.setItem("graph-layout", "force");
    localStorage.setItem("graph-attachments", "true");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.fill("#lock-password", "testpassword123").catch(() => {});
  await page.click("#lock-submit").catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById("tab-btn-graph")?.click());
  await page.waitForFunction(() => window.__graphDebug && window.__graphDebug.nodes > 0, null, { timeout: 60000 });
  await page.evaluate(() => { const c = document.getElementById("graph-attachments"); if (c && !c.checked) { c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); } });
  for (let i = 0; i < 30; i++) {
    const t0 = await page.evaluate(() => window.__graphDebug.ticks);
    await page.waitForTimeout(1000);
    if ((await page.evaluate(() => window.__graphDebug.ticks)) === t0) break;
  }
  const info = await page.evaluate(() => {
    const t = window.__graphDebug.transform;
    const rect = document.getElementById("graph-canvas").getBoundingClientRect();
    const att = graphNodesRef.filter((n) => n.type === "attachment" && Number.isFinite(n.x));
    return { count: att.length, types: [...new Set(graphNodesRef.map((n) => n.type || "note"))], pts: att.map((n) => ({ id: n.id, x: rect.left + t.x + n.x * t.k, y: rect.top + t.y + n.y * t.k })) };
  });
  console.log("attachment nodes", info.count, "types", JSON.stringify(info.types));
  const state = () => page.evaluate(() => ({ popup: !document.getElementById("graph-popup").classList.contains("hidden"), selected: [...(gcTab.selected || [])], toast: document.querySelector(".toast")?.textContent?.slice(0, 80) || "", lightbox: !!document.querySelector(".lightbox"), active: gcTab.activeId ?? gcTab.focus ?? null }));
  for (const p of info.pts.slice(0, 2)) {
    console.log("before", p.id, JSON.stringify(await state()));
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(900);
    console.log("click", p.id, "->", JSON.stringify(await state()));
    await page.keyboard.down("Shift");
    await page.mouse.click(p.x, p.y);
    await page.keyboard.up("Shift");
    await page.waitForTimeout(500);
    console.log("shift-click", p.id, "->", JSON.stringify(await state()));
  }
  const note = await page.evaluate(() => {
    const t = window.__graphDebug.transform;
    const rect = document.getElementById("graph-canvas").getBoundingClientRect();
    const n = graphNodesRef.find((m) => !m.type || m.type === "note");
    return n ? { id: n.id, x: rect.left + t.x + n.x * t.k, y: rect.top + t.y + n.y * t.k } : null;
  });
  if (note) {
    await page.keyboard.down("Shift");
    await page.mouse.click(note.x, note.y);
    await page.keyboard.up("Shift");
    await page.waitForTimeout(500);
    console.log("shift-click note", note.id, "->", JSON.stringify(await state()));
  }
  await browser.close();
  console.log(errors);
})();
