// **A topic is renamed from the Library's index too** (the owner, 2026-10-10:
// "I cant rename a topic??"). Library, Contents, Group by Topic: F2 on the
// first topic heading opens a field in its place; a new name is saved
// (PUT /graph/topics/name) and the index redrawn with it; the found name is
// put back after. Pass: field true, renamed heading present, restored.
const { boot } = require("/home/user/MemoryMap-AI/scratchpad/ui-sweeps/lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => localStorage.setItem("contents-group", "topic"));
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(1500);
  await page.locator('[data-target="library-view-contents"]').first().click();
  await page.waitForTimeout(3000);
  const group = await page.evaluate(() => document.getElementById("contents-group").value);
  if (group !== "topic") {
    await page.selectOption("#contents-group", "topic");
    await page.waitForTimeout(2500);
  }
  const first = await page.evaluate(() => [...document.querySelectorAll("#contents-outline .contents-heading")].map((h) => ({ name: h.querySelector(".contents-heading-name").textContent, title: h.title })).find((h) => h.title));
  await page.locator("#contents-outline .contents-heading[title]").first().focus();
  await page.keyboard.press("F2");
  await page.waitForTimeout(300);
  const field = await page.evaluate(() => { const f = document.querySelector("#contents-outline .graph-topic-rename"); return f ? { value: f.value, focused: document.activeElement === f } : null; });
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Index topic");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  const names = await page.evaluate(() => [...document.querySelectorAll("#contents-outline .contents-heading-name")].map((n) => n.textContent));
  const ids = await page.evaluate(async () => (await apiJson("/graph/structure?topics=1")).topics.find((t) => t.name === "Index topic")?.ids);
  if (ids) await page.evaluate((ids) => apiJson("/graph/topics/name", { method: "PUT", body: JSON.stringify({ ids, name: "" }) }), ids);
  const restored = await page.evaluate(async () => !(await apiJson("/graph/structure?topics=1")).topics.some((t) => t.name === "Index topic"));
  console.log(JSON.stringify({ first, field, renamed: names.includes("Index topic"), restored, errors }));
  await browser.close();
})();
