// perf2-1005 (audit FE-19): the document sidebar's tab strip against its
// collapse toggle, at a width: no tab cut or scrolled, none under the toggle,
// and where the strip drops below the toggle, the gap between them.
//   BASE=http://127.0.0.1:8859 WIDTH=1024 [THEME=dark] node perf2-1005-docside.js
const { boot } = require("./lib.js");
(async () => {
  const width = Number(process.env.WIDTH || 1024);
  const { browser, page } = await boot({ viewport: { width, height: 768 } });
  const out = await page.evaluate(async () => {
    await ensureModule("library");
    const res = await api("/documents", { method: "POST", body: JSON.stringify({ title: "perf2 side", content: "# One\n\nWords.\n" }) });
    await switchTab("documents");
    await openDocument((await res.json()).id);
    await new Promise((r) => setTimeout(r, 1500));
    const side = document.getElementById("doc-sidebar");
    const strip = document.getElementById("doc-sidebar-tabs");
    const toggle = side.querySelector(".sidebar-collapse-toggle");
    const s = strip.getBoundingClientRect();
    const t = toggle.getBoundingClientRect();
    const tabs = [...strip.querySelectorAll('[role="tab"]')].map((b) => b.getBoundingClientRect());
    const under = tabs.some((r) => r.right > t.left && r.left < t.right && r.bottom > t.top && r.top < t.bottom);
    return {
      side: Math.round(side.getBoundingClientRect().width),
      fits: strip.scrollWidth <= strip.clientWidth,
      under,
      below: s.top >= t.bottom - 0.5,
      gap: Math.round(s.top - t.bottom),
      lastRight: Math.round(Math.max(...tabs.map((r) => r.right)) - side.getBoundingClientRect().left),
    };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
