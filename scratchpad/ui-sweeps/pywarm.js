// Brief 101c item 4: the Python runtime loads once per session. Opens three
// .py documents in turn and presses Run on each; prints click-to-first-row and
// click-to-end per run, and how many Pyodide module loads the page's workers
// made. Needs the Pyodide extra installed in the server's data dir.
//
// Usage: BASE=http://127.0.0.1:8798 [WAIT=6000] node scratchpad/ui-sweeps/pywarm.js
// WAIT is the pause between opening the first document and pressing Run, the
// time a person spends reading it; the runtime warms up during it.
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  // A worker the sandbox frame starts is its own thread; its runtime loads
  // show up as requests for pyodide.asm.wasm, one per load.
  let loads = 0;
  page.on("request", (r) => { if (/pyodide\.asm\.wasm/.test(r.url())) loads += 1; });
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  const ready = await page.evaluate(async () => docRunPythonReady());
  if (!ready) { console.log("FAIL  the Pyodide extra is not installed here"); process.exit(1); }
  const open = async (title, content) => {
    await page.evaluate(async ([t, c]) => {
      const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: t, content: c, file_type: "py" }) });
      await loadDocuments(d.id);
    }, [title, content]);
    await page.waitForTimeout(800);
  };
  const run = async (label) => {
    const t = await page.evaluate(async () => {
      const t0 = performance.now();
      let first = null;
      document.querySelector("#doc-code-run").click();
      while (performance.now() - t0 < 60000) {
        await new Promise((r) => setTimeout(r, 25));
        const panel = document.querySelector(".cm-run-panel");
        if (!panel) continue;
        if (first === null && panel.querySelector(".cm-run-row")) first = performance.now() - t0;
        const status = panel.querySelector(".cm-run-status").textContent;
        const stop = panel.querySelector(".cm-run-head button[title='Stop the run']");
        if (status && !/^(Preparing|Running|Starting|Checking|Loading)/.test(status) && stop && stop.disabled) break;
      }
      const rows = [...document.querySelectorAll(".cm-run-panel .cm-run-text")].map((r) => r.textContent);
      return { first: first === null ? null : Math.round(first), end: Math.round(performance.now() - t0), rows };
    });
    console.log(label.padEnd(34), "first", String(t.first).padStart(6), "ms  end", String(t.end).padStart(6), "ms  loads so far", loads, JSON.stringify(t.rows));
    return t;
  };
  await open("warm_a.py", "x = 41\nprint('a', x + 1)\n");
  await page.waitForTimeout(Number(process.env.WAIT || 0));
  await run(`1 first document (waited ${process.env.WAIT || 0} ms)`);
  await open("warm_b.py", "print('b', 'only b')\ntry:\n    print(x)\nexcept NameError:\n    print('b does not see a')\n");
  const b = await run("2 second document");
  await open("warm_c.py", "print('c')\n");
  await run("3 third document");
  // The console of a document that never ran must not read the last
  // document's variables: warm_c ran `print('c')` only, so ask for the last run's `z`
  // from a fresh document whose panel was opened after the shared page had
  // run others.
  await open("warm_e.py", "z = 5\nprint('e', z)\n");
  await run("4 a document that leaves z behind");
  await open("warm_d.py", "y = 1\n");
  await page.evaluate(() => docPanelToggle("console"));
  await page.waitForTimeout(500);
  const consoleRows = await page.evaluate(async () => {
    await docConsoleEval("z");
    await new Promise((r) => setTimeout(r, 1500));
    return [...document.querySelectorAll(".cm-run-panel [data-pane='console'] .cm-run-text, .cm-run-panel .cm-run-log .cm-run-text")].map((r) => r.textContent);
  });
  console.log("console of a fresh document asks for z:", JSON.stringify(consoleRows));
  console.log("namespace isolation:", JSON.stringify(b.rows));
  console.log("runtime loads (pyodide.asm.wasm requests):", loads);
  await browser.close();
})();
