// MINDMAP_PLAN §14c gate (mc1): the one icon and emoji picker, and a map
// topic's icon slot. Search, Recent, arrows and Enter, an emoji and an icon.
//   BASE=http://127.0.0.1:8798 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mc1-iconpicker.js
const { boot } = require("./lib.js");
const results = [];
const check = (label, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const before = await page.evaluate(() => typeof iconPickerEmojiGroups);
  check("the picker is not loaded at boot", before === "undefined");
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const content = ["- Centre", "  - Branch one", "    - Leaf a"];
    const board = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: content.join("\n"), name: "Icons" }) });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1500));
    const leaf = wbMapIndex().nodes.find((n) => /Leaf a/.test(n.data?.content || ""));
    selectWbItem("object", leaf.id);
  });
  await page.waitForTimeout(500);

  // The Text menu's "More icons and emoji" button opens it: real clicks.
  await page.click('[aria-controls="wb-map-text-menu"]');
  await page.waitForTimeout(300);
  await page.click(".wb-map-icon-more");
  const opened = await page.evaluate(async () => {
    const more = document.querySelector(".wb-map-icon-more");
    if (!more) return { more: false };
    for (let i = 0; i < 30 && !document.querySelector(".icon-picker"); i++) await new Promise((r) => setTimeout(r, 100));
    const panel = document.querySelector(".icon-picker");
    if (!panel) return { more: true, panel: false };
    const box = panel.getBoundingClientRect();
    return {
      more: true, panel: true, focused: document.activeElement?.classList.contains("search-field-input"),
      tiles: panel.querySelectorAll(".icon-picker-tile").length,
      groups: [...panel.querySelectorAll(".icon-picker-group")].map((g) => g.textContent),
      w: Math.round(box.width), h: Math.round(box.height), inView: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight,
    };
  });
  console.log("    " + JSON.stringify(opened));
  check("the topic's Text menu offers every icon and emoji", opened.more && opened.panel);
  check("it opens with the search field focused, inside the window", opened.focused && opened.inView, `${opened.w}x${opened.h}`);
  check("emoji in groups, first page drawn", opened.tiles > 100 && opened.groups.length >= 9, `${opened.tiles} tiles, ${opened.groups.length} groups`);

  // Search for fire, Enter: the topic wears the emoji.
  await page.keyboard.type("fire");
  await page.waitForTimeout(200);
  const found = await page.evaluate(() => [...document.querySelectorAll(".icon-picker-tile")].map((t) => t.dataset.name).slice(0, 3));
  check("search filters by name", found.length > 0 && /fire/.test(found[0]), JSON.stringify(found));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  const emoji = await page.evaluate(() => {
    const leaf = wbMapIndex().nodes.find((n) => /Leaf a/.test(n.data?.content || ""));
    const icon = document.querySelector(`.wb-object[data-id="${leaf.id}"] .wb-map-node-icon`);
    return { stored: leaf.data.icon, text: icon?.textContent, hidden: icon?.hidden, closed: !document.querySelector(".icon-picker") };
  });
  check("Enter sets the emoji as the topic's icon, drawn as text, and closes", emoji.stored && emoji.text === emoji.stored && !emoji.hidden && emoji.closed, JSON.stringify(emoji));

  // Icons tab: arrows and Enter.
  const icon = await page.evaluate(async () => {
    document.querySelector(".wb-map-icon-more").click();
    await new Promise((r) => setTimeout(r, 300));
    const panel = document.querySelector(".icon-picker");
    const recent = panel.querySelector(".icon-picker-group")?.textContent;
    panel.querySelector('.icon-picker-modes [data-mode="icon"]').click();
    await new Promise((r) => setTimeout(r, 200));
    const search = panel.querySelector(".search-field-input");
    search.value = "rocket";
    search.dispatchEvent(new Event("input"));
    await new Promise((r) => setTimeout(r, 100));
    search.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const list = panel.querySelector(".icon-picker-list");
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const active = panel.querySelector(".icon-picker-tile.active")?.dataset.name;
    const activeDesc = list.getAttribute("aria-activedescendant");
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (/rocket/.test(wbMapIndex().nodes.find((n) => /Leaf a/.test(n.data?.content || "")).data.icon || "")) break;
    }
    const leaf = wbMapIndex().nodes.find((n) => /Leaf a/.test(n.data?.content || ""));
    const el = document.querySelector(`.wb-object[data-id="${leaf.id}"] .wb-map-node-icon`);
    const all = wbMapIndex().nodes.map((n) => [n.id, n.data?.content, n.data?.icon]);
    return { recent, active, activeDesc: Boolean(activeDesc), stored: leaf.data.icon, cls: el?.className, all, sel: wbSelectedItem };
  });
  console.log("    " + JSON.stringify(icon));
  check("Recent comes first the second time", icon.recent === "Recent");
  check("arrows move the active tile, Enter takes it", icon.activeDesc && /rocket/.test(icon.stored || "") && /ph-rocket/.test(icon.cls || ""), `${icon.active} -> ${icon.stored}`);

  // The quick row shows a choice outside its eleven.
  const quick = await page.evaluate(() => {
    const sel = document.getElementById("wb-map-strip-icon");
    return { value: sel.value, chosen: Boolean(sel.querySelector("option[data-chosen]")) };
  });
  check("the quick row shows the chosen icon as its own segment", quick.chosen && /rocket/.test(quick.value), JSON.stringify(quick));

  // Escape closes and gives focus back.
  const strip = await page.evaluate(() => {
    const s = document.getElementById("wb-map-strip");
    const t = document.querySelector('[aria-controls="wb-map-text-menu"]');
    const chain = [];
    for (let el = t; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.visibility !== "visible" || cs.opacity === "0" || el.inert) chain.push([el.tagName, el.id, el.className, cs.visibility, cs.opacity, el.inert]);
    }
    return { sel: wbSelectedItem, hidden: s?.hidden, cls: s?.className, rect: s?.getBoundingClientRect().height, t: t?.getBoundingClientRect().width, chain };
  });
  console.log("    strip " + JSON.stringify(strip));
  await page.evaluate(async () => {
    window.__focusLog = [];
    const real = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (...a) { window.__focusLog.push([this.tagName, this.className, this.getClientRects().length]); return real.apply(this, a); };
    document.querySelector('[aria-controls="wb-map-text-menu"]').click();
    await new Promise((r) => setTimeout(r, 200));
    const more = document.querySelector(".wb-map-icon-more");
    more.focus();
    more.click();
  });
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const esc = await page.evaluate(() => {
    const more = document.querySelector(".wb-map-icon-more");
    const toggle = document.querySelector('[aria-controls="wb-map-text-menu"]');
    const a = document.activeElement;
    return { closed: !document.querySelector(".icon-picker"), back: a === more || a === toggle, at: a?.className, log: window.__focusLog };
  });
  check("Escape closes it and focus goes back to the button (or its menu's)", esc.closed && esc.back, JSON.stringify(esc));

  // Undo takes the icon back.
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1000);
  const undone = await page.evaluate(() => wbMapIndex().nodes.find((n) => /Leaf a/.test(n.data?.content || "")).data.icon);
  check("Undo puts the previous icon back", undone && !/rocket/.test(undone), String(undone));

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
