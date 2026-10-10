// MINDMAP_PLAN §14.4's topic effects; the owner, 2026-10-10: "I want more
// mindmap appearance options. Other mind mapping software is still soo much
// better". A topic's strip has Effect (none, shadow, glow); a level can set
// one for every topic at it, a topic keeps "No effect" against it; each
// survives a fresh read. Measured: the computed box-shadow.
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers [THEME=dark] node scratchpad/ui-sweeps/mapeffects.js
const { boot } = require("./lib.js");
let fails = 0, passes = 0;
const check = (ok, what, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? "  " + detail : ""}`); ok ? passes++ : fails++; };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1200);
  await page.evaluate(async () => { await initWhiteboard(); });
  const map = await page.evaluate(async () => apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# E\n- Root\n  - Alpha\n  - Beta\n  - Gamma", name: "Effects " + Date.now() }) }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id); await page.waitForTimeout(1500);
  const ids = await page.evaluate(() => { const idx = wbMapIndex(); const by = (t) => idx.nodes.find((n) => wbMapLabel(n) === t).id; return { alpha: by("Alpha"), beta: by("Beta"), gamma: by("Gamma") }; });
  const look = (id) => page.evaluate((id) => { const el = document.querySelector(`.wb-object[data-id="${id}"]`); return { shadow: getComputedStyle(el).boxShadow, effect: el.dataset.effect || "" }; }, id);
  const pick = (id, label) => page.evaluate(async ({ id, label }) => {
    clearWbSelection(); wbHandleItemClick("object", id, new MouseEvent("click"));
    await new Promise((r) => setTimeout(r, 250));
    const sel = document.getElementById("wb-map-effect");
    const rows = [...sel.options].map((o) => o.textContent);
    const option = [...sel.options].find((o) => o.textContent === label);
    if (!option) return { rows, missing: label };
    sel.value = option.value; sel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    return { rows, stored: wbState.objects.find((o) => o.id === id).data.effect ?? null };
  }, { id, label });
  const base = await look(ids.alpha);
  let r = await pick(ids.alpha, "Shadow");
  let a = await look(ids.alpha);
  check(r.stored === "shadow" && a.shadow !== base.shadow && /rgba\(0, 0, 0/.test(a.shadow), "Shadow lifts the topic", JSON.stringify({ r, base: base.shadow.slice(0, 50), now: a.shadow.slice(0, 80) }));
  r = await pick(ids.alpha, "Glow");
  a = await look(ids.alpha);
  const branch = await page.evaluate((id) => getComputedStyle(document.querySelector(`.wb-object[data-id="${id}"]`)).getPropertyValue("--wb-branch").trim(), ids.alpha);
  check(r.stored === "glow" && /0px 0px 0px 3px/.test(a.shadow), "Glow rings it in its branch colour", JSON.stringify({ branch, shadow: a.shadow.slice(0, 120) }));
  const strip = await page.evaluate(() => [...document.querySelectorAll('#wb-map-strip .wb-map-picks[aria-label="An effect on this topic"] button')].map((b) => b.getAttribute("aria-label") || b.title));
  check(strip.length >= 3, "the strip draws the effect as a row of previews", JSON.stringify(strip));
  await page.evaluate(async () => { await wbMapSetLevelField(1, "effect", "shadow"); });
  await page.waitForTimeout(700);
  const b = await look(ids.beta), g = await look(ids.gamma);
  check(b.effect === "shadow" && g.effect === "shadow", "a level's effect reaches every topic at it", JSON.stringify({ b, g }));
  r = await pick(ids.gamma, "No effect");
  const g2 = await look(ids.gamma);
  check(r.rows.some((t) => /As the map draws \(shadow\)/.test(t)) && r.stored === "none" && !g2.effect, "a topic keeps No effect against its level", JSON.stringify({ r, g2 }));
  await page.evaluate(async () => { await fetchWhiteboardState(); renderWhiteboardNow(); });
  await page.waitForTimeout(800);
  const after = { alpha: await look(ids.alpha), beta: await look(ids.beta), gamma: await look(ids.gamma) };
  check(after.alpha.effect === "glow" && after.beta.effect === "shadow" && !after.gamma.effect, "each survives a fresh read", JSON.stringify(after));
  const levelRow = await page.evaluate(() => typeof WB_MAP_LEVEL_ROWS !== "undefined" && WB_MAP_LEVEL_ROWS.some((row) => row.key === "effect"));
  check(levelRow, "How this map looks offers Effect per level");
  check(!errors.length, "no page errors", errors.join(" | ").slice(0, 300));
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
