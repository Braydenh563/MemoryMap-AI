// **Every Settings section with three or more groups opens with its index
// strip, under its title** (INBOX 541, the owner: "some of the settings
// section navigation rows are at the bottom and some dont have any at all").
// Per section: the strip's place among the pane's visible children (must be
// in the first two) and its link count (must equal the group heads).
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/settingsindex.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const names = await page.evaluate(() => [...document.querySelectorAll("#settings-modal .settings-section")].map((s) => s.id.replace("settings-", "")));
  for (const name of names) {
    await page.evaluate(async (n) => { await openSettingsModal(n); }, name);
    await page.waitForTimeout(1100);
    const r = await page.evaluate((n) => {
      const pane = document.getElementById(`settings-${n}`);
      const heads = settingsIndexHeads(pane).length;
      const nav = pane.querySelector(":scope > .settings-index");
      const kids = [...pane.children].filter((c) => c.getClientRects().length);
      return { heads, links: nav ? nav.querySelectorAll(".settings-index-link").length : 0, at: nav ? kids.indexOf(nav) : -1 };
    }, name);
    const ok = r.heads < 3 ? r.links === 0 : r.links === r.heads && r.at >= 0 && r.at <= 1;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${r.heads} heads, strip of ${r.links} at child ${r.at}`);
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
