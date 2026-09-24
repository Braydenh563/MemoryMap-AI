// The owner, 2026-09-24 (INBOX 404): "Run Python files: yes, as an opt-in
// extra". Run a .py document in Chromium before and after the Pyodide extra
// is installed, and assert what the output panel says: before, the prompt
// and its button to Settings; the install itself, from a local copy of the
// release archive so nothing reaches the network; after, print output with
// its lines, a loop, an exception on its line, the ten-second stop, Stop,
// and that the sandbox still cannot reach the app. tests/test_run_sandbox.py
// holds the policy; tests/test_extras_download.py the download.
//
// Usage (the app must be started with the mirror variable, so its Install
// fetches from this script's own file server rather than GitHub):
//   mkdir -p /tmp/mm-extras-mirror
//   cp pyodide-core-314.0.7.tar.bz2 /tmp/mm-extras-mirror/
//   MEMORYMAP_EXTRAS_MIRROR=http://127.0.0.1:8797 \
//     bash scratchpad/ui-sweeps/serve.sh 8791 /tmp/mm-extras
//   BASE=http://127.0.0.1:8791 [MIRROR_DIR=/tmp/mm-extras-mirror] \
//     [MIRROR_PORT=8797] node docrunpy.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const { boot } = require("./lib.js");

const MIRROR_DIR = process.env.MIRROR_DIR || "/tmp/mm-extras-mirror";
const MIRROR_PORT = Number(process.env.MIRROR_PORT || 8797);

let bad = 0;
let good = 0;
const ok = (n, c, d) => {
  if (c) good += 1;
  else bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};

//: The local mirror: the archive by its own file name, nothing else.
const served = [];
const mirror = http.createServer((req, res) => {
  const name = path.basename(decodeURIComponent(req.url.split("?")[0]));
  const file = path.join(MIRROR_DIR, name);
  served.push(name);
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Length": fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((resolve) => mirror.listen(MIRROR_PORT, "127.0.0.1", resolve));
  const { browser, page } = await boot();
  const errors = [];
  const outside = [];
  page.on("pageerror", (e) => {
    if (!/about:srcdoc|blob:null/.test(String(e.stack))) errors.push(e.message);
  });
  //: Every request the browser makes, so "no network" is a list, not a hope.
  page.on("request", (r) => {
    if (!r.url().startsWith(process.env.BASE || "http://127.0.0.1:8781") && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) {
      outside.push(r.url());
    }
  });
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  const J = JSON.stringify;

  const open = async (title, content) => {
    await page.evaluate(
      async ([t, c]) => {
        const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: t, content: c, file_type: "py" }) });
        await loadDocuments(d.id);
      },
      [title, content]
    );
    await page.waitForTimeout(1200);
  };
  const output = () =>
    page.evaluate(() => {
      const panel = document.querySelector(".cm-run-panel");
      if (!panel) return null;
      return {
        status: panel.querySelector(".cm-run-status").textContent,
        rows: [...panel.querySelectorAll(".cm-run-row")].map((r) => ({
          cls: r.className.replace("cm-run-row ", ""),
          text: r.querySelector(".cm-run-text").textContent,
          line: r.querySelector(".cm-run-line")?.textContent || null,
          button: r.querySelector(".cm-run-install")?.textContent.trim() || null,
        })),
      };
    });
  //: Run, then wait until the status stops saying it is starting or running,
  //: or `ms` passes.
  const run = async (ms = 20000) => {
    await page.click("#doc-code-run");
    const t0 = Date.now();
    await page.waitForTimeout(300);
    //: When the script itself began ("Running" follows "Starting Python"
    //: once the runtime is loaded), so the ten seconds are measured from
    //: where the app starts counting them.
    let began = null;
    while (Date.now() - t0 < ms) {
      const o = await output();
      if (o && o.status === "Running" && began === null) began = Date.now();
      if (o && !/^(Checking for Python|Starting Python|Running)$/.test(o.status)) {
        return { ...o, ms: Date.now() - t0, ran: began === null ? null : Date.now() - began };
      }
      await page.waitForTimeout(150);
    }
    return { ...(await output()), ms: Date.now() - t0, ran: began === null ? null : Date.now() - began };
  };

  // --- before the install: the prompt and its button ----------------------------------
  await page.evaluate(async () => {
    const body = await apiJson("/extras");
    if (body.extras.find((e) => e.id === "pyodide").installed) await apiJson("/extras/pyodide/uninstall", { method: "POST" });
  });
  await page.waitForTimeout(800);
  await open("hello.py", 'print("hello", 1 + 1)\nfor i in range(3):\n    print("loop", i)\nprint(1 / 0)');
  const visible = await page.evaluate(() => !document.getElementById("doc-code-run").classList.contains("hidden"));
  ok("a .py file shows Run", visible);
  let out = await run(4000);
  ok("before the install, Run says what is missing", !!out && out.rows.length === 1 && /Pyodide extra/.test(out.rows[0].text) && out.status === "Not run.", J(out));
  ok("and offers the button", !!out && out.rows[0] && out.rows[0].button === "Install Python", J(out && out.rows[0]));
  await page.click(".cm-run-install");
  await page.waitForTimeout(1500);
  const settings = await page.evaluate(() => {
    const row = document.getElementById("extra-row-pyodide");
    const r = row && row.getBoundingClientRect();
    return {
      open: !document.getElementById("settings-modal").classList.contains("hidden"),
      row: !!row,
      inView: !!r && r.top >= 0 && r.bottom <= innerHeight,
      focused: !!row && row.contains(document.activeElement),
      label: document.activeElement?.textContent.trim(),
    };
  });
  ok("the button opens Settings at the Python row, its Install focused", settings.open && settings.row && settings.inView && settings.focused && /Install/.test(settings.label), J(settings));

  // --- the install, from the local mirror ------------------------------------------------
  await page.keyboard.press("Enter");
  const shown = await page.waitForSelector(".confirm-overlay .confirm-text", { timeout: 3000 }).catch(() => null);
  const dialogText = shown ? await shown.textContent() : "";
  ok("the confirm says where from, the checksum, and no restart", /github\.com/.test(dialogText) && /checksum/.test(dialogText) && /no restart/.test(dialogText), J(dialogText.slice(0, 240)));
  await page.evaluate(() => [...document.querySelectorAll(".confirm-overlay .confirm-actions button")].find((b) => b.textContent.trim() !== "Cancel").click());
  const t0 = Date.now();
  let installed = false;
  while (Date.now() - t0 < 60000) {
    installed = await page.evaluate(async () => (await apiJson("/extras")).extras.find((e) => e.id === "pyodide").installed);
    if (installed) break;
    await page.waitForTimeout(500);
  }
  ok("the extra installs from the local copy", installed, `after ${Date.now() - t0} ms; mirror served ${J(served)}`);
  ok("the mirror served the archive once, by its own name", served.length === 1 && served[0] === "pyodide-core-314.0.7.tar.bz2", J(served));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById("settings-close")?.click());
  await page.waitForTimeout(400);

  // --- print, a loop, an exception on its line --------------------------------------------
  out = await run(40000);
  const first = out.ms;
  const rows = out ? out.rows : [];
  ok("print arrives with its line", rows[0] && rows[0].text === "hello 2" && rows[0].line === "Line 1", J(rows[0]));
  ok("a loop's prints carry the loop body's line", rows.slice(1, 4).map((r) => r.text).join("|") === "loop 0|loop 1|loop 2" && rows.slice(1, 4).every((r) => r.line === "Line 3"), J(rows.slice(1, 4)));
  ok("an exception is an error row on its line", rows[4] && rows[4].cls === "is-error" && /ZeroDivisionError/.test(rows[4].text) && rows[4].line === "Line 4", J(rows[4]));
  ok("and the run says it stopped on it", out.status === "Stopped by an error.", out.status);
  await page.evaluate(() => [...document.querySelectorAll(".cm-run-line")].pop().click());
  await page.waitForTimeout(200);
  const caretLine = await page.evaluate(() => docCmView.state.doc.lineAt(docCmView.state.selection.main.head).number);
  ok("the error's line link goes to the line", caretLine === 4, `line ${caretLine}`);
  out = await run(20000);
  ok("a second run reuses the loaded runtime", out.ms < first && out.rows.length === 5, J({ first, second: out.ms, rows: out.rows.length }));

  // --- errors inside functions, syntax errors, a finished run -------------------------------
  await open("deep.py", "def f(n):\n    return g(n)\n\ndef g(n):\n    return n[0]\n\nprint('start')\nf(5)");
  out = await run();
  ok("an error inside a function points at the innermost line of the document", out.rows.some((r) => r.cls === "is-error" && /TypeError/.test(r.text) && r.line === "Line 5"), J(out.rows));
  await open("syntax.py", "print('a')\nif True\n    print('b')");
  out = await run();
  ok("a syntax error is on its line, and nothing ran", out.rows.length === 1 && /SyntaxError/.test(out.rows[0].text) && out.rows[0].line === "Line 2", J(out.rows));
  await open("fine.py", "import math\nprint(math.sqrt(16))");
  out = await run();
  ok("the standard library imports, and the run finishes", out.rows[0] && out.rows[0].text === "4.0" && out.status === "Finished.", J(out));
  await open("nonet.py", "import sys\nprint(sys.platform)\nprint(input())");
  out = await run();
  ok("input() gets the end of the input, not a hang", out.rows.some((r) => /EOFError/.test(r.text)), J(out.rows));

  // --- the ten seconds, the line cap, Stop ------------------------------------------------
  await open("forever.py", "while True:\n    pass");
  out = await run(15000);
  ok("a loop that never ends is stopped ten seconds after it began", /Stopped after 10 seconds/.test(out.status) && out.ran >= 9500 && out.ran < 12000, J({ status: out.status, ran: out.ran, total: out.ms }));
  await open("flood.py", "i = 0\nwhile True:\n    print(i)\n    i += 1");
  out = await run(15000);
  ok("a flood of output stops at five hundred lines", /500 lines/.test(out.status) && out.rows.length === 500, J({ status: out.status, rows: out.rows.length }));
  await open("slow.py", "import time\nfor i in range(100):\n    print('tick', i)\n    time.sleep(0.05)");
  await page.click("#doc-code-run");
  await page.waitForTimeout(3000);
  await page.evaluate(() => [...document.querySelectorAll(".cm-run-head button")].find((b) => b.textContent.includes("Stop")).click());
  const afterStop = (await output()).rows.length;
  await page.waitForTimeout(800);
  out = await output();
  ok("Stop stops a running script", out.rows.length === afterStop && out.status === "Stopped.", J({ afterStop, now: out.rows.length, status: out.status }));
  out = await run();
  ok("and the next run starts a fresh runtime and works", out.rows.length === 100 && out.rows[99].text === "tick 99", J({ rows: out.rows.length, status: out.status }));

  // --- still the sandbox ------------------------------------------------------------------
  await open(
    "probe.py",
    "import js\nprint('origin', js.self.origin)\ntry:\n    import pyodide.http\n    r = pyodide.http.open_url('/health')\n    print('reached')\nexcept Exception as e:\n    print('blocked', type(e).__name__)"
  );
  out = await run();
  const texts = out.rows.map((r) => r.text);
  ok("Python runs in an opaque origin", texts.includes("origin null"), J(texts));
  ok("and cannot reach the app", texts.some((t) => t.startsWith("blocked")) && !texts.includes("reached"), J(texts));

  // --- JavaScript still runs in the same panel after Python ----------------------------------
  await page.evaluate(async () => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "after.js", content: 'console.log("js again")', file_type: "js" }) });
    await loadDocuments(d.id);
  });
  await page.waitForTimeout(1200);
  out = await run();
  ok("a .js file still runs after a .py one", out.rows[0] && out.rows[0].text === "js again", J(out.rows));

  ok("no request left this machine's app", outside.length === 0, J(outside.slice(0, 5)));
  ok("no errors from the app itself", errors.length === 0, J(errors.slice(0, 3)));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  mirror.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error(e);
  mirror.close();
  process.exit(2);
});
