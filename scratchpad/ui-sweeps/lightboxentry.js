// **The lightbox's buttons work from every door** (INBOX 421 g, the owner:
// "the lightbox buttons below the image are greyed out?? i opened the image
// from within a note in the your notes subtab").
//
// One picture, uploaded; a note that shows it inline. The lightbox is opened
// from the note in Notes (Your notes), from the Library's Images, and from a
// document that shows the same picture. For each: every button in the row
// under the picture is enabled, fully opaque (its own opacity and every
// ancestor's), the topmost element at its middle is the button itself (no
// backdrop or stage over it), and a real click on Zoom in changes the zoom.
//
//   BASE=http://127.0.0.1:8793 SCRATCH=/tmp/mm PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/lightboxentry.js
const { boot } = require("./lib.js");

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

// A 64x48 PNG, drawn in the page, so the sweep needs no fixture file.
async function seed(page) {
  return page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 48;
    const g = c.getContext("2d");
    g.fillStyle = "#3a7"; g.fillRect(0, 0, 64, 48);
    g.fillStyle = "#fff"; g.fillRect(8, 8, 30, 12);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const fd = new FormData();
    fd.append("file", new File([blob], `lightbox-door-${Date.now()}.png`, { type: "image/png" }));
    fd.append("direct", "true");
    const r = await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } });
    const media = await r.json();
    const url = media.url || `/media/${media.filename || media.name}`;
    const entry = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Lightbox door note\n\n![A green test picture](${url})` }) });
    return { media, url, entry: entry.id };
  });
}

function measure() {
  // Contrast of a button's word against what is really behind it: the page,
  // the lightbox's scrim over it, then the button's own fill over that. A
  // light theme's ghost ink on the dark scrim is exactly "greyed out".
  const rgba = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const box = [...document.querySelectorAll(".lightbox")].pop();
  if (!box) return { open: false };
  const buttons = [...box.querySelectorAll(".lightbox-column button")].filter((b) => !b.classList.contains("hidden") && b.getBoundingClientRect().width);
  const rows = buttons.map((b) => {
    let op = 1;
    for (let el = b; el; el = el.parentElement) op *= parseFloat(getComputedStyle(el).opacity) || 0;
    const r = b.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { name: (b.title || b.textContent || "").trim().slice(0, 24), disabled: b.disabled || b.getAttribute("aria-disabled") === "true",
      opacity: op, onTop: Boolean(top && (top === b || b.contains(top))), topIs: top ? `${top.tagName.toLowerCase()}.${String(top.className).split(" ").slice(0, 2).join(".")}` : "none",
      filter: getComputedStyle(b).filter, color: getComputedStyle(b).color,
      contrast: (() => {
        let ground = rgba(getComputedStyle(document.body).backgroundColor);
        if (ground.a < 1) ground = over(ground, { r: 255, g: 255, b: 255, a: 1 });
        const chain = [];
        for (let el = b; el && el !== box.parentElement; el = el.parentElement) chain.unshift(el);
        for (const el of chain) ground = over(rgba(getComputedStyle(el).backgroundColor), ground);
        const ink = rgba(getComputedStyle(b).color);
        return ratio(over(ink, ground), ground);
      })() };
  });
  return { open: true, rows, zoom: box.querySelector(".lightbox-zoom-label")?.textContent || "" };
}

async function door(page, name, open) {
  await open();
  await page.waitForTimeout(900);
  const m = await page.evaluate(measure);
  if (!m.open) { check(`${name}: the lightbox opens`, false); return; }
  const bad = m.rows.filter((r) => r.disabled || r.opacity < 0.99 || !r.onTop);
  check(`${name}: every button in the viewer is live (${m.rows.length})`, m.rows.length > 0 && bad.length === 0,
    bad.map((r) => `${r.name}: disabled ${r.disabled}, opacity ${r.opacity.toFixed(2)}, top ${r.topIs}`).join("; "));
  const worst = Math.min(...m.rows.map((r) => r.contrast));
  check(`${name}: every button's word reads on what is behind it (4.5:1)`, worst >= 4.5,
    m.rows.map((r) => `${r.name} ${r.contrast.toFixed(2)}`).join(", "));
  const zin = await page.evaluate(() => {
    const b = [...[...document.querySelectorAll(".lightbox")].pop().querySelectorAll(".lightbox-actions button")].find((x) => /zoom in/i.test(x.title));
    if (!b || b.classList.contains("hidden")) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (zin) {
    await page.mouse.click(zin.x, zin.y);
    await page.waitForTimeout(250);
    const after = await page.evaluate(measure);
    check(`${name}: a real click on Zoom in zooms`, after.zoom && after.zoom !== m.zoom, `${m.zoom || "?"} -> ${after.zoom || "?"}`);
  }
  await page.screenshot({ path: `${process.env.SCRATCH || "."}/shots/lightboxentry-${name.replace(/\W+/g, "-")}-${process.env.THEME || "light"}.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  try {
    const s = await seed(page);
    console.log("  seeded", JSON.stringify(s).slice(0, 300));
    await door(page, "note in Your notes", async () => {
      await page.evaluate(() => switchTab("notes"));
      await page.waitForTimeout(1500);
      const img = await page.evaluate(() => {
        const el = [...document.querySelectorAll("img")].find((i) => i.alt === "A green test picture" && i.getBoundingClientRect().width);
        if (!el) return null;
        el.scrollIntoView({ block: "center" });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, cls: el.className };
      });
      if (!img) { console.log("  no inline picture in the notes list"); return; }
      console.log(`  clicking ${img.cls}`);
      await page.mouse.click(img.x, img.y);
    });
    // The shape the chat's attachments and a document's pictures open with:
    // one item, a filename and a URL, no Library row behind it.
    await door(page, "a bare item (chat, document)", async () => {
      await page.evaluate((url) => openLightbox([{ filename: "A green test picture", getUrl: () => mediaSrc(url) }], 0), s.url);
    });
    await door(page, "Library images", async () => {
      await page.evaluate(() => switchTab("library"));
      await page.waitForTimeout(800);
      await page.evaluate(() => [...document.querySelectorAll("#library-subtabs button")].find((b) => /image/i.test(b.textContent || ""))?.click());
      await page.waitForTimeout(2000);
      const at = await page.evaluate((file) => {
        const imgs = [...document.querySelectorAll("img")].filter((i) => i.getBoundingClientRect().width
          && (i.closest("[data-id], li, article, .card")?.textContent || "").includes(file));
        const el = imgs[0];
        if (!el) return null;
        el.scrollIntoView({ block: "center" });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, s.media.filename);
      if (!at) { console.log("  no Library tile for the picture"); return; }
      await page.mouse.click(at.x, at.y);
    });
  } finally {
    await browser.close();
  }
  console.log(failures ? `${failures} failed` : "all passed");
  process.exit(failures ? 1 : 0);
})();
