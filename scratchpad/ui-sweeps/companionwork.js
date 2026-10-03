// INBOX 443, the owner: "the companion doesnt change action for related
// actions when things are happening like for the tag and file with atlas
// note function running with atlas reading the note". The companion is
// wired to the app's model work through one hook (avatars.js,
// `nameMarkBuddyWork`, watching `fetch`). This holds each kind of call open
// for 3s (a route that waits, then lets it through or answers 500) and
// samples the companion while it runs and after it ends:
//   re-evaluate (the card's "Atlas is reading…", also Tag with Atlas): reads;
//   Improve writing: thinks; OCR: reads; a failure: a shrug.
// A note saved and filed is sampled too when a model answers (FAKE, a fake
// OpenAI server's port, as companionchat.js).
// Env: KIND (atlas), FAKE (8774). Exits 1 when a busy sample shows no work
// state or the end shows no reaction.
const { boot } = require("./lib.js");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const fake = process.env.FAKE || "8774";
  await page.evaluate(async (port) => apiJson("/models/provider", { method: "POST", body: JSON.stringify({ provider: "openai", base_url: `http://127.0.0.1:${port}/v1` }) }).catch(() => null), fake);
  await page.evaluate((k) => {
    localStorage.removeItem("nm-buddy-spots");
    const b = document.getElementById("avatar-buddy");
    b.value = k;
    b.dispatchEvent(new Event("change", { bubbles: true }));
  }, process.env.KIND || "atlas");
  let fail = false;
  await page.route(/\/entries\/[^/]+\/reevaluate$|\/entries\/improve$|\/media\/[^/]+\/ocr$/, async (route) => {
    await wait(3000);
    if (route.request().url().includes("fail=1") || (await page.evaluate(() => window.__nmbFail === true))) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "no model" }) });
    } else if (route.request().url().includes("/ocr")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    } else await route.continue();
  });
  //: The fake model files a note at once: the filing poll is held 3s so
  //: the note is seen pending, as it is behind a real model's queue.
  await page.route(/\/entries\/[^/]+\/filing$/, async (route) => {
    await wait(3000);
    await route.continue();
  });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(2500);
  const state = () => page.evaluate(() => {
    const buddy = document.getElementById("nm-buddy");
    return {
      act: nmb.act || "-", reading: buddy.classList.contains("nmb-reading"), think: buddy.classList.contains("nmb-think"),
      expr: buddy.dataset.expr || "-", atlas: typeof atlasMoodNow !== "undefined" ? atlasMoodNow : "-", work: [...nmbWork.values()].join(",") || "-",
    };
  });
  const runs = [
    ["save and file a note", () => apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "Companion work sweep: the sourdough starter needs feeding twice a day.", defer_filing: true }) }).then((e) => (window.__nmbEntry = e)).then((e) => watchFiling(e, { quiet: true })), "read", false],
    ["re-evaluate (Tag with Atlas)", () => reevaluateEntry(window.__nmbEntry), "read", false],
    ["Improve writing", () => apiJson("/entries/improve", { method: "POST", body: JSON.stringify({ text: "this are a sentence", mode: "polish" }) }).catch(() => null), "think", false],
    ["OCR", () => fetch(`/media/x/ocr`, { method: "POST", headers: { "X-Auth-Token": authToken() } }).catch(() => null), "read", false],
    ["re-evaluate, failing", () => reevaluateEntry(window.__nmbEntry), "read", true],
  ];
  for (const [label, run, want, failing] of runs) {
    await page.evaluate((f) => (window.__nmbFail = f), failing);
    await page.evaluate((fn) => { window.__nmbRun = (0, eval)(`(${fn})`); window.__nmbRun(); }, run.toString());
    await page.waitForTimeout(1200);
    const busy = await state();
    await page.waitForTimeout(label.startsWith("save") ? 6000 : 3200);
    const after = [];
    for (let i = 0; i < 4; i += 1) {
      after.push(await state());
      await page.waitForTimeout(500);
    }
    if (label.startsWith("save")) console.log("saved:", await page.evaluate(() => JSON.stringify({ state: window.__nmbEntry?.filing_state, id: window.__nmbEntry?.id })));
    const busyOk = want === "read" ? busy.reading || busy.act === "read" : busy.think;
    const reacted = after.some((s) => ["nod", "carry", "shrug"].includes(s.act) || ["happy", "confused"].includes(s.expr) || ["happy", "proud", "confused", "worried"].includes(s.atlas));
    const cleared = !after[after.length - 1].reading && after[after.length - 1].work === "-";
    if (!busyOk || !reacted || !cleared) fail = true;
    console.log(`${label}: busy ${JSON.stringify(busy)} | after ${after.map((s) => `${s.act}/${s.expr}/${s.atlas}${s.reading ? "/reading" : ""}`).join(" ")}${busyOk && reacted && cleared ? "" : "  <- FAIL"}`);
  }
  console.log(fail ? "FAIL" : "PASS");
  process.exitCode = fail ? 1 : 0;
  await browser.close();
})();
