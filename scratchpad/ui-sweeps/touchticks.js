// **The selection ticks on a touch screen: a 44px target, a lighter box**
// (docs/roadmap/agent-remaining/phone.md, item 1: the Library card ticks and
// the reminder row ticks drew a heavy 44px box at rest). Asserts, on a phone
// profile, that each tick is still at least 44px to press, that its own frame
// is gone, and that the box drawn inside it is half that size. And on a
// desktop profile that nothing changed: the fine pointer keeps its own box.
//
//   BASE=http://127.0.0.1:8795 SCRATCH=/tmp/mm-agentM \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/touchticks.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

const read = (page, selector) => page.evaluate((selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const b = el.getBoundingClientRect();
  const own = getComputedStyle(el);
  const box = getComputedStyle(el, "::before");
  return {
    w: Math.round(b.width), h: Math.round(b.height),
    ownBorder: own.borderTopColor, ownBg: own.backgroundColor,
    boxW: box.content === "none" ? 0 : Math.round(parseFloat(box.width)),
  };
}, selector);

async function measure(opts, label, touch) {
  const { browser, page } = await boot(opts);
  await page.evaluate(async () => {
    await apiJson("/reminders", { method: "POST", body: JSON.stringify({ text: "Tick me", due_at: new Date(Date.now() + 3600e3).toISOString() }) });
    await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "A note to tick", category: "General" }) });
  });
  await page.evaluate(() => switchTab("reminders"));
  await page.waitForTimeout(1500);
  const reminder = await read(page, '#reminder-groups li input[type="checkbox"]:not(.sr-only)');
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(1800);
  const card = await read(page, ".library-card-tick");
  console.log(`    ${label}`, JSON.stringify({ reminder, card }));
  if (touch && card) {
    await page.evaluate(() => { document.querySelector(".library-card-tick").checked = true; });
    await page.waitForTimeout(500);
    const ticked = await page.evaluate(() => {
      const el = document.querySelector(".library-card-tick");
      const box = getComputedStyle(el, "::before").backgroundColor;
      const live = getComputedStyle(el, "::after");
      // A computed style is live: copied now, before the tick is cleared below.
      const mark = { content: live.content, height: live.height, width: live.width, border: live.borderRightWidth };
      const probe = document.createElement("span");
      probe.style.color = "var(--accent)";
      document.body.appendChild(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      el.checked = false;
      return { box, accent, mark: mark.content !== "none" && parseFloat(mark.height) > 0, markSize: `${mark.width} x ${mark.height}, ${mark.border}` };
    });
    check(`${label}: a ticked card fills the small box with the accent and draws the mark`,
      ticked.box === ticked.accent && ticked.mark, JSON.stringify(ticked));
  }
  for (const [name, t] of [["a Library card's tick", card], ["a reminder's tick", reminder]]) {
    if (!t) { check(`${label}: ${name} is on screen`, false, "not found"); continue; }
    if (touch) {
      check(`${label}: ${name} is still a 44px target`, t.w >= 44 && t.h >= 44, `${t.w}x${t.h}`);
      check(`${label}: ${name} draws a box half that size, with no frame of its own`,
        t.boxW > 0 && t.boxW <= 24 && /rgba\(0, 0, 0, 0\)|transparent/.test(t.ownBorder), `box ${t.boxW}px, own border ${t.ownBorder}`);
    } else {
      check(`${label}: ${name} keeps its own box on a fine pointer`, t.boxW === 0 && !/rgba\(0, 0, 0, 0\)/.test(t.ownBorder), `box ${t.boxW}, border ${t.ownBorder}`);
    }
  }
  await browser.close();
}

(async () => {
  await measure({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, "390 touch", true);
  await measure({}, "1440 mouse", false);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
