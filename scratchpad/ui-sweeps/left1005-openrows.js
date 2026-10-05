// OPEN.md triage, 2026-10-05: the small measurements a row asks for before
// anyone decides. Prints numbers, judges nothing.
//   BASE=http://127.0.0.1:8846 VW=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/left1005-openrows.js
const { boot } = require("./lib.js");
const VW = Number(process.env.VW || 1440);
const VH = Number(process.env.VH || 900);

(async () => {
  const phone = VW < 600;
  const { browser, page } = await boot({ viewport: { width: VW, height: VH }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const out = {};
  // The page itself: sideways scroll, and the top bar's row count and overflow.
  out.page = await page.evaluate(() => {
    const bar = document.getElementById("top-bar") || document.querySelector("header");
    const r = bar?.getBoundingClientRect();
    const kids = bar ? [...bar.querySelectorAll("*")].filter((e) => e.offsetParent && e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.id || e.className).slice(0, 5) : [];
    return { sideways: document.documentElement.scrollWidth - innerWidth, barH: r ? +r.height.toFixed(1) : null, barScrollW: bar ? bar.scrollWidth - bar.clientWidth : null, pastRight: kids };
  });
  // The dashboard head.
  out.dashHead = await page.evaluate(async () => {
    await switchTab("dashboard");
    await new Promise((r) => setTimeout(r, 500));
    const h = document.querySelector(".dash-dock, .dash-head");
    if (!h) return null;
    const kids = [...h.children].filter((e) => e.offsetParent);
    const tops = new Set(kids.map((e) => Math.round(e.getBoundingClientRect().top)));
    return { h: +h.getBoundingClientRect().height.toFixed(1), rows: tops.size, scroll: h.scrollWidth - h.clientWidth };
  });
  // Two segmented controls' radii: the document AI verb and the graph layout.
  out.segments = await page.evaluate(async () => {
    const read = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const seg = el.querySelector("label, button") || el;
      return { track: getComputedStyle(el).borderRadius, segment: getComputedStyle(seg).borderRadius };
    };
    await switchTab("graph");
    await new Promise((r) => setTimeout(r, 600));
    const graph = read("#graph-layout");
    return { graph, doc: read("#doc-ai-verb") };
  });
  // Chat's export and delete: does a press at the centre reach the button?
  out.chatButtons = await page.evaluate(async () => {
    await switchTab("chat");
    await new Promise((r) => setTimeout(r, 500));
    return ["chat-export", "chat-delete"].map((id) => {
      const b = document.getElementById(id);
      if (!b || !b.offsetParent) return { id, shown: false };
      const r = b.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { id, reaches: at === b || b.contains(at), at: at?.tagName };
    });
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
