// Dashboard, While you were away: the pair kinds (row 5, I1 passes 4 and 5).
//
//   BASE=http://127.0.0.1:8805 [THEME=dark] [W=390] node scratchpad/ui-sweeps/nightpairs.js
//
// Seeds two notes that disagree on a number and a question a later note
// answers, runs one night pass, shows the card alone, opens the tension and
// answered lines and measures: each row quotes its other side, carries an
// open-the-other-note button (and, for a tension, a link button), the rows
// fit the card, and the quoted line clears 4.5:1.
const { boot } = require("./lib.js");

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const out = [];
  const check = (name, ok, detail = "") => out.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ": " + detail : ""}`);
  const seeded = await page.evaluate(async () => {
    const notes = [
      "When is the boiler service booked for this year?",
      "The rent for the flat is 900 pounds a month.",
      "The rent for the flat is 950 pounds a month.",
      "The boiler service is booked for the fourteenth of March this year.",
    ];
    for (const content of notes) {
      await apiJson("/entries", { method: "POST", body: JSON.stringify({ content }) });
      await new Promise((r) => setTimeout(r, 1100));
    }
    const run = await apiJson("/night/run", { method: "POST", body: JSON.stringify({ budget: 50000, force: true }) });
    const hidden = Object.keys(DASH_WIDGETS).filter((n) => n !== "night");
    await setPreference("dashboard_layout", { order: ["night", ...hidden], hidden, wide: [] });
    prefsCache.dashboard_layout = { order: ["night", ...hidden], hidden, wide: [] };
    switchTab("dashboard");
    await renderDashboard();
    return run;
  });
  await page.waitForFunction(() => document.querySelectorAll(".night-kind-toggle").length > 0, null, { timeout: 15000 }).catch(() => {});
  const lines = await page.evaluate(() => [...document.querySelectorAll(".night-kind-toggle")].map((b) => b.textContent.trim()));
  check("the run found a tension and an answer", lines.some((l) => /disagree/.test(l)) && lines.some((l) => /answered later/.test(l)), JSON.stringify({ lines, seeded }));
  for (const kind of ["tension", "answered"]) {
    const r = await page.evaluate(async (kind) => {
      const toggle = [...document.querySelectorAll(".night-kind-toggle")].find((b) =>
        kind === "tension" ? /disagree/.test(b.textContent) : /answered later/.test(b.textContent)
      );
      if (!toggle) return null;
      toggle.click();
      await new Promise((r) => setTimeout(r, 800));
      const list = document.getElementById(toggle.getAttribute("aria-controls"));
      const row = list?.querySelector(".night-fact");
      if (!row) return { rows: 0 };
      const pair = row.querySelector(".night-fact-pair");
      const card = row.closest(".dash-widget, .card, section") || document.body;
      const lum = (rgb) => {
        const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      let bg = "rgb(255, 255, 255)";
      for (let n = pair; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/,\s*0\)$/.test(c) && c !== "transparent") { bg = c; break; }
      }
      const a = lum(getComputedStyle(pair).color), b = lum(bg);
      const rowRect = row.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return {
        rows: list.querySelectorAll(".night-fact").length,
        pair: pair?.textContent || null,
        buttons: [...row.querySelectorAll(".night-fact-actions button")].map((b) => b.getAttribute("aria-label")),
        contrast: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100,
        inside: rowRect.right <= cardRect.right + 0.5 && rowRect.left >= cardRect.left - 0.5,
        overflow: row.scrollWidth - row.clientWidth,
      };
    }, kind);
    if (!r) {
      check(`${kind}: its line exists`, false);
      continue;
    }
    const lead = kind === "tension" ? "Disagrees with" : "Answers";
    check(`${kind}: the row quotes its other side`, r.rows >= 1 && (r.pair || "").startsWith(lead), JSON.stringify(r.pair));
    const want = kind === "tension"
      ? ["Open the other note", "Link the two notes as disagreeing", "Open the note this came from"]
      : ["Open the note with the question", "Open the note this came from"];
    check(`${kind}: its buttons`, want.every((w) => r.buttons.includes(w)), JSON.stringify(r.buttons));
    check(`${kind}: the quote clears 4.5:1`, r.contrast >= 4.5, String(r.contrast));
    check(`${kind}: the row fits the card`, r.inside && r.overflow <= 0, `inside ${r.inside}, overflow ${r.overflow}`);
  }
  console.log(`${W} ${process.env.THEME || "light"}`);
  console.log(out.join("\n"));
  await browser.close();
  process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
})();
