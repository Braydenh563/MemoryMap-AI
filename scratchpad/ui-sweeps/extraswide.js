// Diagnostic: `errors.js` reports "settings/extras section scrolls sideways
// 496>492" at 820px. Which element is 4px too wide, and is it a row this
// session added (the Word export extra) or one that was already there?
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 820, height: 1000 } });
  await page.evaluate(async () => { await openSettingsModal("extras"); });
  await page.waitForTimeout(1800);
  const found = await page.evaluate(() => {
    const section = document.getElementById("settings-extras") ||
      document.getElementById("extras-list")?.closest("section, .settings-section");
    if (!section) return "no section";
    const frame = section.getBoundingClientRect();
    const over = [];
    for (const el of section.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > frame.right + 0.5) {
        over.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 40),
          text: (el.textContent || "").trim().slice(0, 40),
          right: Math.round(r.right),
          w: Math.round(r.width),
        });
      }
    }
    return {
      section: { w: Math.round(frame.width), scrollW: Math.round(section.scrollWidth), right: Math.round(frame.right) },
      rows: [...document.querySelectorAll("#extras-list > li")].map((li) => ({
        text: li.textContent.trim().slice(0, 34),
        w: Math.round(li.getBoundingClientRect().width),
        scrollW: Math.round(li.scrollWidth),
      })),
      over: over.slice(0, 8),
    };
  });
  console.log(JSON.stringify(found, null, 1));
  await browser.close();
})();
