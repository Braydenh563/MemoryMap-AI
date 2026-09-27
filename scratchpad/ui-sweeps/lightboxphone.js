// The lightbox on a phone and a tablet (INBOX 430): "its ⋯ menu does nothing
// (no popup), and the OCR workspace isn't reachable from Library > Images",
// "the lightbox on phone needs a better layout". Opens the first image from
// Library > Images, measures the image, the caption and the action row, opens
// the ⋯ and asks the point at its first row what is drawn there, then looks
// for a way to the page reader. Shots to scratchpad/shots/phone430/.
//   TAG=before VIEW=390 node scratchpad/ui-sweeps/lightboxphone.js
const path = require("path");
const { boot } = require("./lib.js");
const TAG = process.env.TAG || "after";
const SIZES = (process.env.SIZES || "390x844,768x1024,1440x900").split(",").map((s) => s.split("x").map(Number));
(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  for (const [w, h] of SIZES) {
    const touch = w < 1200;
    const { page, browser } = await boot({ viewport: { width: w, height: h }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    //: A picture to open: the fixture has notes and boards but may have no
    //: images, so one is drawn and uploaded the way the Library's own Upload
    //: images does (`direct`).
    await page.evaluate(async () => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "" };
      const list = await (await fetch("/media?limit=5", { headers })).json().catch(() => []);
      const items = Array.isArray(list) ? list : list.items || [];
      if (items.some((m) => /\.(png|jpe?g)$/i.test(m.original_name || m.filename || ""))) return;
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 480;
      const g = c.getContext("2d");
      g.fillStyle = "#3b6ea8";
      g.fillRect(0, 0, 640, 480);
      g.fillStyle = "#fff";
      g.font = "48px sans-serif";
      g.fillText("Lightbox probe", 120, 250);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      const form = new FormData();
      form.append("file", blob, "lightbox-probe.png");
      form.append("direct", "true");
      await fetch("/media/upload", { method: "POST", headers, body: form });
    });
    const opened = await page.evaluate(async () => {
      switchTab("library");
      await new Promise((r) => setTimeout(r, 1500));
      const btn = document.querySelector('#library-subtabs button[data-media-kind="images"]')
        || [...document.querySelectorAll("#library-subtabs button")].find((b) => /images/i.test(b.textContent));
      btn?.click();
      await new Promise((r) => setTimeout(r, 2000));
      const card = document.querySelector("#library-view-media .media-card img, #library-view-media img, .library-media-grid img");
      if (!card) return "no image card";
      card.click();
      await new Promise((r) => setTimeout(r, 1500));
      return document.querySelector(".lightbox:not(.hidden)") ? "open" : "click did not open it";
    });
    check(`${w}: an image opens in the lightbox`, opened === "open", opened);
    if (opened === "open") {
      const m = await page.evaluate(() => {
        const box = document.querySelector(".lightbox:not(.hidden)");
        const r = (el) => {
          if (!el || !el.getClientRects().length) return null;
          const b = el.getBoundingClientRect();
          return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)];
        };
        const img = box.querySelector("img");
        const actions = [...box.querySelectorAll("button")].filter((b) => b.getClientRects().length).map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 24));
        const offscreen = [...box.querySelectorAll("button")].filter((b) => {
          if (!b.getClientRects().length) return false;
          const q = b.getBoundingClientRect();
          return q.right > innerWidth + 1 || q.bottom > innerHeight + 1 || q.left < -1 || q.top < -1;
        }).length;
        //: How many lines the action row takes: its buttons' distinct tops.
        const row = box.querySelector(".lightbox-actions");
        const lines = new Set([...row.children].filter((c) => c.getClientRects().length).map((c) => Math.round(c.getBoundingClientRect().top))).size;
        return { img: r(img), actions, lines, offscreen, reader: actions.some((a) => /read|text on the page|page reader/i.test(a)) };
      });
      console.log(`     ${w}`, JSON.stringify(m));
      check(`${w}: no control off screen`, m.offscreen === 0, `${m.offscreen}`);
      check(`${w}: the actions are one row`, m.lines === 1, `${m.lines} lines`);
      await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `lightbox-${TAG}-${w}.png`) });
      const menu = await page.evaluate(async () => {
        const box = document.querySelector(".lightbox:not(.hidden)");
        const more = [...box.querySelectorAll(".menu-wrap > button, button[aria-haspopup]")].find((b) => b.getClientRects().length);
        if (!more) return { found: false };
        more.click();
        await new Promise((r) => setTimeout(r, 500));
        const open = [...document.querySelectorAll(".action-menu:not(.hidden), .sheet-overlay")].find((m) => m.getClientRects().length);
        if (!open) return { found: true, open: false };
        const row = open.querySelector(".menu-item, .sheet-row, button");
        const b = row.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        const rows = [...open.querySelectorAll(".menu-item, .sheet-row")].map((x) => x.textContent.trim().slice(0, 28));
        return { found: true, open: true, drawnOnTop: Boolean(hit && open.contains(hit)), rows };
      });
      check(`${w}: the ⋯ opens a menu drawn on top`, menu.open && menu.drawnOnTop, JSON.stringify(menu));
      await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `lightbox-${TAG}-${w}-menu.png`) });
      const readerRow = (menu.rows || []).some((t) => /text on the page|read|page reader/i.test(t));
      check(`${w}: the page reader is one press away from an image`, m.reader || readerRow, m.reader ? "a button" : readerRow ? "a menu row" : "nowhere");
    }
    check(`${w}: no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : "the lightbox holds");
  process.exit(fails ? 1 : 0);
})();
