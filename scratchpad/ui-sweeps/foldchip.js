// The picture card's reading fold, as a share of its content column (OPEN.md,
// Library, "The fold chip is 128.8px of a 156.3px content column at 1440").
// Seeds one PNG with a reading, opens Library > Images, and measures the
// reading's chip (since INBOX 279 a `.library-image-text-chip` that opens the
// lightbox, no longer a fold) against the card's column. Pass: the chip is
// the one-word "Text" and under half the column.
//   BASE=http://127.0.0.1:8798 VIEWPORT=390x844 THEME=dark node foldchip.js
const { boot } = require("./lib.js");

const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAQklEQVR4nO3PQQ0AIBDAMMC/5+ONAvZoFSzZnplZ+wYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD7AQ3jAV9N9Sb5AAAAAElFTkSuQmCC";

(async () => {
  const { page, browser } = await boot({ viewport: { width: vw, height: vh } });
  let fails = 0;
  const check = (ok, label) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${label}`); };
  await page.evaluate(async (b64) => {
    const have = await (await api("/media?limit=200")).json();
    if (have.some((r) => r.original_name === "fold-probe.png")) return;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append("file", new File([bytes], "fold-probe.png", { type: "image/png" }));
    fd.append("direct", "true");
    const res = await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } });
    const row = await res.json();
    await api(`/media/${row.id}/vision-ocr`, { method: "POST", body: JSON.stringify({ text: "Quarterly totals, page one" }) });
  }, PNG);
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("#library-subtabs button, [data-subtab]")]
      .find((e) => /image/i.test(e.textContent || e.dataset.subtab || ""));
    if (b) b.click();
  });
  await page.waitForTimeout(1800);
  const out = await page.evaluate(() => [...document.querySelectorAll(".library-image-tile")].map((t) => {
    const s = t.querySelector(".library-image-text-chip");
    if (!s) return null;
    const col = s.closest(".library-image-meta").parentElement;
    return { label: s.textContent.trim(), chip: +s.getBoundingClientRect().width.toFixed(1), column: +col.getBoundingClientRect().width.toFixed(1) };
  }).filter(Boolean));
  console.log(JSON.stringify(out));
  check(out.length >= 1, `a card with a reading fold (${out.length})`);
  for (const o of out) {
    check(o.label === "Text", `the chip says "Text" (${o.label})`);
    check(o.chip / o.column < 0.5, `chip ${o.chip}px of a ${o.column}px column (${Math.round((100 * o.chip) / o.column)}%)`);
  }
  console.log(fails ? `${fails} failed` : "all passed");
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
