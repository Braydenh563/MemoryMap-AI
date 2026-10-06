// INBOX 673: how far a note card's text runs, against the card's own width.
// Prints the text block's width, its max-width, and the card's inner width.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1920), height: 1000 } });
  await page.evaluate(async () => {
    const text = "What my notes currently leave out, however, is the complete overarching structure of the double degree, a specific timetable beyond noting my university days are Tuesday and Thursday, and any metrics regarding my performance in these subjects. It paints a picture of the subjects I am engaging with and the practical skills I am practising. ".repeat(3);
    await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: text }) });
  });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const card = document.querySelector("#entry-list > li");
    if (!card) return { none: true };
    const cs = getComputedStyle(card);
    const inner = card.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const chain = [];
    let best = null;
    for (const el of card.querySelectorAll("*")) {
      if (!el.textContent.includes("overarching") || el.children.length > 3) continue;
      const s = getComputedStyle(el);
      chain.push({ tag: el.tagName, cls: el.className.toString().slice(0, 60), w: Math.round(el.getBoundingClientRect().width), max: s.maxWidth, pr: s.paddingRight, mr: s.marginRight });
    }
    return { cardClass: card.className.toString().slice(0, 80), cardInner: Math.round(inner), chain: chain.slice(-6) };
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
