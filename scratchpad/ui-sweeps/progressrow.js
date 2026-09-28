// Chat progress line in a .msg bubble: label beside the dots, musing below.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  const r = await page.evaluate(async () => {
    const msg = document.createElement("div"); msg.className = "msg assistant";
    document.body.appendChild(msg);
    const p = progressLine("Thinking…", { words: true }); msg.appendChild(p);
    p.setPhase("writing"); p.setStatus("Writing the answer…");
    await new Promise((res) => setTimeout(res, 3500));
    const box = (s) => { const b = p.querySelector(s).getBoundingClientRect(); return { top: Math.round(b.top), left: Math.round(b.left), right: Math.round(b.right), h: Math.round(b.height) }; };
    return { dots: box(".typing-dots"), label: box(".progress-line-label"), musing: box(".progress-musing"), labelText: p.querySelector(".progress-line-label").textContent };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
