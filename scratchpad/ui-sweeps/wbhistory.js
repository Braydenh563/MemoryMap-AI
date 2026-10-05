// The board's time machine (wb-phase2 step 3; WHITEBOARD_PLAN decision 33).
// A board made in three moments (shapes, a rename, a deletion, ten minutes
// apart by the log's clock): Board, History… opens the bar with the slider at
// now; dragging it back draws each moment's board (measured on the rendered
// shapes' labels); the board takes no pointer and no key while the past is
// shown, and a write is refused; Put back restores the board as one Undo
// step; the selection-only restore puts back just what was selected; Esc
// comes back to now. The bar fits the screen at 1440 and 390.
//   BASE=http://127.0.0.1:8795 W=390 H=844 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbhistory.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
  const { browser, page, errors, board } = await openBoard({ viewport: { width: W, height: H } });
  page.on("dialog", (d) => d.accept());
  const rect = (x, y) => `M ${x} ${y} L ${x + 120} ${y} L ${x + 120} ${y + 70} L ${x} ${y + 70} Z`;
  // Moment 1: A and B. Moment 2: A renamed. Moment 3: B deleted, C added.
  // The log's clock is moved back between them so each is its own moment.
  const ids = await page.evaluate(async ([bid, r]) => {
    const post = async (data) => (await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(data), x: 0, y: 0, z: 1, board_id: bid }) })).id;
    const a = await post({ d: r[0], shape: "rect", color: "#335599", width: 2, label: "A" });
    const b = await post({ d: r[1], shape: "rect", color: "#335599", width: 2, label: "B" });
    return { a, b };
  }, [board.id, [rect(0, 0), rect(300, 0), rect(0, 200)]]);
  //: Each step is its own moment: the log's clock for what came before is
  //: moved back (the data dir is the sweep's own, DATA=...; a moment is a
  //: run of at most two minutes), rather than waiting minutes between steps.
  const DB = `${process.env.DATA || "/tmp/claude-0/-home-user-MemoryMap-AI/eac0a178-6a5f-55a9-b7c8-87cedc9b90ca/scratchpad/mmdata"}/memorymap.db`;
  const age = async (minutes) => {
    const last = await page.evaluate(async () => (await apiJson("/audit?limit=1"))[0].id);
    require("child_process").execFileSync("python3", ["-c",
      "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute(\"update audit_log set created_at=datetime(created_at, ?) where id<=?\", (f'-{sys.argv[3]} minutes', int(sys.argv[2]))); c.commit()",
      DB, String(last), String(minutes)]);
  };
  await age(10);
  await page.evaluate(async ([bid, id, r]) => {
    await apiJson(`/whiteboard/sketches/${id}`, { method: "PUT", body: JSON.stringify({ data: JSON.stringify({ d: r, shape: "rect", color: "#335599", width: 2, label: "A renamed" }), x: 0, y: 0, z: 1, board_id: bid }) });
  }, [board.id, ids.a, rect(0, 0)]);
  await age(10);
  await page.evaluate(async ([bid, id, r]) => {
    await apiJson(`/whiteboard/sketches/${id}`, { method: "DELETE" });
    await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify({ d: r, shape: "rect", color: "#335599", width: 2, label: "C" }), x: 0, y: 0, z: 1, board_id: bid }) });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    wbZoomToFit();
  }, [board.id, ids.b, rect(0, 200)]);
  await page.waitForTimeout(600);

  const labels = () => page.evaluate(() => [...document.querySelectorAll(".sketch-group .sketch-label")].map((t) => t.textContent.trim()).filter(Boolean).sort().join(","));
  check("now: A renamed and C", (await labels()) === "A renamed,C", await labels());

  // Select A, then open History from the Board menu's row.
  await page.evaluate((id) => { clearWbSelection(); selectWbItem("sketch", id); }, ids.a);
  await page.evaluate(() => document.querySelector('[data-wb-cmd="history"]').click());
  await page.waitForTimeout(700);
  const bar = await page.evaluate(() => {
    const el = document.getElementById("wb-history-bar");
    const r = el.getBoundingClientRect();
    const s = document.getElementById("wb-history-slider");
    const kids = [...el.querySelectorAll("button, input")].map((c) => c.getBoundingClientRect());
    return {
      shown: !el.classList.contains("hidden") && r.width > 0,
      fits: r.left >= 0 && r.right <= innerWidth + 0.5 && document.documentElement.scrollWidth <= innerWidth,
      inside: kids.every((k) => k.left >= r.left - 0.5 && k.right <= r.right + 0.5 && k.bottom <= r.bottom + 0.5),
      targets: kids.every((k) => k.height >= 24),
      focused: document.activeElement === s,
      value: s.value, max: s.max,
      when: document.getElementById("wb-history-when").textContent,
      topbar: getComputedStyle(document.querySelector(".wb-topbar")).display,
      layers: getComputedStyle(document.getElementById("wb-svg-layer")).pointerEvents,
    };
  });
  check("History opens a bar that fits, with the slider focused at now", bar.shown && bar.fits && bar.inside && bar.focused && bar.value === bar.max && bar.when === "Now", bar);
  check("the board is a view: chrome away, layers take no pointer", bar.topbar === "none" && bar.layers === "none", bar);
  const moments = Number(bar.max);
  check("the board's changes are three moments", moments === 3, moments);

  // Step back to the oldest moment with the keyboard.
  await page.keyboard.press("Home");
  await page.waitForTimeout(900);
  const oldest = await labels();
  const words = await page.evaluate(() => document.getElementById("wb-history-when").textContent);
  check("the oldest moment draws the board as it was then", oldest === "A,B", { oldest, words });
  check("the bar says when and what", /2 added/.test(words), words);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(900);
  check("the next moment: A renamed, B still there", (await labels()) === "A renamed,B", await labels());
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(900);

  // Nothing writes while the past is shown.
  const blocked = await page.evaluate(async () => {
    let refused = false;
    try {
      await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: "{}", board_id: window.currentBoardId }) });
    } catch {
      refused = true;
    }
    document.getElementById("whiteboard-container").dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    return refused;
  });
  check("a write to the board is refused while the past is shown", blocked, blocked);

  // Put the whole board back, one Undo step.
  const restoreOn = await page.evaluate(() => !document.getElementById("wb-history-restore").disabled);
  check("Put back is offered for a shown moment", restoreOn, restoreOn);
  await page.evaluate(() => document.getElementById("wb-history-restore").click());
  await page.waitForTimeout(1800);
  const after = await labels();
  const closed = await page.evaluate(() => document.getElementById("wb-history-bar").classList.contains("hidden") && !document.getElementById("library-view-whiteboard").classList.contains("wb-presenting"));
  check("Put back restores the board as it was and closes History", after === oldest && closed, { after, closed });
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1500);
  check("one Undo brings now back", (await labels()) === "A renamed,C", await labels());

  // Only the selection: A back to "A", C stays.
  {
    await page.evaluate((id) => { clearWbSelection(); selectWbItem("sketch", id); }, ids.a);
    await page.evaluate(() => wbRunCommand("history"));
    await page.waitForTimeout(700);
    await page.keyboard.press("Home");
    await page.waitForTimeout(900);
    await page.evaluate(() => document.getElementById("wb-history-restore-selection").click());
    await page.waitForTimeout(1800);
    check("putting back the selection changes only what was selected", (await labels()) === "A,C", await labels());
  }

  // Esc comes back to now without changing anything.
  await page.evaluate(() => wbRunCommand("history"));
  await page.waitForTimeout(700);
  await page.keyboard.press("Home");
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => wbState.sketches.length);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => ({ hidden: document.getElementById("wb-history-bar").classList.contains("hidden"), n: wbState.sketches.length }));
  check("Esc comes back to now", back.hidden && (await labels()) !== "" , { back, before });

  check("no console errors", errors.filter((e) => !/earlier version/.test(e)).length === 0, errors.slice(0, 5));
  const ok = summary();
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
