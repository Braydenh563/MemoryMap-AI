// Brief 70 (DOCUMENTS_PLAN 23, I2): one scripted debug session per language,
// driven through the panel in Chromium. Each opens a document, sets a
// breakpoint by clicking the gutter beside its line, adds a watch, presses
// Debug, and waits for the stop; then steps three times (the lines each step
// lands on), reads the watched value, continues to the exception the
// program ends with and checks the stop there, and continues to the end.
// Prints the time from Debug to the first stop.
//
// Usage: BASE=http://127.0.0.1:8826 [WIDTH=390] [ONLY=js,py] node code-debug.js
// WIDTH=390 runs the phone shell (touch). Python needs the Pyodide extra
// installed in the server's data dir; without it the Python session is
// skipped and says so.
const { boot } = require("./lib.js");

const WIDTH = Number(process.env.WIDTH || 1440);
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const phone = WIDTH < 600;
let bad = 0;
let good = 0;
const ok = (n, c, d) => {
  if (c) good += 1;
  else bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};
const J = JSON.stringify;
const times = {};

const PROGRAMS = {
  js: {
    title: "debug.js",
    type: "js",
    text: "function double(n) {\n  const m = n * 2;\n  return m;\n}\nlet total = 0;\nfor (let i = 0; i < 3; i++) {\n  total += double(i);\n}\nconsole.log(`total ${total}`);\nnull.boom();\n",
    line: 7,
    watch: "total * 10",
    steps: ["in", "over", "over"],
    throwLine: 10,
  },
  ts: {
    title: "debug.ts",
    type: "ts",
    text: "function double(n: number): number {\n  const m: number = n * 2;\n  return m;\n}\nlet total: number = 0;\nfor (let i = 0; i < 3; i++) {\n  total += double(i);\n}\nconsole.log(`total ${total}`);\nthrow new Error(\"done\");\n",
    line: 7,
    watch: "total * 10",
    steps: ["in", "over", "over"],
    throwLine: 10,
  },
  py: {
    title: "debug.py",
    type: "py",
    text: "def double(n):\n    m = n * 2\n    return m\n\ntotal = 0\nfor i in range(3):\n    total += double(i)\nprint(f\"total {total}\")\nNone.boom()\n",
    line: 7,
    watch: "total * 10",
    steps: ["in", "over", "over"],
    throwLine: 9,
  },
};

(async () => {
  const { browser, page } = await boot(phone
    ? { viewport: { width: WIDTH, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: WIDTH, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => {
    if (!/about:srcdoc|blob:null/.test(String(e.stack))) errors.push(e.message);
  });
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  const pyReady = await page.evaluate(() => docRunPythonReady());

  const open = async (p) => {
    await page.evaluate(async ([t, f, c]) => {
      const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: t, content: c, file_type: f }) });
      await loadDocuments(d.id);
    }, [p.title, p.type, p.text]);
    await page.waitForTimeout(1200);
  };
  const debugState = () => page.evaluate(() => {
    const v = document.querySelector("#doc-run-debug");
    if (!v) return null;
    return {
      status: document.querySelector(".cm-run-status")?.textContent || "",
      where: v.querySelector(".cm-debug-where")?.textContent || "",
      line: DOC_DEBUG.stop ? DOC_DEBUG.stop.line : null,
      reason: DOC_DEBUG.stop ? DOC_DEBUG.stop.reason : null,
      vars: [...v.querySelectorAll(".cm-debug-vars .cm-debug-row")].map((r) => `${r.querySelector(".cm-debug-name")?.textContent}=${r.querySelector(".cm-debug-value")?.textContent}`),
      watch: [...v.querySelectorAll(".cm-debug-watch .cm-debug-row")].map((r) => `${r.querySelector(".cm-debug-name")?.textContent}=${r.querySelector(".cm-debug-value")?.textContent}`),
      stack: [...v.querySelectorAll(".cm-debug-stack .cm-debug-row")].map((r) => r.textContent),
      breaks: [...v.querySelectorAll(".cm-debug-breaks .cm-debug-go")].map((r) => r.textContent),
      thrown: v.querySelector(".cm-debug-thrown:not(.hidden)")?.textContent || "",
      here: [...document.querySelectorAll(".cm-debug-here")].length,
      shown: getComputedStyle(v).display !== "none",
    };
  });
  //: Wait until the session is paused (or over), measured in the page.
  const waitStop = (max = 60000) => page.evaluate(async (limit) => {
    const t0 = performance.now();
    while (performance.now() - t0 < limit) {
      if (DOC_DEBUG.stop || (docRun && !docRun.debug && !docRun.running)) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    return Math.round(performance.now() - t0);
  }, max);

  for (const lang of ["js", "ts", "py"]) {
    if (ONLY.length && !ONLY.includes(lang)) continue;
    const p = PROGRAMS[lang];
    if (lang === "py" && !pyReady) {
      console.log("SKIP  py: the Pyodide extra is not installed here");
      continue;
    }
    await open(p);
    //: The panel open first (Run), so its Debug button and tab exist.
    if (lang !== "py") {
      await page.click("#doc-code-run");
      await page.waitForTimeout(800);
    } else {
      await page.evaluate(() => docRunCode());
      await page.waitForFunction(() => /Finished|error/.test(document.querySelector(".cm-run-status")?.textContent || ""), null, { timeout: 60000 }).catch(() => {});
    }
    //: A breakpoint by clicking the lane beside the line's number.
    const at = await page.evaluate(async (n) => {
      const pos = docCmView.state.doc.line(n).from;
      //: On a phone the panel covers the lower lines: the line comes into view first.
      docCmView.dispatch({ effects: CM6.view.EditorView.scrollIntoView(pos, { y: "start" }) });
      await new Promise((r) => setTimeout(r, 150));
      const c = docCmView.coordsAtPos(pos);
      const lane = document.querySelector(".cm-debug-gutter").getBoundingClientRect();
      return { x: lane.left + lane.width / 2, y: (c.top + c.bottom) / 2, laneW: lane.width };
    }, p.line);
    if (phone) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(200);
    const marks = await page.evaluate(() => docDebugBreaks());
    ok(`${lang}: a click in the lane sets a breakpoint on line ${p.line}`, marks.length === 1 && marks[0].line === p.line, J(marks));
    await page.click("#doc-run-tab-debug");
    await page.fill(".cm-debug-watch-add", p.watch);
    await page.press(".cm-debug-watch-add", "Enter");
    //: Debug, timed to the first stop.
    const t0 = Date.now();
    await page.click('.cm-debug-act[data-cmd="continue"]');
    const inPage = await waitStop();
    times[lang] = { firstStop: Date.now() - t0, inPage };
    let s = await debugState();
    ok(`${lang}: Debug stops on the breakpoint`, s && s.line === p.line && s.reason === "breakpoint" && s.here === 1, J(s && { line: s.line, reason: s.reason, here: s.here, where: s.where }));
    ok(`${lang}: the watch is evaluated in the stopped frame`, s && s.watch[0] === `${p.watch}=0`, J(s && s.watch));
    ok(`${lang}: variables show the loop's names`, s && s.vars.some((v) => /^total=0$/.test(v)), J(s && s.vars.slice(0, 6)));
    //: The panel's head and the Debug tab fit their width while paused.
    const fit = await page.evaluate(() => {
      const head = document.querySelector(".cm-run-head");
      const view = document.querySelector("#doc-run-debug");
      return { headW: head.clientWidth, items: [...head.children].filter((c) => c.offsetWidth).map((c) => (c.getAttribute("aria-label") || c.className).slice(0, 12) + ":" + c.offsetWidth).join(" "), head: head.scrollWidth - head.clientWidth, view: view.scrollWidth - view.clientWidth, page: document.documentElement.scrollWidth - innerWidth };
    });
    ok(`${lang}: nothing runs past the panel's width while paused`, fit.head <= 0 && fit.view <= 0 && fit.page <= 0, J(fit));
    const lines = [];
    const stacks = [];
    for (const step of p.steps) {
      const key = { in: "F11", over: "F10", out: "Shift+F11" }[step];
      if (phone) await page.click(`.cm-debug-act[data-cmd="${step}"]`);
      else {
        await page.focus(".cm-content");
        await page.keyboard.press(key);
      }
      await waitStop(10000);
      s = await debugState();
      lines.push(s.line);
      stacks.push(s.stack.length);
    }
    ok(`${lang}: three steps land on lines`, lines.length === 3 && lines.every((n) => Number.isInteger(n)) && lines[0] === 2 && lines[1] === 3, J({ lines, stacks }));
    ok(`${lang}: step in shows the call in the stack`, stacks[0] === 2, J(stacks));
    //: Continue: the breakpoint again on the next turn, then once more.
    for (let i = 0; i < 4 && s && s.reason !== "exception"; i += 1) {
      await page.click('.cm-debug-act[data-cmd="continue"]');
      await waitStop(10000);
      s = await debugState();
      if (!s || !s.line) break;
    }
    ok(`${lang}: the exception stops on its line with its text`, s && s.reason === "exception" && s.line === p.throwLine && s.thrown.length > 0, J(s && { line: s.line, reason: s.reason, thrown: s.thrown.slice(0, 120) }));
    ok(`${lang}: the watch reads the end value`, s && s.watch[0] === `${p.watch}=60`, J(s && s.watch));
    await page.click('.cm-debug-act[data-cmd="continue"]');
    await page.waitForFunction(() => docRun && !docRun.debug, null, { timeout: 10000 }).catch(() => {});
    s = await debugState();
    ok(`${lang}: the session ends, the line unlit`, s && !s.line && s.here === 0 && /Stopped by an error|Finished/.test(s.status), J(s && { status: s.status, here: s.here }));
    //: The keys: F5 from the editor starts a session, Shift+F5 stops it.
    if (!phone && lang === "js") {
      await page.focus(".cm-content");
      await page.keyboard.press("F5");
      await waitStop(10000);
      const k = await debugState();
      await page.keyboard.press("Shift+F5");
      await page.waitForFunction(() => docRun && !docRun.debug, null, { timeout: 5000 }).catch(() => {});
      const k2 = await debugState();
      ok("js: F5 in the editor starts a session, Shift+F5 stops it", k.line === p.line && /Stopped/.test(k2.status) && !k2.line, J({ line: k.line, status: k2.status }));
    }
    //: Clear the breakpoint and the watch for the next language.
    await page.evaluate(() => { DOC_DEBUG.watches.length = 0; });
  }
  ok("no page errors", errors.length === 0, J(errors));
  console.log(`times ${WIDTH}: ${J(times)}`);
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
})();
