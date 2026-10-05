// **The document's Edit/Read segment sits in its track, and the dock row's
// controls share one centre line** (INBOX 568, the owner: "the document
// editor edit/read pill is overflowing at the bottom and those elements
// arent aligned"). Each segment button inside the segment's box (1px), and
// every control in the cluster centred within 1px of the segment's centre.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/docviewseg.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failed++; };
  for (const theme of ["dark", "light"]) {
    for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
      process.env.THEME = theme;
      const { browser, page } = await boot({ viewport: { width: w, height: h } });
      const doc = await page.evaluate(async () => apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Seg " + Date.now(), content: "# Hello\n\nText." }) }));
      await page.evaluate(async () => { await switchTab("documents"); });
      await page.waitForTimeout(1000);
      await page.evaluate(async (x) => { await openDocument(x); }, doc.id);
      await page.waitForTimeout(1200);
      const m = await page.evaluate(() => {
        const seg = document.getElementById("doc-view-seg");
        if (!seg || !seg.getBoundingClientRect().height) return null;
        const s = seg.getBoundingClientRect();
        const over = [...seg.querySelectorAll("button")].map((b) => b.getBoundingClientRect()).map((r) => Math.max(s.top - r.top, r.bottom - s.bottom, 0));
        const mid = (r) => (r.top + r.bottom) / 2;
        const cluster = seg.parentElement, row = cluster.parentElement;
        const pieces = [...cluster.children, ...row.children].filter((e) => e !== seg && e !== cluster);
        const others = pieces
          .map((e) => (e.matches("details") ? e.querySelector("summary") : e))
          .filter((e) => e && e.getBoundingClientRect().height > 0)
          .map((e) => ({ id: e.id || e.className.toString().split(" ")[0], d: Math.abs(mid(e.getBoundingClientRect()) - mid(s)) }));
        const seg2 = [...seg.children].map((b) => Math.abs(mid(b.getBoundingClientRect()) - mid(s)));
        others.push({ id: "seg buttons", d: Math.max(...seg2) });
        return { over: Math.max(...over), segH: s.height, others };
      });
      const tag = `${theme} ${w}`;
      if (!m) { check(false, `${tag}: segment not shown`); await browser.close(); continue; }
      check(m.over <= 1, `${tag}: buttons inside the segment (overflow ${m.over.toFixed(1)}px, seg ${m.segH.toFixed(1)}px)`);
      const worst = m.others.reduce((a, b) => (b.d > a.d ? b : a), { d: 0 });
      check(worst.d <= 1.5, `${tag}: the row's controls on one centre line (worst ${worst.id} ${worst.d.toFixed(1)}px)`);
      await browser.close();
    }
  }
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
