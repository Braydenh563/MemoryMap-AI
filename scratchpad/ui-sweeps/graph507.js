// WORLD_CLASS_PLAN 507 step 4: the Graph's View folded into the gear's panel.
//   BASE=http://127.0.0.1:8893 SCRATCH=/tmp/s507 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   [VIEWPORT=390x844] [THEME=dark] node scratchpad/ui-sweeps/graph507.js
const { boot } = require("./lib.js");
const [W, H] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const phone = W < 600;
(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const out = [];
  const log = (k, v) => out.push(`${k}: ${JSON.stringify(v)}`);
  await page.evaluate(() => document.getElementById("tab-btn-graph")?.click());
  await page.waitForTimeout(2500);
  log(
    "dock",
    await page.evaluate(() => {
      const d = document.querySelector('[data-dock-name="graph"]');
      const vis = [...d.querySelectorAll("button,summary,input,select")].filter((e) => e.offsetParent && !e.closest(".dock-menu-list") && !e.closest(".select-shell"));
      return {
        viewMenu: !!document.getElementById("graph-view-menu"),
        h: Math.round(d.getBoundingClientRect().height),
        controls: vis.map((e) => e.id || e.tagName),
        count: vis.length,
        scrollW: d.scrollWidth,
        clientW: d.clientWidth,
        zones: [...d.children].filter((c) => c.offsetParent).map((c) => c.className.split(" ").find((x) => x.startsWith("dock-"))),
      };
    })
  );
  const gear = "#graph-options-toggle";
  // The panel's and Trace's open state persist (and are mirrored to the
  // server), so start from shut, whatever the last run left.
  await page.evaluate(() => {
    if (!document.getElementById("graph-trace").classList.contains("hidden")) document.getElementById("graph-trace-toggle").click();
  });
  await page.evaluate(() => {
    const p = document.getElementById("graph-options");
    if (!p.classList.contains("hidden") || document.querySelector(".graph-controls-body")) document.getElementById("graph-options-toggle").click();
  });
  await page.waitForTimeout(300);
  // Open with the keyboard
  await page.focus(gear);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  log(
    "panel",
    await page.evaluate(() => {
      const p = document.getElementById("graph-options") || document.querySelector(".graph-controls-body");
      const host = document.querySelector(".graph-controls-body") || document.getElementById("graph-options");
      const r = host.getBoundingClientRect();
      const first = document.getElementById("graph-view-section").getBoundingClientRect();
      const sc = host.closest(".graph-options") || host;
      return {
        hidden: p.classList.contains("hidden"),
        sheet: !!document.querySelector(".graph-controls-body"),
        box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        scrollH: sc.scrollHeight,
        clientH: sc.clientHeight,
        viewSection: [Math.round(first.x), Math.round(first.y), Math.round(first.width), Math.round(first.height)],
        rows: [...document.querySelectorAll("#graph-view-section .graph-option-row, #graph-view-section .graph-view-tools")].map((e) => {
          const b = e.getBoundingClientRect();
          return `${e.querySelector("label,span")?.textContent.trim().slice(0, 12) || e.firstElementChild.id}:${Math.round(b.height)}h overflowX=${e.scrollWidth > e.clientWidth}`;
        }),
        fontSizes: [...document.querySelectorAll("#graph-view-section button,#graph-view-section select,#graph-view-section label")].map((e) => getComputedStyle(e).fontSize).filter((v, i, a) => a.indexOf(v) === i),
      };
    })
  );
  // Layout by keyboard (INBOX 670: a list now): open it, walk to Tree, Enter
  await page.focus("#graph-layout ~ .select-opener");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  log("layout after Tree", await page.evaluate(() => ({ checked: document.getElementById("graph-layout").value, saved: localStorage.getItem("graph-layout") })));
  await page.selectOption("#graph-layout", "force");
  await page.waitForTimeout(400);
  // Colour and size selects
  for (const [id, value] of [["graph-colour", "kind"], ["graph-size", "length"]]) {
    await page.evaluate(([i, v]) => {
      const s = document.getElementById(i);
      s.value = v;
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }, [id, value]);
    await page.waitForTimeout(300);
    log(id, await page.evaluate((i) => ({ value: document.getElementById(i).value, saved: localStorage.getItem(i), name: document.getElementById(i).labels?.[0]?.textContent }), id));
  }
  // Legend toggle
  await page.click("#graph-legend-toggle");
  await page.waitForTimeout(200);
  log("legend after click", await page.evaluate(() => ({ collapsed: document.querySelector(".graph-legend-row").classList.contains("legend-collapsed"), label: document.getElementById("graph-legend-toggle").getAttribute("aria-label"), expanded: document.getElementById("graph-legend-toggle").getAttribute("aria-expanded") })));
  await page.click("#graph-legend-toggle");
  // Trace
  await page.click("#graph-trace-toggle");
  await page.waitForTimeout(500);
  log(
    "trace",
    await page.evaluate(() => ({
      stripOpen: !document.getElementById("graph-trace").classList.contains("hidden"),
      toggleOn: document.getElementById("graph-trace-toggle").classList.contains("is-on"),
      panelHidden: document.getElementById("graph-options").classList.contains("hidden"),
      sheetOpen: !!document.querySelector(".graph-controls-body"),
    }))
  );
  // Reopen the panel and show the trace toggle's on state
  if (!phone) {
    await page.click(gear);
    await page.waitForTimeout(400);
    log("trace toggle in panel", await page.evaluate(() => { const b = document.getElementById("graph-trace-toggle"); const cs = getComputedStyle(b); return { on: b.classList.contains("is-on"), bg: cs.backgroundColor, fg: cs.color, expanded: b.getAttribute("aria-expanded") }; }));
    await page.screenshot({ path: `${process.env.SCRATCH || "."}/graph507-${W}${process.env.THEME === "dark" ? "-dark" : ""}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    log("after Escape", await page.evaluate(() => ({ panelHidden: document.getElementById("graph-options").classList.contains("hidden"), focus: document.activeElement?.id })));
  } else {
    await page.screenshot({ path: `${process.env.SCRATCH || "."}/graph507-${W}${process.env.THEME === "dark" ? "-dark" : ""}.png` });
  }
  console.log(out.join("\n"));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
