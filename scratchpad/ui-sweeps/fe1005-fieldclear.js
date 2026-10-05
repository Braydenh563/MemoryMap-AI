// fe1005: the field clear buttons without their one-second poll (audit
// 2026-10-05, FE-18). A value written by code shows the X; clearing hides it;
// typing shows it; no interval is left running for it.
//   BASE=http://127.0.0.1:8842 node fe1005-fieldclear.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => ensureModule("fieldClear"));
  await page.waitForTimeout(1000);
  const out = await page.evaluate(async () => {
    const tick = () => new Promise((r) => setTimeout(r, 50));
    const hidden = (id) => document.getElementById(id).classList.contains("hidden");
    const q = document.getElementById("question");
    const r = {};
    q.value = "";
    await tick();
    r.emptyHidden = hidden("ask-clear");
    q.value = "What did I write about gardens?";
    await tick();
    r.codeWriteShows = !hidden("ask-clear");
    q.value = "";
    await tick();
    r.codeClearHides = hidden("ask-clear");
    q.value = "typed";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    r.typedShows = !hidden("ask-clear");
    r.readBack = q.value === "typed";
    return r;
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
