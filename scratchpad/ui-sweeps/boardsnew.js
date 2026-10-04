// The Boards & maps dock's one filled New and its two rows (MINDMAP_PLAN
// INBOX 24: "one filled New button opens a two-row menu (Board, Mind map),
// each with its icon and a one-line hint"). Measured at each width: one filled
// control in the dock, the menu open with both rows, each row's icon, word and
// visible hint, the hint muted and smaller than the word, and the menu inside
// the viewport.
//
//   BASE=http://127.0.0.1:8794 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     WIDTHS=2000,1440,820,390 node scratchpad/ui-sweeps/boardsnew.js   (THEME=dark)
const { boot } = require("./lib.js");

const WIDTHS = (process.env.WIDTHS || "2000,1440,820,390").split(",").map(Number);

(async () => {
  let bad = 0;
  const check = (label, ok, detail) => {
    if (!ok) bad++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  };
  for (const width of WIDTHS) {
    const { browser, page } = await boot({ viewport: { width, height: 900 } });
    await page.click('[data-tab="library"]').catch(() => {});
    await page.waitForTimeout(800);
    await page.click('#library-subtabs [data-target="library-view-whiteboard"]').catch(() => {});
    await page.waitForTimeout(1200);
    await page.click("#wb-boards-new-menu > summary");
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const dock = document.querySelector('[data-dock-name="library-boards"]');
      //: Filled means the accent ground: a select's opener and a segment's
      //: well have a quiet ground of their own and are not primaries.
      const accent = getComputedStyle(document.querySelector("#wb-boards-new-menu > summary")).backgroundColor;
      const filledList = [...dock.querySelectorAll("button, summary")].filter((b) =>
        b.checkVisibility() && getComputedStyle(b).backgroundColor === accent);
      const filled = filledList.length;
      const list = document.getElementById("wb-boards-new").parentElement;
      const lb = list.getBoundingClientRect();
      const rows = ["wb-boards-new", "wb-boards-new-map"].map((id) => {
        const row = document.getElementById(id);
        const icon = row.querySelector(".ph");
        const hint = row.querySelector(".dock-menu-item-hint");
        const word = row.querySelector(".dock-menu-item-text");
        const hb = hint.getBoundingClientRect();
        const rb = row.getBoundingClientRect();
        return {
          id,
          h: Math.round(rb.height),
          icon: Boolean(icon && icon.getBoundingClientRect().width > 0),
          hint: hint.textContent,
          hintShown: hb.width > 0 && hb.height > 0 && hb.right <= rb.right + 0.5,
          hintSize: parseFloat(getComputedStyle(hint).fontSize),
          wordSize: parseFloat(getComputedStyle(word).fontSize),
          hintColour: getComputedStyle(hint).color,
          wordColour: getComputedStyle(word).color,
        };
      });
      return {
        filled,
        list: { left: Math.round(lb.left), right: Math.round(lb.right), w: Math.round(lb.width) },
        vw: innerWidth,
        rows,
      };
    });
    console.log(`== ${width}px`, JSON.stringify(m));
    check(`${width}: one filled control in the dock`, m.filled === 1, `${m.filled}`);
    check(`${width}: the menu sits inside the window`, m.list.left >= 0 && m.list.right <= m.vw, `${m.list.left}..${m.list.right} of ${m.vw}`);
    for (const r of m.rows) {
      check(`${width}: ${r.id} has its icon and a visible hint`, r.icon && r.hintShown, r.hint);
      check(`${width}: ${r.id}'s hint is quieter than its word`,
        r.hintSize < r.wordSize && r.hintColour !== r.wordColour, `${r.hintSize}px vs ${r.wordSize}px`);
    }
    await browser.close();
  }
  console.log(bad ? `FAIL: ${bad}` : "PASS: 0 findings");
  process.exit(bad ? 1 : 0);
})();
