// Thinking-word rotation pace: measured gaps between word swaps (ms).
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  const gaps = await page.evaluate(async () => {
    window.wantsThinkingWords = () => true;
    const d = typingDots("Thinking…", { words: true });
    document.body.appendChild(d);
    const w = d.querySelector(".typing-thinking-word");
    const t = []; let last = w.textContent;
    const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => {
      if (w.textContent !== last) { last = w.textContent; t.push(Math.round(performance.now() - t0)); }
      if (performance.now() - t0 > 16000) { clearInterval(iv); res(); } }, 20); });
    return t.map((x, i) => i ? x - t[i - 1] : x);
  });
  console.log(JSON.stringify(gaps));
  await browser.close();
})();
