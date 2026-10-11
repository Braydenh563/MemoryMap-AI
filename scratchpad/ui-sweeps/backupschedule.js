// Settings, Data, Backups: the schedule line with its last success sits above
// the list, wraps inside the pane at 1440 and 390, and the newest row carries
// the Latest chip. Seeds two backups through the real route.
//
//   BASE=http://127.0.0.1:8814 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/backupschedule.js
const { boot } = require("./lib.js");

async function run(viewport, phone) {
  const { browser, page } = await boot({ viewport, hasTouch: phone, isMobile: phone, args: ["--disable-dev-shm-usage"] });
  await page.evaluate(async () => {
    await apiJson("/backups", { method: "POST" });
  });
  await page.evaluate(() => openSettingsModal("data"));
  await page.waitForSelector("#backup-schedule", { state: "attached", timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll("#backup-list li").length > 0 && document.getElementById("backup-schedule").textContent.length > 0, null, { timeout: 15000 });
  const out = await page.evaluate(() => {
    const line = document.getElementById("backup-schedule");
    line.scrollIntoView({ block: "center" });
    const r = line.getBoundingClientRect();
    const list = document.getElementById("backup-list");
    const cs = getComputedStyle(line);
    const pane = line.closest(".settings-pane, .modal-card, body");
    const first = list.querySelector("li");
    return {
      text: line.textContent,
      rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) },
      font: cs.fontSize, color: cs.color,
      insideViewport: r.left >= 0 && r.right <= document.documentElement.clientWidth,
      sideways: pane.scrollWidth > pane.clientWidth + 1,
      aboveList: r.bottom <= list.getBoundingClientRect().top + 1,
      rows: list.querySelectorAll("li").length,
      latestChips: list.querySelectorAll(".item-label").length,
      firstFacts: first && first.querySelector(".task-detail").textContent,
    };
  });
  console.log(phone ? "390" : "1440", JSON.stringify(out));
  await browser.close();
  return out;
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false);
  const b = await run({ width: 390, height: 844 }, true);
  const bad = [a, b].filter((o) => !o.insideViewport || o.sideways || !o.aboveList || o.rows < 1);
  console.log(bad.length ? "FAIL" : "OK");
  process.exit(bad.length ? 1 : 0);
})();
