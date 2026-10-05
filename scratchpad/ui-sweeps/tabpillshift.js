// **The top bar's tabs do not move when the selection does** (INBOX 539,
// the owner: "when I switch between tabs in the top bar, the pill element
// for the tabs shifts position slightly horizontally"). Clicks each tab and
// records every tab button's left edge and width, and the active marker's
// box; a tab or the bar that moves by more than 0.5px between selections is
// the shift the owner sees.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/tabpillshift.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  for (const width of [1440, 1280, 1024, 900, 700]) {
    const { browser, page } = await boot({ viewport: { width, height: 900 } });
    const tabs = await page.$$eval("#tab-bar [data-tab]", (els) => els.map((e) => e.dataset.tab));
    const snaps = [];
    for (const tab of tabs) {
      await page.click(`#tab-bar [data-tab="${tab}"]`);
      await page.waitForTimeout(700);
      snaps.push(await page.evaluate(() => {
        const bar = document.getElementById("tab-bar").getBoundingClientRect();
        const btns = [...document.querySelectorAll("#tab-bar [data-tab]")].map((b) => {
          const r = b.getBoundingClientRect();
          return [Math.round(r.left * 10) / 10, Math.round(r.width * 10) / 10];
        });
        const active = document.querySelector("#tab-bar [data-tab].active");
        const ar = active.getBoundingClientRect();
        const before = getComputedStyle(active, "::before");
        const after = getComputedStyle(active, "::after");
        return { bar: [Math.round(bar.left * 10) / 10, Math.round(bar.width * 10) / 10], btns, active: active.dataset.tab, fw: getComputedStyle(active).fontWeight, ls: getComputedStyle(active.querySelector(".tab-label") || active).letterSpacing, pseudo: [before.content, before.width, after.content, after.width] };
      }));
    }
    const base = snaps[0];
    let worst = 0;
    for (const s of snaps) {
      worst = Math.max(worst, Math.abs(s.bar[0] - base.bar[0]), Math.abs(s.bar[1] - base.bar[1]));
      s.btns.forEach((b, i) => { worst = Math.max(worst, Math.abs(b[0] - base.btns[i][0]), Math.abs(b[1] - base.btns[i][1])); });
    }
    const ok = worst <= 0.5;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${width}: largest move of the bar or a tab between selections ${worst}px`);
    if (!ok) for (const s of snaps) console.log("   ", s.active, "fw", s.fw, "bar", s.bar.join(","), "tabs", s.btns.map((b) => b.join("/")).join(" "));
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
