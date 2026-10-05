// **One edge on the note composer** (INBOX 560, the owner: "the borders and
// stufff look awkward and wierd"). With the note box focused, no element
// inside the composer draws an outline or a border of its own (no box in a
// box), and the composer's own edge carries the focus in the accent.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/composerring.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failed++; };
  for (const theme of ["light", "dark"]) {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      process.env.THEME = theme;
      const { browser, page } = await boot({ viewport: { width: w, height: h } });
      await page.click('[data-tab="notes"]').catch(() => {});
      await page.waitForTimeout(1000);
      await page.click('#notes-subtabs [data-section="capture"]').catch(() => {});
      await page.waitForTimeout(800);
      const target = await page.evaluate(() => {
        const host = document.querySelector(".note-composer");
        const ed = [...host.querySelectorAll("[contenteditable='true'], textarea")].find((e) => e.getBoundingClientRect().height > 40);
        ed.scrollIntoView({ block: "center" });
        const r = ed.getBoundingClientRect();
        return { x: r.left + 30, y: r.top + 20 };
      });
      await page.mouse.click(target.x, target.y);
      await page.keyboard.type("Dentist on Friday at 3pm.");
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const host = document.querySelector(".note-composer");
        const inner = [];
        for (const el of host.querySelectorAll("*")) {
          if (el.closest(".note-toolbar, .note-composer-foot, button")) continue;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (r.width < 100 || r.height < 30) continue;
          const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
          const border = ["Top", "Right", "Bottom", "Left"].filter((s) => cs[`border${s}Style`] !== "none" && parseFloat(cs[`border${s}Width`]) > 0).length;
          if (outline || border >= 3) inner.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} outline=${outline} borders=${border}`);
        }
        const cs = getComputedStyle(host);
        return { inner, edge: cs.borderTopColor, shadow: cs.boxShadow, active: document.activeElement?.tagName };
      });
      const tag = `${theme} ${w}`;
      check(m.inner.length === 0, `${tag}: nothing inside draws its own box (${m.inner.join("; ") || "none"})`);
      check(m.shadow.includes("inset") && m.shadow.includes("1px"), `${tag}: the composer's edge carries the focus (${m.edge})`);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await browser.close();
    }
  }
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
