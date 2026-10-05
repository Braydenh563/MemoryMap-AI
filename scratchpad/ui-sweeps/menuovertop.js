// **A note's menu is above the back-to-top button** (INBOX 583, the owner:
// "note popup menus are behind the back to top button"). Scroll the notes
// list so the button shows, open the last visible note's menu, and where the
// two overlap the menu must be on top (elementFromPoint).
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/menuovertop.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failed++; };
  for (const theme of ["dark", "light"]) {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      process.env.THEME = theme;
      const { browser, page } = await boot({ viewport: { width: w, height: h } });
      await page.click('[data-tab="notes"]').catch(() => {});
      await page.waitForTimeout(1200);
      await page.evaluate(() => { showNotesSection("browse"); });
      await page.waitForTimeout(800);
      await page.evaluate(() => { const el = scrollTopTargetEl ? scrollTopTargetEl() : document.scrollingElement; (el || document.scrollingElement).scrollTop = 1200; window.dispatchEvent(new Event("scroll")); });
      await page.waitForTimeout(700);
      const m = await page.evaluate(async () => {
        const btn = document.getElementById("scroll-top");
        if (!btn || !btn.classList.contains("visible")) return { skip: "button not shown" };
        const b = btn.getBoundingClientRect();
        // the note row whose menu would open over the button: the lowest visible opener
        const openers = [...document.querySelectorAll("#entry-list li .menu-wrap > button")].filter((o) => { const r = o.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight - 40; });
        const opener = openers[openers.length - 1];
        if (!opener) return { skip: "no opener" };
        opener.click();
        await new Promise((r) => setTimeout(r, 400));
        const menu = document.querySelector('[role="menu"]:not(.hidden), .action-menu:not(.hidden)');
        if (!menu) return { skip: "no menu" };
        let r = menu.getBoundingClientRect();
        //: Wherever the layout puts them, lay the button under the menu's
        //: lower corner, as the owner's screen had it, then ask who is on top.
        btn.style.right = `${innerWidth - r.right + 8}px`;
        btn.style.bottom = `${innerHeight - r.bottom + 8}px`;
        await new Promise((res) => requestAnimationFrame(() => res()));
        const b2 = btn.getBoundingClientRect();
        r = menu.getBoundingClientRect();
        const x = Math.max(b2.left, r.left) + 4, y = Math.max(b2.top, r.top) + 4;
        const overlap = x < Math.min(b2.right, r.right) && y < Math.min(b2.bottom, r.bottom);
        if (!overlap) return { overlap: false };
        const top = document.elementFromPoint(x, y);
        return { overlap: true, menuOnTop: menu.contains(top), hit: top && (top.id || top.className) };
      });
      const tag = `${theme} ${w}`;
      if (m.skip) console.log(`SKIP ${tag}: ${m.skip}`);
      else if (!m.overlap) console.log(`SKIP ${tag}: no overlap this layout`);
      else check(m.menuOnTop, `${tag}: the menu is over the button (${m.hit})`);
      await browser.close();
    }
  }
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
