// **A note's topic, app wide** (the owner, 2026-10-10: "Should topics from
// the graph be more integrated app wide??"). On the notebook in the data dir:
// the Notes list's cards carry a topic chip (`.chip.topic`); pressing one
// opens the Graph under Colour: Topic with that topic's card and its notes
// lit; a member's panel shows the topic row whose pencil opens a rename field
// in place (Escape keeps the name); a plain click on a plate opens the card.
// Pass: chips > 0, card true, lit = topic size, panelRow true, field true,
// kept true, plateCard true.
const { boot } = require("/home/user/MemoryMap-AI/scratchpad/ui-sweeps/lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => localStorage.setItem("graph-colour", "category"));
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(4000);
  const chips = await page.evaluate(() => [...document.querySelectorAll("#entry-list .chip.topic")].map((c) => c.textContent.trim()));
  await page.locator("#entry-list .chip.topic").first().click();
  await page.waitForTimeout(7000);
  const opened = await page.evaluate(() => ({
    tab: document.querySelector(".tab-btn.active, [role=tab][aria-selected=true]")?.textContent?.trim(),
    colour: document.getElementById("graph-colour").value,
    card: !document.getElementById("graph-topic").classList.contains("hidden"),
    cardName: document.querySelector("#graph-topic strong")?.textContent,
    lit: graphHighlightIds ? graphHighlightIds.size : 0,
  }));
  // A member's panel.
  const member = await page.evaluate(() => {
    const id = [...graphHighlightIds][0], n = gcTab.nodes.find((x) => x.id === id), t = gcTab.transform, box = gcTab.canvas.getBoundingClientRect();
    return { x: box.left + t.applyX(n.x), y: box.top + t.applyY(n.y) };
  });
  await page.mouse.click(member.x, member.y);
  await page.waitForTimeout(1500);
  const panel = await page.evaluate(() => { const row = document.getElementById("graph-popup-topic"); return { panelRow: row && !row.classList.contains("hidden"), text: row?.textContent.trim() }; });
  await page.locator("#graph-popup-topic button").click();
  await page.waitForTimeout(300);
  const field = await page.evaluate(() => { const f = document.querySelector("#graph-popup-topic .graph-topic-rename"); return { field: Boolean(f), focused: document.activeElement === f, value: f?.value }; });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const kept = await page.evaluate(() => ({ kept: !document.querySelector(".graph-topic-rename") && !document.querySelector("#graph-popup-topic .chip").classList.contains("hidden"), text: document.getElementById("graph-popup-topic").textContent.trim() }));
  await page.evaluate(() => closeGraphPopup());
  await page.evaluate(() => gcHideTopic());
  const plate = await page.evaluate(() => { const s = gcTab, t = s.transform, p = s.topicPlates[0], box = s.canvas.getBoundingClientRect(); return { x: box.left + t.applyX((p.left + p.right) / 2), y: box.top + t.applyY((p.top + p.bottom) / 2) }; });
  await page.mouse.click(plate.x, plate.y);
  await page.waitForTimeout(500);
  const plateCard = await page.evaluate(() => !document.getElementById("graph-topic").classList.contains("hidden"));
  console.log(JSON.stringify({ chips: chips.length, firstChip: chips[0], opened, panel, field, kept, plateCard, errors }));
  await browser.close();
})();
