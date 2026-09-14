const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(1200);
  const out = await page.evaluate(() => {
    const b = document.querySelector(".chat-empty-help-toggle");
    const pane = document.getElementById("chat-messages");
    const r = b?.getBoundingClientRect(), p = pane.getBoundingClientRect();
    let el = b?.parentElement, anc = null;
    while (el) { if (getComputedStyle(el).position !== "static") { anc = el.id || el.className; break; } el = el.parentElement; }
    return { btn: r && [Math.round(r.left), Math.round(r.top), Math.round(r.right)], pane: [Math.round(p.left), Math.round(p.top), Math.round(p.right)], positionedAncestor: anc, emptyPos: getComputedStyle(document.querySelector(".chat-empty")).position, personaOptions: [...document.querySelectorAll("#persona-select option")].map(o => o.textContent).slice(0,3) };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
