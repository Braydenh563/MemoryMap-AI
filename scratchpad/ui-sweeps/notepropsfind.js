// **A note's properties are findable** (the owner, 2026-10-10: "is it
// possible to add and customise the metadata a little more??"). Gives three
// notes `status: in progress` and one `status: done` (PUT /entries/{id}/
// properties), then: a card's value is a press that fills the filter with
// `prop:status="in progress"` and lists exactly those three; the graph's
// panel shows the note's properties, a value lights the three on the map, and
// Properties opens the sheet. Restores the notes' properties at the end.
// Pass: listed 3, lit 3, panelRows >= 1, sheet true, cardDelta (px) reported.
const { boot } = require("/home/user/MemoryMap-AI/scratchpad/ui-sweeps/lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(2500);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ids = await page.evaluate(async () => {
    const shown = [...document.querySelectorAll("#entry-list li[data-id]")].map((li) => Number(li.dataset.id));
    const picked = shown.slice(0, 4).map((id) => ({ id }));
    const saved = [];
    for (const [i, e] of picked.entries()) {
      const got = await apiJson(`/entries/${e.id}/properties`);
      saved.push({ id: e.id, properties: got.properties || {} });
      const full = await apiJson(`/entries/${e.id}`);
      await apiJson(`/entries/${e.id}/properties`, { method: "PUT", body: JSON.stringify({ properties: { ...(got.properties || {}), status: i < 3 ? "in progress" : "done" }, base_hash: full.content_hash || null }) });
    }
    return saved;
  });
  await page.evaluate(() => loadEntries());
  await page.waitForTimeout(2500);
  const id0 = ids[0].id;
  const card = await page.evaluate((id) => {
    const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
    const dl = li?.querySelector(".note-props");
    return { chips: dl ? dl.querySelectorAll(".chip").length : 0, dlH: dl ? Math.round(dl.getBoundingClientRect().height) : 0, text: dl?.textContent };
  }, id0);
  await page.locator(`#entry-list li[data-id="${id0}"] .note-props .chip`).first().scrollIntoViewIfNeeded();
  await page.locator(`#entry-list li[data-id="${id0}"] .note-props .chip`).first().click();
  await page.waitForTimeout(2500);
  const listed = await page.evaluate(() => ({ box: document.getElementById("note-search").value, ids: [...document.querySelectorAll("#entry-list li[data-id]")].map((li) => Number(li.dataset.id)) }));
  // The graph's panel.
  await page.evaluate(() => { const s = document.getElementById("note-search"); s.value = ""; noteSearch = ""; renderEntries(); });
  await page.evaluate(() => switchTab("graph"));
  await page.waitForTimeout(6000);
  const at = await page.evaluate((id) => { const n = gcTab.nodes.find((x) => x.id === id), t = gcTab.transform, b = gcTab.canvas.getBoundingClientRect(); return { x: b.left + t.applyX(n.x), y: b.top + t.applyY(n.y) }; }, id0);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(1500);
  const panel = await page.evaluate(() => { const box = document.getElementById("graph-popup-props"); return { rows: box.querySelectorAll("dt").length, chips: box.querySelectorAll(".chip").length, button: box.querySelector("button")?.textContent.trim() }; });
  await page.locator("#graph-popup-props .chip").first().click();
  await page.waitForTimeout(1200);
  const lit = await page.evaluate(() => (graphHighlightIds ? [...graphHighlightIds] : []));
  await page.locator("#graph-popup-props button").click();
  await page.waitForTimeout(1500);
  const sheet = await page.evaluate(() => Boolean([...document.querySelectorAll(".sheet-card, [role=dialog]")].find((el) => el.getClientRects().length && /Properties/.test(el.textContent))));
  // Restore.
  await page.evaluate(async (saved) => {
    for (const row of saved) {
      const full = await apiJson(`/entries/${row.id}`);
      await apiJson(`/entries/${row.id}/properties`, { method: "PUT", body: JSON.stringify({ properties: row.properties, base_hash: full.content_hash || null }) });
    }
  }, ids);
  console.log(JSON.stringify({ seeded: ids.map((r) => r.id), card, listed, panel, lit: lit.length, litMatch: ids.slice(0, 3).every((r) => lit.includes(r.id)), sheet, errors }));
  await browser.close();
})();
