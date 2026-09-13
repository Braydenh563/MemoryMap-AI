// INBOX 184: "my exported png from the mindmap straight to the whiteboard
// still doesnt have anything at the bottom of its card, its just blank."
//
// Reproduced rather than reasoned about: a map is made, exported straight into
// the image library through the app's own `wbSaveToLibrary`, and the card that
// arrives in the Images gallery is read: which blocks its foot holds, what
// each says, and how tall the foot is. This sandbox has no vision model, so
// the describe and the OCR read both fail, which is the state the report is
// about.
//
//   BASE=http://127.0.0.1:8791 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mapexportcard.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  const { browser, page } = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(600);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(900);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", "Export map");
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
  await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    await wbMapAddChild(root.id);
  });
  await page.waitForTimeout(1500);

  const saved = await page.evaluate(async () => {
    try {
      await wbSaveToLibrary("board");
      return "ok";
    } catch (e) {
      return `failed: ${e.message}`;
    }
  });
  console.log("  export to the library:", saved);
  check("the map exports into the image library", saved === "ok", saved);
  // The describe and OCR jobs are fired on upload; give them time to fail.
  await page.waitForTimeout(6000);

  await page.click('[data-target="library-view-media"][data-media-kind="images"]');
  await page.waitForTimeout(2500);
  const card = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#library-view-media .library-image-card, #library-view-media .card")];
    const mine = cards.find((c) => /whiteboard-board/.test(c.textContent)) || cards[0];
    if (!mine) return { found: false, cards: cards.length };
    const r = mine.getBoundingClientRect();
    const img = mine.querySelector("img");
    const fields = [...mine.querySelectorAll(".library-image-field")].map((f) => {
      const fr = f.getBoundingClientRect();
      return {
        cls: f.className,
        hidden: f.classList.contains("hidden") || fr.height === 0,
        h: Math.round(fr.height),
        text: (f.textContent || "").trim().slice(0, 80),
      };
    });
    const imgBottom = img ? img.getBoundingClientRect().bottom : r.top;
    return {
      found: true,
      cards: cards.length,
      name: (mine.querySelector(".library-image-name, .card-title, h3, strong") || {}).textContent || "",
      cardH: Math.round(r.height),
      footH: Math.round(r.bottom - imgBottom),
      fields,
      shownFields: fields.filter((f) => !f.hidden).length,
      footText: fields.filter((f) => !f.hidden).map((f) => f.text).join(" | "),
    };
  });
  console.log("  card:", JSON.stringify(card, null, 1));
  check("the exported image has a card in the gallery", card.found, `${card.cards} cards`);
  check("the card's foot says something", card.found && card.shownFields > 0 && card.footText.length > 0,
    `${card.shownFields} of ${card.fields?.length} blocks shown, foot ${card.footH}px, text "${card.footText}"`);

  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
