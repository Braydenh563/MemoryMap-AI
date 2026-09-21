// The shared spinner is a circle in a tight row, not only in a roomy one.
//
// INBOX 293, the owner: the "re-evaluating" animation in the note badge
// "isnt quite right". `.chip` is an inline-flex row, so a spinner inside one
// is a flex item and took the default `flex-shrink: 1`. Measured before the
// fix: 9.45 by 10.8 in a 70px row against the 10.8 square it has when there
// is room, a ratio of 0.875. A ring rotating inside a box that is not square
// wobbles, and that is what an ellipse spinning looks like.
//
// This measures the shape rather than watching the animation, which is the
// only way a sweep can see it at all.
const { boot } = require("./lib.js");

let failures = 0;
function ok(label, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  — ${detail}`);
  if (!pass) failures += 1;
}

// Wide enough for the chip to sit whole, and narrow enough to squeeze it.
const WIDTHS = [400, 120, 70, 48];

(async () => {
  const { page, browser } = await boot({ width: 390, height: 844 });

  const rows = await page.evaluate((widths) => {
    const out = [];
    for (const width of widths) {
      const host = document.createElement("div");
      host.style.display = "flex";
      host.style.width = `${width}px`;
      host.style.overflow = "hidden";
      document.body.appendChild(host);
      // The busy chip exactly as app.js builds it.
      const chip = document.createElement("span");
      chip.className = "chip chip-busy";
      chip.textContent = "Re-evaluating…";
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      chip.prepend(spinner);
      host.appendChild(chip);
      const box = spinner.getBoundingClientRect();
      out.push({
        width,
        w: +box.width.toFixed(2),
        h: +box.height.toFixed(2),
        origin: getComputedStyle(spinner).transformOrigin,
      });
      host.remove();
    }
    return out;
  }, WIDTHS);

  for (const row of rows) {
    const ratio = row.h ? +(row.w / row.h).toFixed(3) : 0;
    ok(
      `the ring is square in a ${row.width}px row`,
      Math.abs(ratio - 1) < 0.02,
      `${row.w} by ${row.h}, ratio ${ratio}`,
    );
  }

  // A ring that spins about anything but its own centre traces a circle
  // instead of turning on the spot, which reads as a wobble too.
  const centred = rows.every((row) => {
    const parts = row.origin.split(" ").map(parseFloat);
    return (
      parts.length === 2 &&
      Math.abs(parts[0] - row.w / 2) < 0.1 &&
      Math.abs(parts[1] - row.h / 2) < 0.1
    );
  });
  ok("and it turns about its own centre at every width", centred, rows[0].origin);

  await browser.close();
  console.log(failures ? `FAILURES: ${failures}` : "ALL PASS");
  process.exit(failures ? 1 : 0);
})();
