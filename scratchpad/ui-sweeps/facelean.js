// Round 7 (INBOX 430): "generated faces vary expression slightly per
// character". Draws eight characters in each of a few moods (the mood from
// the name, "Happy Ann" and so on) and counts the distinct eye, brow and
// mouth choices per mood (`nameMarkLean`); shoots the grid to
// $SCRATCH/shots/facelean-<TAG>.png. Exits 1 when a mood with leanings
// draws every character the same, or a character's pick for a mood is not
// the same twice.
const { boot } = require("./lib.js");

(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 });
  const r = await page.evaluate(() => {
    const names = ["Ann", "Bob", "Cleo", "Dev", "Eli", "Fay", "Gus", "Hana"];
    const moods = ["happy", "sad", "surprised", "sleepy", "calm"];
    const grid = document.createElement("div");
    grid.style.position = "fixed";
    grid.style.inset = "0";
    grid.style.zIndex = "99999";
    grid.style.background = "white";
    grid.style.padding = "16px";
    const out = {};
    for (const mood of moods) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "8px";
      const picks = new Set();
      let stable = true;
      for (const n of names) {
        const seed = `${mood[0].toUpperCase()}${mood.slice(1)} ${n}`;
        row.appendChild(drawCharacter(seed, 96));
        //: The same hash `drawCharacter` takes, through `nameMarkLean`
        //: directly, twice.
        const reading = nameMood(seed);
        const face = NAME_MARK_FACES[reading.mood] || {};
        let h = 2166136261;
        for (const ch of seed) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
        const a = JSON.stringify(nameMarkLean(face, reading.mood, h));
        const b = JSON.stringify(nameMarkLean(face, reading.mood, h));
        if (a !== b) stable = false;
        picks.add(a);
      }
      grid.appendChild(row);
      out[mood] = { variants: picks.size, stable, mood: nameMood(`${mood} Ann`).mood };
    }
    document.body.appendChild(grid);
    return out;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/facelean-${process.env.TAG || "now"}.png`, clip: { x: 0, y: 0, width: 900, height: 560 } });
  let bad = false;
  for (const [mood, { variants, stable, mood: read }] of Object.entries(r)) {
    const miss = read === mood && (variants < 2 || !stable);
    if (miss) bad = true;
    console.log(`${mood} (read as ${read}): ${variants} different faces over 8 characters, stable ${stable}${miss ? "  MISS" : ""}`);
  }
  console.log(bad ? "FAIL" : "PASS");
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
