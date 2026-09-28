// Note cards: the gap above the metadata row when the note has a file
// attachment, and the attachment chip's buttons.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  const id = await page.evaluate(async () => {
    const e = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "CAB432 LLM agents lecture slides", category: "Study", tags: [] }) });
    const form = new FormData();
    form.append("file", new File(["lecture"], "cab432_lecture_agents.pdf", { type: "application/pdf" }));
    await fetch(`/entries/${e.id}/files`, { method: "POST", headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() }, body: form });
    return e.id;
  });
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("browse"); notesViewMode = "cards"; loadEntries(); });
  await page.waitForTimeout(2500);
  const out = await page.evaluate((id) => {
    const li = document.querySelector(`#entry-list > li[data-id="${id}"]`);
    if (!li) return "no card";
    const meta = li.querySelector(":scope > .entry-meta");
    const card = li.querySelector(".entry-links");
    const cb = card?.getBoundingClientRect();
    const btns = [...(card?.querySelectorAll(".unlink") || [])].map((b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return { cls: b.className, w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderRadius, bg: cs.backgroundColor }; });
    return { cardPath: card ? [card.parentElement.className, card.className].join(" > ") : null, cardH: cb && Math.round(cb.height), gap: meta && cb ? Math.round(meta.getBoundingClientRect().top - cb.bottom) : null, btns };
  }, id);
  console.log(JSON.stringify(out));
  await page.hover(`#entry-list > li[data-id="${id}"] .entry-links .chip, #entry-list > li[data-id="${id}"] .entry-links > *`).catch(() => null);
  await page.waitForTimeout(300);
  await (await page.$(`#entry-list > li[data-id="${id}"]`))?.screenshot({ path: process.env.OUT_PNG });
  await browser.close();
})();
