// **The trace strip closes like every other popup** (INBOX 421 d, the owner:
// "there's no 'x' close button on the trace popup row in the graph").
//
// Three notes, the graph, Trace on, two ends picked so the result row shows.
// Pass means: the strip carries an icon-only X (`.ghost.small.icon-only`,
// `ph-x`, an accessible name) at its end; a real click on it closes the strip
// and the result row and leaves trace mode; Escape does the same; both at
// 1440 and 390, light and dark (THEME=dark).
//
//   BASE=http://127.0.0.1:8793 SCRATCH=/tmp/mm PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphtraceclose.js
const { boot } = require("./lib.js");

const SIZES = (process.env.SIZES || "1440x900,390x844").split(",").map((s) => s.split("x").map(Number));
let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function openTrace(page) {
  await page.evaluate(async () => {
    switchTab("graph");
    await new Promise((r) => setTimeout(r, 1500));
    setTracePanelOpen(true);
  });
  await page.waitForTimeout(400);
  return page.evaluate(async () => {
    const nodes = graphNodesRef || [];
    if (nodes.length >= 2) {
      pickTraceEnd(nodes[0]);
      pickTraceEnd(nodes[1]);
    }
    await new Promise((r) => setTimeout(r, 1200));
    return nodes.length;
  });
}

function state() {
  const strip = document.getElementById("graph-trace");
  const result = document.getElementById("graph-trace-result");
  const x = strip.querySelector("button .ph-x")?.closest("button");
  const r = x?.getBoundingClientRect();
  const s = strip.getBoundingClientRect();
  return {
    strip: !strip.classList.contains("hidden"),
    result: !result.classList.contains("hidden"),
    x: x ? { name: x.getAttribute("aria-label") || "", title: x.title, iconOnly: x.classList.contains("icon-only"),
      last: strip.lastElementChild === x, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2,
      inside: r.left >= s.left && r.right <= s.right + 0.5 && r.top >= s.top && r.bottom <= s.bottom + 0.5 } : null,
  };
}

(async () => {
  for (const [w, h] of SIZES) {
    const touch = w < 600;
    const { browser, page } = await boot({ viewport: { width: w, height: h }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
    try {
      await page.evaluate(async () => {
        for (const content of ["Trace alpha links to [[Trace beta]]", "Trace beta links to [[Trace gamma]]", "Trace gamma closes the loop"]) {
          await apiJson("/entries", { method: "POST", body: JSON.stringify({ content }) }).catch(() => null);
        }
      });
      const n = await openTrace(page);
      const a = await page.evaluate(state);
      check(`${w}: the trace strip has an X at its end`, a.strip && a.x && a.x.iconOnly && a.x.last && a.x.name && a.x.inside,
        a.x ? `name "${a.x.name}", ${a.x.w.toFixed(0)}x${a.x.h.toFixed(0)}, last ${a.x.last}, inside ${a.x.inside} (${n} notes)` : `no X (${n} notes)`);
      if (a.x) {
        await page.mouse.click(a.x.cx, a.x.cy);
        await page.waitForTimeout(300);
        const b = await page.evaluate(state);
        check(`${w}: a click on the X closes the strip and its result`, !b.strip && !b.result, `strip ${b.strip}, result ${b.result}`);
      }
      await openTrace(page);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const c = await page.evaluate(state);
      check(`${w}: Escape closes the strip and its result`, !c.strip && !c.result, `strip ${c.strip}, result ${c.result}`);
      await openTrace(page);
      await page.screenshot({ path: `${process.env.SCRATCH || "."}/shots/graphtraceclose-${w}-${process.env.THEME || "light"}.png` });
    } finally {
      await browser.close();
    }
  }
  console.log(failures ? `${failures} failed` : "all passed");
  process.exit(failures ? 1 : 0);
})();
