// INBOX 654: the navigation-history popup's rows. A row is an icon for its
// kind, the thing's plain-text title, a thumbnail when a note opens with an
// image, and the tab / sub-tab as a muted second line; consecutive identical
// rows collapse into one. Measured, not looked at: row text has no '#', '![',
// '_' or 'http'; an image note has a thumbnail; the current row is marked;
// nothing overflows the viewport at 390 and 1440; and text contrast, light
// and dark (THEME=dark), against the row's own background.
//
//   BASE=http://127.0.0.1:8799 [WIDTH=390] [THEME=dark] node navhistory-rows.js
const { boot } = require("./lib.js");
const WIDTH = Number(process.env.WIDTH || 1440);
const PHONE = WIDTH < 600;
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=";
let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: PHONE ? 844 : 900 }, hasTouch: PHONE, isMobile: PHONE });
  const ids = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append("file", new File([bytes], "WallpaperEngineOverride_random_1.png", { type: "image/png" }));
    fd.append("direct", "true");
    const up = await (await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } })).json();
    const url = up.url || up.path;
    const make = async (content) => (await (await api("/entries", { method: "POST", body: JSON.stringify({ content, tags: ["navrows"] }) })).json()).id;
    return {
      image: await make(`# Girl with bell\n\n![](${url})\n\nWallpaperEngineOverride_random_1.png`),
      captioned: await make(`![Girl with bell](${url})`),
      bare: await make(`![](${url})`),
      md: await make("## **Bold** and *soft* [a link](https://example.com/xy) title\n\nbody"),
      plain: await make("Just a plain first line\nsecond line"),
    };
  }, PNG);
  await page.evaluate(async () => { await loadEntries(); });
  await page.waitForTimeout(800);

  const go = async (fn, ...args) => { await page.evaluate(fn, ...args); await page.waitForTimeout(500); };
  await go(() => switchTab("notes"));
  for (const id of [ids.image, ids.captioned, ids.bare, ids.md, ids.plain]) await go((i) => flashEntry(i), id);
  //: The Library's sub-tabs, each visited twice in a row by two routes: the
  //: repeated rows the owner saw (AI skills, Files, Images twice).
  await go(() => switchTab("library"));
  for (const kind of ["files", "images", "images"]) {
    await go((k) => document.querySelector(`[data-media-kind="${k}"]`)?.click(), kind);
  }
  await go(() => switchTab("dashboard"));
  await go((id) => flashEntry(id), ids.image);

  await page.evaluate(() => openNavHistoryMenu(document.getElementById("status-nav-history")));
  await page.waitForFunction(() => document.querySelector("#status-nav-history-menu .nav-history-item"), null, { timeout: 8000 });
  await page.waitForTimeout(1200);
  const rows = await page.evaluate(() => {
    const menu = document.getElementById("status-nav-history-menu");
    const mr = menu.getBoundingClientRect();
    return {
      menu: { left: mr.left, right: mr.right, top: mr.top, vw: innerWidth, scrollW: menu.scrollWidth, clientW: menu.clientWidth },
      stack: tabHistory.stack.length,
      rows: [...menu.querySelectorAll(".nav-history-item")].map((r) => {
        const rr = r.getBoundingClientRect();
        const title = r.querySelector(".nav-history-title");
        const sub = r.querySelector(".nav-history-sub");
        const img = r.querySelector("img.nav-history-thumb");
        return {
          text: r.textContent.trim(), title: title?.textContent || "", sub: sub?.textContent || "",
          icon: !!r.querySelector("i.ph"), thumb: !!img, thumbLoaded: img ? img.complete && img.naturalWidth > 0 : false,
          thumbLazy: img?.loading === "lazy", current: r.classList.contains("nav-history-current"),
          ariaCurrent: r.getAttribute("aria-current"), h: rr.height, right: rr.right, rowScrollW: r.scrollWidth, rowClientW: r.clientWidth,
        };
      }),
    };
  });
  rows.rows.forEach((r) => console.log(`  ${r.current ? "*" : " "} [${r.icon ? "i" : "-"}${r.thumb ? "T" : "-"}] ${JSON.stringify(r.title)} / ${JSON.stringify(r.sub)}   raw=${JSON.stringify(r.text.slice(0, 60))}`));
  const bannedRe = /#|!\[|_|http/;
  ok("no row text carries markdown or a file name", rows.rows.every((r) => !bannedRe.test(r.text)), rows.rows.filter((r) => bannedRe.test(r.text)).map((r) => r.text.slice(0, 40)).join(" | "));
  ok("every row has a kind icon", rows.rows.every((r) => r.icon));
  ok("every row has a title line", rows.rows.every((r) => r.title));
  ok("a note row opening with an image has a loaded, lazy thumbnail", rows.rows.some((r) => r.thumb && r.thumbLoaded && r.thumbLazy), `${rows.rows.filter((r) => r.thumb).length} thumbs`);
  ok("a note row without an image has no thumbnail", rows.rows.some((r) => !r.thumb && /plain first line/.test(r.title)));
  ok("an image-only note is titled Image or its caption", rows.rows.some((r) => r.title === "Image") && rows.rows.some((r) => r.title === "Girl with bell"));
  ok("tab rows carry the tab as a muted second line", rows.rows.some((r) => r.sub === "Library") && rows.rows.some((r) => r.sub === "Notes"));
  ok("exactly one current row, marked for assistive tech", rows.rows.filter((r) => r.current).length === 1 && rows.rows.filter((r) => r.ariaCurrent === "page").length === 1);
  const keys = rows.rows.map((r) => `${r.title}|${r.sub}`);
  ok("no two neighbouring rows are identical", keys.every((k, i) => i === 0 || k !== keys[i - 1]), keys.join(" // "));
  ok("history itself is not deduped (stack longer than rows)", rows.stack > rows.rows.length, `${rows.stack} entries, ${rows.rows.length} rows`);
  ok("the menu sits inside the viewport", rows.menu.left >= 0 && rows.menu.right <= rows.menu.vw, JSON.stringify(rows.menu));
  ok("no row is wider than its menu", rows.menu.scrollW <= rows.menu.clientW + 1 && rows.rows.every((r) => r.rowScrollW <= r.rowClientW + 1), `scroll ${rows.menu.scrollW}/${rows.menu.clientW}`);
  ok("rows keep the menu recipe's 2rem floor and are not clipped", rows.rows.every((r) => r.h >= 31.5), `min ${Math.min(...rows.rows.map((r) => r.h)).toFixed(1)}px`);

  //: Contrast of every text node in the open menu against its opaque ground.
  const low = await page.evaluate(() => {
    //: Chromium reports color-mix() as `color(srgb ...)`, which a regex on
    //: rgb() misses (read as white: a false 1.19 in dark); the canvas resolves
    //: any colour to bytes, as contrast.js does.
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const parse = (c) => {
      if (!c || c === "transparent") return null;
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      const m = c.match(/\/\s*([\d.]+)\)$/) || c.match(/rgba\([^)]*,\s*([\d.]+)\)$/);
      return { r: d[0], g: d[1], b: d[2], a: /^rgb\(|^color\(srgb [^/]*\)$/.test(c) ? 1 : m ? +m[1] : d[3] / 255 };
    };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a >= 0.9) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
    const out = []; let checked = 0, min = 99;
    for (const el of document.querySelectorAll("#status-nav-history-menu *")) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg) continue;
      checked++; const r = ratio(fg, bgOf(el)); min = Math.min(min, r);
      if (r < 4.5) out.push(`${r.toFixed(2)} ${el.className} "${el.textContent.slice(0, 20)}"`);
    }
    return { out, checked, min };
  });
  ok(`text contrast >= 4.5 (${process.env.THEME || "light"})`, !low.out.length && low.checked > 0, `${low.checked} text nodes, min ${low.min.toFixed(2)}${low.out.length ? " " + low.out.join("; ") : ""}`);

  const before = await page.evaluate(() => tabHistory.index);
  await page.evaluate(() => document.querySelectorAll("#status-nav-history-menu button.nav-history-item")[1]?.click());
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ index: tabHistory.index, hidden: document.getElementById("status-nav-history-menu").classList.contains("hidden") }));
  ok("pressing a row jumps there and closes the list", after.index !== before && after.hidden, `${before} -> ${after.index}`);
  console.log(`== done at ${WIDTH}, theme ${process.env.THEME || "light"}: ${bad} failing`);
  await browser.close();
  process.exitCode = bad ? 1 : 0;
})();
