// Name marks told apart (INBOX 409, "I want the generation of persona icons
// to be improved"). Draws `nameMark` at 40px for the built-in personas that
// get one (Atlas keeps the app's emblem), "You" and twenty everyday names,
// captures each as a PNG and has scratchpad/pngpixel.py's reader count, for
// every pair, the share of pixels that differ (any channel by more than 32).
// A pair under MIN (15%) is a finding: two marks a reader could mistake for
// one another. Also checks the same name draws the same mark twice and that
// two marks on one page never share an id.
//
//   BASE=http://127.0.0.1:8786 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node namemarks.js
// SHOTS=1 also writes a contact sheet to $SCRATCH/shots/namemarks.png.
const { boot } = require("./lib.js");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const MIN = 0.15;
const NAMES = [
  "Coach", "Analyst", "You",
  "Alice", "Ben", "Chloe", "Daniel", "Emma", "Farah", "George", "Hana",
  "Isaac", "Jade", "Kiran", "Liam", "Maya", "Noah", "Olivia", "Priya",
  "Quinn", "Ravi", "Sofia", "Tom",
];

const COMPARE = `
import itertools, json, sys
sys.path.insert(0, sys.argv[1])
from pngpixel import read_png
names = json.loads(sys.argv[3])
imgs = {}
for n in names:
    w, h, rows = read_png(f"{sys.argv[2]}/{n}.png")
    imgs[n] = [px[:3] for row in rows for px in row]
out = []
for a, b in itertools.combinations(names, 2):
    pa, pb = imgs[a], imgs[b]
    diff = sum(1 for p, q in zip(pa, pb) if max(abs(p[i] - q[i]) for i in range(3)) > 32)
    out.append([a, b, diff / len(pa)])
print(json.dumps(out))
`;

(async () => {
  const findings = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "namemarks-"));
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const facts = await page.evaluate((names) => {
    const sheet = document.createElement("div");
    sheet.id = "namemark-sheet";
    sheet.className = "namemark-sheet";
    document.body.appendChild(sheet);
    for (const name of names) {
      const cell = document.createElement("span");
      cell.dataset.name = name;
      cell.appendChild(nameMark(name, 40));
      sheet.appendChild(cell);
    }
    const ids = [...sheet.querySelectorAll("[id]")].map((el) => el.id);
    const again = nameMark("Coach", 40);
    const first = sheet.querySelector('[data-name="Coach"] svg');
    const strip = (svg) => svg.outerHTML.replace(/nm-[a-z0-9]+/g, "");
    return { ids: ids.length, unique: new Set(ids).size, same: strip(again) === strip(first) };
  }, NAMES);
  if (facts.ids !== facts.unique) findings.push(`${facts.ids - facts.unique} ids repeat on one page`);
  if (!facts.same) findings.push("the same name drew two different marks");
  // Fixed on a plain white ground, top left, so the capture measures the
  // mark and nothing of the page behind it. Set through the CSSOM: the CSP
  // refuses an injected <style>.
  await page.evaluate(() => {
    const sheet = document.getElementById("namemark-sheet");
    Object.assign(sheet.style, {
      position: "fixed", left: "0", top: "0", zIndex: "99999", background: "#fff",
      display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px", width: "520px",
    });
    for (const cell of sheet.children) {
      Object.assign(cell.style, { display: "block", width: "40px", height: "40px", lineHeight: "0" });
    }
  });
  for (const name of NAMES) {
    await page.locator(`#namemark-sheet [data-name="${name}"]`).screenshot({ path: `${dir}/${name}.png` });
  }
  if (process.env.SHOTS) {
    const out = (process.env.SCRATCH || ".") + "/shots";
    fs.mkdirSync(out, { recursive: true });
    await page.locator("#namemark-sheet").screenshot({ path: `${out}/namemarks.png` });
  }
  await browser.close();
  const pairs = JSON.parse(
    execFileSync("python3", ["-c", COMPARE, path.resolve(__dirname, ".."), dir, JSON.stringify(NAMES)], {
      encoding: "utf8",
    })
  );
  pairs.sort((a, b) => a[2] - b[2]);
  const mean = pairs.reduce((s, p) => s + p[2], 0) / pairs.length;
  console.log(`${NAMES.length} marks, ${pairs.length} pairs: min ${(pairs[0][2] * 100).toFixed(1)}% (${pairs[0][0]}/${pairs[0][1]}), mean ${(mean * 100).toFixed(1)}%`);
  console.log("closest five: " + pairs.slice(0, 5).map((p) => `${p[0]}/${p[1]} ${(p[2] * 100).toFixed(1)}%`).join(", "));
  for (const [a, b, d] of pairs) if (d < MIN) findings.push(`${a} and ${b} differ in ${(d * 100).toFixed(1)}% of pixels`);
  fs.rmSync(dir, { recursive: true, force: true });
  for (const f of findings) console.log("    " + f);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : "PASS: 0 findings");
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log("ERR " + e.message); process.exit(1); });
