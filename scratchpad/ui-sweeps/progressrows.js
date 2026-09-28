// The thinking line in an answer bubble: status and musing under the dots,
// starting at the same left edge.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(1200);
  const out = await page.evaluate(() => {
    const msg = document.createElement("div");
    msg.className = "msg assistant";
    const line = progressLine("Read 10 notes, writing…", { words: true });
    msg.appendChild(line);
    (document.getElementById("chat-messages") || document.body).appendChild(msg);
    const m = line.querySelector(".progress-musing");
    m.hidden = false; m.textContent = "Searching uses meaning and keywords together."; m.classList.add("is-shown");
    const r = (sel) => { const b = line.querySelector(sel).getBoundingClientRect(); return { left: Math.round(b.left), top: Math.round(b.top) }; };
    return { dots: r(".typing-dots"), label: r(".progress-line-label"), musing: r(".progress-musing") };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
