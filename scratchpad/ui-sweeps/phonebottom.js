// The foot of a phone screen (INBOX 430): what is fixed at the bottom, its
// boxes, and the gap between the tab bar and anything under or over it, on
// each tab scrolled to the end. Shots to scratchpad/shots/phone430/.
//   TAG=before node scratchpad/ui-sweeps/phonebottom.js
const path = require("path");
const { boot } = require("./lib.js");
const TAG = process.env.TAG || "after";
(async () => {
  const { page, browser } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  //: A run in the session, as a background pass leaves one: the status bar's
  //: activity item and the monitor are what it brings.
  await page.evaluate(() => {
    const run = addAgentRun({ kind: "agent", name: "Tidy tags" });
    endAgentRun(run, { state: "done" });
    setAgentMonitorVisible(false);
  });
  for (const tab of ["dashboard", "notes", "library"]) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("*")) {
        if (el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight;
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const fixed = [...document.querySelectorAll("body *")].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return false;
        const r = el.getBoundingClientRect();
        return r.height > 8 && r.width > 100 && r.bottom > innerHeight - 200 && r.top < innerHeight;
      }).map((el) => {
        const r = el.getBoundingClientRect();
        return { el: el.id || el.className.toString().split(" ")[0], top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
      });
      const dock = document.getElementById("phone-tab-dock");
      const d = dock ? dock.getBoundingClientRect() : null;
      const sb = document.getElementById("status-bar");
      const sr = sb && sb.getClientRects().length ? sb.getBoundingClientRect() : null;
      const act = document.getElementById("status-activity");
      return {
        h: innerHeight,
        dock: d ? [Math.round(d.top), Math.round(d.bottom)] : null,
        statusBar: sr ? [Math.round(sr.top), Math.round(sr.bottom), getComputedStyle(sb).position] : null,
        activityShown: Boolean(act && act.getClientRects().length && !act.closest(".hidden")),
        more: document.querySelector(".phone-tab-more")?.textContent.trim().replace(/\s+/g, " "),
        fixed,
      };
    });
    console.log(tab, JSON.stringify(m));
    await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `bottom-${TAG}-${tab}.png`) });
  }
  //: The bar that still comes back on a phone (a running task), with the tab
  //: bar receded as it is at the end of a scrolled page: no gap between them.
  const gap = await page.evaluate(async () => {
    const task = document.getElementById("status-task");
    task?.classList.remove("hidden", "status-slot-off");
    const dock = document.getElementById("phone-tab-dock");
    dock.setAttribute("data-receded", "");
    await new Promise((r) => setTimeout(r, 600));
    const s = document.getElementById("status-bar").getBoundingClientRect();
    const d = dock.getBoundingClientRect();
    return { statusBottom: Math.round(s.bottom), dockTop: Math.round(d.top), gap: Math.round(d.top - s.bottom) };
  });
  console.log(`${Math.abs(gap.gap) <= 1 ? "ok  " : "FAIL"} status bar meets the receded tab bar: ${JSON.stringify(gap)}`);
  const sheet = await page.evaluate(async () => {
    document.getElementById("phone-tab-dock").removeAttribute("data-receded");
    document.getElementById("phone-more-btn").click();
    await new Promise((r) => setTimeout(r, 400));
    return [...document.querySelectorAll(".sheet-overlay .sheet-row")].map((r) => r.textContent.trim());
  });
  console.log(`${sheet.some((t) => /^Agent activity\d+$/.test(t)) ? "ok  " : "FAIL"} More holds the runs: ${sheet.join(" | ")}`);
  await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `bottom-${TAG}-more.png`) });
  await browser.close();
})();
