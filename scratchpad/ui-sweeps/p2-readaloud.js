// INBOX 404, read aloud. Headless Chromium has no system voices, so the
// voice is a stand-in that records what it is asked to say and ends each
// utterance after 80 ms; what is measured is the app's half: the sentences
// it sends, in order, as words rather than markdown, the highlight on the
// sentence being spoken, the selection as the range, Esc and Stop.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  : " + d}`); };
const DOC = "# Plan\n\nThe first sentence is here. The [second one](https://example.com) has a link!\n\n- A **bold** item\n\n```\ncode is not read.\n```\n\nLast {--old --}words.\n";
(async () => {
  const { browser, page } = await boot();
  const real = await page.evaluate(() => ({ has: "speechSynthesis" in window, voices: window.speechSynthesis ? speechSynthesis.getVoices().length : -1 }));
  console.log("      real speechSynthesis:", JSON.stringify(real));
  await page.evaluate(() => {
    window.__spoken = [];
    window.__lit = [];
    window.__cancelled = 0;
    const fake = {
      speak(u) {
        setTimeout(() => {
          window.__spoken.push(u.text);
          const lit = document.querySelector(".cm-read-aloud");
          window.__lit.push(lit ? lit.textContent : null);
          setTimeout(() => { if (!u.__cancelled) u.onend && u.onend({}); }, 80);
        }, 10);
        fake.current = u;
      },
      cancel() { window.__cancelled += 1; if (fake.current) fake.current.__cancelled = true; },
      getVoices() { return []; },
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
  });
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async (doc) => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Read aloud probe", content: doc }) });
    await loadDocuments(d.id);
    setDocView("live");
  }, DOC);
  await page.waitForTimeout(1200);

  // From the caret at the top: the whole document.
  await page.evaluate(() => { docCmView.focus(); docCmView.dispatch({ selection: { anchor: 0 } }); });
  await page.click("#doc-dock-menu > summary");
  await page.waitForTimeout(150);
  await page.click("#doc-read-aloud");
  await page.waitForTimeout(250);
  const during = await page.evaluate(() => ({ stop: !document.getElementById("doc-read-stop").hidden, row: document.getElementById("doc-read-aloud").textContent.trim() }));
  ok("while reading, Stop is on the status bar and the row says Stop", during.stop && during.row === "Stop reading", JSON.stringify(during));
  await page.waitForTimeout(1500);
  const all = await page.evaluate(() => ({ spoken: window.__spoken, lit: window.__lit, stop: !document.getElementById("doc-read-stop").hidden, left: document.querySelectorAll(".cm-read-aloud").length }));
  console.log("      spoken:", JSON.stringify(all.spoken));
  ok("each sentence is spoken in order, as words", JSON.stringify(all.spoken) === JSON.stringify(["Plan", "The first sentence is here.", "The second one has a link!", "A bold item", "Last words."]), JSON.stringify(all.spoken));
  ok("the sentence being spoken is the one highlighted", all.lit[1] === "The first sentence is here." && all.lit[2] && all.lit[2].startsWith("The "), JSON.stringify(all.lit));
  ok("at the end the highlight and Stop go", !all.stop && all.left === 0, JSON.stringify({ stop: all.stop, left: all.left }));

  // The selection only.
  await page.evaluate(() => { window.__spoken = []; const t = docCmView.state.doc.toString(); const a = t.indexOf("The first"); docCmView.dispatch({ selection: { anchor: a, head: a + "The first sentence is here.".length } }); });
  await page.evaluate(() => docReadAloudStart());
  await page.waitForTimeout(600);
  const sel = await page.evaluate(() => window.__spoken);
  ok("a selection reads just the selection", JSON.stringify(sel) === JSON.stringify(["The first sentence is here."]), JSON.stringify(sel));

  // Esc stops mid-way.
  await page.evaluate(() => { window.__spoken = []; docCmView.focus(); docCmView.dispatch({ selection: { anchor: 0 } }); docReadAloudStart(); });
  await page.waitForTimeout(150);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const esc = await page.evaluate(() => ({ spoken: window.__spoken.length, reading: Boolean(docReadAloud), lit: document.querySelectorAll(".cm-read-aloud").length }));
  ok("Esc stops it and clears the highlight", esc.spoken <= 2 && !esc.reading && esc.lit === 0, JSON.stringify(esc));

  console.log(bad ? `${bad} FAILED` : "all passed");
  await browser.close();
})();
