// Settings, Data, Backups: the schedule line with its last success sits above
// the list, wraps inside the pane at 1440 and 390, and the newest row carries
// the Latest chip. Seeds a backup through the real route. Then the desktop
// app's "Also copy each backup to" row (shown here by answering desktopShell):
// a folder that is not there is refused and the field goes back, a real one
// is kept, and the next backup's row says it was also copied there.
//
//   COPY_DIR=/path/to/an/existing/folder BASE=http://127.0.0.1:8814 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/backupschedule.js
const { boot } = require("./lib.js");

async function copyRow(page) {
  const dir = process.env.COPY_DIR;
  await page.waitForFunction(() => !document.getElementById("backup-copy-row").classList.contains("hidden"), null, { timeout: 15000 });
  const box = await page.evaluate(() => {
    const row = document.getElementById("backup-copy-row");
    row.scrollIntoView({ block: "center" });
    const r = row.getBoundingClientRect();
    const input = document.getElementById("pref-backup-copy-dir").getBoundingClientRect();
    const pane = row.closest(".settings-pane, .modal-card, body");
    return { left: Math.round(r.left), right: Math.round(r.right), height: Math.round(r.height), inputWidth: Math.round(input.width),
      insideViewport: r.left >= 0 && r.right <= document.documentElement.clientWidth, sideways: pane.scrollWidth > pane.clientWidth + 1 };
  });
  await page.fill("#pref-backup-copy-dir", "/definitely/not/a/folder");
  await page.press("#pref-backup-copy-dir", "Enter");
  await page.waitForTimeout(1500);
  const afterBad = await page.inputValue("#pref-backup-copy-dir");
  await page.fill("#pref-backup-copy-dir", dir);
  await page.press("#pref-backup-copy-dir", "Enter");
  await page.waitForTimeout(1500);
  const afterGood = await page.inputValue("#pref-backup-copy-dir");
  await page.click("#backup-now");
  await page.waitForFunction((d) => document.querySelector("#backup-list li .task-detail")?.textContent.includes(`also copied to ${d}`), dir, { timeout: 30000 });
  const facts = await page.evaluate(() => document.querySelector("#backup-list li .task-detail").textContent);
  await page.click("#pref-backup-copy-clear");
  await page.waitForTimeout(1200);
  return { box, revertedAfterBad: afterBad === "", keptGood: afterGood === dir, facts, cleared: (await page.inputValue("#pref-backup-copy-dir")) === "" };
}

async function run(viewport, phone) {
  const { browser, page } = await boot({ viewport, hasTouch: phone, isMobile: phone, args: ["--disable-dev-shm-usage"] });
  await page.evaluate(async () => {
    await apiJson("/backups", { method: "POST" });
  });
  await page.evaluate(() => { window.desktopShell = async () => true; });
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
  const copy = await copyRow(page);
  console.log(phone ? "390" : "1440", JSON.stringify(out));
  console.log(phone ? "390 copy" : "1440 copy", JSON.stringify(copy));
  out.copy = copy;
  await browser.close();
  return out;
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false);
  const b = await run({ width: 390, height: 844 }, true);
  const bad = [a, b].filter((o) => !o.insideViewport || o.sideways || !o.aboveList || o.rows < 1 || !o.copy.revertedAfterBad || !o.copy.keptGood || !o.copy.cleared || o.copy.box.sideways || !o.copy.box.insideViewport);
  console.log(bad.length ? "FAIL" : "OK");
  process.exit(bad.length ? 1 : 0);
})();
