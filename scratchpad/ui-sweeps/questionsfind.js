// **Questions can be found now** (INBOX 551, the owner: "is there a way to
// get it to generate questions now??"). A note asking a question, then Read
// notes now in Notes, Questions: the question is listed without a night.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/questionsfind.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failed++; };
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  const stamp = Date.now();
  await page.evaluate(async (s) => {
    await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Planning the kiln trip ${s}. Should we fire the glaze tiles at cone six this time?` }) });
  }, stamp);
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForTimeout(800);
  await page.evaluate(() => showNotesSection("questions"));
  await page.waitForTimeout(1200);
  const button = await page.evaluate(() => {
    const b = document.getElementById("questions-refresh");
    const r = b.getBoundingClientRect();
    return { text: b.textContent.trim(), h: r.height, visible: r.width > 0 };
  });
  check(button.visible && /Read notes now/.test(button.text), `the button says what it does (${button.text})`);
  await page.click("#questions-refresh");
  await page.waitForFunction(() => !document.getElementById("questions-refresh").disabled, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const rows = await page.evaluate(() => [...document.querySelectorAll("#questions-list li")].map((li) => li.textContent));
  check(rows.some((t) => /cone six/.test(t)), `the new note's question is listed (${rows.length} rows)`);
  const lead = await page.evaluate(() => document.getElementById("questions-lead").textContent);
  check(lead === "", `no empty line beside rows (${lead})`);
  const dock = await page.evaluate(() => {
    const d = document.getElementById("questions-refresh").closest(".dock");
    return d ? d.scrollWidth <= d.clientWidth + 1 : true;
  });
  check(dock, "the dock does not overflow");
  await browser.close();
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
