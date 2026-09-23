// The guided tour, measured: every step of every section at 1440x900,
// 1184x760 and 390x844, each one judged on the things that made the owner
// call it "completely broken on all the slides except the first one"
// (2026-09-23): the control it names is laid out, inside the window and NOT
// under anything else; the cut-out sits on it; the card is on screen and clear
// of it; the tab and Notes sub-tab the step needs are the ones showing; the
// counter says the same total from the first card to the last.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers BASE=http://127.0.0.1:8797 \
//     node scratchpad/ui-sweeps/tour.js            # all three sizes
//   SIZES=390x844 node scratchpad/ui-sweeps/tour.js  # one
//
// Then the cases that broke it and that no clean walk sees: the tour started
// with an overlay open (the Atlas guide, the command palette, the features
// browser, the shortcut sheet), a resize across the phone breakpoint mid-step,
// typing in the lit control, Next pressed twice while a tab loads, and every
// door into the tour being live. Every line printed is a number or a
// comparison; the one visual claim ("the lit control is the bright thing") is
// settled with scratchpad/pngpixel.py on a capture.
//
// `lib.js` marks the welcome AND the tour as done before the app boots, so
// neither opens by itself mid-sweep; this sweep opens the tour itself.
const { boot } = require("./lib.js");
const { execFileSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const SHOTS = (process.env.SCRATCH || "/tmp") + "/tour-shots";
require("fs").mkdirSync(SHOTS, { recursive: true });

const failures = [];
let stepsPassed = 0;
let stepsSeen = 0;
function check(ok, line) {
  if (!ok) failures.push(line);
  console.log(`${ok ? "ok  " : "FAIL"}  ${line}`);
  return ok;
}

// One step, from outside. Everything the step's pass or fail depends on.
const STEP_PROBE = () => {
  const card = document.getElementById("tour-card");
  const spot = document.getElementById("tour-spot");
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const c = card.getBoundingClientRect();
  const s = spot.getBoundingClientRect();
  const el = tourRun.el;
  const t = el ? el.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const overlapW = Math.min(c.right, t.right) - Math.max(c.left, t.left);
  const overlapH = Math.min(c.bottom, t.bottom) - Math.max(c.top, t.top);
  const gaps = [t.left - c.right, c.left - t.right, t.top - c.bottom, c.top - t.bottom];
  // What is actually on top of the control, at five points, ignoring the
  // tour's own layers (they are drawn around the hole, never in it).
  let covered = 0;
  let counted = 0;
  const coveredBy = [];
  if (el) {
    for (const [fx, fy] of [[0.5, 0.5], [0.2, 0.3], [0.8, 0.3], [0.2, 0.7], [0.8, 0.7]]) {
      const x = t.left + t.width * fx;
      const y = t.top + t.height * fy;
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      counted += 1;
      const top = document
        .elementsFromPoint(x, y)
        .find((n) => !n.closest("#tour-block, #tour-spot, #tour-card"));
      if (!top || !(el.contains(top) || top.contains(el))) {
        covered += 1;
        coveredBy.push(top ? top.id || String(top.className).slice(0, 30) : "nothing");
      }
    }
  }
  const style = el ? getComputedStyle(el) : null;
  const step = tourRun.step;
  const notesShown = step.notes
    ? !document.getElementById(step.notes)?.classList.contains("hidden")
    : true;
  return {
    target: step.target,
    shownTarget: el ? (el.id ? `#${el.id}` : el.className) : "none",
    alt: Boolean(tourRun.alt),
    counter: document.getElementById("tour-count").textContent,
    section: document.getElementById("tour-section").textContent,
    title: document.getElementById("tour-title").textContent,
    text: document.getElementById("tour-text").textContent,
    side: card.dataset.side,
    stranded: Boolean(tourRun.stranded),
    card: [Math.round(c.left), Math.round(c.top), Math.round(c.width), Math.round(c.height)],
    spot: [Math.round(s.left), Math.round(s.top), Math.round(s.width), Math.round(s.height)],
    anchor: [Math.round(t.left), Math.round(t.top), Math.round(t.width), Math.round(t.height)],
    vw,
    vh,
    exists: Boolean(el && el.isConnected),
    laidOut: Boolean(el) && t.width >= 1 && t.height >= 1 && style.visibility !== "hidden" && style.display !== "none",
    // Inside the window: the whole control when it fits, and at least the
    // tour's own 8px each way when it is bigger than the window.
    inWindow:
      Boolean(el) &&
      (t.width <= vw && t.height <= vh
        ? t.left >= -0.5 && t.top >= -0.5 && t.right <= vw + 0.5 && t.bottom <= vh + 0.5
        : Math.min(t.right, vw) - Math.max(t.left, 0) >= 8 && Math.min(t.bottom, vh) - Math.max(t.top, 0) >= 8),
    covered: counted === 0 || covered * 2 > counted,
    coveredBy,
    spotHidden: spot.classList.contains("hidden"),
    spotCovers:
      s.left <= Math.max(0, t.left) + 1 &&
      s.top <= Math.max(0, t.top) + 1 &&
      s.right >= Math.min(vw, t.right) - 1 &&
      s.bottom >= Math.min(vh, t.bottom) - 1,
    overlap: overlapW > 0 && overlapH > 0 ? Math.round(overlapW * overlapH) : 0,
    gap: Math.round(Math.max(...gaps)),
    cardInside: c.left >= -0.5 && c.top >= -0.5 && c.right <= window.innerWidth + 0.5 && c.bottom <= window.innerHeight + 0.5,
    cardOpaque: getComputedStyle(card).opacity === "1" && c.width > 40 && c.height > 40,
    textClipped:
      document.getElementById("tour-text").scrollHeight > document.getElementById("tour-text").clientHeight + 1 ||
      card.scrollHeight > card.clientHeight + 1,
    focus: document.activeElement ? document.activeElement.id : "",
    index: tourRun.index,
    total: tourRun.steps.length,
    wantTab: step.tab || "",
    tab: tourActiveTab(),
    notesShown,
    busy: card.getAttribute("aria-busy") === "true",
  };
};

// Wait until the walk in progress has drawn its card (the busy flag is set
// while a step navigates and waits for its control, and cleared when it is
// drawn), then a frame more for the placement.
async function settled(page) {
  await page.waitForFunction(
    () => !tourRun || document.getElementById("tour-card").getAttribute("aria-busy") !== "true",
    null,
    { timeout: 8000 }
  );
  await page.waitForTimeout(120);
}

// Every check a step must pass. Returns whether all did.
function judge(label, m, phone) {
  const tag = `${label} ${m.counter} ${m.target}${m.alt ? `->${m.shownTarget}` : ""}`;
  let ok = true;
  ok = check(!m.stranded, `${tag} is not stranded (it has a control to point at)`) && ok;
  ok = check(m.exists && m.laidOut, `${tag} target exists and is laid out ${JSON.stringify(m.anchor)}`) && ok;
  ok = check(m.inWindow, `${tag} target is inside the window ${JSON.stringify(m.anchor)} in ${m.vw}x${m.vh}`) && ok;
  ok = check(!m.covered, `${tag} nothing is drawn over the target (${m.coveredBy.join(",") || "clear"})`) && ok;
  ok = check(!m.spotHidden && m.spotCovers, `${tag} the cut-out sits on the target spot=${JSON.stringify(m.spot)}`) && ok;
  ok = check(m.cardInside && m.cardOpaque, `${tag} the card is on screen ${JSON.stringify(m.card)}`) && ok;
  ok = check(m.overlap === 0 && m.gap >= 8, `${tag} the card is clear of the target (overlap ${m.overlap}, gap ${m.gap})`) && ok;
  ok = check(!m.textClipped, `${tag} no clipped text`) && ok;
  ok = check(!m.wantTab || m.tab === m.wantTab, `${tag} the ${m.wantTab || "current"} tab is showing (${m.tab})`) && ok;
  ok = check(m.notesShown, `${tag} its Notes sub-tab is showing`) && ok;
  ok = check(m.counter === `${m.index + 1} of ${m.total}`, `${tag} counter matches step ${m.index + 1}/${m.total}`) && ok;
  ok = check(m.focus === "tour-next", `${tag} focus is on Next (${m.focus})`) && ok;
  if (m.alt) ok = check(/More/.test(m.text), `${tag} the card says the control is in More`) && ok;
  if (phone) {
    // A sheet: the window's width less its gutters, docked to an edge.
    const docked = m.card[1] <= 20 || m.card[1] + m.card[3] >= m.vh - 20;
    ok = check(m.card[2] >= m.vw - 40 && docked, `${tag} the card is a docked sheet (${m.side})`) && ok;
  }
  stepsSeen += 1;
  if (ok) stepsPassed += 1;
  return ok;
}

async function walk(page, label, phone) {
  const seen = [];
  for (let guard = 0; guard < 40; guard += 1) {
    if (!(await page.evaluate(() => !!tourRun))) break;
    await settled(page);
    if (!(await page.evaluate(() => !!tourRun))) break;
    const m = await page.evaluate(STEP_PROBE);
    seen.push(m);
    console.log(
      `${label} ${m.counter.padEnd(8)} ${m.target.padEnd(20)} shown=${m.shownTarget.padEnd(20)} tab=${m.tab.padEnd(9)} ` +
        `side=${(m.side || "").padEnd(11)} card=${JSON.stringify(m.card)} anchor=${JSON.stringify(m.anchor)}`
    );
    judge(label, m, phone);
    await page.click("#tour-next");
    await page.waitForTimeout(150);
  }
  const totals = seen.map((s) => s.total);
  check(
    seen.length > 0 && totals.every((t) => t === totals[0]) && totals[0] === seen.length,
    `${label} the counter's total never changes and is the number of cards shown (${totals.join("/")}, ${seen.length} shown)`
  );
  check(
    await page.evaluate(() => !tourRun && document.getElementById("tour-card").classList.contains("hidden")),
    `${label} Done closes the tour`
  );
  return seen;
}

const SIZES = (process.env.SIZES || "1440x900,1184x760,390x844")
  .split(",")
  .map((s) => s.split("x").map(Number));

(async () => {
  for (const [width, height] of SIZES) {
    const phone = width < 600;
    const { browser, page } = await boot({
      viewport: { width, height },
      isMobile: phone,
      hasTouch: phone,
    });
    const label = `${width}x${height}`;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // --- every door is live --------------------------------------------------
    const doors = await page.evaluate(() => {
      renderTourReplay();
      const replay = [...document.querySelectorAll("#tour-replay-buttons button")];
      const about = document.getElementById("about-take-tour");
      return {
        enabled: typeof TOUR_ENABLED !== "undefined" && TOUR_ENABLED,
        replay: replay.length,
        replayDisabled: replay.filter((b) => b.disabled).length,
        about: Boolean(about),
        aboutDisabled: Boolean(about && about.disabled),
      };
    });
    console.log(`${label} doors: ${JSON.stringify(doors)}`);
    check(doors.enabled, `${label} TOUR_ENABLED is on`);
    check(doors.replay === 5 && doors.replayDisabled === 0, `${label} the five replay buttons are live`);
    check(doors.about && !doors.aboutDisabled, `${label} About's take-the-tour button is live`);

    // --- the welcome's hand-off ----------------------------------------------
    await page.evaluate(() => {
      localStorage.removeItem("onboardingDone");
      localStorage.removeItem("tourDone");
      switchTab("dashboard");
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => openOnboarding());
    await page.waitForTimeout(400);
    const slides = await page.evaluate(() => ONBOARDING_SLIDES.length);
    for (let slide = 0; slide < slides - 1; slide += 1) {
      await page.click("#onboarding-next");
      await page.waitForTimeout(250);
    }
    check(
      (await page.textContent("#onboarding-next")).trim() === "Start the tour",
      `${label} the welcome's last button says Start the tour`
    );
    await page.click("#onboarding-next");
    await page.waitForTimeout(300);
    check(await page.evaluate(() => !!tourRun), `${label} the welcome's last button starts the tour`);
    await walk(page, `${label} welcome`, phone);

    // --- every section on its own, then the whole tour ----------------------
    const sections = await page.evaluate(() => TOUR_SECTIONS.map((s) => s.id));
    for (const section of sections) {
      await page.evaluate(() => switchTab("dashboard"));
      await page.waitForTimeout(300);
      await page.evaluate((id) => openTour(id), section);
      await walk(page, `${label} ${section}`, phone);
    }
    await page.evaluate(() => switchTab("reminders"));
    await page.waitForTimeout(500);
    await page.evaluate(() => openTour());
    const whole = await walk(page, `${label} all (from reminders)`, phone);
    const planned = await page.evaluate(() => TOUR_SECTIONS.flatMap((s) => s.steps.map((x) => x.target)));
    console.log(
      `${label} whole tour: ${whole.length} of ${planned.length} steps shown, left out at this size: ` +
        JSON.stringify(planned.filter((t) => !whole.some((s) => s.target === t)))
    );
    check(
      await page.evaluate(() => localStorage.getItem("tourDone") === "1"),
      `${label} finishing is remembered (tourDone)`
    );

    // --- with an overlay open, the tour closes it first ----------------------
    for (const opener of ["openHelpChat()", "openPalette()", "openFeatures()", "openShortcuts()"]) {
      await page.evaluate((src) => new Function(src)(), opener);
      await page.waitForTimeout(700);
      await page.evaluate(() => openTour("basics"));
      await settled(page);
      const m = await page.evaluate(STEP_PROBE);
      const open = await page.evaluate(() =>
        [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
          .filter((el) => el.id !== "tour-card" && !el.classList.contains("hidden") && el.getClientRects().length)
          .map((el) => el.id || el.className)
      );
      judge(`${label} over ${opener}`, m, phone);
      check(open.length === 0, `${label} ${opener} was closed by the tour (${JSON.stringify(open)})`);
      await page.evaluate(() => tourClose(false));
      await page.waitForTimeout(200);
    }

    // --- a resize across the phone breakpoint, mid-step ----------------------
    if (!phone) {
      await page.evaluate(() => openTour("basics"));
      for (let i = 0; i < 3; i += 1) {
        await settled(page);
        await page.click("#tour-next");
      }
      await settled(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(600);
      const narrow = await page.evaluate(STEP_PROBE);
      console.log(`${label} resized to 390: showing ${narrow.shownTarget} card=${JSON.stringify(narrow.card)}`);
      check(narrow.shownTarget === "#phone-more-btn" && narrow.alt, `${label} at 390 the Settings step moves to More`);
      check(narrow.cardInside && narrow.overlap === 0 && !narrow.covered, `${label} at 390 the card is on screen and clear`);
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(600);
      const wide = await page.evaluate(STEP_PROBE);
      check(wide.shownTarget === "#settings-btn" && !wide.alt, `${label} back at ${width} it points at the gear again`);
      check(wide.cardInside && wide.overlap === 0 && wide.spotCovers, `${label} back at ${width} the card and cut-out follow`);
      await page.evaluate(() => tourClose(false));
    }

    // --- typing in the lit control is typing ---------------------------------
    await page.evaluate(() => openTour("note"));
    await settled(page);
    await page.click("#entry-content");
    await page.keyboard.type("ab");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    const typed = await page.evaluate(() => ({
      index: tourRun && tourRun.index,
      value: document.getElementById("entry-content").value,
    }));
    check(typed.index === 0 && typed.value === "a\nb", `${label} arrows and Enter in the lit box edit it (${JSON.stringify(typed)})`);
    await page.evaluate(() => {
      document.getElementById("entry-content").value = "";
      document.getElementById("tour-next").focus();
    });
    await page.keyboard.press("ArrowRight");
    await settled(page);
    check(await page.evaluate(() => tourRun && tourRun.index === 1), `${label} ArrowRight on the card moves the tour on`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    check(await page.evaluate(() => !tourRun), `${label} Escape ends the tour`);

    // --- Next twice while a tab loads ----------------------------------------
    await page.evaluate(() => switchTab("dashboard"));
    await page.waitForTimeout(300);
    await page.evaluate(() => openTour("finding"));
    await settled(page);
    await page.evaluate(() => {
      tourNext();
      tourNext();
    });
    await settled(page);
    await page.waitForTimeout(400);
    const twice = await page.evaluate(STEP_PROBE);
    check(twice.index === 2 && twice.counter === `3 of ${twice.total}`, `${label} two quick Nexts land on step 3 once (${twice.counter})`);
    judge(`${label} after two quick Nexts`, twice, phone);
    await page.evaluate(() => tourClose(false));

    // --- Back, Skip, the X, the Tab trap, focus handed back -------------------
    await page.evaluate(() => openTour("basics"));
    await settled(page);
    check(await page.evaluate(() => document.getElementById("tour-back").disabled), `${label} Back is disabled on the first step`);
    const tabbed = [];
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      tabbed.push(await page.evaluate(() => document.getElementById("tour-card").contains(document.activeElement)));
    }
    check(tabbed.every(Boolean), `${label} Tab stays inside the card`);
    await page.evaluate(() => document.getElementById("tour-next").focus());
    await page.click("#tour-next");
    await settled(page);
    await page.click("#tour-next");
    await settled(page);
    await page.click("#tour-back");
    await settled(page);
    check(await page.evaluate(() => tourRun.index === 1), `${label} Back goes one step back`);
    await page.click("#tour-skip");
    await page.waitForTimeout(200);
    check(
      await page.evaluate(
        () =>
          !tourRun &&
          ["tour-card", "tour-spot", "tour-block"].every((id) => document.getElementById(id).classList.contains("hidden"))
      ),
      `${label} Skip closes the tour and its dim`
    );
    await page.evaluate(() => {
      document.getElementById("space-switcher-btn").focus();
      openTour("basics");
    });
    await settled(page);
    await page.click("#tour-close");
    await page.waitForTimeout(200);
    const afterClose = await page.evaluate(() => ({ open: !!tourRun, focus: document.activeElement?.id }));
    check(!afterClose.open && afterClose.focus === "space-switcher-btn", `${label} the X closes it and focus returns to the opener (${afterClose.focus})`);

    // --- a control hidden for good is left out before the count --------------
    const hidden = await page.evaluate(async () => {
      const el = document.getElementById("space-switcher-btn");
      el.style.display = "none";
      openTour("basics");
      const first = tourRun.steps.length;
      el.style.display = "";
      return first;
    });
    await settled(page);
    await page.evaluate(() => tourClose(false));
    check(hidden === 3, `${label} a hidden chrome control is left out before the count (3, got ${hidden})`);

    // --- the dim is on the page and not on the lit control -------------------
    await page.evaluate(() => switchTab("dashboard"));
    await page.waitForTimeout(500);
    const points = await page.evaluate(() => {
      const bar = document.getElementById("space-switcher-btn").getBoundingClientRect();
      return {
        bright: [Math.round(bar.left + bar.width / 2), Math.round(bar.top + bar.height / 2)],
        dim: [Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2)],
      };
    });
    const plain = `${SHOTS}/${label}-plain.png`;
    const dimmed = `${SHOTS}/${label}-tour.png`;
    await page.screenshot({ path: plain });
    await page.evaluate(() => openTour("basics"));
    await settled(page);
    await page.click("#tour-next");
    await settled(page);
    // The card is somewhere; the page point is moved off it if it landed there.
    const cardBox = await page.evaluate(() => document.getElementById("tour-card").getBoundingClientRect().toJSON());
    if (points.dim[0] >= cardBox.left && points.dim[0] <= cardBox.right && points.dim[1] >= cardBox.top && points.dim[1] <= cardBox.bottom) {
      points.dim[1] = cardBox.top > height / 2 ? Math.round(cardBox.top / 2) : Math.round((cardBox.bottom + height) / 2);
    }
    await page.screenshot({ path: dimmed });
    await page.evaluate(() => tourClose(false));
    const pixel = (file, [x, y]) =>
      execFileSync("python3", [path.join(ROOT, "scratchpad/pngpixel.py"), file, String(x), String(y)], {
        encoding: "utf-8",
      }).trim();
    const lum = (line) => {
      const m = line.match(/\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3 : NaN;
    };
    const b0 = lum(pixel(plain, points.bright));
    const b1 = lum(pixel(dimmed, points.bright));
    const d0 = lum(pixel(plain, points.dim));
    const d1 = lum(pixel(dimmed, points.dim));
    check(Math.abs(b0 - b1) < 3, `${label} the lit control is not dimmed (${b0} -> ${b1})`);
    check(d1 <= d0 * 0.8, `${label} the page around it is dimmed (${d0} -> ${d1})`);

    // --- the replay strip plays one section, with Settings out of the way ----
    await page.evaluate(() => openSettingsModal());
    await page.waitForTimeout(500);
    await page.evaluate(() => showSettingsSection("help"));
    await page.waitForTimeout(300);
    await page.evaluate(() =>
      [...document.querySelectorAll("#tour-replay-buttons button")].find((b) => b.textContent === "Finding things").click()
    );
    await page.waitForTimeout(300);
    await settled(page);
    const fromSettings = await page.evaluate(() => ({
      open: !!tourRun,
      settingsOpen: !document.getElementById("settings-modal").classList.contains("hidden"),
      section: document.getElementById("tour-section").textContent,
    }));
    check(fromSettings.open && fromSettings.section === "Finding things", `${label} a section button plays that section`);
    check(!fromSettings.settingsOpen, `${label} the settings modal is out of the way first`);
    judge(`${label} from Settings`, await page.evaluate(STEP_PROBE), phone);
    await page.evaluate(() => tourClose(false));

    // --- the card's text as rendered ------------------------------------------
    await page.evaluate(() => openTour("basics"));
    await settled(page);
    const inkShot = `${SHOTS}/${label}-card.png`;
    await page.screenshot({ path: inkShot });
    const inkBoxes = await page.evaluate(() => {
      const out = {};
      for (const id of ["tour-title", "tour-text", "tour-count", "tour-section"]) {
        const box = document.getElementById(id).getBoundingClientRect();
        out[id] = [Math.round(box.left), Math.round(box.top), Math.max(1, Math.round(box.width)), Math.max(1, Math.round(box.height))];
      }
      return out;
    });
    await page.evaluate(() => tourClose(false));
    const ink = {};
    for (const [id, box] of Object.entries(inkBoxes)) {
      ink[id] = Number(
        execFileSync("python3", [path.join(__dirname, "rectcontrast.py"), inkShot, ...box.map(String)], {
          encoding: "utf-8",
        }).trim()
      );
    }
    check(Object.values(ink).every((r) => r >= 4.5), `${label} the card's text is at least 4.5:1 as rendered ${JSON.stringify(ink)}`);

    check(errors.length === 0, `${label} no page errors (${errors.join("; ")})`);
    await browser.close();
  }

  console.log(`\nsteps: ${stepsPassed} of ${stepsSeen} passed every check`);
  console.log(failures.length ? `${failures.length} FAILURES:\n  ` + failures.join("\n  ") : "all checks passed");
  process.exit(failures.length ? 1 : 0);
})();
