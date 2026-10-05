// A '?' a sheet builds after boot opens its panel (chrome2, OPEN.md): the
// Suggestions sheet's did nothing, because initHelpToggles ran before it
// existed. Also the two that wired themselves (tags, categories), unchanged.
//   BASE=http://127.0.0.1:8846 VW=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/left1005-helplater.js
const { boot } = require("./lib.js");
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  " + detail}`);
}
const VW = Number(process.env.VW || 1440);

(async () => {
  const phone = VW < 600;
  const { browser, page } = await boot({ viewport: { width: VW, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(async () => { await openSuggestionsInbox(); });
  await page.waitForTimeout(800);
  const box = await page.evaluate(() => {
    const t = document.querySelector('[data-help-for="inbox-help"]');
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  check("the Suggestions sheet has its '?'", box, "no trigger");
  if (box) {
    if (phone) await page.touchscreen.tap(box.x, box.y);
    else await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(400);
    const open = await page.evaluate(() => {
      const p = document.getElementById("inbox-help");
      return { hidden: p.classList.contains("hidden"), h: p.getBoundingClientRect().height, expanded: document.querySelector('[data-help-for="inbox-help"]').getAttribute("aria-expanded") };
    });
    check("its '?' opens the panel", !open.hidden && open.h > 20 && open.expanded === "true", JSON.stringify(open));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const shut = await page.evaluate(() => document.getElementById("inbox-help")?.classList.contains("hidden"));
    const sheetOpen = await page.evaluate(() => Boolean(document.querySelector(".sheet-overlay")));
    check("Escape closes the panel and leaves the sheet open", shut === true && sheetOpen, `${shut} ${sheetOpen}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
  // The two sheets that wired their own '?' inside `build`, before the card
  // was in the page, so the panel lookup by id found nothing.
  for (const [opener, id] of [["openTagsSheet", "manage-tags-help"], ["openManageCategories", "manage-cat-help"]]) {
    await page.evaluate(async (opener) => { await window[opener](); }, opener);
    await page.waitForTimeout(700);
    const p = await page.evaluate((id) => {
      const t = document.querySelector(`[data-help-for="${id}"]`);
      if (!t) return null;
      const r = t.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, id);
    if (p) {
      if (phone) await page.touchscreen.tap(p.x, p.y);
      else await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(400);
    }
    const shown = await page.evaluate((id) => { const el = document.getElementById(id); return el ? !el.classList.contains("hidden") : null; }, id);
    check(`${opener}'s '?' opens its panel`, p && shown === true, `${JSON.stringify(p)} ${shown}`);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
  check("no page errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed}/${results.length} at ${VW}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
