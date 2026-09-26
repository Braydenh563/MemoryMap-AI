// The owner, 2026-09-23 (INBOX 404): "what about code errors, debugging
// console or smth??" Run a .js and an .html document in Chromium and assert
// what the output panel says, line by line; that the sandbox has no network
// and no storage of this app's; that Stop stops; and that the types that
// cannot run say why. tests/test_run_sandbox.py holds the policy itself.
//
// Usage: BASE=http://127.0.0.1:8799 [THEME=dark] node docrun.js
const { boot } = require("./lib.js");

let bad = 0;
let good = 0;
const ok = (n, c, d) => {
  if (c) good += 1;
  else bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  //: The page being run is the user's, and its own uncaught errors are the
  //: thing under test: only the app's are counted here.
  page.on("pageerror", (e) => {
    if (!/about:srcdoc|blob:null/.test(String(e.stack))) errors.push(e.message);
  });
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  const J = JSON.stringify;

  const open = async (title, fileType, content) => {
    await page.evaluate(
      async ([t, f, c]) => {
        const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: t, content: c, file_type: f }) });
        await loadDocuments(d.id);
      },
      [title, fileType, content]
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
        })),
        page: panel.classList.contains("is-page"),
        frameH: Math.round(panel.querySelector(".cm-run-frame").getBoundingClientRect().height),
      };
    });
  const run = async (wait = 1500) => {
    await page.click("#doc-code-run");
    await page.waitForTimeout(wait);
    return output();
  };

  // --- JavaScript: console, lines, an uncaught error -----------------------------
  await open("hello.js", "js", 'console.log("hello", 1 + 1);\nconsole.warn({ a: 1 });\nthrow new Error("boom");');
  const visible = await page.evaluate(() => !document.getElementById("doc-code-run").classList.contains("hidden"));
  ok("a .js file shows Run", visible);
  let out = await run();
  ok("console.log arrives with its line", !!out && out.rows[0] && out.rows[0].text === "hello 2" && out.rows[0].line === "Line 1", J(out));
  ok("console.warn is a warning, objects as JSON", !!out && out.rows[1] && out.rows[1].cls === "is-warn" && out.rows[1].text === '{"a":1}' && out.rows[1].line === "Line 2", J(out && out.rows[1]));
  ok("an uncaught error is an error row on its line", !!out && out.rows[2] && out.rows[2].cls === "is-error" && /Uncaught (Error: )?boom/.test(out.rows[2].text) && out.rows[2].line === "Line 3", J(out && out.rows[2]));
  ok("and the run says it stopped on it", !!out && out.status === "Stopped by an error.", out && out.status);
  ok("a script shows no page", !!out && !out.page && out.frameH === 0, J(out && { page: out.page, h: out.frameH }));
  await page.evaluate(() => [...document.querySelectorAll(".cm-run-line")][2].click());
  await page.waitForTimeout(200);
  const caretLine = await page.evaluate(() => docCmView.state.doc.lineAt(docCmView.state.selection.main.head).number);
  ok("a line link goes to the line", caretLine === 3, `line ${caretLine}`);

  // --- the sandbox: no network, not this app's origin -----------------------------
  await open(
    "probe.js",
    "js",
    [
      'console.log("origin", self.origin);',
      'fetch("/health").then((r) => console.log("reached", r.status)).catch((e) => console.log("blocked", e.name));',
      'console.log("idb", typeof indexedDB === "undefined" ? "none" : "present");',
      "try { indexedDB.open('x').onerror = () => console.log('idb refused'); } catch (e) { console.log('idb refused'); }",
    ].join("\n")
  );
  out = await run(2000);
  const texts = (out ? out.rows : []).map((r) => r.text);
  ok("the code runs in an opaque origin", texts.includes("origin null"), J(texts));
  ok("and cannot reach this server", texts.some((t) => t.startsWith("blocked")) && !texts.some((t) => t.startsWith("reached")), J(texts));
  ok("nor open this app's storage", texts.includes("idb refused") || texts.includes("idb none"), J(texts));

  // --- Stop ---------------------------------------------------------------------------
  await open("tick.js", "js", 'setInterval(() => console.log("tick"), 40);');
  await run(400);
  await page.evaluate(() => [...document.querySelectorAll(".cm-run-head button")].find((b) => b.textContent.includes("Stop")).click());
  const afterStop = (await output()).rows.length;
  await page.waitForTimeout(500);
  out = await output();
  ok("Stop stops a running script", afterStop > 0 && out.rows.length === afterStop && out.status === "Stopped.", J({ afterStop, now: out.rows.length, status: out.status }));

  // --- HTML: the page, its console, its errors ----------------------------------------
  await open(
    "page.html",
    "html",
    '<h1>Hi</h1>\n<script>\nconsole.log("from the page");\nundefinedFn();\n</script>\n<script>fetch("/health").catch(() => console.error("page blocked"));</script>'
  );
  out = await run(1800);
  ok("an .html file renders its page in the panel", !!out && out.page && out.frameH > 60, J(out && { page: out.page, h: out.frameH }));
  ok("its console arrives with the line", !!out && out.rows.some((r) => r.text === "from the page" && r.line === "Line 3"), J(out && out.rows));
  ok("its errors too", !!out && out.rows.some((r) => r.cls === "is-error" && /undefinedFn/.test(r.text) && r.line === "Line 4"), J(out && out.rows));
  ok("and it cannot reach this server either", !!out && out.rows.some((r) => r.text === "page blocked"), J(out && out.rows));

  // --- what cannot run says why -----------------------------------------------------
  await open("types.ts", "ts", "let a: number = 1;");
  out = await run(300);
  ok("TypeScript says what it would need", !!out && out.rows.length === 1 && /compiled to JavaScript/.test(out.rows[0].text) && out.status === "Not run.", J(out));
  await open("notes3.md", "md", "Words");
  const hidden = await page.evaluate(() => document.getElementById("doc-code-run").classList.contains("hidden"));
  ok("prose has no Run", hidden);

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
