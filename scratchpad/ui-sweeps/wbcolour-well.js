// The owner, 2026-10-11: recent colours, fill and border together, an
// eyedropper that takes a colour instead of opening a menu. Counts real clicks.
//   BASE=http://127.0.0.1:8800 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbcolour-well.js
const { openBoard, sketch } = require("./wbcolour-lib.js");
const { checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
const SHOT = process.env.SHOT;
(async () => {
  const { browser, page, errors, board } = await openBoard();
  await page.evaluate(() => { try { localStorage.removeItem("wb-recent-colours"); } catch { /* none */ } });
  const shape = (x, fill, color) => ({ d: `M ${x} 200 L ${x + 160} 200 L ${x + 160} 300 L ${x} 300 Z`, shape: "rect", fill, fillOpacity: 1, color, width: 3 });
  const a = await sketch(page, board.id, shape(300, "#15952b", "#387fe3"));
  const b = await sketch(page, board.id, shape(600, "#da5252", "#9b63e9"));
  const data = (id) => page.evaluate((i) => JSON.parse(wbFindItem("sketch", i).data), id);
  const open = () => page.evaluate(() => { const m = document.getElementById("wb-colour-menu"); return Boolean(m && !m.classList.contains("hidden")); });
  await page.evaluate(async (id) => { wbSelectToolRef("select"); selectWbItem("sketch", id); }, a);
  await page.waitForTimeout(500);
  const bar = await page.evaluate(() => ({
    fill: document.querySelector('#wb-context [data-wb-ctx="fill"] .wb-context-label')?.textContent,
    ink: document.getElementById("wb-prop-color-word")?.textContent,
    order: document.querySelector('#wb-context [data-wb-ctx="fill"]').compareDocumentPosition(document.querySelector('#wb-context [data-wb-ctx="ink"]')) & 4,
  }));
  check("the bar labels Fill then Border for a shape", bar.fill === "Fill" && bar.ink === "Border" && bar.order === 4, bar);
  // Border = fill: click 1 the border swatch, click 2 Same as fill.
  let clicks = 0;
  await page.click("#wb-prop-color"); clicks++;
  await page.waitForTimeout(400);
  const menu = await page.evaluate(() => {
    const m = document.getElementById("wb-colour-menu");
    const r = m.getBoundingClientRect();
    return {
      head: document.getElementById("wb-colour-head").textContent,
      pressed: [...m.querySelectorAll(".wb-colour-pair [aria-selected=true]")].map((x) => x.textContent),
      match: m.querySelector(".wb-colour-match")?.textContent,
      recentEmpty: Boolean(m.querySelector(".wb-colour-recent-empty")),
      swatches: m.querySelectorAll(".swatch-option").length,
      inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      w: Math.round(r.width), h: Math.round(r.height),
    };
  });
  check("the border swatch opens the well, not the browser dialog, Border pressed", menu.head === "Border colour" && menu.pressed.join() === "Border" && menu.match === "Same as fill" && menu.inView, menu);
  if (SHOT) await page.screenshot({ path: `${SHOT}-menu.png` });
  await page.click(".wb-colour-match"); clicks++;
  await page.waitForTimeout(800);
  let d = await data(a);
  check(`border = fill in ${clicks} clicks`, d.color.toLowerCase() === "#15952b" && clicks === 2, { color: d.color, clicks });
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(700);
  d = await data(a);
  check("one Undo puts the border back", d.color.toLowerCase() === "#387fe3", d.color);
  // Swap, one undo.
  await page.click("#wb-prop-color");
  await page.waitForTimeout(400);
  await page.click(".wb-colour-swap");
  await page.waitForTimeout(800);
  d = await data(a);
  const swapped = d.fill.toLowerCase() === "#387fe3" && d.color.toLowerCase() === "#15952b";
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(700);
  const back = await data(a);
  check("Swap trades them, and one Undo trades them back", swapped && back.fill.toLowerCase() === "#15952b" && back.color.toLowerCase() === "#387fe3", { d, back });
  // A palette pick joins Recent, which persists across opens and reloads.
  await page.click("#wb-prop-shapefill");
  await page.waitForTimeout(400);
  const fillHead = await page.evaluate(() => [...document.querySelectorAll("#wb-colour-menu .wb-colour-pair [aria-selected=true]")].map((x) => x.textContent).join());
  check("the fill swatch opens it with Fill pressed", fillHead === "Fill", fillHead);
  await page.click('#wb-colour-menu .swatch-option[aria-label="Teal"]');
  await page.waitForTimeout(800);
  d = await data(a);
  check("a palette pick fills the shape", d.fill.toLowerCase() === "#159172", d.fill);
  await page.click("#wb-prop-color");
  await page.waitForTimeout(400);
  const recent = await page.evaluate(() => [...document.querySelectorAll("#wb-colour-menu .wb-colour-recent .swatch-option")].map((x) => x.style.getPropertyValue("--swatch")));
  const stored = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("wb-recent-colours") || "[]"); } catch { return []; } });
  check("Recent holds the pick, first, and is stored per device", recent[0] === "#159172" && stored[0] === "#159172", { recent, stored });
  // Eyedropper: the border takes the other shape's fill by clicking the canvas.
  await page.click("#wb-colour-eyedrop");
  await page.waitForTimeout(200);
  const on = await page.evaluate(() => ({ cls: document.documentElement.classList.contains("wb-eyedropping"), head: document.getElementById("wb-colour-head").textContent, take: !document.getElementById("wb-colour-take").classList.contains("hidden") }));
  check("the eyedropper says its target and shows the take-its-border box", on.cls && /Border colour: click/.test(on.head) && on.take, on);
  const bBox = await page.evaluate((id) => document.querySelector(`.sketch-group[data-id="${id}"]`).getBoundingClientRect().toJSON(), b);
  await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
  await page.waitForTimeout(800);
  d = await data(a);
  const sel = await page.evaluate(() => [...(wbState.selection || [])].length || (wbState.selected ? 1 : 0));
  check("a press on another shape takes its fill into the border, and the press selects nothing", d.color.toLowerCase() === "#da5252" && !(await open()), { color: d.color, sel });
  // Alt takes the border.
  await page.evaluate((id) => selectWbItem("sketch", id), a);
  await page.waitForTimeout(400);
  await page.click("#wb-prop-shapefill");
  await page.waitForTimeout(400);
  await page.click("#wb-colour-eyedrop");
  await page.keyboard.down("Alt");
  await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
  await page.keyboard.up("Alt");
  await page.waitForTimeout(800);
  d = await data(a);
  check("with Alt the press takes the other shape's border into the fill", d.fill.toLowerCase() === "#9b63e9", d.fill);
  // The owner's case: the eyedropper on a colour button takes its colour and never opens its menu.
  await page.evaluate((id) => selectWbItem("sketch", id), a);
  await page.waitForTimeout(400);
  const fillNow = (await data(a)).fill.toLowerCase();
  await page.click("#wb-prop-color");
  await page.waitForTimeout(400);
  await page.click("#wb-colour-eyedrop");
  await page.click("#wb-prop-shapefill");
  await page.waitForTimeout(800);
  d = await data(a);
  check("the eyedropper on the bar's fill swatch takes its colour, no menu", d.color.toLowerCase() === fillNow && !(await open()), { color: d.color, fillNow, open: await open() });
  // The tool pair: the rail's draw colour and the tool fill.
  await page.keyboard.press("Escape");
  await page.mouse.click(900, 650);
  await page.evaluate(() => wbSelectToolRef("rect"));
  await page.waitForTimeout(500);
  const fillTool = await page.evaluate(() => { const f = document.getElementById("wb-fill-color"); const r = f.getBoundingClientRect(); return r.width > 0; });
  if (fillTool) {
    await page.click("#wb-fill-color");
    await page.waitForTimeout(400);
    const pair = await page.evaluate(() => [...document.querySelectorAll("#wb-colour-menu .wb-colour-pair [role=tab]")].map((x) => x.textContent));
    await page.click(".wb-colour-swap");
    await page.waitForTimeout(400);
    const tool = await page.evaluate(() => ({ fill: document.getElementById("wb-fill-color").value, ink: document.getElementById("wb-rail-ink").value }));
    check("the tool's fill and draw colour are a pair that swaps", pair.join() === "Fill,Border" && tool.fill !== tool.ink, { pair, tool });
  } else check("the tool fill field shows for the rectangle tool", false);
  // Dark theme and a phone: the menu stays on screen.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate((id) => { wbSelectToolRef("select"); selectWbItem("sketch", id); }, a);
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById("wb-prop-color").click());
  await page.waitForTimeout(500);
  const phone = await page.evaluate(() => { const r = document.getElementById("wb-colour-menu").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, sw: document.documentElement.scrollWidth }; });
  check("at 390 the well is on screen and nothing scrolls sideways", phone.l >= 0 && phone.r <= 390 && phone.t >= 0 && phone.b <= 844 && phone.sw <= 390, phone);
  if (SHOT) await page.screenshot({ path: `${SHOT}-phone.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
