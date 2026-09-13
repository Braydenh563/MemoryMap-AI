// INBOX 183: "still no default board type selected". The New board dialog does
// pass a preset into `promptDialog`'s segment, so before changing anything this
// reads what the dialog actually shows on open: which option carries `active`,
// whether the two halves of the pill look different, and whether the create
// button can be pressed without touching the segment.
//
//   BASE=http://127.0.0.1:8791 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/newboard.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

const readDialog = (page) => page.evaluate(() => {
  const seg = document.querySelector(".confirm-overlay .seg");
  const buttons = [...(seg?.querySelectorAll("button") || [])].map((b) => {
    const cs = getComputedStyle(b);
    return {
      value: b.dataset.value, active: b.classList.contains("active"),
      pressed: b.getAttribute("aria-pressed"),
      bg: cs.backgroundColor, color: cs.color, weight: cs.fontWeight,
      w: Math.round(b.getBoundingClientRect().width),
    };
  });
  const actions = [...document.querySelectorAll(".confirm-overlay .confirm-actions button")];
  const create = actions[actions.length - 1];
  return {
    buttons,
    createLabel: create ? create.textContent.trim() : null,
    createDisabled: create ? create.disabled : null,
    nameValue: document.querySelector(".confirm-overlay input[type=text]")?.value ?? null,
  };
});

(async () => {
  const { browser, page } = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(600);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(900);

  await page.click("#wb-boards-new");
  await page.waitForTimeout(600);
  const first = await readDialog(page);
  console.log("  on open:", JSON.stringify(first));
  const active = first.buttons.filter((b) => b.active);
  check("exactly one kind is chosen when the dialog opens", active.length === 1,
    `${active.length} of ${first.buttons.length} active${active.length ? " (" + active[0].value + ")" : ""}`);
  check("the chosen kind is Board", active[0]?.value === "board", `${active[0]?.value}`);
  const [a, b] = first.buttons;
  check("the chosen half looks different from the other",
    a && b && (a.bg !== b.bg || a.color !== b.color || a.weight !== b.weight),
    `${a?.value} ${a?.bg}/${a?.color}/${a?.weight} against ${b?.value} ${b?.bg}/${b?.color}/${b?.weight}`);
  check("the create button can be pressed without touching the segment",
    first.createDisabled === false, `"${first.createLabel}" disabled ${first.createDisabled}`);
  check("the create button says what it does", first.createLabel === "Create", `"${first.createLabel}"`);

  // The kind is remembered: make a map, then open the dialog again.
  await page.fill(".confirm-overlay input[type=text]", "Remembered map");
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(900);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(600);
  const second = await readDialog(page);
  console.log("  second open:", JSON.stringify(second.buttons));
  const active2 = second.buttons.filter((x) => x.active);
  check("the next dialog opens on the kind last made", active2[0]?.value === "map",
    `${active2.map((x) => x.value).join(",") || "none"} active`);
  await page.keyboard.press("Escape");

  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
