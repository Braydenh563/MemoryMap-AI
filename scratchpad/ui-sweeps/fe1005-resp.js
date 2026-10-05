// fe1005: the audit's small responsive defects (FE-19), measured:
// the sidebar collapse toggle's left edge at 768, and whether the Library's
// sort select and view toggle overlap the kind chips at 390.
//   BASE=http://127.0.0.1:8842 WIDTH=768 node fe1005-resp.js
const { boot } = require("./lib.js");
(async () => {
  const width = Number(process.env.WIDTH || 768);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, hasTouch: width < 820, isMobile: width < 600 });
  const out = {};
  for (const tab of ["notes", "chat", "library"]) {
    await page.evaluate((t) => switchTab(t), tab).catch(() => {});
    await page.waitForTimeout(1800);
    out[tab] = await page.evaluate(() => {
      const shown = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      const toggles = [...document.querySelectorAll(".sidebar-collapse-toggle")]
        .filter(shown)
        .map((t) => {
          const r = t.getBoundingClientRect();
          return `${t.id || t.className.split(" ")[0]} x=${Math.round(r.left)} w=${Math.round(r.width)}`;
        });
      const overlaps = [];
      const lib = document.querySelector("#tab-library:not(.hidden)");
      if (lib) {
        const chips = [...lib.querySelectorAll(".library-kind-chips button, .library-filter-chips button, [data-library-kind]")].filter(shown);
        const controls = [...lib.querySelectorAll("select, .seg > button")].filter(shown);
        for (const c of controls) {
          const a = c.getBoundingClientRect();
          for (const k of chips) {
            const b = k.getBoundingClientRect();
            const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (x > 1 && y > 1) overlaps.push(`${c.id || c.className} over ${k.textContent.trim().slice(0, 12)} ${Math.round(x)}x${Math.round(y)}`);
          }
        }
      }
      return { toggles, overlaps };
    });
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
