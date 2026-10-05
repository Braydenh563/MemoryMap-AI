// The Library's Activity chip carries an "Export as CSV" strip (BACKLOG 115
// row 11). Measures, at 1440 and 390: the strip shows only on Activity, the
// button is inside the window and at least 28px tall (44 on a phone), the
// page does not scroll sideways, and pressing it fetches /audit/export.csv
// and the response is a CSV with the header row.
//
//   BASE=http://127.0.0.1:8791 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/activityexport.js
const { boot } = require("./lib.js");

async function run(viewport, phone) {
  const { browser, page } = await boot({ viewport, hasTouch: phone, isMobile: phone });
  await page.evaluate(async () => {
    await api("/entries", { method: "POST", body: JSON.stringify({ content: "activity export sweep" }) });
  });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(1200);
  const bar = "#library-activitybar";
  const before = await page.evaluate((b) => !document.querySelector(b).classList.contains("hidden"), bar);
  await page.evaluate(() => {
    const chip = [...document.querySelectorAll("#library-filters .library-chip")].find((c) => /^Activity/.test(c.textContent.trim()));
    chip.click();
  });
  await page.waitForTimeout(1200);
  const m = await page.evaluate((b) => {
    const el = document.querySelector(b);
    const btn = document.getElementById("library-activity-export");
    const r = btn.getBoundingClientRect();
    return {
      shown: !el.classList.contains("hidden"),
      btn: { x: r.x, y: r.y, w: r.width, h: r.height },
      vw: document.documentElement.clientWidth,
      sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  }, bar);
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/audit/export.csv"), { timeout: 8000 }).catch(() => null),
    page.click("#library-activity-export"),
  ]);
  const body = resp ? await page.evaluate(async () => (await api("/audit/export.csv")).text()) : "";
  const label = phone ? "390" : "1440";
  const floor = phone ? 44 : 28;
  const checks = {
    hiddenElsewhere: !before,
    shownOnActivity: m.shown,
    inside: m.btn.x >= 0 && m.btn.x + m.btn.w <= m.vw,
    tall: m.btn.h >= floor,
    noSideways: !m.sideways,
    fetched: !!resp && resp.status() === 200,
    csvHeader: body.startsWith("id,created_at,actor,action,entity_type,entity_id,detail,changed_fields"),
  };
  console.log(label, JSON.stringify({ btn: m.btn, ...checks, head: body.slice(0, 90) }));
  await browser.close();
  return Object.values(checks).every(Boolean);
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false);
  const b = await run({ width: 390, height: 844 }, true);
  console.log(a && b ? "PASS" : "FAIL");
  process.exit(a && b ? 0 : 1);
})();
