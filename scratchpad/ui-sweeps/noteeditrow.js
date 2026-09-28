// The note edit form's toolbar in one-row mode: one row, rest behind More.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({ viewport: { width: Number(process.env.W || 1440), height: 800 } });
  await page.evaluate(() => switchTab("notes"));
  await page.evaluate(() => window.showNotesSection && showNotesSection("browse"));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { editingId = Number(document.querySelector("#entry-list > li[data-id]").dataset.id); renderEntries(); });
  await page.waitForTimeout(1200);
  const read = () => page.evaluate(() => {
    const bar = document.querySelector(".note-edit-toolbar");
    if (!bar) return "no edit toolbar";
    const tops = new Set([...bar.children].filter((c) => c.getClientRects().length).map((c) => Math.round(c.getBoundingClientRect().top / 8)));
    return { mode: bar.dataset.toolbarMode || "wrap", wrap: getComputedStyle(bar).flexWrap, rows: tops.size, h: Math.round(bar.getBoundingClientRect().height), more: !bar.querySelector(".doc-toolbar-more")?.hidden, over: bar.querySelectorAll(".doc-toolbar-over").length };
  });
  await page.evaluate(() => { const bar = document.querySelector(".note-edit-toolbar"); if (bar?.classList.contains("is-collapsed")) bar.querySelector(".doc-toolbar-collapse")?.click(); });
  await page.waitForTimeout(400);
  console.log("before", JSON.stringify(await read()));
  await (await page.$(".note-edit-toolbar"))?.screenshot({ path: "/tmp/claude-0/-home-user-MemoryMap-AI/4bd07524-16e0-5360-b6c1-fb963db3a922/scratchpad/net.png" });
  await page.evaluate(() => document.querySelector(".note-edit-toolbar .doc-toolbar-layout")?.click());
  await page.waitForTimeout(500);
  console.log("row", JSON.stringify(await read()));
  await page.evaluate(() => document.querySelector(".note-edit-toolbar .doc-toolbar-more")?.click());
  await page.waitForTimeout(400);
  console.log("more open", JSON.stringify(await read()));
  await page.evaluate(() => document.querySelector(".note-edit-toolbar .doc-toolbar-layout")?.click());
  await page.waitForTimeout(400);
  console.log("back", JSON.stringify(await read()));
  await browser.close();
})();
