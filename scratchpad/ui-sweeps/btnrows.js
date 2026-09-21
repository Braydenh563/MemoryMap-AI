// Two or more buttons on one row are all the same height, on every tab.
//
// This is DESIGN.md's "Control height" section as a ratchet. That section is
// a list of rows that were each found wrong and each fixed by hand: the graph
// toolbar, the Notes browse row, Capture, Write with AI, Ask, the batch bar,
// the reminder magic row. Seven separate reports of the same defect, because
// nothing was watching for the eighth.
//
// The shape is always the same: a row holds a `select` at the form-field
// height, a plain `button` at 40px and a `.ghost` at 42px (the border, under
// `box-sizing: border-box`), or a `.small` at 28px beside a `.ghost.small` at
// 30.4px. The fix is always the same too, a `--control-h` on the row.
//
// **Why the base rule is not changed instead**, since `border: 1px solid
// transparent` on `button` would end the 40-against-42 case in one line
// (`docs/roadmap/agent-remaining/OPEN.md` proposed exactly that): it was
// measured, 2026-09-21, by adding that edge to every borderless button in the
// running app and re-walking all seven tabs. 18 of 312 visible buttons moved,
// and the moves were worse than the defect: `.linklike`, which is text and
// not a box, went 18 to 20px; five graph toolbar buttons went 36 to 36.5px,
// putting a half pixel where there had been none; and a reminders select
// opener went 36 to 44px. Against that, one row in the whole app was actually
// mixed. So the per-row rule stands, and this probe is what makes it hold.
const { boot } = require("./lib.js");

let failures = 0;
function ok(label, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  — ${detail}`);
  if (!pass) failures += 1;
}

const TABS = ["dashboard", "notes", "chat", "graph", "library", "timeline", "reminders"];

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const bad = [];
  let rows = 0;
  let buttons = 0;
  for (const tab of TABS) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(700);
    const res = await page.evaluate(() => {
      const out = { rows: 0, buttons: 0, bad: [] };
      const seen = new Set();
      for (const b of document.querySelectorAll("button")) {
        if (b.offsetParent) out.buttons += 1;
        const parent = b.parentElement;
        if (!parent || seen.has(parent)) continue;
        seen.add(parent);
        const kids = [...parent.children].filter((c) => c.tagName === "BUTTON" && c.offsetParent);
        if (kids.length < 2) continue;
        // One row only: buttons stacked in a column are allowed to differ,
        // because nothing lines their edges up for the eye to compare.
        const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)));
        if (tops.size > 1) continue;
        out.rows += 1;
        const heights = kids.map((k) => Math.round(k.getBoundingClientRect().height * 10) / 10);
        if (new Set(heights).size > 1) {
          out.bad.push(
            `${parent.id || parent.className || parent.tagName}: ` +
              kids.map((k, i) => `${(k.id || k.className || "button").split(" ").join(".")}=${heights[i]}`).join(" ")
          );
        }
      }
      return out;
    });
    rows += res.rows;
    buttons += res.buttons;
    for (const b of res.bad) bad.push(`${tab} ${b}`);
  }
  ok(
    "every row of buttons is one height",
    rows > 20 && bad.length === 0,
    `${buttons} visible buttons, ${rows} button rows, ${bad.length} mixed${bad.length ? ": " + bad.slice(0, 6).join("; ") : ""}`
  );
  await browser.close();
  console.log(failures ? `FAILURES: ${failures}` : "ALL PASS");
  process.exit(failures ? 1 : 0);
})();
