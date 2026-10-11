// Model-backed checks for OPEN 185, 202, 203, 215, 235 (verify-1011), run against
// whatever the app's AI provider is set to (see scratchpad/llama-dev.sh, or any
// OpenAI-compatible server). It asserts shape, not wording: a 0.5B model's
// sentences are not the claim, that the path reaches the model and back is.
//
//   BASE=http://127.0.0.1:8794 THEME=light node verifymodel.js
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + JSON.stringify(d)}`);
};
const WAIT = Number(process.env.MODEL_WAIT_MS || 240000);

(async () => {
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const { browser, page } = await boot({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const tag = `${w}${touch ? " touch" : ""}`;
    // 202: the act row with a model running.
    await page.evaluate(async () => { await ensureModule("appPalette"); await paletteStartAct("Add a note that says buy milk on the way home"); });
    await page.waitForTimeout(1200);
    const filled = await page.evaluate(() => ({ tab: document.querySelector("#tab-chat.active, [data-tab=chat].active, [data-tab=chat][aria-selected=true]") ? "chat" : "?", box: document.getElementById("chat-input")?.value || "", msgs: document.querySelectorAll("#chat-messages > *").length }));
    ok(`202 ${tag}: the act row opens Chat with its opening words and sends nothing yet`, /buy milk/.test(filled.box) && filled.msgs === 0, filled);
    // ... and a send goes to the model and an answer comes back.
    await page.evaluate(() => { document.getElementById("chat-input").focus(); });
    await page.keyboard.press("Enter");
    const t0 = Date.now();
    let answer = "";
    while (Date.now() - t0 < WAIT) {
      await page.waitForTimeout(2000);
      answer = await page.evaluate(() => [...document.querySelectorAll("#chat-messages .chat-message.assistant, #chat-messages .assistant")].map((e) => e.textContent.trim()).join(" ").slice(0, 300));
      const busy = await page.evaluate(() => !!document.querySelector("#chat-stop:not(.hidden), .chat-streaming, [data-streaming=true]"));
      if (answer.length > 5 && !busy) break;
    }
    ok(`235 ${tag}: a Chat turn goes to the real model and an answer is drawn (${Math.round((Date.now() - t0) / 1000)} s)`, answer.length > 5, answer.slice(0, 120));
    const meta = await page.evaluate(() => ({ metaRow: !!document.querySelector("#chat-messages .chat-meta, #chat-messages .message-meta"), pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    ok(`232 ${tag}: the answer carries its meta row (time) and the page does not overflow`, meta.metaRow && meta.pageX <= 0, meta);
    // 203: the Guide answers.
    await page.evaluate(() => { try { openHelpChat(); } catch (e) { /* guide loads lazily */ } });
    await page.waitForSelector("#help-chat-input", { state: "visible", timeout: 30000 }).catch(() => {});
    await page.fill("#help-chat-input", "How do I make a mind map?").catch(() => {});
    await page.keyboard.press("Enter");
    const g0 = Date.now();
    let guide = "";
    while (Date.now() - g0 < WAIT) {
      await page.waitForTimeout(2000);
      guide = await page.evaluate(() => [...document.querySelectorAll("#help-chat-messages > *")].map((e) => e.textContent.trim()).join(" | ").slice(0, 400));
      if (/mind map|map/i.test(guide) && guide.length > 80) break;
    }
    ok(`203 ${tag}: the Guide answers a how-to with the model on`, guide.length > 80, guide.slice(0, 200));
    ok(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 2));
    await browser.close();
  }
  console.log(bad ? `${bad} FAIL` : "ALL PASS");
  process.exit(bad ? 1 : 0);
})();
