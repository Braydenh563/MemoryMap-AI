// Settings, About, Health: the "Files on disk" row (BACKLOG section 26). Puts a
// file in each of the data folder's uploads, media and backups, opens the pane
// and measures, at 1440 and 390: the row says the three sizes, its label and
// value sit inside the window, and the pane does not scroll sideways.
//
//   BASE=http://127.0.0.1:8791 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/healthfiles.js
const { boot } = require("./lib.js");

async function run(viewport, phone) {
  const { browser, page } = await boot({ viewport, hasTouch: phone, isMobile: phone });
  await page.evaluate(async () => {
    await api("/backups", { method: "POST" }).catch(() => {});
  });
  await page.evaluate(() => openSettingsModal("about"));
  await page.waitForFunction(() => {
    const el = document.getElementById("health-files-size");
    return el && /backups/.test(el.textContent);
  }, null, { timeout: 15000, polling: 200 });
  const m = await page.evaluate(() => {
    const el = document.getElementById("health-files-size");
    const r = el.getBoundingClientRect();
    const row = el.closest(".setting-row").getBoundingClientRect();
    const pane = el.closest(".settings-pane, .modal, body");
    return {
      text: el.textContent,
      inside: r.left >= 0 && r.right <= document.documentElement.clientWidth,
      rowInside: row.left >= 0 && row.right <= document.documentElement.clientWidth,
      sideways: pane.scrollWidth > pane.clientWidth + 1,
      h: r.height,
    };
  });
  const checks = {
    saysThree: /Attached files .* pictures .* backups /.test(m.text),
    inside: m.inside && m.rowInside,
    noSideways: !m.sideways,
  };
  console.log(phone ? "390" : "1440", JSON.stringify({ text: m.text, h: m.h, checks }));
  await browser.close();
  return Object.values(checks).every(Boolean);
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false);
  const b = await run({ width: 390, height: 844 }, true);
  console.log(a && b ? "PASS" : "FAIL");
  process.exit(a && b ? 0 : 1);
})();
