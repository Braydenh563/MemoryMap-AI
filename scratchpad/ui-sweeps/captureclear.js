// **Clear sits in the composer's foot, clear of the text box** (INBOX 545,
// the owner: "the clear button in the note capture tab clashes with the text
// box"). With text typed (Clear shows), the button's box must not overlap
// the textarea's box, and the counter and Clear share a centre line.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/captureclear.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { browser, page } = await boot({ viewport: { width: w, height: h } });
    await page.click('[data-tab="notes"]').catch(() => {});
    await page.waitForTimeout(1200);
    await page.click('#notes-subtabs [data-section="capture"]');
    await page.waitForTimeout(800);
    const box = await page.evaluate(() => {
      const t = document.getElementById("entry-content");
      const host = t.closest(".note-composer") || t.parentElement;
      const ed = [...host.querySelectorAll("[contenteditable='true'], textarea")].find((e) => e.getBoundingClientRect().height > 0);
      ed.scrollIntoView({ block: "center" });
      const r = ed.getBoundingClientRect();
      return { x: r.left + 20, y: r.top + 12 };
    });
    await page.mouse.click(box.x, box.y);
    await page.keyboard.type("A short note to make Clear appear");
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const t = document.getElementById("entry-content");
      const shown = [t, ...document.querySelectorAll("#entry-content ~ *, .note-composer [contenteditable]")].find((e) => e.getBoundingClientRect().height > 0 && e.closest(".note-composer-foot") == null) || t;
      const ta = shown.getBoundingClientRect();
      const b = document.getElementById("capture-clear");
      const br = b.getBoundingClientRect();
      const c = document.getElementById("entry-count").getBoundingClientRect();
      return { hidden: b.classList.contains("hidden"), gap: Math.round((br.top - ta.bottom) * 10) / 10, mid: Math.round((br.top + br.height / 2 - (c.top + c.height / 2)) * 10) / 10, size: [Math.round(br.width), Math.round(br.height)] };
    });
    const ok = !m.hidden && m.gap >= 2 && Math.abs(m.mid) <= 1;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${w}: Clear ${m.gap}px below the text box, ${m.mid}px off the counter's centre, ${m.size.join("x")}`);
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
