// Brief 89 row 5: a statistics question in Chat, timed in the page from the
// send to the counted sentence on screen (rAF, not a 150 ms poll), plus the
// network requests the send made, so the time can be split client vs server.
// The first reply in an empty chat replaces the empty state, so replies are
// counted as `.msg` children, not all children (the plan's -1 on the first
// question was the probe, Brief 89).
// Usage: BASE=http://127.0.0.1:8832 VW=1440 node stats89chat.js
const { boot } = require("./lib.js");
(async () => {
  const VW = Number(process.env.VW || 1440);
  const { browser, page } = await boot(VW < 600 ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {});
  const reqs = [];
  page.on("requestfinished", async (r) => { const t = r.timing(); reqs.push({ u: r.url().replace(/^https?:\/\/[^/]+/, ""), ms: Math.round(t.responseEnd) }); });
  await page.evaluate(() => switchTab("chat"));
  await page.waitForFunction(() => document.getElementById("chat-input")?.offsetParent, null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  const out = [];
  for (const q of ["how many notes do I have", "what are my top tags", "how many words have I written", "show me my stats", "how many notes do I have", "what are my top tags"]) {
    reqs.length = 0;
    await page.fill("#chat-input", q);
    const ms = await page.evaluate(async (q) => {
      const box = document.getElementById("chat-messages");
      const n0 = box.querySelectorAll(":scope > .msg").length;
      const t0 = performance.now();
      document.getElementById("chat-send").click();
      const until = t0 + 15000;
      while (performance.now() < until) {
        await new Promise((r) => requestAnimationFrame(r));
        const kids = [...box.querySelectorAll(":scope > .msg")].slice(n0);
        const last = kids[kids.length - 1];
        if (kids.length >= 2 && last && !last.classList.contains("is-generating") && /\d/.test(last.innerText)) return { ms: Math.round(performance.now() - t0), text: last.innerText.replace(/\s+/g, " ").slice(0, 120) };
      }
      return { ms: -1 };
    }, q);
    await page.waitForTimeout(600);
    out.push({ q, ...ms, stream: (reqs.find((r) => r.u === "/chat/stream") || {}).ms });
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
