// The documents live view on a phone, with its formatting bar, its "/" menu
// and its selection bubble (DOCUMENTS_PLAN 17 "the phone is untouched by this
// section", 18 "none of the above is measured on a phone yet"). 390x844 with
// touch, light and dark (THEME), shots to $SCRATCH/shots/docphonebar-*.
//   THEME=dark node scratchpad/ui-sweeps/docphonebar.js
const { boot } = require("./lib.js");
const THEME = process.env.THEME || "light";
const [W, H] = (process.env.SIZE || "390x844").split("x").map(Number);
const SHOTS = (process.env.SCRATCH || ".") + "/shots";
const CONTENT = [
  "# Phone page",
  "",
  "The first line of the document, with **bold**, *italic*, `code` and a [link](https://example.com).",
  "",
  "## A section",
  "",
  "- one item",
  "- [ ] a task",
  "",
  "> A quotation that wraps over more than one line at a phone's width.",
  "",
  "| A | B |",
  "| --- | --- |",
  "| 1 | 2 |",
  "",
  "```js",
  "const x = 1;",
  "```",
  "",
  ...Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1} with enough words in it to wrap at a phone's width.`),
  "",
  "The last line.",
].join("\n");

(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + JSON.stringify(detail) : ""}`);
  };
  const { page, browser } = await boot({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(async (content) => {
    const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
    const d = await (await fetch("/documents", { method: "POST", headers, body: JSON.stringify({ title: "Phone page", content }) })).json();
    switchTab("documents");
    await new Promise((r) => setTimeout(r, 800));
    await openDocument(d.id);
    await new Promise((r) => setTimeout(r, 2000));
    if (typeof setDocView === "function") setDocView("live");
    await new Promise((r) => setTimeout(r, 1000));
  }, CONTENT);

  const rect = (sel) => page.evaluate((s) => {
    const el = typeof s === "string" ? document.querySelector(s) : null;
    if (!el || !el.getClientRects().length) return null;
    const r = el.getBoundingClientRect();
    return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) };
  }, sel);

  // The page at rest.
  const rest = await page.evaluate(() => {
    const bar = document.getElementById("doc-phone-bar");
    const cs = getComputedStyle(bar);
    const btns = [...bar.querySelectorAll("button")].filter((b) => b.getClientRects().length);
    const tabbar = document.querySelector(".mobile-tabbar, #mobile-tabbar, .bottom-tabs");
    const scroller = document.querySelector("#doc-editor-cm .cm-scroller") || document.querySelector(".cm-scroller");
    const line = document.querySelector(".cm-line");
    return {
      bar: (() => { const r = bar.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, bg: cs.backgroundColor, border: cs.borderTopColor }; })(),
      buttons: btns.map((b) => { const r = b.getBoundingClientRect(); return { label: b.getAttribute("aria-label") || b.title || b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left) }; }),
      scroller: scroller ? (() => { const r = scroller.getBoundingClientRect(); return { t: r.top, b: r.bottom, sh: scroller.scrollHeight, ch: scroller.clientHeight }; })() : null,
      status: (() => { const s = document.getElementById("doc-statusbar"); if (!s || !s.getClientRects().length) return null; const r = s.getBoundingClientRect(); return { t: r.top, b: r.bottom }; })(),
      card: (() => { const r = document.querySelector("#tab-documents .doc-main").getBoundingClientRect(); return { t: r.top, b: r.bottom }; })(),
      firstLineLeft: line ? Math.round(line.getBoundingClientRect().left) : null,
      lineFont: line ? getComputedStyle(line).fontSize : null,
      pageX: document.documentElement.scrollWidth > innerWidth,
      tabbar: tabbar ? tabbar.getBoundingClientRect().top : null,
    };
  });
  console.log("rest", JSON.stringify(rest));
  check("no horizontal page scroll", !rest.pageX);
  check("every bar button is 44px or more", rest.buttons.every((b) => b.w >= 44 && b.h >= 44), rest.buttons.map((b) => `${b.label} ${b.w}x${b.h}`));
  check("the bar's buttons fit in the window", rest.buttons.every((b) => b.x >= 0 && b.x + b.w <= W));
  // The bar is fixed: the page must stop where it starts, or what is under it
  // (the status line) is never seen, and the writing must run down to it.
  check("the card ends above the bar", rest.card.b <= rest.bar.t + 0.5, { card: rest.card.b, bar: rest.bar.t });
  check("the status line is not under the bar", !rest.status || rest.status.b <= rest.bar.t + 0.5, { status: rest.status, bar: rest.bar.t });
  check("no blank band between the writing and the status line", rest.scroller && rest.status && rest.status.t - rest.scroller.b < 24,
    { scrollerBottom: rest.scroller && rest.scroller.b, statusTop: rest.status && rest.status.t });
  await page.screenshot({ path: `${SHOTS}/docphonebar-${THEME}-rest.png` });

  // A selection: the bubble must sit in the window and not under the bar.
  await page.evaluate(() => {
    const s = docSurface();
    const at = s.text.indexOf("first line");
    s.focus();
    s.setSelectionRange(at, at + 10);
  });
  await page.waitForTimeout(500);
  const bubble = await page.evaluate(() => {
    const cands = [...document.querySelectorAll(".doc-selection-toolbar, .selection-toolbar, .cm-selection-toolbar, .doc-format-bubble, [data-selection-toolbar]")]
      .filter((el) => el.getClientRects().length && !el.classList.contains("hidden"));
    return cands.map((el) => { const r = el.getBoundingClientRect(); return { cls: el.className, l: r.left, r: r.right, t: r.top, b: r.bottom }; });
  });
  console.log("bubble", JSON.stringify(bubble));
  for (const b of bubble) check(`selection bubble inside the window (${b.cls})`, b.l >= 0 && b.r <= W && b.t >= 0 && b.b <= rest.bar.t, b);
  await page.screenshot({ path: `${SHOTS}/docphonebar-${THEME}-select.png` });

  // The "/" menu from the bar.
  await page.evaluate(() => {
    const s = docSurface();
    const at = s.text.indexOf("Paragraph 3");
    s.focus();
    s.setSelectionRange(at - 1, at - 1);
  });
  await page.click("#doc-phone-insert");
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() => {
    const m = document.getElementById("editor-menu");
    if (!m || m.classList.contains("hidden")) return null;
    const r = m.getBoundingClientRect();
    const rows = [...m.querySelectorAll(".editor-menu-item")];
    const vis = rows.filter((x) => { const q = x.getBoundingClientRect(); return q.bottom > r.top && q.top < r.bottom; });
    const hs = rows.map((x) => x.getBoundingClientRect().height);
    const caret = (() => { const s = window.getSelection(); return s.rangeCount ? s.getRangeAt(0).getBoundingClientRect() : null; })();
    return {
      l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height,
      scrolls: m.scrollHeight > m.clientHeight, rows: rows.length, visible: vis.length,
      minRow: Math.min(...hs), maxRow: Math.max(...hs),
      caret: caret ? { t: caret.top, b: caret.bottom } : null,
      overflowX: m.scrollWidth > m.clientWidth,
    };
  });
  console.log("menu", JSON.stringify(menu));
  check("the / menu opened", !!menu);
  if (menu) {
    check("the / menu sits inside the window", menu.l >= 0 && menu.r <= W && menu.t >= 0 && menu.b <= H, menu);
    check("the / menu clears the phone bar", menu.b <= rest.bar.t + 0.5, { menuBottom: menu.b, barTop: rest.bar.t });
    check("the / menu has no sideways scroll", !menu.overflowX);
    check("the / menu's rows are 44px on touch", menu.minRow >= 44, { min: menu.minRow, max: menu.maxRow });
    check("the / menu shows at least four rows", menu.visible >= 4, menu.visible);
  }
  await page.screenshot({ path: `${SHOTS}/docphonebar-${THEME}-menu.png` });
  await page.keyboard.press("Escape");

  check("no console errors", errors.length === 0, errors.slice(0, 3));
  console.log(fails ? `${fails} FAIL` : "ALL PASS");
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
