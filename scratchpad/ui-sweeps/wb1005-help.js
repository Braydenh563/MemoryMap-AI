// INBOX 566 / UX-03: the board's help and shortcut sheet. At each width and
// theme: no row's label box meets its key box, nothing overflows the card,
// every key cap is whole and inside its column, the sheet scrolls inside the
// window, the search filters, Escape closes, and the empty board's card fits.
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-help.js
// WIDTHS="1440,1024,390" THEMES="light,dark" by default.
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
const SHOTS = process.env.SHOTS || "";

async function measure(page) {
  return page.evaluate(() => {
    const card = document.getElementById("wb-help-card");
    const c = card.getBoundingClientRect();
    const out = { rows: 0, overlaps: [], outside: [], caps: [], card: [c.left, c.top, c.right, c.bottom] };
    const inside = (r, box) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
    for (const row of card.querySelectorAll(".wb-help-row")) {
      out.rows += 1;
      const label = row.querySelector(".wb-help-row-label");
      const keys = row.querySelector(".wb-help-row-keys");
      // The label's text, not its box: a grid track is as wide as the
      // track, the words may be shorter.
      const range = document.createRange();
      range.selectNodeContents(label);
      const text = [...range.getClientRects()];
      const kr = keys.getBoundingClientRect();
      for (const cap of keys.querySelectorAll("kbd")) {
        const r = cap.getBoundingClientRect();
        for (const t of text) {
          const meet = t.right > r.left + 0.5 && r.right > t.left + 0.5 && t.bottom > r.top + 0.5 && r.bottom > t.top + 0.5;
          if (meet) out.overlaps.push(`${label.textContent} | ${cap.textContent}`);
        }
        if (!inside(r, kr) || !inside(r, c) || cap.scrollWidth > cap.clientWidth + 1) out.caps.push(cap.textContent);
      }
      for (const el of [label, keys, row]) {
        if (!inside(el.getBoundingClientRect(), c)) out.outside.push(el.className + ": " + label.textContent);
      }
    }
    const sections = document.getElementById("wb-help-sections");
    out.hscroll = sections.scrollWidth > sections.clientWidth + 1 || card.scrollWidth > card.clientWidth + 1;
    out.fits = c.top >= 0 && c.bottom <= innerHeight && c.left >= 0 && c.right <= innerWidth;
    out.scrolls = sections.scrollHeight > sections.clientHeight ? getComputedStyle(sections).overflowY : "fits";
    out.columns = getComputedStyle(sections).columnCount;
    return out;
  });
}

(async () => {
  const widths = (process.env.WIDTHS || "1440,1024,390").split(",").map(Number);
  const themes = (process.env.THEMES || "light,dark").split(",");
  for (const theme of themes) {
    process.env.THEME = theme;
    for (const w of widths) {
      const phone = w < 600;
      const { browser, page, errors } = await openBoard({
        viewport: { width: w, height: phone ? 844 : 900 },
        boot: phone ? { hasTouch: true, isMobile: true } : {},
      });
      const tag = `${w} ${theme}`;
      // The empty board's card: one line and its actions, inside the canvas.
      const hint = await page.evaluate(() => {
        const inner = document.querySelector("#wb-empty-hint .wb-empty-hint-inner");
        const box = document.getElementById("whiteboard-container").getBoundingClientRect();
        const r = inner.getBoundingClientRect();
        return {
          shown: !document.getElementById("wb-empty-hint").classList.contains("hidden"),
          fits: r.left >= box.left && r.right <= box.right && inner.scrollWidth <= inner.clientWidth + 1,
        };
      });
      check(`${tag}: the empty board's card shows and fits`, hint.shown && hint.fits, hint);
      await page.click("#wb-empty-hint-keys");
      await page.waitForTimeout(400);
      check(`${tag}: the card's button opens the sheet`, await page.isVisible("#wb-help-overlay"));
      const m = await measure(page);
      check(`${tag}: rows drawn`, m.rows >= 50, m.rows);
      check(`${tag}: no label meets its keys`, m.overlaps.length === 0, m.overlaps.slice(0, 5));
      check(`${tag}: nothing outside the card`, m.outside.length === 0, m.outside.slice(0, 5));
      check(`${tag}: every key cap whole and in its column`, m.caps.length === 0, m.caps.slice(0, 5));
      check(`${tag}: no sideways scroll`, !m.hscroll);
      check(`${tag}: the card fits the window`, m.fits, m.card);
      check(`${tag}: the list scrolls inside`, m.scrolls === "auto" || m.scrolls === "fits", m.scrolls);
      check(`${tag}: ${w >= 1024 ? "two columns" : "one column"}`, String(m.columns) === (w >= 1024 ? "2" : "1"), m.columns);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/wbhelp-${w}-${theme}.png` });
      await page.fill("#wb-help-search", "lock");
      await page.waitForTimeout(200);
      const found = await page.evaluate(() => [...document.querySelectorAll(".wb-help-row-label")].map((l) => l.textContent));
      check(`${tag}: the search filters`, found.length > 0 && found.length < 6 && found.every((t) => /lock/i.test(t)), found);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      check(`${tag}: Escape closes it`, !(await page.isVisible("#wb-help-overlay")));
      // "?" on the board opens the same sheet.
      await page.focus("#whiteboard-container");
      await page.keyboard.press("?");
      await page.waitForTimeout(400);
      check(`${tag}: ? on a board opens the board's sheet`, await page.isVisible("#wb-help-overlay"));
      await page.click("#wb-help-close");
      await page.waitForTimeout(200);
      if (!phone) {
        await page.click('[aria-controls="wb-board-menu"]');
        await page.waitForTimeout(300);
        await page.click("#wb-help-btn");
        await page.waitForTimeout(300);
        check(`${tag}: Board, Keys and controls opens it`, await page.isVisible("#wb-help-overlay"));
        await page.click("#wb-help-close");
      }
      check(`${tag}: no console errors`, errors.length === 0, errors);
      await browser.close();
    }
  }
  summary();
})();
