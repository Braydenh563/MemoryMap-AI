// Library > Contents on a phone (INBOX 430: "the dates overflow on the
// right"): every element whose right edge passes its card's or the window's,
// at 390x844 and 768x1024 with touch. Shot to scratchpad/shots/phone430/.
const path = require("path");
const { boot } = require("./lib.js");
const TAG = process.env.TAG || "after";
(async () => {
  let fails = 0;
  for (const [w, h] of [[390, 844], [768, 1024]]) {
    const { page, browser } = await boot({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    await page.evaluate(async () => {
      switchTab("library");
      await new Promise((r) => setTimeout(r, 1500));
      const btn = [...document.querySelectorAll("#library-subtabs button")].find((b) => /contents/i.test(b.textContent));
      btn?.click();
      await new Promise((r) => setTimeout(r, 1500));
    });
    const m = await page.evaluate(() => {
      const view = [...document.querySelectorAll("[id^=library-view]")].find((v) => v.getClientRects().length && /content/i.test(v.id));
      if (!view) return { view: null };
      const box = view.getBoundingClientRect();
      const over = [];
      for (const el of view.querySelectorAll("*")) {
        if (!el.getClientRects().length || !el.textContent.trim()) continue;
        //: A strip that scrolls sideways on purpose (the jump chips) is not an
        //: overflow: its children are meant to run past the edge.
        if (el.closest(".contents-jump")) continue;
        const r = el.getBoundingClientRect();
        if (r.right > Math.min(box.right, innerWidth) + 1) {
          over.push(`${el.tagName.toLowerCase()}.${el.className.toString().split(" ")[0]} "${el.textContent.trim().slice(0, 24)}" right ${Math.round(r.right)}`);
        }
      }
      return { view: view.id, right: Math.round(box.right), vw: innerWidth, over: over.slice(0, 8), count: over.length };
    });
    const ok = m.view && m.count === 0;
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${w}: ${JSON.stringify(m)}`);
    await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `contents-${TAG}-${w}.png`) });
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : "nothing passes the edge");
  process.exit(fails ? 1 : 0);
})();
