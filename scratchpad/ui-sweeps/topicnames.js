// **A topic can be renamed and is listed in Library, Contents** (INBOX 547).
// Graph, Colour: Topic: open a topic's card from the legend, rename it, and
// the legend, the card and /graph/structure say the new name; the reset
// arrow brings the found name back. Contents, By topic: one section per topic.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/topicnames.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failed++; };
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const api = (path, init) => page.evaluate(async ([p, i]) => (await apiJson(p, i)), [path, init]);
  const topics = (await api("/graph/structure?topics=1")).topics;
  check(topics.length > 0, `the notebook has topics (${topics.length})`);
  await page.evaluate(() => { try { localStorage.setItem("graph-colour", "topic"); } catch (e) { /* private */ } });
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(3000);
  const sel = await page.$("#graph-colour");
  if (sel) { await sel.selectOption("topic").catch(() => {}); await page.waitForTimeout(2000); }
  await page.click("#graph-legend [data-topic]");
  await page.waitForTimeout(400);
  check(await page.isVisible("#graph-topic"), "the topic card opens from the legend");
  page.once("dialog", () => {});
  await page.click('#graph-topic [aria-label="Rename the topic"]');
  await page.waitForTimeout(300);
  const input = await page.$(".prompt-card input");
  check(!!input, "the rename asks for a name");
  await input.fill("My sweep topic");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({
    card: document.querySelector("#graph-topic strong")?.textContent,
    legend: document.querySelector("#graph-legend [data-topic]")?.textContent,
  }));
  check(after.card === "My sweep topic", `the card says the new name (${after.card})`);
  check(/My sweep topic/.test(after.legend || ""), `the legend says it (${after.legend})`);
  const named = (await api("/graph/structure?topics=1")).topics.find((t) => t.named);
  check(named?.name === "My sweep topic", "the server keeps it");
  await page.click("#tab-btn-library");
  await page.waitForTimeout(800);
  await page.click('[data-target="library-view-contents"]').catch(() => {});
  await page.waitForTimeout(800);
  await page.selectOption("#contents-group", "topic");
  await page.waitForTimeout(1500);
  const heads = await page.evaluate(() => [...document.querySelectorAll('#contents-outline [aria-level="1"]')].map((e) => e.textContent.trim()));
  check(heads.some((h) => h.includes("My sweep topic")), `Contents, By topic, lists the renamed topic (${heads.slice(0, 4).join(" | ")})`);
  check(heads.length >= topics.length, `one section per topic at least (${heads.length} for ${topics.length})`);
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(1500);
  await page.click("#graph-legend [data-topic]");
  await page.waitForTimeout(300);
  await page.click('#graph-topic [aria-label^="Use the found name"]');
  await page.waitForTimeout(700);
  const back = (await api("/graph/structure?topics=1")).topics.some((t) => t.named);
  check(!back, "the reset arrow brings the found name back");
  await page.selectOption("#graph-colour", "category").catch(() => {});
  await browser.close();
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
