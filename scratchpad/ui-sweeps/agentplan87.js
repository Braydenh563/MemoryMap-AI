// Brief 87 rows 3 and 4 against the fake transport: a plan proposal lists
// each step's writes before the first; Run the plan; Stop at step 2 leaves
// step 1's write on the undo bar; a full run then Ctrl+Z restores the last
// note byte-equal. MODE=stop|full IDS=[a,b]. The model is scratchpad/fake_openai_server.py
// with FAKE_SCRIPT (make_plan with two act steps naming notes a and b, then
// pin_note on a and tag_note on b) and, for MODE=stop, --round-delay 2500;
// point the app at it with POST /models/provider and /models/chat-model.
const { boot } = require(process.env.SW ? process.env.SW + "/lib.js" : "./lib.js");
const MODE = process.env.MODE || "full";
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const out = { MODE };
  const ids = JSON.parse(process.env.IDS);
  const read = () => page.evaluate(async (ids) => Promise.all(ids.map(async (id) => { const e = await apiJson(`/entries/${id}`); return JSON.stringify({ content: e.content, tags: e.tags, pinned: e.pinned ?? e.is_pinned }); })), ids);
  out.before = await read();
  await page.evaluate(() => toggleAgentPalette()); await page.waitForTimeout(500);
  await page.fill("#command-palette-input", "tidy the two notes"); await page.keyboard.press("Enter");
  await page.waitForSelector(".plan-proposal", { timeout: 20000 });
  out.proposal = await page.evaluate(() => [...document.querySelectorAll(".plan-proposal .plan-steps li")].map((li) => li.textContent));
  out.writesBeforeFirst = await page.evaluate(() => document.querySelectorAll(".plan-proposal .plan-step-writes").length);
  await page.locator(".plan-proposal button", { hasText: "Run the plan" }).click();
  if (MODE === "stop") {
    await page.waitForFunction(() => document.querySelector('.plan-steps li[data-state="running"]') && document.querySelectorAll('.plan-steps li[data-state="done"]').length === 1, null, { timeout: 30000 });
    out.atStop = await page.evaluate(() => ({ run: !!cmdPaletteRun, stopShown: !document.getElementById("command-palette-stop").classList.contains("hidden"), t: Math.round(performance.now()) }));
    await page.click("#command-palette-stop");
    out.afterStop = await page.evaluate(() => ({ run: !!cmdPaletteRun, t: Math.round(performance.now()) }));
    await page.waitForTimeout(2500);
  } else {
    await page.waitForFunction(() => document.querySelectorAll('.plan-steps li[data-state="done"]').length >= 2, null, { timeout: 40000 });
    await page.waitForTimeout(1500);
  }
  out.states = await page.evaluate(() => [...document.querySelectorAll(".step-plan .plan-steps li")].map((li) => li.dataset.state));
  out.stepChanges = await page.evaluate(() => [...document.querySelectorAll(".step-plan .plan-step-changes")].map((b) => b.textContent.replace(/\s+/g, " ").trim().slice(0, 120)));
  out.diffs = await page.evaluate(() => document.querySelectorAll(".step-plan .diff-viewer").length);
  out.undoBar = await page.evaluate(() => undoStack.map((a) => a.label));
  out.runUndo = await page.evaluate(() => !![...document.querySelectorAll("button")].find((b) => /Undo the run/.test(b.textContent)));
  out.afterRun = await read();
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.evaluate(() => document.activeElement?.blur()); await page.mouse.click(5, 450);
  await page.keyboard.press("Control+z"); await page.waitForTimeout(1500);
  out.afterCtrlZ = await read();
  out.lastRestored = MODE === "full" ? out.afterCtrlZ[1] === out.before[1] && out.afterRun[1] !== out.before[1] : out.afterCtrlZ[0] === out.before[0] && out.afterRun[0] !== out.before[0];
  out.otherKept = MODE === "full" ? out.afterCtrlZ[0] === out.afterRun[0] : null;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
