// The guided tour, measured: every card inside the window, beside the control
// it names and never on top of it, the counter true, the buttons doing what
// they say, a hidden control costing its step, and the dim falling on the page
// and not on the thing being pointed at.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers BASE=http://127.0.0.1:8901 \
//     node scratchpad/ui-sweeps/tour.js
//
// Every line it prints is a number or a comparison of two numbers. The one
// visual claim in the whole surface, "the highlighted control is the one
// bright thing on screen", is settled with scratchpad/pngpixel.py on a capture
// rather than by looking at it: the same rule that exists because six rounds
// were spent on one popup that was eyeballed every time.
//
// `lib.js` marks the welcome AND the tour as done before the app boots, so
// neither opens by itself mid-sweep; this sweep opens the tour itself, which
// is also the path a person takes from Settings, help and guide.
const { boot } = require("./lib.js");
const { execFileSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const SHOTS = (process.env.SCRATCH || "/tmp") + "/tour-shots";
require("fs").mkdirSync(SHOTS, { recursive: true });

const failures = [];
function check(ok, line) {
  if (!ok) failures.push(line);
  console.log(`${ok ? "ok  " : "FAIL"}  ${line}`);
}

// What one step looks like from outside: the card, the control it is anchored
// to, and the three relationships between them that decide whether the step
// works at all.
const STEP_PROBE = () => {
  const card = document.getElementById("tour-card");
  const spot = document.getElementById("tour-spot");
  const text = document.getElementById("tour-text");
  const title = document.getElementById("tour-title");
  const c = card.getBoundingClientRect();
  const s = spot.getBoundingClientRect();
  const t = tourRun.el.getBoundingClientRect();
  const overlapW = Math.min(c.right, t.right) - Math.max(c.left, t.left);
  const overlapH = Math.min(c.bottom, t.bottom) - Math.max(c.top, t.top);
  // The clear distance between the card and the control, along the axis the
  // card was placed on. Negative would mean they touch or overlap.
  const gaps = [t.left - c.right, c.left - t.right, t.top - c.bottom, c.top - t.bottom];
  return {
    target: tourRun.step.target,
    counter: document.getElementById("tour-count").textContent,
    section: document.getElementById("tour-section").textContent,
    title: title.textContent,
    side: card.dataset.side,
    card: [Math.round(c.left), Math.round(c.top), Math.round(c.width), Math.round(c.height)],
    spot: [Math.round(s.left), Math.round(s.top), Math.round(s.width), Math.round(s.height)],
    anchor: [Math.round(t.left), Math.round(t.top), Math.round(t.width), Math.round(t.height)],
    overlap: overlapW > 0 && overlapH > 0 ? Math.round(overlapW * overlapH) : 0,
    gap: Math.round(Math.max(...gaps)),
    inside:
      c.left >= 0 &&
      c.top >= 0 &&
      c.right <= window.innerWidth + 0.5 &&
      c.bottom <= window.innerHeight + 0.5,
    textClipped: text.scrollHeight > text.clientHeight + 1,
    cardClipped: card.scrollHeight > card.clientHeight + 1,
    focus: document.activeElement ? document.activeElement.id : "",
    index: tourRun.index,
    total: tourRun.steps.length,
    // The cut-out has to sit on the control, or the bright area is somewhere
    // else on the page and the dim is over the control after all.
    spotCoversAnchor:
      s.left <= t.left + 1 && s.top <= t.top + 1 && s.right >= t.right - 1 && s.bottom >= t.bottom - 1,
  };
};

async function walkTour(page, label) {
  const seen = [];
  for (let guard = 0; guard < 40; guard += 1) {
    const open = await page.evaluate(() => !!tourRun);
    if (!open) break;
    const m = await page.evaluate(STEP_PROBE);
    seen.push(m);
    console.log(
      `${label} ${m.counter.padEnd(7)} ${m.target.padEnd(22)} side=${(m.side || "").padEnd(6)} ` +
        `card=${JSON.stringify(m.card).padEnd(24)} anchor=${JSON.stringify(m.anchor).padEnd(24)} ` +
        `overlap=${m.overlap} gap=${m.gap}`
    );
    check(m.inside, `${label} ${m.counter} card fully inside the window`);
    check(m.overlap === 0, `${label} ${m.counter} card does not cover ${m.target} (overlap ${m.overlap}px2)`);
    check(m.gap >= 8, `${label} ${m.counter} card is beside ${m.target}, clear gap ${m.gap}px`);
    check(!m.textClipped && !m.cardClipped, `${label} ${m.counter} no clipped text`);
    check(m.spotCoversAnchor, `${label} ${m.counter} cut-out covers ${m.target}`);
    check(
      m.counter === `${m.index + 1} of ${m.total}`,
      `${label} ${m.counter} counter matches step ${m.index + 1}/${m.total}`
    );
    check(m.focus === "tour-next", `${label} ${m.counter} focus is in the card (${m.focus})`);
    await page.click("#tour-next");
    await page.waitForTimeout(450);
  }
  return seen;
}

(async () => {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    const { browser, page } = await boot({ viewport: { width, height } });
    const label = `${width}x${height}`;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // --- every step of the whole tour, at this width -------------------------
    await page.evaluate(() => {
      localStorage.removeItem("tourDone");
      openTour();
    });
    await page.waitForTimeout(900);
    const seen = await walkTour(page, label);
    // What the table holds, against what this width could actually show. The
    // difference is the point rather than a fault: a step whose control is not
    // on screen at this width is dropped and the run renumbers, which is why
    // the total falls as the tour goes on instead of promising steps that are
    // never coming.
    const planned = await page.evaluate(() =>
      TOUR_SECTIONS.flatMap((s) => s.steps.map((step) => step.target))
    );
    const shown = seen.map((s) => s.target);
    console.log(
      `${label} steps shown: ${seen.length} of ${planned.length} in the table, ` +
        `dropped: ${JSON.stringify(planned.filter((t) => !shown.includes(t)))}, sections: ` +
        JSON.stringify([...new Set(seen.map((s) => s.section))])
    );
    check(seen.length > 0, `${label} the tour ran`);
    // The denominator may only fall, and the last card must say the truth
    // about the run that just happened.
    const totals = seen.map((s) => s.total);
    check(
      totals.every((total, i) => i === 0 || total <= totals[i - 1]),
      `${label} the counter's total only falls (${totals.join("/")})`
    );
    check(
      totals[totals.length - 1] === seen.length,
      `${label} the last card's total (${totals[totals.length - 1]}) is the number of steps shown (${seen.length})`
    );
    check(
      await page.evaluate(() => !tourRun && document.getElementById("tour-card").classList.contains("hidden")),
      `${label} Done closes the tour`
    );
    check(
      await page.evaluate(() => localStorage.getItem("tourDone") === "1"),
      `${label} finishing is remembered (tourDone)`
    );

    // --- Back, Skip, Escape --------------------------------------------------
    await page.evaluate(() => openTour("basics"));
    await page.waitForTimeout(700);
    const first = await page.evaluate(STEP_PROBE);
    check(
      await page.evaluate(() => document.getElementById("tour-back").disabled),
      `${label} Back is disabled on the first step (${first.counter})`
    );
    // Tab stays inside the card. The trap is app.js's own (the card is a
    // `[role="dialog"][aria-modal="true"]`), so this is a check that the tour
    // is wearing the shape that trap looks for, not a second implementation.
    const tabbed = [];
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      tabbed.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          return `${el && el.id ? el.id : el.tagName}:${document
            .getElementById("tour-card")
            .contains(el)}`;
        })
      );
    }
    console.log(`${label} tab cycle: ${JSON.stringify(tabbed)}`);
    check(
      tabbed.every((entry) => entry.endsWith(":true")),
      `${label} Tab stays inside the card`
    );
    await page.evaluate(() => document.getElementById("tour-next").focus());

    await page.click("#tour-next");
    await page.waitForTimeout(450);
    await page.click("#tour-next");
    await page.waitForTimeout(450);
    const third = await page.evaluate(STEP_PROBE);
    await page.click("#tour-back");
    await page.waitForTimeout(450);
    const back = await page.evaluate(STEP_PROBE);
    console.log(`${label} back: ${third.counter} -> ${back.counter} (${back.title})`);
    check(back.index === third.index - 1, `${label} Back goes one step back`);
    await page.click("#tour-skip");
    await page.waitForTimeout(450);
    check(
      await page.evaluate(
        () =>
          !tourRun &&
          document.getElementById("tour-card").classList.contains("hidden") &&
          document.getElementById("tour-spot").classList.contains("hidden") &&
          document.getElementById("tour-block").classList.contains("hidden")
      ),
      `${label} Skip closes the tour and its dim`
    );

    // Escape, and the focus handed back to whatever opened the tour.
    await page.evaluate(() => {
      document.getElementById("settings-btn").focus();
      openTour("basics");
    });
    await page.waitForTimeout(700);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const afterEscape = await page.evaluate(() => ({
      open: !!tourRun,
      focus: document.activeElement ? document.activeElement.id : "",
    }));
    check(!afterEscape.open, `${label} Escape skips the tour`);
    check(
      afterEscape.focus === "settings-btn",
      `${label} focus returns to the opener (${afterEscape.focus})`
    );

    // --- a step whose element is hidden is skipped ---------------------------
    const hidden = await page.evaluate(async () => {
      const el = document.getElementById("space-switcher-btn");
      el.style.display = "none";
      openTour("basics");
      await new Promise((r) => setTimeout(r, 600));
      const titles = [];
      while (tourRun) {
        titles.push(tourRun.step.title);
        const total = tourRun.steps.length;
        tourNext();
        await new Promise((r) => setTimeout(r, 350));
        if (!tourRun) {
          titles.push(`total=${total}`);
          break;
        }
      }
      el.style.display = "";
      return titles;
    });
    console.log(`${label} with #space-switcher-btn hidden: ${JSON.stringify(hidden)}`);
    check(!hidden.includes("Spaces"), `${label} the hidden control's step is skipped`);
    check(hidden.includes("total=3"), `${label} the counter renumbers to 3 after the drop`);

    // --- the dim is on the page and not on the highlighted control -----------
    // Two captures of the same pixels, one with the tour open and one without.
    // The highlighted control must be unchanged and the page around it must be
    // darker: that is what "a cut-out" means, and no computed style can say it.
    const probePoints = await page.evaluate(() => {
      const tab = document.getElementById("tab-btn-notes").getBoundingClientRect();
      const body = document.body.getBoundingClientRect();
      return {
        bright: [Math.round(tab.left + tab.width / 2), Math.round(tab.top + tab.height / 2)],
        dim: [Math.round(body.width / 2), Math.round(Math.min(body.height - 40, 500))],
      };
    });
    const plain = `${SHOTS}/${label}-plain.png`;
    const dimmed = `${SHOTS}/${label}-tour.png`;
    await page.screenshot({ path: plain });
    await page.evaluate(() => openTour("basics"));
    await page.waitForTimeout(800);
    await page.screenshot({ path: dimmed });
    await page.evaluate(() => tourClose(false));
    const pixel = (file, [x, y]) =>
      execFileSync("python3", [path.join(ROOT, "scratchpad/pngpixel.py"), file, String(x), String(y)], {
        encoding: "utf-8",
      }).trim();
    const brightBefore = pixel(plain, probePoints.bright);
    const brightAfter = pixel(dimmed, probePoints.bright);
    const dimBefore = pixel(plain, probePoints.dim);
    const dimAfter = pixel(dimmed, probePoints.dim);
    console.log(`${label} highlighted pixel ${JSON.stringify(probePoints.bright)}: ${brightBefore} -> ${brightAfter}`);
    console.log(`${label} page pixel ${JSON.stringify(probePoints.dim)}: ${dimBefore} -> ${dimAfter}`);
    const lum = (line) => {
      const m = line.match(/(\d+),\s*(\d+),\s*(\d+)/);
      return m ? (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3 : NaN;
    };
    check(
      Math.abs(lum(brightBefore) - lum(brightAfter)) < 3,
      `${label} the highlighted control is not dimmed (${lum(brightBefore)} -> ${lum(brightAfter)})`
    );
    // Relative, not a fixed number of levels: the dark theme's page is already
    // at luminance 22 out of 255, so a scrim that takes 40% of it off can only
    // ever be an 8-level drop, and an absolute threshold fails a dim that is
    // working perfectly well. Measured: light 239.7 to 142 (41% off), dark
    // 21.7 to 13 (40% off), which is the same scrim doing the same job.
    check(
      lum(dimAfter) <= lum(dimBefore) * 0.8,
      `${label} the page around it is dimmed (${lum(dimBefore)} -> ${lum(dimAfter)}, ` +
        `${Math.round((1 - lum(dimAfter) / lum(dimBefore)) * 100)}% off)`
    );

    // --- the way back in: Settings, help and guide ---------------------------
    // The replay strip is built from TOUR_SECTIONS, so this is also the check
    // that the table and the buttons agree, and that pressing one closes the
    // settings modal before measuring a control the modal was covering.
    await page.click("#settings-btn");
    await page.waitForTimeout(600);
    await page.evaluate(() => showSettingsSection("help"));
    await page.waitForTimeout(400);
    const replay = await page.evaluate(() => {
      const box = document.getElementById("tour-replay-buttons");
      const buttons = [...box.querySelectorAll("button")];
      return {
        labels: buttons.map((b) => b.textContent),
        filled: buttons.filter((b) => !b.classList.contains("ghost")).length,
        height: Math.round(box.getBoundingClientRect().height),
      };
    });
    console.log(`${label} replay strip: ${JSON.stringify(replay)}`);
    check(
      replay.labels.length === 5 && replay.labels[0] === "Start the tour",
      `${label} the replay strip offers the whole tour and each section`
    );
    check(replay.filled === 1, `${label} one filled button in the strip (${replay.filled})`);
    await page.evaluate(() =>
      [...document.getElementById("tour-replay-buttons").querySelectorAll("button")]
        .find((b) => b.textContent === "Finding things")
        .click()
    );
    await page.waitForTimeout(1200);
    const fromSettings = await page.evaluate(() => ({
      open: !!tourRun,
      settingsOpen: !document.getElementById("settings-modal").classList.contains("hidden"),
      section: document.getElementById("tour-section").textContent,
      counter: document.getElementById("tour-count").textContent,
    }));
    console.log(`${label} from Settings: ${JSON.stringify(fromSettings)}`);
    check(
      fromSettings.open && fromSettings.section === "Finding things",
      `${label} a section button plays that section alone`
    );
    check(!fromSettings.settingsOpen, `${label} the settings modal is out of the way first`);
    await page.evaluate(() => tourClose(false));

    // --- the card's own text, in rendered pixels -----------------------------
    // contrast.js walks the app's surfaces with nothing open, so the card is
    // `display: none` while it runs and none of its text has ever been
    // measured. It is measured here from the capture rather than from computed
    // styles, and the first draft of this check is why: composited from
    // `getComputedStyle`, it reported 1.21:1 in the dark theme, because the
    // page's background is a gradient (a background-IMAGE, with a transparent
    // background-COLOR), so the walk up the ancestors found nothing opaque and
    // fell back to white behind light text. The pixels have no such opinion:
    // inside a line of text the darkest pixel is the ink and the lightest is
    // the surface it is on, whatever painted either of them.
    await page.evaluate(() => openTour("basics"));
    await page.waitForTimeout(800);
    const inkShot = `${SHOTS}/${label}-card.png`;
    await page.screenshot({ path: inkShot });
    const inkBoxes = await page.evaluate(() => {
      const out = {};
      for (const id of ["tour-title", "tour-text", "tour-count", "tour-section"]) {
        const box = document.getElementById(id).getBoundingClientRect();
        out[id] = [
          Math.round(box.left),
          Math.round(box.top),
          Math.max(1, Math.round(box.width)),
          Math.max(1, Math.round(box.height)),
        ];
      }
      return out;
    });
    await page.evaluate(() => tourClose(false));
    const ink = {};
    for (const [id, box] of Object.entries(inkBoxes)) {
      ink[id] = Number(
        execFileSync(
          "python3",
          [path.join(__dirname, "rectcontrast.py"), inkShot, ...box.map(String)],
          { encoding: "utf-8" }
        ).trim()
      );
    }
    console.log(`${label} card text contrast (rendered pixels): ${JSON.stringify(ink)}`);
    check(
      Object.values(ink).every((ratio) => ratio >= 4.5),
      `${label} every piece of the card's text is at least 4.5:1 as rendered`
    );

    check(errors.length === 0, `${label} no page errors (${errors.join("; ")})`);
    await browser.close();
  }

  console.log(failures.length ? `\n${failures.length} FAILURES:\n  ` + failures.join("\n  ") : "\nall checks passed");
  process.exit(failures.length ? 1 : 0);
})();
