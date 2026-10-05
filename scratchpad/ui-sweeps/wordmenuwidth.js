// The word menu's width does not depend on where it was last standing
// (OPEN.md, "The word menu measures its own width before it is placed").
// A `position: fixed` box with `left` set and no `right` is shrink-to-fit
// against the room to its right, so a menu measured while still parked near
// the right edge reads narrower than it will draw. The probe opens the same
// finding's menu three times: anchored left (the reference width), then
// anchored at the right edge straight after, then anchored left again after
// the right-edge open, then a short menu at the edge followed by a long one
// (the stale position is what the measure would see).
// Each must draw at the reference width, inside the window, not over its word.
//   BASE=http://127.0.0.1:8798 VIEWPORT=390x844 THEME=dark node wordmenuwidth.js
const { boot } = require("./lib.js");

const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const CONTENT = [
  "Width probe",
  "",
  "A line where the word seperate is spelled wrong and so is recieve here.",
].join("\n");

(async () => {
  const { page, browser } = await boot({ viewport: { width: vw, height: vh } });
  let fails = 0;
  const check = (ok, label) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${label}`); };
  await page.evaluate(async (content) => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Word menu width", content }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 2500));
  }, CONTENT);
  const open = (x, long = true) => page.evaluate(([x, long]) => {
    const found = docProseFound.find((f) => /seperate|recieve/.test(f.text || ""));
    if (!found) return null;
    // A long candidate, the case the row names: wider than the 15rem floor.
    const f = long ? Object.assign({}, found, { replacement: "a considerably longer replacement phrase" }) : found;
    closeDocSuggest();
    const rect = { left: x, right: x + 40, top: 200, bottom: 218 };
    openDocSuggest(f, rect, false);
    const m = document.getElementById("doc-suggest-menu").getBoundingClientRect();
    return { left: Math.round(m.left), right: Math.round(m.right), width: Math.round(m.width), top: Math.round(m.top), vw: innerWidth };
  }, [x, long]);
  const ref = await open(Math.round(vw * 0.1));
  if (!ref) { console.log("FAIL no finding to open"); await browser.close(); process.exit(1); }
  const edge = await open(vw - 48);
  const back = await open(Math.round(vw * 0.1));
  // The case that shrinks: a short menu left standing at the right edge, then
  // a long one opened while it is still there.
  await open(vw - 48, false);
  const grown = await open(vw - 48);
  console.log(JSON.stringify({ ref, edge, back, grown }));
  check(Math.abs(grown.width - ref.width) <= 1, `a long menu opened over a short one at the edge draws at the reference width (${grown.width} vs ${ref.width})`);
  check(Math.abs(edge.width - ref.width) <= 1, `right-edge open draws at the reference width (${edge.width} vs ${ref.width})`);
  check(Math.abs(back.width - ref.width) <= 1, `a left open after it draws at the reference width (${back.width} vs ${ref.width})`);
  check(edge.right <= edge.vw - 7 && edge.left >= 7, `right-edge menu inside the window (${edge.left}..${edge.right} of ${edge.vw})`);
  check(edge.top >= 218, `menu below its word, not over it (top ${edge.top})`);
  console.log(fails ? `${fails} failed` : "all passed");
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
