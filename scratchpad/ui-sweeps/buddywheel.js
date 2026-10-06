// INBOX 674: a wheel (two-finger trackpad scroll) over the corner companion
// scrolls what is under it. Seeds notes, puts the pointer on #nm-buddy,
// wheels, and reports which scroller moved.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(async () => {
    for (let i = 0; i < 25; i++) await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Scroll test note ${i}\n\n` + "line ".repeat(80) }) });
  });
  await page.evaluate(() => { const b = document.getElementById("avatar-buddy"); b.value = "atlas"; b.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(2000);
  const buddy = await page.evaluate(() => {
    const b = document.getElementById("nm-buddy");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, hidden: getComputedStyle(b).display === "none" };
  });
  const scrollers = () => page.evaluate(() => [...document.querySelectorAll("*")]
    .filter((el) => el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))
    .map((el) => ({ id: el.id || el.className.toString().slice(0, 30), top: Math.round(el.scrollTop) }))
    .concat([{ id: "document", top: Math.round(document.scrollingElement.scrollTop) }]));
  const before = await scrollers();
  if (buddy && !buddy.hidden) {
    await page.mouse.move(buddy.x, buddy.y);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(600);
  }
  const after = await scrollers();
  const moved = after.filter((a) => (before.find((b) => b.id === a.id) || {}).top !== a.top);
  console.log(JSON.stringify({ buddy, moved }));
  await browser.close();
})();
